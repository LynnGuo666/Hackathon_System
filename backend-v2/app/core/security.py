import hmac
from typing import Annotated

from fastapi import Depends, Header, Request

from app.core.config import Settings, get_settings
from app.core.errors import PermissionDenied, ServiceUnavailable


def normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()


def actor_id(request: Request, x_actor_id: str | None = Header(default=None, alias="X-Actor-ID")) -> str:
    if x_actor_id:
        return x_actor_id
    cookie_email = request.state.__dict__.get("participant_email", "")
    if cookie_email:
        return cookie_email
    return "anonymous"


def participant_email(
    request: Request,
    x_participant_email: str | None = Header(default=None, alias="X-Participant-Email"),
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> str:
    if settings and settings.allow_participant_header_auth and x_participant_email:
        return normalize_email(x_participant_email)
    session_id = request.cookies.get("participant_session", "")
    if session_id:
        from app.core.dependencies import get_repository

        repo = get_repository(settings.database_path)
        session = repo.get_participant_session(session_id)
        if session:
            request.state.participant_email = session.email
            return normalize_email(session.email)
    return ""


def require_admin_token(
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> None:
    if not settings or not settings.admin_token:
        raise ServiceUnavailable("admin not configured")
    if not x_admin_token or not hmac.compare_digest(x_admin_token, settings.admin_token):
        raise PermissionDenied("permission denied")
