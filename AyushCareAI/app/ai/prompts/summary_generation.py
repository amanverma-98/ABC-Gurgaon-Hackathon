"""Prompt templates for Module C — Clinical Summary Generation.

Instructs the LLM to produce a structured, physician-ready clinical summary
from the collected history and document data.
"""

from __future__ import annotations

from app.domain.clinical_protocol import SECTION_LABELS, ClinicalSection


SUMMARY_SYSTEM_PROMPT = """\
You are a clinical summary generator in the MediKiosk system. You produce \
structured, physician-ready clinical summaries from patient-reported history \
and extracted document data.

## YOUR ROLE
- Synthesize conversational history and document entities into a professional \
clinical summary.
- Organize information into standard clinical sections.
- Highlight abnormal findings, red flags, and critical values.
- Merge document-extracted data with patient-reported data, noting source.

## OUTPUT FORMAT
Respond with a JSON object:
{{
  "sections": [
    {{
      "id": "<section_id>",
      "heading_en": "<English heading>",
      "heading_hi": "<Hindi heading>",
      "body": "<section content in requested language>",
      "source_question_ids": ["<ids of questions that contributed>"],
      "source_document_ids": ["<ids of documents that contributed>"]
    }}
  ],
  "red_flag_summary": "<summary of any red flags detected, or null>",
  "abnormal_findings": ["<list of abnormal lab/clinical findings>"]
}}

## CLINICAL SECTIONS (in order)
{section_list}

## RULES
1. Use professional medical terminology but keep it readable.
2. Include relevant negatives (e.g., "No known drug allergies").
3. Clearly attribute information: "(patient-reported)" vs "(from lab report dated ...)".
4. Include the SOCRATES assessment for the presenting complaint.
5. End with this safety disclaimer: "Draft for clinician review only. \
This output does not diagnose, prescribe, or replace clinical judgement."
6. If the intake pathway is 'ayush', include AYUSH history sections.
7. For bilingual output, provide body text in both languages separated by "---".
"""


def build_summary_system_prompt(intake_pathway: str = "general") -> str:
    """Build the system prompt for summary generation."""
    sections = list(SECTION_LABELS.items())
    if intake_pathway != "ayush":
        # Exclude AYUSH sections
        sections = [
            (s, labels) for s, labels in sections
            if s not in (ClinicalSection.AYUSH_DASHAVIDHA, ClinicalSection.AYUSH_AHARA_VIHARA)
        ]

    section_list = "\n".join(
        f"- {labels['en']} ({labels['hi']})" for _, labels in sections
    )

    return SUMMARY_SYSTEM_PROMPT.format(section_list=section_list)


def build_summary_generation_prompt(
    conversation_history: list[dict],
    document_entities: list[dict] | None = None,
    red_flags: list[dict] | None = None,
    language: str = "en",
) -> str:
    """Build the user prompt for generating a clinical summary.

    Args:
        conversation_history: List of {"question_id": ..., "question": ..., "answer": ...}.
        document_entities: Extracted entities from uploaded documents.
        red_flags: Any red flags triggered during the session.
        language: Output language.
    """
    history_text = ""
    for turn in conversation_history:
        qid = turn.get("question_id", "?")
        q = turn.get("question", "")
        a = turn.get("answer", "")
        history_text += f"[{qid}] Q: {q}\nA: {a}\n\n"

    doc_text = ""
    if document_entities:
        doc_text = "\n## Extracted Document Data\n"
        for entity in document_entities:
            doc_text += f"- [{entity.get('kind', '')}] {entity.get('label', '')}"
            if entity.get("value"):
                doc_text += f": {entity['value']}"
            if entity.get("unit"):
                doc_text += f" {entity['unit']}"
            doc_text += f" (confidence: {entity.get('confidence', 0):.2f})\n"

    flags_text = ""
    if red_flags:
        flags_text = "\n## Red Flags Detected\n"
        for flag in red_flags:
            flags_text += f"- [{flag.get('level', '')}] {flag.get('title', '')}: {', '.join(flag.get('evidence', []))}\n"

    return f"""\
Generate a comprehensive physician-ready clinical summary.

Output language: {language}

## Patient-Reported History
{history_text}
{doc_text}
{flags_text}

Produce the structured JSON summary.
"""
