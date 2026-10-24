import { ApiError } from '../utilities/ApiError.js';

const normalizeAiPathway = (value) => String(value || 'general').toLowerCase() === 'ayurveda' ? 'ayush' : String(value || 'general').toLowerCase();

const baseUrl = () => {
    const configured = String(process.env.MEDIKIOSK_AI_BASE_URL || '').replace(/\/$/, '');
    if (!configured) return String(process.env.MEDIKIOSK_AI_FALLBACK_URL || '').replace(/\/$/, '');
    try {
        const parsed = new URL(configured);
        const backendPort = String(process.env.PORT || '8001');
        const sameBackend = ['localhost', '127.0.0.1'].includes(parsed.hostname) && (parsed.port || '80') === backendPort;
        if (sameBackend) {
            return String(process.env.MEDIKIOSK_AI_FALLBACK_URL || '').replace(/\/$/, '');
        }
    } catch {}
    return configured;
};

const request = async (path, options = {}) => {
    const base = baseUrl();
    if (!base) throw new ApiError(503, 'MediKiosk AI service is not configured');
    const headers = { ...(options.headers || {}) };
    if (process.env.MEDIKIOSK_AI_API_KEY) headers.Authorization = `Bearer ${process.env.MEDIKIOSK_AI_API_KEY}`;

    const controller = new AbortController();
    const timeoutMs = Number(options.timeoutMs || process.env.MEDIKIOSK_AI_TIMEOUT_MS || 90000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
        response = await fetch(`${base}${path}`, { ...options, headers, signal: controller.signal });
    } catch (error) {
        clearTimeout(timer);
        const message = error?.name === 'AbortError'
            ? `MediKiosk AI request timed out after ${timeoutMs}ms`
            : error?.message || 'Network error';
        throw new ApiError(502, 'Unable to reach MediKiosk AI service', [message]);
    }
    clearTimeout(timer);

    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!response.ok) {
        throw new ApiError(
            response.status >= 500 ? 502 : response.status,
            data?.message || data?.detail || 'MediKiosk AI request failed',
            [data]
        );
    }
    return data;
};

const json = (path, body, method = 'POST') => request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

