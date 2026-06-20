from app.core.errors import InvalidCheckinID, InvalidResourceCSV, LoginRequired, NotFound
from app.repositories.common import now_utc
from app.schemas import (
    AllowedTagOption,
    ClaimMode,
    ParticipantTag,
    ResourceAssignment,
    ResourceItem,
    ResourceItemUpdateInput,
    ResourcePool,
    ResourcePoolUpdateInput,
    ResourceRequest,
)
from app.services import mailer

# 白名单 tag 的中文标签，供 allowed_tag_options 返回。
_TAG_LABELS = {
    ParticipantTag.approved: "已通过审核",
    ParticipantTag.checked_in: "已签到",
}


class ResourceServiceMixin:
    def create_pool(self, actor_id: str, pool: ResourcePool) -> ResourcePool:
        saved = self.repository.create_resource_pool(pool)
        self.repository.record_audit(
            actor_id, "resource_pool.create", "resource_pool", saved.id, "", now_utc()
        )
        return saved

    def update_pool(
        self, actor_id: str, pool_id: str, input: ResourcePoolUpdateInput
    ) -> ResourcePool:
        saved = self.repository.update_resource_pool(pool_id, input)
        self.repository.record_audit(
            actor_id, "resource_pool.update", "resource_pool", saved.id, "", now_utc()
        )
        return saved

    def update_resource_item(
        self,
        actor_id: str,
        pool_id: str,
        item_id: str,
        input: ResourceItemUpdateInput,
    ) -> ResourceItem:
        items = self.repository.list_resource_items(pool_id)
        if not any(item.id == item_id for item in items):
            raise NotFound("resource item not found")
        saved = self.repository.update_resource_item(item_id, input)
        self.repository.record_audit(
            actor_id, "resource_item.update", "resource_item", saved.id, "", now_utc()
        )
        return saved

    def list_visible_pools(self) -> list[ResourcePool]:
        return self.repository.list_visible_pools()

    def import_resource_codes(
        self, actor_id: str, pool_id: str, codes: list[str]
    ) -> list[ResourceItem]:
        if not codes:
            raise InvalidResourceCSV("resource csv must contain at least one code")
        items: list[ResourceItem] = []
        for index, code in enumerate(codes, start=1):
            code = code.strip()
            if not code:
                continue
            items.append(self.repository.add_resource_item(pool_id, code, f"兑换码 {index:03d}"))
        self.repository.record_audit(
            actor_id,
            "resource_item.import",
            "resource_pool",
            pool_id,
            f"imported={len(items)}",
            now_utc(),
        )
        return items

    def _send_assignment_email(
        self, pool_name: str, participant, plain_code: str, now
    ) -> None:
        try:
            self.repository.enqueue_email(
                participant.email,
                mailer.resource_assigned_subject(pool_name),
                mailer.resource_assigned_body(pool_name, plain_code),
                now,
            )
        except Exception:
            pass

    def claim_resource(self, actor_id: str, pool_id: str, checkin_id: str) -> ResourceAssignment:
        if not checkin_id.strip():
            raise InvalidCheckinID("invalid checkin id")
        now = now_utc()
        assignment, plain_code = self.repository.claim_resource(pool_id, checkin_id, now)
        pool_name = self._pool_name(pool_id)
        participant = self.repository.get_participant_by_checkin_id(checkin_id)
        self._send_assignment_email(pool_name, participant, plain_code, now)
        self.repository.record_audit(
            actor_id, "resource.assign", "resource_assignment", assignment.id, "", now
        )
        return assignment

    def assign_resource(
        self, actor_id: str, pool_id: str, checkin_id: str
    ) -> ResourceAssignment:
        """管理员手动发放：绕过 claim_mode/白名单，直接分配并发邮件。"""
        if not checkin_id.strip():
            raise InvalidCheckinID("invalid checkin id")
        now = now_utc()
        assignment, plain_code = self.repository.assign_resource(pool_id, checkin_id, now)
        pool_name = self._pool_name(pool_id)
        participant = self.repository.get_participant_by_checkin_id(checkin_id)
        self._send_assignment_email(pool_name, participant, plain_code, now)
        self.repository.record_audit(
            actor_id, "resource.assign", "resource_assignment", assignment.id, "", now
        )
        return assignment

    def apply_resource(self, actor_id: str, pool_id: str, checkin_id: str) -> ResourceRequest:
        if not checkin_id.strip():
            raise InvalidCheckinID("invalid checkin id")
        now = now_utc()
        request = self.repository.create_resource_request(pool_id, checkin_id, now)
        # 发送「申请已提交」通知邮件；失败不影响申请结果。
        try:
            participant = self.repository.get_participant_by_checkin_id(checkin_id)
            self.repository.enqueue_email(
                participant.email,
                f"资源申请已提交：{request.pool_name or '资源'}",
                f"您的资源申请已提交，请等待管理员审核。",
                now,
            )
        except Exception:
            pass
        self.repository.record_audit(
            actor_id, "resource.request", "resource_request", request.id, "", now
        )
        return request

    def review_resource_request(
        self, actor_id: str, request_id: str, approve: bool, note: str = ""
    ):
        now = now_utc()
        if approve:
            assignment, request, plain_code = self.repository.approve_resource_request(
                request_id, actor_id, now
            )
            pool_name = request.pool_name or "资源"
            try:
                participant = self.repository.get_participant_by_checkin_id(request.checkin_id)
                self._send_assignment_email(pool_name, participant, plain_code, now)
            except Exception:
                pass
            self.repository.record_audit(
                actor_id,
                "resource.request.approve",
                "resource_request",
                request.id,
                "",
                now,
            )
            return assignment
        request = self.repository.reject_resource_request(request_id, actor_id, note, now)
        self.repository.record_audit(
            actor_id,
            "resource.request.reject",
            "resource_request",
            request.id,
            "",
            now,
        )
        return request

    def list_resource_requests(
        self, pool_id: str = "", checkin_id: str = "", status: str = ""
    ) -> list[ResourceRequest]:
        return self.repository.list_resource_requests(pool_id, checkin_id, status)

    def my_requests(self, checkin_id: str) -> list[ResourceRequest]:
        return self.repository.list_resource_requests(checkin_id=checkin_id)

    def allowed_tag_options(self) -> list[AllowedTagOption]:
        """白名单可选 tag 及其系统开关状态；关闭系统的 tag 前端灰显不可选。"""
        config = self.repository.get_site_config()
        return [
            AllowedTagOption(
                tag=ParticipantTag.approved,
                label=_TAG_LABELS[ParticipantTag.approved],
                systemEnabled=bool(config.get("enrollmentReviewEnabled", True)),
            ),
            AllowedTagOption(
                tag=ParticipantTag.checked_in,
                label=_TAG_LABELS[ParticipantTag.checked_in],
                systemEnabled=bool(config.get("checkinEnabled", True)),
            ),
        ]

    def my_resource_eligibility(self, email: str) -> dict:
        """聚合选手 tags 与各启用池的可领状态，减少前端 N 次请求。"""
        if not email:
            raise LoginRequired("login required")
        participant = self.repository.get_participant_by_email(email)
        checkin_id = participant.checkin_id or ""
        # 一律按 email 取 tag：approved tag 可能在签到前打入，checkin_id 列为 NULL。
        tags = self.repository.list_participant_tags(email)
        tag_values = {tag.value for tag in tags}
        pools = self.repository.list_visible_pools()
        assignments = self.repository.list_assignments(checkin_id=checkin_id) if checkin_id else []
        claimed_pool_ids = {assignment.pool_id for assignment in assignments}
        pending_pool_ids = {
            request.pool_id
            for request in self.repository.list_resource_requests(checkin_id=checkin_id)
            if request.status.value == "pending"
        } if checkin_id else set()

        pools_eligibility = []
        for pool in pools:
            allowed = pool.allowed_tags
            tag_hit = (not allowed) or any(tag.value in tag_values for tag in allowed)
            already_claimed = pool.id in claimed_pool_ids
            has_pending = pool.id in pending_pool_ids
            claim_mode = pool.claim_mode
            can_claim = (
                claim_mode == ClaimMode.self_claim
                and not pool.require_review
                and tag_hit
                and (pool.allow_multiple_claims or not already_claimed)
                and not has_pending
            )
            can_apply = (
                claim_mode != ClaimMode.admin_only
                and (claim_mode == ClaimMode.self_apply_review or pool.require_review)
                and tag_hit
                and (pool.allow_multiple_claims or not already_claimed)
                and not has_pending
            )
            pools_eligibility.append(
                {
                    "poolId": pool.id,
                    "canClaim": can_claim,
                    "canApply": can_apply,
                    "alreadyClaimed": already_claimed,
                    "hasPendingRequest": has_pending,
                }
            )
        return {"tags": sorted(tag_values), "pools": pools_eligibility}

    def my_resources(self, checkin_id: str) -> list[ResourceAssignment]:
        return self.repository.list_assignments(checkin_id)

    def _pool_name(self, pool_id: str) -> str:
        for pool in self.repository.list_resource_pools():
            if pool.id == pool_id:
                return pool.name
        return "资源"
