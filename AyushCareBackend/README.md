# AyushCare Backend — Kiosk + Mobile Foundation

This backend is the shared patient-facing API layer for the AyushCare kiosk and mobile companion. Doctor and admin routes are intentionally preserved but are outside the scope of this integration.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

The server defaults to port `8000` and exposes `GET /health`.

## Patient/Kiosk flow

1. `POST /api/v1/intake/auth/abha` — verify/register patient and initialize consultation + MediKiosk AI session.
2. `GET /api/v1/intake/session/:session_id` — restore consultation state.
3. `PUT /api/v1/intake/session/:session_id/language` — change language.
4. `POST /api/v1/intake/session/:session_id/dialogue/start` — start adaptive AI interview.
5. `GET /api/v1/intake/session/:session_id/dialogue/state` — restore AI interview.
6. `POST /api/v1/intake/session/:session_id/dialogue/answer` — submit touch/text answer.
7. `POST /api/v1/intake/session/:session_id/dialogue/speech` — forward audio to MediKiosk AI.
8. `GET /api/v1/intake/session/:session_id/dialogue/tts` — forward TTS request to MediKiosk AI.
9. `POST /api/v1/intake/session/:session_id/vitals` — store kiosk/manual vitals.
10. `GET /api/v1/intake/departments?hospital_id=...&pathway=ayurveda|allopathy` — pathway-specific departments.
11. `GET /api/v1/intake/departments/:department_id/doctors` — doctor catalog.
12. `POST /api/v1/intake/session/:session_id/summary/generate` — generate AI summary.
13. `GET /api/v1/intake/session/:session_id/summary` — retrieve summary.
14. `GET/POST /api/v1/intake/session/:session_id/consent*` — consent lifecycle.
15. `POST /api/v1/intake/session/:session_id/token` — assign queue token.
16. `POST /api/v1/intake/session/:session_id/complete` — close kiosk session and hand off to queue.
17. `POST /api/v1/intake/session/:session_id/cancel` — cancel/expire intake.

## Mobile Flow A — kiosk-bound QR upload

- `GET /api/v1/mobile/kiosk-session/pair/:pairing_token`
- `POST /api/v1/mobile/kiosk-session/:session_id/upload-url`
- `POST /api/v1/mobile/kiosk-session/:session_id/register-document`
- `GET /api/v1/mobile/kiosk-session/:session_id/documents`
- `DELETE /api/v1/mobile/kiosk-session/:session_id/documents/:document_id`
- `POST /api/v1/mobile/kiosk-session/:session_id/sync`

Uploads go to S3 using short-lived presigned URLs. Registration triggers asynchronous retrieval and forwarding of the document to MediKiosk AI for OCR/entity extraction.

## Mobile Flow B — patient portal

OTP login, dashboard, audio summary, document vault and privacy settings remain available under `/api/v1/mobile/portal/*`.

## AI gateway

`src/services/aiService.js` is the server-side adapter for the MediKiosk AI API. React clients never need the AI service credentials.

Supported AI operations include session creation/deletion, language changes, conversation start/state/answer/speech/TTS, document upload/list/entity verification, summary generation/retrieval/editing, consent scopes/grant/receipt/withdraw and FHIR preview.

## Language/Bhashini gateway

`/api/v1/language/*` provides a backend-controlled language boundary for the 22 supported Indian languages. Static UI translations should remain in the frontends; dynamic speech/translation should use this backend boundary or the AI service. Bhashini credentials must remain server-side.

The Bhashini gateway adapter is configurable through `BHASHINI_GATEWAY_URL` and `BHASHINI_API_KEY`; the exact production Bhashini pipeline contract can be wired there once credentials/pipeline configuration are supplied.

## Database

`src/database/initSchema.js` is intentionally idempotent and also adds missing columns/indexes needed when upgrading the previous backend schema. It contains patient, consultation, department/pathway, kiosk session, vitals, documents, consent, summary, privacy and audit storage.

## Security notes

- Do not commit `.env`.
- Rotate any credentials that have previously been exposed.
- Use `NODE_ENV=production` and HTTPS for production cookies.
- Keep AWS, AI and Bhashini credentials on the server only.