const AiServiceGateway = {
    health: () => request('/api/v1/health').catch(() => request('/health')),
    createSession: (patientId, facilityId = 'unassigned', language = 'en', intakePathway = 'general') =>
        json('/api/v1/sessions', { patient_id: patientId, facility_id: facilityId, language, intake_pathway: normalizeAiPathway(intakePathway) }),
    getSession: (sessionId) => request(`/api/v1/sessions/${sessionId}`),
    deleteSession: (sessionId) => request(`/api/v1/sessions/${sessionId}`, { method: 'DELETE' }),
    updateLanguage: (sessionId, language) => json(`/api/v1/sessions/${sessionId}/language`, { language }, 'PUT'),
    getSupportedLanguages: () => request('/api/v1/languages'),
    translate: (text, sourceLanguage, targetLanguage) =>
        json('/api/v1/translate', {
            text,
            source_language: sourceLanguage,
            target_language: targetLanguage
        }),
    translateBatch: (texts, sourceLanguage, targetLanguage) =>
        json('/api/v1/translate-batch', {
            texts,
            source_language: sourceLanguage,
            target_language: targetLanguage
        }),

    startConversation: (sessionId, intakePathway) => json(`/api/v1/sessions/${sessionId}/conversation/start`, { intake_pathway: normalizeAiPathway(intakePathway) }),
    getConversationState: (sessionId) => request(`/api/v1/sessions/${sessionId}/conversation/state`),
    submitConversationAnswer: (sessionId, questionId, answer, inputMode = 'text', confidence = 1) =>
        json(`/api/v1/sessions/${sessionId}/conversation/answer`, { question_id: questionId, answer, input_mode: inputMode, confidence }),
    submitSpeech: async (sessionId, questionId, language, buffer, mimeType = 'audio/wav') => {
        const cleanMime = String(mimeType || 'audio/wav').split(';')[0].trim().toLowerCase();
        const extension = cleanMime.includes('webm') ? 'webm'
            : cleanMime.includes('ogg') ? 'ogg'
            : cleanMime.includes('mp4') ? 'm4a'
            : cleanMime.includes('wav') ? 'wav'
            : 'webm';
        const form = new FormData();
        form.append('audio', new Blob([buffer], { type: cleanMime }), `speech.${extension}`);
        return request(`/api/v1/sessions/${sessionId}/conversation/speech?question_id=${encodeURIComponent(questionId)}&language=${encodeURIComponent(language)}`, { method: 'POST', body: form });
    },
    transcribeAudio: async (buffer, language = 'auto', mimeType = 'audio/webm') => {
        const cleanMime = String(mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
        const extension = cleanMime.includes('webm') ? 'webm'
            : cleanMime.includes('ogg') ? 'ogg'
            : cleanMime.includes('mp4') ? 'm4a'
            : cleanMime.includes('wav') ? 'wav'
            : 'webm';
        const form = new FormData();
        form.append('audio', new Blob([buffer], { type: cleanMime }), `audio.${extension}`);
        return request(`/api/v1/transcribe?language=${encodeURIComponent(language || 'auto')}`, {
            method: 'POST',
            body: form,
            timeoutMs: 60000,
        });
    },
    tts: (sessionId, text, language = 'en') => json(`/api/v1/sessions/${sessionId}/conversation/tts`, { text, language }),
    uploadDocument: async (sessionId, buffer, mimeType, fileName, documentType = 'medical_document') => {
        let safeName = String(fileName || 'document.jpg');
        const lowerMime = String(mimeType || '').toLowerCase();
        if (lowerMime.includes('pdf') && !safeName.toLowerCase().endsWith('.pdf')) {
            safeName += '.pdf';
        } else if (lowerMime.includes('png') && !safeName.toLowerCase().endsWith('.png')) {
            safeName += '.png';
        } else if (lowerMime.includes('webp') && !safeName.toLowerCase().endsWith('.webp')) {
            safeName += '.webp';
        } else if ((lowerMime.includes('jpeg') || lowerMime.includes('jpg')) && !safeName.toLowerCase().match(/\.jpe?g$/)) {
            safeName += '.jpg';
        }
        const form = new FormData();
        form.append('file', new Blob([buffer], { type: mimeType }), safeName);
        form.append('document_type', documentType);
        return request(`/api/v1/sessions/${sessionId}/documents/upload`, {
            method: 'POST',
            body: form,
            timeoutMs: Number(process.env.MEDIKIOSK_AI_OCR_TIMEOUT_MS || 180000)
        });
    },
    listDocuments: (sessionId) => request(`/api/v1/sessions/${sessionId}/documents`),
    verifyDocumentEntity: (sessionId, documentId, entityId, status = 'verified') => request(`/api/v1/sessions/${sessionId}/documents/${documentId}/entities/${entityId}/verify?status=${encodeURIComponent(status)}`, { method: 'PUT' }),
    generateSummary: (sessionId, language = 'en', includeDocuments = true, includeAyush = false, conversationHistory = null) => {
        let langStr = 'en';
        if (typeof language === 'string') {
            langStr = language.toLowerCase().split('-')[0] || 'en';
        } else if (language && typeof language === 'object') {
            langStr = String(language.language || 'en').toLowerCase().split('-')[0] || 'en';
        }
        const payload = { language: langStr, include_documents: includeDocuments !== false, include_ayush: Boolean(includeAyush) };
        if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            payload.conversation_history = conversationHistory;
        }
        return request(`/api/v1/sessions/${sessionId}/summary/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            timeoutMs: 120000
        });
    },
    getSummary: (sessionId) => request(`/api/v1/sessions/${sessionId}/summary`),
    editSummarySection: (sessionId, sectionId, editedBody, editReason) => json(`/api/v1/sessions/${sessionId}/summary/sections/${sectionId}`, { edited_body: editedBody, edit_reason: editReason }, 'PUT'),
    getConsentScopes: (sessionId) => request(`/api/v1/sessions/${sessionId}/consent/scopes`),
    grantConsent: (sessionId, scopes) => json(`/api/v1/sessions/${sessionId}/consent`, scopes),
    getConsentReceipt: (sessionId) => request(`/api/v1/sessions/${sessionId}/consent/receipt`),
    withdrawConsent: (sessionId, scopeId) => json(`/api/v1/sessions/${sessionId}/consent/withdraw`, { scope_id: scopeId }),
    fhirPreview: (sessionId) => request(`/api/v1/sessions/${sessionId}/fhir/preview`)
};

export default AiServiceGateway;
