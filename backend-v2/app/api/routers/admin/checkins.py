from fastapi import APIRouter, Depends

from app.core.dependencies import repository, service
from app.core.security import actor_id, require_admin_token
from app.repositories.sqlite import SQLiteRepository
from app.schemas import CheckinIDRecord, GenerateCheckinIDsInput, ImportCheckinIDsInput
from app.services.hackathon import HackathonService

router = APIRouter(dependencies=[Depends(require_admin_token)])


@router.get("/checkin-ids", response_model=list[CheckinIDRecord], response_model_by_alias=True)
def checkin_ids(repo: SQLiteRepository = Depends(repository)) -> list[CheckinIDRecord]:
    return repo.list_checkin_ids()


@router.post(
    "/checkin-ids/generate",
    status_code=201,
    response_model=list[CheckinIDRecord],
    response_model_by_alias=True,
)
def generate_checkin_ids(
    input: GenerateCheckinIDsInput,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> list[CheckinIDRecord]:
    return svc.generate_checkin_ids(actor, input.count)


@router.post(
    "/checkin-ids/import",
    status_code=201,
    response_model=list[CheckinIDRecord],
    response_model_by_alias=True,
)
def import_checkin_ids(
    input: ImportCheckinIDsInput,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> list[CheckinIDRecord]:
    return svc.import_checkin_ids(actor, input.values or input.ids)
