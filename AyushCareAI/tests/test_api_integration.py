"""End-to-end integration tests for MediKiosk REST API endpoints."""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.dependencies import (
    get_asr_service,
    get_clinical_summary_service,
    get_conversation_engine,
    get_document_intelligence,
    get_llm_service,
    get_ocr_service,
    get_tts_service,
)
from app.main import app
from app.services.conversation_engine import ConversationEngine


@pytest_asyncio.fixture
async def async_client(
    mock_llm_service,
    mock_ocr_service,
    mock_asr_service,
    mock_tts_service,
) -> AsyncClient:
    """Async HTTP client with overridden AI dependencies."""
    test_engine = ConversationEngine(
        llm=mock_llm_service,
        asr=mock_asr_service,
        tts=mock_tts_service,
    )

    app.dependency_overrides[get_llm_service] = lambda: mock_llm_service
    app.dependency_overrides[get_ocr_service] = lambda: mock_ocr_service
    app.dependency_overrides[get_asr_service] = lambda: mock_asr_service
    app.dependency_overrides[get_tts_service] = lambda: mock_tts_service
    app.dependency_overrides[get_conversation_engine] = lambda: test_engine

    from app.config import get_settings
    from app.infrastructure.storage import init_storage
    await init_storage(get_settings())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
class TestAPIIntegration:

    async def test_health_check_endpoint(self, async_client: AsyncClient):
        """Verify health check returns valid JSON status with provider flags."""
        response = await async_client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "medikiosk-ai"
        assert "tts_available" in data
        assert data["tts_available"] is True

    async def test_full_patient_intake_flow(self, async_client: AsyncClient):
        """Test complete lifecycle: session -> consent -> conversation -> summary -> FHIR."""
        # 1. Create Session
        create_res = await async_client.post(
            "/api/v1/sessions",
            json={
                "patient_id": "P_TEST_1001",
                "facility_id": "AIIA_DELHI",
                "language": "hi",
                "intake_pathway": "ayush",
            },
        )
        assert create_res.status_code == 201
        session_id = create_res.json()["id"]
        assert session_id.startswith("sess_")

        # 2. Get Consent Scopes
        scopes_res = await async_client.get(f"/api/v1/sessions/{session_id}/consent/scopes")
        assert scopes_res.status_code == 200
        assert len(scopes_res.json()["scopes"]) == 3

        # 3. Grant Consent
        consent_res = await async_client.post(
            f"/api/v1/sessions/{session_id}/consent",
            json={
                "clinical_intake": True,
                "document_processing": True,
                "his_abdm_sharing": True,
            },
        )
        assert consent_res.status_code == 200
        receipt = consent_res.json()["receipt"]
        assert len(receipt["scopes"]) == 3

        # 4. Start Conversation
        start_res = await async_client.post(
            f"/api/v1/sessions/{session_id}/conversation/start",
            json={"intake_pathway": "ayush"},
        )
        assert start_res.status_code == 200
        state = start_res.json()
        assert state["phase"] == "emergency_screen"
        assert state["current_question"] is not None

        # 5. Submit Text Answer
        answer_res = await async_client.post(
            f"/api/v1/sessions/{session_id}/conversation/answer",
            json={
                "question_id": "emergency_screen_1",
                "answer": "none",
                "input_mode": "text",
            },
        )
        assert answer_res.status_code == 200
        turn = answer_res.json()
        assert turn["acknowledged"] is True

        # 6. FHIR R4 Preview Generation
        fhir_res = await async_client.get(f"/api/v1/sessions/{session_id}/fhir/preview")
        assert fhir_res.status_code == 200
        fhir_data = fhir_res.json()
        assert fhir_data["export_blocked"] is True
        assert fhir_data["bundle"]["resourceType"] == "Bundle"

        # 7. Close Session
        close_res = await async_client.delete(f"/api/v1/sessions/{session_id}")
        assert close_res.status_code == 204

        deleted_res = await async_client.get(f"/api/v1/sessions/{session_id}")
        assert deleted_res.status_code == 404
