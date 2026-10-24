import React from 'react';
import { ArrowRight, Bot, Mic, MessageSquareQuote, Sparkles, CheckCircle2 } from 'lucide-react';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';

export default function Screen3c_ModeSelect({ onSelectMode }) {
  const { sessionData, updateSession } = useKioskStore();
  const { t } = useTranslation();

  const handleChoose = (mode) => {
    updateSession({ intakeMode: mode });
    if (onSelectMode) {
      onSelectMode(mode);
    }
  };

  return (
    <section className="screen-card mode-select-screen">
      <div className="section-head">
        <div>
          <p className="eyebrow">05 • {t('intakeMethod', 'Intake Method')}</p>
          <h2>{t('chooseIntakeMethod', 'How would you like to describe your health concern?')}</h2>
          <p className="section-subtitle">
            {t('chooseIntakeMethodSub', 'Choose how you want to interact with AyushCare before meeting your doctor.')}
          </p>
        </div>
      </div>

      <div className="patient-type-grid" style={{ marginTop: '24px' }}>
        {/* Option 1: AI Interview Mode */}
        <button
          type="button"
          className="patient-type-card"
          onClick={() => handleChoose('interview')}
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          <span className="patient-type-icon" style={{ background: '#eaf8f5', color: '#044e42' }}>
            <Bot size={34} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>{t('aiInterviewMode', 'Take Part in AI Interview')}</strong>
              <span style={{ fontSize: '11px', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                Interactive
              </span>
            </div>
            <span>
              {t('aiInterviewModeDesc', 'Answer step-by-step clinical questions tailored to your symptoms using touch or voice responses.')}
            </span>
          </div>
          <ArrowRight size={22} style={{ color: '#044e42' }} />
        </button>

        {/* Option 2: Speak Mode */}
        <button
          type="button"
          className="patient-type-card"
          onClick={() => handleChoose('speak')}
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          <span className="patient-type-icon" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            <Mic size={34} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>{t('speakModeTitle', 'Explain Problem in Speak Mode')}</strong>
              <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                Voice-First
              </span>
            </div>
            <span>
              {t('speakModeDesc', 'Speak freely about your condition. Push-to-talk recording, live transcript, and on-screen keyboard editing.')}
            </span>
          </div>
          <ArrowRight size={22} style={{ color: '#1d4ed8' }} />
        </button>
      </div>

      <div style={{ marginTop: '32px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Sparkles size={22} style={{ color: '#044e42', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
          Both methods use Government Bhashini AI & Groq medical intelligence to generate your official clinical summary for the OPD clinician.
        </span>
      </div>
    </section>
  );
}
