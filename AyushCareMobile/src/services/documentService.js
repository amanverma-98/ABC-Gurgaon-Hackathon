import { apiRequest, unwrapApiResponse } from "./apiClient";

export const DOCUMENT_TYPES = {
  PRESCRIPTION: "prescription",
  LAB_REPORT: "lab_report",
  DISCHARGE_SUMMARY: "discharge_summary",
  OTHER: "other",
};

const aliases = {
  prescription: "prescription", rx: "prescription",
  lab: "lab_report", labs: "lab_report", laboratory: "lab_report",
  lab_report: "lab_report", "lab-report": "lab_report",
  discharge: "discharge_summary", discharge_summary: "discharge_summary",
  "discharge-summary": "discharge_summary", other: "other", other_document: "other",
};

export function normalizeDocumentType(type) {
  const key = String(type || "other").trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  return aliases[key] || "other";
}
export function getDocumentTypeLabel(type) {
  return ({ prescription: "Prescription", lab_report: "Lab report", discharge_summary: "Discharge summary", other: "Other document" })[normalizeDocumentType(type)];
}
export function createDocumentId(prefix = "doc") { return `${prefix}-${Date.now()}`; }
export function createDocumentPage({ source = {}, documentType, pageNumber = 1, id } = {}) {
  const preview = source.previewUrl || source.imageUrl || source.dataUrl || source.image || source.preview || "";
  return {
    id: id || source.id || createDocumentId("page"), pageNumber,
    documentType: normalizeDocumentType(documentType || source.documentType),
    previewUrl: preview, imageUrl: preview, dataUrl: source.dataUrl || preview,
    preview, image: source.image || preview,
    fileName: source.fileName || source.name || `document-page-${pageNumber}.jpg`,
    mimeType: source.mimeType || source.type || "image/jpeg",
    fileSize: source.fileSize || null, width: source.width || null, height: source.height || null,
    capturedAt: source.capturedAt || new Date().toISOString(), source: source.source || "mobile-camera",
    file: source.file instanceof Blob ? source.file : null,
  };
}
export function normalizeDocumentPages({ capturedDocuments, capturedDocument, documentType } = {}) {
  const pages = Array.isArray(capturedDocuments) && capturedDocuments.length
    ? capturedDocuments : capturedDocument?.pages?.length ? capturedDocument.pages : capturedDocument ? [capturedDocument] : [];
  return pages.filter(Boolean).map((p, i) => createDocumentPage({ source: p, documentType: p.documentType || documentType, pageNumber: i + 1, id: p.id }));
}
export function buildDocumentPayload({ capturedDocuments, capturedDocument, documentType } = {}) {
  const pages = normalizeDocumentPages({ capturedDocuments, capturedDocument, documentType });
  const type = normalizeDocumentType(documentType || capturedDocument?.documentType || pages[0]?.documentType);
  return { id: capturedDocument?.documentId || capturedDocument?.id || createDocumentId("document"), documentType: type, documentTypeLabel: getDocumentTypeLabel(type), pageCount: pages.length, pages, capturedAt: new Date().toISOString(), source: "AyushCareMobile" };
}
export function validateDocumentForAnalysis(payload) {
  const pages = normalizeDocumentPages({ capturedDocuments: payload?.pages, capturedDocument: payload?.document, documentType: payload?.documentType });
  return pages.length ? { valid: true, reason: "", pages } : { valid: false, reason: "No document pages were provided.", pages: [] };
}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"]);
const MAX_BYTES = 20 * 1024 * 1024;

async function toBlob(page) {
  if (page?.file instanceof Blob) return page.file;
  const url = page?.dataUrl || page?.previewUrl || page?.imageUrl;
  if (!url) throw new Error("Document image is unavailable.");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not prepare the document image.");
  return response.blob();
}

const activeUploads = new Map();

async function uploadBlob(consultationId, page, documentType) {
  const blob = await toBlob(page);
  const type = String(blob.type || page.mimeType || "image/jpeg").split(";")[0].toLowerCase();
  if (!ALLOWED.has(type)) throw new Error("Only JPEG, PNG, WebP images, or PDF documents can be analyzed.");
  if (blob.size > MAX_BYTES) throw new Error("Each file must be 20 MB or smaller.");

  const ext = type === "application/pdf" ? "pdf" : type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const fileName = page.fileName || `document-${page.pageNumber || 1}.${ext}`;
  const uploadKey = `${consultationId || 'default'}-${fileName}-${blob.size}-${normalizeDocumentType(documentType)}`;

  if (activeUploads.has(uploadKey)) {
    return activeUploads.get(uploadKey);
  }

  const uploadPromise = (async () => {
    try {
      const formData = new FormData();
      formData.append("file", blob, fileName);
      formData.append("document_type", normalizeDocumentType(documentType));
      if (consultationId) {
        formData.append("consultation_id", consultationId);
      }

      const registered = unwrapApiResponse(await apiRequest("/mobile/portal/documents/upload", {
        method: "POST",
        body: formData,
      }));

      return { ...registered, fileName, documentType: normalizeDocumentType(documentType) };
    } finally {
      activeUploads.delete(uploadKey);
    }
  })();

  activeUploads.set(uploadKey, uploadPromise);
  return uploadPromise;
}

