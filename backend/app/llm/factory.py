from app.config import settings
from app.llm.base import LLMProvider
from app.llm.providers import LiteLLMProvider, NvidiaProvider


_MODEL_MAP = {
    "openai": "gpt-4o",
    "anthropic": "claude-sonnet-4-20250514",
    "gemini": "gemini/gemini-2.5-flash",
    "nvidia": "meta/llama-3.1-8b-instruct",
}


def get_llm_provider() -> LLMProvider:
    if settings.llm_provider == "nvidia" and settings.nvidia_api_key:
        model = settings.llm_model or "meta/llama-3.1-8b-instruct"
        return NvidiaProvider(api_key=settings.nvidia_api_key, model=model)
    model = settings.llm_model or _MODEL_MAP.get(settings.llm_provider, "gpt-4o")
    return LiteLLMProvider(model=model)
