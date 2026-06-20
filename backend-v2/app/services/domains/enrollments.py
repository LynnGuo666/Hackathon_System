from app.core.errors import InvalidProfile, LoginRequired
from app.core.security import normalize_email
from app.repositories.common import now_utc
from app.schemas import (
    Enrollment,
    EnrollmentInput,
    EnrollmentReviewInput,
    EnrollmentReviewStatus,
    ParticipantStatus,
    ParticipantTag,
)


class EnrollmentServiceMixin:
    def submit_enrollment(self, email: str, input: EnrollmentInput) -> Enrollment:
        if not email:
            raise LoginRequired("login required")
        trimmed = input.model_copy(
            update={
                "full_name": input.full_name.strip(),
                "email": normalize_email(input.email) if input.email else email,
                "phone": input.phone.strip(),
                "school": input.school.strip(),
                "team_name": input.team_name.strip(),
                "personal_bio": input.personal_bio.strip(),
                "project_desc": input.project_desc.strip(),
                "participation_history": input.participation_history.strip(),
                "github_url": input.github_url.strip(),
                "portfolio_url": input.portfolio_url.strip(),
            }
        )
        if not trimmed.full_name:
            raise InvalidProfile("full name is required")
        if not trimmed.email:
            trimmed = trimmed.model_copy(update={"email": email})
        now = now_utc()
        data = {
            "full_name": trimmed.full_name,
            "email": trimmed.email,
            "phone": trimmed.phone,
            "school": trimmed.school,
            "team_name": trimmed.team_name,
            "personal_bio": trimmed.personal_bio,
            "project_desc": trimmed.project_desc,
            "participation_history": trimmed.participation_history,
            "github_url": trimmed.github_url,
            "portfolio_url": trimmed.portfolio_url,
            "resume_filename": "",
        }
        enrollment = self.repository.create_enrollment(email, data, now)
        self.repository.ensure_participant_for_enrollment(
            email, trimmed.full_name, ParticipantStatus.enrolled, now
        )
        self.repository.record_audit(
            email, "enrollment.submit", "enrollment", enrollment.id, "", now
        )
        self.emit_plugin_event(
            "enrollment.submitted",
            "enrollment",
            enrollment.id,
            enrollment.model_dump(mode="json", by_alias=True),
            now,
        )
        return enrollment

    def get_my_enrollment(self, email: str) -> Enrollment:
        if not email:
            raise LoginRequired("login required")
        return self.repository.get_enrollment_by_email(email)

    def admin_initial_review(
        self, actor_id: str, enrollment_id: str, approve: bool, note: str = ""
    ) -> Enrollment:
        now = now_utc()
        target_status = (
            EnrollmentReviewStatus.initial_review if approve else EnrollmentReviewStatus.rejected
        )
        enrollment = self.repository.update_enrollment_review(
            enrollment_id, target_status, actor_id, note, now
        )
        if not approve:
            self.repository.set_participant_status(
                enrollment.email, ParticipantStatus.rejected, now
            )
        self.repository.record_audit(
            actor_id,
            "enrollment.initial_review",
            "enrollment",
            enrollment_id,
            f"status={target_status.value}",
            now,
        )
        self.emit_plugin_event(
            "enrollment.initial_reviewed",
            "enrollment",
            enrollment.id,
            enrollment.model_dump(mode="json", by_alias=True),
            now,
        )
        return enrollment

    def admin_final_review(
        self, actor_id: str, enrollment_id: str, approve: bool, note: str = ""
    ) -> Enrollment:
        now = now_utc()
        target_status = (
            EnrollmentReviewStatus.approved if approve else EnrollmentReviewStatus.rejected
        )
        enrollment = self.repository.update_enrollment_review(
            enrollment_id, target_status, actor_id, note, now
        )
        self.repository.set_participant_status(
            enrollment.email,
            ParticipantStatus.accepted if approve else ParticipantStatus.rejected,
            now,
        )
        if approve:
            # 报名终审通过 → 自动打「已通过审核」tag，作为资源池白名单准入依据。
            self.repository.add_participant_tag(
                enrollment.email, ParticipantTag.approved, now
            )
        self.repository.record_audit(
            actor_id,
            "enrollment.final_review",
            "enrollment",
            enrollment_id,
            f"status={target_status.value}",
            now,
        )
        self.emit_plugin_event(
            "enrollment.final_reviewed",
            "enrollment",
            enrollment.id,
            enrollment.model_dump(mode="json", by_alias=True),
            now,
        )
        return enrollment
