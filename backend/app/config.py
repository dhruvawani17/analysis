from pydantic_settings import BaseSettings
from typing import Literal
import os


class Settings(BaseSettings):
    llm_provider: Literal["openai", "anthropic", "gemini", "nvidia"] = "gemini"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    nvidia_api_key: str = ""
    llm_model: str = "gpt-4o"

    database_url: str = "sqlite+aiosqlite:///./data/analyst.db"
    upload_dir: str = "./data/uploads"

    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000,https://*.vercel.app"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

# For Vercel: create data dirs if they don't exist
os.makedirs(settings.upload_dir, exist_ok=True)
