"""Session lifecycle endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.infrastructure import redis_client
from app.infrastructure.audit_log import AuditEventType, log_audit_event
from app.infrastructure.storage import delete_session_files
from app.models.session import (
    CreateSessionRequest,
    SessionResponse,
    SessionStatus,
    SetLanguageRequest,
)

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(
    body: CreateSessionRequest,
    settings: Settings = Depends(get_settings),
) -> SessionResponse:
    """Create a new patient intake session."""
    session_id = f"sess_{uuid.uuid4().hex[:16]}"
    now = datetime.utcnow()
    expires = now + timedelta(seconds=settings.session_ttl_seconds)

    session_data = {
        "id": session_id,
        "patient_id": body.patient_id,
        "facility_id": body.facility_id,
        "language": body.language,
        "intake_pathway": body.intake_pathway,
        "status": SessionStatus.ACTIVE.value,
        "created_at": now.isoformat(),
        "expires_at": expires.isoformat(),
        "consent_granted": False,
        "conversation_started": False,
        "documents_count": 0,
        "summary_status": "draft",
        "conversation_state": None,
        "conversation_history": [],
        "document_entities": [],
        "red_flags": [],
        "consent_receipt": None,
        "summary": None,
    }

    await redis_client.set_value(
        f"session:{session_id}",
        session_data,
        ttl_seconds=settings.session_ttl_seconds,
    )

    await log_audit_event(
        AuditEventType.SESSION_CREATED,
        session_id=session_id,
        detail={"patient_id": body.patient_id, "pathway": body.intake_pathway},
    )

    return SessionResponse(
        id=session_id,
        patient_id=body.patient_id,
        facility_id=body.facility_id,
        language=body.language,
        intake_pathway=body.intake_pathway,
        status=SessionStatus.ACTIVE,
        created_at=now,
        expires_at=expires,
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str) -> SessionResponse:
    """Get current session status."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    return SessionResponse(
        id=data["id"],
        patient_id=data["patient_id"],
        facility_id=data["facility_id"],
        language=data["language"],
        intake_pathway=data["intake_pathway"],
        status=SessionStatus(data["status"]),
        created_at=datetime.fromisoformat(data["created_at"]),
        expires_at=datetime.fromisoformat(data["expires_at"]),
        consent_granted=data.get("consent_granted", False),
        conversation_started=data.get("conversation_started", False),
        documents_count=data.get("documents_count", 0),
        summary_status=data.get("summary_status", "draft"),
    )


@router.put("/{session_id}/language", response_model=SessionResponse)
async def set_language(
    session_id: str,
    body: SetLanguageRequest,
) -> SessionResponse:
    """Update the session language."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")

    data["language"] = body.language
    await redis_client.set_value(f"session:{session_id}", data)

    return await get_session(session_id)


@router.delete("/{session_id}", status_code=204)
async def close_session(session_id: str) -> None:
    """Close and clean up a session."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")

    await redis_client.delete_key(f"session:{session_id}")
    await delete_session_files(session_id)

    await log_audit_event(
        AuditEventType.SESSION_CLOSED,
        session_id=session_id,
    )


# ── Helper ───────────────────────────────────────────────────────────────

async def _get_session_data(session_id: str) -> dict:
    """Internal helper to load session data or raise 404."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return data
