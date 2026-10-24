import { useEffect, useState } from 'react';
import { useKioskStore } from '../store/useKioskStore';
import { OFFICIAL_INDIAN_LANGUAGES } from '../constants/indianLanguages';
import { CORE_LOCALES } from '../loc/22';
import { remoteTranslationService } from '../services/remoteTranslationService';

const base = {
  welcome: 'Welcome to AyushCare', subtitle: 'Complete your health intake before meeting your clinician.',
  language: 'Choose your language', continue: 'Continue', back: 'Back', cancel: 'Cancel', listen: 'Listen',
  identity: 'Patient identification', identityHelp: 'Enter your details to begin your consultation.', verify: 'Verify',
  name: 'Full name', gender: 'Gender', dob: 'Date of birth', mobile: 'Mobile number', abha: 'ABHA number', aadhaar: 'Aadhaar number',
  consent: 'I consent to clinical intake and processing of the information I provide.',
  pathway: 'Choose your care pathway', ayurveda: 'Ayurveda', ayurvedaDesc: 'Ayurvedic assessment and care', allopathy: 'Allopathy', allopathyDesc: 'Modern clinical assessment and care',
  department: 'Department', doctor: 'Preferred doctor (optional)', anyDoctor: 'Any available clinician',
  interview: 'Health interview', interviewHelp: 'Answer the questions naturally. Your next question adapts to your answers.',
  typeAnswer: 'Type your answer', submit: 'Submit answer', listening: 'Listening…', start: 'Start interview',
  history: 'Health information', vitals: 'Vitals', documents: 'Medical documents', upload: 'Upload document',
  mobileUpload: 'Upload from your phone', mobileHelp: 'Scan the QR code with your phone to add medical records.', refresh: 'Refresh', skip: 'Skip for now',
  review: 'Review & consent', summary: 'AI health summary', confirm: 'Confirm & get token',
  token: 'Your OPD token', queue: 'You are now in the queue', done: 'Done', restart: 'Start new consultation',
  error: 'We could not complete that step. Please try again.', loading: 'Please wait…', sessionExpired: 'Your session has expired. Please start again.',
  emergency: 'Urgent attention may be needed. Please alert the clinical staff.', selected: 'Selected', noDocuments: 'No documents added.', noSummary: 'Summary will appear after the interview.',
  speak: 'Speak', holdToSpeak: 'Hold to speak', releaseToSend: 'Release to send',
  selectInterviewLanguage: 'Select Interview Language', selectInterviewLanguageHelp: 'Choose the language for your AI health interview. Questions and voice will be in your selected language.',
  selectDepartment: 'Select department', privacyConsent: 'Privacy & Clinical Consent', clinicalConsent: 'I consent to clinical intake and processing of the information I provide for my healthcare consultation.', required: 'Required', documentConsent: 'I consent to processing of medical documents that I choose to upload during this session.', startingSecureSession: 'Starting secure session…', privacyConsentShort: 'Privacy & consent', answersUsed: 'Your answers are used to prepare your clinical intake for the healthcare team.', clinicalConsentShort: 'I consent to clinical intake and processing of the information I provide.', beforeContinue: 'Before you continue', consentContinueHelp: 'You can skip document upload later if you do not have any records. Clinical intake consent is required to begin the health interview.', checkingConsent: 'Checking available consent scopes…',
  kioskTitle: 'Digital Patient Care Kiosk', voiceSupported:'Voice supported', textInput:'Text input',
  privateSecure: 'Private & secure',  printToken: 'Print Token',  mobileUploadShort: 'Mobile document upload', qrHelp: 'Scan this QR with your phone to open your AyushCare account and upload prescriptions or reports.', generating: 'Generating…', qrExpires: 'QR access expires automatically after 80 seconds.', securePatientAccess: 'Secure patient-account access', generateNewQr: 'Generate new QR', refreshSummary: 'Refresh Summary', consentRecorded: 'Consent recorded', consentRecordedHelp: 'Your clinical-intake consent was recorded before the AI health interview started.', documentProcessingEnabled: 'Medical document processing is also enabled for this session.', generateAiSummary: 'Generate AI Summary', retrySummary: 'Retry Summary', vitalsHelp: 'Review the basic information needed for safe triage. You may leave readings blank if the kiosk has no connected sensor.', systolic: 'Systolic BP', diastolic: 'Diastolic BP', pulse: 'Pulse', temperature: 'Temperature', enterReading: 'Enter reading', vitalsNote: 'Only enter readings you know. Connected sensor integration can be enabled later.',
 date: 'Date',
 languages22: '22 Indian languages', voiceTouch: 'Voice + touch',
 healthierIndia: 'Healthier India', strongerTomorrow: 'Stronger Tomorrow', muteAudio: 'Mute audio', enableAudio: 'Enable audio', stepOf: 'Step {current} of {total}', selectAllOptions: 'Select all options that apply.', tapToSpeak: 'Tap to speak', tapToStop: 'Tap to stop', tapToSpeakHint: 'Tap once to speak; tap again to send', tapToStopHint: 'Tap again to stop and send',
  patientTypeTitle: 'Are you a new or existing patient?', newPatient: 'New Patient', newPatientHelp: 'Register your basic details for a new visit.', existingPatient: 'Existing Patient', existingPatientHelp: 'Find your record using your ABHA number or registered mobile number.',
  selectLanguage: 'Select language', findPatient: 'Find patient', patientDetails: 'Patient details', optional: 'optional', abhaPlaceholder: '14 digit ABHA number', mobilePlaceholder: '10 digit mobile number', lookupHelp: 'Enter an ABHA number or registered mobile number. If several records match the mobile number, choose the correct ABHA record.', multiplePatients: 'Multiple patient records found', patient: 'Patient', age: 'Age', years: 'years', addressUnavailable: 'Address unavailable', fullNamePlaceholder: 'Full name', selectGender: 'Select gender', male: 'Male', female: 'Female', other: 'Other', address: 'Address', addressPlaceholder: 'House / street / locality', abhaRequiredNote: 'Your ABHA number is the canonical patient identifier used to connect your health records across participating healthcare services.', noPatientFound: 'No patient record was found. Please check the ABHA number or mobile number.',
};

