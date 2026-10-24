/**
 * P2Care Additive Migration — Emergency Cases, SOS Management,
 * Patient Access Grants, and Audit Extensions.
 *
 * IMPORTANT: This migration is additive only. It does NOT drop any existing
 * tables, columns, or constraints. It must target the new P2Care database,
 * never the old AyushCare database.
 *
 * Run manually:  node src/database/p2careMigration.js
 */
import pool from './dbConnection.js';

const addColumn = async (client, table, column, definition) => {
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
};

export const runP2CareMigration = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── Enum types ──
        await client.query(`DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emergency_status') THEN
                CREATE TYPE emergency_status AS ENUM (
                    'new','acknowledged','assigned','in_progress','escalated','resolved','cancelled'
                );
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'identity_status') THEN
                CREATE TYPE identity_status AS ENUM (
                    'identified','unverified','unknown'
                );
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_status') THEN
                CREATE TYPE communication_status AS ENUM (
                    'able','limited','unable','unknown'
                );
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_grant_status') THEN
                CREATE TYPE access_grant_status AS ENUM (
                    'active','expired','revoked'
                );
            END IF;
        END $$;`);

        // ── Emergency Cases (unified for both identified & unidentified) ──
        await client.query(`CREATE TABLE IF NOT EXISTS emergency_cases (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            case_number VARCHAR(30) UNIQUE NOT NULL,
            hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
            patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
            identity_status identity_status NOT NULL DEFAULT 'unknown',
            communication_status communication_status NOT NULL DEFAULT 'unknown',
            emergency_category VARCHAR(100),
            presenting_complaint TEXT,
            symptoms JSONB DEFAULT '[]',
            vitals JSONB DEFAULT '{}',
            accident_details TEXT,
            notes TEXT,
            reported_circumstances TEXT,
            approximate_age INT,
            approximate_gender VARCHAR(20),
            triage_urgency VARCHAR(30) DEFAULT 'undetermined',
            triage_rules_applied JSONB DEFAULT '[]',
            red_flags JSONB DEFAULT '[]',
            status emergency_status NOT NULL DEFAULT 'new',
            intake_source VARCHAR(50) DEFAULT 'kiosk',
            kiosk_id VARCHAR(100),
            idempotency_key VARCHAR(100) UNIQUE,
            assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
            escalated_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
            resolved_reason TEXT,
            resolved_at TIMESTAMPTZ,
            acknowledged_at TIMESTAMPTZ,
            acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );`);

        // ── Emergency Case Action History (audit timeline per case) ──
        await client.query(`CREATE TABLE IF NOT EXISTS emergency_case_actions (
            id BIGSERIAL PRIMARY KEY,
            emergency_case_id UUID NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
            action_type VARCHAR(60) NOT NULL,
            actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
            actor_role VARCHAR(30),
            previous_status VARCHAR(30),
            new_status VARCHAR(30),
            note TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );`);

        // ── Patient Access Grants (36-hour max, scoped) ──
        await client.query(`CREATE TABLE IF NOT EXISTS patient_access_grants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
            emergency_case_id UUID REFERENCES emergency_cases(id) ON DELETE CASCADE,
            data_categories JSONB NOT NULL DEFAULT '["demographics","vitals","clinical_summary"]',
            purpose TEXT NOT NULL,
            scope VARCHAR(50) NOT NULL DEFAULT 'emergency_care',
            status access_grant_status NOT NULL DEFAULT 'active',
            issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ,
            revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
            revocation_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );`);

        // ── Access Audit Log (append-only from normal workflows) ──
        await client.query(`CREATE TABLE IF NOT EXISTS access_audit_log (
            id BIGSERIAL PRIMARY KEY,
            event_type VARCHAR(80) NOT NULL,
            staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
            staff_role VARCHAR(30),
            patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
            emergency_case_id UUID REFERENCES emergency_cases(id) ON DELETE SET NULL,
            grant_id UUID REFERENCES patient_access_grants(id) ON DELETE SET NULL,
            data_categories JSONB,
            purpose TEXT,
            outcome VARCHAR(20) NOT NULL DEFAULT 'success',
            denial_reason TEXT,
            metadata JSONB DEFAULT '{}',
            ip_address VARCHAR(45),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );`);

        // ── Add columns to existing sos_events for P2Care ──
        await addColumn(client, 'sos_events', 'emergency_case_id', 'UUID REFERENCES emergency_cases(id) ON DELETE SET NULL');
        await addColumn(client, 'sos_events', 'source', "VARCHAR(50) DEFAULT 'kiosk'");

        // ── Indexes ──
        await client.query(`CREATE INDEX IF NOT EXISTS idx_emergency_cases_status ON emergency_cases(hospital_id, status, created_at DESC);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_emergency_cases_patient ON emergency_cases(patient_id) WHERE patient_id IS NOT NULL;`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_emergency_cases_number ON emergency_cases(case_number);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_emergency_case_actions_case ON emergency_case_actions(emergency_case_id, created_at);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_patient_access_grants_staff ON patient_access_grants(staff_id, status, expires_at);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_patient_access_grants_patient ON patient_access_grants(patient_id, status);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_access_audit_log_staff ON access_audit_log(staff_id, created_at DESC);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_access_audit_log_patient ON access_audit_log(patient_id, created_at DESC);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sos_events_emergency ON sos_events(emergency_case_id) WHERE emergency_case_id IS NOT NULL;`);

        await client.query('COMMIT');
        console.log('[P2Care Migration] ✅ Additive migration completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[P2Care Migration] ❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Allow running directly:  node src/database/p2careMigration.js
const isDirectRun = process.argv[1] && (
    process.argv[1].endsWith('p2careMigration.js') ||
    process.argv[1].includes('p2careMigration')
);
if (isDirectRun) {
    console.log('[P2Care Migration] Starting additive migration...');
    console.log('[P2Care Migration] ⚠️  Confirm this targets the P2Care database, NOT the old AyushCare database.');
    console.log(`[P2Care Migration] DATABASE_URL: ${(process.env.DATABASE_URL || '').replace(/:([^@]+)@/, ':***@')}`);
    runP2CareMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
