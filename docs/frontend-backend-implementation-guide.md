# Desktop AI Assistant — Frontend & Backend Implementation Guide

This document focuses specifically on **what to build and how to build it** in the Electron/React frontend and FastAPI backend for the assessment.

The assessment requires Electron, React, TypeScript, Python 3.12+, FastAPI, WebSockets, PostgreSQL, Redis, and Docker Compose. It also requires authentication, conversation persistence, real-time streamed AI responses, graceful recovery from unreliable networks, multiple simultaneous desktop sessions, fair usage controls, and minimal local setup.

---

# 1. Overall Frontend ↔ Backend Flow

The application should work approximately like this:

```text
                    ELECTRON DESKTOP APP
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Electron Main Process                                      │
│       │                                                     │
│       └── Preload / secure bridge                           │
│                    │                                        │
│                    ▼                                        │
│          React + TypeScript Renderer                        │
│                    │                                        │
│             ┌──────┴──────┐                                 │
│             │             │                                  │
│           HTTP         WebSocket                            │
│             │             │                                  │
└─────────────┼─────────────┼──────────────────────────────────┘
              │             │
              ▼             ▼
        ┌─────────────────────────────┐
        │          FastAPI            │
        │                             │
        │ Auth │ Conversations │ WS   │
        │             │               │
        │             ▼               │
        │        LLM Service          │
        └───────┬──────────┬──────────┘
                │          │
                ▼          ▼
          PostgreSQL      Redis
```

A useful mental model:

```text
HTTP = normal request/response operations
WebSocket = live chat + streaming + connection events
PostgreSQL = permanent data
Redis = temporary/high-frequency data
Electron = desktop shell
React = UI
FastAPI = application/backend logic
```

---

# 2. FRONTEND

## 2.1 Recommended Frontend Structure

```text
apps/
└── desktop/
    ├── electron/
    │   ├── main.ts
    │   └── preload.ts
    │
    ├── src/
    │   ├── app/
    │   │   ├── App.tsx
    │   │   └── routes.tsx
    │   │
    │   ├── components/
    │   │   ├── auth/
    │   │   │   ├── LoginForm.tsx
    │   │   │   └── RegisterForm.tsx
    │   │   │
    │   │   ├── chat/
    │   │   │   ├── ChatWindow.tsx
    │   │   │   ├── MessageList.tsx
    │   │   │   ├── MessageItem.tsx
    │   │   │   └── MessageInput.tsx
    │   │   │
    │   │   ├── conversations/
    │   │   │   ├── ConversationList.tsx
    │   │   │   └── ConversationItem.tsx
    │   │   │
    │   │   └── common/
    │   │       ├── ConnectionStatus.tsx
    │   │       ├── Loading.tsx
    │   │       └── ErrorMessage.tsx
    │   │
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   └── ChatPage.tsx
    │   │
    │   ├── api/
    │   │   ├── client.ts
    │   │   ├── auth.ts
    │   │   └── conversations.ts
    │   │
    │   ├── websocket/
    │   │   ├── WebSocketManager.ts
    │   │   └── events.ts
    │   │
    │   ├── stores/
    │   │   ├── authStore.ts
    │   │   ├── chatStore.ts
    │   │   └── connectionStore.ts
    │   │
    │   ├── types/
    │   │   ├── auth.ts
    │   │   ├── conversation.ts
    │   │   └── websocket.ts
    │   │
    │   └── main.tsx
    │
    ├── package.json
    └── tsconfig.json
```

You can simplify this initially. The important thing is to keep responsibilities separated.

---

# 3. FRONTEND — Electron

Electron has two important sides:

```text
Main Process
Renderer Process
```

## Main Process

Responsible for:

```text
Window creation
Application lifecycle
Native desktop functionality
```

## Renderer

Responsible for:

```text
React UI
HTTP calls
WebSocket connection
Application state
```

Use a secure Electron configuration.

Prefer:

