# P2Care AI Backend

AI backend for the P2Care clinical history platform, built with FastAPI.

## Architecture

```
app/
├── ai/               # AI provider abstraction (LLM, OCR, ASR, TTS)
│   └── prompts/      # Structured prompt templates
├── api/v1/           # REST API endpoints
├── domain/           # Pure clinical logic (no I/O)
├── infrastructure/   # Database, Redis, storage
├── models/           # Pydantic schemas
└── services/         # Business logic orchestration
tests/                # pytest test suite
```

## Quick Start

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env          # Configure provider credentials
uvicorn app.main:app --reload --port 8000
```

## Key Capabilities

- **Clinical interview** — adaptive SOCRATES-style questioning with text and speech input.
- **Document intelligence** — OCR, medical entity extraction, abnormal-value flagging.
- **Safety** — deterministic red-flag rules plus LLM-assisted compound pattern detection.
- **Summary generation** — structured clinical summary with clinician review workflow.
- **Speech** — server-side ASR and TTS integration with multilingual support.
- **FHIR** — R4 bundle preview for interoperability.

## AI Providers

| Capability | Provider |
| --- | --- |
| LLM | Google Gemini, Groq |
| OCR | Azure Document Intelligence, Tesseract |
| ASR/TTS | Bhashini, Azure Speech |
| Translation | Bhashini NMT |

## Testing

```bash
pytest tests/ -v
```

Tests cover conversation flow, clinical summaries, document intelligence, FHIR preview, red flags, and safety checks.

## Security

- All provider credentials must remain server-side.
- Do not commit `.env` files.
- AI output is assistive only — not a diagnosis or replacement for clinical judgement.
