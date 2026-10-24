# MEDIKIOSK / AYUSHCARE — COMPREHENSIVE CURRENT STATE AUDIT

**Audit Date**: September 2026  
**Audit Scope**: Multi-application healthcare platform (Python AI, Node.js Backend, Kiosk Frontend, Mobile Frontend, Doctor/Admin Panel)  
**Audit Type**: Strict Read-Only Architecture, Database, Identity, and Integration Audit  

---

## TABLE OF CONTENTS
1. [Part 1 — Project Structure](#part-1--project-structure)
2. [Part 2 — Node.js Backend Architecture](#part-2--nodejs-backend-architecture)
3. [Part 3 — Complete Database Audit](#part-3--complete-database-audit)
   - [Database Table Inventory](#database-table-inventory)
   - [Patient Identity Audit](#patient-identity-audit)
   - [ABHA Audit](#abha-audit)
   - [Patient ID Dependency Map](#patient-id-dependency-map)
4. [Part 4 — Kiosk Audit](#part-4--kiosk-audit)
   - [Kiosk Language Audit](#kiosk-language-audit)
5. [Part 5 — Mobile Audit](#part-5--mobile-audit)
6. [Part 6 — Doctor / Admin Panel Audit](#part-6--doctor--admin-panel-audit)
7. [Part 7 — Doctor / Hospital / Department Routing Logic](#part-7--doctor--hospital--department-routing-logic)
8. [Part 8 — Redis Audit](#part-8--redis-audit)
9. [Part 9 — QR Flow Trace](#part-9--qr-flow-trace)
10. [Part 10 — Document / OCR / AI Pipeline](#part-10--document--ocr--ai-pipeline)
11. [Part 11 — Bhashini Audit](#part-11--bhashini-audit)
12. [Part 12 — Azure Audit](#part-12--azure-audit)
13. [Part 13 — Groq Audit](#part-13--groq-audit)
14. [Part 14 — Clinical Interview State Machine](#part-14--clinical-interview-state-machine)
15. [Part 15 — Authentication and Consent](#part-15--authentication-and-consent)
16. [Part 16 — Privacy / DPDP / Access Control](#part-16--privacy--dpdp--access-control)
17. [Part 17 — Environment Configuration](#part-17--environment-configuration)
18. [Part 18 — Cross-Service API Contract](#part-18--cross-service-api-contract)
19. [Part 19 — Type & Schema Consistency](#part-19--type--schema-consistency)
20. [Part 20 — Duplication & Redundancy](#part-20--duplication--redundancy)
21. [Part 21 — Broken / Incomplete Features](#part-21--broken--incomplete-features)
22. [Part 22 — Safe Validation Report](#part-22--safe-validation-report)
23. [Part 23 — Final ABHA Migration Blueprint](#part-23--final-abha-migration-blueprint)
24. [Concise Executive Summary](#concise-executive-summary)

---

## PART 1 — PROJECT STRUCTURE

```
SIH26047V2/
├── AyushCareAI/                # Python FastAPI AI / ML Microservice (Port 8001)
│   ├── app/
│   │   ├── ai/                 # AI provider clients (Bhashini, Azure, Groq, OCR, ASR, TTS, NMT)
│   │   ├── api/                # FastAPI routers & middlewares (v1, rate limiting, audit log)
│   │   ├── domain/             # Clinical protocols, AYUSH dosha logic, red flag rules, languages
│   │   ├── infrastructure/     # Database (SQLAlchemy async), Redis client, local file storage
│   │   ├── models/             # Pydantic domain & request/response schemas
│   │   ├── services/           # ConversationEngine, DocumentIntelligence, ClinicalSummary, FHIR
│   │   ├── config.py           # Pydantic Settings loaded from .env
│   │   ├── dependencies.py     # FastAPI singleton dependency injection
│   │   └── main.py             # FastAPI app entry point & lifespan management
│   ├── tests/                  # Pytest unit & integration tests
│   ├── Dockerfile              # Production container image definition
│   ├── docker-compose.yml      # Local orchestration (FastAPI + Redis)
│   ├── pyproject.toml          # Poetry build & tool definitions
│   ├── requirements.txt        # PIP dependencies
│   └── medikiosk_dev.db        # Development SQLite database (read-only inspected: 0 rows)
│
├── AyushCareBackend/           # Node.js Core Application Backend (Port 8000)
│   ├── src/
│   │   ├── controllers/        # auth, admin, doctor, kiosk, mobile, language controllers
│   │   ├── database/           # dbConnection.js (pg.Pool / Neon), initSchema.js (DDL migrations)
│   │   ├── middleware/         # auth.middleware (JWT), role.middleware, rawAudio, error
│   │   ├── routes/             # Express routers (auth, admin, doctor, intake/kiosk, mobile, language)
│   │   ├── services/           # aiService.js (HTTP gateway), languageService.js, privacyService.js, patientQrService.js
│   │   ├── utilities/          # ApiError, ApiResponse, asyncHandler, otpStore (in-memory Map), smsHelper
│   │   ├── app.js              # Express app configuration, CORS, cookie parser, router mounting
│   │   └── index.js            # Server entry point (app.listen)
│   ├── package.json            # Node.js dependencies (pg, express, bcryptjs, jsonwebtoken, @aws-sdk/client-s3)
│   └── MIGRATION_*.sql         # Standalone SQL migrations (applied via initSchema.js)
│
├── AyushCareKiosk/             # Patient Physical Kiosk Application (Port 5173)
│   ├── src/
│   │   ├── pages/              # 10 sequential kiosk screens (Welcome, Auth, Dept, Language, Intake, History, QR, Review, Token)
│   │   ├── components/         # Navbar, Footer, KioskInput, Virtual Keyboard
│   │   ├── constants/          # indianLanguages.js (22 8th Schedule languages)
│   │   ├── context/            # KeyboardContext.jsx
│   │   ├── hooks/              # useTranslation, useAutoNarration, useDomTranslation
│   │   ├── loc/                # 22.js (core locales) + en.json, hi.json, bn.json, pa.json
│   │   ├── services/           # api.js (Axios), audioService.js, speechRecorder.js, socket.js (0 bytes)
│   │   ├── store/              # useKioskStore.js (Zustand state store)
│   │   ├── App.jsx             # Top-level screen router
│   │   └── main.jsx            # React root mount
│   ├── package.json            # React 18, Vite, Lucide React, Zustand, Axios
│   └── vite.config.js          # Vite build config
│
├── AyushCareMobile/            # Patient Mobile Companion / Web Portal (Port 5174)
│   ├── src/
│   │   ├── pages/mobile/       # 23 screens (M1 Home, M2-M9 Document flow, Visits, Appointments, Records, Privacy, QR Connect)
│   │   ├── components/         # BottomNavigation, MobileHeader, DocumentScanner, Timeline
│   │   ├── services/           # apiClient.js, authService.js, documentService.js, portalService.js, kioskSessionService.js
│   │   ├── store/              # useMobileStore.js (Zustand state store)
│   │   ├── data/               # mockData.js (Canonical demo patient Rajesh Kumar Sharma)
│   │   ├── App.jsx             # Screen switcher & bottom nav shell
│   │   └── main.jsx            # React root mount
│   ├── package.json            # React 18, Vite, Lucide React, Zustand
│   └── vite.config.js          # Vite build config
│
└── HNDPANEL/                   # Doctor & Hospital Admin Panel (Port 3000)
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/login/   # Hospital staff login page
    │   │   ├── (hospital)/doctor/ # Doctor clinical workspace (OPD Queue, SOCRATES, AI summary, Reports, Prescriptions)
    │   │   └── (hospital)/admin/  # Admin queue monitor & doctor department management
    │   ├── components/         # ClinicalWorkspace.tsx, EvidenceDrawer.tsx, QueueSidebar.tsx, TopNavbar.tsx
    │   ├── services/           # doctor.service.ts, admin.service.ts, auth.service.ts
    │   ├── lib/                # axios.ts, socket.ts, adapters.ts (Clinical summary & queue mapper)
    │   ├── types/              # api.ts, clinical.ts (TypeScript interface contracts)
    │   └── data/               # mockPatients.ts (Empty array - uses real API)
    ├── package.json            # Next.js 15, React 19, TypeScript, TailwindCSS, Axios, Socket.IO Client
    └── tsconfig.json           # TypeScript configuration
```

---

## PART 2 — NODE.JS BACKEND ARCHITECTURE

- **Framework**: Express.js (ES Modules `"type": "module"`)
- **Server Entry Point**: [src/index.js](file:///d:/Users/SomuData/Desktop/SIH26047V2/AyushCareBackend/src/index.js)
- **App Entry Point**: [src/app.js](file:///d:/Users/SomuData/Desktop/SIH26047V2/AyushCareBackend/src/app.js)
- **Database Engine**: PostgreSQL (Neon Serverless Pool via `pg.Pool` in `src/database/dbConnection.js`)
- **ORM / Query Builder**: Raw parameterized SQL queries (`pool.query`)
- **Schema Management**: DDL statements executed inside a transaction on startup via `src/database/initSchema.js`
- **Object Storage**: AWS S3 (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)
- **AI Gateway**: `src/services/aiService.js` (HTTP REST client calling FastAPI backend on `http://127.0.0.1:8001`)
- **WebSockets**: **NOT IMPLEMENTED** in backend. No Socket.IO server is mounted in `app.js` or `index.js`.
- **Redis**: **NOT IMPLEMENTED** in backend. No Redis client exists in `package.json`.
- **OTP Storage**: In-memory JavaScript `Map` (`src/utilities/otpStore.js`) with static fallback `123456`.

### Major Route Registration Table

| Method | Path | Controller | Service | Database Tables | External Service | Request Body | Response Shape |
|---|---|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/register-admin` | `auth.controller.js:registerAdmin` | Internal bcrypt | `hospitals`, `users` | None | `{ hospitalName, stateCode, name, email, password }` | `{ id, name, email, role }` |
| `POST` | `/api/v1/auth/login` | `auth.controller.js:loginUser` | Internal bcrypt + JWT | `users` | None | `{ email, password }` | `{ user, accessToken }` (cookie: `accessToken`) |
| `POST` | `/api/v1/auth/logout` | `auth.controller.js:logoutUser` | Internal | None | None | None | `{}` (clears cookie) |
| `GET` | `/api/v1/auth/me` | `auth.controller.js:getMe` | Internal | `users` | None | None | `User` object |
| `GET` | `/api/v1/admin/doctors` | `admin.controller.js:getDoctorsList` | Internal | `users` | None | None | `Doctor[]` |
| `POST` | `/api/v1/admin/doctors/departments` | `admin.controller.js:assignDoctorToDepartment` | Internal | `doctor_departments`, `users`, `departments` | None | `{ doctorId, departmentId }` | `doctor_departments` row |
| `GET` | `/api/v1/admin/doctors/departments` | `admin.controller.js:getDoctorDepartments` | Internal | `doctor_departments`, `departments`, `users` | None | None | Assignments list |
| `GET` | `/api/v1/admin/analytics/visits` | `admin.controller.js:getVisitAnalytics` | Hardcoded mock | None | None | None | `{ kiosk_visits, token_conversions, consultations_completed }` |
| `POST` | `/api/v1/admin/queue/override` | `admin.controller.js:overrideQueue` | Internal | `consultations` | None | `{ consultationId, newStatus }` | `{}` |
| `GET` | `/api/v1/doctor/queue` | `doctor.controller.js:getDoctorQueue` | Internal | `consultations`, `patients` | None | None | Queue items for logged-in doctor (`c.assigned_doctor_id = req.user.id`) |
| `GET` | `/api/v1/doctor/patients/:id/summary` | `doctor.controller.js:getPatientSummary` | `privacyService.js` | `consultations`, `patients`, `clinical_summaries`, `patient_privacy_rules`, `privacy_settings` | None | None | `clinical_summaries` row (or restricted flag) |
| `GET` | `/api/v1/doctor/patients/:id/reports` | `doctor.controller.js:getPatientReports` | `privacyService.js` | `consultations`, `patients`, `uploaded_documents`, `patient_privacy_rules`, `privacy_settings` | None | None | `uploaded_documents[]` filtered by privacy rules |
| `PATCH` | `/api/v1/doctor/consultations/:id/status` | `doctor.controller.js:updateConsultationStatus` | Internal | `consultations` | None | `{ status }` | `{}` |
| `POST` | `/api/v1/doctor/consultations/:id/sign-off` | `doctor.controller.js:signOffConsultation` | Internal | `consultations` | None | `{ remarks }` | `{}` |
| `POST` | `/api/v1/intake/auth/abha` | `kiosk.controller.js:performAbhaRegister` | `aiService.js:createSession`, `languageService.js` | `patients`, `hospitals`, `departments`, `users`, `doctor_departments`, `consultations`, `kiosk_sessions`, `audit_events` | Python AI `/api/v1/sessions` | Full patient demographic payload + consent + pathway + dept | `{ patient, consultation_id, session_id, ai_session_id, pairing_session }` |
| `GET` | `/api/v1/intake/patients/lookup` | `kiosk.controller.js:lookupPatients` | Internal | `patients`, `consultations`, `departments` | None | Query params (`abha_number`, `mobile_number`) | `{ multiple, patients: [...] }` |
| `GET` | `/api/v1/intake/session/:session_id` | `kiosk.controller.js:getSession` | Internal | `consultations`, `uploaded_documents`, `vitals`, `clinical_summaries` | None | None | Session aggregate state |
| `PUT` | `/api/v1/intake/session/:session_id/language` | `kiosk.controller.js:updateSessionLanguage` | `aiService.js:updateLanguage` | `consultations` | Python AI `/api/v1/sessions/{id}/language` | `{ language }` | Updated consultation + language metadata |
| `PUT` | `/api/v1/intake/session/:session_id/routing` | `kiosk.controller.js:updateConsultationRouting` | Internal | `consultations`, `departments`, `users`, `audit_events` | None | `{ departmentId, doctorId }` | Updated consultation + department + doctor |
| `POST` | `/api/v1/intake/session/:session_id/dialogue/start` | `kiosk.controller.js:startDialogue` | `aiService.js:startConversation` | `consultations` | Python AI `/api/v1/sessions/{id}/conversation/start` | None | First AI question + choices |
| `GET` | `/api/v1/intake/session/:session_id/dialogue/state` | `kiosk.controller.js:getDialogueState` | `aiService.js:getConversationState` | `consultations` | Python AI `/api/v1/sessions/{id}/conversation/state` | None | Conversation history + current question |
| `POST` | `/api/v1/intake/session/:session_id/dialogue/answer` | `kiosk.controller.js:answerDialogue` | `aiService.js:submitConversationAnswer` | `consultations` | Python AI `/api/v1/sessions/{id}/conversation/answer` | `{ question_id, answer, input_mode, confidence }` | Next AI question + red flags |
| `POST` | `/api/v1/intake/session/:session_id/dialogue/speech` | `kiosk.controller.js:speechDialogue` | `aiService.js:submitSpeech` | `consultations` | Python AI `/api/v1/sessions/{id}/conversation/speech` | Binary audio payload | Transcribed answer + next question + red flags |
| `POST` | `/api/v1/intake/session/:session_id/dialogue/tts` | `kiosk.controller.js:ttsDialogue` | `aiService.js:tts` | `consultations` | Python AI `/api/v1/sessions/{id}/conversation/tts` | `{ text, language }` | `{ audio_base64, encoding }` |
| `POST` | `/api/v1/intake/session/:session_id/vitals` | `kiosk.controller.js:saveVitals` | Internal | `vitals`, `consultations` | None | `{ systolic, diastolic, pulse, temperature, spo2, source }` | Saved `vitals` row |
| `POST` | `/api/v1/intake/session/:session_id/summary/generate` | `kiosk.controller.js:generateSummary` | `aiService.js:generateSummary` | `consultations`, `clinical_summaries` | Python AI `/api/v1/sessions/{id}/summary/generate` | `{ language, include_ayush, conversation_history }` | Complete AI clinical summary payload |
| `POST` | `/api/v1/intake/session/:session_id/consent` | `kiosk.controller.js:grantConsent` | `aiService.js:grantConsent` | `consent_records`, `patients`, `consultations`, `audit_events` | Python AI `/api/v1/sessions/{id}/consent` | `{ clinical_intake, document_processing, his_abdm_sharing }` | `consent_records[]` |
| `POST` | `/api/v1/intake/session/:session_id/token` | `kiosk.controller.js:generateToken` | PostgreSQL advisory transaction lock | `consultations`, `patients`, `audit_events` | None | None | `{ token_number, status, consultation_id, patient }` |
| `POST` | `/api/v1/intake/session/:session_id/patient-upload-qr` | `kiosk.controller.js:createPatientUploadQr` | `patientQrService.js` | `consultations`, `patients`, `patient_qr_tokens` | None | None | `{ token, expires_at, expires_in_seconds: 80, abha_number, patient_name }` |
| `GET` | `/api/v1/mobile/kiosk-session/pair/:pairing_token` | `mobile.controller.js:pairKioskSession` | Internal | `kiosk_sessions`, `consultations`, `departments`, `patients` | None | None | Kiosk session details + patient demographic info |
| `POST` | `/api/v1/mobile/kiosk-session/:session_id/upload-url` | `mobile.controller.js:getUploadUrl` | AWS S3 Presigner | `kiosk_sessions` | AWS S3 | `{ file_name, content_type }` | `{ upload_url, file_key }` |
| `POST` | `/api/v1/mobile/kiosk-session/:session_id/register-document` | `mobile.controller.js:registerDocument` | `aiService.js:uploadDocument` | `kiosk_sessions`, `consent_records`, `consultations`, `uploaded_documents` | AWS S3 (Get) + Python AI (OCR/NLP) | `{ file_key, document_type }` | `uploaded_documents` record (triggers async OCR pipeline) |
| `POST` | `/api/v1/mobile/portal/qr/exchange` | `mobile.controller.js:exchangePatientUploadQr` | `patientQrService.js:signPatientToken` | `patient_qr_tokens`, `patients`, `consent_records` | None | `{ token }` | `{ accessToken, patient, consultation_id, auth_mode }` |
| `POST` | `/api/v1/mobile/portal/auth/send-otp` | `mobile.controller.js:sendPortalOtp` | `otpStore.js`, `smsHelper.js` | `patients` | SMS Provider (mock) | `{ mobileNumber, abhaNumber }` | `{ mobile, delivery }` |
| `POST` | `/api/v1/mobile/portal/auth/verify-otp` | `mobile.controller.js:verifyPortalOtp` | `otpStore.js`, JWT | `patients`, `consultations`, `departments`, `users`, `hospitals` | None | `{ mobileNumber, otp, abhaNumber }` | `{ patient, patients, accessToken, multiplePatients }` |
| `POST` | `/api/v1/mobile/portal/select-patient` | `mobile.controller.js:selectPortalPatient` | JWT | `patients`, `consultations`, `departments`, `users`, `hospitals` | None | `{ abhaNumber }` | `{ patient, accessToken }` |
| `GET` | `/api/v1/mobile/portal/dashboard` | `mobile.controller.js:getPortalDashboard` | Internal | `consultations`, `hospitals`, `clinical_summaries`, `patients`, `privacy_settings`, `vitals` | None | None (requires Patient JWT) | Patient dashboard (appointment, vitals, summary) |
| `GET` | `/api/v1/mobile/portal/visits` | `mobile.controller.js:getPortalVisits` | Internal | `consultations`, `hospitals`, `departments`, `users` | None | None (requires Patient JWT) | Patient visit history list |
| `GET` | `/api/v1/mobile/portal/visits/:visit_id` | `mobile.controller.js:getPortalVisitDetails` | AWS S3 Presigner | `consultations`, `patients`, `hospitals`, `departments`, `users`, `clinical_summaries`, `vitals`, `uploaded_documents` | AWS S3 | None (requires Patient JWT) | Visit details + vitals + summary + signed documents |
| `POST` | `/api/v1/mobile/portal/documents/upload-url` | `mobile.controller.js:getUploadUrl` | AWS S3 Presigner | `consultations`, `consent_records` | AWS S3 | `{ file_name, content_type }` | `{ upload_url, file_key: 'vault/:patient_id/...' }` |
| `POST` | `/api/v1/mobile/portal/documents/register` | `mobile.controller.js:registerPortalDocument` | `aiService.js:uploadDocument` | `consultations`, `consent_records`, `uploaded_documents` | AWS S3 + Python AI | `{ file_key, document_type, consultation_id }` | `uploaded_documents` record |
| `GET` | `/api/v1/mobile/portal/privacy-settings` | `mobile.controller.js:getPortalPrivacy` | Internal | `privacy_settings` | None | None (requires Patient JWT) | Global privacy settings |
| `PATCH` | `/api/v1/mobile/portal/privacy-settings` | `mobile.controller.js:updatePortalPrivacy` | Internal | `privacy_settings` | None | Privacy flags payload | Updated `privacy_settings` |
| `GET` | `/api/v1/mobile/portal/privacy-context` | `mobile.controller.js:getPortalPrivacyContext` | Internal | `consultations`, `hospitals`, `departments`, `users`, `uploaded_documents`, `patient_privacy_rules` | None | None (requires Patient JWT) | Hierarchical privacy items (hospitals, visits, docs, rules) |
| `PATCH` | `/api/v1/mobile/portal/privacy-rules` | `mobile.controller.js:updatePortalPrivacyRule` | `privacyService.js:upsertPrivacyRule` | `consultations`, `uploaded_documents`, `patient_privacy_rules` | None | `{ scope_type, hospital_id, consultation_id, document_id, allow_doctor_access, reason }` | Saved `patient_privacy_rules` row |
| `GET` | `/api/v1/language/languages` | `language.controller.js:languages` | `languageService.js` | None | Python AI `/api/v1/languages` | None | List of 22 supported languages |
| `POST` | `/api/v1/language/translate` | `language.controller.js:translateText` | `languageService.js:translate` | None | Python AI `/api/v1/translate` | `{ text, source_language, target_language }` | Translated text |

---

## PART 3 — COMPLETE DATABASE AUDIT

### Database Engine & Configuration
- **Engine**: PostgreSQL 15+ (Hosted on Neon serverless PostgreSQL)
- **SSL**: Enforced (`ssl: { rejectUnauthorized: true }`)
- **Connection String Variable**: `DATABASE_URL`
- **Secondary Engine**: SQLite (`AyushCareAI/medikiosk_dev.db`) initialized via SQLAlchemy in Python microservice. Read-only query confirmed all 5 tables (`sessions`, `conversation_turns`, `documents`, `consent_receipts`, `audit_log`) currently contain 0 rows.

### Database Table Inventory

| Table Name | Purpose | Primary Key | Foreign Keys | Important Columns | Unique Constraints | Indexes | Relationships |
|---|---|---|---|---|---|---|---|
| `hospitals` | Hospital / clinical site catalog | `id (UUID)` | None | `name (VARCHAR 255)`, `state_code (VARCHAR 10)` | None | PK | 1:M to `users`, `departments`, `consultations` |
| `users` | Hospital staff (Admins & Doctors) | `id (UUID)` | `hospital_id -> hospitals.id` | `email`, `password_hash`, `role (user_role enum)`, `specialization`, `is_active` | `email` | `users_email_key` | M:1 to `hospitals`, M:M to `departments` via `doctor_departments` |
| `patients` | Canonical patient demographic registry | `id (UUID)` | None | `abha_number (VARCHAR 17)`, `abha_address (VARCHAR 100)`, `full_name`, `gender`, `date_of_birth`, `mobile_number`, `aadhaar_number`, `consent_granted` | `abha_number`, `abha_address` | `idx_patients_mobile`, `idx_patients_aadhaar`, `idx_patients_abha_number` | 1:M to `consultations`, `patient_qr_tokens`, `patient_privacy_rules`, `privacy_settings` |
| `departments` | Hospital clinical service units | `id (UUID)` | `hospital_id -> hospitals.id` | `name`, `pathway (VARCHAR 30: allopathy/ayurveda)`, `is_active` | `(hospital_id, name)` | Unique composite | M:1 to `hospitals`, M:M to `users` via `doctor_departments` |
| `doctor_departments` | Mapping of doctors to clinical departments | `(doctor_id, department_id)` | `doctor_id -> users.id`, `department_id -> departments.id` | `doctor_id`, `department_id`, `created_at` | Composite PK | `idx_doctor_departments_department` | Join table connecting `users` to `departments` |
| `consultations` | Clinical encounter / OPD visit instance | `id (UUID)` | `hospital_id -> hospitals.id`, `patient_id -> patients.id`, `department_id -> departments.id`, `assigned_doctor_id -> users.id` | `token_number`, `status (consultation_status enum)`, `risk_level`, `intake_pathway`, `language`, `ai_session_id`, `remarks` | None | `idx_consultations_patient`, `idx_consultations_queue` | M:1 to `patients`, `departments`, `users`; 1:1 to `clinical_summaries`, `vitals`; 1:M to `uploaded_documents`, `consent_records` |
| `clinical_summaries` | AI-generated clinical SOAP intake summary | `id (UUID)` | `consultation_id -> consultations.id` | `chief_complaint`, `history_of_present_illness`, `past_medical_history (JSONB)`, `drug_allergies (JSONB)`, `medications (JSONB)`, `ayush_attributes (JSONB)`, `ai_payload (JSONB)` | `consultation_id` | `idx_clinical_summaries_consultation` | 1:1 to `consultations` |
| `uploaded_documents` | Uploaded prescriptions, labs, reports | `id (UUID)` | `consultation_id -> consultations.id` | `file_path_hash (S3 Key)`, `document_type`, `source_mime_type`, `extracted_data (JSONB)`, `status (document_status enum)`, `processing_error` | None | `idx_documents_consultation` | M:1 to `consultations`, 1:M to `patient_privacy_rules` |
| `kiosk_sessions` | Temporary pairing session for kiosk-mobile transfer | `id (UUID)` | `consultation_id -> consultations.id` | `pairing_token (VARCHAR 255)`, `kiosk_id`, `is_active`, `expires_at` | `pairing_token` | `idx_kiosk_pairing` | M:1 to `consultations` |
| `patient_qr_tokens` | Single-use secure tokens for mobile portal handoff | `id (UUID)` | `patient_id -> patients.id`, `consultation_id -> consultations.id` | `token_hash (VARCHAR 64: SHA-256)`, `expires_at`, `used_at` | `token_hash` | `idx_patient_qr_token_active` | M:1 to `patients` and `consultations` |
| `vitals` | Physiological measurements taken at kiosk | `id (UUID)` | `consultation_id -> consultations.id` | `systolic`, `diastolic`, `pulse`, `temperature`, `spo2`, `source` | `consultation_id` | `idx_vitals_consultation` | 1:1 to `consultations` |
| `consent_records` | Individual granular DPDP consent receipts | `id (UUID)` | `consultation_id -> consultations.id` | `scope_id (e.g. clinical_intake, document_processing)`, `title`, `purpose`, `required`, `status`, `granted_at`, `withdrawn_at` | None | PK | M:1 to `consultations` |
| `patient_privacy_rules` | Granular patient-controlled access restrictions | `id (UUID)` | `patient_id -> patients.id`, `hospital_id -> hospitals.id`, `consultation_id -> consultations.id`, `document_id -> uploaded_documents.id` | `scope_type ('hospital', 'visit', 'document')`, `allow_doctor_access (BOOLEAN)`, `reason` | None | `idx_patient_privacy_rules_patient`, `idx_patient_privacy_rules_hospital`, `idx_patient_privacy_rules_visit`, `idx_patient_privacy_rules_document` | M:1 to `patients` |
| `privacy_settings` | Global category-level privacy toggles per patient | `id (UUID)` | `patient_id -> patients.id` | `share_previous_departments`, `share_previous_reports`, `share_previous_appointments`, `isolate_past_history`, `consent_voice_processing` | `patient_id` | `idx_privacy_patient` | 1:1 to `patients` |
| `audit_events` | Append-only system security & clinical audit trail | `id (BIGSERIAL)` | `consultation_id -> consultations.id` | `actor_type ('patient', 'doctor', 'admin')`, `actor_id`, `event_type`, `metadata (JSONB)` | None | PK | M:1 to `consultations` |

---

### Patient Identity Audit

1. **What currently identifies a patient?**
   - Internally: `patients.id` (UUID generated by `gen_random_uuid()`).
   - Business/Clinically: `patients.abha_number` (14 digits normalized). Required on all new registrations.
   - Lookup identifiers: `mobile_number`, `aadhaar_number`.
2. **Is patientId an internal UUID?**
   - YES. In the PostgreSQL schema, `patients.id` is a UUID.
3. **Is there already an ABHA field?**
   - YES. `patients.abha_number` (VARCHAR 17) and `patients.abha_address` (VARCHAR 100).
4. **Is ABHA unique?**
   - YES. Enforced by `CREATE UNIQUE INDEX idx_patients_abha_number ON patients(abha_number) WHERE abha_number IS NOT NULL;` and a table unique constraint.
5. **Is ABHA nullable?**
   - In the database schema DDL, `abha_number` is technically nullable (`VARCHAR(17) UNIQUE`), but the backend controller (`performAbhaRegister` in `kiosk.controller.js`) strictly rejects new patient registrations without an ABHA number:
     ```javascript
     if (type === 'new' && !abha) throw new ApiError(400, 'ABHA number is required for patient registration');
     ```
6. **Which tables reference patientId?**
   - `consultations.patient_id` -> `patients.id`
   - `patient_qr_tokens.patient_id` -> `patients.id`
   - `patient_privacy_rules.patient_id` -> `patients.id`
   - `privacy_settings.patient_id` -> `patients.id`
7. **Which API routes accept patientId?**
   - `GET /api/v1/intake/patients/lookup?patient_id=...`
   - `POST /api/v1/intake/auth/abha` (in body as `patientId` for existing patient lookups)
   - `POST /api/v1/mobile/portal/select-patient` (in body as `patientId` or `abhaNumber`)
8. **Which frontend stores patientId?**
   - Kiosk: `useKioskStore.js` (`sessionData.patientProfile.id`, `sessionData.abhaNumber`)
   - Mobile: `useMobileStore.js` (`patient.id`, `patient.patientId`, `patient.abhaNumber`)
   - Doctor Panel: `types/clinical.ts` (`Patient.id`, which actually holds `consultation.id`!)
9. **Which Python endpoints accept patientId?**
   - `POST /api/v1/sessions` (`CreateSessionRequest.patient_id`)
10. **Which Redis keys contain patientId?**
    - None directly in the key name. The key name is `session:{session_id}`, but inside the cached JSON value, `"patient_id"` stores the patient's ABHA number.
11. **Which QR payloads contain patientId?**
    - Flow A (Kiosk pairing): Contains `pairing_token`. When exchanged, returns `c.patient_id` and `p.abha_number`.
    - Flow B (Portal upload QR): Contains raw random crypto token. Exchange returns `patient: { id, abha_number, ... }`.
12. **Which S3 paths contain patientId?**
    - `vault/${req.user.id}/${timestamp}-${random}-${filename}` where `req.user.id` is `patients.id` (UUID).
13. **Which WebSocket events contain patientId?**
    - None (WebSockets are not implemented in backend).
14. **Which logs contain patientId?**
    - `audit_events.metadata`: Contains `{ abha_number: patient.abha_number }`.
    - Python `audit_log`: Logs `{ "patient_id": body.patient_id }`.
15. **Which JWT claims contain patientId?**
    - Patient JWT: `{ id: patient.id, abha_number: patient.abha_number, email: patient.mobile_number, role: 'patient' }`
    - Doctor/Admin JWT: `{ id: user.id, email: user.email, role: user.role }`

---

### Patient ID Dependency Map

```
Patient (patients.id: UUID, abha_number: VARCHAR)
  │
  ├── consultations.patient_id (FK: UUID)
  │     ├── clinical_summaries.consultation_id (FK: UUID)
  │     ├── uploaded_documents.consultation_id (FK: UUID)
  │     │     └── patient_privacy_rules.document_id (FK: UUID)
  │     ├── vitals.consultation_id (FK: UUID)
  │     ├── consent_records.consultation_id (FK: UUID)
  │     ├── kiosk_sessions.consultation_id (FK: UUID)
  │     ├── patient_qr_tokens.consultation_id (FK: UUID)
  │     └── audit_events.consultation_id (FK: UUID)
  │
  ├── patient_qr_tokens.patient_id (FK: UUID)
  │
  ├── patient_privacy_rules.patient_id (FK: UUID)
  │
  ├── privacy_settings.patient_id (FK: UUID)
  │
  ├── S3 Object Prefix: vault/{patients.id}/*
  │
  ├── Patient JWT Claim: { id: patients.id, abha_number: patients.abha_number }
  │
  └── Python AI Session Payload: { "patient_id": patients.abha_number }
```

---

## PART 4 — KIOSK AUDIT

- **Screens Implemented**:
  1. `Screen1_Welcome.jsx`: Language selection & accessibility toggles.
  2. `Screen2_PatientType.jsx`: Select "New Patient" vs "Returning Patient".
  3. `Screen2_Auth.jsx`: New patient intake form or Existing patient lookup (by ABHA / Mobile).
  4. `Screen3_DepartmentSelector.jsx`: Select Medical System (Allopathy/AYUSH), Department, Doctor, and Consent scopes (`clinical_intake`, `document_processing`). Calls `kioskApi.verifyPatient`.
  5. `Screen3b_LanguageSelect.jsx`: Choose AI interview language (22 Indian languages). Calls `kioskApi.updateLanguage`.
  6. `Screen4_SymptomIntake.jsx`: Interactive clinical interview with AI. Supports voice recording via MediaRecorder, real-time ASR, TTS narration, SOCRATES symptom exploration, and triage red flags.
  7. `Screen6_HealthHistory.jsx`: Vitals collection (BP, Pulse, SpO2, Temp). Calls `kioskApi.vitals`.
  8. `Screen8_QRUpload.jsx`: Displays single-use QR for mobile phone handoff document upload. Calls `kioskApi.createPatientUploadQr`.
  9. `Screen9_ReviewSubmission.jsx`: Displays generated AI clinical summary; allows editing sections. Calls `kioskApi.summaryGenerate`.
  10. `Screen10_TokenSuccess.jsx`: Confirms OPD queue token (e.g. `AL-003` or `AY-001`). Calls `kioskApi.complete`.

### Kiosk Language Audit

| Category | Description | Source of Data |
|---|---|---|
| **A. Static UI Localization** | Standard UI button labels, placeholders, titles (Continue, Back, Verify, Name, etc.) | Local files: `src/loc/22.js` (Eighth Schedule 22 languages) + `src/loc/{en,hi,bn,pa}.json` |
| **B. Dynamic Clinical Content** | Medical interview questions, symptom prompts, SOCRATES inquiries, red-flag emergency notices, clinical summaries | Python AI Service (`ConversationEngine`, `ClinicalSummaryService`) via Node gateway (`/api/v1/intake/session/:id/dialogue/*`) |
| **C. Language Capability Registry** | Catalog of supported Indian languages, scripts, ASR/TTS capabilities | Master: Python AI `/api/v1/languages` -> Node `/api/v1/language/languages` -> Kiosk `Screen3b_LanguageSelect` |

---

## PART 5 — MOBILE AUDIT

- **Application Structure**: React 18 / Vite mobile-optimized web application.
- **Authentication**:
  1. Mobile / ABHA + OTP verification (`/api/v1/mobile/portal/auth/send-otp` and `verify-otp`).
  2. Zero-login Kiosk QR Pairing (`/api/v1/mobile/kiosk-session/pair/:pairing_token`).
  3. QR Login Exchange (`/api/v1/mobile/portal/qr/exchange`).
- **Data Reality Check**:
  - `src/data/mockData.js`: A 61KB file containing static mock data for demo patient Rajesh Kumar Sharma (PATIENT-001).
  - **Actual Service Integration**: `portalService.js`, `authService.js`, `documentService.js`, and `kioskSessionService.js` all issue real network requests (`fetch`) to `/api/v1/mobile/...`.
  - When authenticated, the mobile store populates from `GET /api/v1/mobile/portal/dashboard`, `visits`, `documents`, and `privacy-settings`.

---

## PART 6 — DOCTOR / ADMIN PANEL AUDIT

- **Framework**: Next.js 15 (App Router, TypeScript).
- **Authentication**: Email + Password login (`POST /api/v1/auth/login`). JWT token stored in cookie and `localStorage`.
- **Doctor Workspace (`/(hospital)/doctor`)**:
  - Consumes `GET /api/v1/doctor/queue` to populate active patient queue.
  - Consumes `GET /api/v1/doctor/patients/:consultation_id/summary` for SOAP intake history.
  - Consumes `GET /api/v1/doctor/patients/:consultation_id/reports` for chronological documents.
  - Consumes `PATCH /api/v1/doctor/consultations/:id/status` and `POST /sign-off` to conclude appointments.
- **Identity Discrepancy Found**:
  - In `HNDPANEL/src/lib/adapters.ts`, `Patient.id` is mapped to `ConsultationQueueItem.id` (which is `consultation.id`, not `patient.id`).
  - `UHID` is completely fabricated on the client side: `UHID-${item.id.slice(0, 8).toUpperCase()}`. No UHID column exists in the database.

---

## PART 7 — DOCTOR / HOSPITAL / DEPARTMENT ROUTING LOGIC

### Doctor Association Model
- Doctors are accounts in the `users` table with `role = 'doctor'` and a `hospital_id` foreign key.
- Doctors are linked to one or more departments via the `doctor_departments` join table (`doctor_id`, `department_id`).
- Departments belong to a hospital (`departments.hospital_id`) and have a specific pathway (`pathway = 'allopathy'` or `'ayurveda'`).

### Routing Execution in Kiosk Intake
1. Kiosk loads departments for selected medical system:  
   `GET /api/v1/intake/departments?pathway=allopathy`
2. Kiosk loads doctors for chosen department:  
   `GET /api/v1/intake/departments/:dept_id/doctors`  
   Executes:
   ```sql
   SELECT u.id, u.name, u.email, u.specialization
   FROM users u
   JOIN doctor_departments dd ON dd.doctor_id = u.id
   WHERE dd.department_id = $1 AND u.role = 'doctor' AND u.is_active = TRUE
   ```
3. Patient can pick a specific doctor or leave it as "Any Doctor" (`doctorId = null`).
4. `performAbhaRegister` verifies that the department and doctor belong to the hospital and match the intake pathway.
5. `consultations` table stores `department_id` and `assigned_doctor_id`.

> [!WARNING]
> **CRITICAL QUEUE ROUTING BUG**:  
> In `doctor.controller.js`, `getDoctorQueue` executes:  
> `SELECT ... FROM consultations c WHERE c.assigned_doctor_id = $1 AND c.status != 'complete'`  
> If a patient selected "Any Doctor", `assigned_doctor_id` is `NULL`. Consequently, **unassigned patients never appear in ANY doctor's queue!**

---

## PART 8 — REDIS AUDIT

- **Redis Client**: Python `redis.asyncio` in `AyushCareAI/app/infrastructure/redis_client.py`.
- **Node.js Backend**: **Does not use Redis**.
- **Key Pattern Inventory**:

| Key Pattern | Purpose | TTL | Owner | Data Stored |
|---|---|---|---|---|
| `session:{session_id}` | Real-time intake state, dialogue turn cache, document entities, summary draft | 1800s (30m) / 86400s (24h during upload) | `AyushCareAI` | Full JSON object with patient ABHA, pathway, question history, red flags, vitals |
| `ratelimit:{client_ip}:{epoch_minute}` | Per-IP token bucket rate limiting (60 req/min) | 60s | `AyushCareAI` | Integer counter |

- **Fallback**: If Redis is offline or unconfigured, `redis_client.py` falls back transparently to in-memory Python dictionaries (`_fallback_store`, `_fallback_ttl`).

---

## PART 9 — QR FLOW TRACE

```
[ KIOSK ]
  │
  ├─► FLOW A (Zero-login session upload):
  │     1. Generates hex pairing_token stored in `kiosk_sessions`
  │     2. Mobile scans QR (contains pairing_token)
  │     3. Mobile pairs via GET /api/v1/mobile/kiosk-session/pair/:token
  │     4. Mobile uploads file directly to S3 (Key: `kiosk/:session_id/...`)
  │     5. Mobile calls POST /register-document -> triggers AI OCR
  │     6. Mobile calls POST /sync -> marks kiosk_sessions inactive
  │
  └─► FLOW B (Patient Portal handoff):
        1. Kiosk calls POST /api/v1/intake/session/:id/patient-upload-qr
        2. Backend generates random 24-byte crypto token
        3. Token is hashed with SHA-256 and stored in `patient_qr_tokens` (TTL: 80s)
        4. Mobile scans QR and submits raw token to POST /api/v1/mobile/portal/qr/exchange
        5. Backend validates token_hash, sets used_at = NOW(), issues 8h Patient JWT
        6. Mobile is authenticated as the patient; uploads to `vault/:patient_id/...`
```

---

## PART 10 — DOCUMENT / OCR / AI PIPELINE

```
Mobile/Kiosk Upload ──► Presigned S3 PUT ──► Node.js Backend
                                                  │
                                                  ▼
                                      FastAPI /documents/upload
                                                  │
                       ┌──────────────────────────┴──────────────────────────┐
                       ▼                                                     ▼
              Image Quality Check (PIL)                             Text Extraction (OCR)
              - Min 640x480 resolution                             - Primary: Azure Document Intelligence
              - Darkness / Overexposure                               (prebuilt-read API 2024-11-30)
                                                                    - Fallbacks: Bhashini OCR, Groq Vision, Tesseract
                                                                             │
                                                                             ▼
                                                                Specialist Medical NLP Signal
                                                                - Azure Text Analytics for Health
                                                                  (Healthcare LRO API 2022-05-15-preview)
                                                                - Supported: en, es, fr, de, it, pt
                                                                - Non-English bridged via Bhashini NMT
                                                                             │
                                                                             ▼
                                                                LLM Entity & Layout Normalization
                                                                - Groq LLM (openai/gpt-oss-120b)
                                                                - Extracts medicines, dosages, conditions, labs
                                                                             │
                                                                             ▼
                                                                Clinical Safety & Rules Suite
                                                                - Abnormal Lab Classifier (medical_reference.py)
                                                                - Drug-Drug Interaction Checker (medical_reference.py)
                                                                             │
                                                                             ▼
                                                                Database Persistence
                                                                - uploaded_documents (status: 'completed')
                                                                - JSONB extracted_data
```

---

## PART 11 — BHASHINI AUDIT

- **Client Location**: [AyushCareAI/app/ai/bhashini_client.py](file:///d:/Users/SomuData/Desktop/SIH26047V2/AyushCareAI/app/ai/bhashini_client.py)
- **Protocol**: India ULCA API (`https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline`)
- **Direct Frontend Access**: **NONE**. The frontend never communicates with Bhashini directly.
- **Implemented Services**:
  1. `asr()`: Speech-to-Text via Conformer multilingual ASR model.
  2. `tts()`: Text-to-Speech via IITM TTS model.
  3. `translate()`: Machine Translation via IndicTrans v2 (all-gpu-t4).
  4. `ocr()`: Printed/Handwritten OCR via IIITH Bhasha OCR model.
  5. `detect_language_text()`: Text Language Detection via Indic Lang Detection.
  6. `detect_language_audio()`: Audio Language Detection via IIT Mandi ALD.

---

## PART 12 — AZURE AUDIT

- **Credentials Location**: Loaded strictly into Python `AyushCareAI/.env`. Never present in Node, Kiosk, Mobile, or Doctor Panel.
- **Azure Document Intelligence**:
  - Endpoint Variable: `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
  - Key Variable: `AZURE_DOCUMENT_INTELLIGENCE_KEY`
  - API Version: `2024-11-30`
  - Model: `prebuilt-read`
  - Polling: REST API LRO polling with 60s timeout.
- **Azure Text Analytics for Health**:
  - Endpoint Variable: `AZURE_LANGUAGE_ENDPOINT`
  - Key Variable: `AZURE_LANGUAGE_KEY`
  - API Version: `2022-05-15-preview`
  - Task Kind: `Healthcare` (FHIR 4.0.1 output)

---

## PART 13 — GROQ AUDIT

- **Client Location**: [AyushCareAI/app/ai/llm_service.py](file:///d:/Users/SomuData/Desktop/SIH26047V2/AyushCareAI/app/ai/llm_service.py)
- **Clinical Reasoning Model**: `openai/gpt-oss-120b` (Temperature: 0.2)
- **Vision Model**: `qwen/qwen3.6-27b`
- **Whisper Model**: `whisper-large-v3-turbo`
- **Deterministic Guardrails**:
  - LLM is used for conversational adaptation and question phrasing.
  - Emergency red flags and drug-drug interactions are **strictly deterministic** (`app/domain/red_flags.py` and `medical_reference.py`).

---

## PART 14 — CLINICAL INTERVIEW STATE

- **State Machine**: Managed by `ConversationEngine` in `app/services/conversation_engine.py`.
- **Phase Sequence**:
  1. `EMERGENCY_SCREEN`: Screens for chest pain, acute respiratory distress, severe bleeding, altered consciousness. If positive, halts routine intake immediately.
  2. `CHIEF_COMPLAINT`: Identifies primary presenting symptom.
  3. `HPI`: Investigates complaint using SOCRATES framework (Site, Onset, Character, Radiation, Associated symptoms, Timing, Exacerbating/relieving factors, Severity).
  4. `ASSOCIATED_SYMPTOMS`: Reviews secondary systemic complaints.
  5. `PAST_HISTORY`: Prior illnesses, surgeries, chronic medications.
  6. `AYUSH_SPECIFIC`: For Ayurveda pathway: Prakriti, Agni (digestive fire), Kostha (bowel habits), Sleep patterns, Diet.
  7. `COMPLETED`: Signals interview conclusion and enables token issuance.
- **Hard Maximum**: 8 turns (`MAX_QUESTIONS = 8`).

---

## PART 15 — AUTHENTICATION AND CONSENT

- **Patient Authentication**:
  - No traditional passwords for patients.
  - Authenticated via OTP sent to registered mobile number or via short-lived QR token handoff.
  - JWT claim: `{ id, abha_number, email: mobile_number, role: 'patient' }`.
- **Staff Authentication**:
  - Hospital admin and doctors authenticate via email + bcrypt password hash.
  - JWT claim: `{ id, email, role: 'hospital_admin' | 'doctor' }`.
- **Consent Architecture**:
  - Complies with DPDP / ABDM consent receipt principles.
  - Scopes: `clinical_intake` (mandatory for kiosk interview), `document_processing` (mandatory for OCR/analysis), `his_abdm_sharing`.
  - Persisted in `consent_records` with timestamps.

---

## PART 16 — PRIVACY / DPDP / ACCESS CONTROL

The privacy model is **hierarchical** with evaluation in `privacyService.js:canDoctorAccess`:

1. **Document-Level Rule**: `patient_privacy_rules` (`scope_type = 'document'`). Overrides all broader rules.
2. **Visit-Level Rule**: `patient_privacy_rules` (`scope_type = 'visit'`). Restricts entire consultation from doctor view.
3. **Hospital-Level Rule**: `patient_privacy_rules` (`scope_type = 'hospital'`). Restricts all visits associated with a given hospital.
4. **Global Category Fallback**: `privacy_settings` table:
   - `share_previous_appointments` (controls visits)
   - `share_previous_reports` (controls documents)
   - `share_previous_departments` (controls clinical departments)

---

## PART 17 — ENVIRONMENT CONFIGURATION

### AyushCareBackend (.env)
- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `ACCESS_TOKEN_SECRET`
- `ACCESS_TOKEN_EXPIRY`
- `DEFAULT_HOSPITAL_ID`
- `KIOSK_SESSION_TTL_MINUTES`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_BUCKET_NAME`
- `MEDIKIOSK_AI_BASE_URL`
- `MEDIKIOSK_AI_FALLBACK_URL`
- `MEDIKIOSK_AI_TIMEOUT_MS`
- `CORS_ORIGIN`
- `SMS_PROVIDER`

### AyushCareAI (.env)
- `ENVIRONMENT`
- `HOST`
- `PORT`
- `ALLOWED_ORIGINS`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GROQ_VISION_MODEL`
- `BHASHINI_UDYAT_KEY`
- `BHASHINI_USER_ID`
- `BHASHINI_INFERENCE_KEY`
- `OCR_PROVIDER`
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- `AZURE_DOCUMENT_INTELLIGENCE_API_VERSION`
- `MEDICAL_NLP_PROVIDER`
- `AZURE_LANGUAGE_ENDPOINT`
- `AZURE_LANGUAGE_KEY`
- `AZURE_LANGUAGE_API_VERSION`
- `ASR_PROVIDER`
- `WHISPER_MODEL`
- `TTS_PROVIDER`
- `TRANSLATION_PROVIDER`
- `LANGUAGE_DETECTION_PROVIDER`
- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`

### AyushCareKiosk (.env)
- `VITE_API_BASE_URL`
- `VITE_KIOSK_ID`
- `VITE_MOBILE_PAIR_URL`

### AyushCareMobile (.env)
- `VITE_API_BASE_URL`

### HNDPANEL (.env)
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`

---

## PART 18 — CROSS-SERVICE API CONTRACT

```
[ KIOSK ] ──────► [ NODE BACKEND (Port 8000) ] ──────► [ PYTHON AI (Port 8001) ] ──────► [ PROVIDERS ]
POST /auth/abha        POST /api/v1/intake/auth/abha        POST /api/v1/sessions                (Internal Redis/DB)
POST /speech           POST /api/v1/intake/.../speech       POST /api/v1/.../speech              Bhashini ASR / Whisper
POST /tts              POST /api/v1/intake/.../tts          POST /api/v1/.../tts                 Bhashini TTS / Edge TTS
POST /summary          POST /api/v1/intake/.../summary/gen  POST /api/v1/.../summary/generate    Groq LLM
POST /register-doc     POST /api/v1/mobile/.../register     POST /api/v1/.../documents/upload    Azure Doc Intel + Health
```

---

## PART 19 — TYPE / SCHEMA CONSISTENCY

1. **UHID Mismatch**:
   - `HNDPANEL` displays `Patient.uhid`.
   - The PostgreSQL database has **no UHID column**. `adapters.ts` generates `UHID-${item.id.slice(0, 8).toUpperCase()}` on the fly.
2. **Patient ID Ambiguity**:
   - In `HNDPANEL`, `Patient.id` is assigned the consultation UUID (`item.id`).
   - In Node.js, `patient_id` is the patient table UUID.
   - In Python AI, `patient_id` holds the patient's ABHA number.
3. **Port Mismatch in Doctor Panel Configuration**:
   - `HNDPANEL/.env` defines `NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1` (pointing directly to Python AI).
   - Doctor and Admin endpoints exist only on Node.js backend (Port 8000).

---

## PART 20 — DUPLICATION / REDUNDANCY

1. **Language Catalog**:
   - Duplicated in `AyushCareAI/app/domain/languages.py`, `AyushCareBackend/src/services/languageService.js`, and `AyushCareKiosk/src/constants/indianLanguages.js`.
   - *Intended Source of Truth*: `AyushCareAI`.
2. **Translation Fallbacks**:
   - `AyushCareBackend/src/services/languageService.js` contains a proxy to Python.
   - `AyushCareAI/app/ai/translation_service.py` provides Bhashini NMT with Groq LLM fallback.
3. **Mock Data Sets**:
   - `AyushCareMobile/src/data/mockData.js` defines Rajesh Kumar Sharma (`PATIENT-001`).
   - `HNDPANEL/src/data/mockPatients.ts` was cleaned out to an empty array.

---

## PART 21 — BROKEN / INCOMPLETE FEATURES

1. **WebSockets / Real-Time Events**:
   - `HNDPANEL/src/lib/socket.ts` connects to Socket.IO and listens for `queue:updated`, `token:called`, `triage:red-flag`.
   - `AyushCareKiosk/src/services/socket.js` is an empty 0-byte file.
   - Neither Node.js backend nor Python AI initializes a Socket.IO server.
2. **Admin Queue Endpoint Missing**:
   - `HNDPANEL` admin service calls `GET /api/v1/admin/queue`.
   - `AyushCareBackend/src/routes/admin.routes.js` registers `/doctors`, `/analytics/visits`, and `/queue/override`, but **omits `GET /queue`**.
3. **SQL Syntax Error in Mobile Controller**:
   - In `AyushCareBackend/src/controllers/mobile.controller.js` line 855:
     ```sql
     SELECT d.*, c.hospital_id, h.name AS hospital_name, c.created_at AS visit_created_at, c.status AS visit_status,
     FROM uploaded_documents d
     ```
     Contains a trailing comma before `FROM`, causing a PostgreSQL syntax error when calling `GET /api/v1/mobile/portal/documents`.
4. **"Any Doctor" Queue Black Hole**:
   - If a patient does not select a specific doctor during intake, `consultations.assigned_doctor_id` is `NULL`.
   - `doctor.controller.js:getDoctorQueue` filters strictly by `WHERE c.assigned_doctor_id = $1`. Unassigned patients are invisible to all doctors.
5. **In-Memory OTP Vulnerability**:
   - Backend stores OTPs in an in-memory `Map`. Server restarts erase pending OTPs.
   - Hardcoded bypass `123456` is active in `otpStore.js`.

---

## PART 22 — SAFE VALIDATION REPORT

- Static code analysis performed across all 5 codebases.
- SQLite `medikiosk_dev.db` inspected read-only: verified 0 rows across `sessions`, `conversation_turns`, `documents`, `consent_receipts`, `audit_log`.
- No database migrations were run.
- No database rows were modified or deleted.
- No package dependencies were installed or upgraded.
- No configuration files were overwritten.

---

## PART 23 — FINAL ABHA MIGRATION BLUEPRINT

### 1. Architectural Principle: Internal UUID vs Business ABHA
- **Internal Technical ID**: Retain `patients.id (UUID)` as surrogate primary key and foreign key target across all tables (`consultations`, `privacy_rules`, `tokens`).
- **Canonical Business Identity**: Elevate `patients.abha_number` to the non-nullable, unique business identifier across all external interfaces.

### 2. Database Schema Changes
- Make `patients.abha_number` `VARCHAR(14) NOT NULL UNIQUE` (after backfilling existing records).
- Add index on `patients(abha_number)`.
- Keep `consultations.patient_id UUID REFERENCES patients(id)` to prevent cascading foreign key thrashing.

### 3. API Contract Modifications
- All public endpoints (`/intake/patients/lookup`, `/mobile/portal/select-patient`, `/doctor/queue`) must accept and return `abha_number`.
- Do not expose internal `patients.id` UUIDs in client-facing JSON payloads.

### 4. JWT & Auth Claim Adjustments
- Patient JWT should encode:
  ```json
  {
    "sub": "<abha_number>",
    "internal_id": "<patient_uuid>",
    "role": "patient"
  }
  ```
- Controller lookups can resolve `internal_id` from the validated token without database roundtrips.

---

## CONCISE EXECUTIVE SUMMARY

### A. Current Architecture
MediKiosk operates as a 5-tier system: Node.js/Express is the main application backend (Port 8000), FastAPI is the specialized AI microservice (Port 8001), React/Vite powers the Kiosk and Mobile web apps, and Next.js 15 powers the Doctor/Admin Panel.

### B. Current Patient Identity Implementation
A dual identity model exists: `patients.id` (UUID) is the internal foreign key, while `abha_number` is captured at registration and used for lookups. HNDPANEL manufactures a fake `UHID` string on the client side from the consultation UUID.

### C. Current ABHA Implementation
ABHA is captured at the Kiosk and Mobile login, normalized to 14 digits, and stored in `patients.abha_number`. It is used for OTP lookups and passed to Python as `patient_id`.

### D. Database Relationship Summary
Neon PostgreSQL manages 15 tables centered on `patients` (1:M to `consultations`, `patient_privacy_rules`, `privacy_settings`) and `consultations` (1:1 to `clinical_summaries` and `vitals`, 1:M to `uploaded_documents`).

### E. Current Bhashini Integration
Managed entirely within Python FastAPI via `BhashiniClient` (ULCA API), handling ASR, TTS, NMT (IndicTrans v2), OCR, and Language Detection. The frontend never calls Bhashini directly.

### F. Current Azure Integration
Implemented in Python FastAPI for Document Intelligence (`prebuilt-read` REST API) and Text Analytics for Health (`Healthcare` LRO). Credentials exist only in the Python environment.

### G. Current OCR Pipeline
S3 Presigned upload -> Document registration in Node -> Python pipeline: Image quality assessment (PIL) -> Azure Document Intelligence (primary) -> Azure Health NLP & Groq LLM entity extraction -> Reference range & drug interaction validation.

### H. Current Language Pipeline
22 Eighth Schedule languages supported. Kiosk uses local UI dictionary (`src/loc/22.js`) for buttons, while clinical interview questions and speech are generated dynamically by Python (Bhashini + Groq).

### I. Current QR Flow
Flow A supports zero-login kiosk document handoff via a 24-character pairing token. Flow B generates an 80-second single-use SHA-256 hashed token that logs the mobile user into the patient portal.

### J. Current Doctor Filtering
Hospitals contain departments with pathways (Allopathy/AYUSH). Doctors are mapped via `doctor_departments`. However, patients selecting "Any Doctor" have `assigned_doctor_id = NULL`, which hides them from all doctor queues.

### K. Current Privacy Controls
Hierarchical access policy in `privacyService.js`: Document rule > Visit rule > Hospital rule > Global category settings (`share_previous_reports`, `share_previous_appointments`, `share_previous_departments`).

### L. Major Inconsistencies
Doctor Panel points to Port 8001 instead of 8000 in `.env`. Doctor panel maps `Patient.id` to `consultation_id`. UHID is client-fabricated.

### M. Major Risks Before ABHA Migration
If `patients.id` UUIDs were replaced with ABHA numbers as foreign keys, all cascade constraints, S3 prefixes, and audit trails would break. A surrogate UUID must be retained internally.

### N. Recommended Migration Order
1. Fix known bugs (SQL trailing comma in `mobile.controller.js`, Admin `/queue` route, "Any Doctor" queue filter, Port 8000 in Doctor Panel).
2. Add NOT NULL constraint and unique index on `patients.abha_number`.
3. Standardize API request/response contracts to use ABHA as the business identifier.
4. Update Patient JWT claims to include `sub: abha_number`.
5. Remove fake client-side UHID generation in HNDPANEL.
