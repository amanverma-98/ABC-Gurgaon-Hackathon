# P2Care Backend — Core API

This backend is the shared API layer for the P2Care platform — kiosk, mobile companion, emergency management, and admin/doctor operations.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

The server defaults to port `8001` and exposes `GET /health`.

### Bootstrap the database

```bash
node src/database/bootstrap.js    # Creates schema + seeds demo data
```

> **Warning:** Verify the `DATABASE_URL` in `.env` points to the correct P2Care database before running.

## Patient/Kiosk flow

1. `POST /api/v1/intake/auth/abha` — verify/register patient and initialize consultation + AI session.
2. `GET /api/v1/intake/session/:session_id` — restore consultation state.
3. `PUT /api/v1/intake/session/:session_id/language` — change language.
4. `POST /api/v1/intake/session/:session_id/dialogue/start` — start adaptive AI interview.
5. `GET /api/v1/intake/session/:session_id/dialogue/state` — restore AI interview.
6. `POST /api/v1/intake/session/:session_id/dialogue/answer` — submit touch/text answer.
7. `POST /api/v1/intake/session/:session_id/dialogue/speech` — forward audio to AI service.
8. `GET /api/v1/intake/session/:session_id/dialogue/tts` — forward TTS request to AI service.
9. `POST /api/v1/intake/session/:session_id/vitals` — store kiosk/manual vitals.
10. `GET /api/v1/intake/departments?hospital_id=...&pathway=ayurveda|allopathy` — pathway-specific departments.
11. `GET /api/v1/intake/departments/:department_id/doctors` — doctor catalog.
12. `POST /api/v1/intake/session/:session_id/summary/generate` — generate AI summary.
13. `GET /api/v1/intake/session/:session_id/summary` — retrieve summary.
14. `GET/POST /api/v1/intake/session/:session_id/consent*` — consent lifecycle.
15. `POST /api/v1/intake/session/:session_id/token` — assign queue token.
16. `POST /api/v1/intake/session/:session_id/complete` — close kiosk session and hand off to queue.
17. `POST /api/v1/intake/session/:session_id/cancel` — cancel/expire intake.

## Emergency / SOS flow (P2Care extension)

All emergency endpoints are mounted at `/api/v1/emergency/`:

- `POST /intake` — create emergency case (public, kiosk-facing).
- `GET /cases` — list emergency cases for the hospital.
- `GET /cases/:id` — get case details.
- `POST /cases/:id/acknowledge` — acknowledge an alert.
- `POST /cases/:id/assign` — assign staff.
- `POST /cases/:id/escalate` — escalate case.
- `PATCH /cases/:id/status` — update operational status.
- `POST /cases/:id/notes` — add timestamped note.
- `POST /cases/:id/resolve` — resolve and close.
- `GET /cases/:id/timeline` — action/audit timeline.
- `POST /cases/:id/confirm-identity` — link to patient profile.
- `POST /access-grants` — issue time-limited access grant (≤36 hours, server-enforced).
- `GET /access-grants` — list active grants.
- `POST /access-grants/:id/revoke` — revoke access.
- `GET /patients/:id/authorized-data` — get grant-scoped patient data.
- `GET /audit-log` — access audit history (admin only).

## Mobile Flow A — kiosk-bound QR upload

- `GET /api/v1/mobile/kiosk-session/pair/:pairing_token`
- `POST /api/v1/mobile/kiosk-session/:session_id/upload-url`
- `POST /api/v1/mobile/kiosk-session/:session_id/register-document`
- `GET /api/v1/mobile/kiosk-session/:session_id/documents`
- `DELETE /api/v1/mobile/kiosk-session/:session_id/documents/:document_id`
- `POST /api/v1/mobile/kiosk-session/:session_id/sync`

Uploads go to S3 using short-lived presigned URLs. Registration triggers asynchronous retrieval and forwarding of the document to the AI service for OCR/entity extraction.

## Mobile Flow B — patient portal

OTP login, dashboard, audio summary, document vault and privacy settings remain available under `/api/v1/mobile/portal/*`.

## AI gateway

`src/services/aiService.js` is the server-side adapter for the P2Care AI API. React clients never need the AI service credentials.

## Language/Bhashini gateway

`/api/v1/language/*` provides a backend-controlled language boundary for the 22 supported Indian languages. Bhashini credentials must remain server-side.

## Database

- `src/database/initSchema.js` — idempotent schema initialization for core tables.
- `src/database/p2careMigration.js` — additive P2Care tables (emergency_cases, access_grants, audit_log).
- `src/database/p2careSeedDemo.js` — demo data seeding (44 doctors, 10 departments, 5 patients).
- `src/database/bootstrap.js` — runs schema + migration + seed in sequence.

## Environment variables

See `.env.example` for all required configuration. Key P2Care additions:

- `P2CARE_MAX_ACCESS_GRANT_HOURS=36` — maximum access grant duration (server-enforced).
- `P2CARE_DEFAULT_ACCESS_GRANT_HOURS=8` — default grant duration.

## Security notes

- Do not commit `.env`.
- Rotate any credentials that have previously been exposed.
- Use `NODE_ENV=production` and HTTPS for production cookies.
- Keep AWS, AI, and Bhashini credentials on the server only.
- Emergency access grants enforce a strict 36-hour maximum server-side.
