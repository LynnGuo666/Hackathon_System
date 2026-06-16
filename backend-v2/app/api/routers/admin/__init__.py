from fastapi import APIRouter

from app.api.routers.admin import checkins, configuration, enrollments, food, operations, overview, participants, resources, tasks

router = APIRouter(prefix="/api/admin")

router.include_router(overview.router)
router.include_router(enrollments.router)
router.include_router(resources.router)
router.include_router(operations.router)
router.include_router(participants.router)
router.include_router(checkins.router)
router.include_router(food.router)
router.include_router(configuration.router)
router.include_router(tasks.router)
