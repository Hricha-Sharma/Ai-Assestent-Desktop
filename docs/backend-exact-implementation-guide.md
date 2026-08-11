# Backend Implementation — Exact Commands & Step-by-Step Guide

This guide is for building the **FastAPI backend** of the Desktop AI Assistant assessment.

The assessment requires:

- Python 3.12+
- FastAPI
- WebSockets
- PostgreSQL
- Redis
- Docker Compose

The backend must provide authentication, persistent conversations, real-time AI streaming, multiple-session support, fair usage controls, and graceful failure handling.

---

# 1. Backend Goal

By the end of this guide, the backend should look like:

```text
FastAPI
│
├── Authentication
│   ├── Register
│   ├── Login
│   ├── Refresh
│   ├── Logout
│   └── Current user
│
├── Conversations
│   ├── Create
│   ├── List
│   ├── Get
│   └── Messages
│
├── WebSocket
│   ├── Authentication
│   ├── Receive message
│   ├── Stream AI response
│   ├── Connection events
│   └── Errors
│
├── LLM Layer
│   ├── Provider interface
│   └── Provider implementation
│
├── PostgreSQL
│   ├── Users
│   ├── Sessions
│   ├── Conversations
│   └── Messages
│
└── Redis
    ├── Rate limiting
    ├── Idempotency
    └── Temporary state
```

---

# 2. Prerequisites

Install:

```text
Python 3.12+
Docker Desktop
Git
```

Check Python:

```bash
python --version
```

You should see something similar to:

```text
Python 3.12.x
```

Check Docker:

```bash
docker --version
docker compose version
```

---

# 3. Create the Backend Directory

From the project root:

```bash
mkdir backend
cd backend
```

Create the Python virtual environment:

### Windows

```bash
python -m venv .venv
```

Activate it:

```bash
.venv\Scripts\activate
```

### macOS/Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Verify:

```bash
python --version
```

---

# 4. Create requirements.txt

Create:

```text
backend/requirements.txt
```

Start with:

```text
fastapi
uvicorn[standard]

sqlalchemy
psycopg[binary]
alembic

redis

pydantic-settings

PyJWT
pwdlib[argon2]

python-multipart

httpx
```

For the AI provider, add the SDK for the provider you actually choose.

For example, if you choose a provider with an official Python SDK, add that SDK here.

Do not add several AI SDKs unless you actually need them.

---

# 5. Why These Dependencies?

Document these in `docs/decisions.md`.

### FastAPI

Backend web framework.

Used for:

```text
REST APIs
WebSockets
Dependency injection
Request validation
```

### Uvicorn

ASGI server used to run FastAPI.

### SQLAlchemy

Database ORM/data-access layer.

It keeps database code separated from API routes.

### psycopg

PostgreSQL driver used by SQLAlchemy.

### Alembic

Database migration system.

It lets you version schema changes.

### redis

Python Redis client.

Used for:

```text
Rate limiting
Idempotency
Temporary state
```

### pydantic-settings

Loads configuration from environment variables.

### PyJWT

Used for JWT access-token handling.

### pwdlib[argon2]

Used for secure password hashing.

### python-multipart

Useful for form-based requests and commonly required by authentication-related FastAPI integrations.

### httpx

Useful for asynchronous HTTP communication with external services where required.

---

# 6. Install Dependencies

From `backend/`:

```bash
pip install -r requirements.txt
```

Freeze the installed versions:

```bash
pip freeze > requirements.lock.txt
```

For the assessment, you can commit the lock file if you want reproducible local environments.

---

# 7. Create the Backend Structure

Create:

```text
backend/
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   └── conversations.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── security.py
│   │   └── dependencies.py
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   └── base.py
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── session.py
│   │   ├── conversation.py
│   │   └── message.py
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── conversation.py
│   │   └── message.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── conversation_service.py
│   │   ├── ai_service.py
│   │   ├── rate_limit_service.py
│   │   └── idempotency_service.py
│   │
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── provider.py
│   │
│   └── websocket/
│       ├── __init__.py
│       ├── manager.py
│       └── handlers.py
│
├── tests/
├── alembic/
├── alembic.ini
├── requirements.txt
├── requirements.lock.txt
├── Dockerfile
└── .env
```

