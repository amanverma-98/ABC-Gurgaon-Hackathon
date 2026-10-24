import pool from '../database/dbConnection.js';

/**
 * Patient-controlled access policy. Internal UUIDs are used only for joins;
 * patients see/control records by ABHA number in the product.
 * Precedence: document > visit > hospital > global category setting.
 */
export async function canDoctorAccess({ patientId, hospitalId, consultationId = null, documentId = null, category = 'reports' }) {
    const globalColumn = category === 'visits' ? 'share_previous_appointments' : category === 'departments' ? 'share_previous_departments' : 'share_previous_reports';
    const settings = await pool.query(`SELECT ${globalColumn} AS allowed FROM privacy_settings WHERE patient_id=$1`, [patientId]);
    const globalAllowed = settings.rows[0]?.allowed !== false;

    if (documentId) {
        const exact = await pool.query(
            `SELECT allow_doctor_access FROM patient_privacy_rules
             WHERE patient_id=$1 AND scope_type='document' AND document_id=$2
             ORDER BY updated_at DESC LIMIT 1`, [patientId, documentId]);
        if (exact.rowCount) return exact.rows[0].allow_doctor_access === true;
    }
    if (consultationId) {
        const visit = await pool.query(
            `SELECT allow_doctor_access FROM patient_privacy_rules
             WHERE patient_id=$1 AND scope_type='visit' AND consultation_id=$2
             ORDER BY updated_at DESC LIMIT 1`, [patientId, consultationId]);
        if (visit.rowCount) return visit.rows[0].allow_doctor_access === true;
    }
    if (hospitalId) {
        const hospital = await pool.query(
            `SELECT allow_doctor_access FROM patient_privacy_rules
             WHERE patient_id=$1 AND scope_type='hospital' AND hospital_id=$2
             ORDER BY updated_at DESC LIMIT 1`, [patientId, hospitalId]);
        if (hospital.rowCount) return hospital.rows[0].allow_doctor_access === true;
    }
    return globalAllowed;
}

export async function upsertPrivacyRule({ patientId, scopeType, hospitalId = null, consultationId = null, documentId = null, allowDoctorAccess, reason = null }) {
    const valid = ['hospital', 'visit', 'document'];
    if (!valid.includes(scopeType)) throw new Error('Invalid privacy scope');
    if (scopeType === 'hospital' && !hospitalId) throw new Error('hospitalId is required for hospital privacy rules');
    if (scopeType === 'visit' && !consultationId) throw new Error('consultationId is required for visit privacy rules');
    if (scopeType === 'document' && !documentId) throw new Error('documentId is required for document privacy rules');
    if (scopeType === 'hospital') {
        const own = await pool.query('SELECT 1 FROM consultations WHERE patient_id=$1 AND hospital_id=$2 LIMIT 1', [patientId, hospitalId]);
        if (!own.rowCount) throw new Error('Hospital is not part of this patient account history');
    } else if (scopeType === 'visit') {
        const own = await pool.query('SELECT 1 FROM consultations WHERE id=$1 AND patient_id=$2 LIMIT 1', [consultationId, patientId]);
        if (!own.rowCount) throw new Error('Visit does not belong to this patient account');
    } else {
        const own = await pool.query('SELECT 1 FROM uploaded_documents d JOIN consultations c ON c.id=d.consultation_id WHERE d.id=$1 AND c.patient_id=$2 LIMIT 1', [documentId, patientId]);
        if (!own.rowCount) throw new Error('Document does not belong to this patient account');
    }

    const existing = await pool.query(
        `SELECT id FROM patient_privacy_rules
         WHERE patient_id=$1 AND scope_type=$2
           AND COALESCE(hospital_id,'00000000-0000-0000-0000-000000000000')=COALESCE($3::uuid,'00000000-0000-0000-0000-000000000000')
           AND COALESCE(consultation_id,'00000000-0000-0000-0000-000000000000')=COALESCE($4::uuid,'00000000-0000-0000-0000-000000000000')
           AND COALESCE(document_id,'00000000-0000-0000-0000-000000000000')=COALESCE($5::uuid,'00000000-0000-0000-0000-000000000000')
         LIMIT 1`, [patientId, scopeType, hospitalId, consultationId, documentId]);
    if (existing.rowCount) {
        const result = await pool.query(
            `UPDATE patient_privacy_rules SET allow_doctor_access=$1, reason=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
            [Boolean(allowDoctorAccess), reason, existing.rows[0].id]);
        return result.rows[0];
    }
    const result = await pool.query(
        `INSERT INTO patient_privacy_rules(patient_id,scope_type,hospital_id,consultation_id,document_id,allow_doctor_access,reason)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [patientId, scopeType, hospitalId, consultationId, documentId, Boolean(allowDoctorAccess), reason]);
    return result.rows[0];
}
