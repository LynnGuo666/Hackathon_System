from datetime import datetime
import sqlite3

from app.core.errors import Conflict, NotFound
from app.core.security import normalize_email
from app.repositories.common import decode_time, encode_time, new_id
from app.schemas import Participant, ParticipantAccount, ParticipantProfile, ParticipantStatus


class ParticipantRepositoryMixin:
    db: sqlite3.Connection

    def bind_participant(self, email: str, checkin_id: str, now: datetime) -> Participant:
        email = normalize_email(email)
        checkin_id = checkin_id.strip()
        with self.tx() as tx:
            row = tx.execute(
                """
SELECT id, COALESCE(checkin_id, '') checkin_id, email, email_verified_at,
       checked_in_at, status, created_at, updated_at
FROM participants WHERE checkin_id = ? OR email = ? LIMIT 1
""",
                (checkin_id, email),
            ).fetchone()
            if row:
                existing = self._participant_from_row(row)
                if existing.checkin_id == checkin_id and existing.email == email:
                    return existing
                if existing.checkin_id == checkin_id:
                    raise Conflict("checkin id is already bound")
                if existing.email == email and existing.checkin_id:
                    raise Conflict("email is already bound")
                tx.execute(
                    """
UPDATE participants
SET checkin_id = ?, checked_in_at = ?, status = ?, updated_at = ?
WHERE email = ?
""",
                    (
                        checkin_id,
                        encode_time(now),
                        ParticipantStatus.active,
                        encode_time(now),
                        email,
                    ),
                )
                existing.checkin_id = checkin_id
                existing.checked_in_at = now
                existing.status = ParticipantStatus.active
                existing.updated_at = now
                return existing

            participant = Participant(
                id=new_id("par"),
                checkinId=checkin_id,
                email=email,
                emailVerifiedAt=now,
                checkedInAt=now,
                status=ParticipantStatus.active,
                createdAt=now,
                updatedAt=now,
            )
            try:
                tx.execute(
                    """
INSERT INTO participants (id, checkin_id, email, email_verified_at, checked_in_at, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""",
                    (
                        participant.id,
                        participant.checkin_id,
                        participant.email,
                        encode_time(participant.email_verified_at),
                        encode_time(participant.checked_in_at),
                        participant.status,
                        encode_time(participant.created_at),
                        encode_time(participant.updated_at),
                    ),
                )
            except sqlite3.IntegrityError as exc:
                raise self._constraint_error(exc) from exc
            return participant

    def upsert_pre_event_participant(self, email: str, now: datetime) -> Participant:
        email = normalize_email(email)
        try:
            return self.get_participant_by_email(email)
        except NotFound:
            pass
        participant = Participant(
            id=new_id("par"),
            email=email,
            emailVerifiedAt=now,
            status=ParticipantStatus.pending,
            createdAt=now,
            updatedAt=now,
        )
        try:
            self.db.execute(
                """
INSERT INTO participants (id, checkin_id, email, email_verified_at, checked_in_at, status, created_at, updated_at)
VALUES (?, NULL, ?, ?, '', ?, ?, ?)
""",
                (
                    participant.id,
                    participant.email,
                    encode_time(participant.email_verified_at),
                    participant.status,
                    encode_time(participant.created_at),
                    encode_time(participant.updated_at),
                ),
            )
        except sqlite3.IntegrityError as exc:
            raise self._constraint_error(exc) from exc
        return participant

    def ensure_participant_for_enrollment(
        self, email: str, full_name: str, status: ParticipantStatus, now: datetime
    ) -> Participant:
        email = normalize_email(email)
        try:
            participant = self.get_participant_by_email(email)
        except NotFound:
            participant = Participant(
                id=new_id("par"),
                email=email,
                emailVerifiedAt=now,
                status=status,
                createdAt=now,
                updatedAt=now,
            )
            try:
                self.db.execute(
                    """
INSERT INTO participants (id, checkin_id, email, email_verified_at, checked_in_at, status, created_at, updated_at)
VALUES (?, NULL, ?, ?, '', ?, ?, ?)
""",
                    (
                        participant.id,
                        participant.email,
                        encode_time(participant.email_verified_at),
                        participant.status,
                        encode_time(participant.created_at),
                        encode_time(participant.updated_at),
                    ),
                )
            except sqlite3.IntegrityError as exc:
                raise self._constraint_error(exc) from exc
        else:
            if participant.status != ParticipantStatus.disabled:
                next_status = status
                if participant.status == ParticipantStatus.checked_in or participant.checkin_id:
                    next_status = ParticipantStatus.checked_in
                elif participant.status == ParticipantStatus.active:
                    next_status = ParticipantStatus.checked_in
                self.db.execute(
                    """
UPDATE participants
SET status = ?, updated_at = ?
WHERE email = ?
""",
                    (next_status, encode_time(now), email),
                )
                participant.status = next_status
                participant.updated_at = now

        if full_name.strip():
            profile = self.db.execute(
                "SELECT email FROM participant_profiles WHERE email = ?", (email,)
            ).fetchone()
            if not profile:
                self.db.execute(
                    """
INSERT INTO participant_profiles (
  email, full_name, team_name, school, phone, dietary_needs, tshirt_size,
  emergency_contact, notes, submitted_at, updated_at
) VALUES (?, ?, '', '', '', '', '', '', '', ?, ?)
""",
                    (email, full_name.strip(), encode_time(now), encode_time(now)),
                )
        return self.get_participant_by_email(email)

    def get_participant_by_email(self, email: str) -> Participant:
        row = self.db.execute(
            """
SELECT id, COALESCE(checkin_id, '') checkin_id, email, email_verified_at,
       checked_in_at, status, created_at, updated_at
FROM participants WHERE email = ?
""",
            (normalize_email(email),),
        ).fetchone()
        if not row:
            raise NotFound("not found")
        return self._participant_from_row(row)

    def get_participant_by_checkin_id(self, checkin_id: str) -> Participant:
        row = self.db.execute(
            """
SELECT id, COALESCE(checkin_id, '') checkin_id, email, email_verified_at,
       checked_in_at, status, created_at, updated_at
FROM participants WHERE checkin_id = ?
""",
            (checkin_id.strip(),),
        ).fetchone()
        if not row:
            raise NotFound("not found")
        return self._participant_from_row(row)

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

    def upsert_participant_profile(
        self, email: str, profile: ParticipantProfile, now: datetime
    ) -> ParticipantProfile:
        email = normalize_email(email)
        row = self.db.execute(
            "SELECT submitted_at FROM participant_profiles WHERE email = ?", (email,)
        ).fetchone()
        submitted_at = decode_time(row["submitted_at"]) if row else now
        saved = profile.model_copy(
            update={"email": email, "submitted_at": submitted_at, "updated_at": now}
        )
        self.db.execute(
            """
INSERT INTO participant_profiles (
  email, full_name, team_name, school, phone, dietary_needs, tshirt_size,
  emergency_contact, notes, submitted_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(email) DO UPDATE SET
  full_name = excluded.full_name,
  team_name = excluded.team_name,
  school = excluded.school,
  phone = excluded.phone,
  dietary_needs = excluded.dietary_needs,
  tshirt_size = excluded.tshirt_size,
  emergency_contact = excluded.emergency_contact,
  notes = excluded.notes,
  updated_at = excluded.updated_at
""",
            (
                saved.email,
                saved.full_name,
                saved.team_name,
                saved.school,
                saved.phone,
                saved.dietary_needs,
                saved.tshirt_size,
                saved.emergency_contact,
                saved.notes,
                encode_time(saved.submitted_at),
                encode_time(saved.updated_at),
            ),
        )
        return saved

    def get_participant_profile(self, email: str) -> ParticipantProfile:
        row = self.db.execute(
            """
SELECT email, full_name, team_name, school, phone, dietary_needs, tshirt_size,
       emergency_contact, notes, submitted_at, updated_at
FROM participant_profiles WHERE email = ?
""",
            (normalize_email(email),),
        ).fetchone()
        if not row:
            raise NotFound("not found")
        return self._profile_from_row(row)

    def list_participant_profiles(self) -> list[ParticipantProfile]:
        rows = self.db.execute(
            """
SELECT email, full_name, team_name, school, phone, dietary_needs, tshirt_size,
       emergency_contact, notes, submitted_at, updated_at
FROM participant_profiles ORDER BY updated_at DESC
"""
        ).fetchall()
        return [self._profile_from_row(row) for row in rows]

    def _participant_from_row(self, row: sqlite3.Row) -> Participant:
        return Participant(
            id=row["id"],
            checkinId=row["checkin_id"],
            email=row["email"],
            emailVerifiedAt=decode_time(row["email_verified_at"]),
            checkedInAt=decode_time(row["checked_in_at"]),
            status=row["status"],
            createdAt=decode_time(row["created_at"]),
            updatedAt=decode_time(row["updated_at"]),
        )

    def _profile_from_row(self, row: sqlite3.Row) -> ParticipantProfile:
        return ParticipantProfile(
            email=row["email"],
            fullName=row["full_name"],
            teamName=row["team_name"],
            school=row["school"],
            phone=row["phone"],
            dietaryNeeds=row["dietary_needs"],
            tshirtSize=row["tshirt_size"],
            emergencyContact=row["emergency_contact"],
            notes=row["notes"],
            submittedAt=decode_time(row["submitted_at"]),
            updatedAt=decode_time(row["updated_at"]),
        )
