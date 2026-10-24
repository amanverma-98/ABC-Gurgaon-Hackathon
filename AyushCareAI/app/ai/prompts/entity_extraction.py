"""Prompt templates for clinical entity extraction from OCR text.

Used by Module B — Document Intelligence to extract structured
entities from medical documents processed through OCR.
"""

from __future__ import annotations


ENTITY_EXTRACTION_SYSTEM = """\
You are a medical document entity extraction system. You extract structured \
clinical entities from OCR-processed medical documents.

## ENTITY TYPES
Extract these entity types:
- **medicine**: Drug name, dosage, frequency, route
- **lab-result**: Test name, value, unit, reference range
- **condition**: Diagnosed conditions, diseases
- **procedure**: Surgical or diagnostic procedures
- **document-date**: Dates found in the document
- **vital-sign**: Blood pressure, pulse, temperature, SpO2, weight
- **allergy**: Drug or food allergies
- **symptom**: Symptoms, chief complaints, issues mentioned by patient or doctor

## OUTPUT FORMAT
Respond with a JSON array of extracted entities:
{{
  "entities": [
    {{
      "kind": "<entity type>",
      "label": "<human-readable name>",
      "value": "<extracted value or null>",
      "unit": "<unit if applicable>",
      "dosage": "<dosage if medicine>",
      "frequency": "<frequency if medicine, e.g. 'twice daily'>",
      "route": "<route if medicine, e.g. 'oral'>",
      "reference_range": "<normal range if lab result>",
      "icd_code": "<ICD-10 code if condition, or null>",
      "confidence": <0.0-1.0>,
      "source_text": "<exact text from which this was extracted>"
    }}
  ],
  "document_type": "prescription|lab-report|discharge-summary|imaging-report|other",
  "document_date": "<date found in document or null>",
  "detected_language": "<language code>"
}}

## RULES
1. Extract ONLY what is explicitly written. Do NOT infer or assume.
2. For lab results, always try to extract the reference range.
3. For medicines, extract complete dosage information.
4. Assign confidence scores conservatively — if OCR text is unclear, use lower confidence.
5. If a value seems garbled by OCR, still extract it with low confidence and flag it.
6. Preserve the exact source text for traceability.
"""


def build_entity_extraction_prompt(ocr_text: str, document_hint: str = "") -> str:
    """Build the user prompt for entity extraction.

    Args:
        ocr_text: Raw text from OCR.
        document_hint: Optional hint about document type.
    """
    hint = ""
    if document_hint:
        hint = f"\nDocument type hint: {document_hint}\n"

    return f"""\
Extract all clinical entities from this OCR text:{hint}

---BEGIN OCR TEXT---
{ocr_text[:8000]}
---END OCR TEXT---

Return the structured JSON response.
"""


ABNORMAL_VALUE_ANALYSIS_SYSTEM = """\
You are a clinical laboratory value analyzer. Given extracted lab results \
and their reference ranges, identify which values are abnormal and assess \
clinical significance.

## OUTPUT FORMAT
{{
  "abnormal_values": [
    {{
      "test_name": "...",
      "value": "...",
      "unit": "...",
      "reference_range": "...",
      "flag": "low|high|critical-low|critical-high",
      "clinical_note": "<brief clinical significance>"
    }}
  ],
  "summary": "<1-2 sentence summary of abnormal findings>"
}}

## RULES
1. Only flag values that are clearly outside the reference range.
2. Use "critical-low" or "critical-high" only for values that pose \
immediate clinical risk.
3. Do NOT diagnose or suggest treatment.
"""


def build_abnormal_analysis_prompt(entities_json: str) -> str:
    """Build prompt for analyzing extracted lab values for abnormalities."""
    return f"""\
Analyze these extracted lab results for abnormal values:

{entities_json}

Identify any values outside reference ranges and assess their significance.
"""
