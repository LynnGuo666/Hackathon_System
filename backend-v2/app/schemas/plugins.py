from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import Field

from app.schemas.base import APIModel


class PluginStatus(StrEnum):
    disabled = "disabled"
    ready = "ready"
    error = "error"
    syncing = "syncing"


class PluginConfig(APIModel):
    id: str
    enabled: bool = False
    config: dict[str, Any] = Field(default_factory=dict)
    status: PluginStatus = PluginStatus.disabled
    last_error: str = Field(default="", alias="lastError")
    last_sync_at: datetime | None = Field(default=None, alias="lastSyncAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class PluginSummary(APIModel):
    id: str
    name: str
    description: str = ""
    enabled: bool = False
    status: PluginStatus = PluginStatus.disabled
    has_secrets: bool = Field(default=False, alias="hasSecrets")
    supports_oauth: bool = Field(default=False, alias="supportsOauth")
    supports_reporting: bool = Field(default=False, alias="supportsReporting")
    supports_import: bool = Field(default=False, alias="supportsImport")
    last_sync_at: datetime | None = Field(default=None, alias="lastSyncAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class PluginDetail(PluginSummary):
    config: dict[str, Any] = Field(default_factory=dict)
    config_schema: dict[str, Any] = Field(default_factory=dict, alias="configSchema")
    secret_keys: list[str] = Field(default_factory=list, alias="secretKeys")
    last_error: str = Field(default="", alias="lastError")


class PluginUpdateInput(APIModel):
    enabled: bool = False
    config: dict[str, Any] | None = None


class PluginSecretStatus(APIModel):
    key: str
    label: str = ""
    configured: bool = False
    is_set: bool = Field(default=False, alias="isSet")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class PluginSecretStatusList(APIModel):
    secrets: list[PluginSecretStatus] = Field(default_factory=list)


class PluginTestResult(APIModel):
    ok: bool
    status: str = "ok"
    message: str = ""
    checked_at: datetime | None = Field(default=None, alias="checkedAt")
    details: dict[str, Any] = Field(default_factory=dict)


class PluginSyncResult(APIModel):
    status: str
    task_id: str = Field(default="", alias="taskId")
    message: str = ""
    triggered_at: datetime | None = Field(default=None, alias="triggeredAt")


class PluginIntegration(APIModel):
    id: str
    name: str
    description: str = ""
    provider: str = ""
    enabled: bool = False
    status: str = "disabled"
    config: dict[str, Any] = Field(default_factory=dict)
    secrets: list[PluginSecretStatus] = Field(default_factory=list)
    last_sync_at: datetime | None = Field(default=None, alias="lastSyncAt")
    last_test_at: datetime | None = Field(default=None, alias="lastTestAt")
    last_error: str = Field(default="", alias="lastError")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class OAuthTransaction(APIModel):
    state: str
    plugin_id: str = Field(alias="pluginId")
    nonce: str
    code_verifier: str = Field(alias="codeVerifier")
    redirect_uri: str = Field(alias="redirectUri")
    expires_at: datetime = Field(alias="expiresAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")


class ParticipantSession(APIModel):
    id: str
    email: str
    plugin_id: str = Field(default="", alias="pluginId")
    participant_id: str = Field(default="", alias="participantId")
    session_token_hash: str = Field(default="", alias="sessionTokenHash")
    status: str = "active"
    expires_at: datetime = Field(alias="expiresAt")
    revoked_at: datetime | None = Field(default=None, alias="revokedAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class ParticipantSessionStatus(StrEnum):
    active = "active"
    revoked = "revoked"


class OAuthIdentity(APIModel):
    id: str = ""
    plugin_id: str = Field(default="", alias="pluginId")
    participant_id: str = Field(default="", alias="participantId")
    email: str = ""
    provider: str = ""
    provider_subject: str = Field(default="", alias="providerSubject")
    access_token_ciphertext: str = Field(default="", alias="accessTokenCiphertext")
    refresh_token_ciphertext: str = Field(default="", alias="refreshTokenCiphertext")
    token_expires_at: datetime | None = Field(default=None, alias="tokenExpiresAt")
    profile: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class PluginSyncStatus(StrEnum):
    pending = "pending"
    queued = "queued"
    processing = "processing"
    succeeded = "succeeded"
    failed = "failed"
    ignored = "ignored"


class PluginSyncEvent(APIModel):
    id: str
    plugin_id: str = Field(alias="pluginId")
    event_type: str = Field(alias="eventType")
    aggregate_type: str = Field(alias="aggregateType")
    aggregate_id: str = Field(alias="aggregateId")
    idempotency_key: str = Field(alias="idempotencyKey")
    payload: dict[str, Any] = Field(default_factory=dict)
    status: PluginSyncStatus = PluginSyncStatus.pending
    task_id: str = Field(default="", alias="taskId")
    last_error: str = Field(default="", alias="lastError")
    occurred_at: datetime = Field(alias="occurredAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class PluginImportBatchStatus(StrEnum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class PluginImportBatch(APIModel):
    id: str = ""
    plugin_id: str = Field(default="", alias="pluginId")
    source: str = ""
    status: PluginImportBatchStatus = PluginImportBatchStatus.pending
    total_count: int = Field(default=0, alias="totalCount")
    success_count: int = Field(default=0, alias="successCount")
    failed_count: int = Field(default=0, alias="failedCount")
    metadata: dict[str, Any] = Field(default_factory=dict)
    last_error: str = Field(default="", alias="lastError")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")
