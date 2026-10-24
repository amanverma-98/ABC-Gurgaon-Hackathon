import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Smartphone, Clock3, ShieldCheck } from 'lucide-react';
import { kioskApi, getErrorMessage } from '../services/api';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';

const QR_SECONDS = 80;

export default function Screen8_QRUpload() {
  const { sessionData, updateSession, nextScreen } = useKioskStore();
  const { t } = useTranslation();
  const [qr, setQr] = useState(sessionData.patientUploadQr || null);
  const [docs, setDocs] = useState(sessionData.documents || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(QR_SECONDS);
  const advanced = useRef(false);
  const docsRef = useRef(docs);
  const processedCountRef = useRef(0);

  useEffect(() => { docsRef.current = docs; }, [docs]);

  const makeQr = useCallback(async () => {
    if (!sessionData.consultationId) {
      setError('Clinical session is unavailable.');
      return;
    }
    setLoading(true); setError('');
    try {
      const data = await kioskApi.createPatientUploadQr(sessionData.consultationId);
      setQr(data);
      setSeconds(Math.min(QR_SECONDS, Number(data?.expires_in_seconds) || QR_SECONDS));
      advanced.current = false;
      updateSession({ patientUploadQr: data });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally { setLoading(false); }
  }, [sessionData.consultationId, updateSession]);

  // QR creation is intentionally triggered after the first render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!qr) void makeQr(); }, [makeQr, qr]);

  const refreshDocs = useCallback(async () => {
    if (!sessionData.consultationId) return;
    try {
      const state = await kioskApi.getSession(sessionData.consultationId);
      setError('');
      const list = Array.isArray(state?.documents) ? state.documents : [];
      setDocs(list);
      docsRef.current = list;
      const completedCount = list.filter((d) => String(d.status).toLowerCase() === 'completed').length;
      if (completedCount > processedCountRef.current && sessionData.consultationId) {
        processedCountRef.current = completedCount;
        try {
          const history = (sessionData.questionHistory || []).map((item) => ({
            question_id: item.question?.question_id || '',
            question: item.question?.prompt || item.question?.prompt_local || '',
            answer: item.answer || '',
            input_mode: item.input_mode || 'text',
          }));
          const summary = await kioskApi.summaryGenerate(sessionData.consultationId, {
            language: sessionData.language || 'en',
            include_documents: true,
            include_ayush: sessionData.pathway === 'ayurveda',
            conversation_history: history,
          });
          updateSession({ documents: list, liveDocumentSummary: summary });
        } catch { updateSession({ documents: list }); }
      }
    } catch (e) {
      setError(`Document status unavailable: ${getErrorMessage(e)}`);
    }
  }, [sessionData.consultationId, sessionData.language, sessionData.pathway, sessionData.questionHistory, updateSession]);

  useEffect(() => {
    if (!sessionData.consultationId) return;
    const timer = setInterval(refreshDocs, 2500);
    return () => clearInterval(timer);
  }, [refreshDocs, sessionData.consultationId]);

  useEffect(() => {
    if (!qr) return;
    const timer = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          clearInterval(timer);
          if (!advanced.current) {
            advanced.current = true;
            updateSession({ documents: docsRef.current, patientUploadQr: null });
            nextScreen();
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qr, nextScreen, updateSession]);

  const continueNow = () => {
    if (advanced.current) return;
    advanced.current = true;
    updateSession({ documents: docsRef.current, patientUploadQr: null });
    nextScreen();
  };

  const mobileBase = import.meta.env.VITE_MOBILE_PAIR_URL || window.location.origin;
  const token = qr?.token || '';
  const qrUrl = token ? `${mobileBase.replace(/\/$/, '')}?qr_token=${encodeURIComponent(token)}` : '';
  const qrImage = qrUrl ? `https://quickchart.io/qr?size=280&text=${encodeURIComponent(qrUrl)}` : '';

  return (
    <section className="screen-card qr-screen">
      <div className="qr-timebar">
        <span><Clock3 size={18}/> {t('mobileUploadShort','Mobile document upload')}</span>
        <strong>{seconds}s</strong>
      </div>

      <p className="eyebrow">06 • {t('documents')}</p>
      <h2>{t('mobileUpload')}</h2>
      <p>{t('qrHelp','Scan this QR with your phone to open your AyushCare account and upload prescriptions or reports.')}</p>

      <div className="qr-layout">
        <div className="qr-placeholder">
          {qrImage ? <img className="qr-image" src={qrImage} alt="Patient document upload QR code" /> : <Loader2 className="spin" size={32} />}
          <strong>{qr?.abha_number || t('generating','Generating…')}</strong>
          <small>{t('qrExpires','Mobile session remains valid for 10 minutes. Kiosk countdown:')} {seconds}s</small>
          <div className="qr-secure-note"><ShieldCheck size={16}/> {t('securePatientAccess','Secure patient-account access')}</div>

          {qrUrl && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                onClick={() => {
                  navigator.clipboard?.writeText(qrUrl);
                }}
              >
                Copy Link
              </button>
              <a
                href={qrUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-btn"
                style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '10px', textDecoration: 'none', color: '#044e42', display: 'inline-flex', alignItems: 'center' }}
              >
                Open Mobile ↗
              </a>
            </div>
          )}
        </div>

        <div className="document-panel">
          <div className="panel-title">
            <span>{t('documents')}</span>
            <button className="icon-button" onClick={refreshDocs}><RefreshCw size={17}/></button>
          </div>
          {docs.length === 0 ? <p className="muted">{t('noDocuments')}</p> : docs.map((d) => (
            <div className="doc-row" key={d.id}>
              <CheckCircle2 size={18}/><span>{d.document_type || d.file_path_hash?.split('/').pop() || 'Document'}</span><small>{d.status}</small>
            </div>
          ))}
          <button className="secondary-btn" onClick={makeQr} disabled={loading}>
            {loading ? <Loader2 className="spin"/> : <Smartphone size={18}/>} {t('generateNewQr','Generate new QR')}
          </button>
        </div>
      </div>

      <button className="primary-btn wide" onClick={continueNow}>
        {docs.length ? t('continue') : t('skip')}
      </button>
      {error && <div className="error-box">{error}</div>}
    </section>
  );
}
