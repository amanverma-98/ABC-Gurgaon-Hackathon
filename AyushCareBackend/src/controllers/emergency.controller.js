/**
 * Emergency Controller — P2Care Emergency Intake, SOS, Unidentified Cases,
 * Patient Access Grants (36-hour max), and Audit Logging.
 */
import { randomBytes } from 'crypto';
import { ApiResponse } from '../utilities/ApiResponse.js';
import { asyncHandler } from '../utilities/asyncHandler.js';
import { ApiError } from '../utilities/ApiError.js';
import pool from '../database/dbConnection.js';
import { emitEvent } from '../services/socketService.js';

// ─── Helpers ───

const MAX_GRANT_HOURS = 36;

const generateCaseNumber = () => {
    const now = new Date();
    const date = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = randomBytes(3).toString('hex').toUpperCase();
    return `EM-${date}-${rand}`;
};

const auditAccess = async (client, event) => {
    const {
        event_type, staff_id, staff_role, patient_id, emergency_case_id,
        grant_id, data_categories, purpose, outcome = 'success',
        denial_reason, metadata = {}, ip_address
    } = event;
    await client.query(
        `INSERT INTO access_audit_log
         (event_type, staff_id, staff_role, patient_id, emergency_case_id, grant_id, data_categories, purpose, outcome, denial_reason, metadata, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [event_type, staff_id || null, staff_role || null, patient_id || null,
         emergency_case_id || null, grant_id || null,
         data_categories ? JSON.stringify(data_categories) : null,
         purpose || null, outcome, denial_reason || null,
         JSON.stringify(metadata), ip_address || null]
    );
};

const auditCaseAction = async (client, caseId, action_type, actor, opts = {}) => {
    await client.query(
        `INSERT INTO emergency_case_actions
         (emergency_case_id, action_type, actor_id, actor_role, previous_status, new_status, note, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [caseId, action_type, actor?.id || null, actor?.role || null,
         opts.previous_status || null, opts.new_status || null,
         opts.note || null, JSON.stringify(opts.metadata || {})]
    );
};

const EMERGENCY_CATEGORIES = [
    'accident_road', 'injury', 'burns_electric_shock', 'cuts_bleeding',
    'pregnancy_related', 'chest_pain', 'breathing_difficulty',
    'neurological_fainting_seizure', 'fever_acute_illness', 'other'
];

const VALID_TRIAGE = ['undetermined', 'immediate', 'urgent', 'less_urgent', 'non_urgent'];
const VALID_STATUSES = ['new', 'acknowledged', 'assigned', 'in_progress', 'escalated', 'resolved', 'cancelled'];

// ─── Emergency Intake (from Kiosk or HNDPANEL) ───

export const createEmergencyIntake = asyncHandler(async (req, res) => {
    const {
        emergency_category, presenting_complaint, symptoms = [],
        identity_status = 'unknown', communication_status = 'unknown',
        patient_id, approximate_age, approximate_gender,
        vitals = {}, accident_details, notes, reported_circumstances,
        intake_source = 'kiosk', kiosk_id, hospital_id,
        idempotency_key, triage_urgency = 'undetermined',
        red_flags = []
    } = req.body;

    // Validate
    if (emergency_category && !EMERGENCY_CATEGORIES.includes(emergency_category)) {
        throw new ApiError(400, `Invalid emergency category. Must be one of: ${EMERGENCY_CATEGORIES.join(', ')}`);
    }
    if (!['identified', 'unverified', 'unknown'].includes(identity_status)) {
        throw new ApiError(400, 'identity_status must be identified, unverified, or unknown');
    }
    if (!['able', 'limited', 'unable', 'unknown'].includes(communication_status)) {
        throw new ApiError(400, 'communication_status must be able, limited, unable, or unknown');
    }
    if (triage_urgency && !VALID_TRIAGE.includes(triage_urgency)) {
        throw new ApiError(400, `triage_urgency must be one of: ${VALID_TRIAGE.join(', ')}`);
    }
    if (approximate_age !== undefined && approximate_age !== null) {
        const age = Number(approximate_age);
        if (!Number.isFinite(age) || age < 0 || age > 150) {
            throw new ApiError(400, 'approximate_age must be between 0 and 150');
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Idempotency: reject duplicates
        if (idempotency_key) {
            const dup = await client.query(
                'SELECT id, case_number FROM emergency_cases WHERE idempotency_key = $1',
                [idempotency_key]
            );
            if (dup.rowCount) {
                await client.query('ROLLBACK');
                return res.status(200).json(new ApiResponse(200, {
                    id: dup.rows[0].id,
                    case_number: dup.rows[0].case_number,
                    duplicate: true
                }, 'Emergency case already recorded'));
            }
        }

        // Resolve hospital
        let resolvedHospitalId = hospital_id || process.env.DEFAULT_HOSPITAL_ID || null;
        if (!resolvedHospitalId) {
            const h = await client.query('SELECT id FROM hospitals ORDER BY created_at LIMIT 1');
            if (h.rowCount) resolvedHospitalId = h.rows[0].id;
        }

        // Validate patient_id if provided
        let validPatientId = null;
        if (patient_id && identity_status === 'identified') {
            const p = await client.query('SELECT id FROM patients WHERE id = $1', [patient_id]);
            if (p.rowCount) validPatientId = p.rows[0].id;
        }

        const caseNumber = generateCaseNumber();

        const emergencyCase = (await client.query(
            `INSERT INTO emergency_cases
             (case_number, hospital_id, patient_id, identity_status, communication_status,
              emergency_category, presenting_complaint, symptoms, vitals, accident_details,
              notes, reported_circumstances, approximate_age, approximate_gender,
              triage_urgency, red_flags, intake_source, kiosk_id, idempotency_key, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'new')
             RETURNING *`,
            [caseNumber, resolvedHospitalId, validPatientId, identity_status, communication_status,
             emergency_category || null, presenting_complaint || null,
             JSON.stringify(symptoms), JSON.stringify(vitals),
             accident_details || null, notes || null, reported_circumstances || null,
             approximate_age != null ? Number(approximate_age) : null,
             approximate_gender || null,
             triage_urgency, JSON.stringify(red_flags),
             intake_source, kiosk_id || null, idempotency_key || null]
        )).rows[0];

        // Create SOS event linked to emergency case
        await client.query(
            `INSERT INTO sos_events (patient_id, kiosk_id, verification_method, emergency_case_id, reason, status, source)
             VALUES ($1, $2, 'emergency_intake', $3, $4, 'active', $5)`,
            [validPatientId || '00000000-0000-0000-0000-000000000000',
             kiosk_id || 'KIOSK-MAIN-01', emergencyCase.id,
             presenting_complaint || emergency_category || 'Emergency intake',
             intake_source]
        );

        await auditCaseAction(client, emergencyCase.id, 'case_created', req.user || null, {
            new_status: 'new',
            metadata: { intake_source, emergency_category, identity_status, communication_status }
        });

        await auditAccess(client, {
            event_type: 'emergency_case_created',
            staff_id: req.user?.id,
            staff_role: req.user?.role,
            emergency_case_id: emergencyCase.id,
            purpose: 'Emergency intake',
            ip_address: req.ip
        });

        await client.query('COMMIT');

        // Emit real-time alert
        emitEvent('emergency:new', {
            id: emergencyCase.id,
            case_number: caseNumber,
            status: 'new',
            emergency_category,
            triage_urgency,
            identity_status,
            red_flags,
            created_at: emergencyCase.created_at
        });

        return res.status(201).json(new ApiResponse(201, {
            id: emergencyCase.id,
            case_number: caseNumber,
            status: 'new',
            identity_status,
            communication_status,
            triage_urgency,
            created_at: emergencyCase.created_at
        }, 'Emergency case created successfully'));
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});

// ─── List Emergency Cases (HNDPANEL dashboard) ───

export const listEmergencyCases = asyncHandler(async (req, res) => {
    const hospitalId = req.user.hospital_id;
    const { status, identity_status: idStatus, page = 1, limit = 50 } = req.query;

    const conditions = ['ec.hospital_id = $1'];
    const params = [hospitalId];

    if (status && VALID_STATUSES.includes(status)) {
        params.push(status);
        conditions.push(`ec.status = $${params.length}::emergency_status`);
    }
    if (idStatus && ['identified', 'unverified', 'unknown'].includes(idStatus)) {
        params.push(idStatus);
        conditions.push(`ec.identity_status = $${params.length}::identity_status`);
    }

    const offset = (Math.max(1, Number(page)) - 1) * Math.min(100, Math.max(1, Number(limit)));
    params.push(Math.min(100, Math.max(1, Number(limit))));
    params.push(offset);

    const result = await pool.query(
        `SELECT ec.*,
                u_assigned.name AS assigned_staff_name,
                u_ack.name AS acknowledged_by_name,
                p.full_name AS patient_name
         FROM emergency_cases ec
         LEFT JOIN users u_assigned ON u_assigned.id = ec.assigned_staff_id
         LEFT JOIN users u_ack ON u_ack.id = ec.acknowledged_by
         LEFT JOIN patients p ON p.id = ec.patient_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY
            CASE ec.status
                WHEN 'new' THEN 0
                WHEN 'escalated' THEN 1
                WHEN 'acknowledged' THEN 2
                WHEN 'assigned' THEN 3
                WHEN 'in_progress' THEN 4
                WHEN 'resolved' THEN 5
                WHEN 'cancelled' THEN 6
            END,
            ec.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    );

    const countResult = await pool.query(
        `SELECT COUNT(*) FROM emergency_cases ec WHERE ${conditions.slice(0, -0).join(' AND ')}`,
        params.slice(0, conditions.length)
    );

    return res.status(200).json(new ApiResponse(200, {
        cases: result.rows,
        total: Number(countResult.rows[0]?.count || 0),
        page: Number(page),
        limit: Number(limit)
    }, 'Emergency cases retrieved'));
});

// ─── Get Single Emergency Case ───

export const getEmergencyCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hospitalId = req.user.hospital_id;

    const result = await pool.query(
        `SELECT ec.*,
                u_assigned.name AS assigned_staff_name,
                u_ack.name AS acknowledged_by_name,
                p.full_name AS patient_name, p.mobile_number AS patient_mobile
         FROM emergency_cases ec
         LEFT JOIN users u_assigned ON u_assigned.id = ec.assigned_staff_id
         LEFT JOIN users u_ack ON u_ack.id = ec.acknowledged_by
         LEFT JOIN patients p ON p.id = ec.patient_id
         WHERE ec.id = $1 AND ec.hospital_id = $2`,
        [id, hospitalId]
    );

    if (!result.rowCount) throw new ApiError(404, 'Emergency case not found');
    return res.status(200).json(new ApiResponse(200, result.rows[0], 'Emergency case retrieved'));
});

// ─── Acknowledge Case ───

export const acknowledgeEmergencyCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const ec = await client.query(
            `SELECT * FROM emergency_cases WHERE id = $1 AND hospital_id = $2`,
            [id, req.user.hospital_id]
        );
        if (!ec.rowCount) throw new ApiError(404, 'Emergency case not found');
        const prev = ec.rows[0];

        if (!['new'].includes(prev.status)) {
            throw new ApiError(400, 'Case can only be acknowledged from new status');
        }

        await client.query(
            `UPDATE emergency_cases SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = $1, updated_at = NOW() WHERE id = $2`,
            [req.user.id, id]
        );
        await auditCaseAction(client, id, 'acknowledged', req.user, {
            previous_status: prev.status, new_status: 'acknowledged'
        });
        await client.query('COMMIT');

        emitEvent('emergency:updated', { id, status: 'acknowledged' });
        return res.status(200).json(new ApiResponse(200, { id, status: 'acknowledged' }, 'Case acknowledged'));
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
});

// ─── Assign Staff ───

export const assignEmergencyCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { staff_id } = req.body;
    if (!staff_id) throw new ApiError(400, 'staff_id is required');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const ec = await client.query(
            `SELECT * FROM emergency_cases WHERE id = $1 AND hospital_id = $2`,
            [id, req.user.hospital_id]
        );
        if (!ec.rowCount) throw new ApiError(404, 'Emergency case not found');

        const staff = await client.query(
            `SELECT id, name, role FROM users WHERE id = $1 AND hospital_id = $2 AND is_active = TRUE`,
            [staff_id, req.user.hospital_id]
        );
        if (!staff.rowCount) throw new ApiError(404, 'Staff member not found');

        const prev = ec.rows[0];
        const newStatus = ['new', 'acknowledged'].includes(prev.status) ? 'assigned' : prev.status;

        await client.query(
            `UPDATE emergency_cases SET assigned_staff_id = $1, status = $2::emergency_status, updated_at = NOW() WHERE id = $3`,
            [staff_id, newStatus, id]
        );
        await auditCaseAction(client, id, 'assigned', req.user, {
            previous_status: prev.status, new_status: newStatus,
            metadata: { assigned_to: staff_id, assigned_name: staff.rows[0].name }
        });
        await client.query('COMMIT');

        emitEvent('emergency:updated', { id, status: newStatus, assigned_staff_id: staff_id });
        return res.status(200).json(new ApiResponse(200, { id, status: newStatus, assigned_staff_id: staff_id }, 'Staff assigned'));
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
});

// ─── Escalate Case ───

export const escalateEmergencyCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { escalate_to_id, note } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const ec = await client.query(
            `SELECT * FROM emergency_cases WHERE id = $1 AND hospital_id = $2`,
            [id, req.user.hospital_id]
        );
        if (!ec.rowCount) throw new ApiError(404, 'Emergency case not found');
        const prev = ec.rows[0];

        if (['resolved', 'cancelled'].includes(prev.status)) {
            throw new ApiError(400, 'Cannot escalate a resolved or cancelled case');
        }

        await client.query(
            `UPDATE emergency_cases SET status = 'escalated', escalated_to_id = $1, updated_at = NOW() WHERE id = $2`,
            [escalate_to_id || null, id]
        );
        await auditCaseAction(client, id, 'escalated', req.user, {
            previous_status: prev.status, new_status: 'escalated',
            note, metadata: { escalate_to_id }
        });
        await client.query('COMMIT');

        emitEvent('emergency:updated', { id, status: 'escalated' });
        return res.status(200).json(new ApiResponse(200, { id, status: 'escalated' }, 'Case escalated'));
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
});

// ─── Update Status ───

export const updateEmergencyCaseStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
        throw new ApiError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const ec = await client.query(
            `SELECT * FROM emergency_cases WHERE id = $1 AND hospital_id = $2`,
            [id, req.user.hospital_id]
        );
        if (!ec.rowCount) throw new ApiError(404, 'Emergency case not found');
        const prev = ec.rows[0];

        const updates = ['status = $1::emergency_status', 'updated_at = NOW()'];
        const params = [status];
        if (status === 'resolved') {
            updates.push(`resolved_at = NOW()`);
            updates.push(`resolved_reason = $${params.length + 1}`);
            params.push(note || null);
        }
        params.push(id);

        await client.query(
            `UPDATE emergency_cases SET ${updates.join(', ')} WHERE id = $${params.length}`,
            params
        );
        await auditCaseAction(client, id, 'status_updated', req.user, {
            previous_status: prev.status, new_status: status, note
        });
        await client.query('COMMIT');

        emitEvent('emergency:updated', { id, status });
        return res.status(200).json(new ApiResponse(200, { id, status }, 'Case status updated'));
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
});

// ─── Add Note ───

export const addEmergencyCaseNote = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;
    if (!note || !note.trim()) throw new ApiError(400, 'note is required');

    const ec = await pool.query(
        `SELECT id FROM emergency_cases WHERE id = $1 AND hospital_id = $2`,
        [id, req.user.hospital_id]
    );
    if (!ec.rowCount) throw new ApiError(404, 'Emergency case not found');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await auditCaseAction(client, id, 'note_added', req.user, { note });
        await client.query(`UPDATE emergency_cases SET updated_at = NOW() WHERE id = $1`, [id]);
        await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }

    return res.status(200).json(new ApiResponse(200, { id }, 'Note added'));
});

// ─── Resolve Case ───

export const resolveEmergencyCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const ec = await client.query(
            `SELECT * FROM emergency_cases WHERE id = $1 AND hospital_id = $2`,
            [id, req.user.hospital_id]
        );
        if (!ec.rowCount) throw new ApiError(404, 'Emergency case not found');
        const prev = ec.rows[0];

        await client.query(
            `UPDATE emergency_cases SET status = 'resolved', resolved_at = NOW(), resolved_reason = $1, updated_at = NOW() WHERE id = $2`,
            [reason || null, id]
        );
        await auditCaseAction(client, id, 'resolved', req.user, {
            previous_status: prev.status, new_status: 'resolved', note: reason
        });
        await client.query('COMMIT');

        emitEvent('emergency:updated', { id, status: 'resolved' });
        return res.status(200).json(new ApiResponse(200, { id, status: 'resolved' }, 'Case resolved'));
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
});

// ─── Get Case Action Timeline ───

export const getEmergencyCaseTimeline = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const ec = await pool.query(
        `SELECT id FROM emergency_cases WHERE id = $1 AND hospital_id = $2`,
        [id, req.user.hospital_id]
    );
    if (!ec.rowCount) throw new ApiError(404, 'Emergency case not found');

    const result = await pool.query(
        `SELECT eca.*, u.name AS actor_name
         FROM emergency_case_actions eca
         LEFT JOIN users u ON u.id = eca.actor_id
         WHERE eca.emergency_case_id = $1
         ORDER BY eca.created_at ASC`,
        [id]
    );

    return res.status(200).json(new ApiResponse(200, result.rows, 'Timeline retrieved'));
});

// ─── Confirm Identity & Link to Patient ───

export const confirmIdentity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { patient_id, create_new = false, full_name, gender, date_of_birth, mobile_number } = req.body;

    if (!patient_id && !create_new) {
        throw new ApiError(400, 'Either patient_id or create_new with patient details is required');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const ec = await client.query(
            `SELECT * FROM emergency_cases WHERE id = $1 AND hospital_id = $2`,
            [id, req.user.hospital_id]
        );
        if (!ec.rowCount) throw new ApiError(404, 'Emergency case not found');
        const prev = ec.rows[0];

        let resolvedPatientId = patient_id;

        if (create_new) {
            if (!full_name || !gender || !date_of_birth) {
                throw new ApiError(400, 'full_name, gender, and date_of_birth are required for new patient');
            }
            const p = (await client.query(
                `INSERT INTO patients (full_name, gender, date_of_birth, mobile_number, registration_type)
                 VALUES ($1, $2, $3, $4, 'emergency') RETURNING id`,
                [full_name, gender, date_of_birth, mobile_number || null]
            )).rows[0];
            resolvedPatientId = p.id;
        } else {
            const p = await client.query('SELECT id FROM patients WHERE id = $1', [patient_id]);
            if (!p.rowCount) throw new ApiError(404, 'Patient not found');
        }

        await client.query(
            `UPDATE emergency_cases SET patient_id = $1, identity_status = 'identified', updated_at = NOW() WHERE id = $2`,
            [resolvedPatientId, id]
        );

        await auditCaseAction(client, id, 'identity_confirmed', req.user, {
            previous_status: prev.identity_status, new_status: 'identified',
            metadata: { patient_id: resolvedPatientId, created_new: create_new }
        });

        await auditAccess(client, {
            event_type: 'identity_confirmed',
            staff_id: req.user.id,
            staff_role: req.user.role,
            patient_id: resolvedPatientId,
            emergency_case_id: id,
            purpose: 'Identity confirmation for emergency case',
            ip_address: req.ip
        });

        await client.query('COMMIT');
        return res.status(200).json(new ApiResponse(200, {
            id, patient_id: resolvedPatientId, identity_status: 'identified'
        }, 'Identity confirmed and linked'));
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
});

// ═══════════════════════════════════════════════════
// PATIENT ACCESS GRANTS (36-hour max, scoped, audited)
// ═══════════════════════════════════════════════════

export const createAccessGrant = asyncHandler(async (req, res) => {
    const {
        patient_id, emergency_case_id,
        data_categories = ['demographics', 'vitals', 'clinical_summary'],
        purpose, hours = 8
    } = req.body;

    if (!patient_id && !emergency_case_id) {
        throw new ApiError(400, 'patient_id or emergency_case_id is required');
    }
    if (!purpose || !purpose.trim()) {
        throw new ApiError(400, 'purpose is required');
    }

    // Enforce 36-hour max
    const requestedHours = Math.min(Number(hours) || 8, MAX_GRANT_HOURS);
    if (requestedHours <= 0) throw new ApiError(400, 'hours must be positive');

    const expiresAt = new Date(Date.now() + requestedHours * 3600 * 1000);

    // Validate data categories
    const ALLOWED_CATEGORIES = ['demographics', 'vitals', 'clinical_summary', 'medications', 'history', 'reports', 'documents'];
    const validCategories = data_categories.filter(c => ALLOWED_CATEGORIES.includes(c));
    if (!validCategories.length) {
        throw new ApiError(400, `data_categories must include at least one of: ${ALLOWED_CATEGORIES.join(', ')}`);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Validate patient/case exists
        let resolvedPatientId = patient_id || null;
        if (emergency_case_id) {
            const ec = await client.query(
                `SELECT id, patient_id FROM emergency_cases WHERE id = $1 AND hospital_id = $2`,
                [emergency_case_id, req.user.hospital_id]
            );
            if (!ec.rowCount) throw new ApiError(404, 'Emergency case not found');
            if (!resolvedPatientId) resolvedPatientId = ec.rows[0].patient_id;
        }
        if (resolvedPatientId) {
            const p = await client.query('SELECT id FROM patients WHERE id = $1', [resolvedPatientId]);
            if (!p.rowCount) throw new ApiError(404, 'Patient not found');
        }

        const grant = (await client.query(
            `INSERT INTO patient_access_grants
             (staff_id, patient_id, emergency_case_id, data_categories, purpose, scope, status, expires_at)
             VALUES ($1, $2, $3, $4, $5, 'emergency_care', 'active', $6)
             RETURNING *`,
            [req.user.id, resolvedPatientId, emergency_case_id || null,
             JSON.stringify(validCategories), purpose.trim(), expiresAt]
        )).rows[0];

        await auditAccess(client, {
            event_type: 'access_grant_issued',
            staff_id: req.user.id,
            staff_role: req.user.role,
            patient_id: resolvedPatientId,
            emergency_case_id,
            grant_id: grant.id,
            data_categories: validCategories,
            purpose: purpose.trim(),
            ip_address: req.ip
        });

        await client.query('COMMIT');

        return res.status(201).json(new ApiResponse(201, {
            id: grant.id,
            staff_id: grant.staff_id,
            patient_id: grant.patient_id,
            data_categories: validCategories,
            scope: grant.scope,
            status: 'active',
            issued_at: grant.issued_at,
            expires_at: grant.expires_at
        }, 'Access grant issued'));
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
});

// ─── List My Grants ───

export const listAccessGrants = asyncHandler(async (req, res) => {
    const { status = 'active' } = req.query;
    const result = await pool.query(
        `SELECT pag.*, p.full_name AS patient_name, ec.case_number
         FROM patient_access_grants pag
         LEFT JOIN patients p ON p.id = pag.patient_id
         LEFT JOIN emergency_cases ec ON ec.id = pag.emergency_case_id
         WHERE pag.staff_id = $1
           AND ($2::text IS NULL OR pag.status = $2::access_grant_status)
         ORDER BY pag.issued_at DESC
         LIMIT 100`,
        [req.user.id, status === 'all' ? null : status]
    );
    return res.status(200).json(new ApiResponse(200, result.rows, 'Access grants retrieved'));
});

// ─── Inspect Grant ───

export const getAccessGrant = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(
        `SELECT pag.*, p.full_name AS patient_name, ec.case_number
         FROM patient_access_grants pag
         LEFT JOIN patients p ON p.id = pag.patient_id
         LEFT JOIN emergency_cases ec ON ec.id = pag.emergency_case_id
         WHERE pag.id = $1 AND pag.staff_id = $2`,
        [id, req.user.id]
    );
    if (!result.rowCount) throw new ApiError(404, 'Access grant not found');
    return res.status(200).json(new ApiResponse(200, result.rows[0], 'Access grant retrieved'));
});

// ─── Revoke Grant ───

export const revokeAccessGrant = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const grant = await client.query(
            `SELECT * FROM patient_access_grants WHERE id = $1`,
            [id]
        );
        if (!grant.rowCount) throw new ApiError(404, 'Access grant not found');
        const g = grant.rows[0];

        // Only the grant owner or an admin can revoke
        if (g.staff_id !== req.user.id && req.user.role !== 'hospital_admin') {
            throw new ApiError(403, 'Only the grant holder or an admin can revoke');
        }

        await client.query(
            `UPDATE patient_access_grants
             SET status = 'revoked', revoked_at = NOW(), revoked_by = $1, revocation_reason = $2
             WHERE id = $3`,
            [req.user.id, reason || null, id]
        );

        await auditAccess(client, {
            event_type: 'access_grant_revoked',
            staff_id: req.user.id,
            staff_role: req.user.role,
            patient_id: g.patient_id,
            emergency_case_id: g.emergency_case_id,
            grant_id: id,
            purpose: reason || 'Manual revocation',
            ip_address: req.ip
        });

        await client.query('COMMIT');
        return res.status(200).json(new ApiResponse(200, { id, status: 'revoked' }, 'Access grant revoked'));
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
});

// ─── Retrieve Authorized Patient Data (grant-scoped) ───

export const getAuthorizedPatientData = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;

    // Find an active, non-expired grant for this staff + patient
    const grantResult = await pool.query(
        `SELECT * FROM patient_access_grants
         WHERE staff_id = $1 AND patient_id = $2 AND status = 'active' AND expires_at > NOW()
         ORDER BY expires_at DESC LIMIT 1`,
        [req.user.id, patient_id]
    );

    if (!grantResult.rowCount) {
        await auditAccess(pool, {
            event_type: 'patient_data_access_denied',
            staff_id: req.user.id,
            staff_role: req.user.role,
            patient_id,
            outcome: 'denied',
            denial_reason: 'No active access grant',
            ip_address: req.ip
        });
        throw new ApiError(403, 'No active access grant for this patient. Request access first.');
    }

    const grant = grantResult.rows[0];
    const categories = grant.data_categories || [];
    const data = {};

    if (categories.includes('demographics')) {
        const p = await pool.query(
            `SELECT id, full_name, gender, date_of_birth, mobile_number, abha_number, address FROM patients WHERE id = $1`,
            [patient_id]
        );
        data.demographics = p.rows[0] || null;
    }

    if (categories.includes('vitals')) {
        const v = await pool.query(
            `SELECT v.* FROM vitals v JOIN consultations c ON c.id = v.consultation_id
             WHERE c.patient_id = $1 ORDER BY v.recorded_at DESC LIMIT 5`,
            [patient_id]
        );
        data.vitals = v.rows;
    }

    if (categories.includes('clinical_summary')) {
        const cs = await pool.query(
            `SELECT cs.chief_complaint, cs.clinical_summary, cs.socrates_assessment, cs.history_of_present_illness, cs.generated_at
             FROM clinical_summaries cs JOIN consultations c ON c.id = cs.consultation_id
             WHERE c.patient_id = $1 ORDER BY cs.generated_at DESC LIMIT 5`,
            [patient_id]
        );
        data.clinical_summaries = cs.rows;
    }

    if (categories.includes('medications')) {
        const m = await pool.query(
            `SELECT cs.medications FROM clinical_summaries cs JOIN consultations c ON c.id = cs.consultation_id
             WHERE c.patient_id = $1 ORDER BY cs.generated_at DESC LIMIT 5`,
            [patient_id]
        );
        data.medications = m.rows.map(r => r.medications).flat().filter(Boolean);
    }

    await auditAccess(pool, {
        event_type: 'patient_data_accessed',
        staff_id: req.user.id,
        staff_role: req.user.role,
        patient_id,
        grant_id: grant.id,
        data_categories: categories,
        purpose: grant.purpose,
        ip_address: req.ip
    });

    return res.status(200).json(new ApiResponse(200, {
        patient_id,
        grant_id: grant.id,
        grant_expires_at: grant.expires_at,
        data_categories: categories,
        data
    }, 'Authorized patient data retrieved'));
});

// ─── Access Audit History (admin only) ───

export const getAccessAuditLog = asyncHandler(async (req, res) => {
    const { patient_id, staff_id, limit = 50 } = req.query;

    const conditions = [];
    const params = [];

    if (patient_id) {
        params.push(patient_id);
        conditions.push(`aal.patient_id = $${params.length}`);
    }
    if (staff_id) {
        params.push(staff_id);
        conditions.push(`aal.staff_id = $${params.length}`);
    }

    params.push(Math.min(100, Math.max(1, Number(limit))));

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
        `SELECT aal.*, u.name AS staff_name, p.full_name AS patient_name
         FROM access_audit_log aal
         LEFT JOIN users u ON u.id = aal.staff_id
         LEFT JOIN patients p ON p.id = aal.patient_id
         ${where}
         ORDER BY aal.created_at DESC
         LIMIT $${params.length}`,
        params
    );

    return res.status(200).json(new ApiResponse(200, result.rows, 'Audit log retrieved'));
});
