from typing import Any

import yaml

from app.core.errors import Conflict, InvalidNavigation, InvalidProfile
from app.repositories.common import decode_time, now_utc
from app.schemas import (
    DrinkOrder,
    DrinkSupplySlot,
    MealOrder,
    MealOrderSlot,
    SupplyTemplateImportResult,
    SupplyTemplateItem,
    SupplyTemplatePreview,
)


class MealOrderServiceMixin:
    def create_meal_slot(self, actor_id: str, slot: MealOrderSlot) -> MealOrderSlot:
        now = now_utc()
        saved = self.repository.create_meal_slot(self._clean_meal_slot(slot, now), now)
        self.repository.record_audit(actor_id, "meal_slot.create", "meal_slot", saved.id, "", now)
        return saved

    def update_meal_slot(self, actor_id: str, slot_id: str, slot: MealOrderSlot) -> MealOrderSlot:
        now = now_utc()
        saved = self.repository.update_meal_slot(slot_id, self._clean_meal_slot(slot, now), now)
        self.repository.record_audit(actor_id, "meal_slot.update", "meal_slot", saved.id, "", now)
        return saved

    def create_drink_slot(self, actor_id: str, slot: DrinkSupplySlot) -> DrinkSupplySlot:
        now = now_utc()
        saved = self.repository.create_drink_slot(self._clean_drink_slot(slot, now), now)
        self.repository.record_audit(actor_id, "drink_slot.create", "drink_slot", saved.id, "", now)
        return saved

    def update_drink_slot(
        self, actor_id: str, slot_id: str, slot: DrinkSupplySlot
    ) -> DrinkSupplySlot:
        now = now_utc()
        saved = self.repository.update_drink_slot(slot_id, self._clean_drink_slot(slot, now), now)
        self.repository.record_audit(actor_id, "drink_slot.update", "drink_slot", saved.id, "", now)
        return saved

    def preview_supply_template(self, content: str) -> SupplyTemplatePreview:
        version, timezone, items = self._parse_supply_template(content)
        return self._build_supply_template_preview(version, timezone, items)

    def import_supply_template(
        self, actor_id: str, content: str, mode: str
    ) -> SupplyTemplateImportResult:
        if mode not in {"create_only", "upsert"}:
            raise InvalidNavigation("invalid import mode")
        version, timezone, items = self._parse_supply_template(content)
        preview = self._build_supply_template_preview(version, timezone, items)
        now = now_utc()
        meal_slots: list[MealOrderSlot] = []
        drink_slots: list[DrinkSupplySlot] = []
        created = 0
        updated = 0
        skipped = 0

        for item in preview.supplies:
            if item.duplicate:
                skipped += 1
                continue
            existing_id = item.existing_slot_id
            if existing_id and mode == "create_only":
                skipped += 1
                continue
            if item.type == "meal":
                slot = MealOrderSlot(
                    title=item.title,
                    description=item.description,
                    serviceDate=item.service_date,
                    serviceTime=item.service_time,
                    orderDeadline=item.order_deadline,
                    isOpen=item.is_open,
                    enabled=item.enabled,
                    sortOrder=item.sort_order,
                    dietaryOptions=item.options,
                )
                if existing_id:
                    saved_meal = self.repository.update_meal_slot(
                        existing_id, self._clean_meal_slot(slot, now), now
                    )
                    updated += 1
                    self.repository.record_audit(
                        actor_id, "meal_slot.template_update", "meal_slot", saved_meal.id, "", now
                    )
                else:
                    saved_meal = self.repository.create_meal_slot(self._clean_meal_slot(slot, now), now)
                    created += 1
                    self.repository.record_audit(
                        actor_id, "meal_slot.template_create", "meal_slot", saved_meal.id, "", now
                    )
                meal_slots.append(saved_meal)
            else:
                slot = DrinkSupplySlot(
                    title=item.title,
                    description=item.description,
                    serviceDate=item.service_date,
                    serviceTime=item.service_time,
                    orderDeadline=item.order_deadline,
                    isOpen=item.is_open,
                    enabled=item.enabled,
                    sortOrder=item.sort_order,
                    drinkOptions=item.options,
                )
                if existing_id:
                    saved_drink = self.repository.update_drink_slot(
                        existing_id, self._clean_drink_slot(slot, now), now
                    )
                    updated += 1
                    self.repository.record_audit(
                        actor_id,
                        "drink_slot.template_update",
                        "drink_slot",
                        saved_drink.id,
                        "",
                        now,
                    )
                else:
                    saved_drink = self.repository.create_drink_slot(
                        self._clean_drink_slot(slot, now), now
                    )
                    created += 1
                    self.repository.record_audit(
                        actor_id,
                        "drink_slot.template_create",
                        "drink_slot",
                        saved_drink.id,
                        "",
                        now,
                    )
                drink_slots.append(saved_drink)

        return SupplyTemplateImportResult(
            version=version,
            timezone=timezone,
            supplies=preview.supplies,
            created=created,
            updated=updated,
            skipped=skipped,
            mealSlots=meal_slots,
            drinkSlots=drink_slots,
        )

    def save_meal_order(self, email: str, slot_id: str, order: MealOrder) -> MealOrder:
        participant = self.checked_in_participant(email)
        slot = self.repository.get_meal_slot(slot_id)
        self._ensure_slot_open(slot.enabled, slot.is_open, slot.close_at)
        needs = [item.strip() for item in dict.fromkeys(order.dietary_needs) if item.strip()]
        if not needs:
            raise InvalidProfile("at least one dietary option is required")
        invalid = [item for item in needs if item not in slot.dietary_options]
        if invalid:
            raise InvalidProfile(f"invalid dietary option: {invalid[0]}")
        has_other = "其他" in needs or "other" in needs
        now = now_utc()
        saved = self.repository.upsert_meal_order(
            participant.email,
            order.model_copy(
                update={
                    "slot_id": slot_id,
                    "dietary_needs": needs,
                    "other_detail": order.other_detail.strip() if has_other else "",
                    "notes": order.notes.strip(),
                }
            ),
            now,
        )
        self.repository.record_audit(
            participant.checkin_id, "meal_order.upsert", "meal_order", saved.id, "", now
        )
        return saved

    def cancel_meal_order(self, email: str, slot_id: str) -> None:
        participant = self.checked_in_participant(email)
        slot = self.repository.get_meal_slot(slot_id)
        self._ensure_slot_open(slot.enabled, slot.is_open, slot.close_at)
        order = self.repository.get_meal_order_for_participant(participant.email, slot_id)
        now = now_utc()
        self.repository.delete_meal_order(order.id)
        self.repository.record_audit(
            participant.checkin_id, "meal_order.cancel", "meal_order", order.id, "", now
        )

    def save_drink_order(self, email: str, slot_id: str, order: DrinkOrder) -> DrinkOrder:
        participant = self.checked_in_participant(email)
        slot = self.repository.get_drink_slot(slot_id)
        self._ensure_slot_open(slot.enabled, slot.is_open, slot.close_at)
        drink_option = order.drink_option.strip()
        if not drink_option:
            raise InvalidProfile("drink option is required")
        if drink_option not in slot.drink_options:
            raise InvalidProfile("drink option is not available")
        now = now_utc()
        saved = self.repository.upsert_drink_order(
            participant.email,
            order.model_copy(
                update={"slot_id": slot_id, "drink_option": drink_option, "notes": order.notes.strip()}
            ),
            now,
        )
        self.repository.record_audit(
            participant.checkin_id, "drink_order.upsert", "drink_order", saved.id, "", now
        )
        return saved

    def cancel_drink_order(self, email: str, slot_id: str) -> None:
        participant = self.checked_in_participant(email)
        slot = self.repository.get_drink_slot(slot_id)
        self._ensure_slot_open(slot.enabled, slot.is_open, slot.close_at)
        order = self.repository.get_drink_order_for_participant(participant.email, slot_id)
        now = now_utc()
        self.repository.delete_drink_order(order.id)
        self.repository.record_audit(
            participant.checkin_id, "drink_order.cancel", "drink_order", order.id, "", now
        )

    def _parse_supply_template(self, content: str) -> tuple[str, str, list[SupplyTemplateItem]]:
        try:
            payload = yaml.safe_load(content)
        except yaml.YAMLError as exc:
            raise InvalidNavigation("invalid yaml template") from exc
        if not isinstance(payload, dict):
            raise InvalidNavigation("template root must be a mapping")

        defaults = payload.get("defaults") or {}
        if not isinstance(defaults, dict):
            raise InvalidNavigation("template defaults must be a mapping")
        supplies = payload.get("supplies")
        if not isinstance(supplies, list):
            raise InvalidNavigation("template supplies must be a list")

        items: list[SupplyTemplateItem] = []
        seen: set[tuple[str, str, str, str]] = set()
        duplicate_keys: set[tuple[str, str, str, str]] = set()
        for raw in supplies:
            if not isinstance(raw, dict):
                raise InvalidNavigation("template supply must be a mapping")
            merged = {**defaults, **raw}
            item = self._template_item_from_mapping(merged)
            key = self._template_key(item)
            if key in seen:
                duplicate_keys.add(key)
            seen.add(key)
            items.append(item)

        return str(payload.get("version") or ""), str(payload.get("timezone") or ""), [
            item.model_copy(update={"duplicate": self._template_key(item) in duplicate_keys})
            for item in items
        ]

    def _template_item_from_mapping(self, data: dict[str, Any]) -> SupplyTemplateItem:
        supply_type = str(data.get("type") or "").strip().lower()
        title = str(data.get("title") or "").strip()
        service_date = str(data.get("serviceDate") or data.get("service_date") or "").strip()
        service_time = str(data.get("serviceTime") or data.get("service_time") or "").strip()
        order_deadline = str(data.get("orderDeadline") or data.get("order_deadline") or "").strip()
        options = data.get("options")
        if options is None:
            options = data.get("dietaryOptions") if supply_type == "meal" else data.get("drinkOptions")
        clean_options = [str(item).strip() for item in (options or []) if str(item).strip()]

        if supply_type not in {"meal", "drink"}:
            raise InvalidNavigation("template supply type must be meal or drink")
        if not title:
            raise InvalidNavigation("template supply requires title")
        if not service_date:
            raise InvalidNavigation("template supply requires serviceDate")
        if not service_time:
            raise InvalidNavigation("template supply requires serviceTime")
        if not order_deadline:
            raise InvalidNavigation("template supply requires orderDeadline")
        if not clean_options:
            raise InvalidNavigation("template supply requires options")
        if self._decode_deadline(order_deadline) is None:
            raise InvalidNavigation("template supply orderDeadline is invalid")

        return SupplyTemplateItem(
            type=supply_type,
            title=title,
            description=str(data.get("description") or "").strip(),
            serviceDate=service_date,
            serviceTime=service_time,
            orderDeadline=order_deadline,
            options=clean_options,
            enabled=bool(data.get("enabled", True)),
            isOpen=bool(data.get("isOpen", data.get("is_open", True))),
            sortOrder=int(data.get("sortOrder", data.get("sort_order", 0)) or 0),
        )

    def _build_supply_template_preview(
        self, version: str, timezone: str, items: list[SupplyTemplateItem]
    ) -> SupplyTemplatePreview:
        supplies: list[SupplyTemplateItem] = []
        created = 0
        updated = 0
        skipped = 0
        for item in items:
            existing = (
                self.repository.find_meal_slot_by_template_key(
                    item.title, item.service_date, item.service_time
                )
                if item.type == "meal"
                else self.repository.find_drink_slot_by_template_key(
                    item.title, item.service_date, item.service_time
                )
            )
            preview_item = item.model_copy(update={"existing_slot_id": existing.id if existing else ""})
            supplies.append(preview_item)
            if item.duplicate:
                skipped += 1
            elif existing:
                updated += 1
            else:
                created += 1
        return SupplyTemplatePreview(
            version=version,
            timezone=timezone,
            supplies=supplies,
            created=created,
            updated=updated,
            skipped=skipped,
        )

    def _template_key(self, item: SupplyTemplateItem) -> tuple[str, str, str, str]:
        return (item.type, item.title, item.service_date, item.service_time)

    def _clean_meal_slot(self, slot: MealOrderSlot, now) -> MealOrderSlot:
        title = slot.title.strip()
        if not title:
            raise InvalidNavigation("meal slot requires title")
        dietary_options = [item.strip() for item in slot.dietary_options if item.strip()]
        if not dietary_options:
            dietary_options = ["无特殊忌口", "素食", "清真", "不吃辣", "坚果过敏", "海鲜过敏", "其他"]
        close_at = slot.close_at or self._decode_deadline(slot.order_deadline) or now
        return slot.model_copy(
            update={
                "title": title,
                "description": slot.description.strip(),
                "service_date": slot.service_date.strip(),
                "service_time": slot.service_time.strip(),
                "order_deadline": slot.order_deadline.strip(),
                "dietary_options": dietary_options,
                "open_at": slot.open_at or now,
                "close_at": close_at,
            }
        )

    def _clean_drink_slot(self, slot: DrinkSupplySlot, now) -> DrinkSupplySlot:
        title = slot.title.strip()
        if not title:
            raise InvalidNavigation("drink slot requires title")
        drink_options = [item.strip() for item in slot.drink_options if item.strip()]
        if not drink_options:
            drink_options = ["矿泉水", "可乐", "无糖饮料", "茶", "咖啡", "不需要"]
        close_at = slot.close_at or self._decode_deadline(slot.order_deadline) or now
        return slot.model_copy(
            update={
                "title": title,
                "description": slot.description.strip(),
                "service_date": slot.service_date.strip(),
                "service_time": slot.service_time.strip(),
                "order_deadline": slot.order_deadline.strip(),
                "drink_options": drink_options,
                "open_at": slot.open_at or now,
                "close_at": close_at,
            }
        )

    def _decode_deadline(self, value: str):
        try:
            return decode_time(value)
        except ValueError:
            return None

    def _ensure_slot_open(self, enabled: bool, is_open: bool, close_at) -> None:
        if not enabled or not is_open:
            raise Conflict("slot is not open")
        if close_at and now_utc() > close_at:
            raise Conflict("slot is closed")
