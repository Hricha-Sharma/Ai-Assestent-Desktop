"""Redis-backed fair-use controls for costly AI generation work."""

from redis.exceptions import RedisError

from app.core.redis import redis_client

MESSAGES_PER_MINUTE = 20
MAX_CONCURRENT_AI_REQUESTS = 2
CONCURRENCY_TTL_SECONDS = 300


class RateLimitExceeded(Exception):
    code = "RATE_LIMITED"


class ConcurrentRequestLimitExceeded(Exception):
    code = "TOO_MANY_CONCURRENT_REQUESTS"


def _minute_key(user_id: int) -> str:
    return f"user:{user_id}:messages:minute"


def _concurrency_key(user_id: int) -> str:
    return f"user:{user_id}:ai:active"


async def check_user_rate_limit(user_id: int) -> None:
    """Allow at most 20 message-generation requests per user per rolling minute."""
    key = _minute_key(user_id)
    try:
        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, 60)
    except RedisError as exc:
        # Failing open would permit unlimited expensive work during an outage.
        raise RateLimitExceeded("Rate limiter is temporarily unavailable") from exc
    if count > MESSAGES_PER_MINUTE:
        raise RateLimitExceeded("20 AI messages per minute limit exceeded")


async def acquire_ai_request_slot(user_id: int) -> None:
    """Reserve one of two Redis-backed active-generation slots for a user."""
    key = _concurrency_key(user_id)
    try:
        active = await redis_client.incr(key)
        if active == 1:
            await redis_client.expire(key, CONCURRENCY_TTL_SECONDS)
        if active > MAX_CONCURRENT_AI_REQUESTS:
            await redis_client.decr(key)
            raise ConcurrentRequestLimitExceeded("At most 2 AI requests may run concurrently")
    except RedisError as exc:
        raise ConcurrentRequestLimitExceeded("AI concurrency limiter is temporarily unavailable") from exc


async def release_ai_request_slot(user_id: int) -> None:
    """Release a slot; the TTL also prevents leaks after a process crash."""
    try:
        key = _concurrency_key(user_id)
        remaining = await redis_client.decr(key)
        if remaining <= 0:
            await redis_client.delete(key)
    except RedisError:
        # The TTL is the fallback cleanup mechanism; never mask a completed stream.
        pass
