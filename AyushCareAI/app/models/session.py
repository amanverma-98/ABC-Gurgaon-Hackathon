"""Session lifecycle models."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"
    CLOSED = "closed"


class CreateSessionRequest(BaseModel):
    patient_id: str = Field(..., min_length=1, max_length=128)
    facility_id: str = Field(default="unassigned", max_length=128)
    language: str = Field(default="en", max_length=5)
    intake_pathway: str = Field(
        default="general",
        description="'general' or 'ayush'",
    )


class SessionResponse(BaseModel):
    id: str
    patient_id: str
    facility_id: str
    language: str
    intake_pathway: str
    status: SessionStatus
    created_at: datetime
    expires_at: datetime
    consent_granted: bool = False
    conversation_started: bool = False
    documents_count: int = 0
    summary_status: str = "draft"


class SetLanguageRequest(BaseModel):
    language: str = Field(..., min_length=2, max_length=5)


class SessionSummary(BaseModel):
    """Lightweight session info for listing."""
    id: str
    patient_id: str
    status: SessionStatus
    created_at: datetime
    expires_at: datetime
