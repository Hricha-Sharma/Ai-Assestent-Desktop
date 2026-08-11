# Desktop AI Assistant — Overall Project Structure

This document defines the recommended **complete repository structure** for the Software Development Intern assessment.

The assessment requires:

- Electron
- React
- TypeScript
- Python 3.12+
- FastAPI
- WebSockets
- PostgreSQL
- Redis
- Docker Compose

The project should be organized so that the desktop client, backend, infrastructure, tests, and documentation are clearly separated.

---

# 1. Final High-Level Structure

```text
desktop-ai-assistant/
│
├── apps/
│   └── desktop/
│
├── backend/
│
├── docs/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

The important separation is:

```text
apps/desktop  → Electron + React + TypeScript

backend      → Python + FastAPI + WebSocket + PostgreSQL + Redis

docs         → Architecture + decisions + development documentation

docker-compose.yml → Local infrastructure
```

---

# 2. Complete Recommended Structure

```text
desktop-ai-assistant/
│
├── apps/
│   │
│   └── desktop/
│       │
│       ├── electron/
│       │   ├── main.ts
│       │   └── preload.ts
│       │
│       ├── src/
│       │   │
│       │   ├── app/
│       │   │   ├── App.tsx
│       │   │   └── routes.tsx
│       │   │
│       │   ├── components/
│       │   │   │
│       │   │   ├── auth/
│       │   │   │   ├── LoginForm.tsx
│       │   │   │   └── RegisterForm.tsx
│       │   │   │
│       │   │   ├── chat/
│       │   │   │   ├── ChatWindow.tsx
│       │   │   │   ├── MessageList.tsx
│       │   │   │   ├── MessageItem.tsx
│       │   │   │   └── MessageInput.tsx
│       │   │   │
│       │   │   ├── conversations/
│       │   │   │   ├── ConversationList.tsx
│       │   │   │   └── ConversationItem.tsx
│       │   │   │
│       │   │   └── common/
│       │   │       ├── ConnectionStatus.tsx
│       │   │       ├── Loading.tsx
│       │   │       └── ErrorMessage.tsx
│       │   │
│       │   ├── pages/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── RegisterPage.tsx
│       │   │   └── ChatPage.tsx
│       │   │
│       │   ├── api/
│       │   │   ├── client.ts
│       │   │   ├── auth.ts
│       │   │   └── conversations.ts
│       │   │
│       │   ├── websocket/
│       │   │   ├── WebSocketManager.ts
│       │   │   └── events.ts
│       │   │
│       │   ├── stores/
│       │   │   ├── authStore.ts
│       │   │   ├── chatStore.ts
│       │   │   └── connectionStore.ts
│       │   │
│       │   ├── types/
│       │   │   ├── auth.ts
│       │   │   ├── conversation.ts
│       │   │   └── websocket.ts
│       │   │
│       │   └── main.tsx
│       │
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── ...
│
├── backend/
│   │
│   ├── app/
│   │   │
│   │   ├── main.py
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   └── conversations.py
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── database.py
│   │   │   └── base.py
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── session.py
│   │   │   ├── conversation.py
│   │   │   └── message.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── conversation.py
│   │   │   └── message.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── conversation_service.py
│   │   │   ├── ai_service.py
│   │   │   ├── rate_limit_service.py
│   │   │   └── idempotency_service.py
│   │   │
│   │   ├── llm/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   └── provider.py
│   │   │
│   │   └── websocket/
│   │       ├── __init__.py
│   │       ├── manager.py
│   │       └── handlers.py
│   │
│   ├── tests/
│   │   ├── test_health.py
│   │   ├── test_auth.py
│   │   ├── test_conversations.py
│   │   └── test_websocket.py
│   │
│   ├── alembic/
│   │   ├── versions/
│   │   └── env.py
│   │
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── requirements.lock.txt
│   ├── Dockerfile
│   └── .env.example
│
├── docs/
│   ├── architecture.md
│   ├── decisions.md
│   ├── api.md
│   └── development.md
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

# 3. Root Directory

The root contains project-wide configuration.

