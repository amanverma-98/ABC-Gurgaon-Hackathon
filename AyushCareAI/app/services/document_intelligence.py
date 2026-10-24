"""Document Intelligence — Module B core service.

Orchestrates the full document processing pipeline:
1. Image quality assessment
2. OCR text extraction
3. LLM-powered entity extraction
4. Abnormal value detection
5. Drug interaction checking
6. Timeline construction
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Optional

import structlog

from app.ai.llm_service import LLMService
from app.ai.azure_health_service import AzureHealthNLP
from app.ai.ocr_service import OCRService
from app.ai.prompts.entity_extraction import (
    ABNORMAL_VALUE_ANALYSIS_SYSTEM,
    ENTITY_EXTRACTION_SYSTEM,
    build_abnormal_analysis_prompt,
    build_entity_extraction_prompt,
)
from app.domain.medical_reference import (
    check_drug_interactions,
    classify_lab_value,
    find_lab_range,
)
from app.models.document import (
    AbnormalFlag,
    DocumentType,
    DocumentUploadResponse,
    DrugInteraction,
    EntityKind,
    ExtractedEntity,
    ImageQualityReport,
    TimelineEvent,
)

logger = structlog.get_logger(__name__)


class DocumentIntelligenceError(Exception):
    """Raised when document processing fails."""


class DocumentIntelligenceService:
    """Full pipeline for medical document digitization and intelligence."""

    def __init__(
        self,
        ocr: OCRService,
        llm: LLMService,
        medical_nlp: Optional[AzureHealthNLP] = None,
    ) -> None:
        self._ocr = ocr
        self._llm = llm
        self._medical_nlp = medical_nlp

    async def process_document(
        self,
        session_id: str,
        filename: str,
        image_bytes: bytes,
        document_type_hint: Optional[str] = None,
        language_hints: Optional[list[str]] = None,
    ) -> DocumentUploadResponse:
        """Process a single uploaded medical document through the full pipeline.

        Args:
            session_id: Current session ID.
            filename: Original filename.
            image_bytes: Raw image bytes.
            document_type_hint: Optional hint for document type.
            language_hints: Optional OCR language hints.

        Returns:
            Complete DocumentUploadResponse with entities, abnormals, interactions.
        """
        document_id = f"doc_{uuid.uuid4().hex[:12]}"
        logger.info(
            "document_processing_started",
            session_id=session_id,
            document_id=document_id,
            filename=filename,
        )

        # Step 1: Image quality assessment. PDFs are valid inputs for Azure
        # Document Intelligence and cannot be inspected reliably by PIL.
        if filename.lower().endswith(".pdf"):
            image_quality = ImageQualityReport(
                width=0,
                height=0,
                status="acceptable",
                issues=[],
            )
        else:
            quality = self._ocr.assess_image_quality(image_bytes)
            image_quality = ImageQualityReport(
                width=quality.width,
                height=quality.height,
                status=quality.status,
                issues=quality.issues,
            )

            if quality.status == "needs-rescan" and quality.width == 0:
                return DocumentUploadResponse(
                    document_id=document_id,
                    filename=filename,
                    document_type=DocumentType.OTHER,
                    processing_status="failed",
                    image_quality=image_quality,
                )

        # Step 2: OCR text extraction
        try:
            ocr_result = await self._ocr.extract_text(
                image_bytes,
                language_hints,
                filename=filename,
            )
            ocr_text = re.sub(r"<think>.*?</think>", "", ocr_result["text"], flags=re.DOTALL).strip()
            detected_language = ocr_result.get("language", "en")
        except Exception as e:
            logger.error("ocr_failed", document_id=document_id, error=str(e))
            return DocumentUploadResponse(
                document_id=document_id,
                filename=filename,
                document_type=DocumentType.OTHER,
                processing_status="ocr_failed",
                image_quality=image_quality,
            )

        if not ocr_text.strip():
            return DocumentUploadResponse(
                document_id=document_id,
                filename=filename,
                document_type=DocumentType.OTHER,
                processing_status="no_text_detected",
                image_quality=image_quality,
                detected_language=detected_language,
            )

        # Step 3: Specialist medical NLP signal. Azure Health currently has
        # limited hosted-language coverage, so only send directly supported
        # languages; unsupported Indian-language OCR remains available to the
        # existing LLM extraction path rather than being mislabeled.
        health_entities: list[dict] = []
        if self._medical_nlp is not None:
            health_language = (detected_language or "en").split("-")[0].lower()
            supported_health_languages = {
                "en", "es", "fr", "de", "it", "pt", "he",
            }
            if health_language in supported_health_languages:
                try:
                    health_result = await self._medical_nlp.analyze(
                        ocr_text, language=health_language
                    )
                    health_entities = health_result.get("entities", [])
                except Exception as e:
                    logger.warning(
                        "azure_health_nlp_failed_continuing_with_llm",
                        document_id=document_id,
                        error=str(e),
                    )

        # Step 4: LLM-powered entity extraction
        entities: list[ExtractedEntity] = []
        doc_type = DocumentType.OTHER

        try:
            extraction_result = await self._llm.generate_json(
                system_prompt=ENTITY_EXTRACTION_SYSTEM,
                user_prompt=build_entity_extraction_prompt(
                    ocr_text, document_type_hint or "",
                ),
                temperature=0.1,
            )

            # Parse document type
            raw_doc_type = extraction_result.get("document_type", "other")
            try:
                doc_type = DocumentType(raw_doc_type)
            except ValueError:
                doc_type = DocumentType.OTHER

            # Parse entities
            for raw_entity in extraction_result.get("entities", []):
                entity = self._parse_entity(raw_entity, document_id)
                entities.append(entity)

        except Exception as e:
            logger.error(
                "entity_extraction_failed",
                document_id=document_id,
                error=str(e),
            )

        # Merge Azure Health entities as a supporting extraction signal before abnormal-value detection.
        self._merge_health_entities(health_entities, entities, document_id)

        # Step 5: Abnormal value detection — use reference ranges + LLM
        abnormal_entities = self._flag_abnormal_values(entities)

        # Step 6: Drug interaction checking
        medications = [
            e.label for e in entities if e.kind == EntityKind.MEDICINE
        ]
        interactions: list[DrugInteraction] = []
        if len(medications) >= 2:
            raw_interactions = check_drug_interactions(medications)
            interactions = [
                DrugInteraction(
                    drug_a=i.drug_a,
                    drug_b=i.drug_b,
                    severity=i.severity,
                    description=i.description,
                )
                for i in raw_interactions
            ]

        logger.info(
            "document_processing_complete",
            document_id=document_id,
            entity_count=len(entities),
            abnormal_count=len(abnormal_entities),
            interaction_count=len(interactions),
        )

        return DocumentUploadResponse(
            document_id=document_id,
            filename=filename,
            document_type=doc_type,
            processing_status="completed",
            image_quality=image_quality,
            ocr_text_preview=ocr_text[:500] if ocr_text else None,
            detected_language=detected_language,
            entity_count=len(entities),
            entities=entities,
            abnormal_values=abnormal_entities,
            drug_interactions=interactions,
        )

    def build_timeline(
        self,
        all_entities: list[ExtractedEntity],
        document_id: str,
    ) -> list[TimelineEvent]:
        """Build a chronological timeline from extracted entities."""
        events: list[TimelineEvent] = []

        # Use date entities to anchor other entities
        dates = [e for e in all_entities if e.kind == EntityKind.DOCUMENT_DATE]

        for entity in all_entities:
            if entity.kind == EntityKind.DOCUMENT_DATE:
                continue

            # Find the nearest date for this entity
            date_str = "unknown"
            if dates:
                date_str = dates[0].value or dates[0].label

            events.append(TimelineEvent(
                date=date_str,
                label=f"{entity.label}: {entity.value or ''} {entity.unit or ''}".strip(),
                entity_kind=entity.kind,
                source_document_id=document_id,
                source_text=entity.source_text,
                verification_status=entity.verification_status,
            ))

        return events

    # ── Internal Helpers ─────────────────────────────────────────────────

    def _merge_health_entities(
        self,
        health_entities: list[dict],
        entities: list[ExtractedEntity],
        document_id: str,
    ) -> None:
        """Merge Azure Health entities without overwriting richer LLM fields."""
        kind_map = {
            "Diagnosis": EntityKind.CONDITION,
            "SymptomOrSign": EntityKind.SYMPTOM,
            "MedicationName": EntityKind.MEDICINE,
            "MedicationClass": EntityKind.MEDICINE,
            "Procedure": EntityKind.PROCEDURE,
            "Allergen": EntityKind.ALLERGY,
            "AnatomicalStructure": EntityKind.CONDITION,
        }

        for raw in health_entities:
            text = (raw.get("text") or "").strip()
            if not text:
                continue
            kind = kind_map.get(raw.get("category"))
            if kind is None:
                continue

            confidence = float(raw.get("confidence", 0.0) or 0.0)
            existing = next(
                (
                    e for e in entities
                    if e.label.strip().lower() == text.lower()
                    and e.kind == kind
                ),
                None,
            )
            if existing:
                existing.confidence = max(existing.confidence, confidence)
                if not existing.source_text:
                    existing.source_text = text
                continue

            entities.append(
                ExtractedEntity(
                    id=f"ent_{uuid.uuid4().hex[:8]}",
                    kind=kind,
                    label=text,
                    confidence=max(0.0, min(1.0, confidence)),
                    verification_status="needs-review",
                    source_text=text,
                )
            )

    def _parse_entity(self, raw: dict, document_id: str) -> ExtractedEntity:
        """Parse a raw entity dict from LLM into ExtractedEntity."""
        try:
            kind = EntityKind(raw.get("kind", "condition"))
        except ValueError:
            kind = EntityKind.CONDITION

        try:
            abnormal = AbnormalFlag(raw.get("abnormal_flag", "unknown"))
        except ValueError:
            abnormal = AbnormalFlag.UNKNOWN

        return ExtractedEntity(
            id=f"ent_{uuid.uuid4().hex[:8]}",
            kind=kind,
            label=raw.get("label", ""),
            value=raw.get("value"),
            unit=raw.get("unit"),
            dosage=raw.get("dosage"),
            frequency=raw.get("frequency"),
            route=raw.get("route"),
            reference_range=raw.get("reference_range"),
            abnormal_flag=abnormal,
            icd_code=raw.get("icd_code"),
            confidence=float(raw.get("confidence", 0.5)),
            verification_status="needs-review",
            source_text=raw.get("source_text", ""),
        )

    def _flag_abnormal_values(
        self, entities: list[ExtractedEntity]
    ) -> list[ExtractedEntity]:
        """Flag entities with abnormal lab values using reference ranges."""
        abnormal = []
        for entity in entities:
            if entity.kind == EntityKind.LAB_RESULT and entity.value:
                try:
                    value = float(entity.value)
                    classification = classify_lab_value(entity.label, value)
                    if classification != "normal" and classification != "unknown":
                        entity.abnormal_flag = AbnormalFlag(classification)
                        abnormal.append(entity)

                        # Also set the reference range if we have it
                        ref = find_lab_range(entity.label)
                        if ref and not entity.reference_range:
                            entity.reference_range = (
                                f"{ref.normal_low}-{ref.normal_high} {ref.unit}"
                            )
                except (ValueError, TypeError):
                    pass
        return abnormal
