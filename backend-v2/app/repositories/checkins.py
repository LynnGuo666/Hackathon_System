import sqlite3
from datetime import datetime

from app.core.errors import Conflict, NotFound
from app.core.security import normalize_email
from app.repositories.common import decode_time, encode_time, new_id
from app.schemas import CheckinIDRecord, CheckinIDStatus, Participant, ParticipantStatus


class CheckinRepositoryMixin:
    db: sqlite3.Connection

    def add_checkin_ids(
        self, ids: list[str], now: datetime, limit: int | None = None
    ) -> list[CheckinIDRecord]:
        inserted: list[CheckinIDRecord] = []
        with self.tx() as tx:
            for checkin_id in ids:
                if limit is not None and len(inserted) >= limit:
                    break
                exists = tx.execute(
                    "SELECT id FROM checkin_ids WHERE id = ?", (checkin_id,)
                ).fetchone()
                if exists:
                    continue
                tx.execute(
                    """
INSERT INTO checkin_ids (id, status, assigned_email, bound_at, created_at)
VALUES (?, ?, NULL, NULL, ?)
""",
                    (checkin_id, CheckinIDStatus.available, encode_time(now)),
                )
                inserted.append(
                    CheckinIDRecord(
                        id=checkin_id,
                        status=CheckinIDStatus.available,
                        createdAt=now,
                    )
                )
        return inserted

    def list_checkin_ids(self) -> list[CheckinIDRecord]:
        rows = self.db.execute(
            """
SELECT id, status, COALESCE(assigned_email, '') assigned_email,
       COALESCE(bound_at, '') bound_at, created_at
FROM checkin_ids
ORDER BY status ASC, id ASC
"""
        ).fetchall()
        return [self._checkin_id_from_row(row) for row in rows]

    def count_checkin_ids(self) -> int:
        return self.db.execute("SELECT COUNT(1) count FROM checkin_ids").fetchone()["count"]

    def bind_participant_to_checkin_pool(
        self, email: str, checkin_id: str, now: datetime
    ) -> Participant:
        email = normalize_email(email)
        with self.tx() as tx:
            checkin = tx.execute(
                """
SELECT id, status, COALESCE(assigned_email, '') assigned_email
FROM checkin_ids
WHERE id = ?
""",
                (checkin_id,),
            ).fetchone()
            if not checkin:
                raise NotFound("checkin id not found")
            if checkin["status"] == CheckinIDStatus.bound and checkin["assigned_email"] != email:
                raise Conflict("checkin id is already bound")

            participant_row = tx.execute(
                """
SELECT id, COALESCE(checkin_id, '') checkin_id, email, email_verified_at,
       checked_in_at, status, created_at, updated_at
FROM participants
WHERE email = ?
""",
                (email,),
            ).fetchone()
            if participant_row:
                existing = self._participant_from_row(participant_row)
                if existing.status == ParticipantStatus.disabled:
                    raise Conflict("participant is disabled")
                if existing.checkin_id == checkin_id:
                    return existing
                if existing.checkin_id:
                    raise Conflict("email is already bound")
                participant_id = existing.id
                created_at = existing.created_at
            else:
                participant_id = new_id("par")
                created_at = now
                tx.execute(
                    """
INSERT INTO participants (id, checkin_id, email, email_verified_at, checked_in_at, status, created_at, updated_at)
VALUES (?, NULL, ?, ?, '', ?, ?, ?)
""",
                    (
                        participant_id,
                        email,
                        encode_time(now),
                        ParticipantStatus.pending,
                        encode_time(now),
                        encode_time(now),
                    ),
                )

            tx.execute(
                """
UPDATE participants
SET checkin_id = ?, checked_in_at = ?, status = ?, updated_at = ?
WHERE email = ?
""",
                (checkin_id, encode_time(now), ParticipantStatus.active, encode_time(now), email),
            )
            tx.execute(
                """
UPDATE checkin_ids
SET status = ?, assigned_email = ?, bound_at = ?
WHERE id = ?
""",
                (CheckinIDStatus.bound, email, encode_time(now), checkin_id),
            )
            return Participant(
                id=participant_id,
                checkinId=checkin_id,
                email=email,
                emailVerifiedAt=now,
                checkedInAt=now,
                status=ParticipantStatus.active,
                createdAt=created_at,
                updatedAt=now,
            )

    def _checkin_id_from_row(self, row: sqlite3.Row) -> CheckinIDRecord:
        return CheckinIDRecord(
            id=row["id"],
            status=row["status"],
            assignedEmail=row["assigned_email"],
            boundAt=decode_time(row["bound_at"]),
            createdAt=decode_time(row["created_at"]),
        )