```text
desktop-ai-assistant/
│
├── apps/
├── backend/
├── docs/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## `docker-compose.yml`

Responsible for local infrastructure:

```text
PostgreSQL
Redis
FastAPI backend
```

During development, Electron can run directly on the host.

Later, the backend can be fully containerized.

---

# 4. `apps/desktop`

This is the complete desktop client.

```text
apps/
└── desktop/
```

It contains:

```text
Electron
React
TypeScript
WebSocket client
HTTP API client
frontend state
```

The desktop application should NOT contain:

```text
PostgreSQL logic
Redis logic
LLM provider SDK logic
```

Those belong to the backend/infrastructure.

---

# 5. Electron Folder

```text
apps/desktop/electron/
├── main.ts
└── preload.ts
```

## `main.ts`

Responsible for:

```text
Electron application lifecycle
BrowserWindow creation
Native desktop configuration
```

## `preload.ts`

Responsible for:

```text
Secure bridge between Electron and renderer
```

Use:

```text
contextIsolation: true
nodeIntegration: false
```

Keep the renderer isolated from Node.js unless native functionality is explicitly required.

---

# 6. React Source

```text
apps/desktop/src/
```

This is the React application.

---

# 7. `app/`

```text
src/app/
├── App.tsx
└── routes.tsx
```

Responsible for:

```text
Application root
Routing
Global application composition
```

---

# 8. `components/`

Components are grouped by responsibility.

```text
components/
├── auth/
├── chat/
├── conversations/
└── common/
```

## Auth

```text
LoginForm
RegisterForm
```

## Chat

```text
ChatWindow
MessageList
MessageItem
MessageInput
```

## Conversations

```text
ConversationList
ConversationItem
```

## Common

```text
ConnectionStatus
Loading
ErrorMessage
```

Keep components focused.

For example:

```text
MessageInput
```

should handle input UI.

It should not contain:

```text
PostgreSQL
LLM logic
authentication implementation
```

---

# 9. `pages/`

```text
src/pages/
├── LoginPage.tsx
├── RegisterPage.tsx
└── ChatPage.tsx
```

Pages compose components.

For example:

```text
ChatPage
 ├── ConversationList
 ├── ChatWindow
 │    ├── MessageList
 │    └── MessageInput
 └── ConnectionStatus
```

---

# 10. `api/`

```text
src/api/
├── client.ts
├── auth.ts
└── conversations.ts
```

## `client.ts`

Central HTTP client.

Responsible for:

```text
Backend URL
Authentication
Headers
Error handling
Token refresh
```

## `auth.ts`

Contains:

```text
register()
login()
refresh()
logout()
getCurrentUser()
```

## `conversations.ts`

Contains:

```text
createConversation()
getConversations()
getConversation()
getMessages()
deleteConversation()
```

---

# 11. `websocket/`

```text
src/websocket/
├── WebSocketManager.ts
└── events.ts
```

## WebSocketManager

Responsible for:

```text
connect
disconnect
send
receive
reconnect
connection state
```

## events.ts

Define the event types:

```text
connection.ready
message.send
message.created
message.delta
message.completed
message.failed
error
```

This avoids random strings being passed around the application.

---

# 12. `stores/`

```text
src/stores/
├── authStore.ts
├── chatStore.ts
└── connectionStore.ts
```

Possible responsibilities:

### authStore

```text
current user
authentication state
access token
```

### chatStore

```text
conversations
selected conversation
messages
draft
streaming message
```

### connectionStore

```text
connected
connecting
reconnecting
disconnected
```

You can use a state-management library here if you want, but if you add one, explain why in `docs/decisions.md`.

---

# 13. `types/`

```text
src/types/
├── auth.ts
├── conversation.ts
└── websocket.ts
```

Keep shared frontend TypeScript types here.

Example:

```text
User
Conversation
Message
WebSocketEvent
```

---

# 14. Backend Root

```text
backend/
```

Everything inside here is Python/FastAPI related.

---

# 15. `backend/app/main.py`

This is the application entry point.

It should primarily:

```text
Create FastAPI app
Register routers
Register middleware
Register WebSocket routes
Register startup/shutdown behavior
```

Avoid putting all business logic here.

---

# 16. `backend/app/api`

```text
api/
├── auth.py
└── conversations.py
```

These are HTTP route definitions.

### `auth.py`

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET /auth/me
```

### `conversations.py`

```text
POST /conversations
GET /conversations
GET /conversations/{id}
DELETE /conversations/{id}
GET /conversations/{id}/messages
```

Routes should be thin.

They should call services rather than implementing all business logic themselves.

---

# 17. `backend/app/core`

```text
core/
├── config.py
├── security.py
└── dependencies.py
```

## config.py

Environment/configuration.

## security.py

```text
Password hashing
JWT creation
JWT validation
```

## dependencies.py

Reusable FastAPI dependencies:

```text
get_db()
get_redis()
get_current_user()
```

---

# 18. `backend/app/db`

```text
db/
├── database.py
└── base.py
```

## database.py

PostgreSQL connection/session setup.

## base.py

SQLAlchemy metadata/base.

Alembic uses this metadata for migrations.

---

# 19. `backend/app/models`

```text
models/
├── user.py
├── session.py
├── conversation.py
└── message.py
```

