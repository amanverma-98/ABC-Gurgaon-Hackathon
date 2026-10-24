"""FastAPI dependency injection providers.

Provides singleton service instances to API route handlers via Depends().
"""

from __future__ import annotations

from functools import lru_cache

from app.ai.asr_service import ASRService
from app.ai.azure_health_service import AzureHealthNLP
from app.ai.bhashini_client import BhashiniClient
from app.ai.language_detection_service import LanguageDetectionService
from app.ai.llm_service import LLMService
from app.ai.ocr_service import OCRService
from app.ai.translation_service import TranslationService
from app.ai.tts_service import TTSService
from app.config import Settings, get_settings
from app.services.clinical_summary import ClinicalSummaryService
from app.services.consent_manager import ConsentManager
from app.services.conversation_engine import ConversationEngine
from app.services.document_intelligence import DocumentIntelligenceService
from app.services.fhir_mapper import FHIRMapper
from app.services.red_flag_detector import RedFlagDetector


# ── Settings ─────────────────────────────────────────────────────────────

def get_config() -> Settings:
    return get_settings()


# ── Bhashini Client ──────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_bhashini_client() -> BhashiniClient:
    settings = get_settings()
    return BhashiniClient(
        udyat_key=settings.bhashini_udyat_key or "",
        user_id=settings.bhashini_user_id,
        inference_key=settings.bhashini_inference_key or "",
        pipeline_url=settings.bhashini_pipeline_url,
    )


# ── AI Provider Singletons ───────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_llm_service() -> LLMService:
    return LLMService(get_settings())


@lru_cache(maxsize=1)
def get_translation_service() -> TranslationService:
    return TranslationService(
        bhashini_client=get_bhashini_client(),
        settings=get_settings(),
    )


@lru_cache(maxsize=1)
def get_language_detection_service() -> LanguageDetectionService:
    return LanguageDetectionService(
        bhashini_client=get_bhashini_client(),
        settings=get_settings(),
    )


@lru_cache(maxsize=1)
def get_ocr_service() -> OCRService:
    return OCRService(
        settings=get_settings(),
        bhashini_client=get_bhashini_client(),
    )


@lru_cache(maxsize=1)
def get_medical_nlp_service() -> AzureHealthNLP:
    return AzureHealthNLP(get_settings())


@lru_cache(maxsize=1)
def get_asr_service() -> ASRService:
    return ASRService(
        settings=get_settings(),
        bhashini_client=get_bhashini_client(),
    )


@lru_cache(maxsize=1)
def get_tts_service() -> TTSService:
    return TTSService(
        settings=get_settings(),
        bhashini_client=get_bhashini_client(),
    )


# ── Business Service Singletons ──────────────────────────────────────────

@lru_cache(maxsize=1)
def get_conversation_engine() -> ConversationEngine:
    return ConversationEngine(
        llm=get_llm_service(),
        asr=get_asr_service(),
        tts=get_tts_service(),
    )


@lru_cache(maxsize=1)
def get_document_intelligence() -> DocumentIntelligenceService:
    return DocumentIntelligenceService(
        ocr=get_ocr_service(),
        llm=get_llm_service(),
        medical_nlp=get_medical_nlp_service(),
    )


@lru_cache(maxsize=1)
def get_clinical_summary_service() -> ClinicalSummaryService:
    return ClinicalSummaryService(llm=get_llm_service())


@lru_cache(maxsize=1)
def get_red_flag_detector() -> RedFlagDetector:
    return RedFlagDetector(llm=get_llm_service())


@lru_cache(maxsize=1)
def get_fhir_mapper() -> FHIRMapper:
    return FHIRMapper()


@lru_cache(maxsize=1)
def get_consent_manager() -> ConsentManager:
    return ConsentManager()
