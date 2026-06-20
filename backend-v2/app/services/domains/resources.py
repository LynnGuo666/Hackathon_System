from app.core.errors import InvalidCheckinID, InvalidResourceCSV, NotFound
from app.repositories.common import now_utc
from app.schemas import (
    ResourceAssignment,
    ResourceItem,
    ResourceItemUpdateInput,
    ResourcePool,
    ResourcePoolUpdateInput,
)
from app.services import mailer


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

    def claim_resource(self, actor_id: str, pool_id: str, checkin_id: str) -> ResourceAssignment:
        if not checkin_id.strip():
            raise InvalidCheckinID("invalid checkin id")
        now = now_utc()
        assignment, plain_code = self.repository.claim_resource(pool_id, checkin_id, now)
        pool_name = "资源"
        for pool in self.repository.list_resource_pools():
            if pool.id == pool_id:
                pool_name = pool.name
                break
        try:
            participant = self.repository.get_participant_by_checkin_id(checkin_id)
            self.repository.enqueue_email(
                participant.email,
                mailer.resource_assigned_subject(pool_name),
                mailer.resource_assigned_body(pool_name, plain_code),
                now,
            )
        except Exception:
            pass
        self.repository.record_audit(
            actor_id, "resource.assign", "resource_assignment", assignment.id, "", now
        )
        return assignment

    def my_resources(self, checkin_id: str) -> list[ResourceAssignment]:
        return self.repository.list_assignments(checkin_id)
