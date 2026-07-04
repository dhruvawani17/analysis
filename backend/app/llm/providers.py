from litellm import acompletion
from app.llm.base import LLMProvider


class LiteLLMProvider:
    def __init__(self, model: str):
        self.model = model

    async def chat(self, messages: list[dict], **kwargs) -> str:
        response = await acompletion(
            model=self.model,
            messages=messages,
            **kwargs,
        )
        return response.choices[0].message.content or ""
