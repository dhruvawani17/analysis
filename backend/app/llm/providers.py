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


class NvidiaProvider:
    def __init__(self, api_key: str, model: str = "z-ai/glm-5.2"):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=api_key,
            timeout=120.0,
        )
        self.model = model

    async def chat(self, messages: list[dict], **kwargs) -> str:
        call_kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "top_p": 1,
            "max_tokens": 4096,
            "timeout": 120.0,
        }
        call_kwargs.update(kwargs)
        response = await self.client.chat.completions.create(**call_kwargs)
        return response.choices[0].message.content or ""
