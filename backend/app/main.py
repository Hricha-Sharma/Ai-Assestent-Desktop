from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import close_database, get_db
from app.api.auth import router as auth_router
from app.api.conversations import router as conversations_router
from app.core.redis import close_redis, redis_client
from app.websocket.handlers import websocket_endpoint


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await close_redis()
    await close_database()

app = FastAPI(
    title="Desktop AI Assistant",
    version="1.0.0",
    lifespan=lifespan,
)
app.include_router(auth_router)
app.include_router(conversations_router)
app.add_api_websocket_route("/ws", websocket_endpoint)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def readiness(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    try:
        await db.execute(text("SELECT 1"))
        await redis_client.ping()
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")
    return {"status": "ready"}
