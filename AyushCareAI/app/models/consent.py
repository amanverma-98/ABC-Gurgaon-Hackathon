"""Consent management models for Module D — Consent, Privacy & ABDM."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ConsentScopeId(str, Enum):
    CLINICAL_INTAKE = "clinical-intake"
    DOCUMENT_PROCESSING = "document-processing"
    HIS_ABDM_SHARING = "his-abdm-sharing"


class ConsentStatus(str, Enum):
    GRANTED = "granted"
    DECLINED = "declined"
    WITHDRAWN = "withdrawn"


class ConsentScope(BaseModel):
    """A single consent scope with its purpose and status."""
    id: ConsentScopeId
    title: str
    title_local: Optional[str] = None
    purpose: str
    purpose_local: Optional[str] = None
    required: bool
    status: ConsentStatus


class ConsentSelectionsRequest(BaseModel):
    """Patient's consent selections for each scope."""
    clinical_intake: bool = Field(
        ...,
        description="Required. Must be True to proceed.",
    )
    document_processing: bool = Field(
        default=False,
        description="Optional. Allows processing uploaded documents.",
    )
    his_abdm_sharing: bool = Field(
        default=False,
        description="Optional. Allows sharing with HIS/ABDM.",
    )


class ConsentReceipt(BaseModel):
    """Immutable consent receipt for the session."""
    id: str
    session_id: str
    created_at: datetime
    expires_at: datetime
    scopes: list[ConsentScope]


class ConsentWithdrawRequest(BaseModel):
    scope_id: ConsentScopeId


class ConsentResponse(BaseModel):
    receipt: ConsentReceipt
    message: str = "Consent recorded successfully."
