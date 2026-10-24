"""Summary generation and management endpoints — Module C API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_clinical_summary_service, get_red_flag_detector
from app.infrastructure import redis_client
from app.infrastructure.audit_log import AuditEventType, log_audit_event
from app.models.summary import (
    GenerateSummaryRequest,
    PhysicianSummaryResponse,
    SummaryDecision,
    SummaryDecisionRequest,
    SummaryEditRequest,
    SummaryLanguage,
)
from app.services.clinical_summary import ClinicalSummaryService
from app.services.red_flag_detector import RedFlagDetector

router = APIRouter(prefix="/sessions/{session_id}/summary", tags=["Summary"])


@router.post("/generate", response_model=PhysicianSummaryResponse)
async def generate_summary(
    session_id: str,
    body: GenerateSummaryRequest = GenerateSummaryRequest(),
    summary_service: ClinicalSummaryService = Depends(get_clinical_summary_service),
) -> PhysicianSummaryResponse:
    """Generate a physician-ready clinical summary from conversation and documents."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")

    conversation_history = data.get("conversation_history", [])
    # Use frontend-provided history as fallback when the backend session
    # has no history (e.g. when the kiosk intake proxy doesn't share the
    # same Redis session store as the AI conversation service).
    if not conversation_history and body.conversation_history:
        conversation_history = body.conversation_history
    if not conversation_history:
        raise HTTPException(status_code=400, detail="No conversation history. Complete the interview first.")

    document_entities = data.get("document_entities", []) if body.include_documents else None
    red_flags = data.get("red_flags", [])

    pathway = data.get("intake_pathway", "general")
    include_ayush = body.include_ayush or pathway == "ayush"

    summary = await summary_service.generate_summary(
        session_id=session_id,
        conversation_history=conversation_history,
        document_entities=document_entities,
        red_flags=red_flags if red_flags else None,
        language=body.language,
        intake_pathway="ayush" if include_ayush else "general",
    )

    # Persist summary
    data["summary"] = summary.model_dump(mode="json")
    data["summary_status"] = "generated"
    await redis_client.set_value(f"session:{session_id}", data)

    await log_audit_event(
        AuditEventType.SUMMARY_GENERATED,
        session_id=session_id,
        detail={
            "language": body.language.value,
            "section_count": len(summary.sections),
        },
    )

    return summary


@router.get("", response_model=PhysicianSummaryResponse)
async def get_summary(session_id: str) -> PhysicianSummaryResponse:
    """Retrieve the current summary for this session."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")

    summary_data = data.get("summary")
    if not summary_data:
        raise HTTPException(status_code=404, detail="No summary generated yet.")

    return PhysicianSummaryResponse(**summary_data)


@router.put("/sections/{section_id}", response_model=PhysicianSummaryResponse)
async def edit_section(
    session_id: str,
    section_id: str,
    body: SummaryEditRequest,
    summary_service: ClinicalSummaryService = Depends(get_clinical_summary_service),
) -> PhysicianSummaryResponse:
    """Edit a specific section of the clinical summary."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")

    summary_data = data.get("summary")
    if not summary_data:
        raise HTTPException(status_code=404, detail="No summary generated yet.")

    summary = PhysicianSummaryResponse(**summary_data)
    updated = summary_service.apply_edit(
        summary, section_id, body.edited_body, body.edit_reason,
    )

    data["summary"] = updated.model_dump(mode="json")
    await redis_client.set_value(f"session:{session_id}", data)

    await log_audit_event(
        AuditEventType.SUMMARY_EDITED,
        session_id=session_id,
        detail={"section_id": section_id, "reason": body.edit_reason},
    )

    return updated


@router.post("/decision", response_model=PhysicianSummaryResponse)
async def submit_decision(
    session_id: str,
    body: SummaryDecisionRequest,
    summary_service: ClinicalSummaryService = Depends(get_clinical_summary_service),
) -> PhysicianSummaryResponse:
    """Record the clinician's accept/reject decision on the summary."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")

    summary_data = data.get("summary")
    if not summary_data:
        raise HTTPException(status_code=404, detail="No summary generated yet.")

    summary = PhysicianSummaryResponse(**summary_data)
    updated = summary_service.apply_decision(
        summary, body.decision, body.clinician_notes,
    )

    data["summary"] = updated.model_dump(mode="json")
    data["summary_status"] = body.decision.value
    await redis_client.set_value(f"session:{session_id}", data)

    event_type = (
        AuditEventType.SUMMARY_ACCEPTED
        if body.decision == SummaryDecision.ACCEPTED
        else AuditEventType.SUMMARY_REJECTED
    )
    await log_audit_event(event_type, session_id=session_id)

    return updated
