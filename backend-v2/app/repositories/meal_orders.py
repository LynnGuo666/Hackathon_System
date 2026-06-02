import json
from datetime import datetime
from typing import Any

import sqlite3

from app.core.errors import NotFound
from app.core.security import normalize_email
from app.repositories.common import bool_int, decode_time, encode_time, new_id, now_utc, slot_status
from app.schemas import DrinkOrder, DrinkSupplySlot, MealOrder, MealOrderSlot


class MealOrderRepositoryMixin:
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

    def upsert_meal_order(self, email: str, order: MealOrder, now: datetime) -> MealOrder:
        email = normalize_email(email)
        row = self.db.execute(
            "SELECT id, created_at FROM meal_orders WHERE email = ? AND slot_id = ?",
            (email, order.slot_id),
        ).fetchone()
        order_id = row["id"] if row else new_id("mord")
        created_at = decode_time(row["created_at"]) if row else now
        self.db.execute(
            """
INSERT INTO meal_orders (id, email, slot_id, dietary_needs, other_detail, notes, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(email, slot_id) DO UPDATE SET
  dietary_needs = excluded.dietary_needs,
  other_detail = excluded.other_detail,
  notes = excluded.notes,
  updated_at = excluded.updated_at
""",
            (
                order_id,
                email,
                order.slot_id,
                json.dumps(order.dietary_needs),
                order.other_detail,
                order.notes,
                encode_time(created_at),
                encode_time(now),
            ),
        )
        return self.get_meal_order(order_id)

    def list_meal_orders(self, email: str = "", slot_id: str = "") -> list[MealOrder]:
        query = """
SELECT o.id, o.email, o.slot_id, o.dietary_needs, o.other_detail, o.notes,
       COALESCE(p.full_name, '') participant_name, COALESCE(p.team_name, '') team_name,
       o.created_at, o.updated_at
FROM meal_orders o
LEFT JOIN participant_profiles p ON p.email = o.email
"""
        filters: list[str] = []
        params: list[Any] = []
        if email:
            filters.append("o.email = ?")
            params.append(normalize_email(email))
        if slot_id:
            filters.append("o.slot_id = ?")
            params.append(slot_id)
        if filters:
            query += " WHERE " + " AND ".join(filters)
        query += " ORDER BY o.updated_at DESC"
        rows = self.db.execute(query, tuple(params)).fetchall()
        return [self._meal_order_from_row(row) for row in rows]

    def get_meal_order(self, order_id: str) -> MealOrder:
        row = self.db.execute(
            """
SELECT o.id, o.email, o.slot_id, o.dietary_needs, o.other_detail, o.notes,
       COALESCE(p.full_name, '') participant_name, COALESCE(p.team_name, '') team_name,
       o.created_at, o.updated_at
FROM meal_orders o
LEFT JOIN participant_profiles p ON p.email = o.email
WHERE o.id = ?
""",
            (order_id,),
        ).fetchone()
        if not row:
            raise NotFound("meal order not found")
        return self._meal_order_from_row(row)

    def upsert_drink_order(self, email: str, order: DrinkOrder, now: datetime) -> DrinkOrder:
        email = normalize_email(email)
        row = self.db.execute(
            "SELECT id, created_at FROM drink_orders WHERE email = ? AND slot_id = ?",
            (email, order.slot_id),
        ).fetchone()
        order_id = row["id"] if row else new_id("dord")
        created_at = decode_time(row["created_at"]) if row else now
        self.db.execute(
            """
INSERT INTO drink_orders (id, email, slot_id, drink_option, notes, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(email, slot_id) DO UPDATE SET
  drink_option = excluded.drink_option,
  notes = excluded.notes,
  updated_at = excluded.updated_at
""",
            (
                order_id,
                email,
                order.slot_id,
                order.drink_option,
                order.notes,
                encode_time(created_at),
                encode_time(now),
            ),
        )
        return self.get_drink_order(order_id)

    def list_drink_orders(self, email: str = "", slot_id: str = "") -> list[DrinkOrder]:
        query = """
SELECT o.id, o.email, o.slot_id, o.drink_option, o.notes,
       COALESCE(p.full_name, '') participant_name, COALESCE(p.team_name, '') team_name,
       o.created_at, o.updated_at
FROM drink_orders o
LEFT JOIN participant_profiles p ON p.email = o.email
"""
        filters: list[str] = []
        params: list[Any] = []
        if email:
            filters.append("o.email = ?")
            params.append(normalize_email(email))
        if slot_id:
            filters.append("o.slot_id = ?")
            params.append(slot_id)
        if filters:
            query += " WHERE " + " AND ".join(filters)
        query += " ORDER BY o.updated_at DESC"
        rows = self.db.execute(query, tuple(params)).fetchall()
        return [self._drink_order_from_row(row) for row in rows]

    def get_drink_order(self, order_id: str) -> DrinkOrder:
        row = self.db.execute(
            """
SELECT o.id, o.email, o.slot_id, o.drink_option, o.notes,
       COALESCE(p.full_name, '') participant_name, COALESCE(p.team_name, '') team_name,
       o.created_at, o.updated_at
FROM drink_orders o
LEFT JOIN participant_profiles p ON p.email = o.email
WHERE o.id = ?
""",
            (order_id,),
        ).fetchone()
        if not row:
            raise NotFound("drink order not found")
        return self._drink_order_from_row(row)

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

    def _meal_order_from_row(self, row: sqlite3.Row) -> MealOrder:
        return MealOrder(
            id=row["id"],
            email=row["email"],
            slotId=row["slot_id"],
            dietaryNeeds=json.loads(row["dietary_needs"] or "[]"),
            otherDetail=row["other_detail"],
            notes=row["notes"],
            participantName=row["participant_name"],
            teamName=row["team_name"],
            createdAt=decode_time(row["created_at"]),
            updatedAt=decode_time(row["updated_at"]),
        )

    def _drink_order_from_row(self, row: sqlite3.Row) -> DrinkOrder:
        return DrinkOrder(
            id=row["id"],
            email=row["email"],
            slotId=row["slot_id"],
            drinkOption=row["drink_option"],
            notes=row["notes"],
            participantName=row["participant_name"],
            teamName=row["team_name"],
            createdAt=decode_time(row["created_at"]),
            updatedAt=decode_time(row["updated_at"]),
        )
