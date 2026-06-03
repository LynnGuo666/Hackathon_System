from app.core.errors import InvalidProfile
from app.repositories.common import now_utc
from app.schemas import AccommodationOption, AccommodationRequest


class AccommodationServiceMixin:
    def save_accommodation(
        self, email: str, request: AccommodationRequest
    ) -> AccommodationRequest:
        participant = self.checked_in_participant(email)
        if not request.selections:
            raise InvalidProfile("at least one accommodation option is required")
        valid_options = set(AccommodationOption)
        for selection in request.selections:
            if selection not in valid_options:
                raise InvalidProfile(f"invalid accommodation option: {selection}")
        has_other = AccommodationOption.other in request.selections
        saved_input = request.model_copy(
            update={"other_detail": request.other_detail.strip() if has_other else ""}
        )
        now = now_utc()
        saved = self.repository.upsert_accommodation(participant.email, saved_input, now)
        self.repository.record_audit(
            participant.checkin_id, "accommodation.upsert", "accommodation", participant.email, "", now
        )
        return saved

    def get_accommodation(self, email: str) -> AccommodationRequest:
        participant = self.checked_in_participant(email)
        return self.repository.get_accommodation(participant.email)
