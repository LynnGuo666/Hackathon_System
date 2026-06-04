from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas.base import APIModel


class EmailStatus(StrEnum):
    pending = "pending"
    sending = "sending"
    sent = "sent"
    failed = "failed"


class EmailOutbox(APIModel):
    id: str
    to: str
    subject: str
    body: str
    status: EmailStatus
    retry_count: int = Field(default=0, alias="retryCount")
    last_error: str = Field(default="", alias="lastError")
    sent_at: datetime | None = Field(default=None, alias="sentAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class AuditLog(APIModel):
    id: str
    actor_id: str = Field(alias="actorId")
    action: str
    target_type: str = Field(alias="targetType")
    target_id: str = Field(alias="targetId")
    reason: str = ""
    created_at: datetime | None = Field(default=None, alias="createdAt")
