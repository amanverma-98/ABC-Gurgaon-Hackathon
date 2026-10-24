"""Conversation endpoints — Module A API.

Handles starting conversations, submitting answers (text/touch/speech),
and retrieving conversation state.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.dependencies import get_conversation_engine
from app.infrastructure import redis_client
from app.infrastructure.audit_log import AuditEventType, log_audit_event
from app.models.conversation import (
    ConversationPhase,
    ConversationStartRequest,
    ConversationState,
    ConversationTurnResponse,
    PatientResponse,
    SpeechInput,
    TTSRequest,
)
from app.services.conversation_engine import ConversationEngine

router = APIRouter(prefix="/sessions/{session_id}/conversation", tags=["Conversation"])


@router.post("/start", response_model=ConversationState)
async def start_conversation(
    session_id: str,
    body: ConversationStartRequest = ConversationStartRequest(),
    engine: ConversationEngine = Depends(get_conversation_engine),
) -> ConversationState:
    """Start the clinical interview for a session.

    Returns the initial emergency screening question.
    """
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not data.get("consent_granted"):
        raise HTTPException(status_code=403, detail="Consent must be granted before starting conversation.")
    if data.get("conversation_started"):
        raise HTTPException(status_code=409, detail="Conversation already started. Use GET to retrieve state.")

    language = data.get("language", "en")
    pathway = body.intake_pathway or data.get("intake_pathway", "general")

    state = await engine.start_conversation(
        session_id=session_id,
        language=language,
        intake_pathway=pathway,
    )

    # Persist state
    data["conversation_started"] = True
    data["conversation_state"] = state.model_dump(mode="json")
    await redis_client.set_value(f"session:{session_id}", data)

    await log_audit_event(
        AuditEventType.CONVERSATION_STARTED,
        session_id=session_id,
        detail={"language": language, "pathway": pathway},
    )

    return state


@router.get("/state", response_model=ConversationState)
async def get_conversation_state(session_id: str) -> ConversationState:
    """Get the current conversation state."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not data.get("conversation_state"):
        raise HTTPException(status_code=404, detail="Conversation not started.")

    return ConversationState(**data["conversation_state"])


@router.post("/answer", response_model=ConversationTurnResponse)
async def submit_answer(
    session_id: str,
    body: PatientResponse,
    engine: ConversationEngine = Depends(get_conversation_engine),
) -> ConversationTurnResponse:
    """Submit a patient's answer (text or touch input) and get the next question."""
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not data.get("conversation_state"):
        raise HTTPException(status_code=400, detail="Conversation not started.")

    state = ConversationState(**data["conversation_state"])
    if state.is_complete:
        raise HTTPException(status_code=409, detail="Conversation already completed.")

    language = data.get("language", "en")
    pathway = data.get("intake_pathway", "general")

    result = await engine.process_answer(
        state=state,
        answer=body.answer,
        question_id=body.question_id,
        language=language,
        intake_pathway=pathway,
        input_mode=body.input_mode,
        asr_confidence=body.confidence,
    )

    # Persist updated state and history
    data["conversation_state"] = state.model_dump(mode="json")
    data["conversation_history"] = state.answered_questions
    data["red_flags"] = [f.model_dump(mode="json") for f in state.red_flags]
    await redis_client.set_value(f"session:{session_id}", data)

    await log_audit_event(
        AuditEventType.CONVERSATION_TURN,
        session_id=session_id,
        detail={
            "question_id": body.question_id,
            "phase": result.phase.value,
            "input_mode": body.input_mode,
            "red_flags_count": len(result.red_flags),
        },
    )

    if result.is_complete:
        await log_audit_event(
            AuditEventType.CONVERSATION_COMPLETED,
            session_id=session_id,
        )

    return result


@router.post("/speech", response_model=ConversationTurnResponse)
async def submit_speech(
    session_id: str,
    question_id: str,
    language: str = "en",
    audio: UploadFile = File(...),
    engine: ConversationEngine = Depends(get_conversation_engine),
) -> ConversationTurnResponse:
    """Submit a speech recording and process it as an answer.

    The audio is transcribed via ASR, then processed as a text answer.
    """
    data = await redis_client.get_json(f"session:{session_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not data.get("conversation_state"):
        raise HTTPException(status_code=400, detail="Conversation not started.")

    state = ConversationState(**data["conversation_state"])
    if state.is_complete:
        raise HTTPException(status_code=409, detail="Conversation already completed.")

    # Read and transcribe audio
    audio_bytes = await audio.read()
    transcription = await engine.transcribe_speech(audio_bytes, language, filename=audio.filename or 'speech.webm')

    if not transcription["text"]:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Could not transcribe speech",
                "quality": transcription.get("quality", {}),
            },
        )

    await log_audit_event(
        AuditEventType.SPEECH_TRANSCRIBED,
        session_id=session_id,
        detail={
            "question_id": question_id,
            "confidence": transcription["confidence"],
            "text_length": len(transcription["text"]),
        },
    )

    # Process transcribed text as an answer
    pathway = data.get("intake_pathway", "general")
    result = await engine.process_answer(
        state=state,
        answer=transcription["text"],
        question_id=question_id,
        language=language,
        intake_pathway=pathway,
        input_mode="speech",
        asr_confidence=transcription["confidence"],
    )

    # Persist
    data["conversation_state"] = state.model_dump(mode="json")
    data["conversation_history"] = state.answered_questions
    data["red_flags"] = [f.model_dump(mode="json") for f in state.red_flags]
    await redis_client.set_value(f"session:{session_id}", data)

    return result


@router.post("/tts")
@router.get("/tts")
async def text_to_speech(
    session_id: str,
    body: Optional[TTSRequest] = None,
    text: Optional[str] = None,
    language: Optional[str] = None,
    engine: ConversationEngine = Depends(get_conversation_engine),
) -> dict:
    """Synthesize a question into speech audio for the patient."""
    effective_text = (body.text if body and body.text else text) or ""
    effective_lang = (body.language if body and body.language else language) or "en"
    if not effective_text:
        raise HTTPException(status_code=400, detail="text is required")
    return await engine.synthesize_question(effective_text, effective_lang)