---

# 8. First FastAPI Application

Create:

```text
app/main.py
```

Start with a minimal application:

```python
from fastapi import FastAPI

app = FastAPI(
    title="Desktop AI Assistant API",
    version="1.0.0",
)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

Run:

```bash
uvicorn app.main:app --reload
```

Open:

```text
http://localhost:8000/health
```

You should receive:

```json
{
  "status": "ok"
}
```

FastAPI docs:

```text
http://localhost:8000/docs
```

---

# 9. Create Configuration

Create:

```text
app/core/config.py
```

Use environment variables instead of hardcoding secrets.

Configuration should contain:

```text
DATABASE_URL
REDIS_URL

JWT_SECRET
ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS

LLM_PROVIDER
LLM_API_KEY
```

Create:

```text
.env.example
```

Example:

```env
DATABASE_URL=postgresql+psycopg://app:app@localhost:5432/assistant

REDIS_URL=redis://localhost:6379/0

JWT_SECRET=replace-me
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30

LLM_PROVIDER=your-provider
LLM_API_KEY=replace-me
```

Never commit the real `.env`.

---

# 10. Add .gitignore

At repository root:

```text
.env
.venv/
__pycache__/
*.pyc
.pytest_cache/
```

Also ignore:

```text
*.log
```

and any generated local database/cache files.

---

# 11. Start PostgreSQL and Redis

At the project root create:

```text
docker-compose.yml
```

Initially run:

```text
PostgreSQL
Redis
```

Example architecture:

```text
postgres
  port: 5432

redis
  port: 6379
```

The backend can run locally during development.

Later, add the backend itself to Docker Compose.

---

# 12. PostgreSQL Connection

Create:

```text
app/db/database.py
```

Use SQLAlchemy's async engine.

Conceptually:

```text
FastAPI
   ↓
SQLAlchemy async session
   ↓
PostgreSQL
```

Create a reusable:

```text
AsyncSession
```

dependency.

Do not create a new database engine for every request.

---

# 13. Database Base

Create:

```text
app/db/base.py
```

Create the SQLAlchemy declarative base.

All models should inherit from it.

Later Alembic will import this metadata.

---

# 14. Database Models

Create these four primary models:

```text
User
Session
Conversation
Message
```

Relationships:

```text
User
 │
 ├── Session
 │
 └── Conversation
        │
        └── Message
```

---

# 15. User Model

Create:

```text
app/models/user.py
```

Fields:

```text
id
email
password_hash
created_at
updated_at
```

Important:

```text
email = unique
```

Never store the user's raw password.

---

# 16. Session Model

Create:

```text
app/models/session.py
```

Fields:

```text
id
user_id
client_id
token_hash
expires_at
created_at
revoked_at
```

Why?

Because the assessment says the same user can access the application from multiple desktop clients simultaneously.

Therefore:

```text
User
 ├── Session A
 ├── Session B
 └── Session C
```

Do not use one global session per user.

---

# 17. Conversation Model

Create:

```text
app/models/conversation.py
```

Fields:

```text
id
user_id
title
created_at
updated_at
```

Relationship:

```text
User 1 ─── N Conversations
```

---

# 18. Message Model

Create:

```text
app/models/message.py
```

Fields:

```text
id
conversation_id
request_id
role
content
status
created_at
```

Roles:

```text
user
assistant
system
```

Statuses:

```text
pending
completed
failed
```

The `request_id` is useful for retry/idempotency.

---

# 19. Add Database Indexes

At minimum consider indexes for:

```text
users.email
sessions.user_id
conversations.user_id
messages.conversation_id
messages.request_id
```

Why?

Because common queries will be:

```text
Find user by email
Find user's conversations
Find conversation messages
Find existing request ID
```

---

# 20. Alembic Setup

From `backend/`:

```bash
alembic init alembic
```

Configure:

```text
alembic.ini
```

and:

```text
alembic/env.py
```

so Alembic uses your database URL and SQLAlchemy metadata.

---

# 21. Create Initial Migration

Run:

```bash
alembic revision --autogenerate -m "create initial tables"
```

Review the migration manually.

Then:

```bash
alembic upgrade head
```

Verify that PostgreSQL contains:

```text
users
sessions
conversations
messages
```

Do not blindly trust autogenerated migrations. Review them before committing.

---

# 22. Password Hashing

Create:

```text
app/core/security.py
```

Implement:

```text
hash_password()
verify_password()
```

Use Argon2 through the selected password hashing library.

Flow:

```text
Raw password
     ↓
