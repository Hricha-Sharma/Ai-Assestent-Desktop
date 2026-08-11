from collections.abc import AsyncIterator, Sequence

from app.llm.base import LLMMessage, LLMProvider


class ProviderNotConfiguredError(RuntimeError):
    pass


class UnconfiguredLLMProvider(LLMProvider):
    """Explicit placeholder until a selected provider SDK adapter is added."""

    async def stream_response(self, messages: Sequence[LLMMessage]) -> AsyncIterator[str]:
        raise ProviderNotConfiguredError("No LLM provider adapter has been configured")
        yield ""  # make this an async generator for the interface


def get_llm_provider() -> LLMProvider:
    """Central provider factory; replace this adapter, not route/service code."""
    return UnconfiguredLLMProvider()