```text
contextIsolation: true
nodeIntegration: false
```

Do not expose Node.js directly to React.

---

# 4. FRONTEND — Authentication

Create:

```text
LoginPage
RegisterPage
```

### Login flow

```text
User enters email/password
          ↓
React validates input
          ↓
POST /auth/login
          ↓
Backend validates credentials
          ↓
Backend returns authentication/session information
          ↓
Frontend stores the appropriate session state
          ↓
Open ChatPage
```

### Register flow

```text
Register form
    ↓
POST /auth/register
    ↓
Backend creates account
    ↓
Frontend moves to login/chat flow
```

---

# 5. FRONTEND — Authentication State

Maintain a central authentication state:

```text
authenticated
user
accessToken
session/client ID
loading
```

Example conceptual state:

```ts
type AuthState = {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};
```

Do not scatter authentication information throughout components.

---

# 6. FRONTEND — Token Refresh

The assessment says active users should not experience unnecessary interruptions.

Implement:

```text
Access token expires
       ↓
Frontend calls /auth/refresh
       ↓
New access token
       ↓
Continue operation
```

The user should not suddenly be sent to the login page simply because the short-lived access token expired.

If refresh fails because the session is genuinely invalid:

```text
Clear authentication state
↓
Return to Login
```

---

# 7. FRONTEND — API Client

Create one HTTP client rather than calling `fetch()` randomly throughout the application.

For example:

```text
api/client.ts
```

Responsibilities:

```text
Base URL
Authentication headers
Error normalization
Token refresh
Request handling
```

Then create domain-specific modules:

```text
api/auth.ts
api/conversations.ts
```

Example API responsibilities:

```text
auth.ts
    login()
    register()
    refresh()
    logout()
    getCurrentUser()

conversations.ts
    createConversation()
    getConversations()
    getConversation()
    getMessages()
```

---

# 8. FRONTEND — Conversation List

The left side of the UI should display previous conversations.

Flow:

```text
ChatPage loads
       ↓
GET /conversations
       ↓
Render conversation list
```

When user selects one:

```text
GET /conversations/{id}/messages
       ↓
Render messages
```

When user clicks New Conversation:

```text
POST /conversations
       ↓
Return conversation
       ↓
Select it
```

---

# 9. FRONTEND — Chat State

A conversation should maintain messages such as:

```ts
type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  status: "pending" | "completed" | "failed";
};
```

The frontend should distinguish:

```text
Normal completed message
Streaming message
Failed message
Pending message
```

---

# 10. FRONTEND — Message Sending

When the user clicks Send:

```text
1. Validate input
2. Keep input/message locally
3. Generate request_id
4. Add optimistic/pending user message
5. Send WebSocket event
6. Wait for server events
7. Update assistant message as chunks arrive
8. Mark complete
```

Example client event:

```json
{
  "type": "message.send",
  "request_id": "unique-request-id",
  "conversation_id": "conversation-id",
  "content": "Explain Redis"
}
```

---

# 11. FRONTEND — WebSocket Manager

Do not create a WebSocket directly inside every React component.

Create:

```text
websocket/WebSocketManager.ts
```

It should manage:

```text
connect()
disconnect()
send()
reconnect()
connection state
incoming events
outgoing events
```

Conceptually:

```text
React
  ↓
WebSocketManager
  ↓
WebSocket
  ↓
FastAPI
```

This makes reconnection and event handling much easier.

---

# 12. FRONTEND — WebSocket Events

Create strongly typed events.

Client → server:

```text
message.send
```

Server → client:

```text
connection.ready
message.created
message.delta
message.completed
message.failed
error
```

Example:

```json
{
  "type": "message.delta",
  "message_id": "assistant-message-id",
  "delta": "Redis is a..."
}
```

React receives this and updates the currently streaming assistant message.

---

# 13. FRONTEND — Streaming UI

Do NOT wait for:

```text
"Redis is an in-memory data store..."
```

