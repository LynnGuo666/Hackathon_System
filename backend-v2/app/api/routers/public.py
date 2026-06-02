from fastapi import APIRouter, Depends

from app.core.dependencies import repository
from app.repositories.sqlite import SQLiteRepository
from app.schemas import NavigationLink, SiteConfig

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/navigation-links", response_model=list[NavigationLink], response_model_by_alias=True)
def navigation_links(repo: SQLiteRepository = Depends(repository)) -> list[NavigationLink]:
    return repo.list_navigation_links(include_disabled=False)


@router.get("/site-config", response_model=SiteConfig, response_model_by_alias=True)
def site_config(repo: SQLiteRepository = Depends(repository)) -> SiteConfig:
    return SiteConfig(**repo.get_site_config())
