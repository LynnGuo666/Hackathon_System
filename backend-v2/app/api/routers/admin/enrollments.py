from fastapi import APIRouter, Depends

from app.core.dependencies import repository, service
from app.core.security import actor_id, require_admin_token
from app.repositories.sqlite import SQLiteRepository
from app.schemas import Enrollment, EnrollmentReviewInput
from app.services.hackathon import HackathonService

router = APIRouter(dependencies=[Depends(require_admin_token)])


@router.get(
    "/enrollments",
    response_model=list[Enrollment],
    response_model_by_alias=True,
)
def list_enrollments(
    status: str = "all",
    repo: SQLiteRepository = Depends(repository),
) -> list[Enrollment]:
    return repo.list_enrollments(status)


@router.get(
    "/enrollments/{enrollment_id}",
    response_model=Enrollment,
    response_model_by_alias=True,
)
def get_enrollment(
    enrollment_id: str,
    repo: SQLiteRepository = Depends(repository),
) -> Enrollment:
    return repo.get_enrollment_by_id(enrollment_id)


@router.post(
    "/enrollments/{enrollment_id}/initial-review",
    response_model=Enrollment,
    response_model_by_alias=True,
)
def initial_review(
    enrollment_id: str,
    input: EnrollmentReviewInput,
    approve: bool = True,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> Enrollment:
    return svc.admin_initial_review(actor, enrollment_id, approve, input.note)


@router.post(
    "/enrollments/{enrollment_id}/final-review",
    response_model=Enrollment,
    response_model_by_alias=True,
)
def final_review(
    enrollment_id: str,
    input: EnrollmentReviewInput,
    approve: bool = True,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> Enrollment:
    return svc.admin_final_review(actor, enrollment_id, approve, input.note)
