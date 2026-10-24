"""Tests for the conversation engine."""

from __future__ import annotations

import pytest
import pytest_asyncio

from app.models.conversation import ConversationPhase, ConversationState
from app.services.conversation_engine import ConversationEngine


@pytest.mark.asyncio
class TestConversationEngine:

    async def test_start_conversation_returns_first_question(
        self, mock_llm_service, mock_asr_service, mock_tts_service,
    ):
        engine = ConversationEngine(
            llm=mock_llm_service, asr=mock_asr_service, tts=mock_tts_service,
        )
        state = await engine.start_conversation("test-session", "en", "general")

        assert state.session_id == "test-session"
        assert state.phase == ConversationPhase.EMERGENCY_SCREEN
        assert state.current_question is not None
        assert state.is_complete is False
        assert state.progress_percent == 0.0

    async def test_process_answer_advances_conversation(
        self, mock_llm_service, mock_asr_service, mock_tts_service,
    ):
        engine = ConversationEngine(
            llm=mock_llm_service, asr=mock_asr_service, tts=mock_tts_service,
        )
        state = await engine.start_conversation("test-session", "en", "general")

        result = await engine.process_answer(
            state=state,
            answer="none",
            question_id="emergency_screen_1",
            language="en",
        )

        assert result.acknowledged is True
        assert result.answer_confirmed == "none"
        assert result.next_question is not None
        assert len(state.answered_questions) == 1

    async def test_emergency_answer_advances_to_chief_complaint(
        self, mock_llm_service, mock_asr_service, mock_tts_service,
    ):
        engine = ConversationEngine(
            llm=mock_llm_service, asr=mock_asr_service, tts=mock_tts_service,
        )
        state = await engine.start_conversation("test-session", "en", "general")

        result = await engine.process_answer(
            state=state,
            answer="no emergency symptoms",
            question_id="emergency_screen_1",
            language="en",
        )

        # Should advance past emergency screen
        assert state.phase == ConversationPhase.CHIEF_COMPLAINT

    async def test_transcribe_speech_returns_text(
        self, mock_llm_service, mock_asr_service, mock_tts_service,
    ):
        engine = ConversationEngine(
            llm=mock_llm_service, asr=mock_asr_service, tts=mock_tts_service,
        )
        result = await engine.transcribe_speech(b"fake-audio-bytes", "en")

        assert result["text"] == "I have chest pain since morning"
        assert result["confidence"] > 0.0

    async def test_progress_calculation(
        self, mock_llm_service, mock_asr_service, mock_tts_service,
    ):
        engine = ConversationEngine(
            llm=mock_llm_service, asr=mock_asr_service, tts=mock_tts_service,
        )
        state = await engine.start_conversation("test-session", "en", "general")

        # Progress at emergency screen should be 0%
        progress = engine._calculate_progress(state, "general")
        assert progress == 0.0

        # Advance to chief complaint
        state.phase = ConversationPhase.CHIEF_COMPLAINT
        progress = engine._calculate_progress(state, "general")
        assert progress > 0.0

    async def test_ayush_pathway_includes_extra_sections(
        self, mock_llm_service, mock_asr_service, mock_tts_service,
    ):
        engine = ConversationEngine(
            llm=mock_llm_service, asr=mock_asr_service, tts=mock_tts_service,
        )
        state = await engine.start_conversation("test-session", "hi", "ayush")

        # AYUSH pathway should have more total phases
        general_total = 9  # standard sections
        ayush_total = 11  # + 2 AYUSH sections

        state.phase = ConversationPhase.CHIEF_COMPLAINT
        general_progress = engine._calculate_progress(state, "general")
        ayush_progress = engine._calculate_progress(state, "ayush")

        # Same phase should show lower % in ayush (more sections total)
        assert ayush_progress < general_progress
