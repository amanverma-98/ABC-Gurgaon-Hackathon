"""Centralised application configuration via pydantic-settings.

All secrets and tunables are loaded from environment variables or a .env file.
No secret is ever hardcoded or committed to source control.
"""

from __future__ import annotations

from enum import Enum
from functools import lru_cache
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """Application settings loaded from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── General ──────────────────────────────────────────────────────────
    environment: Environment = Environment.DEVELOPMENT
    app_name: str = "MediKiosk AI"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"
    enable_docs: bool = False

    # ── Server ───────────────────────────────────────────────────────────
    host: str = "127.0.0.1"
    port: int = 8000
    allowed_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
    )

    # ── LLM — Groq (sole LLM provider) ───────────────────────────────────
    groq_api_key: Optional[str] = None
    groq_model: str = "openai/gpt-oss-120b"
    groq_max_tokens: int = 8192
    groq_temperature: float = 0.2
    groq_vision_model: str = "qwen/qwen3.6-27b"
    llm_request_timeout_seconds: float = 10.0

    # ── Bhashini API (Government AI Platform) ────────────────────────────
    bhashini_udyat_key: Optional[str] = None
    bhashini_user_id: str = "medikiosk"
    bhashini_inference_key: Optional[str] = None
    bhashini_pipeline_url: str = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
    bhashini_asr_model: str = "bhashini/ai4bharat/conformer-multilingual-asr"
    bhashini_asr_en_model: str = "ai4bharat/whisper-medium-en--gpu--t4"
    bhashini_tts_model: str = "Bhashini/IITM/TTS"
    bhashini_nmt_model: str = "ai4bharat/indictrans-v2-all-gpu--t4"
    bhashini_ocr_printed_model: str = "bhashini/iiith-bhasha-ocr"
    bhashini_ocr_handwritten_model: str = "bhashini/iiith/ocr-hw-bhaasha"
    bhashini_tld_model: str = "bhashini/indic-lang-detection-all"
    bhashini_ald_model: str = "bhashini/iitmandi/audio-lang-detection/gpu"

    # ── OCR ──────────────────────────────────────────────────────────────
    # Azure Document Intelligence is the primary production OCR provider.
    # Bhashini/Groq Vision/Tesseract remain available as explicit providers.
    ocr_provider: str = "azure"  # "azure" | "bhashini" | "groq_vision" | "tesseract"
    azure_document_intelligence_endpoint: Optional[str] = None
    azure_document_intelligence_key: Optional[str] = None
    azure_document_intelligence_api_version: str = "2024-11-30"
    tesseract_cmd: Optional[str] = None

    # ── Medical NLP ─────────────────────────────────────────────────────
    # Azure Text Analytics for Health provides a specialist medical entity/
    # assertion extraction signal; the existing LLM remains available for
    # contextual normalization and fields not covered by the health API.
    medical_nlp_provider: str = "azure"
    azure_language_endpoint: Optional[str] = None
    azure_language_key: Optional[str] = None
    azure_language_api_version: str = "2023-04-01"

    # ── ASR — Speech-to-Text ─────────────────────────────────────────────
    asr_provider: str = "bhashini"  # "bhashini" | "groq_whisper"
    whisper_model: str = "whisper-large-v3-turbo"

    # ── TTS — Text-to-Speech ─────────────────────────────────────────────
    tts_provider: str = "bhashini"  # "bhashini" | "edge_tts"

    # ── Database ─────────────────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./medikiosk_dev.db"
    database_echo: bool = False

    # ── Redis ────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    session_ttl_seconds: int = 1800  # 30 minutes

    # ── Security ─────────────────────────────────────────────────────────
    secret_key: str = "CHANGE-ME-IN-PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60

    # ── Rate Limiting ────────────────────────────────────────────────────
    rate_limit_per_minute: int = 60

    # ── File Storage ─────────────────────────────────────────────────────
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 20

    @field_validator("secret_key")
    @classmethod
    def _warn_default_secret(cls, v: str) -> str:
        if v == "CHANGE-ME-IN-PRODUCTION":
            import warnings
            warnings.warn(
                "Using default secret key. Set SECRET_KEY env var in production.",
                stacklevel=2,
            )
        return v

    @property
    def is_production(self) -> bool:
        return self.environment == Environment.PRODUCTION

    @property
    def primary_llm_available(self) -> bool:
        return self.groq_api_key is not None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached singleton settings instance."""
    return Settings()
