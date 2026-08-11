"""Short-lived Redis claim for WebSocket message request IDs."""

from redis.exceptions import RedisError

from app.core.redis import redis_client

IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60


class IdempotencyServiceUnavailable(Exception):
    code = "SERVICE_UNAVAILABLE"


def _key(request_id: str) -> str:
    return f"message-request:{request_id}"


async def claim_request(request_id: str) -> bool:
    """Atomically claim a request ID; False means another attempt owns it."""
    try:
        return bool(await redis_client.set(_key(request_id), "1", nx=True, ex=IDEMPOTENCY_TTL_SECONDS))
    except RedisError as exc:
        raise IdempotencyServiceUnavailable("Idempotency store is unavailable") from exc


async def release_request(request_id: str) -> None:
    """Release only requests that failed before their durable message commit."""
    try:
        await redis_client.delete(_key(request_id))
    except RedisError:
        pass
