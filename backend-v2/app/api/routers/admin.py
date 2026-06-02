import csv
import io

from fastapi import APIRouter, Depends, Header, Request

from app.core.dependencies import repository, service
from app.core.security import actor_id, require_admin_token
from app.repositories.sqlite import SQLiteRepository
from app.schemas import (
    AssignInput,
    AuditLog,
    EmailOutbox,
    ImportCodesInput,
    NavigationLink,
    ParticipantProfile,
    ResourceAssignment,
    ResourceItem,
    ResourcePool,
    SiteConfig,
)
from app.services.hackathon import HackathonService

router = APIRouter(prefix="/api/admin")


@router.get(
    "/resources/pools",
    dependencies=[Depends(require_admin_token)],
    response_model=list[ResourcePool],
    response_model_by_alias=True,
)
def list_pools(repo: SQLiteRepository = Depends(repository)) -> list[ResourcePool]:
    return repo.list_resource_pools()


@router.post(
    "/resources/pools",
    status_code=201,
    dependencies=[Depends(require_admin_token)],
    response_model=ResourcePool,
    response_model_by_alias=True,
)
def create_pool(
    input: ResourcePool,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> ResourcePool:
    return svc.create_pool(actor, input)


@router.post(
    "/resources/pools/{pool_id}/items/import",
    status_code=201,
    dependencies=[Depends(require_admin_token)],
    response_model=list[ResourceItem],
    response_model_by_alias=True,
)
async def import_items(
    pool_id: str,
    request: Request,
    content_type: str = Header(default="", alias="Content-Type"),
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> list[ResourceItem]:
    if "text/csv" in content_type:
        body = (await request.body()).decode()
        codes = [row[0] for row in csv.reader(io.StringIO(body)) if row]
    else:
        input = ImportCodesInput.model_validate(await request.json())
        codes = input.codes
    return svc.import_resource_codes(actor, pool_id, codes)


@router.get(
    "/resources/pools/{pool_id}/items",
    dependencies=[Depends(require_admin_token)],
    response_model=list[ResourceItem],
    response_model_by_alias=True,
)
def list_items(
    pool_id: str, repo: SQLiteRepository = Depends(repository)
) -> list[ResourceItem]:
    return repo.list_resource_items(pool_id)


@router.get(
    "/resources/assignments",
    dependencies=[Depends(require_admin_token)],
    response_model=list[ResourceAssignment],
    response_model_by_alias=True,
)
def list_assignments(repo: SQLiteRepository = Depends(repository)) -> list[ResourceAssignment]:
    return repo.list_assignments()


@router.post(
    "/resources/pools/{pool_id}/assign",
    status_code=201,
    dependencies=[Depends(require_admin_token)],
    response_model=ResourceAssignment,
    response_model_by_alias=True,
)
def assign_resource(
    pool_id: str,
    input: AssignInput,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> ResourceAssignment:
    return svc.claim_resource(actor, pool_id, input.checkin_id)


@router.post("/resources/assignments/{assignment_id}/resend-email", status_code=202)
def resend_email(assignment_id: str) -> dict[str, str]:
    return {
        "status": "queued",
        "note": "resource email resend is tracked through email outbox retry",
    }


@router.get(
    "/email-outbox",
    dependencies=[Depends(require_admin_token)],
    response_model=list[EmailOutbox],
    response_model_by_alias=True,
)
def email_outbox(repo: SQLiteRepository = Depends(repository)) -> list[EmailOutbox]:
    return repo.list_emails()


@router.post(
    "/email-outbox/{email_id}/retry",
    dependencies=[Depends(require_admin_token)],
    response_model=EmailOutbox,
    response_model_by_alias=True,
)
def retry_email(
    email_id: str,
    actor: str = Depends(actor_id),
    repo: SQLiteRepository = Depends(repository),
) -> EmailOutbox:
    from app.repositories.sqlite import now_utc

    email = repo.retry_email(email_id, now_utc())
    repo.record_audit(actor, "email.retry", "email_outbox", email_id, "", now_utc())
    return email


@router.get(
    "/audit-logs",
    dependencies=[Depends(require_admin_token)],
    response_model=list[AuditLog],
    response_model_by_alias=True,
)
def audit_logs(repo: SQLiteRepository = Depends(repository)) -> list[AuditLog]:
    return repo.list_audits()


@router.get(
    "/profiles",
    dependencies=[Depends(require_admin_token)],
    response_model=list[ParticipantProfile],
    response_model_by_alias=True,
)
def profiles(repo: SQLiteRepository = Depends(repository)) -> list[ParticipantProfile]:
    return repo.list_participant_profiles()


@router.get(
    "/navigation-links",
    dependencies=[Depends(require_admin_token)],
    response_model=list[NavigationLink],
    response_model_by_alias=True,
)
def admin_navigation_links(repo: SQLiteRepository = Depends(repository)) -> list[NavigationLink]:
    return repo.list_navigation_links(include_disabled=True)


@router.post(
    "/navigation-links",
    status_code=201,
    dependencies=[Depends(require_admin_token)],
    response_model=NavigationLink,
    response_model_by_alias=True,
)
def create_navigation_link(
    input: NavigationLink,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> NavigationLink:
    return svc.create_navigation_link(actor, input)


@router.put(
    "/site-config",
    dependencies=[Depends(require_admin_token)],
    response_model=SiteConfig,
    response_model_by_alias=True,
)
def update_site_config(
    input: SiteConfig,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> SiteConfig:
    return svc.update_site_config(actor, input)
