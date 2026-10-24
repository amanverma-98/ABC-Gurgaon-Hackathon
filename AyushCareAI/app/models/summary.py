"""Clinical summary models for Module C — Structured History Summary Generator."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SummaryLanguage(str, Enum):
    EN = "en"
    HI = "hi"


class SummaryDecision(str, Enum):
    DRAFT = "draft"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class SummarySection(BaseModel):
    """One section of the physician-ready clinical summary."""
    id: str
    heading_en: str
    heading_hi: str
    body: str
    body_local: Optional[str] = Field(
        default=None,
        description="Body text in patient's local language",
    )
    source_question_ids: list[str] = Field(default_factory=list)
    source_document_ids: list[str] = Field(default_factory=list)
    is_editable: bool = True
    clinician_edit: Optional[str] = None


class GenerateSummaryRequest(BaseModel):
    language: SummaryLanguage = SummaryLanguage.EN
    include_documents: bool = True
    include_ayush: bool = Field(
        default=False,
        description="Auto-detected from intake pathway if not set",
    )
    conversation_history: Optional[list[dict]] = Field(
        default=None,
        description="Optional conversation history forwarded from the frontend. "
                    "Used as fallback if the backend session has no history.",
    )


class SummaryEditRequest(BaseModel):
    edited_body: str = Field(..., min_length=1, max_length=10000)
    edit_reason: Optional[str] = None


class SummaryDecisionRequest(BaseModel):
    decision: SummaryDecision
    clinician_notes: Optional[str] = None


class PhysicianSummaryResponse(BaseModel):
    """Complete physician-ready clinical summary."""
    session_id: str
    generated_at: datetime
    language: SummaryLanguage
    sections: list[SummarySection]
    red_flag_summary: Optional[str] = None
    abnormal_findings: list[str] = Field(default_factory=list)
    safety_statement: str = (
        "Draft for clinician review only. This output does not diagnose, "
        "prescribe, or replace clinical judgement."
    )
    decision: SummaryDecision = SummaryDecision.DRAFT
    version: int = 1
    edit_history: list[dict] = Field(default_factory=list)
