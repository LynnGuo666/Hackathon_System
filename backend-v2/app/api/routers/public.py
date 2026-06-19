import os
from importlib.metadata import version as get_version

from fastapi import APIRouter, Depends

from app.core.dependencies import repository
from app.core.features import get_feature_links
from app.repositories.sqlite import SQLiteRepository
from app.schemas import EventLocation, FeatureLink, NavigationLink, SiteConfig

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/version")
def version() -> dict[str, str]:
    return {
        "backend": get_version("hackathon-backend-v2"),
        "frontend": os.environ.get("NEXT_PUBLIC_APP_VERSION", "0.0.0"),
        "buildTime": os.environ.get("BUILD_TIME", ""),
    }


@router.get("/navigation-links", response_model=list[NavigationLink], response_model_by_alias=True)
def navigation_links(
    home: bool = False,
    repo: SQLiteRepository = Depends(repository),
) -> list[NavigationLink]:
    return repo.list_navigation_links(include_disabled=False, home_only=home)


@router.get("/feature-links", response_model=list[FeatureLink], response_model_by_alias=True)
def feature_links() -> list[FeatureLink]:
    return get_feature_links()


@router.get("/site-config", response_model=SiteConfig, response_model_by_alias=True)
def site_config(repo: SQLiteRepository = Depends(repository)) -> SiteConfig:
    return SiteConfig(**repo.get_site_config())


@router.get("/event-location", response_model=EventLocation, response_model_by_alias=True)
def event_location(repo: SQLiteRepository = Depends(repository)) -> EventLocation:
    return repo.get_event_location()
