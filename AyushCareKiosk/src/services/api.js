import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const unwrap = (response) => response.data?.data ?? response.data;
const request = async (config) => unwrap(await api(config));

export const kioskApi = {
  verifyPatient: (payload) => request({ method: 'POST', url: '/intake/auth/abha', data: payload }),
  lookupPatients: ({ abhaNumber, mobileNumber }) => request({ method: 'GET', url: '/intake/patients/lookup', params: { ...(abhaNumber ? { abha_number: abhaNumber } : {}), ...(mobileNumber ? { mobile_number: mobileNumber } : {}) } }),
  sendSosOtp: (payload) => request({ method: 'POST', url: '/intake/sos/send-otp', data: payload }),
  verifySosOtp: (payload) => request({ method: 'POST', url: '/intake/sos/verify-otp', data: payload }),
  emergencyIntake: (payload) => request({ method: 'POST', url: '/emergency/intake', data: payload }),
  systemHealth: () => request({ method: 'GET', url: '/intake/system/health', timeout: 10000 }),
  languages: () => request({ method: 'GET', url: '/language/languages', timeout: 15000 }),
  translate: (text, sourceLanguage, targetLanguage) => request({ method: 'POST', url: '/language/translate', data: { text, source_language: sourceLanguage, target_language: targetLanguage }, timeout: 20000 }),
  getSession: (sessionId) => request({ method: 'GET', url: `/intake/session/${sessionId}` }),
  routing: (sessionId, payload) => request({ method: 'PUT', url: `/intake/session/${sessionId}/routing`, data: payload }),
  updateLanguage: (sessionId, language) => request({ method: 'PUT', url: `/intake/session/${sessionId}/language`, data: { language } }),
  startDialogue: (sessionId) => request({ method: 'POST', url: `/intake/session/${sessionId}/dialogue/start` }),
  dialogueState: (sessionId) => request({ method: 'GET', url: `/intake/session/${sessionId}/dialogue/state` }),
  answer: (sessionId, payload) => request({ method: 'POST', url: `/intake/session/${sessionId}/dialogue/answer`, data: payload }),
  speech: (sessionId, questionId, language, blob) =>
    request({
      method: 'POST',
      url: `/intake/session/${sessionId}/dialogue/speech`,
      params: { question_id: questionId, language },
      data: blob,
      headers: { 'Content-Type': blob?.type || 'audio/webm' },
    }),
  audioIntake: (sessionId, language, blob) =>
    request({
      method: 'POST',
      url: `/intake/session/${sessionId}/audio-intake`,
      params: { language },
      data: blob,
      headers: { 'Content-Type': blob?.type || 'audio/webm' },
    }),
  speakModeSubmit: (sessionId, payload) =>
    request({
      method: 'POST',
      url: `/intake/session/${sessionId}/speak-mode-submit`,
      data: payload,
    }),
  tts: (sessionId, text, language) => request({ method: 'POST', url: `/intake/session/${sessionId}/dialogue/tts`, data: { text, language } }),
  departments: (pathway, hospitalId) => request({ method: 'GET', url: '/intake/departments', params: { pathway, ...(hospitalId ? { hospital_id: hospitalId } : {}) } }),
  doctors: (departmentId) => request({ method: 'GET', url: `/intake/departments/${departmentId}/doctors` }),
  vitals: (sessionId, payload) => request({ method: 'POST', url: `/intake/session/${sessionId}/vitals`, data: payload }),
  documents: (sessionId) => request({ method: 'GET', url: `/intake/session/${sessionId}/documents` }),
  summaryGenerate: (sessionId, languageOrOptions, includeAyush, conversationHistory) => {
    let payload = {};
    if (languageOrOptions && typeof languageOrOptions === 'object') {
      payload = {
        language: languageOrOptions.language || 'en',
        include_documents: languageOrOptions.include_documents !== false,
        include_ayush: Boolean(languageOrOptions.include_ayush),
        conversation_history: languageOrOptions.conversation_history || []
      };
    } else {
      payload = {
        language: languageOrOptions || 'en',
        include_documents: true,
        include_ayush: Boolean(includeAyush),
        conversation_history: conversationHistory || []
      };
    }
    return request({ method: 'POST', url: `/intake/session/${sessionId}/summary/generate`, data: payload });
  },
  summary: (sessionId) => request({ method: 'GET', url: `/intake/session/${sessionId}/summary` }),
  consentScopes: (sessionId) => request({ method: 'GET', url: `/intake/session/${sessionId}/consent/scopes` }),
  grantConsent: (sessionId, scopes) => request({ method: 'POST', url: `/intake/session/${sessionId}/consent`, data: scopes }),
  consentReceipt: (sessionId) => request({ method: 'GET', url: `/intake/session/${sessionId}/consent/receipt` }),
  token: (sessionId) => request({ method: 'POST', url: `/intake/session/${sessionId}/token` }),
  complete: (sessionId) => request({ method: 'POST', url: `/intake/session/${sessionId}/complete` }),
  cancel: (sessionId) => request({ method: 'POST', url: `/intake/session/${sessionId}/cancel` }),
  createPatientUploadQr: (sessionId) => request({ method: 'POST', url: `/intake/session/${sessionId}/patient-upload-qr` }),
};

export const getErrorMessage = (error) => error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.';
export default api;
