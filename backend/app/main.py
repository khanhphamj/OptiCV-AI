from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import cover_letter, health, jobs, openai_proxy


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="OptiCV-AI Backend", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    app.include_router(health.router)
    app.include_router(openai_proxy.router)
    app.include_router(cover_letter.router)
    app.include_router(jobs.router)
    return app


app = create_app()
