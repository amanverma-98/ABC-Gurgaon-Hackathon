"""Red flag detection — rule-based + LLM-enhanced triage rules.

The rule-based layer runs instantly (no LLM call) and catches known patterns.
The LLM layer runs asynchronously to catch subtle or compound patterns.
Both layers contribute to the final triage decision.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Severity(str, Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    EMERGENCY = "emergency"


@dataclass
class RedFlagRule:
    """A deterministic red-flag rule that triggers on specific answer patterns."""
    id: str
    title: str
    title_hi: str
    severity: Severity
    patient_message: str
    patient_message_hi: str
    match_any: list[dict] = field(default_factory=list)
    match_all: list[dict] = field(default_factory=list)


# ── Deterministic Rules ──────────────────────────────────────────────────
# These fire instantly without needing LLM.  The LLM layer adds
# context-aware detection on top of these.

RULE_REGISTRY: list[RedFlagRule] = [
    # ── Emergency Level ──────────────────────────────────────────────
    RedFlagRule(
        id="NEUROLOGICAL_EMERGENCY",
        title="Possible stroke or neurological emergency",
        title_hi="संभावित स्ट्रोक या न्यूरोलॉजिकल आपातकाल",
        severity=Severity.EMERGENCY,
        patient_message="Please seek immediate emergency care. Your symptoms suggest a possible neurological emergency.",
        patient_message_hi="कृपया तुरंत आपातकालीन देखभाल लें। आपके लक्षण संभावित न्यूरोलॉजिकल आपातकाल का संकेत देते हैं।",
        match_any=[
            {"field": "emergency_symptoms", "contains_any": ["stroke", "seizure"]},
            {"field": "chief_complaint", "contains_any": ["sudden weakness", "face drooping", "cannot speak"]},
        ],
    ),
    RedFlagRule(
        id="ALTERED_CONSCIOUSNESS",
        title="Altered consciousness or fainting",
        title_hi="चेतना में बदलाव या बेहोशी",
        severity=Severity.EMERGENCY,
        patient_message="Altered consciousness requires immediate medical attention.",
        patient_message_hi="चेतना में बदलाव के लिए तत्काल चिकित्सा ध्यान आवश्यक है।",
        match_any=[
            {"field": "emergency_symptoms", "contains_any": ["unconscious"]},
            {"field": "chief_complaint", "contains_any": ["fainted", "blacked out", "confused"]},
        ],
    ),
    RedFlagRule(
        id="HEAVY_BLEEDING",
        title="Uncontrolled heavy bleeding",
        title_hi="अनियंत्रित भारी रक्तस्राव",
        severity=Severity.EMERGENCY,
        patient_message="Heavy bleeding that doesn't stop needs immediate care.",
        patient_message_hi="भारी रक्तस्राव जो नहीं रुकता, उसे तत्काल देखभाल की आवश्यकता है।",
        match_any=[
            {"field": "emergency_symptoms", "contains_any": ["bleeding"]},
            {"field": "chief_complaint", "contains_any": ["heavy bleeding", "blood won't stop"]},
        ],
    ),
    RedFlagRule(
        id="SEVERE_BREATHING",
        title="Severe breathing difficulty",
        title_hi="सांस लेने में गंभीर कठिनाई",
        severity=Severity.EMERGENCY,
        patient_message="Severe breathing difficulty requires immediate emergency care.",
        patient_message_hi="सांस लेने में गंभीर कठिनाई के लिए तत्काल आपातकालीन देखभाल आवश्यक है।",
        match_any=[
            {"field": "emergency_symptoms", "contains_any": ["breathing"]},
            {"field": "breathlessness_severity", "in": ["severe", "at_rest"]},
        ],
    ),

    # ── Urgent Level ─────────────────────────────────────────────────
    RedFlagRule(
        id="CHEST_PAIN_WITH_ASSOCIATED",
        title="Chest pain with associated symptoms",
        title_hi="संबंधित लक्षणों के साथ छाती में दर्द",
        severity=Severity.URGENT,
        patient_message="Your combination of chest pain with associated symptoms needs urgent evaluation by a doctor.",
        patient_message_hi="छाती दर्द के साथ संबंधित लक्षणों के संयोजन के लिए डॉक्टर द्वारा तत्काल मूल्यांकन की आवश्यकता है।",
        match_all=[
            {"field": "chief_complaint", "contains_any": ["chest pain", "chest_pain"]},
        ],
        match_any=[
            {"field": "associated_symptoms", "contains_any": ["sweating", "nausea", "jaw pain", "left arm"]},
            {"field": "pain_severity", "gte": 7},
        ],
    ),
    RedFlagRule(
        id="CHEST_PAIN_RADIATION",
        title="Chest pain with radiation",
        title_hi="विकिरण के साथ छाती दर्द",
        severity=Severity.URGENT,
        patient_message="Chest pain that spreads to other areas needs urgent medical evaluation.",
        patient_message_hi="छाती दर्द जो अन्य क्षेत्रों में फैलता है, उसे तत्काल चिकित्सा मूल्यांकन की आवश्यकता है।",
        match_all=[
            {"field": "chief_complaint", "contains_any": ["chest pain", "chest_pain"]},
            {"field": "radiation", "contains_any": ["arm", "jaw", "back", "shoulder"]},
        ],
    ),
    RedFlagRule(
        id="SEVERE_ABDOMINAL_PAIN",
        title="Severe abdominal pain",
        title_hi="गंभीर पेट दर्द",
        severity=Severity.URGENT,
        patient_message="Severe abdominal pain with associated symptoms needs urgent evaluation.",
        patient_message_hi="संबंधित लक्षणों के साथ गंभीर पेट दर्द को तत्काल मूल्यांकन की आवश्यकता है।",
        match_all=[
            {"field": "chief_complaint", "contains_any": ["abdominal pain", "abdominal_pain", "stomach pain"]},
        ],
        match_any=[
            {"field": "pain_severity", "gte": 8},
            {"field": "associated_symptoms", "contains_any": ["vomiting blood", "blood in stool", "rigid abdomen"]},
        ],
    ),
    RedFlagRule(
        id="HIGH_FEVER_WITH_RASH",
        title="High fever with rash or neck stiffness",
        title_hi="दाने या गर्दन की अकड़न के साथ तेज बुखार",
        severity=Severity.URGENT,
        patient_message="High fever with rash or neck stiffness needs urgent evaluation for possible serious infection.",
        patient_message_hi="दाने या गर्दन की अकड़न के साथ तेज बुखार के लिए संभावित गंभीर संक्रमण के लिए तत्काल मूल्यांकन आवश्यक है।",
        match_all=[
            {"field": "fever_temperature", "gte": 103},
        ],
        match_any=[
            {"field": "associated_symptoms", "contains_any": ["rash", "stiff neck", "neck stiffness"]},
        ],
    ),
    RedFlagRule(
        id="SUICIDAL_IDEATION",
        title="Possible suicidal ideation or self-harm",
        title_hi="संभावित आत्मघाती विचार या आत्म-हानि",
        severity=Severity.EMERGENCY,
        patient_message="If you are having thoughts of hurting yourself, please contact a crisis helpline immediately: iCall 9152987821, Vandrevala Foundation 1860-2662-345.",
        patient_message_hi="यदि आपके मन में खुद को नुकसान पहुंचाने के विचार आ रहे हैं, तो कृपया तुरंत संकट हेल्पलाइन से संपर्क करें: iCall 9152987821, वंदरेवाला फाउंडेशन 1860-2662-345।",
        match_any=[
            {"field": "chief_complaint", "contains_any": ["suicide", "kill myself", "end my life", "self harm"]},
            {"field": "mental_health", "contains_any": ["suicidal", "want to die", "end it all"]},
        ],
    ),
    RedFlagRule(
        id="ABNORMAL_LAB_CRITICAL",
        title="Critical abnormal lab values detected in uploaded documents",
        title_hi="अपलोड किए गए दस्तावेज़ों में गंभीर असामान्य लैब मान पाए गए",
        severity=Severity.URGENT,
        patient_message="Some lab values in your uploaded documents appear critically abnormal. Please ensure a clinician reviews them.",
        patient_message_hi="आपके अपलोड किए गए दस्तावेज़ों में कुछ लैब मान गंभीर रूप से असामान्य दिखाई देते हैं। कृपया सुनिश्चित करें कि एक चिकित्सक उनकी समीक्षा करे।",
        match_any=[
            {"field": "abnormal_flag", "in": ["critical-low", "critical-high"]},
        ],
    ),
]


# ── LLM-Augmented Red Flag Prompts ──────────────────────────────────────
# These are used by the RedFlagDetector service to ask the LLM to evaluate
# the full conversation context for subtle/compound patterns.

LLM_RED_FLAG_CATEGORIES = [
    "compound cardiovascular risk (multiple risk factors)",
    "sepsis indicators (fever + tachycardia + altered mental status)",
    "anaphylaxis signs (exposure + multi-system symptoms)",
    "obstetric emergencies (pregnancy + pain/bleeding)",
    "pediatric dehydration (child + vomiting/diarrhea + lethargy)",
    "drug overdose indicators",
    "diabetic emergencies (DKA/HHS patterns)",
    "acute abdomen patterns",
    "meningitis triad (fever + headache + neck stiffness)",
]


def evaluate_rule(rule: RedFlagRule, answers: dict[str, str | int | list]) -> bool:
    """Evaluate a single red-flag rule against the current answer set.

    Returns True if the rule fires.
    """
    # Check match_all — every condition must be satisfied
    if rule.match_all:
        for cond in rule.match_all:
            if not _check_condition(cond, answers):
                return False

    # Check match_any — at least one condition must be satisfied
    if rule.match_any:
        any_hit = any(_check_condition(c, answers) for c in rule.match_any)
        if not any_hit:
            return False

    return True


def evaluate_all_rules(answers: dict[str, str | int | list]) -> list[RedFlagRule]:
    """Evaluate all deterministic rules and return those that fire."""
    fired = []
    for rule in RULE_REGISTRY:
        if evaluate_rule(rule, answers):
            fired.append(rule)
    return fired


def _check_condition(cond: dict, answers: dict) -> bool:
    """Check a single match condition against answers."""
    field_name = cond.get("field", "")
    answer_val = answers.get(field_name, "")

    if "contains_any" in cond:
        keywords = cond["contains_any"]
        if isinstance(answer_val, list):
            return any(k in answer_val for k in keywords)
        answer_str = str(answer_val).lower()
        return any(k.lower() in answer_str for k in keywords)

    if "in" in cond:
        return str(answer_val).lower() in [v.lower() for v in cond["in"]]

    if "gte" in cond:
        try:
            return float(answer_val) >= float(cond["gte"])
        except (ValueError, TypeError):
            return False

    return False
