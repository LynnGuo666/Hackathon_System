from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas.base import APIModel
from app.schemas.food import DrinkOrder, MealOrder, MealOrderSlot
from app.schemas.resources import ResourceAssignment


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


class CountdownStage(APIModel):
    id: str = ""
    label: str = ""
    # 阶段时间统一存 UTC ISO 字符串；展示/编辑时由前端按配置时区转换。
    time: str = ""


class SiteConfig(APIModel):
    id: str = "default"
    event_name: str = Field(default="Hackathon", alias="eventName")
    timezone: str = "Asia/Shanghai"
    # 旧字段仍保留在响应里，兼容历史单一倒计时配置和旧前端读取路径。
    countdown_title: str = Field(default="", alias="countdownTitle")
    countdown_end: str = Field(default="", alias="countdownEnd")
    countdown_enabled: bool = Field(default=False, alias="countdownEnabled")
    countdown_stages: list[CountdownStage] = Field(default_factory=list, alias="countdownStages")
    walkup_checkin_enabled: bool = Field(default=False, alias="walkupCheckinEnabled")
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
    configuration: AdminOverviewConfiguration = Field(default_factory=AdminOverviewConfiguration)


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
