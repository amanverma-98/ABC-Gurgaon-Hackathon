"""Language catalog and Bhashini translation endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from app.dependencies import get_translation_service, get_asr_service
from app.domain.languages import list_supported_languages, get_locale
from app.ai.translation_service import TranslationService
from app.ai.asr_service import ASRService

router = APIRouter(tags=["Language"] )

class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    source_language: str = Field(..., min_length=2, max_length=10)
    target_language: str = Field(..., min_length=2, max_length=10)

class BatchTranslationRequest(TranslationRequest):
    text: str = ""
    texts: list[str] = Field(..., min_length=1, max_length=20)

@router.get("/languages")
async def languages() -> dict:
    return {"languages": list_supported_languages()}

@router.post("/translate")
async def translate_text(body: TranslationRequest, service: TranslationService = Depends(get_translation_service)) -> dict:
    source = body.source_language.lower().split("-")[0]
    target = body.target_language.lower().split("-")[0]
    if not get_locale(source) or not get_locale(target):
        raise HTTPException(status_code=400, detail="Unsupported source or target language")
    try:
        translated = await service.translate(body.text, source, target)
    except Exception:
        translated = body.text
    return {"text": translated, "source_language": source, "target_language": target, "provider": "bhashini"}

@router.post("/translate-batch")
async def translate_batch(body: BatchTranslationRequest, service: TranslationService = Depends(get_translation_service)) -> dict:
    source = body.source_language.lower().split("-")[0]
    target = body.target_language.lower().split("-")[0]
    if not get_locale(source) or not get_locale(target):
        raise HTTPException(status_code=400, detail="Unsupported source or target language")
    translated = await service.translate_batch(body.texts, source, target)
    return {"texts": translated, "source_language": source, "target_language": target, "provider": "bhashini"}

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = "auto",
    service: ASRService = Depends(get_asr_service),
) -> dict:
    """Transcribe speech audio with automatic language detection via Bhashini ASR & Groq Whisper."""
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file cannot be empty")
    
    clean_lang = (
        "auto"
        if not language or language.lower().strip() in ("auto", "detect", "default")
        else language.lower().split("-")[0]
    )
    try:
        res = await service.transcribe(
            audio_bytes=audio_bytes,
            language=clean_lang,
            filename=audio.filename or "speech.webm",
        )
        detected_lang = res.get("detected_language") or res.get("language") or clean_lang
        if detected_lang == "auto":
            detected_lang = "en"
        return {
            "text": res.get("text", ""),
            "confidence": res.get("confidence", 0.95),
            "language": detected_lang,
            "detected_language": detected_lang,
            "provider": res.get("provider", "bhashini_whisper"),
        }
    except Exception as e:
        return {
            "text": "",
            "confidence": 0.0,
            "language": "en" if clean_lang == "auto" else clean_lang,
            "detected_language": "en" if clean_lang == "auto" else clean_lang,
            "error": str(e),
            "provider": "failed",
        }

