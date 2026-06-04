from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas.base import APIModel


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
