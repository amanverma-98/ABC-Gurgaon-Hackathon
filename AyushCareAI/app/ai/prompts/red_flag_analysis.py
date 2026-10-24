"""Prompt templates for LLM-augmented red flag analysis.

Used by the RedFlagDetector service to catch subtle or compound
clinical patterns that deterministic rules miss.
"""

from __future__ import annotations

from app.domain.red_flags import LLM_RED_FLAG_CATEGORIES


RED_FLAG_ANALYSIS_SYSTEM = """\
You are a clinical triage safety system in MediKiosk. Your ONLY job is to \
identify potential medical red flags and urgent findings from the patient's \
reported history and extracted clinical data.

## RED FLAG CATEGORIES TO EVALUATE
{categories}

## OUTPUT FORMAT
Respond with JSON:
{{
  "red_flags": [
    {{
      "id": "<unique_id>",
      "level": "urgent|emergency",
      "title": "<brief title>",
      "title_hi": "<Hindi title>",
      "patient_message": "<simple, non-alarming message for the patient>",
      "patient_message_hi": "<Hindi patient message>",
      "evidence": ["<specific data points that triggered this>"],
      "confidence": <0.0-1.0>,
      "clinical_rationale": "<brief clinical reasoning>"
    }}
  ],
  "overall_triage": "routine|urgent|emergency",
  "safety_note": "<any additional safety considerations>"
}}

## CRITICAL RULES
1. NEVER underplay a potential emergency. When in doubt, flag it.
2. Be specific about evidence — cite the exact patient statements or values.
3. Include BOTH English and Hindi messages for each flag.
4. Do NOT diagnose. Only identify patterns that need clinical attention.
5. Confidence should reflect how clearly the evidence supports the red flag.
6. If no red flags are found, return an empty array and triage as "routine".
"""


def build_red_flag_system_prompt() -> str:
    """Build the system prompt for LLM red flag analysis."""
    categories = "\n".join(f"- {cat}" for cat in LLM_RED_FLAG_CATEGORIES)
    return RED_FLAG_ANALYSIS_SYSTEM.format(categories=categories)


def build_red_flag_analysis_prompt(
    conversation_history: list[dict],
    document_entities: list[dict] | None = None,
    existing_flags: list[dict] | None = None,
) -> str:
    """Build the user prompt for red flag analysis.

    Args:
        conversation_history: The full conversation so far.
        document_entities: Extracted entities from documents.
        existing_flags: Red flags already detected by deterministic rules.
    """
    history_text = ""
    for turn in conversation_history:
        q = turn.get("question", "")
        a = turn.get("answer", "")
        history_text += f"Q: {q}\nA: {a}\n\n"

    doc_text = ""
    if document_entities:
        doc_text = "\n## Document-Extracted Data\n"
        for entity in document_entities:
            doc_text += f"- [{entity.get('kind', '')}] {entity.get('label', '')}"
            if entity.get("value"):
                doc_text += f": {entity['value']}"
            if entity.get("unit"):
                doc_text += f" {entity['unit']}"
            doc_text += "\n"

    existing_text = ""
    if existing_flags:
        existing_text = "\n## Already-Detected Red Flags (by rule engine)\n"
        for flag in existing_flags:
            existing_text += f"- [{flag.get('level', '')}] {flag.get('title', '')}\n"
        existing_text += "\nDo NOT duplicate these. Look for ADDITIONAL patterns only.\n"

    return f"""\
Analyze this patient's clinical data for red flags and urgent findings.

## Patient-Reported History
{history_text}
{doc_text}
{existing_text}

Evaluate all red flag categories and return your analysis.
"""
