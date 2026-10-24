
import { apiRequest, unwrapApiResponse } from "./apiClient";

export const SESSION_TTL_SECONDS = 30 * 60;
export const DEFAULT_DEMO_TOKEN = "";

export function parseKioskQrReference(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.searchParams.get("pairing_token") || url.searchParams.get("token") || raw;
  } catch {
    return raw;
  }
}

export async function connectKioskSession(sessionReference) {
  const token = parseKioskQrReference(sessionReference);
  if (!token) return { success: false, error: "INVALID_SESSION_REFERENCE", message: "No kiosk pairing token was provided." };

  const payload = unwrapApiResponse(await apiRequest(`/mobile/kiosk-session/pair/${encodeURIComponent(token)}`));
  return {
    success: true,
    session: {
      id: payload.id,
      sessionId: payload.id,
      sessionToken: payload.pairing_token,
      pairingToken: payload.pairing_token,
      kioskName: payload.kiosk_id,
      terminalId: payload.kiosk_id,
      consultationId: payload.consultation_id,
      patient: payload.abha_number ? {
        id: payload.patient_id || null,
        abha_number: payload.abha_number,
        patientId: payload.abha_number,
        full_name: payload.full_name || "",
        gender: payload.gender || "",
        date_of_birth: payload.date_of_birth || null,
        mobile_number: payload.mobile_number || "",
        address: payload.address || "",
      } : null,
      department: payload.department_name || null,
      language: payload.language || null,
      status: payload.is_active ? "CONNECTED" : "DISCONNECTED",
      startedAt: payload.created_at,
      connectedAt: new Date().toISOString(),
      expiresAt: payload.expires_at,
      expiresInSeconds: Math.max(0, Math.ceil((new Date(payload.expires_at).getTime() - Date.now()) / 1000)),
    },
    kiosk: payload,
  };
}

export function validateKioskSession(session) {
  if (!session?.id || session.status !== "CONNECTED") return { valid: false, reason: "SESSION_NOT_CONNECTED" };
  const expiry = new Date(session.expiresAt || 0).getTime();
  if (!expiry || expiry <= Date.now()) return { valid: false, reason: "SESSION_EXPIRED" };
  return { valid: true, reason: null, remainingSeconds: Math.ceil((expiry - Date.now()) / 1000) };
}
export const isKioskSessionActive = (session) => validateKioskSession(session).valid;
export const getRemainingSessionSeconds = (session) => validateKioskSession(session).remainingSeconds || 0;

export async function updateKioskSessionLanguage(sessionId, language) {
  if (!sessionId || !language) throw new Error("Kiosk session and language are required.");
  return unwrapApiResponse(await apiRequest(`/mobile/kiosk-session/${encodeURIComponent(sessionId)}/language`, {
    method: "PUT",
    body: JSON.stringify({ language }),
  }));
}

export async function syncKioskUpload(sessionId) {
  if (!sessionId) throw new Error("Kiosk session is required.");
  const payload = unwrapApiResponse(await apiRequest(`/mobile/kiosk-session/${encodeURIComponent(sessionId)}/sync`, {
    method: "POST",
  }));
  return payload;
}

export async function disconnectKioskSession(session) {
  return { success: true, session: { ...session, status: "DISCONNECTED" } };
}
export async function endKioskSession(session) { return disconnectKioskSession(session); }
export function createDemoKioskSession() { return null; }
export function buildKioskQrValue(sessionToken = "") { return String(sessionToken || ""); }
export function getDefaultDemoToken() { return ""; }
export default {
  SESSION_TTL_SECONDS, DEFAULT_DEMO_TOKEN, parseKioskQrReference, connectKioskSession,
  validateKioskSession, isKioskSessionActive, getRemainingSessionSeconds,
  syncKioskUpload, updateKioskSessionLanguage, disconnectKioskSession, endKioskSession, createDemoKioskSession, buildKioskQrValue, getDefaultDemoToken,
};
