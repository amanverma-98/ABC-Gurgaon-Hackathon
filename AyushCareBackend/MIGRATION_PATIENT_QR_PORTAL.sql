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
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consent_records' AND column_name='granted') THEN
    ALTER TABLE consent_records ALTER COLUMN granted SET DEFAULT TRUE;
  END IF;
END $$;
