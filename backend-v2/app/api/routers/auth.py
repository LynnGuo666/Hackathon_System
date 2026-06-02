from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Response

from app.core.security import participant_email
from app.schemas import BindCheckinInput, Participant, SendCodeInput, VerifyCodeInput
from app.services.hackathon import HackathonService
from app.core.dependencies import service

router = APIRouter(prefix="/api/auth")


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
    response.set_cookie(
        key="participant_email",
        value=input.email.strip().lower(),
        path="/",
        httponly=True,
        samesite="lax",
        expires=datetime.now(UTC) + timedelta(hours=24),
    )
    return {"status": "verified"}


@router.post("/bind-checkin", response_model=Participant, response_model_by_alias=True)
def bind_checkin(
    input: BindCheckinInput,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> Participant:
    return svc.bind_checkin(email, input.checkin_id)