hash_password()
     ↓
password_hash
     ↓
PostgreSQL
```

Login:

```text
Raw password
     ↓
verify_password()
     ↓
true / false
```

---

# 23. JWT Access Token

Create a helper:

```text
create_access_token()
```

The token should contain an appropriate subject/session identity.

Keep access tokens short-lived.

Example:

```text
15 minutes
```

The exact value is your design decision.

---

# 24. Refresh Token

Use a longer-lived refresh mechanism.

Example:

```text
30 days
```

Do not make the access token itself live for 30 days.

The point is:

```text
Short-lived access
+
Long-lived refresh
```

so users don't have unnecessary interruptions.

---

# 25. Authentication API

Create:

```text
app/api/auth.py
```

Implement:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

---

# 26. Register Endpoint

Implementation flow:

```text
POST /auth/register
        ↓
Validate request
        ↓
Check email
        ↓
Hash password
        ↓
Create User
        ↓
Commit
        ↓
Return user/session response
```

Test:

```bash
curl -X POST http://localhost:8000/auth/register
```

Or use Swagger:

```text
http://localhost:8000/docs
```

---

# 27. Login Endpoint

Flow:

```text
POST /auth/login
        ↓
Find user
        ↓
Verify password
        ↓
Create session
        ↓
Create access token
        ↓
Create refresh token
        ↓
Return authentication response
```

---

# 28. Refresh Endpoint

Flow:

```text
Refresh request
      ↓
Validate refresh token/session
      ↓
Check expiration/revocation
      ↓
Issue new access token
      ↓
Return it
```

If your design rotates refresh tokens, document it.

---

# 29. Logout Endpoint

Logout should revoke the appropriate session.

Example:

```text
POST /auth/logout
```

Flow:

```text
Authenticated user
       ↓
Find current session
       ↓
Mark revoked_at
       ↓
Invalidate temporary state if necessary
```

Do not automatically destroy every session unless that is explicitly your chosen logout behavior.

---

# 30. Current User Dependency

Create:

```text
app/core/dependencies.py
```

Implement:

```text
get_current_user()
```

It should:

```text
Read authentication
      ↓
Validate token
      ↓
Get user/session
      ↓
Return current user
```

Use it in protected routes.

---

# 31. Conversation APIs

Create:

```text
app/api/conversations.py
```

Endpoints:

```text
POST   /conversations
GET    /conversations
GET    /conversations/{id}
DELETE /conversations/{id}
GET    /conversations/{id}/messages
```

Every endpoint should use:

```text
current_user
```

and enforce ownership.

---

# 32. Conversation Ownership

Never do this:

```python
conversation = get_conversation(conversation_id)
```

and assume it belongs to the user.

Always enforce ownership.

Conceptually:

```text
WHERE
    conversation.id = requested_id
AND
    conversation.user_id = current_user.id
```

This prevents one user from accessing another user's conversation.

---

# 33. Redis Connection

Create a Redis client in your application infrastructure.

Load:

```text
REDIS_URL
```

from configuration.

Create reusable Redis access rather than opening a completely new connection for every operation.

---

# 34. Redis Rate Limiting

Create:

```text
app/services/rate_limit_service.py
```

Implement something like:

```text
check_user_rate_limit(user_id)
```

Concept:

```text
user:123:messages:minute
```

Increment a Redis counter.

Set an expiration.

Example conceptual policy:

```text
20 messages / minute / user
```

The exact number should be documented as your chosen fair-use policy.

---

# 35. Concurrent AI Request Limit

Rate limiting alone may not prevent:

```text
User sends 20 expensive AI requests
all running simultaneously
```

Consider a per-user concurrency limit.

Example:

```text
Maximum 2 active AI requests/user
```

Use Redis-backed temporary state if needed.

If the limit is reached:

```text
RATE_LIMITED
```

or:

```text
TOO_MANY_CONCURRENT_REQUESTS
```

---

# 36. LLM Abstraction

Create:

```text
app/llm/base.py
```

Define a provider interface.

Conceptually:

```python
class LLMProvider:
    async def stream_response(self, messages):
        ...
