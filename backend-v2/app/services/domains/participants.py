import secrets

from app.core.errors import Conflict, InvalidCheckinID, InvalidProfile, LoginRequired
from app.repositories.common import now_utc
from app.schemas import (
    CheckinIDRecord,
    Participant,
    ParticipantProfile,
    ParticipantStatus,
)
from app.services import mailer


class ParticipantServiceMixin:
    def bind_checkin(self, email: str, checkin_id: str) -> Participant:
        if not email:
            raise LoginRequired("login required")
        checkin_id = checkin_id.strip()
        if len(checkin_id) != 6 or not checkin_id.isdigit():
            raise InvalidCheckinID("invalid checkin id")
        now = now_utc()
        participant = self.repository.bind_participant_to_checkin_pool(email, checkin_id, now)
        self.repository.enqueue_email(
            participant.email,
            mailer.checkin_bound_subject(),
            mailer.checkin_bound_body(participant.checkin_id),
            now,
        )
        self.repository.record_audit(
            participant.checkin_id,
            "participant.bind_checkin",
            "participant",
            participant.checkin_id,
            "",
            now,
        )
        return participant

    def bind_checkin_with_profile(
        self, email: str, checkin_id: str, full_name: str
    ) -> Participant:
        site_config = self.repository.get_site_config()
        if not site_config.get("walkupCheckinEnabled"):
            raise LoginRequired("walkup checkin is disabled")
        full_name = full_name.strip()
        if not full_name:
            raise InvalidProfile("profile requires full name")
        email = email.strip().lower()
        if not email or "@" not in email:
            raise InvalidProfile("profile requires email")
        checkin_id = checkin_id.strip()
        if len(checkin_id) != 6 or not checkin_id.isdigit():
            raise InvalidCheckinID("invalid checkin id")
        now = now_utc()
        participant = self.repository.claim_checkin_as_walkup(email, checkin_id, full_name, now)
        self.repository.enqueue_email(
            participant.email,
            mailer.checkin_bound_subject(),
            mailer.checkin_bound_body(participant.checkin_id),
            now,
        )
        self.repository.record_audit(
            participant.email,
            "participant.walkup_checkin",
            "participant",
            participant.checkin_id,
            "",
            now,
        )
        return participant

    def me(self, email: str) -> Participant:
        if not email:
            raise LoginRequired("login required")
        if self.repository.participant_is_disabled(email):
            raise LoginRequired("account disabled")
        return self.repository.get_participant_by_email(email)

    def checked_in_participant(self, email: str) -> Participant:
        participant = self.me(email)
        if not participant.checkin_id or participant.status not in (
            ParticipantStatus.checked_in,
            ParticipantStatus.active,
        ):
            raise LoginRequired("checkin id required")
        return participant

    def save_profile(self, email: str, profile: ParticipantProfile) -> ParticipantProfile:
        participant = self.me(email)
        trimmed = profile.model_copy(
            update={
                "full_name": profile.full_name.strip(),
                "team_name": profile.team_name.strip(),
                "school": profile.school.strip(),
                "phone": profile.phone.strip(),
                "dietary_needs": profile.dietary_needs.strip(),
                "tshirt_size": profile.tshirt_size.strip(),
                "emergency_contact": profile.emergency_contact.strip(),
                "notes": profile.notes.strip(),
            }
        )
        if not trimmed.full_name:
            raise InvalidProfile("profile requires full name")
        now = now_utc()
        saved = self.repository.upsert_participant_profile(participant.email, trimmed, now)
        self.repository.record_audit(
            participant.checkin_id,
            "participant.profile_upsert",
            "participant_profile",
            participant.email,
            "",
            now,
        )
        return saved

    def profile(self, email: str) -> ParticipantProfile:
        participant = self.me(email)
        return self.repository.get_participant_profile(participant.email)

    def generate_checkin_ids(self, actor_id: str, count: int) -> list[CheckinIDRecord]:
        if count < 1 or count > 5000:
            raise InvalidCheckinID("checkin id count must be between 1 and 5000")
        existing_count = self.repository.count_checkin_ids()
        if existing_count + count > 1_000_000:
            raise Conflict("not enough checkin ids available")
        generated: set[str] = set()
        attempts = 0
        max_attempts = count * 20 + 1000
        while len(generated) < count and attempts < max_attempts:
            attempts += 1
            generated.add(f"{secrets.randbelow(1_000_000):06d}")
        now = now_utc()
        inserted = self.repository.add_checkin_ids(sorted(generated), now, limit=count)
        while len(inserted) < count and attempts < max_attempts * 2:
            attempts += 1
            needed = count - len(inserted)
            next_ids = {f"{secrets.randbelow(1_000_000):06d}" for _ in range(needed * 2)}
            inserted.extend(
                self.repository.add_checkin_ids(sorted(next_ids), now, limit=needed)
            )
        if len(inserted) < count:
            raise Conflict("not enough checkin ids available")
        saved = inserted[:count]
        self.repository.record_audit(
            actor_id, "checkin_ids.generate", "checkin_ids", "batch", f"count={len(saved)}", now
        )
        return saved

    def import_checkin_ids(self, actor_id: str, values: list[str]) -> list[CheckinIDRecord]:
        ids = [value.strip() for value in values if value.strip()]
        if not ids:
            raise InvalidCheckinID("checkin ids are required")
        for checkin_id in ids:
            if len(checkin_id) != 6 or not checkin_id.isdigit():
                raise InvalidCheckinID("invalid checkin id")
        now = now_utc()
        inserted = self.repository.add_checkin_ids(list(dict.fromkeys(ids)), now)
        self.repository.record_audit(
            actor_id, "checkin_ids.import", "checkin_ids", "batch", f"count={len(inserted)}", now
        )
        return inserted

    def set_participant_status(
        self, actor_id: str, email: str, status: ParticipantStatus
    ) -> Participant:
        now = now_utc()
        saved = self.repository.set_participant_status(email, status, now)
        self.repository.record_audit(
            actor_id, "participant.status", "participant", saved.email, status, now
        )
        return saved
