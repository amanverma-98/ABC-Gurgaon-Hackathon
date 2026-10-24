"""Tests for the clinical safety suite."""

from __future__ import annotations

import pytest

from app.domain.red_flags import evaluate_all_rules
from app.services.clinical_safety_suite import (
    SAFETY_SCENARIOS,
    evaluate_scenario,
    get_scenario,
)


class TestSafetySuite:

    def test_all_scenarios_have_required_fields(self):
        for scenario in SAFETY_SCENARIOS:
            assert scenario.id, "Scenario missing ID"
            assert scenario.title, "Scenario missing title"
            assert scenario.expected_triage in ("routine", "urgent", "emergency")
            assert len(scenario.conversation) > 0

    def test_routine_scenario_passes(self):
        scenario = get_scenario("routine-fever-hindi")
        assert scenario is not None
        result = evaluate_scenario(scenario, "routine", [])
        assert result.passed is True

    def test_emergency_scenario_detects_stroke(self):
        scenario = get_scenario("urgent-stroke-telugu")
        assert scenario is not None

        # Run deterministic rules against scenario answers
        answer_map = {}
        for turn in scenario.conversation:
            q = turn["question"].lower()
            a = turn["answer"]
            if "emergency" in q:
                answer_map["emergency_symptoms"] = a
            elif "complaint" in q:
                answer_map["chief_complaint"] = a

        fired = evaluate_all_rules(answer_map)
        fired_ids = [r.id for r in fired]

        result = evaluate_scenario(scenario, "emergency", fired_ids)
        assert "NEUROLOGICAL_EMERGENCY" in fired_ids
        assert result.passed is True

    def test_chest_pain_scenario(self):
        scenario = get_scenario("urgent-chest-pain-tamil")
        assert scenario is not None

        answer_map = {}
        for turn in scenario.conversation:
            q = turn["question"].lower()
            a = turn["answer"]
            if "complaint" in q:
                answer_map["chief_complaint"] = a
            elif "severity" in q:
                try:
                    answer_map["pain_severity"] = int(a)
                except ValueError:
                    pass
            elif "radiation" in q or "spread" in q:
                answer_map["radiation"] = a
            elif "associated" in q:
                answer_map["associated_symptoms"] = a

        fired = evaluate_all_rules(answer_map)
        fired_ids = [r.id for r in fired]

        # Should detect chest pain flags
        assert "CHEST_PAIN_WITH_ASSOCIATED" in fired_ids or "CHEST_PAIN_RADIATION" in fired_ids

    def test_suicidal_ideation_scenario(self):
        scenario = get_scenario("emergency-suicidal")
        assert scenario is not None

        answer_map = {}
        for turn in scenario.conversation:
            q = turn["question"].lower()
            a = turn["answer"]
            if "complaint" in q:
                answer_map["chief_complaint"] = a

        fired = evaluate_all_rules(answer_map)
        fired_ids = [r.id for r in fired]

        assert "SUICIDAL_IDEATION" in fired_ids

    def test_overshoot_is_acceptable(self):
        """Emergency triage for an urgent scenario should still pass."""
        scenario = get_scenario("urgent-chest-pain-tamil")
        assert scenario is not None
        # Pass all expected flags — this test isolates triage-level overshoot
        result = evaluate_scenario(
            scenario, "emergency",
            ["CHEST_PAIN_WITH_ASSOCIATED", "CHEST_PAIN_RADIATION"],
        )
        # Overshoot (emergency for urgent) is acceptable
        assert result.passed is True