const translations = {
  en: base,
  hi: { ...base, welcome:'आयुषकेयर में आपका स्वागत है', subtitle:'डॉक्टर से मिलने से पहले अपनी स्वास्थ्य जानकारी पूरी करें।', language:'अपनी भाषा चुनें', continue:'जारी रखें', back:'वापस', cancel:'रद्द करें', listen:'सुनें', identity:'रोगी की पहचान', identityHelp:'परामर्श शुरू करने के लिए अपनी जानकारी दर्ज करें।', verify:'सत्यापित करें', name:'पूरा नाम', gender:'लिंग', dob:'जन्म तिथि', mobile:'मोबाइल नंबर', abha:'आभा नंबर', aadhaar:'आधार नंबर', consent:'मैं क्लिनिकल जानकारी लेने और मेरे द्वारा दी गई जानकारी के प्रसंस्करण के लिए सहमत हूँ।', pathway:'अपनी उपचार पद्धति चुनें', ayurveda:'आयुर्वेद', ayurvedaDesc:'आयुर्वेदिक मूल्यांकन और देखभाल', allopathy:'एलोपैथी', allopathyDesc:'आधुनिक क्लिनिकल मूल्यांकन और देखभाल', department:'विभाग', doctor:'पसंदीदा डॉक्टर (वैकल्पिक)', anyDoctor:'कोई उपलब्ध चिकित्सक', interview:'स्वास्थ्य साक्षात्कार', interviewHelp:'प्रश्नों का स्वाभाविक रूप से उत्तर दें। अगला प्रश्न आपके उत्तर के अनुसार बदलेगा।', typeAnswer:'अपना उत्तर लिखें', submit:'उत्तर भेजें', listening:'सुन रहा है…', start:'साक्षात्कार शुरू करें', history:'स्वास्थ्य जानकारी', vitals:'महत्वपूर्ण संकेत', documents:'चिकित्सा दस्तावेज़', upload:'दस्तावेज़ अपलोड करें', mobileUpload:'फोन से अपलोड करें', mobileHelp:'चिकित्सा रिकॉर्ड जोड़ने के लिए फोन से QR कोड स्कैन करें।', refresh:'रिफ्रेश', skip:'अभी छोड़ें', review:'समीक्षा और सहमति', summary:'AI स्वास्थ्य सारांश', confirm:'पुष्टि करें और टोकन लें', token:'आपका ओपीडी टोकन', queue:'आप अब कतार में हैं', done:'पूर्ण', restart:'नया परामर्श शुरू करें', loading:'कृपया प्रतीक्षा करें…', emergency:'तत्काल चिकित्सकीय ध्यान आवश्यक हो सकता है। कृपया स्टाफ को सूचित करें।', selected:'चयनित', noDocuments:'कोई दस्तावेज़ नहीं जोड़ा गया।', noSummary:'साक्षात्कार के बाद सारांश दिखाई देगा।', speak:'बोलें', holdToSpeak:'बोलने के लिए दबाएं', releaseToSend:'भेजने के लिए छोड़ें', selectInterviewLanguage:'साक्षात्कार भाषा चुनें', selectInterviewLanguageHelp:'अपने AI स्वास्थ्य साक्षात्कार के लिए भाषा चुनें। प्रश्न और आवाज़ आपकी चुनी हुई भाषा में होंगे।' },
  bn: { ...base, welcome:'আয়ুষকেয়ারে স্বাগতম', language:'আপনার ভাষা বেছে নিন', continue:'চালিয়ে যান', back:'পিছনে', verify:'যাচাই করুন', name:'পূর্ণ নাম', mobile:'মোবাইল নম্বর', consent:'আমি ক্লিনিক্যাল তথ্য সংগ্রহ ও আমার দেওয়া তথ্য প্রক্রিয়াকরণের জন্য সম্মতি দিচ্ছি।', pathway:'আপনার চিকিৎসা পদ্ধতি বেছে নিন', ayurveda:'আয়ুর্বেদ', allopathy:'অ্যালোপ্যাথি', interview:'স্বাস্থ্য সাক্ষাৎকার', submit:'উত্তর জমা দিন', documents:'চিকিৎসা নথি', review:'পর্যালোচনা ও সম্মতি', confirm:'নিশ্চিত করুন ও টোকেন নিন', token:'আপনার OPD টোকেন', done:'সম্পন্ন', restart:'নতুন পরামর্শ শুরু করুন' },
  pa: { ...base, welcome:'ਆਯੁਸ਼ਕੇਅਰ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ', language:'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ', continue:'ਜਾਰੀ ਰੱਖੋ', back:'ਵਾਪਸ', verify:'ਤਸਦੀਕ ਕਰੋ', name:'ਪੂਰਾ ਨਾਮ', mobile:'ਮੋਬਾਈਲ ਨੰਬਰ', consent:'ਮੈਂ ਕਲੀਨਿਕਲ ਜਾਣਕਾਰੀ ਲੈਣ ਅਤੇ ਮੇਰੇ ਵੱਲੋਂ ਦਿੱਤੀ ਜਾਣਕਾਰੀ ਦੀ ਪ੍ਰਕਿਰਿਆ ਲਈ ਸਹਿਮਤ ਹਾਂ।', pathway:'ਆਪਣੀ ਇਲਾਜ ਪ੍ਰਣਾਲੀ ਚੁਣੋ', ayurveda:'ਆਯੁਰਵੇਦ', allopathy:'ਐਲੋਪੈਥੀ', interview:'ਸਿਹਤ ਇੰਟਰਵਿਊ', submit:'ਜਵਾਬ ਭੇਜੋ', documents:'ਮੈਡੀਕਲ ਦਸਤਾਵੇਜ਼', review:'ਸਮੀਖਿਆ ਅਤੇ ਸਹਿਮਤੀ', confirm:'ਪੁਸ਼ਟੀ ਕਰੋ ਅਤੇ ਟੋਕਨ ਲਵੋ', token:'ਤੁਹਾਡਾ OPD ਟੋਕਨ', done:'ਮੁਕੰਮਲ', restart:'ਨਵਾਂ ਪਰਾਮਰਸ਼ ਸ਼ੁਰੂ ਕਰੋ' },
};



const native = Object.fromEntries(OFFICIAL_INDIAN_LANGUAGES.map((l) => [l.code, l.native]));

export const useTranslation = () => {
  const language = useKioskStore((s) => s.language);
  const [, refresh] = useState(0);
  useEffect(() => remoteTranslationService.subscribeTranslations(() => refresh((v) => v + 1)), []);
  const local = CORE_LOCALES[language] || {};
  const dict = { ...base, ...local, ...(translations[language] || {}) };
  const t = (key, fallback) => {
    const value = dict[key] || fallback || base[key] || key;
    if (language === 'en' || !value) return value;
    const cached = remoteTranslationService.getCachedTranslation(value, language);
    if (cached) return cached;
    // Fire-and-cache the Bhashini translation without blocking the React render.
    void remoteTranslationService.ensureTranslation(value, language);
    return value;
  };
  return { t, language, isHindi: language === 'hi', languages: OFFICIAL_INDIAN_LANGUAGES, native };
};
export default useTranslation;
