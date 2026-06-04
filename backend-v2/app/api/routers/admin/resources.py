import csv
import io

from fastapi import APIRouter, Depends, Header, Request

from app.core.dependencies import repository, service
from app.core.security import actor_id, require_admin_token
from app.repositories.sqlite import SQLiteRepository
from app.schemas import AssignInput, ImportCodesInput, ResourceAssignment, ResourceItem, ResourcePool
from app.services.hackathon import HackathonService

router = APIRouter(dependencies=[Depends(require_admin_token)])


@router.get("/resources/pools", response_model=list[ResourcePool], response_model_by_alias=True)
def list_pools(repo: SQLiteRepository = Depends(repository)) -> list[ResourcePool]:
    return repo.list_resource_pools()


@router.get("/resources/pools/{pool_id}", response_model=ResourcePool, response_model_by_alias=True)
def get_pool(pool_id: str, repo: SQLiteRepository = Depends(repository)) -> ResourcePool:
    return repo.get_resource_pool(pool_id)


@router.post(
    "/resources/pools",
    status_code=201,
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
    # 兼容后台 JSON 批量导入和后续可能的 CSV 上传；两种入口最终都归一为字符串列表。
    if "text/csv" in content_type:
        body = (await request.body()).decode()
        codes = [row[0] for row in csv.reader(io.StringIO(body)) if row]
    else:
        input = ImportCodesInput.model_validate(await request.json())
        codes = input.values or input.codes
    return svc.import_resource_codes(actor, pool_id, codes)


@router.get(
    "/resources/pools/{pool_id}/items",
    response_model=list[ResourceItem],
    response_model_by_alias=True,
)
def list_items(pool_id: str, repo: SQLiteRepository = Depends(repository)) -> list[ResourceItem]:
    return repo.list_resource_items(pool_id)


@router.get(
    "/resources/assignments",
    response_model=list[ResourceAssignment],
    response_model_by_alias=True,
)
def list_assignments(
    pool_id: str = "",
    repo: SQLiteRepository = Depends(repository),
) -> list[ResourceAssignment]:
    return repo.list_assignments(pool_id=pool_id)


@router.post(
    "/resources/pools/{pool_id}/assign",
    status_code=201,
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
