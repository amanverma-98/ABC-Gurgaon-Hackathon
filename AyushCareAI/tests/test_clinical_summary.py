"""Tests for clinical summary service."""

from __future__ import annotations

import pytest
import pytest_asyncio

from app.models.summary import PhysicianSummaryResponse, SummaryDecision, SummaryLanguage, SummarySection
from app.services.clinical_summary import ClinicalSummaryService


class TestClinicalSummary:

    @pytest.mark.asyncio
    async def test_generate_summary(self, mock_llm_service, sample_conversation_history):
        # Configure mock to return summary-shaped JSON
        async def mock_gen_json(system_prompt, user_prompt, **kwargs):
            return {
                "sections": [
                    {
                        "id": "chief_complaint",
                        "heading_en": "Chief Complaint",
                        "heading_hi": "मुख्य शिकायत",
                        "body": "Patient presents with chest pain since yesterday.",
                        "source_question_ids": ["chief_complaint_1"],
                        "source_document_ids": [],
                    },
                    {
                        "id": "hpi",
                        "heading_en": "History of Present Illness",
                        "heading_hi": "वर्तमान बीमारी का इतिहास",
                        "body": "Central chest pain, severity 7/10, radiating to left arm with sweating and nausea.",
                        "source_question_ids": ["hpi_1", "hpi_2", "hpi_3", "hpi_4"],
                        "source_document_ids": [],
                    },
                ],
                "red_flag_summary": "Chest pain with radiation and associated symptoms flagged.",
                "abnormal_findings": ["Pain severity 7/10", "Radiation to left arm"],
            }
        mock_llm_service.generate_json = pytest_asyncio.fixture(lambda: mock_gen_json)
        mock_llm_service.generate_json = mock_gen_json

        service = ClinicalSummaryService(llm=mock_llm_service)
        summary = await service.generate_summary(
            session_id="test-session",
            conversation_history=sample_conversation_history,
        )

        assert summary.session_id == "test-session"
        assert len(summary.sections) == 2
        assert summary.decision == SummaryDecision.DRAFT
        assert summary.safety_statement

    def test_apply_edit(self):
        summary = PhysicianSummaryResponse(
            session_id="test",
            generated_at="2024-01-01T00:00:00",
            language=SummaryLanguage.EN,
            sections=[
                SummarySection(
                    id="hpi",
                    heading_en="HPI",
                    heading_hi="HPI",
                    body="Original text",
                ),
            ],
            version=1,
        )

        service = ClinicalSummaryService(llm=None)
        updated = service.apply_edit(summary, "hpi", "Edited text", "Corrected duration")

        assert updated.sections[0].body == "Edited text"
        assert updated.version == 2
        assert len(updated.edit_history) == 1
        assert updated.edit_history[0]["reason"] == "Corrected duration"

    def test_apply_decision(self):
        summary = PhysicianSummaryResponse(
            session_id="test",
            generated_at="2024-01-01T00:00:00",
            language=SummaryLanguage.EN,
            sections=[],
        )

        service = ClinicalSummaryService(llm=None)
        updated = service.apply_decision(summary, SummaryDecision.ACCEPTED, "Looks good")

        assert updated.decision == SummaryDecision.ACCEPTED
        assert len(updated.edit_history) == 1
