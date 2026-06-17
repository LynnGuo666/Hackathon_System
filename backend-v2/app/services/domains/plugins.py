from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.errors import LoginRequired, ServiceUnavailable
from app.core.security import normalize_email
from app.plugins import get_plugin, list_plugins
from app.repositories.common import now_utc
from app.schemas import (
    AsyncTask,
    Participant,
    PluginDetail,
    PluginIntegration,
    PluginSecretStatus,
    PluginSecretStatusList,
    PluginStatus,
    PluginSyncResult,
    PluginSummary,
    PluginTestResult,
    PluginUpdateInput,
)


class PluginServiceMixin:
    def list_plugin_summaries(self) -> list[PluginSummary]:
        return [self._summary_for(connector.manifest.id) for connector in list_plugins()]

    def list_plugin_integrations(self) -> list[PluginIntegration]:
        return [self._integration_for(connector.manifest.id) for connector in list_plugins()]

    def get_plugin_detail(self, plugin_id: str) -> PluginDetail:
        connector = get_plugin(plugin_id)
        stored = self.repository.get_plugin_config(plugin_id)
        secret_status = self.plugin_secret_status(plugin_id).secrets
        return PluginDetail(
            id=connector.manifest.id,
            name=connector.manifest.name,
            description=connector.manifest.description,
            enabled=stored.enabled,
            status=stored.status,
            hasSecrets=any(item.is_set for item in secret_status),
            supportsOauth=connector.manifest.supports_oauth,
            supportsReporting=connector.manifest.supports_reporting,
            supportsImport=connector.manifest.supports_import,
            lastSyncAt=stored.last_sync_at,
            updatedAt=stored.updated_at,
            config=stored.config,
            configSchema=connector.manifest.config_schema,
            secretKeys=list(connector.manifest.secret_keys),
            lastError=stored.last_error,
        )

    def update_plugin(self, plugin_id: str, input: PluginUpdateInput) -> PluginDetail:
        get_plugin(plugin_id)
        current = self.repository.get_plugin_config(plugin_id)
        config = current.config if input.config is None else input.config
        status = PluginStatus.ready if input.enabled else PluginStatus.disabled
        self.repository.upsert_plugin_config(plugin_id, input.enabled, config, status, "")
        return self.get_plugin_detail(plugin_id)

    def update_plugin_integration(self, plugin_id: str, input: PluginUpdateInput) -> PluginIntegration:
        self.update_plugin(plugin_id, input)
        return self._integration_for(plugin_id)

    def plugin_secret_status(self, plugin_id: str) -> PluginSecretStatusList:
        connector = get_plugin(plugin_id)
        keys = set(self.repository.list_secret_keys())
        prefix = f"plugin:{plugin_id}:"
        return PluginSecretStatusList(
            secrets=[
                PluginSecretStatus(
                    key=key,
                    label=key,
                    configured=f"{prefix}{key}" in keys,
                    isSet=f"{prefix}{key}" in keys,
                )
                for key in connector.manifest.secret_keys
            ]
        )

    def set_plugin_secret(self, plugin_id: str, key: str, value: str) -> None:
        connector = get_plugin(plugin_id)
        if key not in connector.manifest.secret_keys:
            raise ServiceUnavailable("unknown plugin secret")
        self.repository.set_secret(_secret_key(plugin_id, key), value)

    def delete_plugin_secret(self, plugin_id: str, key: str) -> None:
        connector = get_plugin(plugin_id)
        if key not in connector.manifest.secret_keys:
            raise ServiceUnavailable("unknown plugin secret")
        self.repository.delete_secret(_secret_key(plugin_id, key))

    def test_plugin_connection(self, plugin_id: str) -> PluginTestResult:
        connector = get_plugin(plugin_id)
        config, secrets_map = self._runtime_config(plugin_id)
        try:
            details = connector.test_connection(config, secrets_map)
        except Exception as exc:
            self.repository.upsert_plugin_config(
                plugin_id, True, config, PluginStatus.error, _redact_error(str(exc))
            )
            return PluginTestResult(ok=False, status="error", message=str(exc), checkedAt=now_utc(), details={})
        self.repository.upsert_plugin_config(plugin_id, True, config, PluginStatus.ready, "")
        return PluginTestResult(ok=True, status="ok", message="ok", checkedAt=now_utc(), details=_redact_dict(details))

    def trigger_plugin_sync(self, plugin_id: str) -> AsyncTask:
        connector = get_plugin(plugin_id)
        if not connector.manifest.supports_import:
            raise ServiceUnavailable("plugin does not support import")
        task = self.repository.enqueue_task(
            "plugin_import_pull",
            {"pluginId": plugin_id, "cursor": ""},
            max_attempts=3,
        )
        self.repository.mark_plugin_syncing(plugin_id)
        return task

    def trigger_plugin_sync_result(self, plugin_id: str) -> PluginSyncResult:
        task = self.trigger_plugin_sync(plugin_id)
        return PluginSyncResult(
            status="queued",
            taskId=task.id,
            message="同步任务已创建",
            triggeredAt=now_utc(),
        )

    def start_oauth(self, plugin_id: str, redirect_uri: str) -> str:
        connector = get_plugin(plugin_id)
        if not connector.manifest.supports_oauth:
            raise ServiceUnavailable("plugin does not support oauth")
        config, secrets_map = self._runtime_config(plugin_id)
        state = secrets.token_urlsafe(32)
        nonce = secrets.token_urlsafe(24)
        code_verifier = secrets.token_urlsafe(48)
        challenge = _code_challenge(code_verifier)
        now = now_utc()
        self.repository.create_oauth_transaction(
            state=state,
            plugin_id=plugin_id,
            nonce=nonce,
            code_verifier=code_verifier,
            redirect_uri=redirect_uri,
            expires_at=now + timedelta(minutes=10),
            created_at=now,
        )
        return connector.build_oauth_authorization_url(
            config,
            secrets_map,
            state=state,
            nonce=nonce,
            code_challenge=challenge,
            redirect_uri=redirect_uri,
        )

    def complete_oauth(self, plugin_id: str, state: str, code: str) -> Participant:
        tx = self.repository.consume_oauth_transaction(state)
        if tx.plugin_id != plugin_id or tx.expires_at < datetime.now(UTC):
            raise LoginRequired("oauth transaction expired")
        connector = get_plugin(plugin_id)
        config, secrets_map = self._runtime_config(plugin_id)
        identity = connector.exchange_oauth_code(
            config,
            secrets_map,
            code=code,
            code_verifier=tx.code_verifier,
            redirect_uri=tx.redirect_uri,
            nonce=tx.nonce,
        )
        email = normalize_email(identity.get("email"))
        subject = str(identity.get("subject") or "").strip()
        if not email or not subject or identity.get("emailVerified") is not True:
            raise LoginRequired("oauth email is not verified")
        now = now_utc()
        participant = self.repository.upsert_pre_event_participant(email, now)
        self.repository.upsert_oauth_identity(plugin_id, subject, email, now)
        return participant

    def create_participant_session(self, email: str):
        return self.repository.create_participant_session(
            normalize_email(email), now_utc() + timedelta(hours=24), now_utc()
        )

    def revoke_participant_session(self, session_id: str) -> None:
        self.repository.revoke_participant_session(session_id, now_utc())

    def emit_plugin_event(
        self,
        event_type: str,
        aggregate_type: str,
        aggregate_id: str,
        payload: dict[str, Any],
        occurred_at: datetime,
    ) -> None:
        for connector in list_plugins():
            stored = self.repository.get_plugin_config(connector.manifest.id)
            if not stored.enabled or not connector.manifest.supports_reporting:
                continue
            key = f"{connector.manifest.id}:{event_type}:{aggregate_id}:{occurred_at.isoformat()}"
            event = self.repository.create_plugin_sync_event(
                plugin_id=connector.manifest.id,
                event_type=event_type,
                aggregate_type=aggregate_type,
                aggregate_id=aggregate_id,
                idempotency_key=key,
                payload=payload,
                occurred_at=occurred_at,
            )
            if event.task_id:
                continue
            task = self.repository.enqueue_task(
                "plugin_report_event",
                {"pluginId": connector.manifest.id, "eventId": event.id},
                max_attempts=5,
            )
            self.repository.mark_plugin_sync_event_queued(event.id, task.id)

    def _summary_for(self, plugin_id: str) -> PluginSummary:
        connector = get_plugin(plugin_id)
        stored = self.repository.get_plugin_config(plugin_id)
        secret_status = self.plugin_secret_status(plugin_id).secrets
        return PluginSummary(
            id=connector.manifest.id,
            name=connector.manifest.name,
            description=connector.manifest.description,
            enabled=stored.enabled,
            status=stored.status,
            hasSecrets=any(item.is_set for item in secret_status),
            supportsOauth=connector.manifest.supports_oauth,
            supportsReporting=connector.manifest.supports_reporting,
            supportsImport=connector.manifest.supports_import,
            lastSyncAt=stored.last_sync_at,
            updatedAt=stored.updated_at,
        )

    def _integration_for(self, plugin_id: str) -> PluginIntegration:
        connector = get_plugin(plugin_id)
        stored = self.repository.get_plugin_config(plugin_id)
        return PluginIntegration(
            id=connector.manifest.id,
            name=connector.manifest.name,
            description=connector.manifest.description,
            provider=connector.manifest.id,
            enabled=stored.enabled,
            status=stored.status,
            config=stored.config,
            secrets=self.plugin_secret_status(plugin_id).secrets,
            lastSyncAt=stored.last_sync_at,
            lastError=stored.last_error,
            updatedAt=stored.updated_at,
        )

    def _runtime_config(self, plugin_id: str) -> tuple[dict[str, Any], dict[str, str]]:
        connector = get_plugin(plugin_id)
        stored = self.repository.get_plugin_config(plugin_id)
        if not stored.enabled:
            raise ServiceUnavailable("plugin is disabled")
        secrets_map = {
            key: self.repository.get_secret(_secret_key(plugin_id, key))
            for key in connector.manifest.secret_keys
        }
        return stored.config, secrets_map


def _secret_key(plugin_id: str, key: str) -> str:
    return f"plugin:{plugin_id}:{key}"


def _code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def _redact_error(message: str) -> str:
    return message.replace("Bearer ", "Bearer [redacted]")[:500]


def _redact_dict(value: dict[str, Any]) -> dict[str, Any]:
    redacted: dict[str, Any] = {}
    for key, item in value.items():
        if any(part in key.lower() for part in ("token", "secret", "authorization")):
            redacted[key] = "[redacted]"
        else:
            redacted[key] = item
    return redacted
