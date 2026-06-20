from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas.base import APIModel

class ResourcePoolType(StrEnum):
    code = "code"
    link = "link"
    credential = "credential"
    physical = "physical"


class DistributionRule(StrEnum):
    one_per_participant = "one_per_participant"
    role_based = "role_based"
    manual = "manual"


class VisiblePhase(StrEnum):
    pre_event = "pre_event"
    in_event = "in_event"
    all = "all"


class ResourcePool(APIModel):
    id: str = ""
    name: str = ""
    type: ResourcePoolType = ResourcePoolType.code
    distribution_rule: DistributionRule = Field(
        default=DistributionRule.one_per_participant, alias="distributionRule"
    )
    visible_phase: VisiblePhase = Field(default=VisiblePhase.all, alias="visiblePhase")
    enabled: bool = True
    allow_multiple_claims: bool = Field(default=False, alias="allowMultipleClaims")
    doc_url: str = Field(default="", alias="docUrl")
    doc_markdown: str = Field(default="", alias="docMarkdown")
    created_at: datetime | None = Field(default=None, alias="createdAt")


class ResourceItemStatus(StrEnum):
    available = "available"
    assigned = "assigned"
    revoked = "revoked"
    used = "used"


class ResourceItem(APIModel):
    id: str
    pool_id: str = Field(alias="poolId")
    public_label: str = Field(alias="publicLabel")
    status: ResourceItemStatus
    assigned_checkin_id: str = Field(default="", alias="assignedCheckinId")
    assigned_at: datetime | None = Field(default=None, alias="assignedAt")
    expires_at: datetime | None = Field(default=None, alias="expiresAt")
    doc_url: str = Field(default="", alias="docUrl")
    doc_markdown: str = Field(default="", alias="docMarkdown")


class ResourceAssignmentStatus(StrEnum):
    assigned = "assigned"
    delivered = "delivered"
    revoked = "revoked"


class ResourceAssignment(APIModel):
    id: str
    checkin_id: str = Field(alias="checkinId")
    pool_id: str = Field(alias="poolId")
    resource_item_id: str = Field(alias="resourceItemId")
    status: ResourceAssignmentStatus
    delivered_by_email: bool = Field(default=False, alias="deliveredByEmail")
    delivered_at: datetime | None = Field(default=None, alias="deliveredAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    plain_code: str = Field(default="", alias="plainCode")
    pool_name: str = Field(default="", alias="poolName")
    pool_type: str = Field(default="", alias="poolType")
    item_doc_url: str = Field(default="", alias="itemDocUrl")
    item_doc_markdown: str = Field(default="", alias="itemDocMarkdown")


class ImportCodesInput(APIModel):
    codes: list[str] = Field(default_factory=list)
    values: list[str] = Field(default_factory=list)


class AssignInput(APIModel):
    checkin_id: str = Field(alias="checkinId")


class ResourcePoolUpdateInput(APIModel):
    """编辑资源池信息；None 表示不改。"""

    name: str | None = Field(default=None)
    type: ResourcePoolType | None = Field(default=None)
    distribution_rule: DistributionRule | None = Field(default=None, alias="distributionRule")
    visible_phase: VisiblePhase | None = Field(default=None, alias="visiblePhase")
    enabled: bool | None = Field(default=None)
    allow_multiple_claims: bool | None = Field(default=None, alias="allowMultipleClaims")
    doc_url: str | None = Field(default=None, alias="docUrl")
    doc_markdown: str | None = Field(default=None, alias="docMarkdown")


class ResourceItemUpdateInput(APIModel):
    """编辑单个 Key 的说明文档；None 表示不改。"""

    doc_url: str | None = Field(default=None, alias="docUrl")
    doc_markdown: str | None = Field(default=None, alias="docMarkdown")
