from datetime import datetime
import json
import sqlite3
from typing import Any

from app.core.errors import NotFound
from app.repositories.common import bool_int, decode_time, encode_time, new_id
from app.schemas import EventLocation, NavigationLink


class ConfigurationRepositoryMixin:
    db: sqlite3.Connection

    def create_navigation_link(self, link: NavigationLink, now: datetime) -> NavigationLink:
        return self._create_link("navigation_links", "nav", NavigationLink, link, now)

    def list_navigation_links(self, include_disabled: bool) -> list[NavigationLink]:
        return self._list_links("navigation_links", NavigationLink, include_disabled)

    def _create_link(
        self,
        table: str,
        id_prefix: str,
        model: type[NavigationLink],
        link: NavigationLink,
        now: datetime,
    ) -> NavigationLink:
        sort_order = link.sort_order
        if sort_order == 0:
            row = self.db.execute(
                f"SELECT COALESCE(MAX(sort_order), 0) max_order FROM {table}"
            ).fetchone()
            sort_order = row["max_order"] + 10
        saved = link.model_copy(
            update={
                "id": new_id(id_prefix),
                "enabled": True,
                "sort_order": sort_order,
                "created_at": now,
                "updated_at": now,
            }
        )
        self.db.execute(
            f"""
INSERT INTO {table} (id, title, description, url, enabled, sort_order, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""",
            (
                saved.id,
                saved.title,
                saved.description,
                saved.url,
                bool_int(saved.enabled),
                saved.sort_order,
                encode_time(saved.created_at),
                encode_time(saved.updated_at),
            ),
        )
        return saved

    def _list_links(
        self,
        table: str,
        model: type[NavigationLink],
        include_disabled: bool,
    ) -> list[NavigationLink]:
        query = f"SELECT id, title, description, url, enabled, sort_order, created_at, updated_at FROM {table}"
        params: tuple[Any, ...] = ()
        if not include_disabled:
            query += " WHERE enabled = ?"
            params = (1,)
        query += " ORDER BY sort_order ASC, created_at ASC"
        rows = self.db.execute(query, params).fetchall()
        return [
            model(
                id=row["id"],
                title=row["title"],
                description=row["description"],
                url=row["url"],
                enabled=bool(row["enabled"]),
                sortOrder=row["sort_order"],
                createdAt=decode_time(row["created_at"]),
                updatedAt=decode_time(row["updated_at"]),
            )
            for row in rows
        ]

    def get_site_config(self) -> dict[str, Any]:
        row = self.db.execute(
            """
SELECT id, event_name, timezone, countdown_title, countdown_end, countdown_enabled,
       countdown_stages, walkup_checkin_enabled, updated_at
FROM site_config LIMIT 1
"""
        ).fetchone()
        if not row:
            return {
                "id": "default",
                "eventName": "Hackathon",
                "timezone": "Asia/Shanghai",
                "countdownStages": [],
            }
        countdown_stages = decode_countdown_stages(row["countdown_stages"])
        if not countdown_stages and row["countdown_end"]:
            countdown_stages = [
                {
                    "id": "stage_legacy",
                    "label": row["countdown_title"] or "开赛",
                    "time": row["countdown_end"],
                }
            ]
        return {
            "id": row["id"],
            "eventName": row["event_name"] or "Hackathon",
            "timezone": row["timezone"] or "Asia/Shanghai",
            "countdownTitle": row["countdown_title"],
            "countdownEnd": row["countdown_end"],
            "countdownEnabled": bool(row["countdown_enabled"]),
            "countdownStages": countdown_stages,
            "walkupCheckinEnabled": bool(row["walkup_checkin_enabled"])
            if "walkup_checkin_enabled" in row.keys()
            else False,
            "updatedAt": row["updated_at"],
        }

    def update_site_config(self, config: dict[str, Any], now: datetime) -> dict[str, Any]:
        updated_at = encode_time(now)
        countdown_stages = config.get("countdown_stages", [])
        first_stage = countdown_stages[0] if countdown_stages else {}
        self.db.execute(
            """
INSERT INTO site_config (
  id, event_name, timezone, countdown_title, countdown_end,
  countdown_enabled, countdown_stages, walkup_checkin_enabled, updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  event_name = excluded.event_name,
  timezone = excluded.timezone,
  countdown_title = excluded.countdown_title,
  countdown_end = excluded.countdown_end,
  countdown_enabled = excluded.countdown_enabled,
  countdown_stages = excluded.countdown_stages,
  walkup_checkin_enabled = excluded.walkup_checkin_enabled,
  updated_at = excluded.updated_at
""",
            (
                "default",
                config.get("event_name", "Hackathon"),
                config.get("timezone", "Asia/Shanghai"),
                first_stage.get("label", config.get("countdown_title", "")),
                first_stage.get("time", config.get("countdown_end", "")),
                bool_int(config.get("countdown_enabled", False)),
                json.dumps(countdown_stages, ensure_ascii=False),
                bool_int(config.get("walkup_checkin_enabled", False)),
                updated_at,
            ),
        )
        return self.get_site_config()

    def get_event_location(self) -> EventLocation:
        row = self.db.execute(
            """
SELECT id, name, address, latitude, longitude, osm_type, osm_id, osm_url, updated_at
FROM event_location WHERE id = 'default' LIMIT 1
"""
        ).fetchone()
        if not row:
            return EventLocation()
        return EventLocation(
            id=row["id"],
            name=row["name"],
            address=row["address"],
            latitude=row["latitude"],
            longitude=row["longitude"],
            osmType=row["osm_type"],
            osmId=row["osm_id"],
            osmUrl=row["osm_url"],
            updatedAt=row["updated_at"],
        )

    def update_event_location(self, location: EventLocation, now: datetime) -> EventLocation:
        updated_at = encode_time(now)
        self.db.execute(
            """
INSERT INTO event_location (id, name, address, latitude, longitude, osm_type, osm_id, osm_url, updated_at)
VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  osm_type = excluded.osm_type,
  osm_id = excluded.osm_id,
  osm_url = excluded.osm_url,
  updated_at = excluded.updated_at
""",
            (
                location.name,
                location.address,
                location.latitude,
                location.longitude,
                location.osm_type,
                location.osm_id,
                location.osm_url,
                updated_at,
            ),
        )
        return self.get_event_location()


def decode_countdown_stages(value: str | None) -> list[dict[str, str]]:
    if not value:
        return []
    try:
        payload = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(payload, list):
        return []
    stages: list[dict[str, str]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        stages.append(
            {
                "id": str(item.get("id", "")),
                "label": str(item.get("label", "")),
                "time": str(item.get("time", "")),
            }
        )
    return stages
