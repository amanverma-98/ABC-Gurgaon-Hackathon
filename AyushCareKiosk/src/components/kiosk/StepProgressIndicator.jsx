import React from 'react';
import { useKioskStore } from '../../store/useKioskStore';
import { useTranslation } from '../../hooks/useTranslation';

const TOTAL_STEPS = 9;

const STEP_LABELS = {
  en: [
    'Welcome',
    'Verification',
    'Department',
    'Consent',
    'Health Interview',
    'Vitals',
    'Documents',
    'Review',
    'Token',
  ],
  hi: [
    'स्वागत',
    'सत्यापन',
    'विभाग',
    'सहमति',
    'स्वास्थ्य साक्षात्कार',
    'महत्वपूर्ण संकेत',
    'दस्तावेज़',
    'समीक्षा',
    'टोकन',
  ],
};

STEP_LABELS.pa = [
  'ਸੁਆਗਤ',
  'ਪ੍ਰਮਾਣਿਕਤਾ',
  'ਵਿਭਾਗ',
  'ਸਹਿਮਤੀ',
  'ਸਿਹਤ ਇੰਟਰਵਿਊ',
  'ਵਾਇਟਲ',
  'ਦਸਤਾਵੇਜ਼',
  'ਸਮੀਖਿਆ',
  'ਟੋਕਨ',
];

STEP_LABELS.bn = [
  'স্বাগতম',
  'যাচাইকরণ',
  'বিভাগ',
  'সম্মতি',
  'স্বাস্থ্য সাক্ষাৎকার',
  'ভাইটাল',
  'নথি',
  'পর্যালোচনা',
  'টোকেন',
];

const StepProgressIndicator = () => {
  const { currentScreen, language } = useKioskStore();
  const { t } = useTranslation();

  if (currentScreen === 1 || currentScreen === 9) return null;

  const progress = Math.min(
    100,
    Math.max(0, ((currentScreen - 1) / (TOTAL_STEPS - 1)) * 100)
  );

  const labels = STEP_LABELS[language] || STEP_LABELS.en;

  return (
    <div className="kiosk-progress">
      <div className="kiosk-progress-inner">
        <div className="kiosk-progress-meta">
          <span>{labels[currentScreen - 1] || 'Progress'}</span>
          <span>
            {t('nav.step', 'Step')} {currentScreen} {t('nav.of', 'of')} {TOTAL_STEPS}
          </span>
        </div>
        <div
          className="kiosk-progress-track"
          aria-label={`Step ${currentScreen} of ${TOTAL_STEPS}`}
        >
          <div
            className="kiosk-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default StepProgressIndicator;
