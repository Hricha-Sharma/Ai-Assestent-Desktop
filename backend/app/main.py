from fastapi import Depends,FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db

app = FastAPI(
    title="Desktop AI Assistant",
    version="1.0.0"
)


@app.get("/health")
async def database_health(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(text("SELECT 1"))

    return {
        "database": result.scalar()
    }