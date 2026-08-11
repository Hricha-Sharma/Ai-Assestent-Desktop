"""Application-wide asynchronous Redis connection pool."""

from redis.asyncio import Redis
from redis.asyncio import from_url

from app.core.config import settings

redis_client: Redis = from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)


async def close_redis() -> None:
    await redis_client.aclose()
