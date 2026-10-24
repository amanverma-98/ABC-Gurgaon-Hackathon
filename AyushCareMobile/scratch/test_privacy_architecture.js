import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import useMobileStore from "../src/store/useMobileStore.js";
import { translations } from "../src/i18n/translations.js";
import { mockPrivacyData, mockVisits, mockAppointments, mockMedicalRecords } from "../src/data/mockData.js";

console.log("=== RUNNING PRIVACY & DATA CONTROL ARCHITECTURE TESTS (PROMPT 7) ===");

const store = useMobileStore.getState();

// Count baseline data
const baselineRecordsCount = store.medicalRecords?.length || 0;
const baselineVisitsCount = mockVisits.length;
const baselineAppointmentId = mockAppointments.today.id;
const baselineTimelineCount = store.timeline?.length || 0;
const baselineSectionsCount = Object.keys(store.healthSummary?.sections || {}).length;

console.log(`Baseline counts - Records: ${baselineRecordsCount}, Visits: ${baselineVisitsCount}, Appointment: ${baselineAppointmentId}, Timeline: ${baselineTimelineCount}, Summary sections: ${baselineSectionsCount}`);

/* -------------------------------------------------------------------------- */
/* 1. HEALTH HISTORY SHARING LOCK (NON-DESTRUCTIVE)                           */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 1] Health History Sharing lock/unlock...");

// Initial state should be unlocked
assert.strictEqual(store.isHealthHistoryLocked, false, "Health history should initially be unlocked (Available)");

// Lock sharing
store.setHealthHistoryLocked(true);
const lockedState = useMobileStore.getState();
assert.strictEqual(lockedState.isHealthHistoryLocked, true, "Health history should now be locked (Restricted)");
assert.strictEqual(lockedState.privacyData.healthHistoryAccess.locked, true, "privacyData.healthHistoryAccess.locked should be true");

// Verify non-destructive invariant: locking sharing MUST NOT delete records, visits, appointments, documents, or timeline
assert.strictEqual(lockedState.medicalRecords?.length, baselineRecordsCount, "Medical records must NOT be deleted when locked");
assert.strictEqual(mockVisits.length, baselineVisitsCount, "Visits must NOT be deleted when locked");
assert.strictEqual(mockAppointments.today.id, baselineAppointmentId, "Appointments must NOT be deleted when locked");
assert.strictEqual(lockedState.timeline?.length, baselineTimelineCount, "Timeline must NOT be deleted when locked");
assert.strictEqual(Object.keys(lockedState.healthSummary?.sections || {}).length, baselineSectionsCount, "Health summary must NOT be deleted when locked");

// Unlock sharing
store.setHealthHistoryLocked(false);
const unlockedState = useMobileStore.getState();
assert.strictEqual(unlockedState.isHealthHistoryLocked, false, "Health history should be unlocked (Available)");
assert.strictEqual(unlockedState.medicalRecords?.length, baselineRecordsCount, "Medical records intact after unlocking");
console.log("✓ Health history sharing lock is completely non-destructive and controls access state properly.");

/* -------------------------------------------------------------------------- */
/* 2. CONSENT DATA MODEL AND LIFECYCLE                                        */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 2] Consent structure and lifecycle (Active -> Withdraw -> Re-Allow)...");

const activeConsents = unlockedState.privacyData.activeConsents;
assert.ok(Array.isArray(activeConsents) && activeConsents.length >= 2, "Should have active consents defined");

activeConsents.forEach((consent) => {
  assert.ok(consent.id, "Consent must have id");
  assert.ok(consent.purpose, "Consent must have purpose");
  assert.ok(Array.isArray(consent.informationShared), "Consent must list informationShared");
  assert.ok(consent.accessedBy, "Consent must have recipient/accessor");
  assert.ok(["ACTIVE", "WITHDRAWN", "EXPIRED"].includes(consent.status), "Status must be ACTIVE, WITHDRAWN, or EXPIRED");
  assert.ok(consent.grantedAt, "Consent must have grantedAt");
});

// Test withdrawal
const testConsentId = activeConsents[0].id;
store.withdrawConsent(testConsentId);
const stateAfterWithdraw = useMobileStore.getState();
const withdrawnConsent = stateAfterWithdraw.privacyData.activeConsents.find((c) => c.id === testConsentId);

assert.strictEqual(withdrawnConsent.status, "WITHDRAWN", "Consent status must transition to WITHDRAWN");
assert.ok(withdrawnConsent.withdrawnAt, "Consent must record withdrawnAt timestamp");

// Verify records NOT deleted on withdrawal
assert.strictEqual(stateAfterWithdraw.medicalRecords?.length, baselineRecordsCount, "Records must NOT be deleted on consent withdrawal");
assert.strictEqual(mockVisits.length, baselineVisitsCount, "Visits must NOT be deleted on consent withdrawal");
assert.strictEqual(stateAfterWithdraw.timeline?.length, baselineTimelineCount, "Timeline must NOT be deleted on consent withdrawal");

// Test re-grant / re-allow
store.regrantConsent(testConsentId);
const stateAfterRegrant = useMobileStore.getState();
const regrantedConsent = stateAfterRegrant.privacyData.activeConsents.find((c) => c.id === testConsentId);

