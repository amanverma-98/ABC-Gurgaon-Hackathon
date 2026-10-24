"""FHIR R4 Mapper — generates ABDM-compatible FHIR bundles.

Produces preview-only FHIR bundles containing:
- Consent resource
- QuestionnaireResponse
- Composition (clinical summary)
- Observations (lab results)
- MedicationStatements

Export is always blocked — an approved integration gateway and
production consent validation are required for actual ABDM push.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

import structlog

from app.models.document import ExtractedEntity, EntityKind
from app.models.fhir import (
    FHIRBundle,
    FHIRCodeableConcept,
    FHIRCoding,
    FHIRComposition,
    FHIRConsent,
    FHIRMedicationStatement,
    FHIRObservation,
    FHIRPreviewResponse,
    FHIRQuestionnaireResponse,
    FHIRReference,
)
from app.models.summary import PhysicianSummaryResponse

logger = structlog.get_logger(__name__)


class FHIRMapper:
    """Maps MediKiosk data to FHIR R4 resources."""

    def build_preview(
        self,
        session_id: str,
        patient_id: str,
        consent_scopes: list[dict],
        conversation_history: list[dict],
        summary: Optional[PhysicianSummaryResponse] = None,
        entities: Optional[list[ExtractedEntity]] = None,
    ) -> FHIRPreviewResponse:
        """Build a complete FHIR Bundle preview.

        Args:
            session_id: Session ID.
            patient_id: Patient identifier.
            consent_scopes: Granted consent scopes.
            conversation_history: Full Q&A history.
            summary: Generated clinical summary (if available).
            entities: Extracted document entities.

        Returns:
            FHIRPreviewResponse with the bundle and export block.
        """
        entries: list[dict[str, Any]] = []
        patient_ref = FHIRReference(
            reference=f"Patient/{patient_id}",
            display=patient_id,
        )

        # 1. Consent Resource
        consent = self._build_consent(session_id, patient_ref, consent_scopes)
        entries.append({"resource": consent.model_dump(exclude_none=True)})

        # 2. QuestionnaireResponse
        qr = self._build_questionnaire_response(
            session_id, patient_ref, conversation_history,
        )
        entries.append({"resource": qr.model_dump(exclude_none=True)})

        # 3. Composition (Clinical Summary)
        if summary:
            composition = self._build_composition(
                session_id, patient_ref, summary,
            )
            entries.append({"resource": composition.model_dump(exclude_none=True)})

        # 4. Observations (Lab Results)
        if entities:
            for entity in entities:
                if entity.kind == EntityKind.LAB_RESULT:
                    obs = self._build_observation(patient_ref, entity)
                    entries.append({"resource": obs.model_dump(exclude_none=True)})

            # 5. MedicationStatements
            for entity in entities:
                if entity.kind == EntityKind.MEDICINE:
                    med = self._build_medication_statement(patient_ref, entity)
                    entries.append({"resource": med.model_dump(exclude_none=True)})

        bundle = FHIRBundle(
            type="collection",
            entry=entries,
        )

        logger.info(
            "fhir_bundle_built",
            session_id=session_id,
            resource_count=len(entries),
        )

        return FHIRPreviewResponse(bundle=bundle)

    def _build_consent(
        self,
        session_id: str,
        patient_ref: FHIRReference,
        scopes: list[dict],
    ) -> FHIRConsent:
        """Build FHIR Consent resource."""
        provision_data = []
        for scope in scopes:
            provision_data.append({
                "type": "permit",
                "purpose": [{"code": scope.get("id", ""), "display": scope.get("title", "")}],
            })

        return FHIRConsent(
            id=f"consent-{session_id}",
            status="active",
            scope=FHIRCodeableConcept(
                coding=[FHIRCoding(
                    system="http://terminology.hl7.org/CodeSystem/consentscope",
                    code="patient-privacy",
                    display="Patient Privacy",
                )],
            ),
            category=[FHIRCodeableConcept(
                coding=[FHIRCoding(
                    system="http://loinc.org",
                    code="59284-0",
                    display="Consent Document",
                )],
            )],
            patient=patient_ref,
            dateTime=datetime.utcnow().isoformat() + "Z",
            provision={"data": provision_data} if provision_data else None,
        )

    def _build_questionnaire_response(
        self,
        session_id: str,
        patient_ref: FHIRReference,
        conversation_history: list[dict],
    ) -> FHIRQuestionnaireResponse:
        """Build FHIR QuestionnaireResponse from conversation history."""
        items = []
        for i, turn in enumerate(conversation_history):
            items.append({
                "linkId": turn.get("question_id", f"q{i}"),
                "text": turn.get("question", ""),
                "answer": [{"valueString": turn.get("answer", "")}],
            })

        return FHIRQuestionnaireResponse(
            id=f"qr-{session_id}",
            status="completed",
            subject=patient_ref,
            authored=datetime.utcnow().isoformat() + "Z",
            item=items,
        )

    def _build_composition(
        self,
        session_id: str,
        patient_ref: FHIRReference,
        summary: PhysicianSummaryResponse,
    ) -> FHIRComposition:
        """Build FHIR Composition from clinical summary."""
        sections = []
        for section in summary.sections:
            sections.append({
                "title": section.heading_en,
                "text": {
                    "status": "generated",
                    "div": f"<div xmlns='http://www.w3.org/1999/xhtml'>{section.body}</div>",
                },
            })

        return FHIRComposition(
            id=f"comp-{session_id}",
            status="preliminary",
            type=FHIRCodeableConcept(
                coding=[FHIRCoding(
                    system="http://loinc.org",
                    code="11506-3",
                    display="Progress Note",
                )],
            ),
            subject=patient_ref,
            date=datetime.utcnow().isoformat() + "Z",
            title="MediKiosk Clinical Summary",
            section=sections,
        )

    def _build_observation(
        self,
        patient_ref: FHIRReference,
        entity: ExtractedEntity,
    ) -> FHIRObservation:
        """Build FHIR Observation from a lab result entity."""
        value_quantity = None
        if entity.value:
            try:
                value_quantity = {
                    "value": float(entity.value),
                    "unit": entity.unit or "",
                }
            except (ValueError, TypeError):
                value_quantity = {"value": 0, "unit": entity.unit or ""}

        interpretation = []
        if entity.abnormal_flag and entity.abnormal_flag.value != "unknown":
            interpretation.append(FHIRCodeableConcept(
                coding=[FHIRCoding(
                    code=entity.abnormal_flag.value,
                    display=entity.abnormal_flag.value,
                )],
            ))

        ref_ranges = []
        if entity.reference_range:
            ref_ranges.append({"text": entity.reference_range})

        return FHIRObservation(
            id=f"obs-{entity.id}",
            status="preliminary",
            code=FHIRCodeableConcept(text=entity.label),
            subject=patient_ref,
            valueQuantity=value_quantity,
            referenceRange=ref_ranges,
            interpretation=interpretation,
        )

    def _build_medication_statement(
        self,
        patient_ref: FHIRReference,
        entity: ExtractedEntity,
    ) -> FHIRMedicationStatement:
        """Build FHIR MedicationStatement from a medicine entity."""
        dosage = []
        if entity.dosage or entity.frequency or entity.route:
            dosage_entry: dict[str, Any] = {}
            if entity.dosage:
                dosage_entry["doseAndRate"] = [{"doseQuantity": {"value": entity.dosage}}]
            if entity.frequency:
                dosage_entry["text"] = entity.frequency
            if entity.route:
                dosage_entry["route"] = FHIRCodeableConcept(text=entity.route).model_dump()
            dosage.append(dosage_entry)

        return FHIRMedicationStatement(
            id=f"med-{entity.id}",
            status="active",
            medicationCodeableConcept=FHIRCodeableConcept(text=entity.label),
            subject=patient_ref,
            dosage=dosage,
        )
