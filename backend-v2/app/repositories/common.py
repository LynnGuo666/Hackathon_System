import secrets
from datetime import UTC, datetime

from app.schemas import SlotStatus


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(8)}"


def now_utc() -> datetime:
    return datetime.now(UTC)


def encode_time(value: datetime | None) -> str:
    if not value:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def decode_time(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def slot_status(
    open_at: datetime | None, close_at: datetime | None, enabled: bool, now: datetime
) -> SlotStatus:
    if not enabled:
        return SlotStatus.disabled
    if open_at and now < open_at:
        return SlotStatus.upcoming
    if close_at and now > close_at:
        return SlotStatus.closed
    return SlotStatus.open


def bool_int(value: bool) -> int:
    return 1 if value else 0
