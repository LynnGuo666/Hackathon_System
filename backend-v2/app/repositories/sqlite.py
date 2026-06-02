import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator

from app.core.errors import Conflict, NoResource, NotFound
from app.core.security import normalize_email
from app.repositories.checkins import CheckinRepositoryMixin
from app.repositories.common import bool_int, decode_time, encode_time, new_id, now_utc
from app.repositories.meal_orders import MealOrderRepositoryMixin
from app.repositories.participants import ParticipantRepositoryMixin
from app.schemas import (
    AccommodationRequest,
    AuditLog,
    EmailOutbox,
    EmailStatus,
    EventLocation,
    FeatureLink,
    NavigationLink,
    Participant,
    ParticipantProfile,
    ParticipantStatus,
    ResourceAssignment,
    ResourceAssignmentStatus,
    ResourceItem,
    ResourceItemStatus,
    ResourcePool,
    VerificationCode,
)


def encrypt_for_mvp(value: str) -> str:
    return value.encode().hex()


def decrypt_for_mvp(value: str) -> str:
    try:
        return bytes.fromhex(value).decode()
    except ValueError:
        return ""


class SQLiteRepository(CheckinRepositoryMixin, MealOrderRepositoryMixin, ParticipantRepositoryMixin):
    def __init__(self, path: str):
        self.path = path
        db_path = Path(path)
        if db_path.parent != Path("."):
            db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.execute("PRAGMA busy_timeout = 5000")
        self.ensure_ready()

    def close(self) -> None:
        self.db.close()

    @contextmanager
    def tx(self) -> Iterator[sqlite3.Connection]:
        self.db.execute("BEGIN IMMEDIATE")
        try:
            yield self.db
        except Exception:
            self.db.rollback()
            raise
        else:
            self.db.commit()

    def ensure_ready(self) -> None:
        row = self.db.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'participants'"
        ).fetchone()
        if not row:
            raise RuntimeError("database is not migrated; run alembic upgrade head")

    def upsert_verification_code(self, code: VerificationCode) -> None:
        self.db.execute(
            """
INSERT INTO email_verification_codes (email, code_hash, expires_at, used_at, attempt_count, last_sent_at)
VALUES (?, ?, ?, NULL, ?, ?)
ON CONFLICT(email) DO UPDATE SET
  code_hash = excluded.code_hash,
  expires_at = excluded.expires_at,
  used_at = NULL,
  attempt_count = excluded.attempt_count,
  last_sent_at = excluded.last_sent_at
""",
            (
                normalize_email(code.email),
                code.code_hash,
                encode_time(code.expires_at),
                code.attempt_count,
                encode_time(code.last_sent_at),
            ),
        )

    def get_verification_code(self, email: str) -> VerificationCode | None:
        row = self.db.execute(
            """
SELECT email, code_hash, expires_at, COALESCE(used_at, '') used_at, attempt_count, last_sent_at
FROM email_verification_codes WHERE email = ?
""",
            (normalize_email(email),),
        ).fetchone()
        if not row:
            return None
        return VerificationCode(
            email=row["email"],
            code_hash=row["code_hash"],
            expiresAt=decode_time(row["expires_at"]),
            usedAt=decode_time(row["used_at"]),
            attemptCount=row["attempt_count"],
            lastSentAt=decode_time(row["last_sent_at"]),
        )

    def mark_verification_used(self, email: str, used_at: datetime) -> None:
        self.db.execute(
            "UPDATE email_verification_codes SET used_at = ? WHERE email = ?",
            (encode_time(used_at), normalize_email(email)),
        )

    def increment_verification_attempt(self, email: str) -> None:
        self.db.execute(
            "UPDATE email_verification_codes SET attempt_count = attempt_count + 1 WHERE email = ?",
            (normalize_email(email),),
        )

    def bind_participant(self, email: str, checkin_id: str, now: datetime) -> Participant:
        email = normalize_email(email)
        checkin_id = checkin_id.strip()
        with self.tx() as tx:
            row = tx.execute(
                """
SELECT id, COALESCE(checkin_id, '') checkin_id, email, email_verified_at,
       checked_in_at, status, created_at, updated_at
FROM participants WHERE checkin_id = ? OR email = ? LIMIT 1
""",
                (checkin_id, email),
            ).fetchone()
            if row:
                existing = self._participant_from_row(row)
                if existing.checkin_id == checkin_id and existing.email == email:
                    return existing
                if existing.checkin_id == checkin_id:
                    raise Conflict("checkin id is already bound")
                if existing.email == email and existing.checkin_id:
                    raise Conflict("email is already bound")
                tx.execute(
                    """
UPDATE participants
SET checkin_id = ?, checked_in_at = ?, status = ?, updated_at = ?
WHERE email = ?
""",
                    (
                        checkin_id,
                        encode_time(now),
                        ParticipantStatus.active,
                        encode_time(now),
                        email,
                    ),
                )
                existing.checkin_id = checkin_id
                existing.checked_in_at = now
                existing.status = ParticipantStatus.active
                existing.updated_at = now
                return existing

            participant = Participant(
                id=new_id("par"),
                checkinId=checkin_id,
                email=email,
                emailVerifiedAt=now,
                checkedInAt=now,
                status=ParticipantStatus.active,
                createdAt=now,
                updatedAt=now,
            )
            try:
                tx.execute(
                    """
INSERT INTO participants (id, checkin_id, email, email_verified_at, checked_in_at, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""",
                    (
                        participant.id,
                        participant.checkin_id,
                        participant.email,
                        encode_time(participant.email_verified_at),
                        encode_time(participant.checked_in_at),
                        participant.status,
                        encode_time(participant.created_at),
                        encode_time(participant.updated_at),
                    ),
                )
            except sqlite3.IntegrityError as exc:
                raise self._constraint_error(exc) from exc
            return participant

    def upsert_pre_event_participant(self, email: str, now: datetime) -> Participant:
        email = normalize_email(email)
        try:
            return self.get_participant_by_email(email)
        except NotFound:
            pass
        participant = Participant(
            id=new_id("par"),
            email=email,
            emailVerifiedAt=now,
            status=ParticipantStatus.pending,
            createdAt=now,
            updatedAt=now,
        )
        try:
            self.db.execute(
                """
INSERT INTO participants (id, checkin_id, email, email_verified_at, checked_in_at, status, created_at, updated_at)
VALUES (?, NULL, ?, ?, '', ?, ?, ?)
""",
                (
                    participant.id,
                    participant.email,
                    encode_time(participant.email_verified_at),
                    participant.status,
                    encode_time(participant.created_at),
                    encode_time(participant.updated_at),
                ),
            )
        except sqlite3.IntegrityError as exc:
            raise self._constraint_error(exc) from exc
        return participant

    def get_participant_by_email(self, email: str) -> Participant:
        row = self.db.execute(
            """
SELECT id, COALESCE(checkin_id, '') checkin_id, email, email_verified_at,
       checked_in_at, status, created_at, updated_at
FROM participants WHERE email = ?
""",
            (normalize_email(email),),
        ).fetchone()
        if not row:
            raise NotFound("not found")
        return self._participant_from_row(row)

    def get_participant_by_checkin_id(self, checkin_id: str) -> Participant:
        row = self.db.execute(
            """
SELECT id, COALESCE(checkin_id, '') checkin_id, email, email_verified_at,
       checked_in_at, status, created_at, updated_at
FROM participants WHERE checkin_id = ?
""",
            (checkin_id.strip(),),
        ).fetchone()
        if not row:
            raise NotFound("not found")
        return self._participant_from_row(row)

    def upsert_participant_profile(
        self, email: str, profile: ParticipantProfile, now: datetime
    ) -> ParticipantProfile:
        email = normalize_email(email)
        row = self.db.execute(
            "SELECT submitted_at FROM participant_profiles WHERE email = ?", (email,)
        ).fetchone()
        submitted_at = decode_time(row["submitted_at"]) if row else now
        saved = profile.model_copy(
            update={"email": email, "submitted_at": submitted_at, "updated_at": now}
        )
        self.db.execute(
            """
INSERT INTO participant_profiles (
  email, full_name, team_name, school, phone, dietary_needs, tshirt_size,
  emergency_contact, notes, submitted_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(email) DO UPDATE SET
  full_name = excluded.full_name,
  team_name = excluded.team_name,
  school = excluded.school,
  phone = excluded.phone,
  dietary_needs = excluded.dietary_needs,
  tshirt_size = excluded.tshirt_size,
  emergency_contact = excluded.emergency_contact,
  notes = excluded.notes,
  updated_at = excluded.updated_at
""",
            (
                saved.email,
                saved.full_name,
                saved.team_name,
                saved.school,
                saved.phone,
                saved.dietary_needs,
                saved.tshirt_size,
                saved.emergency_contact,
                saved.notes,
                encode_time(saved.submitted_at),
                encode_time(saved.updated_at),
            ),
        )
        return saved

    def get_participant_profile(self, email: str) -> ParticipantProfile:
        row = self.db.execute(
            """
SELECT email, full_name, team_name, school, phone, dietary_needs, tshirt_size,
       emergency_contact, notes, submitted_at, updated_at
FROM participant_profiles WHERE email = ?
""",
            (normalize_email(email),),
        ).fetchone()
        if not row:
            raise NotFound("not found")
        return self._profile_from_row(row)

    def list_participant_profiles(self) -> list[ParticipantProfile]:
        rows = self.db.execute(
            """
SELECT email, full_name, team_name, school, phone, dietary_needs, tshirt_size,
       emergency_contact, notes, submitted_at, updated_at
FROM participant_profiles ORDER BY updated_at DESC
"""
        ).fetchall()
        return [self._profile_from_row(row) for row in rows]

    def create_resource_pool(self, pool: ResourcePool) -> ResourcePool:
        created_at = now_utc()
        saved = pool.model_copy(
            update={"id": new_id("pool"), "enabled": True, "created_at": created_at}
        )
        self.db.execute(
            """
INSERT INTO resource_pools (
    id, name, type, distribution_rule, visible_phase, enabled, allow_multiple_claims, created_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""",
            (
                saved.id,
                saved.name,
                saved.type,
                saved.distribution_rule,
                saved.visible_phase,
                bool_int(saved.enabled),
                bool_int(saved.allow_multiple_claims),
                encode_time(saved.created_at),
            ),
        )
        return saved

    def get_resource_pool(self, pool_id: str) -> ResourcePool:
        row = self.db.execute(
            """
SELECT id, name, type, distribution_rule, visible_phase, enabled, allow_multiple_claims, created_at
FROM resource_pools WHERE id = ?
""",
            (pool_id,),
        ).fetchone()
        if not row:
            raise NotFound("not found")
        return ResourcePool(
            id=row["id"],
            name=row["name"],
            type=row["type"],
            distributionRule=row["distribution_rule"],
            visiblePhase=row["visible_phase"],
            enabled=bool(row["enabled"]),
            allowMultipleClaims=bool(row["allow_multiple_claims"]),
            createdAt=decode_time(row["created_at"]),
        )

    def list_resource_pools(self) -> list[ResourcePool]:
        rows = self.db.execute(
            """
SELECT id, name, type, distribution_rule, visible_phase, enabled, allow_multiple_claims, created_at
FROM resource_pools ORDER BY created_at ASC
"""
        ).fetchall()
        return [
            ResourcePool(
                id=row["id"],
                name=row["name"],
                type=row["type"],
                distributionRule=row["distribution_rule"],
                visiblePhase=row["visible_phase"],
                enabled=bool(row["enabled"]),
                allowMultipleClaims=bool(row["allow_multiple_claims"]),
                createdAt=decode_time(row["created_at"]),
            )
            for row in rows
        ]

    def add_resource_item(
        self, pool_id: str, plain_code: str, label: str, expires_at: datetime | None = None
    ) -> ResourceItem:
        item_id = new_id("item")
        try:
            self.db.execute(
                """
INSERT INTO resource_items (id, pool_id, code_ciphertext, public_label, status, expires_at)
VALUES (?, ?, ?, ?, ?, ?)
""",
                (
                    item_id,
                    pool_id,
                    encrypt_for_mvp(plain_code),
                    label,
                    ResourceItemStatus.available,
                    encode_time(expires_at),
                ),
            )
        except sqlite3.IntegrityError as exc:
            raise self._constraint_error(exc) from exc
        return ResourceItem(
            id=item_id,
            poolId=pool_id,
            publicLabel=label,
            status=ResourceItemStatus.available,
            expiresAt=expires_at,
        )

    def list_resource_items(self, pool_id: str = "") -> list[ResourceItem]:
        query = """
SELECT id, pool_id, public_label, status, COALESCE(assigned_checkin_id, '') assigned_checkin_id,
       COALESCE(assigned_at, '') assigned_at, COALESCE(expires_at, '') expires_at
FROM resource_items
"""
        params: tuple[Any, ...] = ()
        if pool_id:
            query += " WHERE pool_id = ?"
            params = (pool_id,)
        query += " ORDER BY id ASC"
        rows = self.db.execute(query, params).fetchall()
        return [
            ResourceItem(
                id=row["id"],
                poolId=row["pool_id"],
                publicLabel=row["public_label"],
                status=row["status"],
                assignedCheckinId=row["assigned_checkin_id"],
                assignedAt=decode_time(row["assigned_at"]),
                expiresAt=decode_time(row["expires_at"]),
            )
            for row in rows
        ]

    def claim_resource(
        self, pool_id: str, checkin_id: str, now: datetime
    ) -> tuple[ResourceAssignment, str]:
        with self.tx() as tx:
            exists = tx.execute(
                "SELECT COUNT(1) count FROM participants WHERE checkin_id = ?", (checkin_id,)
            ).fetchone()["count"]
            if not exists:
                raise NotFound("not found")
            pool = tx.execute(
                "SELECT allow_multiple_claims FROM resource_pools WHERE id = ?", (pool_id,)
            ).fetchone()
            if not pool:
                raise NotFound("not found")
            existing = tx.execute(
                "SELECT id FROM resource_assignments WHERE pool_id = ? AND checkin_id = ?",
                (pool_id, checkin_id),
            ).fetchone()
            if existing and not bool(pool["allow_multiple_claims"]):
                raise Conflict("resource already assigned to participant")
            item = tx.execute(
                """
SELECT id, code_ciphertext FROM resource_items
WHERE pool_id = ? AND status = ?
ORDER BY id ASC LIMIT 1
""",
                (pool_id, ResourceItemStatus.available),
            ).fetchone()
            if not item:
                raise NoResource("no available resource item")
            result = tx.execute(
                """
UPDATE resource_items
SET status = ?, assigned_checkin_id = ?, assigned_at = ?
WHERE id = ? AND status = ?
""",
                (
                    ResourceItemStatus.assigned,
                    checkin_id,
                    encode_time(now),
                    item["id"],
                    ResourceItemStatus.available,
                ),
            )
            if result.rowcount != 1:
                raise NoResource("no available resource item")
            assignment = ResourceAssignment(
                id=new_id("asg"),
                checkinId=checkin_id,
                poolId=pool_id,
                resourceItemId=item["id"],
                status=ResourceAssignmentStatus.assigned,
                createdAt=now,
                plainCode=decrypt_for_mvp(item["code_ciphertext"]),
            )
            try:
                tx.execute(
                    """
INSERT INTO resource_assignments (id, checkin_id, pool_id, resource_item_id, status, delivered_by_email, created_at)
VALUES (?, ?, ?, ?, ?, 0, ?)
""",
                    (
                        assignment.id,
                        assignment.checkin_id,
                        assignment.pool_id,
                        assignment.resource_item_id,
                        assignment.status,
                        encode_time(assignment.created_at),
                    ),
                )
            except sqlite3.IntegrityError as exc:
                raise self._constraint_error(exc) from exc
            return assignment, assignment.plain_code

    def list_assignments(self, checkin_id: str = "", pool_id: str = "") -> list[ResourceAssignment]:
        query = """
SELECT a.id, a.checkin_id, a.pool_id, a.resource_item_id, a.status, a.delivered_by_email,
       COALESCE(a.delivered_at, '') delivered_at, a.created_at, i.code_ciphertext
FROM resource_assignments a
JOIN resource_items i ON i.id = a.resource_item_id
"""
        filters: list[str] = []
        params: list[Any] = []
        if checkin_id:
            filters.append("a.checkin_id = ?")
            params.append(checkin_id)
        if pool_id:
            filters.append("a.pool_id = ?")
            params.append(pool_id)
        if filters:
            query += " WHERE " + " AND ".join(filters)
        query += " ORDER BY a.created_at ASC"
        rows = self.db.execute(query, tuple(params)).fetchall()
        return [
            ResourceAssignment(
                id=row["id"],
                checkinId=row["checkin_id"],
                poolId=row["pool_id"],
                resourceItemId=row["resource_item_id"],
                status=row["status"],
                deliveredByEmail=bool(row["delivered_by_email"]),
                deliveredAt=decode_time(row["delivered_at"]),
                createdAt=decode_time(row["created_at"]),
                plainCode=decrypt_for_mvp(row["code_ciphertext"]),
            )
            for row in rows
        ]

    def enqueue_email(self, to: str, subject: str, body: str, now: datetime) -> EmailOutbox:
        email = EmailOutbox(
            id=new_id("mail"),
            to=normalize_email(to),
            subject=subject,
            body=body,
            status=EmailStatus.pending,
            createdAt=now,
            updatedAt=now,
        )
        self.db.execute(
            """
INSERT INTO email_outbox (id, recipient, subject, body, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
""",
            (
                email.id,
                email.to,
                email.subject,
                email.body,
                email.status,
                encode_time(now),
                encode_time(now),
            ),
        )
        return email

    def list_emails(self) -> list[EmailOutbox]:
        rows = self.db.execute(
            """
SELECT id, recipient, subject, body, status, retry_count, COALESCE(last_error, '') last_error,
       COALESCE(sent_at, '') sent_at, created_at, updated_at
FROM email_outbox ORDER BY created_at ASC
"""
        ).fetchall()
        return [
            EmailOutbox(
                id=row["id"],
                to=row["recipient"],
                subject=row["subject"],
                body=row["body"],
                status=row["status"],
                retryCount=row["retry_count"],
                lastError=row["last_error"],
                sentAt=decode_time(row["sent_at"]),
                createdAt=decode_time(row["created_at"]),
                updatedAt=decode_time(row["updated_at"]),
            )
            for row in rows
        ]

    def retry_email(self, email_id: str, now: datetime) -> EmailOutbox:
        result = self.db.execute(
            """
UPDATE email_outbox
SET status = ?, retry_count = retry_count + 1, last_error = NULL, updated_at = ?
WHERE id = ? AND status != ?
""",
            (EmailStatus.pending, encode_time(now), email_id, EmailStatus.sent),
        )
        if result.rowcount == 0:
            raise NotFound("not found")
        for email in self.list_emails():
            if email.id == email_id:
                return email
        raise NotFound("not found")

    def record_audit(
        self, actor_id: str, action: str, target_type: str, target_id: str, reason: str, now: datetime
    ) -> AuditLog:
        log = AuditLog(
            id=new_id("aud"),
            actorId=actor_id,
            action=action,
            targetType=target_type,
            targetId=target_id,
            reason=reason,
            createdAt=now,
        )
        self.db.execute(
            """
INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, reason, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
""",
            (log.id, log.actor_id, log.action, log.target_type, log.target_id, log.reason, encode_time(now)),
        )
        return log

    def list_audits(self) -> list[AuditLog]:
        rows = self.db.execute(
            """
SELECT id, actor_id, action, target_type, target_id, COALESCE(reason, '') reason, created_at
FROM audit_logs ORDER BY created_at ASC
"""
        ).fetchall()
        return [
            AuditLog(
                id=row["id"],
                actorId=row["actor_id"],
                action=row["action"],
                targetType=row["target_type"],
                targetId=row["target_id"],
                reason=row["reason"],
                createdAt=decode_time(row["created_at"]),
            )
            for row in rows
        ]

    def create_navigation_link(self, link: NavigationLink, now: datetime) -> NavigationLink:
        return self._create_link("navigation_links", "nav", NavigationLink, link, now)

    def list_navigation_links(self, include_disabled: bool) -> list[NavigationLink]:
        return self._list_links("navigation_links", NavigationLink, include_disabled)

    def create_feature_link(self, link: FeatureLink, now: datetime) -> FeatureLink:
        return self._create_link("feature_links", "feat", FeatureLink, link, now)

    def list_feature_links(self, include_disabled: bool) -> list[FeatureLink]:
        return self._list_links("feature_links", FeatureLink, include_disabled)

    def set_feature_link_enabled(
        self, feature_id: str, enabled: bool, now: datetime
    ) -> FeatureLink:
        result = self.db.execute(
            """
UPDATE feature_links
SET enabled = ?, updated_at = ?
WHERE id = ?
""",
            (bool_int(enabled), encode_time(now), feature_id),
        )
        if result.rowcount == 0:
            raise NotFound("feature module not found")
        for link in self.list_feature_links(include_disabled=True):
            if link.id == feature_id:
                return link
        raise NotFound("feature module not found")

    def _create_link(
        self,
        table: str,
        id_prefix: str,
        model: type[NavigationLink] | type[FeatureLink],
        link: NavigationLink | FeatureLink,
        now: datetime,
    ) -> NavigationLink | FeatureLink:
        sort_order = link.sort_order
        if sort_order == 0:
            row = self.db.execute(
                f"SELECT COALESCE(MAX(sort_order), 0) max_order FROM {table}"
            ).fetchone()
            sort_order = row["max_order"] + 10
        saved = link.model_copy(
            update={
                "id": new_id(id_prefix),
                "enabled": True,
                "sort_order": sort_order,
                "created_at": now,
                "updated_at": now,
            }
        )
        self.db.execute(
            f"""
INSERT INTO {table} (id, title, description, url, enabled, sort_order, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""",
            (
                saved.id,
                saved.title,
                saved.description,
                saved.url,
                bool_int(saved.enabled),
                saved.sort_order,
                encode_time(saved.created_at),
                encode_time(saved.updated_at),
            ),
        )
        return saved

    def _list_links(
        self,
        table: str,
        model: type[NavigationLink] | type[FeatureLink],
        include_disabled: bool,
    ) -> list[NavigationLink] | list[FeatureLink]:
        query = f"SELECT id, title, description, url, enabled, sort_order, created_at, updated_at FROM {table}"
        params: tuple[Any, ...] = ()
        if not include_disabled:
            query += " WHERE enabled = ?"
            params = (1,)
        query += " ORDER BY sort_order ASC, created_at ASC"
        rows = self.db.execute(query, params).fetchall()
        return [
            model(
                id=row["id"],
                title=row["title"],
                description=row["description"],
                url=row["url"],
                enabled=bool(row["enabled"]),
                sortOrder=row["sort_order"],
                createdAt=decode_time(row["created_at"]),
                updatedAt=decode_time(row["updated_at"]),
            )
            for row in rows
        ]

    def get_site_config(self) -> dict[str, Any]:
        row = self.db.execute(
            """
SELECT id, countdown_title, countdown_end, countdown_enabled, updated_at
FROM site_config LIMIT 1
"""
        ).fetchone()
        if not row:
            return {"id": "default"}
        return {
            "id": row["id"],
            "countdownTitle": row["countdown_title"],
            "countdownEnd": row["countdown_end"],
            "countdownEnabled": bool(row["countdown_enabled"]),
            "updatedAt": row["updated_at"],
        }

    def update_site_config(self, config: dict[str, Any], now: datetime) -> dict[str, Any]:
        updated_at = encode_time(now)
        self.db.execute(
            """
INSERT INTO site_config (id, countdown_title, countdown_end, countdown_enabled, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  countdown_title = excluded.countdown_title,
  countdown_end = excluded.countdown_end,
  countdown_enabled = excluded.countdown_enabled,
  updated_at = excluded.updated_at
""",
            (
                "default",
                config.get("countdown_title", ""),
                config.get("countdown_end", ""),
                bool_int(config.get("countdown_enabled", False)),
                updated_at,
            ),
        )
        return self.get_site_config()

    def get_event_location(self) -> EventLocation:
        row = self.db.execute(
            """
SELECT id, name, address, latitude, longitude, osm_type, osm_id, osm_url, updated_at
FROM event_location WHERE id = 'default' LIMIT 1
"""
        ).fetchone()
        if not row:
            return EventLocation()
        return EventLocation(
            id=row["id"],
            name=row["name"],
            address=row["address"],
            latitude=row["latitude"],
            longitude=row["longitude"],
            osmType=row["osm_type"],
            osmId=row["osm_id"],
            osmUrl=row["osm_url"],
            updatedAt=row["updated_at"],
        )

    def update_event_location(self, location: EventLocation, now: datetime) -> EventLocation:
        updated_at = encode_time(now)
        self.db.execute(
            """
INSERT INTO event_location (id, name, address, latitude, longitude, osm_type, osm_id, osm_url, updated_at)
VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  osm_type = excluded.osm_type,
  osm_id = excluded.osm_id,
  osm_url = excluded.osm_url,
  updated_at = excluded.updated_at
""",
            (
                location.name,
                location.address,
                location.latitude,
                location.longitude,
                location.osm_type,
                location.osm_id,
                location.osm_url,
                updated_at,
            ),
        )
        return self.get_event_location()

    def upsert_accommodation(
        self, email: str, request: AccommodationRequest, now: datetime
    ) -> AccommodationRequest:
        email = normalize_email(email)
        row = self.db.execute(
            "SELECT created_at FROM accommodation_requests WHERE email = ?", (email,)
        ).fetchone()
        created_at = decode_time(row["created_at"]) if row else now
        saved = request.model_copy(
            update={"email": email, "created_at": created_at, "updated_at": now}
        )
        self.db.execute(
            """
INSERT INTO accommodation_requests (email, selections, other_detail, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(email) DO UPDATE SET
  selections = excluded.selections,
  other_detail = excluded.other_detail,
  updated_at = excluded.updated_at
""",
            (
                email,
                json.dumps([selection.value for selection in saved.selections]),
                saved.other_detail,
                encode_time(saved.created_at),
                encode_time(saved.updated_at),
            ),
        )
        return saved

    def get_accommodation(self, email: str) -> AccommodationRequest:
        row = self.db.execute(
            """
SELECT email, selections, other_detail, created_at, updated_at
FROM accommodation_requests WHERE email = ?
""",
            (normalize_email(email),),
        ).fetchone()
        if not row:
            raise NotFound("not found")
        return AccommodationRequest(
            email=row["email"],
            selections=json.loads(row["selections"]),
            otherDetail=row["other_detail"],
            createdAt=decode_time(row["created_at"]),
            updatedAt=decode_time(row["updated_at"]),
        )

    def _participant_from_row(self, row: sqlite3.Row) -> Participant:
        return Participant(
            id=row["id"],
            checkinId=row["checkin_id"],
            email=row["email"],
            emailVerifiedAt=decode_time(row["email_verified_at"]),
            checkedInAt=decode_time(row["checked_in_at"]),
            status=row["status"],
            createdAt=decode_time(row["created_at"]),
            updatedAt=decode_time(row["updated_at"]),
        )

    def _profile_from_row(self, row: sqlite3.Row) -> ParticipantProfile:
        return ParticipantProfile(
            email=row["email"],
            fullName=row["full_name"],
            teamName=row["team_name"],
            school=row["school"],
            phone=row["phone"],
            dietaryNeeds=row["dietary_needs"],
            tshirtSize=row["tshirt_size"],
            emergencyContact=row["emergency_contact"],
            notes=row["notes"],
            submittedAt=decode_time(row["submitted_at"]),
            updatedAt=decode_time(row["updated_at"]),
        )

    def _constraint_error(self, error: sqlite3.IntegrityError) -> Conflict:
        message = str(error).lower()
        if "participants.email" in message:
            return Conflict("email is already bound")
        if "participants.checkin_id" in message:
            return Conflict("checkin id is already bound")
        if "resource_assignments" in message:
            return Conflict("resource already assigned to participant")
        return Conflict(f"sqlite constraint: {error}")