```

The actual implementation can use your chosen provider SDK.

---

# 37. Why Create an Abstraction?

The assessment specifically requires avoiding tight coupling to one provider.

Therefore the backend should look like:

```text
AIService
    ↓
LLMProvider
    ↓
Provider implementation
```

not:

```text
AIService
    ↓
SpecificProviderSDK
```

everywhere.

This lets you later replace:

```text
Provider A
```

with:

```text
Provider B
```

without rewriting conversation logic.

---

# 38. AI Service

Create:

```text
app/services/ai_service.py
```

Responsibilities:

```text
Get conversation history
Build LLM input
Call LLMProvider
Receive stream
Return stream to WebSocket layer
```

It should NOT directly manage:

```text
React
Electron
HTTP routes
```

---

# 39. WebSocket Endpoint

Create:

```text
app/websocket/handlers.py
```

Endpoint:

```text
/ws
```

Flow:

```text
Client connects
      ↓
Authenticate
      ↓
Accept connection
      ↓
Register connection
      ↓
Send connection.ready
      ↓
Wait for events
```

---

# 40. WebSocket Connection Manager

Create:

```text
app/websocket/manager.py
```

Track active connections.

Conceptually:

```python
connections = {
    user_id: {
        connection_1,
        connection_2,
    }
}
```

This is process-local live connection state.

Do not use PostgreSQL as the storage mechanism for active socket objects.

---

# 41. WebSocket Message Event

Client sends:

```json
{
  "type": "message.send",
  "request_id": "req-123",
  "conversation_id": "conv-123",
  "content": "Explain Redis"
}
```

Backend should:

```text
Parse JSON
 ↓
Validate schema
 ↓
Authenticate
 ↓
Authorize conversation
 ↓
Rate-limit
 ↓
Check idempotency
 ↓
Persist user message
 ↓
Create pending assistant message
 ↓
Call AI
```

---

# 42. Stream AI Response

When provider returns chunks:

```text
chunk 1
chunk 2
chunk 3
...
```

Send:

```json
{
  "type": "message.delta",
  "message_id": "msg-123",
  "delta": "Redis"
}
```

then:

```json
{
  "type": "message.delta",
  "message_id": "msg-123",
  "delta": " is"
}
```

and so on.

At completion:

```json
{
  "type": "message.completed",
  "message_id": "msg-123"
}
```

---

# 43. Persist the Assistant Message

Do not only stream the answer to the client.

Accumulate the final content.

Then:

```text
assistant message
      ↓
content = complete response
status = completed
      ↓
PostgreSQL
```

This ensures that restarting the backend does not erase conversations.

---

# 44. AI Failure

If the provider fails:

```text
Catch exception
      ↓
Log safe error
      ↓
assistant message = failed
      ↓
Send message.failed
      ↓
Keep WebSocket alive if possible
```

Example:

```json
{
  "type": "message.failed",
  "message_id": "msg-123",
  "code": "AI_PROVIDER_ERROR",
  "message": "Unable to generate a response."
}
```

Do not send internal stack traces to the client.

---

# 45. Idempotency

Create:

```text
app/services/idempotency_service.py
```

Use:

```text
request_id
```

When a message arrives:

```text
Does request_id already exist?
       │
       ├── YES → don't create duplicate
       │
       └── NO  → process request
```

Store the short-lived idempotency state in Redis.

This is especially useful when a client retries after a network failure.

---

# 46. WebSocket Disconnect

When the socket disconnects:

```text
catch disconnect
       ↓
remove connection
       ↓
log disconnect
       ↓
clean temporary state
```

Do not crash the entire FastAPI process.

---

# 47. Multiple Desktop Clients

Example:

```text
Same user

Client A ─── WebSocket ───┐
                          │
Client B ─── WebSocket ───┼── FastAPI
                          │
Client C ─── WebSocket ───┘
```

Each client has its own session.

Persistent conversation data is shared through PostgreSQL.

If you implement broadcasting:

```text
Client A sends message
      ↓
FastAPI
      ↓