export async function uploadDocumentsToPortal(consultationId, pages, documentType, onProgress) {
  if (!pages?.length) throw new Error("Please capture at least one document page.");
  const results = [];
  for (let i = 0; i < pages.length; i += 1) {
    const isPdf = Boolean(pages[i]?.mimeType?.includes("pdf") || pages[i]?.fileName?.toLowerCase()?.endsWith(".pdf"));
    const docWord = isPdf ? "PDF document" : "document";
    let curProgress = Math.max(10, Math.round((i / pages.length) * 40));
    onProgress?.(curProgress, `Uploading ${docWord} ${i + 1} of ${pages.length}…`);

    // Dynamic ticker while synchronous backend AI OCR + Cloudinary upload runs
    const ticker = setInterval(() => {
      curProgress = Math.min(88, curProgress + Math.floor(Math.random() * 6) + 3);
      let stageMsg = `Uploading ${docWord} ${i + 1} of ${pages.length}…`;
      if (curProgress >= 28 && curProgress < 52) {
        stageMsg = "Running AI OCR on document…";
      } else if (curProgress >= 52 && curProgress < 72) {
        stageMsg = "Securing document in Cloudinary…";
      } else if (curProgress >= 72) {
        stageMsg = "Extracting medicines and clinical diagnoses…";
      }
      onProgress?.(curProgress, stageMsg);
    }, 1100);

    try {
      const res = await uploadBlob(consultationId, pages[i], documentType);
      results.push(res);
    } finally {
      clearInterval(ticker);
    }
  }
  return results;
}

export async function getPortalDocument(documentId) {
  return unwrapApiResponse(await apiRequest(`/mobile/portal/documents/${encodeURIComponent(documentId)}`));
}

export async function getPortalDocuments() {
  return unwrapApiResponse(await apiRequest("/mobile/portal/documents"));
}

export async function waitForPortalDocumentProcessing(documentIds, onProgress, timeoutMs = 120000) {
  const ids = new Set((documentIds || []).filter(Boolean));
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const docs = [];
    for (const id of ids) {
      try { docs.push(await getPortalDocument(id)); } catch (error) { if (error.status !== 404) throw error; }
    }
    const finished = docs.length === ids.size && docs.every((d) => ["completed", "failed", "deleted"].includes(String(d.status || "").toLowerCase()));
    const completedCount = docs.filter((d) => String(d.status).toLowerCase() === "completed").length;
    onProgress?.(85 + Math.round((completedCount / Math.max(1, ids.size)) * 15), finished ? "Document analysis complete." : "Finalizing document extraction…");
    if (finished) return docs;
    await new Promise((resolve) => setTimeout(resolve, 1800));
  }
  throw new Error("Document analysis is taking longer than expected. Please open Records to check the result.");
}

export async function analyzeDocumentOCR(input, onProgress) {
  const consultationId = input?.consultationId || null;
  const pages = normalizeDocumentPages({ capturedDocuments: input?.pages, capturedDocument: input?.document, documentType: input?.documentType });
  if (!pages.length) throw new Error("Please capture at least one document page.");
  const registered = await uploadDocumentsToPortal(consultationId, pages, input.documentType, onProgress);

  // If backend already completed AI OCR and Cloudinary upload synchronously:
  const allCompleted = registered.length > 0 && registered.every(
    (d) => String(d?.status).toLowerCase() === "completed" || Boolean(d?.extracted_data && (typeof d.extracted_data === 'object' ? Object.keys(d.extracted_data).length > 0 : true))
  );

  let docs = registered;
  if (!allCompleted) {
    const ids = registered.map((d) => d.id).filter(Boolean);
    docs = await waitForPortalDocumentProcessing(ids, onProgress);
  }

  onProgress?.(100, "Document analyzed successfully");
  const completed = docs.filter((d) => String(d.status).toLowerCase() === "completed" || Boolean(d?.extracted_data));
  const failed = docs.filter((d) => String(d.status).toLowerCase() === "failed");
  const extracted = completed.reduce((acc, d) => {
    let ed = d.extracted_data || {};
    if (typeof ed === "string") {
      try { ed = JSON.parse(ed); } catch { ed = {}; }
    }
    return { ...acc, ...ed, documents: [...(acc.documents || []), d] };
  }, {});

  return { success: completed.length > 0 && failed.length === 0, extractedData: extracted, documents: docs, registered };
}

export async function fetchMedicalRecords() { return getPortalDocuments(); }
export async function getDocumentDetails(id) { return getPortalDocument(id); }
export async function updateRecordExtraction(documentId, extraction) { return { success: true, documentId, extraction }; }
export default { DOCUMENT_TYPES, normalizeDocumentType, getDocumentTypeLabel, createDocumentId, createDocumentPage, normalizeDocumentPages, buildDocumentPayload, validateDocumentForAnalysis, uploadDocumentsToPortal, getPortalDocument, getPortalDocuments, waitForPortalDocumentProcessing, analyzeDocumentOCR, fetchMedicalRecords, getDocumentDetails, updateRecordExtraction };
