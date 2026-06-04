from fastapi import APIRouter, Depends

from app.core.dependencies import repository, service
from app.core.security import actor_id, require_admin_token
from app.repositories.sqlite import SQLiteRepository
from app.schemas import (
    EventLocation,
    FeatureLink,
    FeatureToggleInput,
    NavigationLink,
    OSMSearchResult,
    SiteConfig,
)
from app.services.hackathon import HackathonService

router = APIRouter(dependencies=[Depends(require_admin_token)])


@router.get("/navigation-links", response_model=list[NavigationLink], response_model_by_alias=True)
def admin_navigation_links(repo: SQLiteRepository = Depends(repository)) -> list[NavigationLink]:
    return repo.list_navigation_links(include_disabled=True)


@router.post(
    "/navigation-links",
    status_code=201,
    response_model=NavigationLink,
    response_model_by_alias=True,
)
def create_navigation_link(
    input: NavigationLink,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> NavigationLink:
    return svc.create_navigation_link(actor, input)


@router.get("/feature-links", response_model=list[FeatureLink], response_model_by_alias=True)
def admin_feature_links(repo: SQLiteRepository = Depends(repository)) -> list[FeatureLink]:
    return repo.list_feature_links(include_disabled=True)


@router.post(
    "/feature-links",
    status_code=201,
    response_model=FeatureLink,
    response_model_by_alias=True,
)
def create_feature_link(
    input: FeatureLink,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> FeatureLink:
    return svc.create_feature_link(actor, input)


@router.patch(
    "/feature-links/{feature_id}",
    response_model=FeatureLink,
    response_model_by_alias=True,
)
def update_feature_link(
    feature_id: str,
    input: FeatureToggleInput,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> FeatureLink:
    return svc.set_feature_enabled(actor, feature_id, input.enabled)


@router.get("/locations/search", response_model=list[OSMSearchResult], response_model_by_alias=True)
def search_locations(q: str, svc: HackathonService = Depends(service)) -> list[OSMSearchResult]:
    return svc.search_locations(q)


@router.get("/event-location", response_model=EventLocation, response_model_by_alias=True)
def admin_event_location(repo: SQLiteRepository = Depends(repository)) -> EventLocation:
    return repo.get_event_location()


@router.put("/event-location", response_model=EventLocation, response_model_by_alias=True)
def update_event_location(
    input: EventLocation,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> EventLocation:
    return svc.update_event_location(actor, input)


@router.put("/site-config", response_model=SiteConfig, response_model_by_alias=True)
def update_site_config(
    input: SiteConfig,
    actor: str = Depends(actor_id),
    svc: HackathonService = Depends(service),
) -> SiteConfig:
    return svc.update_site_config(actor, input)
