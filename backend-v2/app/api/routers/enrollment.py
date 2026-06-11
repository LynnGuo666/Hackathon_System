from fastapi import APIRouter, Depends

from app.core.dependencies import service
from app.core.security import participant_email
from app.schemas import Enrollment, EnrollmentInput
from app.services.hackathon import HackathonService

router = APIRouter(prefix="/api")


@router.get(
    "/enrollment",
    response_model=Enrollment,
    response_model_by_alias=True,
)
def get_enrollment(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> Enrollment:
    return svc.get_my_enrollment(email)


@router.post(
    "/enrollment",
    response_model=Enrollment,
    response_model_by_alias=True,
    status_code=201,
)
def submit_enrollment(
    input: EnrollmentInput,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> Enrollment:
    return svc.submit_enrollment(email, input)