assert.strictEqual(regrantedConsent.status, "ACTIVE", "Consent status must return to ACTIVE");
assert.strictEqual(stateAfterRegrant.medicalRecords?.length, baselineRecordsCount, "Records intact after re-grant");
console.log("✓ Consent lifecycle (ACTIVE <-> WITHDRAWN) verified without record destruction.");

/* -------------------------------------------------------------------------- */
/* 3. ACCESS HISTORY & AUDIT LOG WITH PROTOTYPE DISCLAIMER                   */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 3] Access History structure and mock/demo disclaimer...");

const accessHistory = stateAfterRegrant.privacyData.accessHistory;
assert.ok(Array.isArray(accessHistory) && accessHistory.length > 0, "Access history must exist");

accessHistory.slice(0, 3).forEach((entry) => {
  assert.ok(entry.organization, "Access event must have organization");
  assert.ok(entry.accessedByRole, "Access event must have accessedByRole");
  assert.ok(entry.informationAccessed, "Access event must detail informationAccessed");
  assert.ok(entry.purpose, "Access event must have purpose");
  assert.ok(entry.date, "Access event must have date");
  assert.ok(entry.time, "Access event must have time");
});

// Verify disclaimer in translations
assert.ok(
  translations.en.privacy_access_history_disclaimer.includes("prototype"),
  "English translation must include prototype disclaimer"
);
assert.ok(
  translations.hi.privacy_access_history_disclaimer.includes("प्रोटोटाइप"),
  "Hindi translation must include prototype disclaimer"
);
console.log("✓ Access history is correctly structured and clearly disclaimed as prototype activity.");

/* -------------------------------------------------------------------------- */
/* 4. ACTIVE SESSIONS (CANONICAL KIOSK INTEGRATION)                           */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 4] Active Sessions canonical kiosk integration...");

// Connect a kiosk session
store.connectKioskSession({
  id: "kiosk-session-001",
  kioskName: "Civil Hospital OPD Kiosk 03",
  terminalId: "KIOSK-DELHI-OPD-03",
  hospitalName: "Civil Hospital OPD",
  department: "General Medicine",
  location: "Waiting Lobby, Ground Floor",
});

const connectedState = useMobileStore.getState();
assert.strictEqual(connectedState.kioskSession.status, "CONNECTED", "kioskSession must be CONNECTED");

// End session through canonical action
store.endKioskSession("kiosk-session-001");
const endedState = useMobileStore.getState();
assert.strictEqual(endedState.kioskSession.status, "ENDED", "kioskSession must be ENDED");

// Verify non-destructive guarantee for sessions
assert.strictEqual(endedState.medicalRecords?.length, baselineRecordsCount, "Medical records intact after session end");
assert.strictEqual(mockVisits.length, baselineVisitsCount, "Visits intact after session end");
console.log("✓ Canonical kiosk session termination verified and strictly non-destructive.");

/* -------------------------------------------------------------------------- */
/* 5. REMOVAL OF OVER-ENGINEERED FEATURES                                     */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 5] Checking removal of over-engineered privacy toggles...");

assert.strictEqual(endedState.diagnosesPrivacy, undefined, "diagnosesPrivacy must be removed from store");
assert.strictEqual(endedState.reportsPrivacy, undefined, "reportsPrivacy must be removed from store");
assert.strictEqual(endedState.toggleDiagnosisPrivacy, undefined, "toggleDiagnosisPrivacy must be removed from store");
assert.strictEqual(endedState.toggleReportPrivacy, undefined, "toggleReportPrivacy must be removed from store");

// Check that PrivacyScreen file does not import or reference diagnosesPrivacy
const privacyScreenPath = path.resolve("src/pages/mobile/PrivacyScreen.jsx");
const privacyScreenCode = fs.readFileSync(privacyScreenPath, "utf-8");

assert.ok(!privacyScreenCode.includes("diagnosesPrivacy"), "PrivacyScreen.jsx must not contain diagnosesPrivacy");
assert.ok(!privacyScreenCode.includes("reportsPrivacy"), "PrivacyScreen.jsx must not contain reportsPrivacy");
assert.ok(!privacyScreenCode.includes("Hide from Doctor"), "PrivacyScreen.jsx must not contain 'Hide from Doctor'");
assert.ok(!privacyScreenCode.includes("Share with Doctor"), "PrivacyScreen.jsx must not contain 'Share with Doctor'");
console.log("✓ Over-engineered diagnoses/reports privacy toggles completely removed.");

/* -------------------------------------------------------------------------- */
/* 6. LEGAL WORDING COMPLIANCE                                                */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 6] Checking legal wording compliance...");

assert.ok(!privacyScreenCode.includes("DPDP certified"), "Must NOT claim DPDP certified");
assert.ok(!privacyScreenCode.includes("ABDM certified"), "Must NOT claim ABDM certified");
assert.ok(!privacyScreenCode.includes("mandates this exact button"), "Must NOT claim DPDP mandates button");

// Positive wording checks
assert.ok(
  privacyScreenCode.includes("Patient-Controlled Privacy") ||
    translations.en.privacy_notice.includes("Patient-controlled privacy feature"),
  "Must include patient-controlled privacy statement"
);
console.log("✓ Legal wording compliance verified (no false certification or regulatory mandates).");

console.log("\n=== ALL PRIVACY & DATA CONTROL TESTS PASSED SUCCESSFULLY! ===");
