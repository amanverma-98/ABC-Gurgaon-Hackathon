import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useKioskStore } from '../../store/useKioskStore';
import { useTranslation } from '../../hooks/useTranslation';

import audioService from '../../services/audioService';

export default function Footer({ showContinue = false }) {
  const { currentScreen, prevScreen } = useKioskStore();
  const { t } = useTranslation();

  const handleBack = () => {
    audioService.stop();
    prevScreen();
  };

  return (
    <footer className="kiosk-footer">
      <div className="footer-inner">
        <button
          className="secondary-btn footer-back"
          onClick={handleBack}
          disabled={currentScreen === 1}
          aria-label={t('back')}
        >
          <ArrowLeft size={22} />
          <span>{t('back')}</span>
        </button>

        <div className="footer-progress" aria-label={`Step ${currentScreen} of 10`}>
          <div className="footer-progress-dots" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <span key={index} className={index + 1 <= currentScreen ? 'active' : ''} />
            ))}
          </div>
          <span>{t('stepOf','Step {current} of {total}').replace('{current}', String(currentScreen)).replace('{total}', '10')}</span>
        </div>

        <div className="footer-spacer" />
      </div>
    </footer>
  );
}
