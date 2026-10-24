import { Router } from 'express';
import { languages, translateText, textToSpeech, speechToText } from '../controllers/language.controller.js';
import { rawAudio } from '../middleware/rawAudio.middleware.js';
const router=Router();
router.get('/languages',languages);
router.post('/translate',translateText);
router.post('/tts',textToSpeech);
router.post('/asr',rawAudio,speechToText);
export default router;
