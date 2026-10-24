-- AyushCare backend compatibility migration.
-- Safe to run against an existing PostgreSQL/Neon database.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS patient_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_patient_qr_token_active
  ON patient_qr_tokens(token_hash, expires_at) WHERE used_at IS NULL;

ALTER TABLE privacy_settings ADD COLUMN IF NOT EXISTS share_previous_departments BOOLEAN DEFAULT TRUE;
ALTER TABLE privacy_settings ADD COLUMN IF NOT EXISTS share_previous_reports BOOLEAN DEFAULT TRUE;
ALTER TABLE privacy_settings ADD COLUMN IF NOT EXISTS share_previous_appointments BOOLEAN DEFAULT TRUE;

ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT FALSE;
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'granted';
UPDATE consent_records
SET title=COALESCE(title,scope_id),
    purpose=COALESCE(purpose,'AyushCare consent'),
    required=COALESCE(required,FALSE),
    status=COALESCE(status,CASE WHEN granted THEN 'granted' ELSE 'withdrawn' END)
WHERE title IS NULL OR purpose IS NULL OR required IS NULL OR status IS NULL;
ALTER TABLE consent_records ALTER COLUMN title SET DEFAULT 'Consent';
ALTER TABLE consent_records ALTER COLUMN status SET DEFAULT 'granted';
ALTER TABLE consent_records ALTER COLUMN title SET NOT NULL;
ALTER TABLE consent_records ALTER COLUMN status SET NOT NULL;

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS assigned_doctor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS file_path_hash VARCHAR(512);
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}';
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS source_mime_type VARCHAR(100);
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS page_number INT;
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS total_pages INT;
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
UPDATE uploaded_documents SET file_path_hash=COALESCE(file_path_hash,'legacy/unknown') WHERE file_path_hash IS NULL;
ALTER TABLE uploaded_documents ALTER COLUMN file_path_hash SET NOT NULL;
