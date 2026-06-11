from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas.base import APIModel


class EnrollmentReviewStatus(StrEnum):
    pending = "pending"
    initial_review = "initial_review"
    final_review = "final_review"
    approved = "approved"
    rejected = "rejected"


class Enrollment(APIModel):
    id: str
    full_name: str = Field(default="", alias="fullName")
    email: str
    phone: str = ""
    school: str = ""
    team_name: str = Field(default="", alias="teamName")
    personal_bio: str = Field(default="", alias="personalBio")
    project_desc: str = Field(default="", alias="projectDesc")
    participation_history: str = Field(default="", alias="participationHistory")
    github_url: str = Field(default="", alias="githubUrl")
    portfolio_url: str = Field(default="", alias="portfolioUrl")
    resume_filename: str = Field(default="", alias="resumeFilename")
    review_status: EnrollmentReviewStatus = Field(
        default=EnrollmentReviewStatus.pending, alias="reviewStatus"
    )
    initial_reviewer: str = Field(default="", alias="initialReviewer")
    initial_review_at: datetime | None = Field(default=None, alias="initialReviewAt")
    initial_review_note: str = Field(default="", alias="initialReviewNote")
    final_reviewer: str = Field(default="", alias="finalReviewer")
    final_review_at: datetime | None = Field(default=None, alias="finalReviewAt")
    final_review_note: str = Field(default="", alias="finalReviewNote")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class EnrollmentInput(APIModel):
    full_name: str = Field(alias="fullName")
    email: str = ""
    phone: str = ""
    school: str = ""
    team_name: str = Field(default="", alias="teamName")
    personal_bio: str = Field(default="", alias="personalBio")
    project_desc: str = Field(default="", alias="projectDesc")
    participation_history: str = Field(default="", alias="participationHistory")
    github_url: str = Field(default="", alias="githubUrl")
    portfolio_url: str = Field(default="", alias="portfolioUrl")


class EnrollmentReviewInput(APIModel):
    note: str = ""
