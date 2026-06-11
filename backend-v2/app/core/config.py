from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_path: str = Field(default="./hackathon.sqlite", alias="DATABASE_PATH")
    admin_token: str = Field(default="secret", alias="ADMIN_TOKEN")
    static_dir: str = Field(default="", alias="STATIC_DIR")
    cors_origin: str = Field(default="http://localhost:3000", alias="CORS_ORIGIN")

    model_config = SettingsConfigDict(populate_by_name=True, extra="ignore")

    @property
    def static_path(self) -> Path | None:
        if not self.static_dir:
            return None
        path = Path(self.static_dir)
        return path if path.exists() else None

    @property
    def cors_origins(self) -> list[str]:
        # 本地开发可能同时开多个前端端口，允许用逗号扩展 CORS 白名单。
        return [origin.strip() for origin in self.cors_origin.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
