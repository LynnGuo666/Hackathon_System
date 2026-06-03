import json
from datetime import datetime
from typing import Any

import sqlite3

from app.core.errors import NotFound
from app.repositories.common import bool_int, decode_time, encode_time, new_id, now_utc, slot_status
from app.schemas import DrinkSupplySlot, MealOrderSlot


class MealSlotRepositoryMixin:
    db: sqlite3.Connection

    def create_meal_slot(self, slot: MealOrderSlot, now: datetime) -> MealOrderSlot:
        saved = slot.model_copy(
            update={
                "id": new_id("meal"),
                "created_at": now,
                "updated_at": now,
                "open_at": slot.open_at or now,
                "close_at": slot.close_at or decode_time(slot.order_deadline) or now,
            }
        )
        self.db.execute(
            """
INSERT INTO meal_order_slots (
  id, title, description, open_at, close_at, service_date, service_time, order_deadline,
  is_open, dietary_options, enabled, sort_order, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""",
            (
                saved.id,
                saved.title,
                saved.description,
                encode_time(saved.open_at),
                encode_time(saved.close_at),
                saved.service_date,
                saved.service_time,
                saved.order_deadline,
                bool_int(saved.is_open),
                json.dumps(saved.dietary_options),
                bool_int(saved.enabled),
                saved.sort_order,
                encode_time(saved.created_at),
                encode_time(saved.updated_at),
            ),
        )
        return self.get_meal_slot(saved.id)

    def update_meal_slot(self, slot_id: str, slot: MealOrderSlot, now: datetime) -> MealOrderSlot:
        close_at = slot.close_at or decode_time(slot.order_deadline) or now
        result = self.db.execute(
            """
UPDATE meal_order_slots
SET title = ?, description = ?, open_at = ?, close_at = ?, service_date = ?,
    service_time = ?, order_deadline = ?, is_open = ?, dietary_options = ?,
    enabled = ?, sort_order = ?, updated_at = ?
WHERE id = ?
""",
            (
                slot.title,
                slot.description,
                encode_time(slot.open_at or now),
                encode_time(close_at),
                slot.service_date,
                slot.service_time,
                slot.order_deadline,
                bool_int(slot.is_open),
                json.dumps(slot.dietary_options),
                bool_int(slot.enabled),
                slot.sort_order,
                encode_time(now),
                slot_id,
            ),
        )
        if result.rowcount == 0:
            raise NotFound("meal slot not found")
        return self.get_meal_slot(slot_id)

    def get_meal_slot(self, slot_id: str) -> MealOrderSlot:
        row = self.db.execute(
            """
SELECT id, title, description, open_at, close_at, service_date, service_time,
       order_deadline, is_open, dietary_options, enabled, sort_order, created_at, updated_at
FROM meal_order_slots WHERE id = ?
""",
            (slot_id,),
        ).fetchone()
        if not row:
            raise NotFound("meal slot not found")
        return self._meal_slot_from_row(row)

    def list_meal_slots(self, include_disabled: bool = False) -> list[MealOrderSlot]:
        query = """
SELECT id, title, description, open_at, close_at, service_date, service_time,
       order_deadline, is_open, dietary_options, enabled, sort_order, created_at, updated_at
FROM meal_order_slots
"""
        params: tuple[Any, ...] = ()
        if not include_disabled:
            query += " WHERE enabled = ?"
            params = (1,)
        query += " ORDER BY sort_order ASC, created_at ASC"
        rows = self.db.execute(query, params).fetchall()
        return [self._meal_slot_from_row(row) for row in rows]

    def create_drink_slot(self, slot: DrinkSupplySlot, now: datetime) -> DrinkSupplySlot:
        saved = slot.model_copy(
            update={
                "id": new_id("drink"),
                "created_at": now,
                "updated_at": now,
                "open_at": slot.open_at or now,
                "close_at": slot.close_at or decode_time(slot.order_deadline) or now,
            }
        )
        self.db.execute(
            """
INSERT INTO drink_supply_slots (
  id, title, description, open_at, close_at, service_date, service_time, order_deadline,
  is_open, drink_options, enabled, sort_order, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""",
            (
                saved.id,
                saved.title,
                saved.description,
                encode_time(saved.open_at),
                encode_time(saved.close_at),
                saved.service_date,
                saved.service_time,
                saved.order_deadline,
                bool_int(saved.is_open),
                json.dumps(saved.drink_options),
                bool_int(saved.enabled),
                saved.sort_order,
                encode_time(saved.created_at),
                encode_time(saved.updated_at),
            ),
        )
        return self.get_drink_slot(saved.id)

    def update_drink_slot(
        self, slot_id: str, slot: DrinkSupplySlot, now: datetime
    ) -> DrinkSupplySlot:
        close_at = slot.close_at or decode_time(slot.order_deadline) or now
        result = self.db.execute(
            """
UPDATE drink_supply_slots
SET title = ?, description = ?, open_at = ?, close_at = ?, service_date = ?,
    service_time = ?, order_deadline = ?, is_open = ?, drink_options = ?,
    enabled = ?, sort_order = ?, updated_at = ?
WHERE id = ?
""",
            (
                slot.title,
                slot.description,
                encode_time(slot.open_at or now),
                encode_time(close_at),
                slot.service_date,
                slot.service_time,
                slot.order_deadline,
                bool_int(slot.is_open),
                json.dumps(slot.drink_options),
                bool_int(slot.enabled),
                slot.sort_order,
                encode_time(now),
                slot_id,
            ),
        )
        if result.rowcount == 0:
            raise NotFound("drink slot not found")
        return self.get_drink_slot(slot_id)

    def get_drink_slot(self, slot_id: str) -> DrinkSupplySlot:
        row = self.db.execute(
            """
SELECT id, title, description, open_at, close_at, service_date, service_time,
       order_deadline, is_open, drink_options, enabled, sort_order, created_at, updated_at
FROM drink_supply_slots WHERE id = ?
""",
            (slot_id,),
        ).fetchone()
        if not row:
            raise NotFound("drink slot not found")
        return self._drink_slot_from_row(row)

    def list_drink_slots(self, include_disabled: bool = False) -> list[DrinkSupplySlot]:
        query = """
SELECT id, title, description, open_at, close_at, service_date, service_time,
       order_deadline, is_open, drink_options, enabled, sort_order, created_at, updated_at
FROM drink_supply_slots
"""
        params: tuple[Any, ...] = ()
        if not include_disabled:
            query += " WHERE enabled = ?"
            params = (1,)
        query += " ORDER BY sort_order ASC, created_at ASC"
        rows = self.db.execute(query, params).fetchall()
        return [self._drink_slot_from_row(row) for row in rows]

    def _meal_slot_from_row(self, row: sqlite3.Row) -> MealOrderSlot:
        now = now_utc()
        open_at = decode_time(row["open_at"])
        close_at = decode_time(row["close_at"])
        enabled = bool(row["enabled"])
        is_open = bool(row["is_open"]) and enabled and (not close_at or now <= close_at)
        return MealOrderSlot(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            openAt=open_at,
            closeAt=close_at,
            serviceDate=row["service_date"],
            serviceTime=row["service_time"],
            orderDeadline=row["order_deadline"],
            isOpen=is_open,
            dietaryOptions=json.loads(row["dietary_options"] or "[]"),
            enabled=enabled,
            sortOrder=row["sort_order"],
            status=slot_status(open_at, close_at, enabled and bool(row["is_open"]), now),
            createdAt=decode_time(row["created_at"]),
            updatedAt=decode_time(row["updated_at"]),
        )

    def _drink_slot_from_row(self, row: sqlite3.Row) -> DrinkSupplySlot:
        now = now_utc()
        open_at = decode_time(row["open_at"])
        close_at = decode_time(row["close_at"])
        enabled = bool(row["enabled"])
        is_open = bool(row["is_open"]) and enabled and (not close_at or now <= close_at)
        return DrinkSupplySlot(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            openAt=open_at,
            closeAt=close_at,
            serviceDate=row["service_date"],
            serviceTime=row["service_time"],
            orderDeadline=row["order_deadline"],
            isOpen=is_open,
            drinkOptions=json.loads(row["drink_options"] or "[]"),
            enabled=enabled,
            sortOrder=row["sort_order"],
            status=slot_status(open_at, close_at, enabled and bool(row["is_open"]), now),
            createdAt=decode_time(row["created_at"]),
            updatedAt=decode_time(row["updated_at"]),
        )
