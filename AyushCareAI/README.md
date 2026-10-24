# MediKiosk AI Backend

AI backend for the MediKiosk clinical history platform, built with FastAPI.

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

### 1. Install Dependencies
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
copy .env.example .env
# Edit .env with your API keys (GEMINI_API_KEY at minimum)
```

### 3. Run Development Server
```bash
uvicorn app.main:app --reload --port 8001
```

### 4. Run Tests
```bash
pytest tests/ -v
```

### 5. Docker (Production)
```bash
docker-compose up --build
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | System health check |
| POST | `/api/v1/sessions` | Create intake session |
| GET | `/api/v1/sessions/{id}` | Get session status |
| DELETE | `/api/v1/sessions/{id}` | Close session |
| GET | `/api/v1/sessions/{id}/consent/scopes` | Get consent scopes |
| POST | `/api/v1/sessions/{id}/consent` | Grant consent |
| POST | `/api/v1/sessions/{id}/consent/withdraw` | Withdraw consent |
| POST | `/api/v1/sessions/{id}/conversation/start` | Start interview |
| GET | `/api/v1/sessions/{id}/conversation/state` | Get conversation state |
| POST | `/api/v1/sessions/{id}/conversation/answer` | Submit text answer |
| POST | `/api/v1/sessions/{id}/conversation/speech` | Submit speech answer |
| POST | `/api/v1/sessions/{id}/conversation/tts` | Text-to-speech |
| POST | `/api/v1/sessions/{id}/documents/upload` | Upload document |
| GET | `/api/v1/sessions/{id}/documents` | List documents |
| PUT | `/api/v1/sessions/{id}/documents/{doc}/entities/{ent}/verify` | Verify entity |
| POST | `/api/v1/sessions/{id}/summary/generate` | Generate summary |
| GET | `/api/v1/sessions/{id}/summary` | Get summary |
| PUT | `/api/v1/sessions/{id}/summary/sections/{sec}` | Edit section |
| POST | `/api/v1/sessions/{id}/summary/decision` | Accept/reject summary |
| GET | `/api/v1/sessions/{id}/fhir/preview` | FHIR bundle preview |

## AI Modules & Free Technology Stack

### AI Stack
- **Primary LLM**: Google Gemini 2.0 Flash / 2.5 Pro
- **Fallback LLM**: Groq Qwen 2.5 32B
- **Speech-to-Text (ASR)**: Groq Whisper Large v3 Turbo
- **Text-to-Speech (TTS)**: Microsoft Edge Neural TTS
- **Document OCR**: Gemini 2.0 Flash Vision

### Module A — Conversational History Engine
- LLM-driven adaptive clinical interview following SOCRATES framework
- Supports 10 Indian languages with bilingual output
- Real-time red-flag detection (deterministic + LLM)
- Speech input (Groq Whisper ASR) and output (Edge Neural TTS)
- AYUSH Dashavidha Pariksha extension

### Module B — Document Intelligence
- Medical document OCR (Gemini Vision / Google Vision / Tesseract)
- LLM-powered entity extraction (medicines, labs, conditions)
- Abnormal value flagging against 23 lab reference ranges
- Drug interaction detection
- Image quality assessment

### Module C — Clinical Summary Generator
- LLM-generated physician-ready summaries
- Bilingual section headings (English/Hindi)
- Source attribution (patient-reported vs document-extracted)
- Clinician editing with audit trail
- Accept/reject workflow

### Module D — Consent, Privacy & ABDM
- Granular consent scopes (DPDPA 2023)
- FHIR R4 bundle preview (export blocked)
- Structured audit logging

## Safety

> **This system does NOT diagnose, prescribe, or replace clinical judgement**
> All output is for clinician review only

- 10 deterministic red-flag rules with emergency escalation
- LLM-augmented compound pattern detection
- 6 predefined safety scenarios with automated testing
- Suicidal ideation detection with crisis helpline numbers
- Critical lab value alerting


## AI provider configuration

The Python AI service is the server-side integration boundary for external AI providers.

- **Bhashini:** ASR, TTS, translation and language detection (plus the retained Bhashini OCR provider).
- **Azure AI Document Intelligence:** primary OCR when `OCR_PROVIDER=azure`.
- **Azure AI Language / Text Analytics for Health:** specialist medical entity/assertion extraction when `MEDICAL_NLP_PROVIDER=azure`.
- **Groq:** existing LLM and optional vision/Whisper fallback functionality.

Provider credentials must be supplied through server-side environment variables. Never expose them in Kiosk, Mobile, or Doctor Panel frontend code.

The Azure medical NLP result is an assistive extraction signal and remains subject to clinician verification; it is not a diagnosis or substitute for clinical judgment.
