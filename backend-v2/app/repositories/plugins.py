from datetime import datetime
import json
import sqlite3
from typing import Any

from app.core.errors import NotFound
from app.core.security import normalize_email
from app.repositories.common import decode_time, encode_time, new_id, now_utc
from app.schemas import (
    OAuthIdentity,
    OAuthTransaction,
    ParticipantSession,
    ParticipantSessionStatus,
    PluginConfig,
    PluginImportBatch,
    PluginImportBatchStatus,
    PluginStatus,
    PluginSyncEvent,
    PluginSyncStatus,
)


class PluginRepositoryMixin:
    db: sqlite3.Connection

    def get_plugin_config(self, plugin_id: str) -> PluginConfig:
        row = self.db.execute(
            """
SELECT id, enabled, config, status, COALESCE(last_error, '') last_error,
       last_sync_at, updated_at
FROM plugin_configs
WHERE id = ?
""",
            (plugin_id.strip(),),
        ).fetchone()
        if not row:
            return PluginConfig(
                id=plugin_id.strip(),
                enabled=False,
                config={},
                status=PluginStatus.disabled,
            )
        return _row_to_plugin_config(row)

    def upsert_plugin_config(
        self,
        plugin_id: str,
        enabled: bool,
        config: dict[str, Any],
        status: PluginStatus,
        last_error: str,
        now: datetime | None = None,
    ) -> PluginConfig:
        now = now or now_utc()
        self.db.execute(
            """
INSERT INTO plugin_configs (id, enabled, config, status, last_error, last_sync_at, updated_at)
VALUES (?, ?, ?, ?, ?, NULL, ?)
ON CONFLICT(id) DO UPDATE SET
  enabled = excluded.enabled,
  config = excluded.config,
  status = excluded.status,
  last_error = excluded.last_error,
  updated_at = excluded.updated_at
""",
            (
                plugin_id.strip(),
                _bool_int(enabled),
                _encode_json(config),
                status,
                last_error,
                encode_time(now),
            ),
        )
        return self.get_plugin_config(plugin_id)

    def mark_plugin_syncing(self, plugin_id: str, now: datetime | None = None) -> PluginConfig:
        now = now or now_utc()
        self.db.execute(
            """
INSERT INTO plugin_configs (id, enabled, config, status, last_error, last_sync_at, updated_at)
VALUES (?, 0, '{}', ?, '', NULL, ?)
ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
""",
            (plugin_id.strip(), PluginStatus.syncing, encode_time(now)),
        )
        return self.get_plugin_config(plugin_id)

    def mark_plugin_sync_complete(
        self,
        plugin_id: str,
        status: PluginStatus = PluginStatus.ready,
        last_error: str = "",
        now: datetime | None = None,
    ) -> PluginConfig:
        now = now or now_utc()
        self.db.execute(
            """
UPDATE plugin_configs
SET status = ?, last_error = ?, last_sync_at = ?, updated_at = ?
WHERE id = ?
""",
            (status, last_error, encode_time(now), encode_time(now), plugin_id.strip()),
        )
        return self.get_plugin_config(plugin_id)

    def create_oauth_transaction(
        self,
        *,
        state: str,
        plugin_id: str,
        nonce: str,
        code_verifier: str,
        redirect_uri: str,
        expires_at: datetime,
        created_at: datetime | None = None,
    ) -> OAuthTransaction:
        created_at = created_at or now_utc()
        tx = OAuthTransaction(
            state=state,
            pluginId=plugin_id,
            nonce=nonce,
            codeVerifier=code_verifier,
            redirectUri=redirect_uri,
            expiresAt=expires_at,
            createdAt=created_at,
        )
        self.db.execute(
            """
INSERT INTO oauth_transactions
  (state, plugin_id, nonce, code_verifier, redirect_uri, expires_at, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
""",
            (
                tx.state,
                tx.plugin_id,
                tx.nonce,
                tx.code_verifier,
                tx.redirect_uri,
                encode_time(tx.expires_at),
                encode_time(tx.created_at),
            ),
        )
        return tx

    def consume_oauth_transaction(self, state: str) -> OAuthTransaction:
        with self.tx() as conn:
            row = conn.execute(
                """
SELECT state, plugin_id, nonce, code_verifier, redirect_uri, expires_at, created_at
FROM oauth_transactions
WHERE state = ?
""",
                (state,),
            ).fetchone()
            if not row:
                raise NotFound("oauth transaction not found")
            conn.execute("DELETE FROM oauth_transactions WHERE state = ?", (state,))
        return _row_to_oauth_transaction(row)

    def upsert_oauth_identity(
        self,
        plugin_id: str | OAuthIdentity,
        subject: str | None = None,
        email: str | None = None,
        now: datetime | None = None,
        *,
        participant_id: str = "",
        provider: str = "oauth",
        access_token_ciphertext: str = "",
        refresh_token_ciphertext: str = "",
        token_expires_at: datetime | None = None,
        profile: dict[str, Any] | None = None,
    ) -> OAuthIdentity:
        now = now or now_utc()
        if isinstance(plugin_id, OAuthIdentity):
            identity = plugin_id
            plugin_id = identity.plugin_id
            subject = identity.provider_subject
            email = identity.email
            participant_id = identity.participant_id
            provider = identity.provider or provider
            access_token_ciphertext = identity.access_token_ciphertext
            refresh_token_ciphertext = identity.refresh_token_ciphertext
            token_expires_at = identity.token_expires_at
            profile = identity.profile

        plugin_id = str(plugin_id).strip()
        subject = str(subject or "").strip()
        email = normalize_email(email or "")
        row = self.db.execute(
            """
SELECT id, created_at FROM oauth_identities
WHERE plugin_id = ? AND provider = ? AND provider_subject = ?
""",
            (plugin_id, provider, subject),
        ).fetchone()
        identity_id = row["id"] if row else new_id("oid")
        created_at = decode_time(row["created_at"]) if row else now
        self.db.execute(
            """
INSERT INTO oauth_identities (
  id, plugin_id, participant_id, email, provider, provider_subject,
  access_token_ciphertext, refresh_token_ciphertext, token_expires_at,
  profile, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(plugin_id, provider, provider_subject) DO UPDATE SET
  participant_id = excluded.participant_id,
  email = excluded.email,
  access_token_ciphertext = excluded.access_token_ciphertext,
  refresh_token_ciphertext = excluded.refresh_token_ciphertext,
  token_expires_at = excluded.token_expires_at,
  profile = excluded.profile,
  updated_at = excluded.updated_at
""",
            (
                identity_id,
                plugin_id,
                participant_id,
                email,
                provider,
                subject,
                access_token_ciphertext,
                refresh_token_ciphertext,
                encode_time(token_expires_at),
                _encode_json(profile or {}),
                encode_time(created_at),
                encode_time(now),
            ),
        )
        return self.get_oauth_identity(plugin_id, provider, subject)

    def get_oauth_identity(
        self,
        plugin_id: str,
        provider: str,
        provider_subject: str,
    ) -> OAuthIdentity:
        row = self.db.execute(
            """
SELECT id, plugin_id, participant_id, email, provider, provider_subject,
       access_token_ciphertext, refresh_token_ciphertext, token_expires_at,
       profile, created_at, updated_at
FROM oauth_identities
WHERE plugin_id = ? AND provider = ? AND provider_subject = ?
""",
            (plugin_id.strip(), provider.strip(), provider_subject.strip()),
        ).fetchone()
        if not row:
            raise NotFound("oauth identity not found")
        return _row_to_oauth_identity(row)

    def create_participant_session(
        self,
        email_or_participant_id: str,
        expires_at_or_plugin_id: datetime | str,
        now_or_token_hash: datetime | str | None = None,
        expires_at: datetime | None = None,
    ) -> ParticipantSession:
        now = now_utc()
        email = ""
        participant_id = ""
        plugin_id = ""
        token_hash = new_id("token")
        if isinstance(expires_at_or_plugin_id, datetime):
            email = normalize_email(email_or_participant_id)
            expires_at = expires_at_or_plugin_id
            if isinstance(now_or_token_hash, datetime):
                now = now_or_token_hash
        else:
            participant_id = email_or_participant_id
            plugin_id = expires_at_or_plugin_id.strip()
            token_hash = str(now_or_token_hash or token_hash)
            if expires_at is None:
                raise ValueError("expires_at is required")
        session = ParticipantSession(
            id=new_id("sess"),
            email=email,
            pluginId=plugin_id,
            participantId=participant_id,
            sessionTokenHash=token_hash,
            status=ParticipantSessionStatus.active,
            expiresAt=expires_at,
            createdAt=now,
            updatedAt=now,
        )
        self.db.execute(
            """
INSERT INTO participant_sessions
  (id, email, participant_id, plugin_id, session_token_hash, status, expires_at,
   revoked_at, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
""",
            (
                session.id,
                session.email,
                session.participant_id,
                session.plugin_id,
                session.session_token_hash,
                session.status,
                encode_time(session.expires_at),
                encode_time(session.created_at),
                encode_time(session.updated_at),
            ),
        )
        return session

    def get_participant_session(self, session_id: str) -> ParticipantSession | None:
        row = self.db.execute(
            """
SELECT id, email, participant_id, plugin_id, session_token_hash, status,
       expires_at, revoked_at, created_at, updated_at
FROM participant_sessions
WHERE id = ? AND status = ? AND expires_at > ?
""",
            (session_id, ParticipantSessionStatus.active, encode_time(now_utc())),
        ).fetchone()
        return _row_to_participant_session(row) if row else None

    def get_active_participant_session_by_token(
        self,
        session_token_hash: str,
        now: datetime | None = None,
    ) -> ParticipantSession | None:
        now = now or now_utc()
        row = self.db.execute(
            """
SELECT id, email, participant_id, plugin_id, session_token_hash, status,
       expires_at, revoked_at, created_at, updated_at
FROM participant_sessions
WHERE session_token_hash = ? AND status = ? AND expires_at > ?
""",
            (session_token_hash, ParticipantSessionStatus.active, encode_time(now)),
        ).fetchone()
        return _row_to_participant_session(row) if row else None

    def revoke_participant_session(self, session_id: str, now: datetime | None = None) -> None:
        now = now or now_utc()
        result = self.db.execute(
            """
UPDATE participant_sessions
SET status = ?, revoked_at = ?, updated_at = ?
WHERE id = ?
""",
            (
                ParticipantSessionStatus.revoked,
                encode_time(now),
                encode_time(now),
                session_id,
            ),
        )
        if result.rowcount == 0:
            raise NotFound("participant session not found")

    def create_plugin_sync_event(
        self,
        *,
        plugin_id: str,
        event_type: str,
        aggregate_type: str,
        aggregate_id: str,
        idempotency_key: str,
        payload: dict[str, Any],
        occurred_at: datetime,
    ) -> PluginSyncEvent:
        now = now_utc()
        try:
            self.db.execute(
                """
INSERT INTO plugin_sync_events (
  id, plugin_id, event_type, aggregate_type, aggregate_id, idempotency_key,
  payload, status, task_id, last_error, occurred_at, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, ?)
""",
                (
                    new_id("sync"),
                    plugin_id.strip(),
                    event_type,
                    aggregate_type,
                    aggregate_id,
                    idempotency_key,
                    _encode_json(payload),
                    PluginSyncStatus.pending,
                    encode_time(occurred_at),
                    encode_time(now),
                    encode_time(now),
                ),
            )
        except sqlite3.IntegrityError:
            pass
        return self.get_plugin_sync_event_by_key(idempotency_key)

    def get_plugin_sync_event_by_key(self, idempotency_key: str) -> PluginSyncEvent:
        row = self.db.execute(
            """
SELECT id, plugin_id, event_type, aggregate_type, aggregate_id, idempotency_key,
       payload, status, task_id, COALESCE(last_error, '') last_error,
       occurred_at, created_at, updated_at
FROM plugin_sync_events
WHERE idempotency_key = ?
""",
            (idempotency_key,),
        ).fetchone()
        if not row:
            raise NotFound("plugin sync event not found")
        return _row_to_plugin_sync_event(row)

    def mark_plugin_sync_event_queued(self, event_id: str, task_id: str) -> PluginSyncEvent:
        return self.update_plugin_sync_event_status(
            event_id,
            PluginSyncStatus.queued,
            task_id=task_id,
        )

    def get_plugin_sync_event(self, event_id: str) -> PluginSyncEvent:
        return self._get_plugin_sync_event_by_id(event_id)

    def mark_plugin_sync_event_succeeded(self, event_id: str) -> PluginSyncEvent:
        return self.update_plugin_sync_event_status(event_id, PluginSyncStatus.succeeded)

    def mark_plugin_ready(self, plugin_id: str) -> PluginConfig:
        return self.mark_plugin_sync_complete(plugin_id, PluginStatus.ready, "")

    def update_plugin_sync_event_status(
        self,
        event_id: str,
        status: PluginSyncStatus,
        *,
        task_id: str | None = None,
        last_error: str = "",
        now: datetime | None = None,
    ) -> PluginSyncEvent:
        now = now or now_utc()
        existing = self._get_plugin_sync_event_by_id(event_id)
        result = self.db.execute(
            """
UPDATE plugin_sync_events
SET status = ?, task_id = ?, last_error = ?, updated_at = ?
WHERE id = ?
""",
            (
                status,
                existing.task_id if task_id is None else task_id,
                last_error,
                encode_time(now),
                event_id,
            ),
        )
        if result.rowcount == 0:
            raise NotFound("plugin sync event not found")
        return self._get_plugin_sync_event_by_id(event_id)

    def create_plugin_import_batch(
        self,
        plugin_id: str,
        source: str,
        *,
        metadata: dict[str, Any] | None = None,
        now: datetime | None = None,
    ) -> PluginImportBatch:
        now = now or now_utc()
        batch = PluginImportBatch(
            id=new_id("batch"),
            pluginId=plugin_id.strip(),
            source=source,
            status=PluginImportBatchStatus.pending,
            metadata=metadata or {},
            createdAt=now,
            updatedAt=now,
        )
        self.db.execute(
            """
INSERT INTO plugin_import_batches
  (id, plugin_id, source, status, total_count, success_count, failed_count,
   metadata, last_error, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)
""",
            (
                batch.id,
                batch.plugin_id,
                batch.source,
                batch.status,
                batch.total_count,
                batch.success_count,
                batch.failed_count,
                _encode_json(batch.metadata),
                encode_time(batch.created_at),
                encode_time(batch.updated_at),
            ),
        )
        return batch

    def get_plugin_import_batch(self, batch_id: str) -> PluginImportBatch:
        row = self.db.execute(
            """
SELECT id, plugin_id, source, status, total_count, success_count, failed_count,
       metadata, COALESCE(last_error, '') last_error, created_at, updated_at
FROM plugin_import_batches
WHERE id = ?
""",
            (batch_id,),
        ).fetchone()
        if not row:
            raise NotFound("plugin import batch not found")
        return _row_to_plugin_import_batch(row)

    def update_plugin_import_batch(
        self,
        batch_id: str,
        *,
        status: PluginImportBatchStatus | None = None,
        total_count: int | None = None,
        success_count: int | None = None,
        failed_count: int | None = None,
        metadata: dict[str, Any] | None = None,
        last_error: str | None = None,
        now: datetime | None = None,
    ) -> PluginImportBatch:
        now = now or now_utc()
        existing = self.get_plugin_import_batch(batch_id)
        self.db.execute(
            """
UPDATE plugin_import_batches
SET status = ?, total_count = ?, success_count = ?, failed_count = ?,
    metadata = ?, last_error = ?, updated_at = ?
WHERE id = ?
""",
            (
                status or existing.status,
                existing.total_count if total_count is None else total_count,
                existing.success_count if success_count is None else success_count,
                existing.failed_count if failed_count is None else failed_count,
                _encode_json(existing.metadata if metadata is None else metadata),
                existing.last_error if last_error is None else last_error,
                encode_time(now),
                batch_id,
            ),
        )
        return self.get_plugin_import_batch(batch_id)

    def list_plugin_import_batches(
        self,
        *,
        plugin_id: str | None = None,
        limit: int = 100,
    ) -> list[PluginImportBatch]:
        query = """
SELECT id, plugin_id, source, status, total_count, success_count, failed_count,
       metadata, COALESCE(last_error, '') last_error, created_at, updated_at
FROM plugin_import_batches
"""
        params: list[Any] = []
        if plugin_id:
            query += " WHERE plugin_id = ?"
            params.append(plugin_id.strip())
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        rows = self.db.execute(query, params).fetchall()
        return [_row_to_plugin_import_batch(row) for row in rows]

    def _get_plugin_sync_event_by_id(self, event_id: str) -> PluginSyncEvent:
        row = self.db.execute(
            """
SELECT id, plugin_id, event_type, aggregate_type, aggregate_id, idempotency_key,
       payload, status, task_id, COALESCE(last_error, '') last_error,
       occurred_at, created_at, updated_at
FROM plugin_sync_events
WHERE id = ?
""",
            (event_id,),
        ).fetchone()
        if not row:
            raise NotFound("plugin sync event not found")
        return _row_to_plugin_sync_event(row)


