// Automated test suite for CLEANUP PROMPT 5: M1-M9 Document Upload & Analysis Flow
// Run with node scratch/test_flow_m1_m9.js

import useMobileStore, { SCREENS } from "../src/store/useMobileStore.js";
import { getMockExtractionForDocument } from "../src/data/mockData.js";
import { analyzeDocumentOCR } from "../src/services/documentService.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log("\n=== TEST SUITE: M1–M9 MEDICAL DOCUMENT UPLOAD & EXTRACTION FLOW ===\n");

// --- TEST 1: Type-Specific Mock Extractions ---
console.log("--- 1. Type-Specific Mock Extractions ---");

// Prescription
const rxExtract = getMockExtractionForDocument("prescription", "DrVerma_Rx.pdf", 1);
assert(rxExtract.documentType === "prescription", "Rx extraction has documentType 'prescription'");
assert(Array.isArray(rxExtract.medicines) && rxExtract.medicines.length > 0, "Rx extraction has medicines[]");
assert(rxExtract.diagnosis && rxExtract.diagnosis.name, "Rx extraction has diagnosis");
assert(rxExtract.medicines.some((m) => m.needsVerification), "Rx extraction preserves low-confidence needsVerification item");
assert(rxExtract.medicines.some((m) => !m.needsVerification), "Rx extraction preserves high-confidence item");

// Lab Report
const labExtract = getMockExtractionForDocument("lab_report", "BloodTest_Apr2026.pdf", 1);
assert(labExtract.documentType === "lab_report", "Lab extraction has documentType 'lab_report'");
assert(Array.isArray(labExtract.investigations) && labExtract.investigations.length > 0, "Lab extraction has investigations[]");
const inv1 = labExtract.investigations[0];
assert(inv1.testName && inv1.value && inv1.unit, "Investigation has testName, value, unit");
assert(inv1.isAbnormal !== undefined && inv1.abnormality, "Investigation has abnormality tag");
assert(labExtract.investigations.some((i) => i.needsVerification), "Lab extraction preserves low-confidence needsVerification item");

// Discharge Summary
const dsExtract = getMockExtractionForDocument("discharge_summary", "Discharge_Nov.pdf", 2);
assert(dsExtract.documentType === "discharge_summary", "Discharge extraction has documentType 'discharge_summary'");
assert(dsExtract.diagnosis && dsExtract.diagnosis.name, "Discharge extraction has diagnosis");
assert(Array.isArray(dsExtract.procedures) && dsExtract.procedures.length > 0, "Discharge extraction has procedures[]");
assert(dsExtract.dischargeInformation && dsExtract.dischargeInformation.admissionDate, "Discharge extraction has dischargeInformation");
assert(Array.isArray(dsExtract.medications) && dsExtract.medications.length > 0, "Discharge extraction has medications[]");

// Other Medical Record
const otherExtract = getMockExtractionForDocument("other", "Vaccine_Cert.pdf", 1);
assert(otherExtract.documentType === "other", "Other extraction has documentType 'other'");
assert(Array.isArray(otherExtract.recordDetails) && otherExtract.recordDetails.length > 0, "Other extraction has recordDetails[]");
assert(otherExtract.recordDetails[0].label && otherExtract.recordDetails[0].value, "Record detail has label and value");

// --- TEST 2: Document Type Selection from M2 carried to Store & Staging ---
console.log("\n--- 2. Document Type Selection (M2) Carried Forward ---");
useMobileStore.getState().setSelectedDocumentType("lab_report");
assert(useMobileStore.getState().selectedDocumentType === "lab_report", "selectedDocumentType updated to lab_report");
assert(
  useMobileStore.getState().documentSets.every((s) => s.type === "lab_report"),
  "Document sets type updated to lab_report"
);

// --- TEST 3: Multi-Page Document Receives Exactly ONE Extraction ---
console.log("\n--- 3. Multi-Page Document Receives ONE Extraction ---");
const multiPageLab = getMockExtractionForDocument("lab_report", "Full_Body_Panel.pdf", 3);
assert(multiPageLab.pageCount === 3, "Multi-page extraction reflects 3 pages in single extraction");
assert(Array.isArray(multiPageLab.investigations), "Multi-page has investigations");

// --- TEST 4: Analysis Simulation (M5) -> Populates Extracted Data ---
console.log("\n--- 4. Analysis Simulation Execution ---");
useMobileStore.setState({
  documentSets: [
    {
      id: "set_lab_test",
      title: "Biochemistry Panel",
      type: "lab_report",
      status: "UPLOADED",
      pages: [
        { id: "p1", pageNumber: 1, fileName: "Bio_P1.jpg" },
        { id: "p2", pageNumber: 2, fileName: "Bio_P2.jpg" },
      ],
      extraction: null,
    },
  ],
  selectedDocumentType: "lab_report",
  activeSetId: "set_lab_test",
});

await useMobileStore.getState().runAnalysisSimulation();

