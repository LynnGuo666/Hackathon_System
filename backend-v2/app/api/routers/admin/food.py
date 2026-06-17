from fastapi import APIRouter, Depends

from app.core.dependencies import repository, service
from app.core.security import actor_id, require_admin_token
from app.repositories.sqlite import SQLiteRepository
from app.schemas import (
    DrinkOrder,
    DrinkSupplySlot,
    MealOrder,
    MealOrderSlot,
    SupplyTemplateImportInput,
    SupplyTemplateImportResult,
    SupplyTemplateInput,
    SupplyTemplatePreview,
)
from app.services.hackathon import HackathonService

router = APIRouter(dependencies=[Depends(require_admin_token)])


# meal-order-slots 是早期命名，meal-slots 是当前前端使用的短路径；两者暂时都保留。
@router.get("/meal-order-slots", response_model=list[MealOrderSlot], response_model_by_alias=True)
@router.get("/meal-slots", response_model=list[MealOrderSlot], response_model_by_alias=True)
def admin_meal_slots(repo: SQLiteRepository = Depends(repository)) -> list[MealOrderSlot]:
    return repo.list_meal_slots(include_disabled=True)


@router.post(
    "/meal-order-slots",
    status_code=201,
    response_model=MealOrderSlot,
    response_model_by_alias=True,
)
@router.post(
    "/meal-slots",
    status_code=201,
    response_model=MealOrderSlot,
    response_model_by_alias=True,
)
def create_meal_slot(
    input: MealOrderSlot,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> MealOrderSlot:
    return svc.create_meal_slot(actor, input)


@router.patch(
    "/meal-order-slots/{slot_id}",
    response_model=MealOrderSlot,
    response_model_by_alias=True,
)
@router.put("/meal-slots/{slot_id}", response_model=MealOrderSlot, response_model_by_alias=True)
def update_meal_slot(
    slot_id: str,
    input: MealOrderSlot,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> MealOrderSlot:
    return svc.update_meal_slot(actor, slot_id, input)


@router.post(
    "/meal-supply/templates/preview",
    response_model=SupplyTemplatePreview,
    response_model_by_alias=True,
)
def preview_meal_supply_template(
    input: SupplyTemplateInput,
    svc: HackathonService = Depends(service),
) -> SupplyTemplatePreview:
    return svc.preview_supply_template(input.content)


@router.post(
    "/meal-supply/templates/import",
    response_model=SupplyTemplateImportResult,
    response_model_by_alias=True,
)
def import_meal_supply_template(
    input: SupplyTemplateImportInput,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> SupplyTemplateImportResult:
    return svc.import_supply_template(actor, input.content, input.mode)


@router.get("/meal-orders", response_model=list[MealOrder], response_model_by_alias=True)
def admin_meal_orders(
    slotId: str = "",
    slot_id: str = "",
    repo: SQLiteRepository = Depends(repository),
) -> list[MealOrder]:
    # 同时支持 camelCase 和 snake_case 查询参数，避免历史后台脚本失效。
    return repo.list_meal_orders(slot_id=slotId or slot_id)


@router.get("/drink-supply-slots", response_model=list[DrinkSupplySlot], response_model_by_alias=True)
@router.get("/drink-slots", response_model=list[DrinkSupplySlot], response_model_by_alias=True)
def admin_drink_slots(repo: SQLiteRepository = Depends(repository)) -> list[DrinkSupplySlot]:
    return repo.list_drink_slots(include_disabled=True)


@router.post(
    "/drink-supply-slots",
    status_code=201,
    response_model=DrinkSupplySlot,
    response_model_by_alias=True,
)
@router.post(
    "/drink-slots",
    status_code=201,
    response_model=DrinkSupplySlot,
    response_model_by_alias=True,
)
def create_drink_slot(
    input: DrinkSupplySlot,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> DrinkSupplySlot:
    return svc.create_drink_slot(actor, input)


@router.patch(
    "/drink-supply-slots/{slot_id}",
    response_model=DrinkSupplySlot,
    response_model_by_alias=True,
)
@router.put("/drink-slots/{slot_id}", response_model=DrinkSupplySlot, response_model_by_alias=True)
def update_drink_slot(
    slot_id: str,
    input: DrinkSupplySlot,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> DrinkSupplySlot:
    return svc.update_drink_slot(actor, slot_id, input)


@router.get("/drink-orders", response_model=list[DrinkOrder], response_model_by_alias=True)
def admin_drink_orders(
    slotId: str = "",
    slot_id: str = "",
    repo: SQLiteRepository = Depends(repository),
) -> list[DrinkOrder]:
    return repo.list_drink_orders(slot_id=slotId or slot_id)
