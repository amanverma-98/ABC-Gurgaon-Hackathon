import React, { useEffect, useState } from 'react';
import { Globe, Loader2, Check, Volume2, ArrowRight } from 'lucide-react';
import { kioskApi, getErrorMessage } from '../services/api';
import { languageService } from '../services/languageService';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';

export default function Screen3b_LanguageSelect() {
  const { sessionData, language, updateSession, setScreen } = useKioskStore();
  const { t } = useTranslation();
  const [languages, setLanguages] = useState([]);
  const [selected, setSelected] = useState(language || 'en');
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    languageService.list()
      .then((items) => {
        if (!active) return;
        setLanguages(items);
        if (!items.some((item) => item.code === selected)) {
          const english = items.find((item) => item.code === 'en');
          if (english) setSelected(english.code);
        }
      })
      .catch((e) => active && setError(getErrorMessage(e)))
      .finally(() => active && setLoadingLanguages(false));
    return () => { active = false; };
  }, []);

  const handleContinue = async () => {
    setSaving(true);
    setError('');
    try {
      updateSession({ interviewLanguage: selected });
      if (!sessionData.consultationId) throw new Error('Consultation session is not available.');
      setScreen(6);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="screen-card language-select-screen">
      <div className="section-head">
        <div>
          <p className="eyebrow">04 • {t('language')}</p>
          <h2>{t('selectInterviewLanguage') || 'Select Interview Language'}</h2>
        </div>
        <Globe size={42} className="language-select-icon" />
      </div>

      {loadingLanguages ? (
        <div className="loading-line"><Loader2 className="spin" /> {t('loading')}</div>
      ) : (
        <div className="language-select-grid">
          {languages.map((lang) => {
            const isSelected = selected === lang.code;
            const voiceSupported = lang.voice_capture !== false || lang.tts_available === true;
            return (
              <button key={lang.code} type="button" className={`language-select-card ${isSelected ? 'selected' : ''}`} onClick={() => { setSelected(lang.code); setError(''); }} aria-pressed={isSelected}>
                <div className="language-select-card-top">
                  <span className="language-select-native">{lang.native || lang.name}</span>
                  {isSelected && <div className="language-select-check"><Check size={16} /></div>}
                </div>
                <span className="language-select-name">{lang.name}</span>
                <div className="language-select-features">
                  <Volume2 size={12} />
                  <span>{voiceSupported ? t('voiceSupported','Voice supported') : t('textInput','Text input')}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      <button className="primary-btn" onClick={handleContinue} disabled={saving || loadingLanguages || !selected}>
        {saving ? <Loader2 className="spin" /> : <ArrowRight size={18} />}
        {saving ? t('loading') : t('continue')}
      </button>
    </section>
  );
}
