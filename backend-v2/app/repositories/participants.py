import sqlite3
from datetime import datetime

from app.core.errors import NotFound
from app.core.security import normalize_email
from app.repositories.common import decode_time, encode_time
from app.schemas import Participant, ParticipantAccount, ParticipantStatus


class ParticipantRepositoryMixin:
    db: sqlite3.Connection

    def list_participant_accounts(self) -> list[ParticipantAccount]:
        rows = self.db.execute(
            """
SELECT p.email, COALESCE(p.checkin_id, '') checkin_id, p.status, p.created_at, p.updated_at,
       COALESCE(profile.full_name, '') full_name,
       COALESCE(profile.team_name, '') team_name,
       COALESCE(profile.school, '') school,
       COALESCE(profile.phone, '') phone,
       COALESCE(profile.updated_at, '') profile_updated_at
FROM participants p
LEFT JOIN participant_profiles profile ON profile.email = p.email
ORDER BY p.updated_at DESC, p.created_at DESC
"""
        ).fetchall()
        return [
            ParticipantAccount(
                email=row["email"],
                checkinId=row["checkin_id"],
                status=row["status"],
                fullName=row["full_name"],
                teamName=row["team_name"],
                school=row["school"],
                phone=row["phone"],
                profileUpdatedAt=decode_time(row["profile_updated_at"]),
                createdAt=decode_time(row["created_at"]),
                updatedAt=decode_time(row["updated_at"]),
            )
            for row in rows
        ]

    def set_participant_status(
        self, email: str, status: ParticipantStatus, now: datetime
    ) -> Participant:
        result = self.db.execute(
            """
UPDATE participants
SET status = ?, updated_at = ?
WHERE email = ?
""",
            (status, encode_time(now), normalize_email(email)),
        )
        if result.rowcount == 0:
            raise NotFound("participant not found")
        return self.get_participant_by_email(email)

    def participant_is_disabled(self, email: str) -> bool:
        row = self.db.execute(
            "SELECT status FROM participants WHERE email = ?",
            (normalize_email(email),),
        ).fetchone()
        return bool(row and row["status"] == ParticipantStatus.disabled)