to arrive as one complete response.

Instead:

```text
"Redis"
"Redis is"
"Redis is an"
"Redis is an in-memory"
...
```

React progressively updates:

```text
Assistant:
Redis is an in-memory...
```

This is one of the most important UI behaviors in the assessment.

---

# 14. FRONTEND — Connection Status

Create:

```text
ConnectionStatus.tsx
```

Possible states:

```text
Connected
Connecting
Reconnecting
Disconnected
```

Example:

```text
● Connected
```

or:

```text
↻ Reconnecting...
```

This is specifically required by the assessment.

---

# 15. FRONTEND — Reconnection

When WebSocket closes unexpectedly:

```text
Disconnected
    ↓
1 second
    ↓
Reconnect
    ↓
2 seconds
    ↓
Reconnect
    ↓
4 seconds
    ↓
Reconnect
```

Use exponential backoff with a maximum delay.

Do not reconnect in a tight loop.

---

# 16. FRONTEND — Preserve User Work

This is important.

Suppose:

```text
User types:
"Explain Kubernetes deployments"
```

Then the network disappears.

The text should NOT disappear.

Keep the draft locally:

```text
messageDraft
```

When connection returns:

```text
draft still exists
       ↓
user can retry/send
```

For already-submitted messages, use a `request_id` so retries do not accidentally create duplicates.

---

# 17. FRONTEND — Backend Failure

If FastAPI becomes unavailable:

```text
WebSocket disconnects
       ↓
ConnectionStatus = Reconnecting
       ↓
Retry
       ↓
Connection restored
       ↓
Reload/synchronize conversation if needed
```

The application should remain open.

Do not show a blank screen or crash the renderer.

---

# 18. FRONTEND — Multiple Clients

The same user may have:

```text
Desktop A
Desktop B
```

The frontend should treat the server as the source of truth for persisted conversations.

When a conversation is opened:

```text
GET conversation/messages
```

Then real-time events update the UI.

Do not assume another Electron process shares local React state.

---

# 19. FRONTEND — Error Handling

Show useful errors:

```text
Invalid credentials
Connection lost
Message failed
Rate limit reached
Conversation unavailable
Server unavailable
```

Do not show raw stack traces to the user.

---

# 20. FRONTEND — Recommended Components

Minimum useful components:

```text
LoginForm
RegisterForm

Sidebar
ConversationList
ConversationItem

ChatWindow
MessageList
MessageItem
MessageInput

ConnectionStatus
Loading
ErrorMessage
```

Do not over-engineer the UI.

The assessment explicitly says visual design is not the focus.

---

# 21. BACKEND

## Recommended Backend Structure

```text
backend/
└── app/
    ├── main.py
    │
    ├── api/
    │   ├── auth.py
    │   └── conversations.py
    │
    ├── core/
    │   ├── config.py
    │   ├── security.py
    │   └── dependencies.py
    │
    ├── db/
    │   ├── database.py
    │   └── migrations/
    │
    ├── models/
    │   ├── user.py
    │   ├── session.py
    │   ├── conversation.py
    │   └── message.py
    │
    ├── schemas/
    │   ├── auth.py
    │   ├── conversation.py
    │   └── message.py
    │
    ├── services/
    │   ├── auth_service.py
    │   ├── conversation_service.py
    │   ├── message_service.py
    │   ├── rate_limit_service.py
    │   └── ai_service.py
    │
    ├── llm/
    │   ├── base.py
    │   └── provider.py
    │
    └── websocket/
        ├── manager.py
        └── handlers.py
```

---

# 22. BACKEND — FastAPI Setup

Create the application:

```text
FastAPI
   ↓
Routers
   ↓
Services
   ↓
Database / Redis / LLM
```

Do not put all application logic inside `main.py`.

`main.py` should primarily assemble the application.

---

# 23. BACKEND — Configuration

Create:

```text
core/config.py
```

Load configuration from environment variables.

Example categories:

