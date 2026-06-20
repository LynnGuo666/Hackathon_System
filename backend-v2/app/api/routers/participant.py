from fastapi import APIRouter, Depends

from app.core.dependencies import service
from app.core.security import participant_email
from app.schemas import (
    AccommodationRequest,
    BindCheckinInput,
    DrinkOrder,
    DrinkSupplySlot,
    MealOrder,
    MealOrderSlot,
    Participant,
    ParticipantProfile,
    ResourceAssignment,
    ResourcePool,
)
from app.services.hackathon import HackathonService

router = APIRouter(prefix="/api")


@router.get("/me", response_model=Participant, response_model_by_alias=True)
def me(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> Participant:
    return svc.me(email)


@router.get("/profile", response_model=ParticipantProfile, response_model_by_alias=True)
def get_profile(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> ParticipantProfile:
    return svc.profile(email)


@router.put("/profile", response_model=ParticipantProfile, response_model_by_alias=True)
def put_profile(
    input: ParticipantProfile,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> ParticipantProfile:
    return svc.save_profile(email, input)


@router.get("/accommodation", response_model=AccommodationRequest, response_model_by_alias=True)
def get_accommodation(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> AccommodationRequest:
    return svc.get_accommodation(email)


@router.put("/accommodation", response_model=AccommodationRequest, response_model_by_alias=True)
def put_accommodation(
    input: AccommodationRequest,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> AccommodationRequest:
    return svc.save_accommodation(email, input)


@router.post("/checkin/claim", response_model=Participant, response_model_by_alias=True)
def claim_checkin(
    input: BindCheckinInput,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> Participant:
    return svc.bind_checkin(email, input.checkin_id)


@router.get("/meal-order/slots", response_model=list[MealOrderSlot], response_model_by_alias=True)
@router.get("/meal-slots", response_model=list[MealOrderSlot], response_model_by_alias=True)
def meal_slots(svc: HackathonService = Depends(service)) -> list[MealOrderSlot]:
    return svc.repository.list_meal_slots()


@router.get("/drink-supply/slots", response_model=list[DrinkSupplySlot], response_model_by_alias=True)
@router.get("/drink-slots", response_model=list[DrinkSupplySlot], response_model_by_alias=True)
def drink_slots(svc: HackathonService = Depends(service)) -> list[DrinkSupplySlot]:
    return svc.repository.list_drink_slots()


@router.get("/meal-orders", response_model=list[MealOrder], response_model_by_alias=True)
def meal_orders(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> list[MealOrder]:
    participant = svc.checked_in_participant(email)
    return svc.repository.list_meal_orders(email=participant.email)


@router.put("/meal-orders/{slot_id}", response_model=MealOrder, response_model_by_alias=True)
@router.put("/meal-slots/{slot_id}/order", response_model=MealOrder, response_model_by_alias=True)
def put_meal_order(
    slot_id: str,
    input: MealOrder,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> MealOrder:
    return svc.save_meal_order(email, slot_id, input)


@router.delete("/meal-slots/{slot_id}/order", status_code=204)
def delete_meal_order(
    slot_id: str,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> None:
    svc.cancel_meal_order(email, slot_id)


@router.get("/drink-orders", response_model=list[DrinkOrder], response_model_by_alias=True)
def drink_orders(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> list[DrinkOrder]:
    participant = svc.checked_in_participant(email)
    return svc.repository.list_drink_orders(email=participant.email)


@router.put("/drink-orders/{slot_id}", response_model=DrinkOrder, response_model_by_alias=True)
@router.put("/drink-slots/{slot_id}/order", response_model=DrinkOrder, response_model_by_alias=True)
def put_drink_order(
    slot_id: str,
    input: DrinkOrder,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> DrinkOrder:
    return svc.save_drink_order(email, slot_id, input)


@router.delete("/drink-slots/{slot_id}/order", status_code=204)
def delete_drink_order(
    slot_id: str,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> None:
    svc.cancel_drink_order(email, slot_id)


@router.get("/resources/pools", response_model=list[ResourcePool], response_model_by_alias=True)
def visible_pools(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> list[ResourcePool]:
    # participant_email 已确保是登录选手；说明内容对所有启用池一致可见，无需 checkin。
    return svc.list_visible_pools()


@router.get("/resources", response_model=list[ResourceAssignment], response_model_by_alias=True)
def resources(
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> list[ResourceAssignment]:
    participant = svc.checked_in_participant(email)
    return svc.my_resources(participant.checkin_id)


@router.post(
    "/resources/{pool_id}/claim",
    status_code=201,
    response_model=ResourceAssignment,
    response_model_by_alias=True,
)
def claim_resource(
    pool_id: str,
    email: str = Depends(participant_email),
    svc: HackathonService = Depends(service),
) -> ResourceAssignment:
    participant = svc.checked_in_participant(email)
    return svc.claim_resource(participant.checkin_id, pool_id, participant.checkin_id)


@router.post("/resources/{assignment_id}/resend-email", status_code=202)
def resend_email(assignment_id: str) -> dict[str, str]:
    return {
        "status": "queued",
        "note": "resource email resend is tracked through email outbox retry",
    }
