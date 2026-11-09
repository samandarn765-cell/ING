from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ai_provider: str = "gemini"  # "gemini" | "openai"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    database_url: str = "sqlite:///./eduprep.db"
    telegram_bot_token: str = ""
    timezone: str = "Asia/Tashkent"
    frontend_origin: str = "http://localhost:5173"

    # Har nechta uy ishidan keyin mock test ochiladi
    homeworks_per_mock: int = 3


@lru_cache
def get_settings() -> Settings:
    return Settings()
