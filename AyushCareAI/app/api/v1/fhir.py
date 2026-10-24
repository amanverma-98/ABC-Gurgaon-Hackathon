"""FHIR preview endpoints — Module D API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_fhir_mapper
from app.infrastructure import redis_client
from app.infrastructure.audit_log import AuditEventType, log_audit_event
from app.models.document import ExtractedEntity
from app.models.fhir import FHIRPreviewResponse
from app.models.summary import PhysicianSummaryResponse
from app.services.fhir_mapper import FHIRMapper

router = APIRouter(prefix="/sessions/{session_id}/fhir", tags=["FHIR"])


@router.get("/preview", response_model=FHIRPreviewResponse)
async def fhir_preview(
    session_id: str,
    fhir_mapper: FHIRMapper = Depends(get_fhir_mapper),
) -> FHIRPreviewResponse:
    """Generate a FHIR R4 Bundle preview for ABDM compatibility.

    NOTE: Export is always blocked. This produces a read-only preview
    of the FHIR resources that would be generated.
    """
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")

    patient_id = data.get("patient_id", "unknown")
    conversation_history = data.get("conversation_history", [])

    # Parse consent scopes
    consent_receipt = data.get("consent_receipt")
    scopes = []
    if consent_receipt:
        scopes = consent_receipt.get("scopes", [])

    # Parse summary if available
    summary = None
    summary_data = data.get("summary")
    if summary_data:
        summary = PhysicianSummaryResponse(**summary_data)

    # Parse document entities
    entities = None
    raw_entities = data.get("document_entities", [])
    if raw_entities:
        entities = [ExtractedEntity(**e) for e in raw_entities]

    result = fhir_mapper.build_preview(
        session_id=session_id,
        patient_id=patient_id,
        consent_scopes=scopes,
        conversation_history=conversation_history,
        summary=summary,
        entities=entities,
    )

    await log_audit_event(
        AuditEventType.FHIR_PREVIEW_GENERATED,
        session_id=session_id,
        detail={"resource_count": len(result.bundle.entry)},
    )

    return result