```text
DATABASE_URL
REDIS_URL
JWT_SECRET
ACCESS_TOKEN_EXPIRATION
REFRESH_TOKEN_EXPIRATION
LLM_API_KEY
LLM_PROVIDER
```

Never hard-code secrets.

---

# 24. BACKEND — Database

Use PostgreSQL for durable data.

Main models:

```text
User
Session / RefreshToken
Conversation
Message
```

Relationships:

```text
User
 │
 ├── Sessions
 │
 └── Conversations
        │
        └── Messages
```

---

# 25. Backend — User Model

Conceptually:

```text
User
----
id
email
password_hash
created_at
updated_at
```

Add a unique constraint/index for email.

Never store:

```text
password
```

Store:

```text
password_hash
```

---

# 26. Backend — Session Model

A user may have multiple clients.

Therefore:

```text
User
 ├── Session A
 ├── Session B
 └── Session C
```

A session can contain:

```text
id
user_id
client_id
token_hash
expires_at
created_at
revoked_at
```

This allows individual sessions to be revoked without logging the user out everywhere.

---

# 27. Backend — Authentication Endpoints

Implement:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

---

# 28. Backend — Registration

Flow:

```text
Request
 ↓
Validate email/password
 ↓
Check existing user
 ↓
Hash password
 ↓
Create user
 ↓
Return success
```

Use Pydantic schemas for request validation.

---

# 29. Backend — Login

Flow:

```text
Email + password
       ↓
Find user
       ↓
Verify password hash
       ↓
Create session
       ↓
Issue access/refresh authentication
       ↓
Return response
```

Invalid credentials should return an appropriate authentication error without revealing unnecessary information.

---

# 30. Backend — Authentication Dependency

Create a reusable dependency such as:

```text
get_current_user()
```

Protected endpoints use it.

Conceptually:

```text
Request
 ↓
Authentication dependency
 ↓
Validate access token
 ↓
Find authenticated user
 ↓
Endpoint
```

Never trust:

```text
user_id
```

sent by the client as proof of identity.

---

# 31. Backend — Conversations

Implement:

```text
POST   /conversations
GET    /conversations
GET    /conversations/{id}
DELETE /conversations/{id}
```

Every operation must enforce ownership.

For example:

```text
conversation.user_id == current_user.id
```

---

# 32. Backend — Messages

Implement:

```text
GET /conversations/{id}/messages
```

The WebSocket will handle sending new messages in real time.

When a user message arrives:

```text
WebSocket
 ↓
Validate user
 ↓
Validate conversation ownership
 ↓
Persist message
```

---

# 33. Backend — WebSocket Endpoint

Create something like:

```text
/ws
```

or:

```text
/ws/chat
```

The connection should authenticate the user.

Conceptually:

```text
Client
  ↓
WebSocket connect
  ↓
Authenticate
  ↓
Accept connection
  ↓
Send connection.ready
```

---

# 34. Backend — WebSocket Connection Manager

Create:

```text
websocket/manager.py
```

Responsibilities:

```text
Track active connections
Connect
Disconnect
Send to one client
Send to user's clients when appropriate
```

For example:

```text
user_123
 ├── websocket_A
 └── websocket_B
```

This is useful when the same user is connected from multiple desktop clients.

Do not make PostgreSQL the live WebSocket connection registry.

Process-local connection state belongs in the application process; durable data belongs in PostgreSQL.

---

# 35. Backend — WebSocket Event Handling

Receive:

```json
{
  "type": "message.send",
  "request_id": "abc",
  "conversation_id": "123",
  "content": "Hello"
}
```

Process:

```text
Parse event
 ↓
Validate schema
 ↓
Authenticate
 ↓
Check conversation ownership
 ↓
Check fair-use limits
 ↓
Persist user message
 ↓
Create assistant message
 ↓
Call AI
 ↓
Stream result
```

---

# 36. Backend — LLM Abstraction

Create:

