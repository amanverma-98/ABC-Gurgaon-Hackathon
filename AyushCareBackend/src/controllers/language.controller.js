import { ApiResponse } from '../utilities/ApiResponse.js';
import { asyncHandler } from '../utilities/asyncHandler.js';
import { ApiError } from '../utilities/ApiError.js';
import { getSupportedLanguages, translate, tts, asr } from '../services/languageService.js';

export const languages = asyncHandler(async (req, res) => {
    const supported = await getSupportedLanguages();
    return res.json(new ApiResponse(200, supported, 'Supported languages loaded'));
});

export const translateText = asyncHandler(async (req, res) => {
    const { text, source_language, target_language } = req.body || {};
    if (!text || !source_language || !target_language) {
        throw new ApiError(400, 'text, source_language and target_language are required');
    }
    return res.json(new ApiResponse(
        200,
        await translate(text, source_language, target_language),
        'Translation generated through MediKiosk AI'
    ));
});

export const textToSpeech = asyncHandler(async (req, res) => {
    const { text, language = 'en', session_id } = req.body || {};
    if (!text) throw new ApiError(400, 'text is required');
    return res.json(new ApiResponse(
        200,
        await tts(text, language, session_id),
        'Speech generated through MediKiosk AI'
    ));
});

export const speechToText = asyncHandler(async (req, res) => {
    const { language = 'en', session_id, question_id = 'current' } = req.query || {};
    if (!req.body?.length) throw new ApiError(400, 'Audio body is required');
    return res.json(new ApiResponse(
        200,
        await asr(req.body, language, session_id, question_id, req.headers['content-type'] || 'audio/wav'),
        'Transcript generated through MediKiosk AI'
    ));
});
