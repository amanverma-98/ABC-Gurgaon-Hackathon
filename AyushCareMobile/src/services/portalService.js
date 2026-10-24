import { apiRequest, unwrapApiResponse } from "./apiClient";

export async function getPortalDashboard() {
  return unwrapApiResponse(await apiRequest("/mobile/portal/dashboard"));
}

export async function getPortalVisits() {
  return unwrapApiResponse(await apiRequest("/mobile/portal/visits"));
}

export async function getPortalDocuments() {
  return unwrapApiResponse(await apiRequest("/mobile/portal/documents"));
}

export async function getPortalProfile() {
  return unwrapApiResponse(await apiRequest("/mobile/portal/profile"));
}

export async function getPortalPrivacySettings() {
  return unwrapApiResponse(await apiRequest("/mobile/portal/privacy-settings"));
}

export async function updatePortalPrivacySettings(payload) {
  return unwrapApiResponse(
    await apiRequest("/mobile/portal/privacy-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export function normalizePortalDocument(doc) {
  const type = doc?.document_type || "other";
  const status = String(doc?.status || "pending").toUpperCase();
  const fileUrl = doc?.download_url || doc?.document_url || doc?.url || (doc?.file_path_hash?.startsWith("http") ? doc.file_path_hash : null);
  const isPdf = Boolean(doc?.source_mime_type?.includes("pdf") || fileUrl?.toLowerCase().includes(".pdf"));
  const rawTitle = doc?.title || doc?.fileName || doc?.file_path_hash?.split("/").pop() || "Medical document";
  const title = rawTitle.includes("?") ? rawTitle.split("?")[0] : rawTitle;

  return {
    ...doc,
    id: doc?.id,
    title,
    type,
    typeLabel: type === "lab_report" ? "Lab Report" : type === "discharge_summary" ? "Discharge Summary" : type === "prescription" ? "Prescription" : "Medical Record",
    status: status === "COMPLETED" ? "PROCESSED" : status,
    createdAt: doc?.created_at,
    uploadedAt: doc?.created_at,
    download_url: fileUrl,
    url: fileUrl,
    document_url: fileUrl,
    pages: fileUrl ? [{
      id: `${doc.id}-page-1`,
      fileName: title,
      previewUrl: fileUrl,
      imageUrl: fileUrl,
      dataUrl: fileUrl,
      mimeType: doc?.source_mime_type || (isPdf ? "application/pdf" : "image/jpeg"),
    }] : [],
    extractedInformation: doc?.extracted_data || {},
  };
}

export async function getPortalPrivacyContext() {
  return unwrapApiResponse(await apiRequest('/mobile/portal/privacy-context'));
}

export async function updatePortalPrivacyRule(payload) {
  return unwrapApiResponse(await apiRequest('/mobile/portal/privacy-rules', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }));
}

export async function updatePortalProfile(payload) {
  return unwrapApiResponse(
    await apiRequest("/mobile/portal/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

