from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routers import admin, auth, enrollment, participant, public
from app.core.config import get_settings
from app.core.errors import AppError


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Hackathon Backend V2")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "X-Admin-Token",
            "X-Admin-Role",
            "X-Actor-ID",
            "X-Participant-Email",
        ],
    )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.message})

    @app.exception_handler(HTTPException)
    async def http_error_handler(request: Request, exc: HTTPException):
        if isinstance(exc.detail, dict) and "error" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})

    app.include_router(public.router)
    app.include_router(auth.router)
    app.include_router(enrollment.router)
    app.include_router(participant.router)
    app.include_router(admin.router)

    static_path = settings.static_path
    if static_path:
        mount_static_frontend(app, static_path)

    return app


def mount_static_frontend(app: FastAPI, static_dir: Path) -> None:
    app.mount("/_next", StaticFiles(directory=static_dir / "_next"), name="next-static")

    @app.get("/{path:path}", include_in_schema=False)
    def spa_fallback(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="not found")

        candidate = static_dir / path
        if candidate.is_file():
            return FileResponse(candidate)

        html_candidate = static_dir / (path + ".html")
        if html_candidate.is_file():
            return FileResponse(html_candidate)

        index_candidate = static_dir / path / "index.html"
        if index_candidate.is_file():
            return FileResponse(index_candidate)

        return FileResponse(static_dir / "index.html")


app = create_app()
