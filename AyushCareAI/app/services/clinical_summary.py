"""Clinical Summary Service — Module C core service.

Generates structured, physician-ready clinical summaries by synthesizing
patient conversation history, document entities, and red-flag data
through the LLM.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

import structlog

from app.ai.llm_service import LLMService
from app.ai.prompts.summary_generation import (
    build_summary_generation_prompt,
    build_summary_system_prompt,
)
from app.models.summary import (
    PhysicianSummaryResponse,
    SummaryDecision,
    SummaryLanguage,
    SummarySection,
)

logger = structlog.get_logger(__name__)


class ClinicalSummaryError(Exception):
    """Raised when summary generation fails."""


class ClinicalSummaryService:
    """LLM-powered clinical summary generator."""

    def __init__(self, llm: LLMService) -> None:
        self._llm = llm

    async def generate_summary(
        self,
        session_id: str,
        conversation_history: list[dict],
        document_entities: Optional[list[dict]] = None,
        red_flags: Optional[list[dict]] = None,
        language: SummaryLanguage = SummaryLanguage.EN,
        intake_pathway: str = "general",
    ) -> PhysicianSummaryResponse:
        """Generate a complete physician-ready clinical summary.

        Args:
            session_id: Current session ID.
            conversation_history: Full conversation Q&A history.
            document_entities: Entities extracted from documents.
            red_flags: Red flags triggered during the session.
            language: Output language.
            intake_pathway: 'general' or 'ayush'.

        Returns:
            PhysicianSummaryResponse with structured sections.
        """
        lang_str = language.value if hasattr(language, "value") else str(language)
        try:
            summary_lang = SummaryLanguage(lang_str)
        except ValueError:
            summary_lang = SummaryLanguage.EN

        logger.info(
            "summary_generation_started",
            session_id=session_id,
            language=lang_str,
            qa_count=len(conversation_history),
            entity_count=len(document_entities) if document_entities else 0,
        )

        system_prompt = build_summary_system_prompt(intake_pathway)
        user_prompt = build_summary_generation_prompt(
            conversation_history=conversation_history,
            document_entities=document_entities,
            red_flags=red_flags,
            language=lang_str,
        )

        try:
            response = await self._llm.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.2,
                model_tier="advanced",  # Use advanced model for summaries
            )
        except Exception as e:
            logger.error("summary_generation_failed", error=str(e))
            raise ClinicalSummaryError(f"Summary generation failed: {e}") from e

        # Parse sections
        sections: list[SummarySection] = []
        for raw_section in response.get("sections", []):
            sections.append(SummarySection(
                id=raw_section.get("id", f"section_{uuid.uuid4().hex[:6]}"),
                heading_en=raw_section.get("heading_en", ""),
                heading_hi=raw_section.get("heading_hi", ""),
                body=raw_section.get("body", ""),
                body_local=raw_section.get("body_local"),
                source_question_ids=raw_section.get("source_question_ids", []),
                source_document_ids=raw_section.get("source_document_ids", []),
            ))

        # Build abnormal findings list
        abnormal_findings = response.get("abnormal_findings", [])

        summary = PhysicianSummaryResponse(
            session_id=session_id,
            generated_at=datetime.utcnow(),
            language=summary_lang,
            sections=sections,
            red_flag_summary=response.get("red_flag_summary"),
            abnormal_findings=abnormal_findings,
            decision=SummaryDecision.DRAFT,
            version=1,
        )

        logger.info(
            "summary_generation_complete",
            session_id=session_id,
            section_count=len(sections),
            has_red_flags=bool(response.get("red_flag_summary")),
        )

        return summary

    def apply_edit(
        self,
        summary: PhysicianSummaryResponse,
        section_id: str,
        edited_body: str,
        edit_reason: Optional[str] = None,
    ) -> PhysicianSummaryResponse:
        """Apply a clinician edit to a specific section.

        Returns:
            Updated summary with the edit applied and version incremented.
        """
        for section in summary.sections:
            if section.id == section_id:
                # Track edit history
                summary.edit_history.append({
                    "section_id": section_id,
                    "original_body": section.body,
                    "edited_body": edited_body,
                    "reason": edit_reason,
                    "timestamp": datetime.utcnow().isoformat(),
                })
                section.clinician_edit = edited_body
                section.body = edited_body
                summary.version += 1
                break

        return summary

    def apply_decision(
        self,
        summary: PhysicianSummaryResponse,
        decision: SummaryDecision,
        clinician_notes: Optional[str] = None,
    ) -> PhysicianSummaryResponse:
        """Record the clinician's accept/reject decision on the summary.

        Returns:
            Updated summary with the decision recorded.
        """
        summary.decision = decision
        if clinician_notes:
            summary.edit_history.append({
                "action": "decision",
                "decision": decision.value,
                "notes": clinician_notes,
                "timestamp": datetime.utcnow().isoformat(),
            })

        logger.info(
            "summary_decision_recorded",
            session_id=summary.session_id,
            decision=decision.value,
        )

        return summary
