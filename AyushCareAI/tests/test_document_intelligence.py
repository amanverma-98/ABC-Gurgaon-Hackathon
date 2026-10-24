"""Tests for document intelligence service."""

from __future__ import annotations

import pytest

from app.domain.medical_reference import (
    classify_lab_value,
    check_drug_interactions,
    find_lab_range,
)


class TestMedicalReference:
    """Test the medical reference data and lab value classification."""

    def test_normal_haemoglobin(self):
        assert classify_lab_value("Haemoglobin", 14.0) == "normal"

    def test_low_haemoglobin(self):
        assert classify_lab_value("Haemoglobin", 10.0) == "low"

    def test_high_haemoglobin(self):
        assert classify_lab_value("Haemoglobin", 18.0) == "high"

    def test_critical_low_haemoglobin(self):
        assert classify_lab_value("Haemoglobin", 6.0) == "critical-low"

    def test_critical_high_haemoglobin(self):
        assert classify_lab_value("Haemoglobin", 21.0) == "critical-high"

    def test_alias_lookup(self):
        """Lab ranges should be found by alias too."""
        ref = find_lab_range("Hb")
        assert ref is not None
        assert ref.test_name == "Haemoglobin"

    def test_fasting_blood_sugar_normal(self):
        assert classify_lab_value("Blood Glucose (Fasting)", 85.0) == "normal"

    def test_fasting_blood_sugar_high(self):
        assert classify_lab_value("Blood Glucose (Fasting)", 130.0) == "high"

    def test_critical_potassium(self):
        assert classify_lab_value("Potassium", 6.8) == "critical-high"
        assert classify_lab_value("Potassium", 2.0) == "critical-low"

    def test_unknown_test(self):
        assert classify_lab_value("Imaginary Test XYZ", 42.0) == "unknown"

    def test_drug_interaction_warfarin_aspirin(self):
        interactions = check_drug_interactions(["Warfarin", "Aspirin"])
        assert len(interactions) >= 1
        assert interactions[0].severity == "severe"

    def test_drug_interaction_no_match(self):
        interactions = check_drug_interactions(["Paracetamol", "Cetirizine"])
        assert len(interactions) == 0

    def test_drug_interaction_case_insensitive(self):
        interactions = check_drug_interactions(["warfarin", "aspirin"])
        assert len(interactions) >= 1

    def test_ssri_maoi_interaction(self):
        interactions = check_drug_interactions(["SSRI", "MAOI"])
        assert len(interactions) >= 1
        assert interactions[0].severity == "severe"
