from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Sequence
from typing import TypedDict


class LLMMessage(TypedDict):
    role: str
    content: str


class LLMProvider(ABC):
    """Interface implemented by each provider adapter, never by API routes."""

    @abstractmethod
    async def stream_response(self, messages: Sequence[LLMMessage]) -> AsyncIterator[str]:
        """Yield response text fragments for an ordered chat history."""
        yield ""  # pragma: no cover
