import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse

from app.core.security import participant_email
from app.schemas import BindCheckinInput, CheckinLoginInput, Participant, SendCodeInput, VerifyCodeInput
from app.services.hackathon import HackathonService
from app.core.dependencies import service

router = APIRouter(prefix="/api/auth")
logger = logging.getLogger("auth")


def set_participant_cookie(response: Response, email: str, svc: HackathonService) -> None:
    session = svc.create_participant_session(email)
    response.set_cookie(
        key="participant_session",
        value=session.id,
        path="/",
        httponly=True,
        samesite="lax",
        expires=session.expires_at,
    )
    response.delete_cookie("participant_email", path="/")


@router.post("/send-code", status_code=202)
def send_code(input: SendCodeInput, svc: HackathonService = Depends(service)) -> dict[str, str]:
    code = svc.send_code(input.email)
    # 没配真邮件 provider 时（site_config.emailProvider == "disabled"）只把验证码
    # 打印到后端日志，开发者从控制台读取后手动填入；不再随响应返回，避免前端
    # 自动填值导致的“看上去不像在测验证流程”的混淆。
    if svc.email_provider_disabled():
        logger.warning(
            "[MOCK EMAIL] verification code for %s: %s (邮件 provider 未配置)",
            input.email,
            code,
        )
        print(f"[MOCK EMAIL] verification code for {input.email}: {code}", flush=True)
    return {"status": "queued"}


@router.post("/verify-code")
def verify_code(
    input: VerifyCodeInput,
    response: Response,
    svc: HackathonService = Depends(service),
) -> dict[str, str]:
    svc.verify_code(input.email, input.code)
    set_participant_cookie(response, input.email, svc)
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
    set_participant_cookie(response, participant.email, svc)
    return participant


@router.get("/oauth/{provider}/start")
def oauth_start(
    provider: str,
    request: Request,
    svc: HackathonService = Depends(service),
) -> RedirectResponse:
    redirect_uri = str(request.url_for("oauth_callback", provider=provider))
    url = svc.start_oauth(provider, redirect_uri)
    return RedirectResponse(url)


@router.get("/oauth/{provider}/callback", name="oauth_callback")
def oauth_callback(
    provider: str,
    state: str,
    code: str,
    svc: HackathonService = Depends(service),
) -> RedirectResponse:
    participant = svc.complete_oauth(provider, state, code)
    response = RedirectResponse("/p/dashboard")
    set_participant_cookie(response, participant.email, svc)
    return response


@router.post("/logout")
def logout(request: Request, response: Response, svc: HackathonService = Depends(service)) -> dict[str, str]:
    session_id = request.cookies.get("participant_session", "")
    if session_id:
        svc.revoke_participant_session(session_id)
    response.delete_cookie("participant_session", path="/")
    response.delete_cookie("participant_email", path="/")
    return {"status": "ok"}
