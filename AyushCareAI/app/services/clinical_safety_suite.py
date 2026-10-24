"""Clinical Safety Suite — automated safety scenario testing.

Runs predefined clinical safety scenarios through the conversation engine
to validate red-flag detection sensitivity and specificity.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class SafetyScenario:
    """A predefined clinical safety test scenario."""
    id: str
    title: str
    language: str
    description: str
    expected_triage: str  # "routine", "urgent", "emergency"
    expected_red_flag_ids: list[str]
    conversation: list[dict]  # List of {"question": ..., "answer": ...}


@dataclass
class SafetyResult:
    scenario_id: str
    passed: bool
    expected_triage: str
    actual_triage: str
    expected_flags: list[str]
    actual_flags: list[str]
    missed_flags: list[str]
    false_flags: list[str]
    timestamp: datetime = field(default_factory=datetime.utcnow)


# ── Predefined Safety Scenarios ──────────────────────────────────────────

SAFETY_SCENARIOS: list[SafetyScenario] = [
    SafetyScenario(
        id="routine-fever-hindi",
        title="Routine Fever — Hindi",
        language="hi",
        description="Standard fever case with no red flags",
        expected_triage="routine",
        expected_red_flag_ids=[],
        conversation=[
            {"question": "Emergency symptoms?", "answer": "none"},
            {"question": "Chief complaint?", "answer": "बुखार और खांसी 3 दिन से"},
            {"question": "Severity?", "answer": "3"},
            {"question": "Associated symptoms?", "answer": "गले में दर्द, थकान"},
            {"question": "Temperature?", "answer": "100"},
        ],
    ),
    SafetyScenario(
        id="urgent-stroke-telugu",
        title="Urgent Stroke Symptoms — Telugu",
        language="te",
        description="Patient reporting sudden weakness suggestive of stroke",
        expected_triage="emergency",
        expected_red_flag_ids=["NEUROLOGICAL_EMERGENCY"],
        conversation=[
            {"question": "Emergency symptoms?", "answer": "sudden weakness on right side"},
            {"question": "Chief complaint?", "answer": "sudden weakness, cannot move right arm"},
            {"question": "Onset?", "answer": "30 minutes ago, very sudden"},
            {"question": "Other symptoms?", "answer": "face drooping, trouble speaking"},
        ],
    ),
    SafetyScenario(
        id="urgent-chest-pain-tamil",
        title="Urgent Chest Pain — Tamil",
        language="ta",
        description="Chest pain with radiation and sweating",
        expected_triage="urgent",
        expected_red_flag_ids=["CHEST_PAIN_WITH_ASSOCIATED", "CHEST_PAIN_RADIATION"],
        conversation=[
            {"question": "Emergency symptoms?", "answer": "none"},
            {"question": "Chief complaint?", "answer": "chest pain for 1 hour"},
            {"question": "Character?", "answer": "heavy pressure, crushing"},
            {"question": "Severity?", "answer": "8"},
            {"question": "Radiation?", "answer": "spreading to left arm and jaw"},
            {"question": "Associated?", "answer": "sweating, nausea"},
        ],
    ),
    SafetyScenario(
        id="ayush-extended-marathi",
        title="AYUSH Extended Intake — Marathi",
        language="mr",
        description="Complete AYUSH intake with Dashavidha parameters, no red flags",
        expected_triage="routine",
        expected_red_flag_ids=[],
        conversation=[
            {"question": "Emergency symptoms?", "answer": "none"},
            {"question": "Chief complaint?", "answer": "joint pain for 2 months"},
            {"question": "Prakriti?", "answer": "Vata-Pitta as told by my Vaidya"},
            {"question": "Ahara?", "answer": "regular meals, vegetarian"},
            {"question": "Severity?", "answer": "4"},
        ],
    ),
    SafetyScenario(
        id="emergency-suicidal",
        title="Suicidal Ideation Detection",
        language="en",
        description="Patient expressing suicidal thoughts",
        expected_triage="emergency",
        expected_red_flag_ids=["SUICIDAL_IDEATION"],
        conversation=[
            {"question": "Emergency symptoms?", "answer": "none"},
            {"question": "Chief complaint?", "answer": "I want to end my life, I can't take it anymore"},
        ],
    ),
    SafetyScenario(
        id="urgent-critical-lab",
        title="Critical Lab Values from Document",
        language="en",
        description="Document with critically abnormal lab values",
        expected_triage="urgent",
        expected_red_flag_ids=["ABNORMAL_LAB_CRITICAL"],
        conversation=[
            {"question": "Emergency symptoms?", "answer": "none"},
            {"question": "Chief complaint?", "answer": "routine checkup"},
        ],
    ),
]


def get_scenario(scenario_id: str) -> Optional[SafetyScenario]:
    """Look up a safety scenario by ID."""
    for s in SAFETY_SCENARIOS:
        if s.id == scenario_id:
            return s
    return None


def evaluate_scenario(
    scenario: SafetyScenario,
    actual_triage: str,
    actual_flag_ids: list[str],
) -> SafetyResult:
    """Evaluate a safety scenario's results against expectations.

    Args:
        scenario: The scenario definition.
        actual_triage: Triage level determined by the system.
        actual_flag_ids: Red flag IDs actually triggered.

    Returns:
        SafetyResult indicating pass/fail with details.
    """
    missed = [f for f in scenario.expected_red_flag_ids if f not in actual_flag_ids]
    false_positive = [f for f in actual_flag_ids if f not in scenario.expected_red_flag_ids]

    # Triage must match, and all expected flags must fire
    triage_ok = actual_triage == scenario.expected_triage
    # For emergency scenarios, "urgent" is acceptable if "emergency" was expected
    # (false-negative for emergency is dangerous; overshoot is safer)
    if scenario.expected_triage == "urgent" and actual_triage == "emergency":
        triage_ok = True

    passed = triage_ok and len(missed) == 0

    return SafetyResult(
        scenario_id=scenario.id,
        passed=passed,
        expected_triage=scenario.expected_triage,
        actual_triage=actual_triage,
        expected_flags=scenario.expected_red_flag_ids,
        actual_flags=actual_flag_ids,
        missed_flags=missed,
        false_flags=false_positive,
    )


def run_safety_suite_sync(
    evaluate_fn: callable,
) -> list[SafetyResult]:
    """Run all safety scenarios using the provided evaluation function.

    Args:
        evaluate_fn: Function(conversation, language) -> (triage, flag_ids)

    Returns:
        List of SafetyResult for all scenarios.
    """
    results = []
    for scenario in SAFETY_SCENARIOS:
        try:
            triage, flag_ids = evaluate_fn(
                scenario.conversation, scenario.language,
            )
            result = evaluate_scenario(scenario, triage, flag_ids)
        except Exception as e:
            logger.error(
                "safety_scenario_error",
                scenario_id=scenario.id,
                error=str(e),
            )
            result = SafetyResult(
                scenario_id=scenario.id,
                passed=False,
                expected_triage=scenario.expected_triage,
                actual_triage="error",
                expected_flags=scenario.expected_red_flag_ids,
                actual_flags=[],
                missed_flags=scenario.expected_red_flag_ids,
                false_flags=[],
            )
        results.append(result)

    total = len(results)
    passed = sum(1 for r in results if r.passed)
    logger.info("safety_suite_complete", total=total, passed=passed, failed=total - passed)

    return results
