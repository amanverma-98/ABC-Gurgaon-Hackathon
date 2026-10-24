// Automated test suite for CLEANUP PROMPT 4: Document & Medical Record Architecture
// Run with node scratch/test_document_architecture.js

import { mockMedicalRecords, mockVisits } from "../src/data/mockData.js";
import useMobileStore, { SCREENS } from "../src/store/useMobileStore.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log("\n=== TEST SUITE: DOCUMENT & MEDICAL RECORD DATA ARCHITECTURE ===\n");

// --- TEST 1: Canonical Hierarchy in mockMedicalRecords ---
console.log("--- 1. Canonical Hierarchy in mockMedicalRecords ---");
mockMedicalRecords.forEach((rec, idx) => {
  assert(rec.id, `Record ${idx} has id`);
  assert(rec.type, `Record ${idx} has type: ${rec.type}`);
  assert(rec.title, `Record ${idx} has title: ${rec.title}`);
  assert(rec.status, `Record ${idx} has status: ${rec.status}`);
  assert(Array.isArray(rec.pages), `Record ${idx} (${rec.id}) has pages[] array`);
  assert(rec.pages.length > 0, `Record ${idx} has at least 1 page (actual: ${rec.pages.length})`);
  assert(rec.extraction || rec.extractedInformation, `Record ${idx} has extraction/extractedInformation`);
  assert(rec.patientId !== undefined, `Record ${idx} has patientId`);
});

// Verify multi-page mock record DOC-003
const multiPageDoc = mockMedicalRecords.find((r) => r.id === "DOC-003");
assert(multiPageDoc, "DOC-003 exists");
assert(multiPageDoc.pages.length === 2, `DOC-003 is multi-page with 2 pages (actual: ${multiPageDoc.pages.length})`);
assert(multiPageDoc.totalPages === 2, `DOC-003 has totalPages: 2`);
assert(multiPageDoc.pages[0].pageNumber === 1, "Page 1 pageNumber is 1");
assert(multiPageDoc.pages[1].pageNumber === 2, "Page 2 pageNumber is 2");

// --- TEST 2: Multi-Page Document Set -> ONE Medical Record ---
console.log("\n--- 2. Multi-Page Document Set produces ONE Medical Record ---");
const store = useMobileStore.getState();

// Initial count of medical records
const initialRecordCount = store.medicalRecords.length;

// Setup a multi-page document set in store
useMobileStore.setState({
  documentSets: [
    {
      id: "set-multi-test",
      title: "Chest X-Ray & Multi-Page Radiology Report",
      type: "lab_report",
      status: "UPLOADED",
      uploadedAt: new Date().toISOString(),
      totalPages: 3,
      pages: [
        { id: "p1", pageNumber: 1, image: "img_p1.jpg", fileName: "Rad_P1.jpg" },
        { id: "p2", pageNumber: 2, image: "img_p2.jpg", fileName: "Rad_P2.jpg" },
        { id: "p3", pageNumber: 3, image: "img_p3.jpg", fileName: "Rad_P3.jpg" },
      ],
      extraction: null,
    },
  ],
  uploadVisitId: null,
  selectedVisit: null,
  patient: { id: "pat_test_999", name: "Sunita Sharma" },
});

// Confirm extraction
useMobileStore.getState().confirmExtractedInformation();

const afterConfirmRecords = useMobileStore.getState().medicalRecords;
// Crucial: Only ONE record should be added, NOT 3!
assert(
  afterConfirmRecords.length === initialRecordCount + 1,
  `Exactly ONE new medical record was created (before: ${initialRecordCount}, after: ${afterConfirmRecords.length})`
);

const newlyCreatedRecord = afterConfirmRecords[0];
assert(newlyCreatedRecord.title.startsWith("Chest X-Ray & Multi-Page Radiology Report"), "New record has correct title");
assert(Array.isArray(newlyCreatedRecord.pages), "New record has pages[] array");
assert(newlyCreatedRecord.pages.length === 3, `New record contains 3 pages (actual: ${newlyCreatedRecord.pages.length})`);
assert(newlyCreatedRecord.totalPages === 3, `New record totalPages is 3`);
assert(newlyCreatedRecord.status === "CONFIRMED", `New record status is CONFIRMED (actual: ${newlyCreatedRecord.status})`);
assert(newlyCreatedRecord.patientId === "pat_test_999", `New record has patientId pat_test_999 (actual: ${newlyCreatedRecord.patientId})`);
assert(newlyCreatedRecord.visitId === null, `New record visitId is null when unassociated (actual: ${newlyCreatedRecord.visitId})`);

