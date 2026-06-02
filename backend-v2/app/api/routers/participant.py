from fastapi import APIRouter, Depends

from app.core.dependencies import service
from app.core.security import participant_email
from app.schemas import (
    AccommodationRequest,
    Participant,
    ParticipantProfile,
    ResourceAssignment,
)
from app.services.hackathon import HackathonService

router = APIRouter(prefix="/api")


@router.get("/me", response_model=Participant, response_model_by_alias=True)
def me(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> Participant:
    return svc.me(email)


@router.get("/profile", response_model=ParticipantProfile, response_model_by_alias=True)
def get_profile(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> ParticipantProfile:
    return svc.profile(email)


@router.put("/profile", response_model=ParticipantProfile, response_model_by_alias=True)
def put_profile(
    input: ParticipantProfile,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> ParticipantProfile:
    return svc.save_profile(email, input)


@router.get("/accommodation", response_model=AccommodationRequest, response_model_by_alias=True)
def get_accommodation(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> AccommodationRequest:
    return svc.get_accommodation(email)


@router.put("/accommodation", response_model=AccommodationRequest, response_model_by_alias=True)
def put_accommodation(
    input: AccommodationRequest,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> AccommodationRequest:
    return svc.save_accommodation(email, input)


@router.get("/resources", response_model=list[ResourceAssignment], response_model_by_alias=True)
def resources(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> list[ResourceAssignment]:
    participant = svc.me(email)
    return svc.my_resources(participant.checkin_id)


@router.post(
    "/resources/{pool_id}/claim",
    status_code=201,
    response_model=ResourceAssignment,
    response_model_by_alias=True,
)
def claim_resource(
    pool_id: str,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> ResourceAssignment:
    participant = svc.me(email)
    return svc.claim_resource(participant.checkin_id, pool_id, participant.checkin_id)


@router.post("/resources/{assignment_id}/resend-email", status_code=202)
def resend_email(assignment_id: str) -> dict[str, str]:
    return {
        "status": "queued",
        "note": "resource email resend is tracked through email outbox retry",
    }
