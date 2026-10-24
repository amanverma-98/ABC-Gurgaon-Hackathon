# AyushCare integration notes (updated)
- Kiosk API base: `/api/v1/intake`
- Mobile API base: `/api/v1/mobile`
- MediKiosk AI is accessed only by the Node backend via `MEDIKIOSK_AI_BASE_URL`.
- Kiosk patient registration creates the consultation/AI session only after clinical consent is selected.
- Department/doctor are persisted on the consultation.
- Mobile QR Flow A is zero-login and short-lived; normal portal login remains OTP/JWT Flow B.
- Kiosk/mobile language changes can synchronize through the consultation -> AI session.
- Mobile document uploads use presigned S3 PUT, then backend registers the document and asynchronously downloads it from S3 for AI OCR.
- Document list responses include short-lived signed `download_url` values for fast image retrieval.
- S3 bucket CORS must allow the kiosk/mobile origins; see `S3_CORS_CONFIGURATION.json`.
- Run the SQL in `MIGRATION_PATIENT_IMAGE_ANALYSIS.sql` against an existing Neon database if automatic schema initialization is not used.

- Provider boundary: Node never calls Bhashini, Azure, or Groq directly. AI provider credentials stay in the Python ML service.
- Language, ASR, TTS, translation and clinical AI are proxied through `AiServiceGateway` to Python.
- Document uploads support PDF as well as JPEG/PNG/WebP so Azure Document Intelligence can process multi-page documents.
