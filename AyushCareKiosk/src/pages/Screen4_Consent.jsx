import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { kioskApi, getErrorMessage } from '../services/api';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';

export default function Screen4_Consent() {
  const { sessionData, updateSession, nextScreen } = useKioskStore();
  const { t } = useTranslation();

  const [clinicalIntake, setClinicalIntake] = useState(
    Boolean(sessionData.consent?.clinical_intake)
  );
  const [documentProcessing, setDocumentProcessing] = useState(
    sessionData.consent?.document_processing !== false
  );
  const [loading, setLoading] = useState(false);
  const [loadingScopes, setLoadingScopes] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionData.consultationId) {
      setLoadingScopes(false);
      return;
    }

    kioskApi.consentScopes(sessionData.consultationId)
      .then((scopes) => {
        updateSession({ consentScopes: scopes });
      })
      .catch(() => {
        // Scope discovery is informational; the grant endpoint is authoritative.
      })
      .finally(() => setLoadingScopes(false));
  }, [sessionData.consultationId, updateSession]);

  const grant = async () => {
    if (!clinicalIntake || !sessionData.consultationId) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        clinical_intake: true,
        document_processing: documentProcessing,
        his_abdm_sharing: false,
      };

      const receipt = await kioskApi.grantConsent(
        sessionData.consultationId,
        payload
      );

      updateSession({
        consent: payload,
        consentReceipt: receipt,
      });

      // Health Interview is the next screen. It will start the AI
      // conversation only after this successful consent call.
      nextScreen();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="screen-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">03 • {t('consent')}</p>
          <h2>{t('privacyConsentShort','Privacy & consent')}</h2>
        </div>
        <ShieldCheck size={42} />
      </div>

      <div className="review-grid">
        <div>
          <div className="info-strip">
            <ShieldCheck size={20} />
            <span>
              {t('answersUsed','Your answers are used to prepare your clinical intake for the healthcare team.')}
            </span>
          </div>

          <div className="consent-card">
            <label className="consent-line">
              <input
                type="checkbox"
                checked={clinicalIntake}
                onChange={(e) => setClinicalIntake(e.target.checked)}
              />
              <span>
                {t('clinicalConsentShort','I consent to clinical intake and processing of the information I provide.')}
              </span>
            </label>

            <label className="consent-line">
              <input
                type="checkbox"
                checked={documentProcessing}
                onChange={(e) => setDocumentProcessing(e.target.checked)}
              />
              <span>
                {t('documentConsent','I consent to processing of medical documents that I choose to upload during this session.')}
              </span>
            </label>
          </div>
        </div>

        <div className="consent-card">
          <h3>{t('beforeContinue','Before you continue')}</h3>
          <p>
            {t('consentContinueHelp','You can skip document upload later if you do not have any records. Clinical intake consent is required to begin the health interview.')}
          </p>
          {loadingScopes && (
            <small className="muted">{t('checkingConsent','Checking available consent scopes…')}</small>
          )}
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <button
        className="primary-btn wide"
        disabled={!clinicalIntake || loading || !sessionData.consultationId}
        onClick={grant}
      >
        {loading ? (
          <>
            <Loader2 className="spin" />
            {t('loading')}
          </>
        ) : (
          t('continue')
        )}
      </button>
    </section>
  );
}
