"""Shared types and base models used across the application."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────────

class SupportedLanguage(str, Enum):
    EN = "en"
    HI = "hi"
    BN = "bn"
    TA = "ta"
    TE = "te"
    MR = "mr"
    GU = "gu"
    KN = "kn"
    ML = "ml"
    PA = "pa"


class InputMode(str, Enum):
    TEXT = "text"
    SPEECH = "speech"
    TOUCH = "touch"


class VerificationStatus(str, Enum):
    NEEDS_REVIEW = "needs-review"
    VERIFIED = "verified"
    REJECTED = "rejected"


class TriageLevel(str, Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    EMERGENCY = "emergency"


# ── Base Models ──────────────────────────────────────────────────────────

class TimestampedModel(BaseModel):
    """Base model with created/updated timestamps."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class SourceEvidence(BaseModel):
    """Links any extracted entity or claim back to its source."""
    source_type: str = Field(
        ...,
        description="Type of source: 'question', 'document', 'speech'",
    )
    source_id: str = Field(..., description="ID of the source question or document")
    text: str = Field(..., description="Original source text")
    page: Optional[int] = None
    line: Optional[int] = None
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score for this evidence",
    )


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    service: str = "medikiosk-ai"
    version: str
    environment: str
    llm_available: bool
    ocr_available: bool
    asr_available: bool
    tts_available: bool = True
    database_connected: bool
    redis_connected: bool