Persist
      ↓
AI stream
      ↓
Broadcast relevant events to Client A/B/C
```

Document exactly what synchronization behavior your implementation supports.

---

# 48. Backend Error Handling

Create consistent errors.

Examples:

```text
INVALID_CREDENTIALS
AUTHENTICATION_REQUIRED
FORBIDDEN
CONVERSATION_NOT_FOUND
RATE_LIMITED
AI_PROVIDER_ERROR
INVALID_MESSAGE
SERVICE_UNAVAILABLE
```

For HTTP, use appropriate status codes.

For WebSocket, use structured events.

---

# 49. Health Endpoints

Create:

```text
GET /health
```

Simple:

```json
{
  "status": "ok"
}
```

You can also create:

```text
GET /health/ready
```

for dependency readiness.

For example:

```text
PostgreSQL reachable?
Redis reachable?
```

Do not expose sensitive infrastructure details.

---

# 50. Dockerfile

Create:

```text
backend/Dockerfile
```

Basic flow:

```text
Python base image
      ↓
Set working directory
      ↓
Copy requirements
      ↓
Install dependencies
      ↓
Copy application
      ↓
Start Uvicorn
```

Use a production-appropriate Python image.

Do not put secrets into the Dockerfile.

---

# 51. Docker Compose

Eventually your `docker-compose.yml` should contain:

```text
postgres
redis
backend
```

Conceptually:

```text
services:

  postgres:
    image: postgres

  redis:
    image: redis

  backend:
    build: ./backend
    depends_on:
      - postgres
      - redis
```

The exact configuration belongs in the repository.

---

# 52. Backend Startup

A developer should eventually be able to run:

```bash
docker compose up --build
```

and get:

```text
PostgreSQL
Redis
FastAPI
```

running.

If you run migrations automatically during startup, make that an intentional design decision and document it. Otherwise document the migration command separately.

---

# 53. Running Migrations

Development:

```bash
alembic upgrade head
```

After changing models:

```bash
alembic revision --autogenerate -m "describe change"
```

Then:

```bash
alembic upgrade head
```

Always inspect generated migration files.

---

# 54. Testing Setup

Install a test runner if you choose one.

For example:

```text
pytest
pytest-asyncio
httpx
```

If you add these:

```bash
pip install pytest pytest-asyncio
```

Then add them to `requirements.txt`.

Why?

```text
pytest
    → test framework

pytest-asyncio
    → async FastAPI/database/WebSocket tests

httpx
    → HTTP test client
```

---

# 55. First Backend Tests

Create:

```text
tests/
├── test_health.py
├── test_auth.py
├── test_conversations.py
└── test_websocket.py
```

Start with:

```text
health
registration
login
conversation authorization
```

Then add:

```text
WebSocket streaming
rate limiting
idempotency
```

---

# 56. Backend Testing Order

Do not start by testing everything.

Use:

```text
1. /health
2. Database connection
3. Registration
4. Login
5. Authentication dependency
6. Conversation creation
7. Conversation ownership
8. WebSocket connection
9. Message persistence
10. AI streaming
11. Rate limiting
12. Idempotency
13. Failure handling
```

---

# 57. Local Backend Development Workflow

Every time you work on the backend:

```bash
cd backend
```

Activate environment:

```bash
.venv\Scripts\activate
```

Start infrastructure:

```bash
docker compose up -d postgres redis
```

Run migrations:

```bash
alembic upgrade head
```

Start backend:

```bash
uvicorn app.main:app --reload
```

Then open:

```text
http://localhost:8000/docs
```

---

# 58. Recommended Git Milestones

Commit after each working milestone.

Example:

```text
chore: initialize fastapi backend
chore: add postgres and redis
feat: add database models
feat: add authentication
feat: add conversations
feat: add websocket connection
feat: add llm abstraction
feat: add streaming responses
feat: add rate limiting
feat: add idempotency
test: add backend tests
docs: document architecture decisions
```

This makes the development history easier to understand.

---

# 59. Exact Backend Build Sequence

Follow this order and do not jump ahead.

## Phase A — Setup

```bash
mkdir backend
cd backend
python -m venv .venv
.venv\Scripts\activate
```

Create:

```text
requirements.txt
app/
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## Phase B — FastAPI