const currentExtracted = useMobileStore.getState().extractedData;
assert(currentExtracted.documentType === "lab_report", "Extracted data has documentType 'lab_report'");
assert(Array.isArray(currentExtracted.investigations), "Extracted data contains investigations");
assert(currentExtracted.pageCount === 2, "Extraction reflects 2 pages");

// --- TEST 5: Verification Scoping & Confirmation ---
console.log("\n--- 5. Verification Scoping & Confirmation (M6 -> M7) ---");
const initialRecords = useMobileStore.getState().medicalRecords;
const unrelatedRecordInitialExtraction = JSON.stringify(initialRecords[0]?.extraction);

useMobileStore.getState().confirmExtractedInformation();

const afterRecords = useMobileStore.getState().medicalRecords;
const newlyConfirmed = afterRecords[0];

assert(newlyConfirmed.type === "lab_report", "Confirmed record has type 'lab_report'");
assert(newlyConfirmed.pages.length === 2, "Confirmed record has 2 pages (single multi-page record)");
assert(newlyConfirmed.status === "CONFIRMED", "Confirmed record status is 'CONFIRMED'");
assert(Array.isArray(newlyConfirmed.extraction.investigations), "Confirmed record extraction contains investigations");
assert(
  newlyConfirmed.extraction.investigations.every((i) => !i.needsVerification),
  "All investigations marked verified (needsVerification: false) on confirmation"
);

// Unrelated records extraction NOT overwritten
const unrelatedRecordAfter = afterRecords.find((r) => r.id === initialRecords[0]?.id);
assert(
  JSON.stringify(unrelatedRecordAfter?.extraction) === unrelatedRecordInitialExtraction,
  "Unrelated prior record's extraction was strictly preserved and NOT overwritten"
);

// --- TEST 6: Timeline Integration References Actual Document ---
console.log("\n--- 6. Timeline Integration References Actual Document ---");
const latestTimelineItem = useMobileStore.getState().timeline[0];
assert(latestTimelineItem, "Timeline has a latest item");
assert(latestTimelineItem.documentId === newlyConfirmed.id, `Timeline documentId matches confirmed record id (${newlyConfirmed.id})`);
assert(latestTimelineItem.recordId === newlyConfirmed.id, "Timeline recordId matches confirmed record id");
assert(latestTimelineItem.source === newlyConfirmed.typeLabel, "Timeline source matches document type label");

// --- TEST 7: Discharge Summary End-to-End Test ---
console.log("\n--- 7. Discharge Summary End-to-End Extraction & Confirmation ---");
useMobileStore.setState({
  documentSets: [
    {
      id: "set_ds_test",
      title: "Ayush Discharge Memo",
      type: "discharge_summary",
      status: "UPLOADED",
      pages: [{ id: "p1", pageNumber: 1, fileName: "Discharge.jpg" }],
      extraction: null,
    },
  ],
  selectedDocumentType: "discharge_summary",
  activeSetId: "set_ds_test",
});

await useMobileStore.getState().runAnalysisSimulation();
const dsResult = useMobileStore.getState().extractedData;
assert(dsResult.documentType === "discharge_summary", "Extracted data is discharge_summary");
assert(Array.isArray(dsResult.procedures), "Contains procedures");
assert(dsResult.dischargeInformation, "Contains dischargeInformation");

useMobileStore.getState().confirmExtractedInformation();
const dsConfirmed = useMobileStore.getState().medicalRecords[0];
assert(dsConfirmed.type === "discharge_summary", "Confirmed record type is discharge_summary");
assert(Array.isArray(dsConfirmed.extraction.procedures), "Confirmed record has procedures");
assert(dsConfirmed.extraction.dischargeInformation, "Confirmed record has dischargeInformation");

// --- TEST 8: Other Record End-to-End Test ---
console.log("\n--- 8. Other Record End-to-End Extraction & Confirmation ---");
useMobileStore.setState({
  documentSets: [
    {
      id: "set_other_test",
      title: "Health Insurance Certificate",
      type: "other",
      status: "UPLOADED",
      pages: [{ id: "p1", pageNumber: 1, fileName: "Cert.jpg" }],
      extraction: null,
    },
  ],
  selectedDocumentType: "other",
  activeSetId: "set_other_test",
});

await useMobileStore.getState().runAnalysisSimulation();
const otherResult = useMobileStore.getState().extractedData;
assert(otherResult.documentType === "other", "Extracted data is other");
assert(Array.isArray(otherResult.recordDetails), "Contains recordDetails");

useMobileStore.getState().confirmExtractedInformation();
const otherConfirmed = useMobileStore.getState().medicalRecords[0];
assert(otherConfirmed.type === "other", "Confirmed record type is other");
assert(Array.isArray(otherConfirmed.extraction.recordDetails), "Confirmed record has recordDetails");

console.log("\n🎉 ALL M1–M9 UPLOAD & EXTRACTION TESTS PASSED SUCCESSFULLY!\n");
