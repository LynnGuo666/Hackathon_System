from datetime import datetime
import json
import sqlite3
from typing import Any

from app.core.errors import Conflict, NoResource, NotFound, PermissionDenied
from app.repositories.common import bool_int, decode_time, encode_time, new_id, now_utc
from app.schemas import (
    ClaimMode,
    ParticipantTag,
    ResourceAssignment,
    ResourceAssignmentStatus,
    ResourceItem,
    ResourceItemStatus,
    ResourceItemUpdateInput,
    ResourcePool,
    ResourcePoolUpdateInput,
    ResourceRequest,
    ResourceRequestStatus,
)

# SELECT 列表与构造函数多处复用，集中声明避免漏字段。
_POOL_COLUMNS = (
    "id, name, type, distribution_rule, visible_phase, enabled, allow_multiple_claims, "
    "claim_mode, require_review, allowed_tags, doc_url, doc_markdown, created_at"
)


def _decode_allowed_tags(value: str | None) -> list[ParticipantTag]:
    """allowed_tags 存 JSON 数组字符串；空数组=最宽松（任何选手可领）。"""
    if not value:
        return []
    try:
        payload = json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return []
    if not isinstance(payload, list):
        return []
    tags: list[ParticipantTag] = []
    for item in payload:
        try:
            tags.append(ParticipantTag(item))
        except ValueError:
            continue
    return tags


def _encode_allowed_tags(tags: list[ParticipantTag]) -> str:
    return json.dumps([tag.value for tag in tags], ensure_ascii=False)


def _check_allowed_tags(allowed_tags_json: str | None, participant_tags: list[ParticipantTag]) -> bool:
    """空数组=最宽松（任何选手可领）；否则选手 tag 命中白名单才放行。"""
    allowed = _decode_allowed_tags(allowed_tags_json)
    if not allowed:
        return True
    participant_set = {tag.value for tag in participant_tags}
    return any(tag.value in participant_set for tag in allowed)


