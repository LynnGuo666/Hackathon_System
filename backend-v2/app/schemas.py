from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class ParticipantStatus(StrEnum):
    pending = "pending"
    active = "active"
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


class EmailStatus(StrEnum):
    pending = "pending"
    sending = "sending"
    sent = "sent"
    failed = "failed"


class EmailOutbox(APIModel):
    id: str
    to: str
    subject: str
    body: str
    status: EmailStatus
    retry_count: int = Field(default=0, alias="retryCount")
    last_error: str = Field(default="", alias="lastError")
    sent_at: datetime | None = Field(default=None, alias="sentAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class AuditLog(APIModel):
    id: str
    actor_id: str = Field(alias="actorId")
    action: str
    target_type: str = Field(alias="targetType")
    target_id: str = Field(alias="targetId")
    reason: str = ""
    created_at: datetime | None = Field(default=None, alias="createdAt")


class NavigationLink(APIModel):
    id: str = ""
    title: str = ""
    description: str = ""
    url: str = ""
    enabled: bool = True
    sort_order: int = Field(default=0, alias="sortOrder")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class FeatureLink(APIModel):
    id: str = ""
    title: str = ""
    description: str = ""
    url: str = ""
    enabled: bool = True
    sort_order: int = Field(default=0, alias="sortOrder")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class FeatureToggleInput(APIModel):
    enabled: bool


class AccommodationOption(StrEnum):
    sleeping_bag = "sleeping_bag"
    tent = "tent"
    blanket = "blanket"
    hotel = "hotel"
    other = "other"


class AccommodationRequest(APIModel):
    email: str = ""
    selections: list[AccommodationOption] = Field(default_factory=list)
    other_detail: str = Field(default="", alias="otherDetail")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class SlotStatus(StrEnum):
    upcoming = "upcoming"
    open = "open"
    closed = "closed"
    disabled = "disabled"


class MealOrderSlot(APIModel):
    id: str = ""
    title: str = ""
    description: str = ""
    open_at: datetime | None = Field(default=None, alias="openAt")
    close_at: datetime | None = Field(default=None, alias="closeAt")
    service_date: str = Field(default="", alias="serviceDate")
    service_time: str = Field(default="", alias="serviceTime")
    order_deadline: str = Field(default="", alias="orderDeadline")
    is_open: bool = Field(default=True, alias="isOpen")
    dietary_options: list[str] = Field(default_factory=list, alias="dietaryOptions")
    enabled: bool = True
    sort_order: int = Field(default=0, alias="sortOrder")
    status: SlotStatus = SlotStatus.upcoming
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class DrinkSupplySlot(APIModel):
    id: str = ""
    title: str = ""
    description: str = ""
    open_at: datetime | None = Field(default=None, alias="openAt")
    close_at: datetime | None = Field(default=None, alias="closeAt")
    service_date: str = Field(default="", alias="serviceDate")
    service_time: str = Field(default="", alias="serviceTime")
    order_deadline: str = Field(default="", alias="orderDeadline")
    is_open: bool = Field(default=True, alias="isOpen")
    drink_options: list[str] = Field(default_factory=list, alias="drinkOptions")
    enabled: bool = True
    sort_order: int = Field(default=0, alias="sortOrder")
    status: SlotStatus = SlotStatus.upcoming
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class MealOrder(APIModel):
    id: str = ""
    email: str = ""
    slot_id: str = Field(default="", alias="slotId")
    dietary_needs: list[str] = Field(default_factory=list, alias="dietaryNeeds")
    other_detail: str = Field(default="", alias="otherDetail")
    notes: str = ""
    participant_name: str = Field(default="", alias="participantName")
    team_name: str = Field(default="", alias="teamName")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class DrinkOrder(APIModel):
    id: str = ""
    email: str = ""
    slot_id: str = Field(default="", alias="slotId")
    drink_option: str = Field(default="", alias="drinkOption")
    notes: str = ""
    participant_name: str = Field(default="", alias="participantName")
    team_name: str = Field(default="", alias="teamName")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class CountdownStage(APIModel):
    id: str = ""
    label: str = ""
    time: str = ""


class SiteConfig(APIModel):
    id: str = "default"
    event_name: str = Field(default="Hackathon", alias="eventName")
    timezone: str = "Asia/Shanghai"
    countdown_title: str = Field(default="", alias="countdownTitle")
    countdown_end: str = Field(default="", alias="countdownEnd")
    countdown_enabled: bool = Field(default=False, alias="countdownEnabled")
    countdown_stages: list[CountdownStage] = Field(default_factory=list, alias="countdownStages")
    updated_at: str = Field(default="", alias="updatedAt")


class AdminOverviewParticipants(APIModel):
    total: int = 0
    pending: int = 0
    active: int = 0
    disabled: int = 0
    checked_in: int = Field(default=0, alias="checkedIn")


class AdminOverviewCheckinIDs(APIModel):
    total: int = 0
    available: int = 0
    bound: int = 0


class AdminOverviewResources(APIModel):
    pools: int = 0
    items: int = 0
    available_items: int = Field(default=0, alias="availableItems")
    assigned_items: int = Field(default=0, alias="assignedItems")
    assignments: int = 0


class AdminOverviewEmails(APIModel):
    total: int = 0
    pending: int = 0
    sending: int = 0
    sent: int = 0
    failed: int = 0


class AdminOverviewMeals(APIModel):
    meal_slots: int = Field(default=0, alias="mealSlots")
    drink_slots: int = Field(default=0, alias="drinkSlots")
    meal_orders: int = Field(default=0, alias="mealOrders")
    drink_orders: int = Field(default=0, alias="drinkOrders")


class AdminOverviewConfiguration(APIModel):
    site_config: SiteConfig = Field(default_factory=SiteConfig, alias="siteConfig")
    navigation_links: int = Field(default=0, alias="navigationLinks")
    feature_links: int = Field(default=0, alias="featureLinks")


class AdminOverview(APIModel):
    participants: AdminOverviewParticipants = Field(default_factory=AdminOverviewParticipants)
    checkin_ids: AdminOverviewCheckinIDs = Field(
        default_factory=AdminOverviewCheckinIDs, alias="checkinIds"
    )
    resources: AdminOverviewResources = Field(default_factory=AdminOverviewResources)
    emails: AdminOverviewEmails = Field(default_factory=AdminOverviewEmails)
    meals: AdminOverviewMeals = Field(default_factory=AdminOverviewMeals)
    configuration: AdminOverviewConfiguration = Field(
        default_factory=AdminOverviewConfiguration
    )


class EventLocation(APIModel):
    id: str = "default"
    name: str = ""
    address: str = ""
    latitude: float | None = None
    longitude: float | None = None
    osm_type: str = Field(default="", alias="osmType")
    osm_id: str = Field(default="", alias="osmId")
    osm_url: str = Field(default="", alias="osmUrl")
    updated_at: str = Field(default="", alias="updatedAt")


class OSMSearchResult(APIModel):
    place_id: str = Field(default="", alias="placeId")
    display_name: str = Field(default="", alias="displayName")
    latitude: float = Field(alias="latitude")
    longitude: float = Field(alias="longitude")
    osm_type: str = Field(default="", alias="osmType")
    osm_id: str = Field(default="", alias="osmId")
    category: str = ""
    type: str = ""


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


class ImportCodesInput(APIModel):
    codes: list[str] = Field(default_factory=list)
    values: list[str] = Field(default_factory=list)


class AssignInput(APIModel):
    checkin_id: str = Field(alias="checkinId")
