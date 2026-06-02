from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Response

from app.core.security import participant_email
from app.schemas import BindCheckinInput, CheckinLoginInput, Participant, SendCodeInput, VerifyCodeInput
from app.services.hackathon import HackathonService
from app.core.dependencies import service

router = APIRouter(prefix="/api/auth")


def set_participant_cookie(response: Response, email: str) -> None:
    response.set_cookie(
        key="participant_email",
        value=email.strip().lower(),
        path="/",
        httponly=True,
        samesite="lax",
        expires=datetime.now(UTC) + timedelta(hours=24),
    )


@router.post("/send-code", status_code=202)
def send_code(input: SendCodeInput, svc: HackathonService = Depends(service)) -> dict[str, str]:
    svc.send_code(input.email)
    return {"status": "queued"}


@router.post("/verify-code")
def verify_code(
    input: VerifyCodeInput,
    response: Response,
    svc: HackathonService = Depends(service),
) -> dict[str, str]:
    svc.verify_code(input.email, input.code)
    set_participant_cookie(response, input.email)
    return {"status": "verified"}


@router.post("/bind-checkin", response_model=Participant, response_model_by_alias=True)
def bind_checkin(
    input: BindCheckinInput,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> Participant:
    return svc.bind_checkin(email, input.checkin_id)


@router.post("/checkin-login", response_model=Participant, response_model_by_alias=True)
def checkin_login(
    input: CheckinLoginInput,
    response: Response,
    svc: HackathonService = Depends(service),
) -> Participant:
    participant = svc.bind_checkin_with_profile(
        input.email, input.checkin_id, input.full_name
    )
    set_participant_cookie(response, participant.email)
    return participant
