from collections.abc import AsyncIterator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.base import LLMMessage, LLMProvider
from app.models.message import Message


class AIService:
    """Build provider input from persisted history and expose only a text stream."""

    def __init__(self, provider: LLMProvider) -> None:
        self.provider = provider

    async def stream_conversation_response(
        self, db: AsyncSession, conversation_id: int
    ) -> AsyncIterator[str]:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id, Message.status == "completed")
            .order_by(Message.created_at, Message.id)
        )
        history: list[LLMMessage] = [
            {"role": message.role, "content": message.content} for message in result.scalars()
        ]
        async for chunk in self.provider.stream_response(history):
            yield chunk
