from app.config import settings
from app.llm.base import LLMProvider
from app.llm.providers import LiteLLMProvider


_MODEL_MAP = {
    "openai": "gpt-4o",
    "anthropic": "claude-sonnet-4-20250514",
    "gemini": "gemini/gemini-2.5-flash",
}


def get_llm_provider() -> LLMProvider:
    model = settings.llm_model or _MODEL_MAP.get(settings.llm_provider, "gpt-4o")
    return LiteLLMProvider(model=model)
