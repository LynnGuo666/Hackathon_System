import json
from datetime import datetime
from typing import Any

import sqlite3

from app.core.errors import NotFound
from app.core.security import normalize_email
from app.repositories.common import decode_time, encode_time, new_id
from app.schemas import DrinkOrder, MealOrder


class FoodOrderRepositoryMixin:
    db: sqlite3.Connection

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
