"""Tests for FHIR mapper."""

from __future__ import annotations

import pytest

from app.models.document import AbnormalFlag, EntityKind, ExtractedEntity
from app.models.summary import PhysicianSummaryResponse, SummaryLanguage, SummarySection
from app.services.fhir_mapper import FHIRMapper


class TestFHIRMapper:

    def test_builds_bundle_with_consent_and_qr(self):
        mapper = FHIRMapper()
        result = mapper.build_preview(
            session_id="test-sess",
            patient_id="P001",
            consent_scopes=[
                {"id": "clinical-intake", "title": "Clinical History"},
            ],
            conversation_history=[
                {"question_id": "q1", "question": "Chief complaint?", "answer": "Headache"},
            ],
        )

        bundle = result.bundle
        assert bundle.resourceType == "Bundle"
        assert len(bundle.entry) >= 2  # Consent + QuestionnaireResponse

        resource_types = [e["resource"]["resourceType"] for e in bundle.entry]
        assert "Consent" in resource_types
        assert "QuestionnaireResponse" in resource_types

    def test_includes_composition_when_summary_provided(self):
        mapper = FHIRMapper()
        summary = PhysicianSummaryResponse(
            session_id="test",
            generated_at="2024-01-01T00:00:00",
            language=SummaryLanguage.EN,
            sections=[
                SummarySection(id="hpi", heading_en="HPI", heading_hi="HPI", body="Pain assessment"),
            ],
        )

        result = mapper.build_preview(
            session_id="test",
            patient_id="P001",
            consent_scopes=[],
            conversation_history=[],
            summary=summary,
        )

        resource_types = [e["resource"]["resourceType"] for e in result.bundle.entry]
        assert "Composition" in resource_types

    def test_includes_observations_for_lab_results(self):
        mapper = FHIRMapper()
        entities = [
            ExtractedEntity(
                id="ent1",
                kind=EntityKind.LAB_RESULT,
                label="Haemoglobin",
                value="8.5",
                unit="g/dL",
                reference_range="12-17.5 g/dL",
                abnormal_flag=AbnormalFlag.LOW,
                confidence=0.95,
                source_text="Hb: 8.5 g/dL",
            ),
        ]

        result = mapper.build_preview(
            session_id="test",
            patient_id="P001",
            consent_scopes=[],
            conversation_history=[],
            entities=entities,
        )

        resource_types = [e["resource"]["resourceType"] for e in result.bundle.entry]
        assert "Observation" in resource_types

    def test_includes_medication_statements(self):
        mapper = FHIRMapper()
        entities = [
            ExtractedEntity(
                id="ent2",
                kind=EntityKind.MEDICINE,
                label="Aspirin",
                dosage="75mg",
                frequency="once daily",
                route="oral",
                confidence=0.9,
                source_text="Tab Aspirin 75mg OD",
            ),
        ]

        result = mapper.build_preview(
            session_id="test",
            patient_id="P001",
            consent_scopes=[],
            conversation_history=[],
            entities=entities,
        )

        resource_types = [e["resource"]["resourceType"] for e in result.bundle.entry]
        assert "MedicationStatement" in resource_types

    def test_export_is_always_blocked(self):
        mapper = FHIRMapper()
        result = mapper.build_preview(
            session_id="test",
            patient_id="P001",
            consent_scopes=[],
            conversation_history=[],
        )

        assert result.export_blocked is True
        assert "clinician acceptance" in result.export_blocked_reason.lower()
