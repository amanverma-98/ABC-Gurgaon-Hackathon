"""Pytest fixtures and shared test configuration."""

from __future__ import annotations

import asyncio
from typing import AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.config import Settings


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_settings() -> Settings:
    """Test settings with no real API keys."""
    return Settings(
        environment="development",
        groq_api_key=None,
        bhashini_udyat_key=None,
        bhashini_inference_key=None,
        database_url="sqlite+aiosqlite:///./test.db",
        redis_url="redis://localhost:6379/1",
        secret_key="test-secret-key",
    )


@pytest.fixture
def mock_llm_service():
    """Mock LLM service that returns structured responses."""
    mock = MagicMock()
    mock.is_available = True

    async def mock_generate(system_prompt, user_prompt, **kwargs):
        return '{"question_id": "test_q1", "phase": "chief_complaint", "prompt": "What brings you here today?"}'

    async def mock_generate_json(system_prompt, user_prompt, **kwargs):
        return {
            "question_id": "test_q1",
            "phase": "chief_complaint",
            "prompt": "What brings you here today?",
            "question_type": "multi_select",
            "options": [
                {"value": "pain", "label": "Pain"},
                {"value": "fever", "label": "Fever"},
            ],
            "clinical_context": "Initial complaint assessment",
            "section_complete": False,
            "red_flags_detected": [],
        }

    mock.generate = AsyncMock(side_effect=mock_generate)
    mock.generate_json = AsyncMock(side_effect=mock_generate_json)
    return mock


@pytest.fixture
def mock_ocr_service():
    """Mock OCR service."""
    mock = MagicMock()
    mock.is_available = True

    mock.assess_image_quality = MagicMock(return_value=MagicMock(
        width=1920, height=1080, status="acceptable", issues=[], to_dict=lambda: {
            "width": 1920, "height": 1080, "status": "acceptable", "issues": [],
        },
    ))

    async def mock_extract(image_bytes, language_hints=None):
        return {
            "text": "Patient: John Doe\nHb: 13.5 g/dL\nFasting Blood Sugar: 95 mg/dL",
            "confidence": 0.95,
            "language": "en",
            "pages": 1,
        }

    mock.extract_text = AsyncMock(side_effect=mock_extract)
    return mock


@pytest.fixture
def mock_asr_service():
    """Mock ASR service."""
    mock = MagicMock()
    mock.is_available = True

    async def mock_transcribe(audio_bytes, language="en", **kwargs):
        return {
            "text": "I have chest pain since morning",
            "confidence": 0.92,
            "language": language,
            "alternatives": [],
        }

    async def mock_quality(audio_bytes):
        return {"status": "acceptable", "rms_level": 5000.0, "duration_estimate_sec": 3.0, "issues": []}

    mock.transcribe = AsyncMock(side_effect=mock_transcribe)
    mock.assess_audio_quality = AsyncMock(side_effect=mock_quality)
    return mock


@pytest.fixture
def mock_tts_service():
    """Mock TTS service."""
    mock = MagicMock()
    mock.is_available = True

    async def mock_synthesize(text, language="en", **kwargs):
        return {"audio_base64": "dGVzdA==", "encoding": "MP3", "duration_estimate_sec": 2.0}

    mock.synthesize = AsyncMock(side_effect=mock_synthesize)
    return mock


@pytest.fixture
def sample_conversation_history() -> list[dict]:
    """Sample conversation history for testing."""
    return [
        {"question_id": "emergency_screen_1", "question": "Any emergency symptoms?", "answer": "none"},
        {"question_id": "chief_complaint_1", "question": "What brings you here?", "answer": "chest pain since yesterday"},
        {"question_id": "hpi_1", "question": "Where is the pain?", "answer": "center of chest"},
        {"question_id": "hpi_2", "question": "Severity 0-10?", "answer": "7"},
        {"question_id": "hpi_3", "question": "Does it spread anywhere?", "answer": "left arm"},
        {"question_id": "hpi_4", "question": "Associated symptoms?", "answer": "sweating, nausea"},
    ]


@pytest.fixture
def sample_entities() -> list[dict]:
    """Sample extracted entities for testing."""
    return [
        {
            "id": "ent_001",
            "kind": "lab-result",
            "label": "Haemoglobin",
            "value": "8.5",
            "unit": "g/dL",
            "reference_range": "12.0-17.5 g/dL",
            "abnormal_flag": "low",
            "confidence": 0.95,
            "verification_status": "needs-review",
            "source_text": "Hb: 8.5 g/dL",
        },
        {
            "id": "ent_002",
            "kind": "medicine",
            "label": "Aspirin",
            "dosage": "75mg",
            "frequency": "once daily",
            "route": "oral",
            "confidence": 0.9,
            "verification_status": "needs-review",
            "source_text": "Tab Aspirin 75mg OD",
        },
    ]
