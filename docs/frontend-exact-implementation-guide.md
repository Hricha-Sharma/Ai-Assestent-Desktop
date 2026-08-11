# Frontend Exact Implementation Guide

This guide covers the Electron + React + TypeScript desktop client for the Desktop AI Assistant assessment.

## 1. Create the React App

From the repository root:

```bash
mkdir apps
cd apps
npm create vite@latest desktop -- --template react-ts
cd desktop
npm install
```

Verify:

```bash
npm run dev
```

---

## 2. Install Electron

```bash
npm install --save-dev electron concurrently wait-on
npm install axios zustand
npm install --save-dev @types/node
```

Purpose:

- `electron` — desktop runtime
- `concurrently` — run Vite and Electron together
- `wait-on` — wait for Vite before launching Electron
- `axios` — HTTP API client
- `zustand` — lightweight shared frontend state

If you add another dependency, document why in `docs/decisions.md`.

---

## 3. Frontend Structure

Create:

```text
apps/desktop/
├── electron/
│   ├── main.ts
│   └── preload.ts
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── routes.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── conversations/
│   │   └── common/
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── ChatPage.tsx
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   └── conversations.ts
│   ├── websocket/
│   │   ├── WebSocketManager.ts
│   │   └── events.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── chatStore.ts
│   │   └── connectionStore.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── conversation.ts
│   │   └── websocket.ts
│   └── main.tsx
│
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 4. Electron Main Process

Create `electron/main.ts`.

It should:

- create the `BrowserWindow`
- load the Vite development URL during development
- load the production build in production
- handle Electron lifecycle

Do not put PostgreSQL, Redis, or LLM logic here.

Use a secure renderer configuration:

```text
contextIsolation: true
nodeIntegration: false
```

---

## 5. Electron Preload

Create `electron/preload.ts`.

Keep it minimal and use `contextBridge` only for functionality that genuinely needs Electron/Node access.

Do not expose unrestricted Node APIs to React.

---

## 6. Configure npm Scripts

Configure `package.json` so development can run Vite and Electron together. A typical development script is:

```json
"dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\""
```

Also keep:

```json
"build": "tsc -b && vite build"
```

Verify:

```bash
npm run dev
```

The React application should open inside an Electron window.

---

## 7. Environment Variables

Create `.env.example`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

Create a local `.env` with the same development values.

Never commit secrets or the real `.env`.

---

## 8. HTTP API Client

Create:

```text
src/api/client.ts
```

Centralize:

- backend URL
- authentication headers
- HTTP errors
- token refresh
- appropriate retries

Do not create a separate API client inside every component.

Create:

```text
src/api/auth.ts
src/api/conversations.ts
```

---

## 9. Authentication API

Implement in `auth.ts`:

```text
register()
login()
refresh()
logout()
getCurrentUser()
```

Backend endpoints:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

---

## 10. Authentication Types

Create `src/types/auth.ts`.

Define types such as:

```text
User
LoginRequest
RegisterRequest
AuthResponse
```

Avoid `any` when a real type can be defined.

---

## 11. Authentication Store

Create `src/stores/authStore.ts`.

Track:

```text
currentUser
authentication state
access token
loading/initializing state
```

Recommended states:

```text
initializing
authenticated
unauthenticated
```

---

## 12. Login and Register Pages

Create:

```text
src/pages/LoginPage.tsx
src/pages/RegisterPage.tsx
```

Login should have:

```text
Email
Password
Submit
Loading state
Error state
Register link
```

Register should have:

```text
Email
Password
Confirm password
Submit
Error state
```

Flow:

```text
Form
 ↓
authStore
 ↓
auth API
 ↓
FastAPI
 ↓
Authenticated state
 ↓
Chat page
```

---

## 13. Token Refresh

Use the backend's short-lived access token + refresh mechanism.

When an API request receives an authentication-expired response:

```text
401
 ↓
refresh()
 ↓
retry original request
```

If refresh fails:

```text
clear auth state
 ↓
redirect to login
```

Do not retry forever.

Avoid casually putting long-lived credentials in `localStorage`; document the credential-storage decision you make for the desktop app.

---

## 14. Conversation API

Create `src/api/conversations.ts`.

Implement:

```text
createConversation()
getConversations()
getConversation()
getMessages()
deleteConversation()
```

Backend endpoints:

```text
POST   /conversations
GET    /conversations
GET    /conversations/{id}
GET    /conversations/{id}/messages
DELETE /conversations/{id}
```

---

## 15. Conversation Types

Create `src/types/conversation.ts`.

Define:

```text
Conversation
Message
MessageRole
MessageStatus
```

Example roles:

```text
user
assistant
system
```

Example statuses:

```text
pending
completed
failed
```

---

## 16. Chat Store

Create `src/stores/chatStore.ts`.

Track:

```text
conversations
selectedConversation
messages
draft
streamingMessage
```

Message state can include:

```text
pending
streaming
completed
failed
```

---

## 17. Conversation UI

Create:

```text
src/components/conversations/ConversationList.tsx
src/components/conversations/ConversationItem.tsx
```

The list should:

- display conversations
- select a conversation
- create a new conversation
- refresh after reconnect when needed

Keep API and WebSocket logic out of the presentation components.

---

## 18. Chat UI

Create:

```text
src/components/chat/ChatWindow.tsx
src/components/chat/MessageList.tsx
src/components/chat/MessageItem.tsx
src/components/chat/MessageInput.tsx
```

Recommended composition:

```text
ChatWindow
├── MessageList
└── MessageInput
```

`MessageInput` should preserve the draft if connectivity fails.

---

## 19. Initial Conversation Loading

After authentication:

```text
GET /conversations
 ↓
