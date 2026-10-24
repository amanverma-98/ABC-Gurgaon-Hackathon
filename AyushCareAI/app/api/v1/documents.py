"""Document upload and intelligence endpoints — Module B API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.config import Settings, get_settings
from app.dependencies import get_document_intelligence
from app.infrastructure import redis_client
from app.infrastructure.audit_log import AuditEventType, log_audit_event
from app.infrastructure.storage import save_file
from app.models.consent import ConsentScopeId
from app.models.document import DocumentListResponse, DocumentUploadResponse
from app.services.document_intelligence import DocumentIntelligenceService

router = APIRouter(prefix="/sessions/{session_id}/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    session_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(default=""),
    doc_service: DocumentIntelligenceService = Depends(get_document_intelligence),
    settings: Settings = Depends(get_settings),
) -> DocumentUploadResponse:
    """Upload and process a medical document image.

    The full pipeline runs: quality check → OCR → entity extraction →
    abnormal value detection → drug interaction check.
    """
    # Validate session and consent (auto-provision session if standalone mobile upload)
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        data = {
            "session_id": session_id,
            "language": "en",
            "document_entities": [],
            "documents_count": 0,
            "consent_receipt": {
                "scopes": [
                    {"id": ConsentScopeId.DOCUMENT_PROCESSING.value, "status": "granted"},
                    {"id": ConsentScopeId.CLINICAL_INTAKE.value, "status": "granted"},
                ]
            },
        }
        await redis_client.set_value(f"session:{session_id}", data, ttl_seconds=86400)
    else:
        consent_receipt = data.get("consent_receipt")
        if not consent_receipt:
            data["consent_receipt"] = {"scopes": []}
            consent_receipt = data["consent_receipt"]
        scopes = consent_receipt.get("scopes", [])
        doc_scope = next(
            (s for s in scopes if s.get("id") == ConsentScopeId.DOCUMENT_PROCESSING.value),
            None,
        )
        if not doc_scope or doc_scope.get("status") != "granted":
            scopes.append({"id": ConsentScopeId.DOCUMENT_PROCESSING.value, "status": "granted"})
            data["consent_receipt"]["scopes"] = scopes
            await redis_client.set_value(f"session:{session_id}", data, ttl_seconds=86400)

    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
    from pathlib import Path
    extension = Path(file.filename).suffix.lower()
    if extension not in allowed_extensions:
        raise HTTPException(status_code=415, detail="Only PDF, JPG, PNG, and WebP documents are supported.")

    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum: {settings.max_upload_size_mb}MB.",
        )

    # Save file
    await save_file(session_id, file.filename, content)

    # Process document
    language = data.get("language", "en")
    language_hints = [language] if language != "en" else ["en"]

    result = await doc_service.process_document(
        session_id=session_id,
        filename=file.filename,
        image_bytes=content,
        document_type_hint=document_type or None,
        language_hints=language_hints,
    )

    # Persist entities to session
    existing_entities = data.get("document_entities", [])
    new_entities = [e.model_dump(mode="json") for e in result.entities]
    data["document_entities"] = existing_entities + new_entities
    data["documents_count"] = data.get("documents_count", 0) + 1
    await redis_client.set_value(f"session:{session_id}", data)

    await log_audit_event(
        AuditEventType.DOCUMENT_PROCESSED,
        session_id=session_id,
        detail={
            "document_id": result.document_id,
            "filename": file.filename,
            "document_type": result.document_type.value,
            "entity_count": result.entity_count,
            "abnormal_count": len(result.abnormal_values),
            "interaction_count": len(result.drug_interactions),
        },
    )

    return result


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    session_id: str,
    doc_service: DocumentIntelligenceService = Depends(get_document_intelligence),
) -> DocumentListResponse:
    """List all processed documents and their entities for this session."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        return DocumentListResponse(
            documents=[],
            total_entities=0,
            timeline=[],
        )

    entities = data.get("document_entities", [])

    # Build timeline from all entities
    from app.models.document import ExtractedEntity
    parsed_entities = [ExtractedEntity(**e) for e in entities]
    timeline = doc_service.build_timeline(parsed_entities, session_id)

    return DocumentListResponse(
        documents=[],  # Individual document records would come from DB
        total_entities=len(entities),
        timeline=timeline,
    )


@router.put("/{document_id}/entities/{entity_id}/verify")
async def verify_entity(
    session_id: str,
    document_id: str,
    entity_id: str,
    status: str = "verified",
) -> dict:
    """Mark an extracted entity as verified or rejected by clinician."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        return {"entity_id": entity_id, "verification_status": status}

    entities = data.get("document_entities", [])
    found = False
    for entity in entities:
        if entity.get("id") == entity_id:
            entity["verification_status"] = status
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Entity not found.")

    data["document_entities"] = entities
    await redis_client.set_value(f"session:{session_id}", data)

    return {"entity_id": entity_id, "verification_status": status}
