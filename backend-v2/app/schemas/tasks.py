from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas.base import APIModel


class TaskStatus(StrEnum):
    # pending: 等待 worker 领取；sending: 已被领取执行中；succeeded: 执行成功；
    # failed: 执行失败但还会重试；dead: 达到最大重试次数，不再自动重试。
    pending = "pending"
    sending = "sending"
    succeeded = "succeeded"
    failed = "failed"
    dead = "dead"


class AsyncTask(APIModel):
    id: str
    task_type: str = Field(alias="taskType")
    payload: dict
    status: TaskStatus
    attempts: int = 0
    max_attempts: int = Field(default=3, alias="maxAttempts")
    last_error: str = Field(default="", alias="lastError")
    result: str = ""
    available_at: datetime | None = Field(default=None, alias="availableAt")
    locked_at: datetime | None = Field(default=None, alias="lockedAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class SecretKeyList(APIModel):
    # 凭据值永不返回，前端只关心哪些 key 已经设置过。
    keys: list[str] = Field(default_factory=list)


class SecretValueInput(APIModel):
    value: str
