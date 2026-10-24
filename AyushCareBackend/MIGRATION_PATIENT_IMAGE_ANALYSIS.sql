-- AyushCare backend migration for patient identity + mobile image analysis diagnostics.
-- Safe to run against the existing Neon schema. initSchema.js also applies these upgrades automatically on startup.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_code VARCHAR(6);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(12);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_type VARCHAR(20) DEFAULT 'new';

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_patient_code
  ON patients(patient_code) WHERE patient_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile_number);
CREATE INDEX IF NOT EXISTS idx_patients_aadhaar ON patients(aadhaar_number);

ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS source_mime_type VARCHAR(100);

-- Existing patient rows receive their 6-character code from the application on first update.
-- Do not invent codes here; the backend generator guarantees uniqueness.

ALTER TABLE privacy_settings
  ADD COLUMN IF NOT EXISTS lock_diagnosis BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lock_visits BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lock_reports BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_patients_patient_code ON patients(patient_code) WHERE patient_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile_number);
CREATE INDEX IF NOT EXISTS idx_documents_consultation_status ON uploaded_documents(consultation_id,status,created_at);
