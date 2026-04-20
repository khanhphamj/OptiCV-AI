from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: str = Field(..., alias="OPENAI_API_KEY")
    openai_model: str = Field(
        default="gpt-4.1-mini-2025-04-14", alias="OPENAI_MODEL"
    )
    openai_base_url: str = Field(
        default="https://api.openai.com/v1", alias="OPENAI_BASE_URL"
    )
    openai_timeout_seconds: float = Field(
        default=200.0, alias="OPENAI_TIMEOUT_SECONDS"
    )
    allowed_origins_raw: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        alias="ALLOWED_ORIGINS",
    )
    tavily_api_key: str = Field(default="", alias="TAVILY_API_KEY")
    tavily_base_url: str = Field(
        default="https://api.tavily.com", alias="TAVILY_BASE_URL"
    )
    tavily_timeout_seconds: float = Field(
        default=60.0, alias="TAVILY_TIMEOUT_SECONDS"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def allowed_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins_raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
