from fastapi import APIRouter, Depends, Query

from app.core.dependencies import repository
from app.core.security import require_admin_token
from app.repositories.sqlite import SQLiteRepository
from app.schemas import AsyncTask

router = APIRouter(dependencies=[Depends(require_admin_token)])


@router.get("/tasks", response_model=list[AsyncTask], response_model_by_alias=True)
def list_tasks(
    task_type: str | None = Query(None, alias="type"),
    status: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    repo: SQLiteRepository = Depends(repository),
) -> list[AsyncTask]:
    return repo.list_tasks(task_type=task_type, status=status, limit=limit)


@router.get("/tasks/{task_id}", response_model=AsyncTask, response_model_by_alias=True)
def get_task(
    task_id: str,
    repo: SQLiteRepository = Depends(repository),
) -> AsyncTask:
    task = repo.get_task(task_id)
    if not task:
        from app.core.errors import NotFound
        raise NotFound("task not found")
    return task


@router.post(
    "/tasks/{task_id}/retry",
    response_model=AsyncTask,
    response_model_by_alias=True,
)
def retry_task(
    task_id: str,
    repo: SQLiteRepository = Depends(repository),
) -> AsyncTask:
    return repo.retry_task(task_id)
