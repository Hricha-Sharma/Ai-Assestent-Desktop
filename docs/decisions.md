# Backend decisions

## AI fair-use policy

Each user may start 20 AI message requests per minute and may have no more than
two active AI generations at once. Redis provides the short-lived counters and
the concurrency lease; PostgreSQL remains the durable conversation store.

## Multi-client synchronization

Every active WebSocket for the same authenticated user receives `message.created`,
`message.delta`, `message.completed`, and `message.failed` events. This keeps live
desktop clients synchronized for persisted conversations. A reconnecting client
loads canonical conversations and messages from the REST API.

## Idempotency

`request_id` is claimed in Redis for 24 hours and is also protected by the unique
PostgreSQL `messages.request_id` constraint. Retries do not create a second user
message or AI generation.

## Docker and migrations

`docker compose up --build` starts PostgreSQL, Redis, and the FastAPI backend.
The backend image does not run migrations automatically: schema changes remain an
explicit, reviewable deployment operation. Run `docker compose run --rm backend
alembic upgrade head` (or, for local development, `cd backend` then `alembic
upgrade head`) before starting a version that needs a newer schema. Generate
changes with `alembic revision --autogenerate -m "describe change"`, inspect the
result, then upgrade.
