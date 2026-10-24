import AiServiceGateway from './aiService.js';
import { ApiError } from '../utilities/ApiError.js';

/**
 * Language capabilities are owned by the Python ML service.
 *
 * This compatibility list is only used when an older AI deployment does not
 * expose the language-catalog endpoint yet. Frontends must not use this list
 * directly; they should consume GET /api/v1/language/languages from Node.
 */
const COMPATIBILITY_LANGUAGES = [
    ['en','English','English','validated',true,true],
    ['hi','Hindi','हिन्दी','validated',true,true],
    ['bn','Bengali','বাংলা','validated',true,true],
    ['ta','Tamil','தமிழ்','validated',true,true],
    ['te','Telugu','తెలుగు','validated',true,true],
    ['mr','Marathi','मराठी','pilot',true,true],
    ['gu','Gujarati','ગુજરાતી','pilot',true,true],
    ['kn','Kannada','ಕನ್ನಡ','pilot',true,true],
    ['ml','Malayalam','മലയാളം','pilot',true,true],
    ['pa','Punjabi','ਪੰਜਾਬੀ','pilot',true,true],
    ['as','Assamese','অসমীয়া','planned',false,false],
    ['brx','Bodo','बड़ो','planned',false,false],
    ['doi','Dogri','डोगरी','planned',false,false],
    ['ks','Kashmiri','कॉशુર','planned',false,false],
    ['kok','Konkani','कोंकणी','planned',false,false],
    ['mai','Maithili','मैथिली','planned',false,false],
    ['mni','Manipuri','মৈতৈলোন্','planned',false,false],
    ['ne','Nepali','नेपाली','planned',false,false],
    ['or','Odia','ଓଡ଼ିଆ','planned',false,false],
    ['sa','Sanskrit','संस्कृतम्','planned',false,false],
    ['sat','Santali','ᱥᱟᱱᱛᱟᱲᱤ','planned',false,false],
    ['sd','Sindhi','سنڌી','planned',false,false],
    ['ur','Urdu','اردو','planned',false,false]
].map(([code,name,native,status,voice_capture,tts_available]) => ({
    code, name, native, name_en:name, name_native:native, bcp47:`${code}-IN`,
    status, voice_capture, tts_available
}));

const unwrap = (value) => value?.data ?? value;

export const getSupportedLanguages = async () => {
    try {
        const result = await AiServiceGateway.getSupportedLanguages();
        const data = unwrap(result);
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.languages)) return data.languages;
    } catch (error) {
        // Keep compatibility with the current deployed AI service until its
        // language-catalog endpoint is available.
        if (error?.statusCode && ![404, 405].includes(error.statusCode)) throw error;
    }
    return COMPATIBILITY_LANGUAGES;
};

export const assertSupportedLanguage = async (language) => {
    const code = String(language || '').trim().toLowerCase();
    if (!code) throw new ApiError(400, 'language is required');
    const supported = await getSupportedLanguages();
    const found = supported.find((item) => String(item?.code || '').toLowerCase() === code);
    if (!found) throw new ApiError(400, `Unsupported interview language: ${code}`);
    return found;
};

/**
 * Legacy translation endpoint.
 *
 * Translation credentials and provider execution are intentionally owned by
 * Python/Bhashini. The Node route only proxies to the AI service.
 */
export const translate = async (text, sourceLanguage, targetLanguage) => {
    if (!text || !sourceLanguage || !targetLanguage) {
        throw new ApiError(400, 'text, source_language and target_language are required');
    }
    return AiServiceGateway.translate(text, sourceLanguage, targetLanguage);
};

/**
 * Legacy TTS endpoint. Provider execution happens in Python.
 * A consultation/session is preferred because it preserves the patient's
 * selected language and consent context.
 */
export const tts = async (text, language, sessionId) => {
    if (!text) throw new ApiError(400, 'text is required');
    if (!sessionId) throw new ApiError(400, 'session_id is required for server-side TTS');
    return AiServiceGateway.tts(sessionId, text, language || 'en');
};

/**
 * Legacy ASR endpoint. New clients should use the consultation dialogue
 * endpoint so the AI service can maintain clinical interview state.
 */
export const asr = async (audioBuffer, language, sessionId, questionId = 'current', mimeType = 'audio/wav') => {
    if (!audioBuffer?.length) throw new ApiError(400, 'Audio body is required');
    if (!sessionId) throw new ApiError(400, 'session_id is required for server-side ASR');
    return AiServiceGateway.submitSpeech(sessionId, questionId, language || 'en', audioBuffer, mimeType);
};
