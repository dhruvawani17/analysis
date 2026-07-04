from typing import Protocol, runtime_checkable


@runtime_checkable
class LLMProvider(Protocol):
    async def chat(self, messages: list[dict], **kwargs) -> str:
        ...
