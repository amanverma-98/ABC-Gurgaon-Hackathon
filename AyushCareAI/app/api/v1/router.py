"""V1 API router — aggregates all endpoint modules."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.conversation import router as conversation_router
from app.api.v1.documents import router as documents_router
from app.api.v1.summary import router as summary_router
from app.api.v1.consent import router as consent_router
from app.api.v1.fhir import router as fhir_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(sessions_router)
api_v1_router.include_router(conversation_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(summary_router)
api_v1_router.include_router(consent_router)
api_v1_router.include_router(fhir_router)
