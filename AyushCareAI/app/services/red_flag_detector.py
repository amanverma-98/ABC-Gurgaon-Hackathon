"""Red Flag Detector — hybrid rule + LLM triage service.

Combines:
1. Deterministic rules (from domain/red_flags.py) for instant detection.
2. LLM-powered analysis for compound/subtle clinical patterns.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

import structlog

from app.ai.llm_service import LLMService
from app.ai.prompts.red_flag_analysis import (
    build_red_flag_analysis_prompt,
    build_red_flag_system_prompt,
)
from app.domain.red_flags import evaluate_all_rules, Severity
from app.models.conversation import RedFlagAlert

logger = structlog.get_logger(__name__)


class RedFlagDetector:
    """Hybrid rule-based + LLM red flag detector."""

    def __init__(self, llm: LLMService) -> None:
        self._llm = llm

    def evaluate_rules(self, answers: dict) -> list[RedFlagAlert]:
        """Run deterministic red-flag rules instantly.

        Args:
            answers: Answer map from the conversation.

        Returns:
            List of triggered RedFlagAlerts.
        """
        fired_rules = evaluate_all_rules(answers)
        alerts = []
        for rule in fired_rules:
            alerts.append(RedFlagAlert(
                id=rule.id,
                level=rule.severity.value,
                title=rule.title,
                patient_message=rule.patient_message,
                patient_message_local=rule.patient_message_hi,
                evidence=[],
            ))
        return alerts

    async def evaluate_with_llm(
        self,
        conversation_history: list[dict],
        document_entities: Optional[list[dict]] = None,
        existing_flags: Optional[list[RedFlagAlert]] = None,
    ) -> list[RedFlagAlert]:
        """Run LLM-augmented red flag analysis.

        This catches compound patterns (e.g., sepsis, anaphylaxis) that
        deterministic rules cannot detect.

        Args:
            conversation_history: Full conversation Q&A.
            document_entities: Extracted document entities.
            existing_flags: Already-detected flags (to avoid duplicates).

        Returns:
            List of newly detected RedFlagAlerts.
        """
        existing_dicts = None
        if existing_flags:
            existing_dicts = [
                {"id": f.id, "level": f.level, "title": f.title}
                for f in existing_flags
            ]

        system_prompt = build_red_flag_system_prompt()
        user_prompt = build_red_flag_analysis_prompt(
            conversation_history=conversation_history,
            document_entities=document_entities,
            existing_flags=existing_dicts,
        )

        try:
            response = await self._llm.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.1,
            )
        except Exception as e:
            logger.error("llm_red_flag_analysis_failed", error=str(e))
            return []

        new_alerts = []
        existing_ids = {f.id for f in (existing_flags or [])}

        for raw_flag in response.get("red_flags", []):
            flag_id = raw_flag.get("id", "")
            if flag_id in existing_ids:
                continue

            confidence = float(raw_flag.get("confidence", 0.5))
            if confidence < 0.4:
                # Skip low-confidence flags to reduce noise
                continue

            alert = RedFlagAlert(
                id=flag_id,
                level=raw_flag.get("level", "urgent"),
                title=raw_flag.get("title", ""),
                patient_message=raw_flag.get("patient_message", ""),
                patient_message_local=raw_flag.get("patient_message_hi"),
                evidence=raw_flag.get("evidence", []),
            )
            new_alerts.append(alert)

        logger.info(
            "llm_red_flag_analysis_complete",
            new_flags_count=len(new_alerts),
            overall_triage=response.get("overall_triage", "routine"),
        )

        return new_alerts

    async def full_evaluation(
        self,
        answers: dict,
        conversation_history: list[dict],
        document_entities: Optional[list[dict]] = None,
    ) -> dict:
        """Run both rule-based and LLM analysis.

        Returns:
            dict with 'rule_alerts', 'llm_alerts', 'all_alerts', 'triage_level'.
        """
        # Step 1: Deterministic rules (instant)
        rule_alerts = self.evaluate_rules(answers)

        # Step 2: LLM analysis (async)
        llm_alerts = await self.evaluate_with_llm(
            conversation_history=conversation_history,
            document_entities=document_entities,
            existing_flags=rule_alerts,
        )

        all_alerts = rule_alerts + llm_alerts

        # Determine overall triage level
        triage = "routine"
        for alert in all_alerts:
            if alert.level == "emergency":
                triage = "emergency"
                break
            if alert.level == "urgent":
                triage = "urgent"

        return {
            "rule_alerts": rule_alerts,
            "llm_alerts": llm_alerts,
            "all_alerts": all_alerts,
            "triage_level": triage,
        }