chatStore
 ↓
ConversationList
```

When a conversation is selected:

```text
GET /conversations/{id}/messages
 ↓
chatStore
 ↓
MessageList
```

---

## 20. New Conversation

When the user clicks New Conversation:

```text
POST /conversations
 ↓
receive conversation
 ↓
add to store
 ↓
select conversation
 ↓
show empty chat
```

---

## 21. WebSocket Manager

Create:

```text
src/websocket/WebSocketManager.ts
```

This should be the single place responsible for:

```text
connect
disconnect
send
receive
reconnect
connection state
```

React components should not each call `new WebSocket()` themselves.

---

## 22. WebSocket Events

Create `src/websocket/events.ts`.

Define typed events:

```text
connection.ready
message.send
message.created
message.delta
message.completed
message.failed
error
```

Example outgoing event:

```json
{
  "type": "message.send",
  "request_id": "req-123",
  "conversation_id": "conv-123",
  "content": "Explain Redis"
}
```

The event format must match the backend implementation.

---

## 23. WebSocket Connection State

Create:

```text
src/stores/connectionStore.ts
```

Track:

```text
connecting
connected
reconnecting
disconnected
error
```

Create:

```text
src/components/common/ConnectionStatus.tsx
```

Display simple states such as:

```text
Connected
Connecting...
Reconnecting...
Offline
```

---

## 24. Application Initialization

On application startup:

```text
React starts
 ↓
restore authentication
 ↓
authenticated?
 ├── no  → Login
 └── yes
      ↓
   connect WebSocket
      ↓
   load conversations
```

Centralize initialization instead of having several components independently restore authentication.

---

## 25. Protected Routes

Create `src/app/routes.tsx`.

Recommended routes:

```text
/login
/register
/chat
```

The chat route must require authentication.

During authentication restoration, show a loading state rather than briefly rendering the wrong screen.

---

## 26. Send a Message

Implement:

```text
User presses Send
 ↓
generate request_id
 ↓
add pending user message
 ↓
send message.send over WebSocket
 ↓
wait for server events
```

Every message request should have a stable `request_id` so the backend can provide idempotent behavior after retries.

---

## 27. Streaming AI Response

When the backend sends:

```json
{
  "type": "message.delta",
  "message_id": "msg-1",
  "delta": "Redis"
}
```

append the delta to the corresponding streaming assistant message.

For subsequent deltas:

```text
existing content + delta
```

Do not replace the entire response incorrectly on every chunk.

---

## 28. Completed Event

When:

```json
{
  "type": "message.completed",
  "message_id": "msg-1"
}
```

then:

```text
mark message completed
stop streaming indicator
```

---

## 29. Failed Event

When:

```json
{
  "type": "message.failed",
  "message_id": "msg-1",
  "code": "AI_PROVIDER_ERROR"
}
```

then:

```text
mark message failed
stop streaming indicator
show understandable error
preserve user's original message
```

Never show raw backend stack traces to the user.

---

## 30. Reconnection

Use exponential backoff rather than a tight reconnect loop.

Conceptually:

```text
1 second
2 seconds
4 seconds
8 seconds
...
```

Set a maximum delay.

Reset the backoff after a successful connection.

---

## 31. Network Failure

If the network disappears:

```text
WebSocket closes
 ↓
connectionStore = reconnecting
 ↓
show Reconnecting...
 ↓
keep current UI and draft
 ↓
retry connection
```

When the connection returns:

```text
connected
 ↓
refresh/synchronize relevant conversation state
```

---

## 32. Preserve User Work

The user must not lose a typed message just because the network is temporarily unavailable.

At minimum:

```text
MessageInput
 ↓
draft in chatStore
```

If the application is restarted, you can additionally persist drafts locally if appropriate, but this is not necessary for the core assessment requirement.

---

## 33. Retry Ambiguous Sends Safely

The difficult case is:

```text
User sends message
 ↓
network disconnects
 ↓
client does not know whether backend received it
```

Use the same `request_id` when retrying the same logical request.

The backend's Redis-backed idempotency layer should prevent duplicate processing.

The frontend should also avoid inserting the same message/event into its store twice.

---

## 34. Reconnect Synchronization

After a successful reconnect:

```text
reconnect
 ↓
load current conversation/messages
 ↓
