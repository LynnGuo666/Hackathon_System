from datetime import datetime
import sqlite3

from app.core.errors import Conflict, NotFound
from app.core.security import normalize_email
from app.repositories.common import decode_time, encode_time, new_id
from app.schemas import Enrollment, EnrollmentReviewStatus


class EnrollmentRepositoryMixin:
    db: sqlite3.Connection

    def create_enrollment(self, email: str, data: dict, now: datetime) -> Enrollment:
        email = normalize_email(email)
        existing = self.db.execute(
            "SELECT id FROM enrollments WHERE email = ?", (email,)
        ).fetchone()
        if existing:
            raise Conflict("enrollment already exists for this email")

        enrollment = Enrollment(
            id=new_id("enr"),
            fullName=data.get("full_name", ""),
            email=email,
            phone=data.get("phone", ""),
            school=data.get("school", ""),
            teamName=data.get("team_name", ""),
            personalBio=data.get("personal_bio", ""),
            projectDesc=data.get("project_desc", ""),
            participationHistory=data.get("participation_history", ""),
            githubUrl=data.get("github_url", ""),
            portfolioUrl=data.get("portfolio_url", ""),
            resumeFilename=data.get("resume_filename", ""),
            reviewStatus=EnrollmentReviewStatus.pending,
            createdAt=now,
            updatedAt=now,
        )
        try:
            self.db.execute(
                """INSERT INTO enrollments
                (id, full_name, email, phone, school, team_name, personal_bio,
                 project_desc, participation_history, github_url, portfolio_url,
                 resume_filename, review_status, initial_reviewer, initial_review_at,
                 initial_review_note, final_reviewer, final_review_at, final_review_note,
                 created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    enrollment.id,
                    enrollment.full_name,
                    enrollment.email,
                    enrollment.phone,
                    enrollment.school,
                    enrollment.team_name,
                    enrollment.personal_bio,
                    enrollment.project_desc,
                    enrollment.participation_history,
                    enrollment.github_url,
                    enrollment.portfolio_url,
                    enrollment.resume_filename,
                    enrollment.review_status,
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    encode_time(enrollment.created_at),
                    encode_time(enrollment.updated_at),
                ),
            )
        except sqlite3.IntegrityError as exc:
            raise self._enrollment_constraint_error(exc) from exc
        return enrollment

    def get_enrollment_by_email(self, email: str) -> Enrollment:
        row = self.db.execute(
            "SELECT * FROM enrollments WHERE email = ?", (normalize_email(email),)
        ).fetchone()
        if not row:
            raise NotFound("enrollment not found")
        return self._enrollment_from_row(row)

    def get_enrollment_by_id(self, enrollment_id: str) -> Enrollment:
        row = self.db.execute(
            "SELECT * FROM enrollments WHERE id = ?", (enrollment_id,)
        ).fetchone()
        if not row:
            raise NotFound("enrollment not found")
        return self._enrollment_from_row(row)

    def list_enrollments(self, status: str | None = None) -> list[Enrollment]:
        if status and status != "all":
            rows = self.db.execute(
                "SELECT * FROM enrollments WHERE review_status = ? ORDER BY created_at DESC",
                (status,),
            ).fetchall()
        else:
            rows = self.db.execute(
                "SELECT * FROM enrollments ORDER BY created_at DESC"
            ).fetchall()
        return [self._enrollment_from_row(row) for row in rows]

    def update_enrollment_review(
        self,
        enrollment_id: str,
        review_status: EnrollmentReviewStatus,
        reviewer: str,
        note: str,
        now: datetime,
    ) -> Enrollment:
        if review_status == EnrollmentReviewStatus.initial_review:
            result = self.db.execute(
                """UPDATE enrollments
                SET review_status = ?, initial_reviewer = ?, initial_review_at = ?,
                    initial_review_note = ?, updated_at = ?
                WHERE id = ?""",
                (review_status.value, reviewer, encode_time(now), note, encode_time(now), enrollment_id),
            )
        elif review_status in (
            EnrollmentReviewStatus.final_review,
            EnrollmentReviewStatus.approved,
            EnrollmentReviewStatus.rejected,
        ):
            result = self.db.execute(
                """UPDATE enrollments
                SET review_status = ?, final_reviewer = ?, final_review_at = ?,
                    final_review_note = ?, updated_at = ?
                WHERE id = ?""",
                (review_status.value, reviewer, encode_time(now), note, encode_time(now), enrollment_id),
            )
        else:
            result = self.db.execute(
                "UPDATE enrollments SET review_status = ?, updated_at = ? WHERE id = ?",
                (review_status.value, encode_time(now), enrollment_id),
            )
        if result.rowcount == 0:
            raise NotFound("enrollment not found")
        return self.get_enrollment_by_id(enrollment_id)

    def _enrollment_from_row(self, row: sqlite3.Row) -> Enrollment:
        return Enrollment(
            id=row["id"],
            fullName=row["full_name"],
            email=row["email"],
            phone=row["phone"],
            school=row["school"],
            teamName=row["team_name"],
            personalBio=row["personal_bio"],
            projectDesc=row["project_desc"],
            participationHistory=row["participation_history"],
            githubUrl=row["github_url"],
            portfolioUrl=row["portfolio_url"],
            resumeFilename=row["resume_filename"],
            reviewStatus=row["review_status"],
            initialReviewer=row["initial_reviewer"],
            initialReviewAt=decode_time(row["initial_review_at"]),
            initialReviewNote=row["initial_review_note"],
            finalReviewer=row["final_reviewer"],
            finalReviewAt=decode_time(row["final_review_at"]),
            finalReviewNote=row["final_review_note"],
            createdAt=decode_time(row["created_at"]),
            updatedAt=decode_time(row["updated_at"]),
        )

    def _enrollment_constraint_error(self, error: sqlite3.IntegrityError) -> Conflict:
        message = str(error).lower()
        if "enrollments.email" in message:
            return Conflict("email already has an enrollment")
        return Conflict(f"enrollment constraint: {error}")
