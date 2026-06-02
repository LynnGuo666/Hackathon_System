from datetime import datetime
import sqlite3
from typing import Any

from app.core.errors import NoResource, NotFound
from app.repositories.common import bool_int, decode_time, encode_time, new_id, now_utc
from app.schemas import (
    ResourceAssignment,
    ResourceAssignmentStatus,
    ResourceItem,
    ResourceItemStatus,
    ResourcePool,
)


def encrypt_for_mvp(value: str) -> str:
    return value.encode().hex()


def decrypt_for_mvp(value: str) -> str:
    try:
        return bytes.fromhex(value).decode()
    except ValueError:
        return ""


class ResourceRepositoryMixin:
    db: sqlite3.Connection

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
                raise self._constraint_error(sqlite3.IntegrityError("resource_assignments"))
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