```text
llm/base.py
```

Define an interface/protocol conceptually:

```text
stream_response(messages)
```

Then create:

```text
llm/provider.py
```

for the selected provider.

The service should depend on the abstraction:

```text
AIService
    ↓
LLMProvider
    ↓
Current provider
```

NOT:

```text
ConversationService
    ↓
SpecificProviderSDK
```

This keeps provider replacement manageable.

---

# 37. Backend — AI Service

Create:

```text
services/ai_service.py
```

Its job is to coordinate:

```text
Conversation history
+
LLM provider
+
streaming
```

It should not know about:

```text
HTTP routes
React
Electron
```

This separation is important.

---

# 38. Backend — AI Streaming

Flow:

```text
AI provider
    ↓
chunk
    ↓
AI service
    ↓
WebSocket
    ↓
Electron
```

For every chunk:

```json
{
  "type": "message.delta",
  "message_id": "abc",
  "delta": "hello"
}
```

At the end:

```json
{
  "type": "message.completed",
  "message_id": "abc"
}
```

---

# 39. Backend — Message Persistence

Recommended lifecycle:

```text
User sends message
       ↓
Save user message
       ↓
Create assistant message = pending
       ↓
Call LLM
       ↓
Stream chunks
       ↓
Accumulate response
       ↓
Save final assistant content
       ↓
assistant status = completed
```

If AI fails:

```text
assistant status = failed
```

Send:

```text
message.failed
```

to the client.

---

# 40. Backend — Redis

Use Redis for things that are temporary or high-frequency.

Recommended uses:

```text
Rate limiting
Short-lived session/cache information
Idempotency keys
Temporary request state
```

Do not store the only copy of:

```text
users
conversations
messages
```

in Redis.

PostgreSQL is the durable source of truth.

---

# 41. Backend — Fair Usage

Implement a per-user Redis-based rate limit.

Concept:

```text
user_id
   ↓
Redis counter
   ↓
request count
   ↓
limit
```

Example policy:

```text
X messages per minute per user
```

Also consider:

```text
maximum concurrent AI requests per user
```

When exceeded:

```text
429
```

for HTTP requests or:

```json
{
  "type": "error",
  "code": "RATE_LIMITED"
}
```

for WebSockets.

Document the exact limits you choose.

---

# 42. Backend — Idempotency

Network failures can create an uncertain situation:

```text
Client sends message
       ↓
Server processes it
       ↓
Response is lost
       ↓
Client thinks it failed
       ↓
Client retries
```

Without protection, the message could be created twice.

Use:

```text
request_id
```

for message requests.

Store a short-lived idempotency record, potentially in Redis.

If the same request arrives again:

```text
return/use the existing result
```

instead of creating a duplicate.

---

# 43. Backend — Multiple Clients

Example:

```text
User A
 ├── Electron Client 1
 └── Electron Client 2
```

Both authenticate independently.

Both may connect to:

```text
/ws
```

When Client 1 creates a message:

```text
Client 1
   ↓
FastAPI
   ↓
PostgreSQL
   ↓
AI
```

If appropriate, the server can broadcast relevant events to Client 2.

At minimum, both clients must be able to retrieve the same persisted conversation state.

---

# 44. Backend — Network/AI Failure

If an AI request is interrupted:

```text
catch exception
 ↓
mark assistant message failed/pending appropriately
 ↓
send message.failed
 ↓
log error
```

Do not allow the exception to crash the WebSocket server.

The exact recovery strategy does not need to solve every scenario perfectly; the assessment explicitly asks for graceful failure.

---

# 45. Backend — Error Handling

Create consistent application errors.

Example:

```text
AUTHENTICATION_REQUIRED
INVALID_CREDENTIALS
CONVERSATION_NOT_FOUND
FORBIDDEN
RATE_LIMITED
AI_PROVIDER_ERROR
SERVICE_UNAVAILABLE
```

Map these to appropriate HTTP/WebSocket responses.

