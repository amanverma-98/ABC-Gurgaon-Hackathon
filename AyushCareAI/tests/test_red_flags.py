"""Tests for the red flag detection system."""

from __future__ import annotations

import pytest

from app.domain.red_flags import evaluate_all_rules, evaluate_rule, RULE_REGISTRY, Severity


class TestDeterministicRedFlags:
    """Test the rule-based red flag detection."""

    def test_no_red_flags_for_routine_case(self):
        answers = {
            "emergency_symptoms": "none",
            "chief_complaint": "mild headache",
            "pain_severity": 3,
        }
        fired = evaluate_all_rules(answers)
        assert len(fired) == 0

    def test_neurological_emergency_stroke(self):
        answers = {
            "emergency_symptoms": "stroke symptoms, sudden weakness",
        }
        fired = evaluate_all_rules(answers)
        flag_ids = [r.id for r in fired]
        assert "NEUROLOGICAL_EMERGENCY" in flag_ids
        neuro = next(r for r in fired if r.id == "NEUROLOGICAL_EMERGENCY")
        assert neuro.severity == Severity.EMERGENCY

    def test_altered_consciousness(self):
        answers = {
            "emergency_symptoms": "unconscious, fainted",
        }
        fired = evaluate_all_rules(answers)
        flag_ids = [r.id for r in fired]
        assert "ALTERED_CONSCIOUSNESS" in flag_ids

    def test_heavy_bleeding(self):
        answers = {
            "emergency_symptoms": "heavy bleeding that won't stop",
        }
        fired = evaluate_all_rules(answers)
        flag_ids = [r.id for r in fired]
        assert "HEAVY_BLEEDING" in flag_ids

    def test_chest_pain_with_associated_symptoms(self):
        answers = {
            "chief_complaint": "chest pain since morning",
            "associated_symptoms": "sweating and nausea",
            "pain_severity": 8,
        }
        fired = evaluate_all_rules(answers)
        flag_ids = [r.id for r in fired]
        assert "CHEST_PAIN_WITH_ASSOCIATED" in flag_ids

    def test_chest_pain_with_radiation(self):
        answers = {
            "chief_complaint": "chest pain",
            "radiation": "spreading to left arm and jaw",
        }
        fired = evaluate_all_rules(answers)
        flag_ids = [r.id for r in fired]
        assert "CHEST_PAIN_RADIATION" in flag_ids

    def test_severe_abdominal_pain(self):
        answers = {
            "chief_complaint": "abdominal pain",
            "pain_severity": 9,
        }
        fired = evaluate_all_rules(answers)
        flag_ids = [r.id for r in fired]
        assert "SEVERE_ABDOMINAL_PAIN" in flag_ids

    def test_suicidal_ideation(self):
        answers = {
            "chief_complaint": "I want to kill myself",
        }
        fired = evaluate_all_rules(answers)
        flag_ids = [r.id for r in fired]
        assert "SUICIDAL_IDEATION" in flag_ids
        suicidal = next(r for r in fired if r.id == "SUICIDAL_IDEATION")
        assert suicidal.severity == Severity.EMERGENCY
        assert "iCall" in suicidal.patient_message

    def test_high_fever_with_rash(self):
        answers = {
            "fever_temperature": 104,
            "associated_symptoms": "rash all over body",
        }
        fired = evaluate_all_rules(answers)
        flag_ids = [r.id for r in fired]
        assert "HIGH_FEVER_WITH_RASH" in flag_ids

    def test_critical_lab_values(self):
        answers = {
            "abnormal_flag": "critical-low",
        }
        fired = evaluate_all_rules(answers)
        flag_ids = [r.id for r in fired]
        assert "ABNORMAL_LAB_CRITICAL" in flag_ids

    def test_all_rules_have_bilingual_messages(self):
        """Every rule must have both English and Hindi patient messages."""
        for rule in RULE_REGISTRY:
            assert rule.patient_message, f"Rule {rule.id} missing English message"
            assert rule.patient_message_hi, f"Rule {rule.id} missing Hindi message"
            assert rule.title_hi, f"Rule {rule.id} missing Hindi title"

    def test_no_false_positive_for_partial_match(self):
        """Chest pain without associated symptoms should not trigger compound rules."""
        answers = {
            "chief_complaint": "chest pain",
            "pain_severity": 3,
            # No associated symptoms or radiation
        }
        fired = evaluate_all_rules(answers)
        flag_ids = [r.id for r in fired]
        assert "CHEST_PAIN_WITH_ASSOCIATED" not in flag_ids
        assert "CHEST_PAIN_RADIATION" not in flag_ids
