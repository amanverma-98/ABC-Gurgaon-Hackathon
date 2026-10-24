"""Clinical protocol — SOCRATES framework and adaptive history ontology.

This module defines the clinical structure that the LLM conversation engine
uses as its backbone.  Unlike the original hardcoded question tree, this
provides a *protocol skeleton* that the LLM fills in adaptively.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ── Clinical Sections ────────────────────────────────────────────────────

class ClinicalSection(str, Enum):
    """Standard clinical history sections in presentation order."""
    EMERGENCY_SCREEN = "emergency_screen"
    CHIEF_COMPLAINT = "chief_complaint"
    HPI = "hpi"
    PAST_MEDICAL = "past_medical"
    PAST_SURGICAL = "past_surgical"
    DRUG_ALLERGY = "drug_allergy"
    FAMILY_HISTORY = "family_history"
    PERSONAL_HISTORY = "personal_history"
    REVIEW_OF_SYSTEMS = "review_of_systems"
    AYUSH_DASHAVIDHA = "ayush_dashavidha"
    AYUSH_AHARA_VIHARA = "ayush_ahara_vihara"


STANDARD_SECTIONS = [
    ClinicalSection.EMERGENCY_SCREEN,
    ClinicalSection.CHIEF_COMPLAINT,
    ClinicalSection.HPI,
    ClinicalSection.PAST_MEDICAL,
    ClinicalSection.PAST_SURGICAL,
    ClinicalSection.DRUG_ALLERGY,
    ClinicalSection.FAMILY_HISTORY,
    ClinicalSection.PERSONAL_HISTORY,
    ClinicalSection.REVIEW_OF_SYSTEMS,
]

CORE_INTAKE_SECTIONS = [
    ClinicalSection.EMERGENCY_SCREEN,
    ClinicalSection.CHIEF_COMPLAINT,
    ClinicalSection.HPI,
    ClinicalSection.PAST_MEDICAL,
    ClinicalSection.DRUG_ALLERGY,
    ClinicalSection.REVIEW_OF_SYSTEMS,
]

AYUSH_EXTENSION_SECTIONS = [
    ClinicalSection.AYUSH_DASHAVIDHA,
    ClinicalSection.AYUSH_AHARA_VIHARA,
]

SECTION_LABELS = {
    ClinicalSection.EMERGENCY_SCREEN: {
        "en": "Emergency Screening",
        "hi": "आपातकालीन जांच",
    },
    ClinicalSection.CHIEF_COMPLAINT: {
        "en": "Chief Complaint",
        "hi": "मुख्य शिकायत",
    },
    ClinicalSection.HPI: {
        "en": "History of Present Illness",
        "hi": "वर्तमान बीमारी का इतिहास",
    },
    ClinicalSection.PAST_MEDICAL: {
        "en": "Past Medical History",
        "hi": "पूर्व चिकित्सा इतिहास",
    },
    ClinicalSection.PAST_SURGICAL: {
        "en": "Past Surgical History",
        "hi": "पूर्व शल्य चिकित्सा इतिहास",
    },
    ClinicalSection.DRUG_ALLERGY: {
        "en": "Drug and Allergy History",
        "hi": "दवा और एलर्जी का इतिहास",
    },
    ClinicalSection.FAMILY_HISTORY: {
        "en": "Family History",
        "hi": "पारिवारिक इतिहास",
    },
    ClinicalSection.PERSONAL_HISTORY: {
        "en": "Personal History",
        "hi": "व्यक्तिगत इतिहास",
    },
    ClinicalSection.REVIEW_OF_SYSTEMS: {
        "en": "Review of Systems",
        "hi": "प्रणाली समीक्षा",
    },
    ClinicalSection.AYUSH_DASHAVIDHA: {
        "en": "AYUSH History — Dashavidha Pariksha",
        "hi": "आयुष इतिहास — दशविध परीक्षा",
    },
    ClinicalSection.AYUSH_AHARA_VIHARA: {
        "en": "AYUSH History — Ahara-Vihara",
        "hi": "आयुष इतिहास — आहार-विहार",
    },
}


# ── SOCRATES Framework ───────────────────────────────────────────────────

@dataclass
class SOCRATESElement:
    """One dimension of the SOCRATES pain/symptom assessment."""
    id: str
    name: str
    description: str
    example_prompts: list[str]


SOCRATES_FRAMEWORK: list[SOCRATESElement] = [
    SOCRATESElement(
        id="site",
        name="Site",
        description="Where exactly is the symptom?",
        example_prompts=[
            "Where exactly do you feel the pain?",
            "Can you point to where it hurts?",
        ],
    ),
    SOCRATESElement(
        id="onset",
        name="Onset",
        description="When did the symptom begin? Was it sudden or gradual?",
        example_prompts=[
            "When did this start?",
            "Did it come on suddenly or gradually?",
        ],
    ),
    SOCRATESElement(
        id="character",
        name="Character",
        description="What does the symptom feel like?",
        example_prompts=[
            "How would you describe the pain? Sharp, dull, burning, pressure?",
        ],
    ),
    SOCRATESElement(
        id="radiation",
        name="Radiation",
        description="Does the symptom spread anywhere else?",
        example_prompts=[
            "Does the pain spread to any other part of your body?",
        ],
    ),
    SOCRATESElement(
        id="associated",
        name="Associated symptoms",
        description="Any other symptoms accompanying the main complaint?",
        example_prompts=[
            "Do you have any other symptoms along with this?",
            "Any nausea, vomiting, sweating, or breathlessness?",
        ],
    ),
    SOCRATESElement(
        id="timing",
        name="Timing",
        description="Is it constant or intermittent? Any time pattern?",
        example_prompts=[
            "Is it constant or does it come and go?",
            "Is it worse at any particular time?",
        ],
    ),
    SOCRATESElement(
        id="exacerbating",
        name="Exacerbating / Relieving",
        description="What makes it worse or better?",
        example_prompts=[
            "What makes it worse?",
            "Is there anything that helps or reduces it?",
        ],
    ),
    SOCRATESElement(
        id="severity",
        name="Severity",
        description="How severe is it on a 0-10 scale?",
        example_prompts=[
            "On a scale of 0 to 10, how severe is the pain? 0 is no pain, 10 is the worst imaginable.",
        ],
    ),
]


# ── Emergency Symptoms ───────────────────────────────────────────────────

EMERGENCY_SYMPTOMS = {
    "stroke": {
        "en": "Sudden weakness, facial drooping, or trouble speaking",
        "hi": "अचानक कमजोरी, चेहरे का लटकना, या बोलने में कठिनाई",
    },
    "unconscious": {
        "en": "Fainting, unconsciousness, or severe confusion",
        "hi": "बेहोशी, अचेतन, या गंभीर भ्रम",
    },
    "bleeding": {
        "en": "Heavy bleeding that won't stop",
        "hi": "भारी रक्तस्राव जो रुक नहीं रहा",
    },
    "breathing": {
        "en": "Severe difficulty breathing",
        "hi": "सांस लेने में गंभीर कठिनाई",
    },
    "chest_pain_severe": {
        "en": "Crushing chest pain with sweating",
        "hi": "पसीने के साथ छाती में तेज दर्द",
    },
    "seizure": {
        "en": "Active seizure or convulsions",
        "hi": "दौरा या ऐंठन",
    },
}


# ── Common Chief Complaints ──────────────────────────────────────────────
# These are offered as touch options but the LLM can handle ANY complaint.

COMMON_COMPLAINTS = [
    {"value": "chest_pain", "en": "Chest pain or discomfort", "hi": "छाती में दर्द"},
    {"value": "fever_cough", "en": "Fever, cough, or breathing problem", "hi": "बुखार, खांसी, या सांस की तकलीफ"},
    {"value": "abdominal_pain", "en": "Stomach or abdominal pain", "hi": "पेट दर्द"},
    {"value": "headache", "en": "Headache or dizziness", "hi": "सिरदर्द या चक्कर"},
    {"value": "joint_pain", "en": "Joint or muscle pain", "hi": "जोड़ या मांसपेशियों में दर्द"},
    {"value": "skin_issue", "en": "Skin rash, itching, or wound", "hi": "त्वचा पर दाने, खुजली, या घाव"},
    {"value": "urinary", "en": "Urinary problems", "hi": "पेशाब की समस्या"},
    {"value": "eye_ear", "en": "Eye or ear problem", "hi": "आंख या कान की समस्या"},
    {"value": "weakness", "en": "General weakness or fatigue", "hi": "सामान्य कमजोरी या थकान"},
    {"value": "mental_health", "en": "Anxiety, depression, or sleep problems", "hi": "चिंता, अवसाद, या नींद की समस्या"},
    {"value": "other", "en": "Something else", "hi": "कुछ और"},
]


# ── Section Completion Criteria ──────────────────────────────────────────

@dataclass
class SectionProtocol:
    """Defines what the LLM needs to cover for each section."""
    section: ClinicalSection
    minimum_questions: int
    required_topics: list[str]
    completion_prompt: str

    def is_minimally_covered(self, answered_topics: list[str]) -> bool:
        covered = sum(1 for t in self.required_topics if t in answered_topics)
        return covered >= len(self.required_topics) * 0.7


SECTION_PROTOCOLS: dict[ClinicalSection, SectionProtocol] = {
    ClinicalSection.EMERGENCY_SCREEN: SectionProtocol(
        section=ClinicalSection.EMERGENCY_SCREEN,
        minimum_questions=1,
        required_topics=["emergency_status"],
        completion_prompt="Confirm: no emergency symptoms present.",
    ),
    ClinicalSection.CHIEF_COMPLAINT: SectionProtocol(
        section=ClinicalSection.CHIEF_COMPLAINT,
        minimum_questions=1,
        required_topics=["chief_complaint"],
        completion_prompt="Chief complaint captured.",
    ),
    ClinicalSection.HPI: SectionProtocol(
        section=ClinicalSection.HPI,
        minimum_questions=4,
        required_topics=["onset", "character", "severity", "associated", "timing"],
        completion_prompt="Complete SOCRATES assessment of presenting complaint.",
    ),
    ClinicalSection.PAST_MEDICAL: SectionProtocol(
        section=ClinicalSection.PAST_MEDICAL,
        minimum_questions=1,
        required_topics=["past_conditions", "chronic_diseases"],
        completion_prompt="Past medical history captured.",
    ),
    ClinicalSection.PAST_SURGICAL: SectionProtocol(
        section=ClinicalSection.PAST_SURGICAL,
        minimum_questions=1,
        required_topics=["surgeries", "hospitalizations"],
        completion_prompt="Past surgical history captured.",
    ),
    ClinicalSection.DRUG_ALLERGY: SectionProtocol(
        section=ClinicalSection.DRUG_ALLERGY,
        minimum_questions=2,
        required_topics=["current_medications", "allergies"],
        completion_prompt="Drug and allergy history captured.",
    ),
    ClinicalSection.FAMILY_HISTORY: SectionProtocol(
        section=ClinicalSection.FAMILY_HISTORY,
        minimum_questions=1,
        required_topics=["family_conditions"],
        completion_prompt="Family history captured.",
    ),
    ClinicalSection.PERSONAL_HISTORY: SectionProtocol(
        section=ClinicalSection.PERSONAL_HISTORY,
        minimum_questions=1,
        required_topics=["lifestyle", "habits"],
        completion_prompt="Personal history captured.",
    ),
    ClinicalSection.REVIEW_OF_SYSTEMS: SectionProtocol(
        section=ClinicalSection.REVIEW_OF_SYSTEMS,
        minimum_questions=1,
        required_topics=["other_symptoms"],
        completion_prompt="Review of systems captured.",
    ),
}
