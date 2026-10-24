/**
 * Emergency Routes — P2Care Emergency Intake, SOS Dashboard, Unidentified Cases,
 * Patient Access Grants, and Audit Log.
 *
 * Mounted at: /api/v1/emergency
 */
import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { verifyAdmin } from '../middleware/role.middleware.js';
import {
    createEmergencyIntake,
    listEmergencyCases,
    getEmergencyCase,
    acknowledgeEmergencyCase,
    assignEmergencyCase,
    escalateEmergencyCase,
    updateEmergencyCaseStatus,
    addEmergencyCaseNote,
    resolveEmergencyCase,
    getEmergencyCaseTimeline,
    confirmIdentity,
    createAccessGrant,
    listAccessGrants,
    getAccessGrant,
    revokeAccessGrant,
    getAuthorizedPatientData,
    getAccessAuditLog,
} from '../controllers/emergency.controller.js';

const router = Router();

// ── Public (kiosk-facing) emergency intake ──
// The kiosk does not have staff auth, so this is unprotected but rate-limited by category.
router.post('/intake', createEmergencyIntake);

// ── Protected staff endpoints (require login) ──
router.use(verifyJWT);

// Emergency case management
router.get('/cases', listEmergencyCases);
router.get('/cases/:id', getEmergencyCase);
router.post('/cases/:id/acknowledge', acknowledgeEmergencyCase);
router.post('/cases/:id/assign', assignEmergencyCase);
router.post('/cases/:id/escalate', escalateEmergencyCase);
router.patch('/cases/:id/status', updateEmergencyCaseStatus);
router.post('/cases/:id/notes', addEmergencyCaseNote);
router.post('/cases/:id/resolve', resolveEmergencyCase);
router.get('/cases/:id/timeline', getEmergencyCaseTimeline);
router.post('/cases/:id/confirm-identity', confirmIdentity);

// Patient access grants (36-hour max, scoped)
router.post('/access-grants', createAccessGrant);
router.get('/access-grants', listAccessGrants);
router.get('/access-grants/:id', getAccessGrant);
router.post('/access-grants/:id/revoke', revokeAccessGrant);

// Authorized patient data (grant-scoped)
router.get('/patients/:patient_id/authorized-data', getAuthorizedPatientData);

// Audit log (admin-only)
router.get('/audit-log', verifyAdmin, getAccessAuditLog);

export default router;
