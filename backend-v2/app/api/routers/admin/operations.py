from fastapi import APIRouter, Depends

from app.core.dependencies import repository
from app.core.security import actor_id, require_admin_token
from app.repositories.common import now_utc
from app.repositories.sqlite import SQLiteRepository
from app.schemas import AuditLog, EmailOutbox

router = APIRouter(dependencies=[Depends(require_admin_token)])


@router.get("/email-outbox", response_model=list[EmailOutbox], response_model_by_alias=True)
def email_outbox(repo: SQLiteRepository = Depends(repository)) -> list[EmailOutbox]:
    return repo.list_emails()


@router.post(
    "/email-outbox/{email_id}/retry",
    response_model=EmailOutbox,
    response_model_by_alias=True,
)
def retry_email(
    email_id: str,
    actor: str = Depends(actor_id),
    repo: SQLiteRepository = Depends(repository),
) -> EmailOutbox:
    now = now_utc()
    email = repo.retry_email(email_id, now)
    repo.record_audit(actor, "email.retry", "email_outbox", email_id, "", now)
    return email


@router.get("/audit-logs", response_model=list[AuditLog], response_model_by_alias=True)
def audit_logs(repo: SQLiteRepository = Depends(repository)) -> list[AuditLog]:
    return repo.list_audits()
