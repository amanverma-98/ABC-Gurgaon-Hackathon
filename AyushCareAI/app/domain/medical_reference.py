"""Medical reference data — lab ranges, drug interactions, ICD codes.

This module provides static clinical reference data used by the document
intelligence and red-flag detection services.  All data here is from
publicly available medical references.

NOTE: This is a curated subset for common conditions.  A production
deployment should connect to a maintained drug-interaction database
(e.g., DrugBank, RxNorm) and a complete ICD-10 code set.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


# ── Lab Reference Ranges ─────────────────────────────────────────────────

@dataclass
class LabReferenceRange:
    test_name: str
    aliases: list[str]
    unit: str
    normal_low: float
    normal_high: float
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None


LAB_RANGES: list[LabReferenceRange] = [
    # Haematology
    LabReferenceRange("Haemoglobin", ["Hb", "HGB", "hemoglobin"], "g/dL", 12.0, 17.5, 7.0, 20.0),
    LabReferenceRange("WBC Count", ["WBC", "Total Leucocyte Count", "TLC"], "×10³/µL", 4.0, 11.0, 2.0, 30.0),
    LabReferenceRange("Platelet Count", ["PLT", "Platelets"], "×10³/µL", 150.0, 400.0, 50.0, 1000.0),
    LabReferenceRange("ESR", ["Erythrocyte Sedimentation Rate"], "mm/hr", 0.0, 20.0, None, 100.0),

    # Metabolic Panel
    LabReferenceRange("Blood Glucose (Fasting)", ["FBS", "Fasting Blood Sugar", "FBG"], "mg/dL", 70.0, 100.0, 40.0, 500.0),
    LabReferenceRange("Blood Glucose (Random)", ["RBS", "Random Blood Sugar"], "mg/dL", 70.0, 140.0, 40.0, 500.0),
    LabReferenceRange("HbA1c", ["Glycated Haemoglobin", "A1C"], "%", 4.0, 5.6, None, 14.0),
    LabReferenceRange("Creatinine", ["Serum Creatinine", "S. Creatinine"], "mg/dL", 0.6, 1.2, None, 10.0),
    LabReferenceRange("Blood Urea", ["BUN", "Urea"], "mg/dL", 7.0, 20.0, None, 100.0),
    LabReferenceRange("Uric Acid", ["Serum Uric Acid"], "mg/dL", 3.5, 7.2, None, 15.0),

    # Liver Function
    LabReferenceRange("SGPT", ["ALT", "Alanine Transaminase"], "U/L", 7.0, 56.0, None, 1000.0),
    LabReferenceRange("SGOT", ["AST", "Aspartate Transaminase"], "U/L", 10.0, 40.0, None, 1000.0),
    LabReferenceRange("Total Bilirubin", ["Bilirubin", "T. Bilirubin"], "mg/dL", 0.1, 1.2, None, 15.0),
    LabReferenceRange("Alkaline Phosphatase", ["ALP"], "U/L", 44.0, 147.0, None, 1000.0),

    # Lipid Profile
    LabReferenceRange("Total Cholesterol", ["Cholesterol"], "mg/dL", 0.0, 200.0, None, 400.0),
    LabReferenceRange("LDL Cholesterol", ["LDL", "LDL-C"], "mg/dL", 0.0, 100.0, None, 300.0),
    LabReferenceRange("HDL Cholesterol", ["HDL", "HDL-C"], "mg/dL", 40.0, 60.0, None, None),
    LabReferenceRange("Triglycerides", ["TG"], "mg/dL", 0.0, 150.0, None, 500.0),

    # Thyroid
    LabReferenceRange("TSH", ["Thyroid Stimulating Hormone"], "mIU/L", 0.4, 4.0, 0.01, 100.0),
    LabReferenceRange("Free T4", ["FT4", "Thyroxine"], "ng/dL", 0.8, 1.8, 0.1, 7.0),

    # Electrolytes
    LabReferenceRange("Sodium", ["Na+", "Serum Sodium"], "mEq/L", 136.0, 145.0, 120.0, 160.0),
    LabReferenceRange("Potassium", ["K+", "Serum Potassium"], "mEq/L", 3.5, 5.0, 2.5, 6.5),
    LabReferenceRange("Calcium", ["Ca2+", "Serum Calcium"], "mg/dL", 8.5, 10.5, 6.0, 14.0),
]


def find_lab_range(test_name: str) -> Optional[LabReferenceRange]:
    """Find a lab reference range by test name or alias (case-insensitive)."""
    test_lower = test_name.lower().strip()
    for ref in LAB_RANGES:
        if ref.test_name.lower() == test_lower:
            return ref
        if any(alias.lower() == test_lower for alias in ref.aliases):
            return ref
    return None


def classify_lab_value(test_name: str, value: float) -> str:
    """Classify a lab value as normal, low, high, critical-low, or critical-high."""
    ref = find_lab_range(test_name)
    if ref is None:
        return "unknown"
    if ref.critical_low is not None and value <= ref.critical_low:
        return "critical-low"
    if ref.critical_high is not None and value >= ref.critical_high:
        return "critical-high"
    if value < ref.normal_low:
        return "low"
    if value > ref.normal_high:
        return "high"
    return "normal"


# ── Drug Interaction Database (Curated Subset) ──────────────────────────

@dataclass
class DrugInteractionEntry:
    drug_a: str
    drug_b: str
    severity: str  # "mild", "moderate", "severe"
    description: str


DRUG_INTERACTIONS: list[DrugInteractionEntry] = [
    DrugInteractionEntry(
        "Warfarin", "Aspirin", "severe",
        "Increased risk of bleeding. Avoid combination unless clinician-directed.",
    ),
    DrugInteractionEntry(
        "Metformin", "Contrast Dye", "moderate",
        "Risk of lactic acidosis. Hold metformin 48h before/after contrast.",
    ),
    DrugInteractionEntry(
        "ACE Inhibitor", "Potassium Supplement", "moderate",
        "Risk of hyperkalemia. Monitor potassium levels closely.",
    ),
    DrugInteractionEntry(
        "SSRI", "MAOI", "severe",
        "Risk of serotonin syndrome. Contraindicated combination.",
    ),
    DrugInteractionEntry(
        "Ciprofloxacin", "Theophylline", "moderate",
        "Increased theophylline levels. Monitor for toxicity.",
    ),
    DrugInteractionEntry(
        "Methotrexate", "NSAID", "severe",
        "Increased methotrexate toxicity. Avoid concurrent use.",
    ),
    DrugInteractionEntry(
        "Digoxin", "Amiodarone", "severe",
        "Increased digoxin levels. Reduce digoxin dose by 50%.",
    ),
    DrugInteractionEntry(
        "Clopidogrel", "Omeprazole", "moderate",
        "Reduced antiplatelet effect. Consider pantoprazole instead.",
    ),
    DrugInteractionEntry(
        "Simvastatin", "Amlodipine", "moderate",
        "Increased risk of myopathy. Limit simvastatin to 20mg.",
    ),
    DrugInteractionEntry(
        "Lithium", "NSAID", "moderate",
        "Increased lithium levels. Monitor serum lithium.",
    ),
]


def check_drug_interactions(medications: list[str]) -> list[DrugInteractionEntry]:
    """Check a list of medications for known drug-drug interactions."""
    meds_lower = [m.lower().strip() for m in medications]
    found = []
    for interaction in DRUG_INTERACTIONS:
        a = interaction.drug_a.lower()
        b = interaction.drug_b.lower()
        a_match = any(a in m or m in a for m in meds_lower)
        b_match = any(b in m or m in b for m in meds_lower)
        if a_match and b_match:
            found.append(interaction)
    return found


# ── Common ICD-10 Codes ─────────────────────────────────────────────────

COMMON_ICD_CODES: dict[str, str] = {
    "chest pain": "R07.9",
    "fever": "R50.9",
    "cough": "R05.9",
    "headache": "R51.9",
    "abdominal pain": "R10.9",
    "hypertension": "I10",
    "diabetes mellitus type 2": "E11.9",
    "asthma": "J45.9",
    "depression": "F32.9",
    "anxiety": "F41.9",
    "back pain": "M54.9",
    "joint pain": "M25.50",
    "urinary tract infection": "N39.0",
    "pneumonia": "J18.9",
    "anemia": "D64.9",
    "hypothyroidism": "E03.9",
    "osteoarthritis": "M19.90",
    "migraine": "G43.909",
    "gastritis": "K29.70",
    "COPD": "J44.1",
}
