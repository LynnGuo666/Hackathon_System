from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_path: str = Field(default="./hackathon.sqlite", alias="DATABASE_PATH")
    admin_token: str = Field(default="secret", alias="ADMIN_TOKEN")
    static_dir: str = Field(default="", alias="STATIC_DIR")
    cors_origin: str = Field(default="http://localhost:3000", alias="CORS_ORIGIN")
    allow_participant_header_auth: bool = Field(
        default=False, alias="ALLOW_PARTICIPANT_HEADER_AUTH"
    )
    # AES 加密凭据用的主密钥文件路径；首次启动自动生成 32 字节随机密钥。
    secret_key_file: str = Field(default=".secret_key", alias="SECRET_KEY_FILE")
    # 后台任务 worker 是否随进程启动；测试时关闭避免后台线程干扰断言。
    enable_task_worker: bool = Field(default=True, alias="ENABLE_TASK_WORKER")
    # worker 轮询间隔（秒）与单次领取批量。
    task_worker_poll_interval: float = Field(default=5.0, alias="TASK_WORKER_POLL_INTERVAL")
    task_worker_batch_size: int = Field(default=10, alias="TASK_WORKER_BATCH_SIZE")

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