def _row_to_pool(row: sqlite3.Row) -> ResourcePool:
    return ResourcePool(
        id=row["id"],
        name=row["name"],
        type=row["type"],
        distributionRule=row["distribution_rule"],
        visiblePhase=row["visible_phase"],
        enabled=bool(row["enabled"]),
        allowMultipleClaims=bool(row["allow_multiple_claims"]),
        claimMode=row["claim_mode"],
        requireReview=bool(row["require_review"]),
        allowedTags=_decode_allowed_tags(row["allowed_tags"]),
        docUrl=row["doc_url"],
        docMarkdown=row["doc_markdown"],
        createdAt=decode_time(row["created_at"]),
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
    id, name, type, distribution_rule, visible_phase, enabled, allow_multiple_claims,
    claim_mode, require_review, allowed_tags, doc_url, doc_markdown, created_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""",
            (
                saved.id,
                saved.name,
                saved.type,
                saved.distribution_rule,
                saved.visible_phase,
                bool_int(saved.enabled),
                bool_int(saved.allow_multiple_claims),
                saved.claim_mode,
                bool_int(saved.require_review),
                _encode_allowed_tags(saved.allowed_tags),
                saved.doc_url,
                saved.doc_markdown,
                encode_time(saved.created_at),
            ),
        )
        return saved

    def get_resource_pool(self, pool_id: str) -> ResourcePool:
        row = self.db.execute(
            f"SELECT {_POOL_COLUMNS} FROM resource_pools WHERE id = ?",
            (pool_id,),
        ).fetchone()
        if not row:
            raise NotFound("not found")
        return _row_to_pool(row)

    def list_resource_pools(self) -> list[ResourcePool]:
        rows = self.db.execute(
            f"SELECT {_POOL_COLUMNS} FROM resource_pools ORDER BY created_at ASC"
        ).fetchall()
        return [_row_to_pool(row) for row in rows]

    def update_resource_pool(
        self, pool_id: str, input: ResourcePoolUpdateInput
    ) -> ResourcePool:
        column_map = {
            "name": "name",
            "type": "type",
            "distribution_rule": "distribution_rule",
            "visible_phase": "visible_phase",
            "enabled": "enabled",
            "allow_multiple_claims": "allow_multiple_claims",
            "claim_mode": "claim_mode",
            "require_review": "require_review",
            "allowed_tags": "allowed_tags",
            "doc_url": "doc_url",
            "doc_markdown": "doc_markdown",
        }
        assignments: list[str] = []
        params: list[Any] = []
        data = input.model_dump(exclude_unset=True, by_alias=False)
        for key, value in data.items():
            column = column_map.get(key)
            if not column:
                continue
            if column in {"enabled", "allow_multiple_claims", "require_review"}:
                value = bool_int(bool(value))
            elif column == "allowed_tags":
                value = _encode_allowed_tags(value)
            assignments.append(f"{column} = ?")
            params.append(value)
        if not assignments:
            return self.get_resource_pool(pool_id)
        params.append(pool_id)
        self.db.execute(
            f"UPDATE resource_pools SET {', '.join(assignments)} WHERE id = ?",
            params,
        )
        return self.get_resource_pool(pool_id)

    def add_resource_item(
        self, pool_id: str, plain_code: str, label: str, expires_at: datetime | None = None
    ) -> ResourceItem:
        item_id = new_id("item")
        try:
            self.db.execute(
                """
INSERT INTO resource_items (id, pool_id, code_ciphertext, public_label, status, expires_at, doc_url, doc_markdown)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""",
                (
                    item_id,
                    pool_id,
                    encrypt_for_mvp(plain_code),
                    label,
                    ResourceItemStatus.available,
                    encode_time(expires_at),
                    "",
                    "",
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
       COALESCE(assigned_at, '') assigned_at, COALESCE(expires_at, '') expires_at,
       doc_url, doc_markdown
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
                docUrl=row["doc_url"],
                docMarkdown=row["doc_markdown"],
            )
            for row in rows
        ]

    def update_resource_item(
        self, item_id: str, input: ResourceItemUpdateInput
    ) -> ResourceItem:
        assignments: list[str] = []
        params: list[Any] = []
        data = input.model_dump(exclude_unset=True, by_alias=False)
        for key, value in data.items():
            if key not in {"doc_url", "doc_markdown"}:
                continue
            assignments.append(f"{key} = ?")
            params.append(value)
        if assignments:
            params.append(item_id)
            self.db.execute(
                f"UPDATE resource_items SET {', '.join(assignments)} WHERE id = ?",
                params,
            )
        row = self.db.execute(
            """
SELECT id, pool_id, public_label, status, COALESCE(assigned_checkin_id, '') assigned_checkin_id,
       COALESCE(assigned_at, '') assigned_at, COALESCE(expires_at, '') expires_at,
       doc_url, doc_markdown
FROM resource_items WHERE id = ?
""",
            (item_id,),
        ).fetchone()
        if not row:
            raise NotFound("not found")
        return ResourceItem(
            id=row["id"],
            poolId=row["pool_id"],
            publicLabel=row["public_label"],
            status=row["status"],
            assignedCheckinId=row["assigned_checkin_id"],
            assignedAt=decode_time(row["assigned_at"]),
            expiresAt=decode_time(row["expires_at"]),
            docUrl=row["doc_url"],
            docMarkdown=row["doc_markdown"],
        )

    def list_visible_pools(self) -> list[ResourcePool]:
        rows = self.db.execute(
            f"SELECT {_POOL_COLUMNS} FROM resource_pools WHERE enabled = 1 ORDER BY created_at ASC"
        ).fetchall()
        return [_row_to_pool(row) for row in rows]

    def _allocate_item(
        self, tx: sqlite3.Connection, pool_id: str, checkin_id: str, now: datetime
    ) -> tuple[ResourceAssignment, str]:
        """事务内选取一个可用 item 并建 assignment；claim 与 approve 共用。"""
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

    def claim_resource(
        self, pool_id: str, checkin_id: str, now: datetime
    ) -> tuple[ResourceAssignment, str]:
        """自助直领路径；claim_mode/审核/白名单均在事务内校验。"""
        with self.tx() as tx:
            participant = tx.execute(
                "SELECT email FROM participants WHERE checkin_id = ?", (checkin_id,)
            ).fetchone()
            if not participant:
                raise NotFound("not found")
            pool = tx.execute(
                """
SELECT claim_mode, require_review, allow_multiple_claims, allowed_tags
FROM resource_pools WHERE id = ?
""",
                (pool_id,),
            ).fetchone()
            if not pool:
                raise NotFound("not found")
            claim_mode = ClaimMode(pool["claim_mode"])
            # admin_only 池选手不可自助领取；self_apply_review / require_review 应走 apply 路径。
            if claim_mode == ClaimMode.admin_only:
                raise PermissionDenied("admin only resource pool")
            if claim_mode == ClaimMode.self_apply_review or bool(pool["require_review"]):
                raise Conflict("this pool requires review; apply instead")
            participant_tags = self._tags_by_checkin(tx, checkin_id)
            if not _check_allowed_tags(pool["allowed_tags"], participant_tags):
                raise PermissionDenied("not allowed to claim this resource")
            existing = tx.execute(
                "SELECT id FROM resource_assignments WHERE pool_id = ? AND checkin_id = ?",
                (pool_id, checkin_id),
            ).fetchone()
            if existing and not bool(pool["allow_multiple_claims"]):
                raise self._constraint_error(sqlite3.IntegrityError("resource_assignments"))
            return self._allocate_item(tx, pool_id, checkin_id, now)

    def assign_resource(
        self, pool_id: str, checkin_id: str, now: datetime
    ) -> tuple[ResourceAssignment, str]:
        """管理员手动发放：不受 claim_mode/白名单限制，直接分配 item。"""
        with self.tx() as tx:
            exists = tx.execute(
                "SELECT 1 FROM participants WHERE checkin_id = ?", (checkin_id,)
            ).fetchone()
            if not exists:
                raise NotFound("not found")
            return self._allocate_item(tx, pool_id, checkin_id, now)

    def list_assignments(self, checkin_id: str = "", pool_id: str = "") -> list[ResourceAssignment]:
        query = """
SELECT a.id, a.checkin_id, a.pool_id, a.resource_item_id, a.status, a.delivered_by_email,
       COALESCE(a.delivered_at, '') delivered_at, a.created_at, i.code_ciphertext,
       COALESCE(p.name, '') pool_name, COALESCE(p.type, '') pool_type,
       COALESCE(i.doc_url, '') item_doc_url, COALESCE(i.doc_markdown, '') item_doc_markdown
FROM resource_assignments a
JOIN resource_items i ON i.id = a.resource_item_id
JOIN resource_pools p ON p.id = a.pool_id
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
                poolName=row["pool_name"],
                poolType=row["pool_type"],
                itemDocUrl=row["item_doc_url"],
                itemDocMarkdown=row["item_doc_markdown"],
            )
            for row in rows
        ]

    # ------------------------------------------------------------------
    # 选手 tag：解耦于报名/签到，由审核通过/签到自动打；白名单准入依赖它。
    # ------------------------------------------------------------------

    def _tags_by_email(self, conn: sqlite3.Connection, email: str) -> list[ParticipantTag]:
        rows = conn.execute(
            "SELECT tag FROM participant_tags WHERE email = ?", (email,)
        ).fetchall()
        return _decode_tag_rows(rows)

    def _tags_by_checkin(
        self, conn: sqlite3.Connection, checkin_id: str
    ) -> list[ParticipantTag]:
        # approved tag 可能在签到绑定前打入（checkin_id 列为 NULL），故按 email 解析以覆盖全部 tag。
        row = conn.execute(
            "SELECT email FROM participants WHERE checkin_id = ?", (checkin_id,)
        ).fetchone()
        if not row:
            return []
        return self._tags_by_email(conn, row["email"])

    def add_participant_tag(self, email: str, tag: ParticipantTag, now: datetime) -> None:
        """幂等打 tag；checkin_id 由当前绑定关系查到则带入（可能为空）。"""
        email = email.strip().lower()
        if not email:
            return
        checkin_row = self.db.execute(
            "SELECT COALESCE(checkin_id, '') checkin_id FROM participants WHERE email = ?",
            (email,),
        ).fetchone()
        checkin_id = checkin_row["checkin_id"] if checkin_row else ""
        self.db.execute(
            """
INSERT INTO participant_tags (id, checkin_id, email, tag, created_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(email, tag) DO NOTHING
""",
            (new_id("tag"), checkin_id or None, email, tag.value, encode_time(now)),
        )

    def list_participant_tags(self, email: str) -> list[ParticipantTag]:
        return self._tags_by_email(self.db, email.strip().lower())

    def list_participant_tags_by_checkin(self, checkin_id: str) -> list[ParticipantTag]:
        return self._tags_by_checkin(self.db, checkin_id)

    # ------------------------------------------------------------------
    # 资源申请审核：pending 不分配 item，批准才分配并回填 assignment_id。
    # ------------------------------------------------------------------

    def _request_from_row(self, row: sqlite3.Row) -> ResourceRequest:
        return ResourceRequest(
            id=row["id"],
            poolId=row["pool_id"],
            checkinId=row["checkin_id"],
            status=ResourceRequestStatus(row["status"]),
            resourceItemId=row["resource_item_id"] or "",
            assignmentId=row["assignment_id"] or "",
            reviewer=row["reviewer"],
            reviewNote=row["review_note"],
            createdAt=decode_time(row["created_at"]),
            reviewedAt=decode_time(row["reviewed_at"]),
            poolName=row["pool_name"] or "",
        )

    def create_resource_request(
        self, pool_id: str, checkin_id: str, now: datetime
    ) -> ResourceRequest:
        with self.tx() as tx:
            participant = tx.execute(
                "SELECT email FROM participants WHERE checkin_id = ?", (checkin_id,)
            ).fetchone()
            if not participant:
                raise NotFound("not found")
            pool = tx.execute(
                """
SELECT claim_mode, require_review, allow_multiple_claims, allowed_tags
FROM resource_pools WHERE id = ?
""",
                (pool_id,),
            ).fetchone()
            if not pool:
                raise NotFound("not found")
            claim_mode = ClaimMode(pool["claim_mode"])
            # 仅需审核的池可走申请：self_apply_review 或 self_claim+require_review。
            if claim_mode == ClaimMode.admin_only:
                raise PermissionDenied("admin only resource pool")
            if not (claim_mode == ClaimMode.self_apply_review or bool(pool["require_review"])):
                raise Conflict("this pool does not require review; claim directly")
            participant_tags = self._tags_by_checkin(tx, checkin_id)
            if not _check_allowed_tags(pool["allowed_tags"], participant_tags):
                raise PermissionDenied("not allowed to apply for this resource")
            if not bool(pool["allow_multiple_claims"]):
                existing_assignment = tx.execute(
                    "SELECT id FROM resource_assignments WHERE pool_id = ? AND checkin_id = ?",
                    (pool_id, checkin_id),
                ).fetchone()
                if existing_assignment:
                    raise self._constraint_error(
                        sqlite3.IntegrityError("resource_assignments")
                    )
                existing_request = tx.execute(
                    """
SELECT id FROM resource_requests
WHERE pool_id = ? AND checkin_id = ? AND status = ?
""",
                    (pool_id, checkin_id, ResourceRequestStatus.pending),
                ).fetchone()
                if existing_request:
                    raise self._constraint_error(
                        sqlite3.IntegrityError("resource_requests")
                    )
            request_id = new_id("req")
            tx.execute(
                """
INSERT INTO resource_requests (
    id, pool_id, checkin_id, status, resource_item_id, assignment_id,
    reviewer, review_note, created_at, reviewed_at
)
VALUES (?, ?, ?, ?, NULL, NULL, '', '', ?, NULL)
""",
                (
                    request_id,
                    pool_id,
                    checkin_id,
                    ResourceRequestStatus.pending,
                    encode_time(now),
                ),
            )
            row = tx.execute(
                """
SELECT r.id, r.pool_id, r.checkin_id, r.status, r.resource_item_id, r.assignment_id,
       r.reviewer, r.review_note, r.created_at, r.reviewed_at,
       COALESCE(p.name, '') pool_name
FROM resource_requests r
JOIN resource_pools p ON p.id = r.pool_id
WHERE r.id = ?
""",
                (request_id,),
            ).fetchone()
            return self._request_from_row(row)

    def approve_resource_request(
        self, request_id: str, reviewer: str, now: datetime
    ) -> tuple[ResourceAssignment, ResourceRequest, str]:
        with self.tx() as tx:
            row = tx.execute(
                """
SELECT id, pool_id, checkin_id, status
FROM resource_requests WHERE id = ?
""",
                (request_id,),
            ).fetchone()
            if not row:
                raise NotFound("resource request not found")
            if row["status"] != ResourceRequestStatus.pending:
                raise Conflict("resource request already reviewed")
            assignment, plain_code = self._allocate_item(
                tx, row["pool_id"], row["checkin_id"], now
            )
            tx.execute(
                """
UPDATE resource_requests
SET status = ?, resource_item_id = ?, assignment_id = ?, reviewer = ?, reviewed_at = ?
WHERE id = ?
""",
                (
                    ResourceRequestStatus.approved,
                    assignment.resource_item_id,
                    assignment.id,
                    reviewer,
                    encode_time(now),
                    request_id,
                ),
            )
            request_row = tx.execute(
                """
SELECT r.id, r.pool_id, r.checkin_id, r.status, r.resource_item_id, r.assignment_id,
       r.reviewer, r.review_note, r.created_at, r.reviewed_at,
       COALESCE(p.name, '') pool_name
FROM resource_requests r
JOIN resource_pools p ON p.id = r.pool_id
WHERE r.id = ?
""",
                (request_id,),
            ).fetchone()
            return assignment, self._request_from_row(request_row), plain_code

    def reject_resource_request(
        self, request_id: str, reviewer: str, note: str, now: datetime
    ) -> ResourceRequest:
        with self.tx() as tx:
            row = tx.execute(
                "SELECT id, status FROM resource_requests WHERE id = ?", (request_id,)
            ).fetchone()
            if not row:
                raise NotFound("resource request not found")
            if row["status"] != ResourceRequestStatus.pending:
                raise Conflict("resource request already reviewed")
            tx.execute(
                """
UPDATE resource_requests
SET status = ?, reviewer = ?, review_note = ?, reviewed_at = ?
WHERE id = ?
""",
                (
                    ResourceRequestStatus.rejected,
                    reviewer,
                    note,
                    encode_time(now),
                    request_id,
                ),
            )
            request_row = tx.execute(
                """
SELECT r.id, r.pool_id, r.checkin_id, r.status, r.resource_item_id, r.assignment_id,
       r.reviewer, r.review_note, r.created_at, r.reviewed_at,
       COALESCE(p.name, '') pool_name
FROM resource_requests r
JOIN resource_pools p ON p.id = r.pool_id
WHERE r.id = ?
""",
                (request_id,),
            ).fetchone()
            return self._request_from_row(request_row)

    def list_resource_requests(
        self, pool_id: str = "", checkin_id: str = "", status: str = ""
    ) -> list[ResourceRequest]:
        query = """
SELECT r.id, r.pool_id, r.checkin_id, r.status, r.resource_item_id, r.assignment_id,
       r.reviewer, r.review_note, r.created_at, r.reviewed_at,
       COALESCE(p.name, '') pool_name
FROM resource_requests r
JOIN resource_pools p ON p.id = r.pool_id
"""
        filters: list[str] = []
        params: list[Any] = []
        if pool_id:
            filters.append("r.pool_id = ?")
            params.append(pool_id)
        if checkin_id:
            filters.append("r.checkin_id = ?")
            params.append(checkin_id)
        if status:
            filters.append("r.status = ?")
            params.append(status)
        if filters:
            query += " WHERE " + " AND ".join(filters)
        query += " ORDER BY r.created_at DESC"
        rows = self.db.execute(query, tuple(params)).fetchall()
        return [self._request_from_row(row) for row in rows]


def _decode_tag_rows(rows: list[sqlite3.Row]) -> list[ParticipantTag]:
    tags: list[ParticipantTag] = []
    for row in rows:
        try:
            tags.append(ParticipantTag(row["tag"]))
        except ValueError:
            continue
    return tags
