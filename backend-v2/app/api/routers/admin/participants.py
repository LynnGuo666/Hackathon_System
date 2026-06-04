from fastapi import APIRouter, Depends

from app.core.dependencies import repository, service
from app.core.security import actor_id, require_admin_token
from app.repositories.sqlite import SQLiteRepository
from app.schemas import AccommodationRequest, Participant, ParticipantAccount, ParticipantProfile, ParticipantStatusInput
from app.services.hackathon import HackathonService

router = APIRouter(dependencies=[Depends(require_admin_token)])


@router.get("/profiles", response_model=list[ParticipantProfile], response_model_by_alias=True)
def profiles(repo: SQLiteRepository = Depends(repository)) -> list[ParticipantProfile]:
    return repo.list_participant_profiles()


@router.get(
    "/accommodation-requests",
    response_model=list[AccommodationRequest],
    response_model_by_alias=True,
)
def accommodation_requests(repo: SQLiteRepository = Depends(repository)) -> list[AccommodationRequest]:
    return repo.list_accommodation_requests()


@router.get("/participants", response_model=list[ParticipantAccount], response_model_by_alias=True)
def participants(repo: SQLiteRepository = Depends(repository)) -> list[ParticipantAccount]:
    return repo.list_participant_accounts()


@router.patch(
    "/participants/status",
    response_model=Participant,
    response_model_by_alias=True,
)
def update_participant_status_by_body(
    input: ParticipantStatusInput,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> Participant:
    return svc.set_participant_status(actor, input.email, input.status)


@router.patch(
    "/participants/{email:path}/status",
    response_model=Participant,
    response_model_by_alias=True,
)
def update_participant_status(
    email: str,
    input: ParticipantStatusInput,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> Participant:
    return svc.set_participant_status(actor, email, input.status)
