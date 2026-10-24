"""Consent management endpoints — Module D API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_consent_manager
from app.infrastructure import redis_client
from app.infrastructure.audit_log import AuditEventType, log_audit_event
from app.models.consent import (
    ConsentReceipt,
    ConsentResponse,
    ConsentScopeId,
    ConsentSelectionsRequest,
    ConsentWithdrawRequest,
)
from app.services.consent_manager import ConsentManager

router = APIRouter(prefix="/sessions/{session_id}/consent", tags=["Consent"])


@router.get("/scopes")
async def get_consent_scopes(
    session_id: str,
    consent_mgr: ConsentManager = Depends(get_consent_manager),
) -> dict:
    """Get all consent scope definitions for display to the patient."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")

    language = data.get("language", "en")
    scopes = consent_mgr.get_scope_definitions(language)

    return {
        "scopes": [s.model_dump() for s in scopes],
        "language": language,
    }


@router.post("", response_model=ConsentResponse)
async def grant_consent(
    session_id: str,
    body: ConsentSelectionsRequest,
    consent_mgr: ConsentManager = Depends(get_consent_manager),
) -> ConsentResponse:
    """Record the patient's consent selections."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")

    try:
        receipt = consent_mgr.create_receipt(
            session_id=session_id,
            clinical_intake=body.clinical_intake,
            document_processing=body.document_processing,
            his_abdm_sharing=body.his_abdm_sharing,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Persist
    data["consent_granted"] = True
    data["consent_receipt"] = receipt.model_dump(mode="json")
    await redis_client.set_value(f"session:{session_id}", data)

    await log_audit_event(
        AuditEventType.CONSENT_GRANTED,
        session_id=session_id,
        detail={
            "receipt_id": receipt.id,
            "scopes": [s.id.value for s in receipt.scopes if s.status.value == "granted"],
        },
    )

    return ConsentResponse(receipt=receipt)


@router.get("/receipt", response_model=ConsentReceipt)
async def get_consent_receipt(session_id: str) -> ConsentReceipt:
    """Get the current consent receipt for this session."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")

    receipt_data = data.get("consent_receipt")
    if not receipt_data:
        raise HTTPException(status_code=404, detail="No consent recorded yet.")

    return ConsentReceipt(**receipt_data)


@router.post("/withdraw")
async def withdraw_consent(
    session_id: str,
    body: ConsentWithdrawRequest,
    consent_mgr: ConsentManager = Depends(get_consent_manager),
) -> dict:
    """Withdraw consent for a specific scope."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")

    receipt_data = data.get("consent_receipt")
    if not receipt_data:
        raise HTTPException(status_code=400, detail="No consent to withdraw.")

    receipt = ConsentReceipt(**receipt_data)

    try:
        updated = consent_mgr.withdraw_scope(receipt, body.scope_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    data["consent_receipt"] = updated.model_dump(mode="json")
    await redis_client.set_value(f"session:{session_id}", data)

    await log_audit_event(
        AuditEventType.CONSENT_WITHDRAWN,
        session_id=session_id,
        detail={"scope_id": body.scope_id.value},
    )

    return {"message": f"Consent for '{body.scope_id.value}' withdrawn.", "receipt": updated.model_dump(mode="json")}
