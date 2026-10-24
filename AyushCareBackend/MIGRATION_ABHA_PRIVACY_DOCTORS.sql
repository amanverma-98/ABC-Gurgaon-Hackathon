DROP INDEX IF EXISTS idx_patients_patient_code;
ALTER TABLE patients DROP COLUMN IF EXISTS patient_code;
-- MediKiosk migration: ABHA as canonical public patient identifier, doctor-department routing, granular privacy.
-- Internal patients.id UUID is retained as a surrogate FK for referential integrity; all public patient identifiers use ABHA.
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_abha_number ON patients(abha_number) WHERE abha_number IS NOT NULL;
CREATE TABLE IF NOT EXISTS doctor_departments (
  doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (doctor_id, department_id)
);
CREATE TABLE IF NOT EXISTS patient_privacy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('hospital','visit','document')),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE,
  allow_doctor_access BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_patient_privacy_rules_patient ON patient_privacy_rules(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_privacy_rules_hospital ON patient_privacy_rules(patient_id,hospital_id) WHERE scope_type='hospital';
CREATE INDEX IF NOT EXISTS idx_patient_privacy_rules_visit ON patient_privacy_rules(patient_id,consultation_id) WHERE scope_type='visit';
CREATE INDEX IF NOT EXISTS idx_patient_privacy_rules_document ON patient_privacy_rules(patient_id,document_id) WHERE scope_type='document';

INSERT INTO doctor_departments(doctor_id,department_id) SELECT u.id,d.id FROM users u JOIN departments d ON d.hospital_id=u.hospital_id WHERE u.role='doctor' AND u.is_active=TRUE AND d.is_active=TRUE AND u.specialization IS NOT NULL AND (LOWER(d.name)=LOWER(u.specialization) OR LOWER(d.name) LIKE '%'||LOWER(u.specialization)||'%' OR LOWER(u.specialization) LIKE '%'||LOWER(d.name)||'%') ON CONFLICT DO NOTHING;
