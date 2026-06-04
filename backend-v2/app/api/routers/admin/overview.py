from fastapi import APIRouter, Depends

from app.core.dependencies import repository
from app.core.security import require_admin_token
from app.repositories.sqlite import SQLiteRepository
from app.schemas import (
    AdminOverview,
    AdminOverviewCheckinIDs,
    AdminOverviewConfiguration,
    AdminOverviewEmails,
    AdminOverviewMeals,
    AdminOverviewParticipants,
    AdminOverviewResources,
    SiteConfig,
)

router = APIRouter(dependencies=[Depends(require_admin_token)])


@router.get("/overview", response_model=AdminOverview, response_model_by_alias=True)
def overview(repo: SQLiteRepository = Depends(repository)) -> AdminOverview:
    participants = repo.list_participant_accounts()
    checkin_ids = repo.list_checkin_ids()
    resource_pools = repo.list_resource_pools()
    resource_items = repo.list_resource_items()
    assignments = repo.list_assignments()
    emails = repo.list_emails()
    meal_slots = repo.list_meal_slots(include_disabled=True)
    drink_slots = repo.list_drink_slots(include_disabled=True)
    meal_orders = repo.list_meal_orders()
    drink_orders = repo.list_drink_orders()

    # 后台首页只展示轻量聚合值，不额外引入复杂查询对象，避免首页依赖具体业务表结构。
    return AdminOverview(
        participants=AdminOverviewParticipants(
            total=len(participants),
            pending=sum(row.status == "pending" for row in participants),
            active=sum(row.status == "active" for row in participants),
            disabled=sum(row.status == "disabled" for row in participants),
            checkedIn=sum(bool(row.checkin_id) for row in participants),
        ),
        checkinIds=AdminOverviewCheckinIDs(
            total=len(checkin_ids),
            available=sum(row.status == "available" for row in checkin_ids),
            bound=sum(row.status == "bound" for row in checkin_ids),
        ),
        resources=AdminOverviewResources(
            pools=len(resource_pools),
            items=len(resource_items),
            availableItems=sum(row.status == "available" for row in resource_items),
            assignedItems=sum(row.status == "assigned" for row in resource_items),
            assignments=len(assignments),
        ),
        emails=AdminOverviewEmails(
            total=len(emails),
            pending=sum(row.status == "pending" for row in emails),
            sending=sum(row.status == "sending" for row in emails),
            sent=sum(row.status == "sent" for row in emails),
            failed=sum(row.status == "failed" for row in emails),
        ),
        meals=AdminOverviewMeals(
            mealSlots=len(meal_slots),
            drinkSlots=len(drink_slots),
            mealOrders=len(meal_orders),
            drinkOrders=len(drink_orders),
        ),
        configuration=AdminOverviewConfiguration(
            siteConfig=SiteConfig(**repo.get_site_config()),
            navigationLinks=len(repo.list_navigation_links(include_disabled=True)),
            featureLinks=len(repo.list_feature_links(include_disabled=True)),
        ),
    )