def _bool_int(value: bool) -> int:
    return 1 if value else 0


def _encode_json(value: dict[str, Any] | dict) -> str:
    return json.dumps(value or {}, ensure_ascii=False)


def _decode_json(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    try:
        payload = json.loads(value)
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _row_to_plugin_config(row: sqlite3.Row) -> PluginConfig:
    return PluginConfig(
        id=row["id"],
        enabled=bool(row["enabled"]),
        config=_decode_json(row["config"]),
        status=row["status"],
        lastError=row["last_error"],
        lastSyncAt=decode_time(row["last_sync_at"]),
        updatedAt=decode_time(row["updated_at"]),
    )


def _row_to_oauth_transaction(row: sqlite3.Row) -> OAuthTransaction:
    return OAuthTransaction(
        state=row["state"],
        pluginId=row["plugin_id"],
        nonce=row["nonce"],
        codeVerifier=row["code_verifier"],
        redirectUri=row["redirect_uri"],
        expiresAt=decode_time(row["expires_at"]),
        createdAt=decode_time(row["created_at"]),
    )


def _row_to_oauth_identity(row: sqlite3.Row) -> OAuthIdentity:
    return OAuthIdentity(
        id=row["id"],
        pluginId=row["plugin_id"],
        participantId=row["participant_id"],
        email=row["email"],
        provider=row["provider"],
        providerSubject=row["provider_subject"],
        accessTokenCiphertext=row["access_token_ciphertext"],
        refreshTokenCiphertext=row["refresh_token_ciphertext"],
        tokenExpiresAt=decode_time(row["token_expires_at"]),
        profile=_decode_json(row["profile"]),
        createdAt=decode_time(row["created_at"]),
        updatedAt=decode_time(row["updated_at"]),
    )


def _row_to_participant_session(row: sqlite3.Row) -> ParticipantSession:
    return ParticipantSession(
        id=row["id"],
        email=row["email"],
        pluginId=row["plugin_id"],
        participantId=row["participant_id"],
        sessionTokenHash=row["session_token_hash"],
        status=row["status"],
        expiresAt=decode_time(row["expires_at"]),
        revokedAt=decode_time(row["revoked_at"]),
        createdAt=decode_time(row["created_at"]),
        updatedAt=decode_time(row["updated_at"]),
    )


def _row_to_plugin_sync_event(row: sqlite3.Row) -> PluginSyncEvent:
    return PluginSyncEvent(
        id=row["id"],
        pluginId=row["plugin_id"],
        eventType=row["event_type"],
        aggregateType=row["aggregate_type"],
        aggregateId=row["aggregate_id"],
        idempotencyKey=row["idempotency_key"],
        payload=_decode_json(row["payload"]),
        status=row["status"],
        taskId=row["task_id"],
        lastError=row["last_error"],
        occurredAt=decode_time(row["occurred_at"]),
        createdAt=decode_time(row["created_at"]),
        updatedAt=decode_time(row["updated_at"]),
    )


def _row_to_plugin_import_batch(row: sqlite3.Row) -> PluginImportBatch:
    return PluginImportBatch(
        id=row["id"],
        pluginId=row["plugin_id"],
        source=row["source"],
        status=row["status"],
        totalCount=row["total_count"],
        successCount=row["success_count"],
        failedCount=row["failed_count"],
        metadata=_decode_json(row["metadata"]),
        lastError=row["last_error"],
        createdAt=decode_time(row["created_at"]),
        updatedAt=decode_time(row["updated_at"]),
    )
