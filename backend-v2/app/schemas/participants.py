from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas.base import APIModel


class ParticipantStatus(StrEnum):
    pending = "pending"
    enrolled = "enrolled"
    accepted = "accepted"
    checked_in = "checked_in"
    active = "active"
    rejected = "rejected"
    disabled = "disabled"


class Participant(APIModel):
    id: str
    checkin_id: str = Field(default="", alias="checkinId")
    email: str
    email_verified_at: datetime | None = Field(default=None, alias="emailVerifiedAt")
    checked_in_at: datetime | None = Field(default=None, alias="checkedInAt")
    status: ParticipantStatus
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class ParticipantProfile(APIModel):
    email: str = ""
    full_name: str = Field(default="", alias="fullName")
    team_name: str = Field(default="", alias="teamName")
    school: str = ""
    phone: str = ""
    dietary_needs: str = Field(default="", alias="dietaryNeeds")
    tshirt_size: str = Field(default="", alias="tshirtSize")
    emergency_contact: str = Field(default="", alias="emergencyContact")
    notes: str = ""
    submitted_at: datetime | None = Field(default=None, alias="submittedAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class ParticipantAccount(APIModel):
    email: str
    checkin_id: str = Field(default="", alias="checkinId")
    status: ParticipantStatus
    full_name: str = Field(default="", alias="fullName")
    team_name: str = Field(default="", alias="teamName")
    school: str = ""
    phone: str = ""
    profile_updated_at: datetime | None = Field(default=None, alias="profileUpdatedAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class ParticipantStatusInput(APIModel):
    email: str = ""
    status: ParticipantStatus


class CheckinIDStatus(StrEnum):
    available = "available"
    bound = "bound"


class CheckinIDRecord(APIModel):
    id: str
    status: CheckinIDStatus
    assigned_email: str = Field(default="", alias="assignedEmail")
    bound_at: datetime | None = Field(default=None, alias="boundAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")


class GenerateCheckinIDsInput(APIModel):
    count: int


class ImportCheckinIDsInput(APIModel):
    ids: list[str] = Field(default_factory=list)
    values: list[str] = Field(default_factory=list)


class VerificationCode(APIModel):
    email: str
    code_hash: str
    expires_at: datetime = Field(alias="expiresAt")
    used_at: datetime | None = Field(default=None, alias="usedAt")
    attempt_count: int = Field(default=0, alias="attemptCount")
    last_sent_at: datetime = Field(alias="lastSentAt")


class SendCodeInput(APIModel):
    email: str


class VerifyCodeInput(APIModel):
    email: str
    code: str


class BindCheckinInput(APIModel):
    checkin_id: str = Field(alias="checkinId")


class CheckinLoginInput(APIModel):
    checkin_id: str = Field(alias="checkinId")
    email: str
    full_name: str = Field(alias="fullName")
