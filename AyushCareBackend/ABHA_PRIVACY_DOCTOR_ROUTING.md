# MediKiosk Backend — ABHA / Routing / Privacy Update

## Canonical patient identifier
ABHA number is now the canonical patient identifier exposed to Kiosk, Mobile, AI sessions and Doctor APIs. The internal PostgreSQL UUID `patients.id` remains an implementation-only foreign-key surrogate. The legacy `patient_code` is removed from the new schema and the supplied migration drops it from an existing database.

## Doctor routing
Doctors are assigned to departments through `doctor_departments`. Kiosk doctor lookup now joins this table and validates hospital + department + pathway. A legacy initialization step auto-links doctors only when their specialization matches a department name; admins can also explicitly assign a doctor using the admin API.

## Privacy
`patient_privacy_rules` provides patient-controlled:
- hospital-level access
- visit-level access
- document-level access

Precedence is document > visit > hospital > global setting. Patient portal users can always see their own records; these rules control doctor-side visibility.

## Documents
Kiosk/Mobile -> Node/S3 -> Python -> Azure Document Intelligence -> Azure Health NLP -> existing clinical normalization/Groq -> Node/PostgreSQL.
PDF and common image types are accepted by the portal document flow.
