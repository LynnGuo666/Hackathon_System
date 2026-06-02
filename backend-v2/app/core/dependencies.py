from functools import lru_cache

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.core.migrations import run_migrations
from app.repositories.sqlite import SQLiteRepository
from app.services.hackathon import HackathonService


@lru_cache
def get_repository(database_path: str) -> SQLiteRepository:
    run_migrations(database_path)
    return SQLiteRepository(database_path)


def repository(settings: Settings = Depends(get_settings)) -> SQLiteRepository:
    return get_repository(settings.database_path)


def service(repo: SQLiteRepository = Depends(repository)) -> HackathonService:
    return HackathonService(repo)
