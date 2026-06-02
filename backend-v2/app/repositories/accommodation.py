import json
from datetime import datetime
import sqlite3

from app.core.errors import NotFound
from app.core.security import normalize_email
from app.repositories.common import decode_time, encode_time
from app.schemas import AccommodationRequest


class AccommodationRepositoryMixin:
    db: sqlite3.Connection

    def upsert_accommodation(
        self, email: str, request: AccommodationRequest, now: datetime
    ) -> AccommodationRequest:
        email = normalize_email(email)
        row = self.db.execute(
            "SELECT created_at FROM accommodation_requests WHERE email = ?", (email,)
        ).fetchone()
        created_at = decode_time(row["created_at"]) if row else now
        saved = request.model_copy(
            update={"email": email, "created_at": created_at, "updated_at": now}
        )
        self.db.execute(
            """
INSERT INTO accommodation_requests (email, selections, other_detail, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(email) DO UPDATE SET
  selections = excluded.selections,
  other_detail = excluded.other_detail,
  updated_at = excluded.updated_at
""",
            (
                email,
                json.dumps([selection.value for selection in saved.selections]),
                saved.other_detail,
                encode_time(saved.created_at),
                encode_time(saved.updated_at),
            ),
        )
        return saved

    def get_accommodation(self, email: str) -> AccommodationRequest:
        row = self.db.execute(
            """
SELECT email, selections, other_detail, created_at, updated_at
FROM accommodation_requests WHERE email = ?
""",
            (normalize_email(email),),
        ).fetchone()
        if not row:
            raise NotFound("not found")
        return AccommodationRequest(
            email=row["email"],
            selections=json.loads(row["selections"]),
            otherDetail=row["other_detail"],
            createdAt=decode_time(row["created_at"]),
            updatedAt=decode_time(row["updated_at"]),
        )
