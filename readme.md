# Desktop AI Assistant

FastAPI backend for a desktop AI assistant, with PostgreSQL for durable data, Redis for short-lived state, and WebSockets for real-time events.

## Prerequisites

Install Python 3.12+, Docker Desktop (running), and optionally Git. Verify them from the repository root:

```powershell
python --version
docker --version
docker compose version
```

## First-time setup

From the repository root, create your local environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Open `backend/.env` and replace `JWT_SECRET` with a random value at least 32 bytes long. `LLM_PROVIDER=your-provider` intentionally has no real AI adapter yet, so AI generation safely returns `AI_PROVIDER_ERROR` until a provider and credentials are configured.

Create and activate the Python environment:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
```

## Run locally

### 1. Start PostgreSQL and Redis

From the repository root:

```powershell
docker compose up -d postgres redis
docker compose ps
```

### 2. Apply migrations

From `backend/`, with the virtual environment active:

```powershell
alembic upgrade head
```

This creates/updates the `users`, `sessions`, `conversations`, and `messages` tables. Migrations are deliberately not automatic on startup, keeping schema changes explicit and reviewable.

### 3. Start FastAPI

From `backend/`:

```powershell
uvicorn app.main:app --reload
```

Open:

- API documentation: http://localhost:8000/docs
- Basic health: http://localhost:8000/health
- Dependency readiness: http://localhost:8000/health/ready

Stop the server with `Ctrl+C`.

## Run with Docker

Ensure `backend/.env` exists, then run this from the repository root:

```powershell
docker compose up --build
```

In a second terminal, apply migrations after PostgreSQL is healthy:

```powershell
docker compose run --rm backend alembic upgrade head
```

The backend is then available at http://localhost:8000. Stop the stack with:

```powershell
docker compose down
```

Avoid `docker compose down -v` unless you explicitly want to delete local PostgreSQL and Redis data.

## Run tests

Start PostgreSQL and Redis and apply migrations first. Then, from `backend/`:

```powershell
.\.venv\Scripts\activate
python -m pytest -q
```

Tests cover health/readiness, authentication, conversation ownership, and WebSocket message persistence/idempotency. Test users are removed automatically.

## Everyday workflow

```powershell
# Terminal 1: repository root
docker compose up -d postgres redis

# Terminal 2: backend
cd backend
.\.venv\Scripts\activate
alembic upgrade head
uvicorn app.main:app --reload
```

After changing SQLAlchemy models, generate, review, and apply a migration:

```powershell
cd backend
alembic revision --autogenerate -m "describe change"
# Inspect backend/alembic/versions/<new-file>.py manually.
alembic upgrade head
```

## API flow

1. `POST /auth/register` creates a user and returns access/refresh tokens.
2. `POST /auth/login` starts an additional session.
3. Send `Authorization: Bearer <access_token>` to protected HTTP routes.
4. `POST /conversations` creates a conversation.
5. Connect to `/ws?token=<access_token>` for real-time events.
6. Send `message.send` with a unique `request_id`.

PostgreSQL stores conversations and messages. Redis enforces 20 AI requests per minute and two concurrent AI requests per user.

## Troubleshooting

- **`/health/ready` returns 503:** Check `docker compose ps`; PostgreSQL or Redis is not reachable.
- **Database table errors:** Run `alembic upgrade head` from `backend/`.
- **Authentication warning/failure:** Set `JWT_SECRET` in `backend/.env` to a random secret at least 32 bytes long.
- **`AI_PROVIDER_ERROR`:** Expected until a real LLM provider adapter and valid credentials are configured.
