
import {
  DEFAULT_DEMO_TOKEN, SESSION_TTL_SECONDS, parseKioskQrReference,
  connectKioskSession, validateKioskSession, isKioskSessionActive,
  getRemainingSessionSeconds, disconnectKioskSession, endKioskSession,
  createDemoKioskSession, buildKioskQrValue, getDefaultDemoToken,
} from "./kioskSessionService";

export function createMobileSession({ patient = null, authType = null, sessionId = null, expiresInSeconds = 3600 } = {}) {
  const now = new Date();
  return {
    sessionId: sessionId || patient?.id || `mobile-${Date.now()}`,
    patient, authType, createdAt: now.toISOString(), lastActiveAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiresInSeconds * 1000).toISOString(),
    expiresInSeconds,
  };
}
export function touchMobileSession(session) {
  return session ? { ...session, lastActiveAt: new Date().toISOString() } : null;
}
export {
  DEFAULT_DEMO_TOKEN, SESSION_TTL_SECONDS, parseKioskQrReference, connectKioskSession,
  validateKioskSession, isKioskSessionActive, getRemainingSessionSeconds,
  disconnectKioskSession, endKioskSession, createDemoKioskSession, buildKioskQrValue, getDefaultDemoToken,
};
export function normalizeMobileSession(session) {
  if (!session) return null;
  const validation = validateKioskSession(session);
  return { ...session, isActive: validation.valid, remainingSeconds: validation.remainingSeconds || 0 };
}
export function getMobileSessionStatus(session) {
  const validation = validateKioskSession(session);
  return { connected: validation.valid, expired: validation.reason === "SESSION_EXPIRED", remainingSeconds: validation.remainingSeconds || 0 };
}
export async function connectMobileToKiosk(sessionReference) {
  return connectKioskSession(sessionReference);
}
export async function disconnectMobileFromKiosk(session) { return disconnectKioskSession(session); }
export async function endMobileKioskSession(session) { return endKioskSession(session); }
export default { createMobileSession, touchMobileSession, connectMobileToKiosk, disconnectMobileFromKiosk, endMobileKioskSession };