These represent PostgreSQL tables.

Relationship:

```text
User
 │
 ├─────────────┐
 │             │
 ▼             ▼
Session    Conversation
                │
                ▼
             Message
```

---

# 20. `backend/app/schemas`

```text
schemas/
├── auth.py
├── conversation.py
└── message.py
```

These are Pydantic request/response models.

Do not confuse:

```text
models = database models
schemas = API data validation
```

For example:

```text
models/user.py
```

defines the database representation.

While:

```text
schemas/auth.py
```

defines what an API request/response looks like.

---

# 21. `backend/app/services`

```text
services/
├── auth_service.py
├── conversation_service.py
├── ai_service.py
├── rate_limit_service.py
└── idempotency_service.py
```

This is where the main business logic belongs.

---

# 22. `auth_service.py`

Responsible for:

```text
Register user
Validate login
Create session
Issue authentication
Refresh session
Logout/revoke session
```

---

# 23. `conversation_service.py`

Responsible for:

```text
Create conversation
List conversations
Get conversation
Delete conversation
Get messages
Validate ownership
```

---

# 24. `ai_service.py`

Responsible for:

```text
Prepare conversation history
Call LLM abstraction
Stream response
Handle AI failures
```

It should NOT know which frontend framework is being used.

---

# 25. `rate_limit_service.py`

Responsible for:

```text
Check Redis rate limit
Increment counters
Reject excessive requests
```

Example:

```text
user:123:messages
```

---

# 26. `idempotency_service.py`

Responsible for:

```text
Check request_id
Store request state
Prevent duplicate processing
```

Redis is a suitable place for this short-lived state.

---

# 27. `backend/app/llm`

```text
llm/
├── base.py
└── provider.py
```

This is a very important separation.

```text
base.py
    ↓
LLM interface
    ↓
provider.py
    ↓
actual provider
```

The rest of the application should depend on the interface rather than directly on a provider SDK.

---

# 28. `backend/app/websocket`

```text
websocket/
├── manager.py
└── handlers.py
```

## manager.py

Tracks live WebSocket connections.

Example:

```text
User 1
 ├── Client A socket
 └── Client B socket
```

## handlers.py

Processes WebSocket events:

```text
message.send
connection
disconnect
```

---

# 29. Backend Tests

```text
backend/tests/
├── test_health.py
├── test_auth.py
├── test_conversations.py
└── test_websocket.py
```

Test the important behavior rather than every line.

---

# 30. Alembic

```text
backend/alembic/
├── versions/
└── env.py
```

Migrations live here.

Example:

```text
versions/
└── 001_create_initial_tables.py
```

Do not manually modify the database in a way that is not represented by migrations.

---

# 31. Docker Files

```text
backend/
└── Dockerfile
```

The Dockerfile builds the FastAPI application.

Root:

```text
docker-compose.yml
```

orchestrates:

```text
backend
postgres
redis
```

---

# 32. Documentation

Create:

```text
docs/
├── architecture.md
├── decisions.md
├── api.md
└── development.md
```

## architecture.md

Explain:

```text
System architecture
Frontend/backend communication
Database
Redis
WebSocket
LLM layer
```

## decisions.md

Explain why you selected:

```text
WebSockets
PostgreSQL
Redis
JWT/session strategy
LLM abstraction
Rate limiting
Idempotency
```

## api.md

Document:

```text
HTTP endpoints
WebSocket events
request/response formats
```

## development.md

Document:

```text
Installation
Docker
Migrations
Backend
Frontend
Testing
```

---

# 33. Root README

The root `README.md` should be the first thing a reviewer sees.

Recommended structure:

```text
# Desktop AI Assistant

## Overview

## Features

## Architecture

## Tech Stack

## Project Structure

## Prerequisites

## Environment Setup

## Running the Project

## Database Migrations

## Testing

## WebSocket Protocol

## Reliability

## Fair Usage

## LLM Provider Abstraction

## Architecture Decisions

## Known Limitations
```

---

# 34. Data Flow Through the Project

A normal login:

```text
React LoginForm
      ↓
api/auth.ts
      ↓
FastAPI /auth/login
      ↓
auth_service.py
      ↓
User model
      ↓
PostgreSQL
      ↓
Session/token
      ↓
React authStore
```

---

# 35. Chat Data Flow

When the user sends:

```text
"Explain Redis"
```

the flow should be:

```text
MessageInput.tsx
       ↓
chatStore
       ↓
WebSocketManager
       ↓
FastAPI WebSocket
       ↓
websocket/handlers.py
       ↓
rate_limit_service.py
       ↓
conversation_service.py
       ↓
PostgreSQL
       ↓
ai_service.py
       ↓
llm/base.py
       ↓
llm/provider.py
       ↓
LLM
```

