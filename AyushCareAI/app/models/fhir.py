"""FHIR R4 resource models for ABDM interoperability preview."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class FHIRCoding(BaseModel):
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class FHIRCodeableConcept(BaseModel):
    coding: list[FHIRCoding] = Field(default_factory=list)
    text: Optional[str] = None


class FHIRReference(BaseModel):
    reference: str
    display: Optional[str] = None


class FHIRResource(BaseModel):
    resourceType: str
    id: str
    meta: Optional[dict[str, Any]] = None


class FHIRConsent(FHIRResource):
    resourceType: str = "Consent"
    status: str = "active"
    scope: Optional[FHIRCodeableConcept] = None
    category: list[FHIRCodeableConcept] = Field(default_factory=list)
    patient: Optional[FHIRReference] = None
    dateTime: Optional[str] = None
    provision: Optional[dict[str, Any]] = None


class FHIRQuestionnaireResponse(FHIRResource):
    resourceType: str = "QuestionnaireResponse"
    status: str = "in-progress"
    subject: Optional[FHIRReference] = None
    authored: Optional[str] = None
    item: list[dict[str, Any]] = Field(default_factory=list)


class FHIRComposition(FHIRResource):
    resourceType: str = "Composition"
    status: str = "preliminary"
    type: Optional[FHIRCodeableConcept] = None
    subject: Optional[FHIRReference] = None
    date: Optional[str] = None
    title: Optional[str] = None
    section: list[dict[str, Any]] = Field(default_factory=list)


class FHIRObservation(FHIRResource):
    resourceType: str = "Observation"
    status: str = "preliminary"
    code: Optional[FHIRCodeableConcept] = None
    subject: Optional[FHIRReference] = None
    valueQuantity: Optional[dict[str, Any]] = None
    referenceRange: list[dict[str, Any]] = Field(default_factory=list)
    interpretation: list[FHIRCodeableConcept] = Field(default_factory=list)


class FHIRMedicationStatement(FHIRResource):
    resourceType: str = "MedicationStatement"
    status: str = "active"
    medicationCodeableConcept: Optional[FHIRCodeableConcept] = None
    subject: Optional[FHIRReference] = None
    dosage: list[dict[str, Any]] = Field(default_factory=list)


class FHIRBundle(BaseModel):
    resourceType: str = "Bundle"
    type: str = "collection"
    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat() + "Z",
    )
    entry: list[dict[str, Any]] = Field(default_factory=list)


class FHIRPreviewResponse(BaseModel):
    """FHIR preview response — no network export is performed."""
    bundle: FHIRBundle
    export_blocked: bool = True
    export_blocked_reason: str = (
        "Export requires clinician acceptance, approved integration gateway, "
        "patient identity mapping, and production consent validation."
    )
