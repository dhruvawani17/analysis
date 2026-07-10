from pydantic_settings import BaseSettings
from typing import Literal
import os


class Settings(BaseSettings):
    llm_provider: Literal["openai", "anthropic", "gemini", "nvidia"] = "gemini"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    nvidia_api_key: str = ""
    groq_api_key: str = ""
    llm_model: str = "gpt-4o"

    database_url: str = "postgresql+asyncpg://neondb_owner:npg_xxxxxxxxxxxx@ep-xxxxx.us-east-2.aws.neon.tech/neondb?ssl=require"

    # S3-compatible storage (Backblaze B2, Cloudflare R2, AWS S3, etc.)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "datanex-storage"
    aws_s3_region: str = "us-east-005"
    aws_s3_endpoint: str = "https://s3.us-east-005.backblazeb2.com"

    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000,https://*.vercel.app,https://analysis-frontend-crpf.onrender.com,https://analysis-backend-v0ii.onrender.com"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