Response:

```text
LLM
 ↓
ai_service.py
 ↓
WebSocket handler
 ↓
message.delta
 ↓
WebSocketManager
 ↓
chatStore
 ↓
MessageList
 ↓
User
```

---

# 36. Database Flow

Permanent information:

```text
FastAPI
   ↓
SQLAlchemy
   ↓
PostgreSQL
```

Store:

```text
Users
Sessions
Conversations
Messages
```

---

# 37. Redis Flow

Temporary/high-frequency information:

```text
FastAPI
   ↓
Redis
```

Store/use:

```text
Rate limit counters
Idempotency keys
Short-lived session/cache state
Temporary request state
```

Do NOT make Redis the permanent conversation database.

---

# 38. WebSocket Flow

```text
Electron
    │
    │ WebSocket
    ▼
FastAPI
    │
    ├── Authenticate
    ├── Authorize
    ├── Rate limit
    └── AI service
           │
           ▼
        LLM provider
           │
           ▼
       Stream chunks
           │
           ▼
       FastAPI WS
           │
           ▼
        Electron
```

---

# 39. What Each Technology Does

| Technology | Responsibility |
|---|---|
| Electron | Desktop application shell |
| React | UI |
| TypeScript | Frontend type safety |
| FastAPI | Backend/API |
| WebSocket | Real-time communication |
| PostgreSQL | Persistent data |
| Redis | Temporary/high-frequency state |
| Docker Compose | Local infrastructure |
| LLM provider | AI generation |
| Alembic | Database migrations |
| SQLAlchemy | Database access |

---

# 40. What NOT to Put Where

## React

Do not put:

```text
PostgreSQL queries
Redis queries
LLM SDK calls
```

## Electron

Do not put:

```text
Business logic
Database logic
LLM orchestration
```

unless there is a genuine desktop-native requirement.

## FastAPI Routes

Do not put:

```text
Large business logic
LLM provider implementation
```

Use services.

## PostgreSQL

Do not use it for:

```text
Live WebSocket objects
```

## Redis

Do not use it as the only storage for:

```text
Users
Conversations
Messages
```

---

# 41. Recommended Dependency Direction

Keep the architecture roughly like this:

```text
                    FRONTEND
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
          REST API           WebSocket
             │                   │
             └─────────┬─────────┘
                       ▼
                    FASTAPI
                       │
                    SERVICES
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     PostgreSQL      Redis       LLM Layer
```

The important rule:

```text
Outer layers depend on inner layers.

Business logic should not depend directly on UI.
```

---

# 42. Development Order Based on This Structure

Create folders in this order:

```text
1. Root project
2. backend/
3. apps/desktop/
4. Docker Compose
5. PostgreSQL
6. Redis
7. FastAPI
8. Database models
9. Authentication
10. Conversation APIs
11. Electron
12. React
13. WebSocket
14. LLM abstraction
15. AI streaming
16. Reliability
17. Rate limiting
18. Idempotency
19. Tests
20. Documentation
```

Do not create every file and then try to implement everything.

Create the structure gradually as each feature is implemented.

---

# 43. Final Repository View

When the project is complete, the reviewer should see something close to:

```text
desktop-ai-assistant/
│
├── apps/
│   └── desktop/
│       ├── electron/
│       │   ├── main.ts
│       │   └── preload.ts
│       │
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── api/
│       │   ├── websocket/
│       │   ├── stores/
│       │   └── types/
│       │
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── llm/
│   │   ├── websocket/
│   │   └── main.py
│   │
│   ├── tests/
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── requirements.lock.txt
│   └── Dockerfile
│
├── docs/
│   ├── architecture.md
│   ├── decisions.md
│   ├── api.md
│   └── development.md
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

# 44. Final Mental Model

Think of the entire project as five layers:

```text
┌──────────────────────────────────────┐
│  1. DESKTOP                          │
│  Electron + React + TypeScript      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  2. COMMUNICATION                    │
│  HTTP + WebSocket                    │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  3. APPLICATION                      │
│  FastAPI + Services                  │
└──────────────┬───────────┬───────────┘
               │           │
               ▼           ▼
┌──────────────────┐   ┌────────────────┐
│ 4. DATA          │   │ 5. AI          │
│ PostgreSQL       │   │ LLM abstraction│
│ Redis            │   │ Provider       │
└──────────────────┘   └────────────────┘
```

That is the structure you should build toward.

The assessment specifically asks for the Electron application, FastAPI backend, PostgreSQL, Redis, Docker Compose, and README as deliverables, so this structure keeps each of those concerns visible and independently understandable.
