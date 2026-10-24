"""Document intelligence models for Module B — Document Digitization & Intelligence."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    PRESCRIPTION = "prescription"
    LAB_REPORT = "lab-report"
    DISCHARGE_SUMMARY = "discharge-summary"
    IMAGING_REPORT = "imaging-report"
    OTHER = "other"


class EntityKind(str, Enum):
    MEDICINE = "medicine"
    LAB_RESULT = "lab-result"
    CONDITION = "condition"
    PROCEDURE = "procedure"
    DOCUMENT_DATE = "document-date"
    VITAL_SIGN = "vital-sign"
    ALLERGY = "allergy"
    SYMPTOM = "symptom"


class AbnormalFlag(str, Enum):
    NORMAL = "normal"
    LOW = "low"
    HIGH = "high"
    CRITICAL_LOW = "critical-low"
    CRITICAL_HIGH = "critical-high"
    UNKNOWN = "unknown"


class DrugInteraction(BaseModel):
    """A detected potential drug-drug interaction."""
    drug_a: str
    drug_b: str
    severity: str = Field(
        ..., description="'mild', 'moderate', 'severe'"
    )
    description: str
    source: str = "reference-database"


class ExtractedEntity(BaseModel):
    """A clinical entity extracted from a medical document."""
    id: str
    kind: EntityKind
    label: str
    value: Optional[str] = None
    unit: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    reference_range: Optional[str] = None
    abnormal_flag: AbnormalFlag = AbnormalFlag.UNKNOWN
    icd_code: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    verification_status: str = "needs-review"
    source_text: str = ""
    page: int = 1
    line: int = 0


class ImageQualityReport(BaseModel):
    """Quality assessment of an uploaded document image."""
    width: int
    height: int
    status: str = Field(..., description="'acceptable' or 'needs-rescan'")
    issues: list[str] = Field(default_factory=list)


class DocumentUploadResponse(BaseModel):
    """Response after uploading and processing a document."""
    document_id: str
    filename: str
    document_type: DocumentType
    processing_status: str
    image_quality: Optional[ImageQualityReport] = None
    ocr_text_preview: Optional[str] = Field(
        default=None,
        max_length=500,
        description="First 500 chars of OCR text for confirmation",
    )
    detected_language: Optional[str] = None
    entity_count: int = 0
    entities: list[ExtractedEntity] = Field(default_factory=list)
    abnormal_values: list[ExtractedEntity] = Field(
        default_factory=list,
        description="Entities with out-of-range values",
    )
    drug_interactions: list[DrugInteraction] = Field(default_factory=list)
    processed_at: datetime = Field(default_factory=datetime.utcnow)


class TimelineEvent(BaseModel):
    """A chronologically ordered clinical event from documents."""
    date: str
    label: str
    entity_kind: EntityKind
    source_document_id: str
    source_text: str
    verification_status: str = "needs-review"


class DocumentListResponse(BaseModel):
    """List of all processed documents in a session."""
    documents: list[DocumentUploadResponse]
    total_entities: int
    timeline: list[TimelineEvent]