// --- TEST 3: Document Associated with Current Visit ---
console.log("\n--- 3. Document Associated with Current Visit ---");
useMobileStore.setState({
  documentSets: [
    {
      id: "set-visit-test",
      title: "Ayush OPD Prescription",
      type: "prescription",
      status: "UPLOADED",
      totalPages: 1,
      pages: [
        { id: "p-visit-1", pageNumber: 1, image: "rx_visit.jpg", fileName: "Rx_Visit.jpg" },
      ],
      extraction: null,
    },
  ],
  uploadVisitId: "VISIT-2026-004", // explicitly linked to a specific visit
  selectedVisit: null,
  patient: { id: "pat_test_999" },
});

useMobileStore.getState().confirmExtractedInformation();

const afterVisitConfirm = useMobileStore.getState().medicalRecords;
const visitLinkedRecord = afterVisitConfirm[0];
assert(visitLinkedRecord.visitId === "VISIT-2026-004", `Visit linked record has visitId VISIT-2026-004 (actual: ${visitLinkedRecord.visitId})`);
assert(visitLinkedRecord.pages.length === 1, "Visit linked record has 1 page");

// --- TEST 4: Document NOT Associated with Visit -> visitId is null ---
console.log("\n--- 4. Document Not Associated with Visit has visitId = null ---");
useMobileStore.setState({
  documentSets: [
    {
      id: "set-personal-test",
      title: "Old Personal Lab Test",
      type: "lab_report",
      status: "UPLOADED",
      totalPages: 1,
      pages: [
        { id: "p-old-1", pageNumber: 1, image: "old_lab.jpg", fileName: "Old_Lab.jpg" },
      ],
      extraction: null,
    },
  ],
  uploadVisitId: null,
  selectedVisit: null,
});

useMobileStore.getState().confirmExtractedInformation();

const afterPersonalConfirm = useMobileStore.getState().medicalRecords;
const personalRecord = afterPersonalConfirm[0];
assert(personalRecord.visitId === null, `Unlinked document has visitId: null (never hardcoded VISIT-001)`);
assert(personalRecord.visitId !== "VISIT-001", "Does NOT default to VISIT-001");

// --- TEST 5: Document Status Preservation ---
console.log("\n--- 5. Document Status Lifecycle & Preservation ---");
const validStatuses = ["UPLOADED", "PROCESSING", "PROCESSED", "NEEDS_REVIEW", "CONFIRMED"];
validStatuses.forEach((status) => {
  const testDoc = {
    id: `TEST-STATUS-${status}`,
    title: `Status test ${status}`,
    type: "prescription",
    status,
    pages: [{ id: "p1", pageNumber: 1 }],
    extraction: { medicines: [], diagnosis: [] },
  };
  useMobileStore.getState().addMedicalRecord(testDoc);
  const found = useMobileStore.getState().medicalRecords.find((r) => r.id === testDoc.id);
  assert(found && found.status === status, `Status ${status} is preserved correctly`);
});

// --- TEST 6: Duplicate State Cleaned Up on Confirmation ---
console.log("\n--- 6. Duplicate State Cleaned Up ---");
const stateAfter = useMobileStore.getState();
assert(stateAfter.documentSets.length === 1, "documentSets reset to 1 empty initial set");
assert(stateAfter.documentSets[0].pages.length === 0, "staging set has 0 pages");
assert(stateAfter.capturedDocuments.length === 0, "capturedDocuments staging array is empty");
assert(stateAfter.uploadVisitId === null, "uploadVisitId is reset to null");

console.log("\n🎉 ALL DOCUMENT DATA ARCHITECTURE TESTS PASSED SUCCESSFULLY!\n");
