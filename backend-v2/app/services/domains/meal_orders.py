from app.core.errors import Conflict, InvalidNavigation, InvalidProfile
from app.repositories.common import decode_time, now_utc
from app.schemas import DrinkOrder, DrinkSupplySlot, MealOrder, MealOrderSlot


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
