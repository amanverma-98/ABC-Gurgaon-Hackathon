"""Structured audit logging for compliance and traceability.

Every clinical action is logged with session context, actor, and timestamp.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

import structlog

logger = structlog.get_logger(__name__)


class AuditEventType(str, Enum):
    SESSION_CREATED = "session.created"
    SESSION_CLOSED = "session.closed"
    CONSENT_GRANTED = "consent.granted"
    CONSENT_WITHDRAWN = "consent.withdrawn"
    CONVERSATION_STARTED = "conversation.started"
    CONVERSATION_TURN = "conversation.turn"
    CONVERSATION_COMPLETED = "conversation.completed"
    DOCUMENT_UPLOADED = "document.uploaded"
    DOCUMENT_PROCESSED = "document.processed"
    SUMMARY_GENERATED = "summary.generated"
    SUMMARY_EDITED = "summary.edited"
    SUMMARY_ACCEPTED = "summary.accepted"
    SUMMARY_REJECTED = "summary.rejected"
    RED_FLAG_TRIGGERED = "red_flag.triggered"
    FHIR_PREVIEW_GENERATED = "fhir.preview_generated"
    SPEECH_TRANSCRIBED = "speech.transcribed"
    ERROR = "error"


async def log_audit_event(
    event_type: AuditEventType,
    session_id: Optional[str] = None,
    actor: str = "system",
    detail: Optional[dict[str, Any]] = None,
) -> None:
    """Log an audit event.

    In production, this should persist to the audit_log database table.
    For now, it logs structurally via structlog.
    """
    event = {
        "event_type": event_type.value,
        "session_id": session_id,
        "actor": actor,
        "detail": detail or {},
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    logger.info("audit_event", **event)

    # In production, persist to database:
    # from app.infrastructure.database import get_db_session, AuditRecord
    # async for session in get_db_session():
    #     record = AuditRecord(
    #         session_id=session_id,
    #         event_type=event_type.value,
    #         actor=actor,
    #         detail=detail,
    #     )
    #     session.add(record)
    #     await session.commit()
