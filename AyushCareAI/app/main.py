"""FastAPI application entry point.

Creates the application with CORS, routers, lifespan events, and middleware.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.middleware import AuditMiddleware, RateLimitMiddleware
from app.api.v1.router import api_v1_router
from app.config import get_settings
from app.infrastructure.database import init_db, close_db
from app.infrastructure.redis_client import init_redis, close_redis
from app.infrastructure.storage import init_storage

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle."""
    settings = get_settings()
    logger.info(
        "medikiosk_starting",
        environment=settings.environment.value,
        version=settings.app_version,
    )

    # Initialise infrastructure
    await init_db(settings)
    await init_redis(settings)
    await init_storage(settings)

    logger.info("medikiosk_ready")
    yield

    # Graceful shutdown
    await close_redis()
    await close_db()
    logger.info("medikiosk_stopped")


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Production-grade AI backend for the MediKiosk clinical history "
            "software platform. Provides conversational history taking, "
            "medical document intelligence, clinical summary generation, "
            "and FHIR interoperability."
        ),
        docs_url="/docs" if settings.enable_docs else None,
        redoc_url="/redoc" if settings.enable_docs else None,
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # ── Custom Middleware ────────────────────────────────────────────────
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(AuditMiddleware)

    # ── Routers ──────────────────────────────────────────────────────────
    app.include_router(api_v1_router)

    @app.api_route("/health", methods=["GET", "HEAD"])
    async def root_health():
        from app.api.v1.health import health_check
        return await health_check()

    @app.api_route("/", methods=["GET", "HEAD"])
    async def root():
        return {"service": "medikiosk-ai", "status": "running"}

    return app


app = create_app()