reconcile local state
```

Use stable IDs such as:

```text
conversation_id
message_id
request_id
```

This matters when another desktop client has modified the same conversation while this client was offline.

---

## 35. Multiple Desktop Clients

The same user may have:

```text
Desktop A → WebSocket A
Desktop B → WebSocket B
```

The frontend should treat these as separate connections/sessions.

Do not assume one user has only one WebSocket connection.

The backend remains the source of truth for persistent conversations and messages.

---

## 36. Error and Loading Components

Create:

```text
src/components/common/ErrorMessage.tsx
src/components/common/Loading.tsx
```

Provide useful states for:

```text
Login
Register
Conversation loading
Message loading
Connection
Reconnection
AI failure
Rate limiting
```

Use user-friendly text such as:

```text
Unable to connect. Retrying...
```

rather than exposing technical socket errors.

---

## 37. Exact Development Sequence

Follow this order.

### Phase A — React

```bash
npm create vite@latest desktop -- --template react-ts
cd desktop
npm install
npm run dev
```

### Phase B — Electron

```bash
npm install --save-dev electron concurrently wait-on
```

Create:

```text
electron/main.ts
electron/preload.ts
```

Make `npm run dev` launch Electron + React.

### Phase C — API Client

```bash
npm install axios
```

Create:

```text
src/api/client.ts
src/api/auth.ts
src/api/conversations.ts
```

First test:

```text
GET /health
```

### Phase D — Authentication

Create:

```text
src/types/auth.ts
src/stores/authStore.ts
src/pages/LoginPage.tsx
src/pages/RegisterPage.tsx
```

Implement register, login, refresh, logout, and protected routes.

### Phase E — Conversations

Create:

```text
src/types/conversation.ts
src/stores/chatStore.ts
src/components/conversations/
src/components/chat/
```

Implement creating, listing, opening, and loading conversations.

### Phase F — WebSocket

Create:

```text
src/websocket/WebSocketManager.ts
src/websocket/events.ts
src/stores/connectionStore.ts
```

First make connection/disconnection/status work.

Then implement message events.

### Phase G — Streaming

Implement:

```text
message.send
message.created
message.delta
message.completed
message.failed
```

Connect the stream to `chatStore` and `MessageList`.

### Phase H — Reliability

Implement:

```text
exponential reconnect
request_id
duplicate prevention
draft preservation
reconnect synchronization
```

### Phase I — Multiple Sessions

Test two Electron clients logged in as the same user.

### Phase J — Polish

Only after functionality works, add:

```text
loading states
error states
connection indicator
small UX improvements
```

Visual design is not the primary assessment target.

---

## 38. Manual Reliability Tests

### Backend unavailable

Stop FastAPI.

Expected:

```text
Reconnecting...
UI does not crash
```

Start FastAPI again.

Expected:

```text
WebSocket reconnects
conversation remains available
```

### Network interruption

Temporarily disable the network.

Expected:

```text
connection status changes
current draft remains
application stays usable
```

### Backend restart during streaming

Start an AI response and restart the backend.

Expected:

```text
stream may fail
UI shows a failure
application remains alive
user can retry
```

Perfect recovery is not required; graceful failure is.

---

## 39. Frontend Testing

Test at least:

```text
authentication state
login failure
refresh behavior
conversation loading
WebSocket connection
WebSocket reconnect
message.delta handling
message.completed handling
message.failed handling
duplicate event handling
draft preservation
```

Keep the most important reliability scenarios covered rather than chasing arbitrary line coverage.

---

## 40. Frontend Definition of Done

The frontend is ready when:

```text
npm run dev
 ↓
Electron starts
 ↓
Register/Login
 ↓
Chat page
 ↓
Create conversation
 ↓
Send message
 ↓
WebSocket
 ↓
AI response streams
 ↓
Message completes
```

After restarting Electron:

```text
authentication/session restored when valid
 ↓
previous conversations available
```

During temporary network loss:

```text
Reconnecting...
 ↓
draft preserved
 ↓
connection restored
 ↓
conversation synchronized
```

---

## 41. Final Responsibility Boundary

### Frontend owns

```text
Electron
React UI
UI state
Authentication UI
Conversation UI
HTTP client
WebSocket client
Reconnect behavior
Draft preservation
Connection status
```

### Backend owns

```text
Authentication authority
Authorization
PostgreSQL
Redis
Conversation persistence
Rate limiting
Idempotency
LLM provider
AI streaming
Business rules
```

The frontend must never directly access:

```text
PostgreSQL
Redis
LLM provider
```

---

## 42. Final Frontend Mental Model

```text
Electron
   │
   ├── Main Process
   │      └── main.ts
   │
   ├── Preload
   │      └── preload.ts
   │
   └── Renderer
          │
          └── React
               │
               ├── Pages
               ├── Components
               ├── Stores
               ├── HTTP API Client
               └── WebSocket Manager
                          │
                          ▼
                       FastAPI
                          │
                ┌─────────┼─────────┐
                ▼         ▼         ▼
           PostgreSQL   Redis      LLM
```

The implementation order should remain:

```text
Electron
 ↓
React
 ↓
HTTP API
 ↓
Authentication
 ↓
Conversations
 ↓
WebSocket
 ↓
Streaming
 ↓
Reconnection
 ↓
Reliability
 ↓
Polish
```