Create:

```text
app/main.py
```

Implement:

```text
GET /health
```

Run:

```bash
uvicorn app.main:app --reload
```

Verify:

```text
/docs
/health
```

---

## Phase C — Infrastructure

Create:

```text
docker-compose.yml
```

Start:

```bash
docker compose up -d postgres redis
```

Verify:

```bash
docker compose ps
```

---

## Phase D — Database

Create:

```text
database.py
base.py
models/
```

Add:

```text
User
Session
Conversation
Message
```

Initialize Alembic:

```bash
alembic init alembic
```

Create migration:

```bash
alembic revision --autogenerate -m "create initial tables"
```

Apply:

```bash
alembic upgrade head
```

---

## Phase E — Authentication

Create:

```text
security.py
dependencies.py
auth.py
auth_service.py
auth schemas
```

Implement:

```text
register
login
refresh
logout
me
```

Test everything before moving on.

---

## Phase F — Conversations

Create:

```text
conversation schemas
conversation service
conversation API
```

Implement:

```text
create
list
get
delete
messages
```

Test ownership.

---

## Phase G — Redis

Create Redis infrastructure.

Implement:

```text
rate limiting
```

Then:

```text
idempotency
```

---

## Phase H — WebSocket

Create:

```text
websocket/manager.py
websocket/handlers.py
```

Implement:

```text
connect
authenticate
disconnect
message.send
```

First make WebSocket echo a message.

Do NOT integrate the LLM immediately.

---

## Phase I — LLM

Create:

```text
llm/base.py
llm/provider.py
services/ai_service.py
```

First make the abstraction work.

Then connect the actual provider.

---

## Phase J — Streaming

Implement:

```text
message.delta
message.completed
message.failed
```

Persist the final assistant response.

---

## Phase K — Reliability

Implement:

```text
request_id
idempotency
failed message status
safe exception handling
connection cleanup
```

Then test:

```text
backend restart
network interruption
LLM failure
duplicate retry
```

---

## Phase L — Docker

Add backend to Docker Compose.

Test from a clean environment:

```bash
docker compose down -v
docker compose up --build
```

Then run migrations according to your chosen startup strategy.

---

# 60. Final Backend Architecture

When finished, your backend should look like:

```text
                   ┌───────────────┐
                   │    FastAPI    │
                   └───────┬───────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
          REST API     WebSocket      Health
             │             │
             ▼             ▼
          Services    WS Manager
             │             │
       ┌─────┼─────┐       │
       │     │     │       │
       ▼     ▼     ▼       │
      DB   Redis   AI       │
       │     │     │       │
       │     │     ▼       │
       │     │  LLM        │
       │     │ Provider    │
       │     │             │
       └─────┴─────────────┘
```

---

# 61. Definition of Backend Done

The backend is ready when this works:

```text
POST /auth/register
        ↓
User created in PostgreSQL

POST /auth/login
        ↓
Authenticated session

POST /conversations
        ↓
Conversation stored

WebSocket connect
        ↓
Authenticated connection

message.send
        ↓
User message stored
        ↓
AI request
        ↓
message.delta
        ↓
message.delta
        ↓
message.completed
        ↓
Assistant response stored

Redis
        ↓
Rate limit
        ↓
Idempotency

Backend restart
        ↓
Data still exists

Temporary failure
        ↓
No process crash
        ↓
Client can reconnect
```

---

# 62. Do Not Build These First

Do NOT start with:

```text
Fancy UI
Animations
Themes
Advanced Electron native APIs
Complex microservices
Kafka
Kubernetes
Multiple databases
Complicated caching
```

The assessment does not require them.

Build the required foundation first.

---

# 63. The Development Rule

For every feature, follow:

```text
1. Define the data
2. Define the API/event
3. Implement service logic
4. Implement persistence
5. Add error handling
6. Test it
7. Connect frontend
8. Test failure cases
9. Document important decisions
```

For example, for chat:

```text
Message model
    ↓
message.send event
    ↓
AI service
    ↓
LLM provider
    ↓
message.delta
    ↓
message.completed
    ↓
PostgreSQL
    ↓
tests
```

This approach will keep the backend understandable and production-oriented.
