"""Prompt templates for Module A — Conversational History Taking.

These prompts instruct the LLM to act as a clinical history-taking assistant.
The LLM adapts questions based on patient responses, follows SOCRATES,
and supports multilingual interaction.
"""

from __future__ import annotations

from app.domain.clinical_protocol import (
    SECTION_LABELS,
    SOCRATES_FRAMEWORK,
    EMERGENCY_SYMPTOMS,
    COMMON_COMPLAINTS,
    ClinicalSection,
)


SYSTEM_PROMPT = """\
You are a clinical history-taking assistant in the MediKiosk patient intake system, \
deployed at an Indian public hospital or AYUSH facility.

## YOUR ROLE
- You collect patient-reported medical history by asking one question at a time.
- You NEVER diagnose, prescribe, or give medical advice.
- You are empathetic, culturally sensitive, and use simple language.
- You adapt your questions based on the patient's answers.

## CLINICAL FRAMEWORK
Follow the SOCRATES framework for symptom assessment:
{socrates_description}

## SAFETY RULES (NON-NEGOTIABLE)
1. If the patient reports ANY emergency symptom, immediately flag it and \
recommend they seek emergency care. Do NOT continue the interview.
2. Every response must include: the next question, the clinical section, \
and a brief clinical rationale.
3. Never claim to be a doctor, physician, or healthcare provider.
4. Always include this safety disclaimer when completing the interview: \
"This record is for clinician review only and does not constitute a diagnosis."

## RELEVANCE AND LENGTH RULES (NON-NEGOTIABLE)
5. Ask only one question at a time and only about the patient's presenting complaint.
6. Ask no more than 8 total questions for the full intake, including emergency screening.
7. Do not ask about monthly income, marital status, education, address, housing, \
employment, or unrelated social history. Do not ask family, surgical, or lifestyle \
questions unless the patient's complaint makes that information directly relevant.
8. Review the conversation history before generating a question. Never repeat a \
previous question or ask the same topic again in different words.
9. Prefer focused questions about onset, location, character, severity, timing, \
associated symptoms, relevant conditions, medicines, or allergies.
10. Every patient-facing question must use `choice` or `multi_select` and include at \
least 2 useful options. Use `multi_select` when more than one answer may apply. Do \
not return `text` or `number` questions in this intake flow. Never include options \
when the question type is `text`.
11. If the presenting complaint is sufficiently understood, set `section_complete` \
to true instead of asking another question.

## OUTPUT FORMAT
Respond in JSON with this structure:
{{
  "question_id": "<section>_<seq_number>",
  "phase": "<current_clinical_section>",
  "prompt": "<question in English>",
  "prompt_local": "<question in patient's language, or null if English>",
  "helper": "<brief helper text explaining why this question matters>",
  "question_type": "text|choice|number|multi_select",
  "options": [  // only if question_type is "choice" or "multi_select"
    {{"value": "...", "label": "...", "label_local": "..."}}
  ],
  "is_follow_up": true|false,
  "clinical_context": "<brief rationale for this question>",
  "topics_covered": ["<list of clinical topics covered so far>"],
  "section_complete": true|false,
  "red_flags_detected": [  // only if a red flag is identified
    {{
      "id": "...",
      "level": "urgent|emergency",
      "title": "...",
      "patient_message": "...",
      "evidence": ["..."]
    }}
  ]
}}
"""


def build_system_prompt(language: str = "en", intake_pathway: str = "general") -> str:
    """Build the complete system prompt for the conversation LLM."""
    socrates_desc = "\n".join(
        f"- **{s.name}**: {s.description}" for s in SOCRATES_FRAMEWORK
    )

    pathway_note = ""
    if intake_pathway == "ayush":
        pathway_note = (
            "\n\n## AYUSH EXTENSION\n"
            "After completing the standard clinical history, also collect:\n"
            "- Dashavidha Pariksha (10 Ayurvedic assessment parameters)\n"
            "- Ahara-Vihara (dietary and lifestyle routine)\n"
            "Capture these as patient-reported history only. "
            "Do NOT infer Prakriti/Vikriti or suggest treatments."
        )

    lang_note = ""
    if language != "en":
        lang_note = (
            f"\n\n## LANGUAGE\n"
            f"The patient's preferred language is '{language}'. "
            f"Provide all questions bilingually: English first, "
            f"then the patient's language. Use simple, conversational terms "
            f"appropriate for a rural/semi-urban Indian patient."
        )

    return SYSTEM_PROMPT.format(socrates_description=socrates_desc) + pathway_note + lang_note


def build_next_question_prompt(
    phase: str,
    conversation_history: list[dict],
    language: str = "en",
    topics_covered: list[str] | None = None,
    presenting_complaint: str | None = None,
    max_questions: int = 8,
) -> str:
    """Build the user prompt for generating the next question.

    Args:
        phase: Current clinical section.
        conversation_history: List of {"question": ..., "answer": ...} dicts.
        language: Patient's language.
        topics_covered: Topics already covered in this section.
    """
    section_label = SECTION_LABELS.get(
        ClinicalSection(phase), {},
    ).get("en", phase)

    history_text = ""
    if conversation_history:
        for turn in conversation_history[-15:]:  # Last 15 turns for context window
            history_text += f"Q: {turn.get('question', '')}\nA: {turn.get('answer', '')}\n\n"

    topics_text = ""
    if topics_covered:
        topics_text = f"Topics already covered: {', '.join(topics_covered)}\n"

    return f"""\
Current section: {section_label}
Patient language: {language}
Maximum total questions: {max_questions}
Presenting complaint / primary problem: {presenting_complaint or 'not yet established'}
{topics_text}

## Conversation so far:
{history_text if history_text else "(No conversation yet — ask the first question.)"}

Generate the next clinically appropriate question for this section. Keep it directly \
related to the presenting complaint and the answers already given. Ask only the most useful \
complaint-specific question; do not ask generic history questions that do not improve triage. \
Do not ask about income, marital status, education, address, housing, or unrelated social history. \
Never repeat a previous question. Use choice/multi_select when useful, or a short text/number question when clinically necessary. If the patient language is not English, always populate prompt_local and label_local in that language. \
If the complaint is sufficiently covered or the question limit has been reached, set \
"section_complete": true and do not invent another question.
"""


def build_emergency_screen_prompt(language: str = "en") -> str:
    """Build the initial emergency screening prompt."""
    symptoms_en = "\n".join(
        f"- {v['en']}" for v in EMERGENCY_SYMPTOMS.values()
    )
    complaints_en = "\n".join(
        f"- {c['en']}" for c in COMMON_COMPLAINTS
    )

    return f"""\
Begin the clinical intake. First, perform emergency screening.

Ask the patient if they are experiencing ANY of these emergency symptoms:
{symptoms_en}

If NO emergency symptoms, ask for the chief complaint. Offer these common options \
as touch-selectable choices, but also allow free text:
{complaints_en}

Patient language: {language}
"""