---

# 46. Backend — Logging

Log important events:

```text
authentication success/failure
WebSocket connect/disconnect
AI request start/end/failure
rate-limit rejection
unexpected errors
```

Do not log:

```text
passwords
JWT secrets
API keys
refresh tokens
```

Avoid logging full private conversations unless necessary for debugging.

---

# 47. Backend — Tests

Prioritize tests for:

```text
Registration
Login
Token refresh
Unauthorized access
Conversation ownership
Message persistence
WebSocket message flow
LLM streaming
Rate limiting
Idempotency
```

The goal is not maximum test count.

Test the important behavior.

---

# 48. API Contract

Keep the frontend/backend contract explicit.

Example:

## Login

```text
POST /auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response should contain the authentication/session information your chosen auth architecture requires.

---

## Create Conversation

```text
POST /conversations
```

Response:

```json
{
  "id": "conversation-id",
  "title": "New conversation"
}
```

---

## Get Messages

```text
GET /conversations/{id}/messages
```

Response:

```json
{
  "messages": []
}
```

---

## WebSocket Send

```json
{
  "type": "message.send",
  "request_id": "req-123",
  "conversation_id": "conv-123",
  "content": "Hello"
}
```

---

## WebSocket Stream

```json
{
  "type": "message.delta",
  "message_id": "msg-123",
  "delta": "Hello"
}
```

---

## WebSocket Complete

```json
{
  "type": "message.completed",
  "message_id": "msg-123"
}
```

---

# 49. End-to-End Message Flow

This should be the main flow you implement first.

```text
USER
 │
 │ types message
 ▼
REACT
 │
 │ message.send
 ▼
WEBSOCKET
 │
 ▼
FASTAPI
 │
 ├── authenticate
 │
 ├── authorize conversation
 │
 ├── rate limit
 │
 ├── save user message
 │
 └── create assistant message
 │
 ▼
AI SERVICE
 │
 ▼
LLM PROVIDER
 │
 │ stream
 ▼
AI SERVICE
 │
 │ chunks
 ▼
FASTAPI WEBSOCKET
 │
 │ message.delta
 ▼
REACT
 │
 │ progressively render
 ▼
USER
```

At completion:

```text
LLM
 ↓
FastAPI
 ↓
Persist assistant message
 ↓
message.completed
 ↓
