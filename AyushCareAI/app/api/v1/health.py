"""Health check endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import get_settings
from app.infrastructure import redis_client
from app.models import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """System health check returning component availability."""
    settings = get_settings()

    redis_ok = await redis_client.is_connected()

    # Check database connectivity
    db_ok = False
    try:
        from app.infrastructure.database import _engine
        if _engine:
            db_ok = True
    except Exception:
        pass

    llm_ok = settings.primary_llm_available
    ocr_ok = (
        settings.ocr_provider == "tesseract"
        or (
            settings.ocr_provider == "groq_vision"
            and bool(settings.groq_api_key)
        )
        or (
            settings.ocr_provider == "bhashini"
            and bool(settings.bhashini_udyat_key)
        )
    )
    asr_ok = bool(settings.groq_api_key) or bool(settings.bhashini_udyat_key)
    tts_ok = True  # Bhashini TTS or Edge-TTS fallback

    return HealthResponse(
        version=settings.app_version,
        environment=settings.environment.value,
        llm_available=llm_ok,
        ocr_available=ocr_ok,
        asr_available=asr_ok,
        tts_available=tts_ok,
        database_connected=db_ok,
        redis_connected=redis_ok,
    )