React marks message completed
```

---

# 50. What Should Be HTTP vs WebSocket?

Use HTTP for:

```text
Register
Login
Refresh
Logout
Current user
Create conversation
List conversations
Get conversation
Get historical messages
```

Use WebSocket for:

```text
Live chat
Streaming AI response
Connection status/events
Real-time message events
```

This gives a clean separation.

---

# 51. Implementation Order — Frontend

Build in this order:

```text
1. Electron shell
2. React + TypeScript
3. Login page
4. Register page
5. API client
6. Auth state
7. Chat layout
8. Conversation list
9. Conversation loading
10. Message display
11. Message input
12. WebSocket manager
13. WebSocket authentication
14. Send message
15. Stream response
16. Connection status
17. Reconnection
18. Draft preservation
19. Error states
20. Multiple-session synchronization
21. Testing
22. Final cleanup
```

---

# 52. Implementation Order — Backend

Build in this order:

```text
1. FastAPI app
2. Configuration
3. PostgreSQL connection
4. SQLAlchemy models
5. Alembic migrations
6. Redis connection
7. User model
8. Registration
9. Password hashing
10. Login
11. Access/refresh authentication
12. Session management
13. Conversation model
14. Message model
15. Conversation APIs
16. WebSocket endpoint
17. WebSocket authentication
18. Connection manager
19. LLM abstraction
20. LLM provider
21. AI service
22. Streaming
23. Message persistence
24. Rate limiting
25. Idempotency
26. Multiple-client behavior
27. Error handling
28. Logging
29. Tests
30. Docker cleanup
```

---

# 53. Build Milestones

## Milestone 1 — Infrastructure

You should have:

```text
Docker Compose
PostgreSQL
Redis
FastAPI
Electron
React
```

All applications start.

---

## Milestone 2 — Authentication

You should be able to:

```text
Register
Login
Stay authenticated
Logout
```

---

## Milestone 3 — Persistence

You should be able to:

```text
Create conversation
Restart backend
Still see conversation
```

---

## Milestone 4 — Real-Time Chat

You should be able to:

```text
Connect WebSocket
Send message
Receive streamed response
Persist messages
```

---

## Milestone 5 — Reliability

You should be able to:

```text
Disconnect network
See reconnecting status
Reconnect automatically
Keep user draft
Recover conversation state
```

---

## Milestone 6 — Production Foundation

Add:

```text
Rate limiting
Idempotency
Multiple clients
Error handling
Logging
Tests
Security hardening
Documentation
```

---

# 54. Final Frontend Checklist

```text
[ ] Electron starts
[ ] React starts
[ ] TypeScript configured
[ ] Login works
[ ] Register works
[ ] Token/session handling works
[ ] Refresh works
[ ] Logout works
[ ] Conversation list works
[ ] New conversation works
[ ] Previous conversation works
[ ] Message input works
[ ] WebSocket connects
[ ] Connection status shown
[ ] AI response streams
[ ] Streaming message renders correctly
[ ] Reconnection works
[ ] Draft is preserved
[ ] Errors are understandable
[ ] Multiple clients behave predictably
[ ] Electron security settings are appropriate
```

---

# 55. Final Backend Checklist

```text
[ ] FastAPI starts
[ ] PostgreSQL connected
[ ] Redis connected
[ ] Migrations work
[ ] User model exists
[ ] Passwords hashed
[ ] Registration works
[ ] Login works
[ ] Access authentication works
[ ] Refresh works
[ ] Sessions work
[ ] Conversation CRUD works
[ ] Authorization works
[ ] Messages persist
[ ] WebSocket works
[ ] WebSocket authentication works
[ ] Streaming works
[ ] LLM provider abstraction exists
[ ] AI errors handled
[ ] Redis rate limiting works
[ ] Idempotency implemented
[ ] Multiple clients handled
[ ] Logging exists
[ ] Tests exist
[ ] Docker works
```

---

# 56. The Most Important Design Rule

Keep the layers separate:

```text
React
  ↓
API / WebSocket client
  ↓
FastAPI routes / WebSocket handlers
  ↓
Services
  ↓
Database / Redis / LLM abstraction
```

Avoid:

```text
React → PostgreSQL
React → Redis
React → LLM provider
```

and avoid putting all backend logic inside:

```text
main.py
```

The assessment is evaluating the foundation of a production application, so clean boundaries and predictable failure behavior are more valuable than a large amount of code.

---

# 57. Minimum Complete Version

If you need to get a working version quickly, the minimum complete path is:

```text
Electron
   ↓
React Login
   ↓
FastAPI Auth
   ↓
PostgreSQL User
   ↓
React Chat
   ↓
FastAPI WebSocket
   ↓
LLM abstraction
   ↓
LLM streaming
   ↓
PostgreSQL Messages
   ↓
Redis rate limiting
   ↓
Reconnect handling
```

Once that works, improve:

```text
security
error handling
idempotency
multiple clients
tests
documentation
```

Do not start with advanced UI features.

---

# 58. Final Goal

When finished, a reviewer should be able to do:

```text
git clone ...
cp .env.example .env
docker compose up
npm install
npm run dev
```

Then:

```text
Register
 ↓
Login
 ↓
Create conversation
 ↓
Send message
 ↓
Watch AI response stream
 ↓
Close application
 ↓
Reopen application
 ↓
Conversation still exists
 ↓
Disconnect network
 ↓
Application reconnects
 ↓
Continue working
```

That flow demonstrates almost every major requirement in the assessment.
