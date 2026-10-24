import React,{useEffect,useState} from 'react';
import { FileText, ShieldCheck, Loader2, RotateCw } from 'lucide-react';
import { kioskApi,getErrorMessage } from '../services/api';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';

export default function Screen9_ReviewSubmission(){
  const {sessionData,language,updateSession,nextScreen}=useKioskStore();
  const {t}=useTranslation();
  const [summary,setSummary]=useState(sessionData.summary);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  const generateSummary = () => {
    if(!sessionData.consultationId)return;
    if(!sessionData.consent?.clinical_intake){
      setError('Clinical intake consent is required before generating the summary.');
      return;
    }

    // Build conversation history from the kiosk's question history so the
    // summary model receives all AI interview responses even if the proxy
    // layer did not persist them to the same session store.
    const conversationHistory = (sessionData.questionHistory || []).map(item => ({
      question_id: item.question?.question_id || '',
      question: item.question?.prompt || item.question?.prompt_local || '',
      answer: item.answer || '',
      input_mode: item.input_mode || 'text',
    }));
    if (!conversationHistory.length && sessionData.intakeMode === 'speak') {
      const speechTranscript = sessionData.transcripts?.[0]?.text || sessionData.patientTranscript || '';
      if (speechTranscript.trim()) {
        conversationHistory.push({
          question_id: 'q-chief-complaint',
          question: 'Please describe the health concerns and symptoms you are experiencing today in detail.',
          answer: speechTranscript.trim(),
          input_mode: 'speech',
        });
      }
    }

    setLoading(true);
    setError('');
    kioskApi.summaryGenerate(
      sessionData.consultationId,
      language,
      sessionData.pathway==='ayurveda',
      conversationHistory
    )
    .then(s=>{
      const value=s?.ai_summary||s;
      setSummary(value);
      updateSession({summary:value});
    })
    .catch(e=>setError(getErrorMessage(e)))
    .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    if (sessionData.intakeMode === 'speak' && sessionData.summary?.sections?.length) {
      setSummary(sessionData.summary);
      return;
    }
    generateSummary();
  },[sessionData.consultationId,sessionData.consent?.clinical_intake,language,sessionData.pathway,sessionData.intakeMode,sessionData.summary]);

  const confirm=async()=>{
    if(!sessionData.consent?.clinical_intake)return;
    setLoading(true);
    setError('');
    try{
      const tok=await kioskApi.token(sessionData.consultationId);
      await kioskApi.complete(sessionData.consultationId);
      updateSession({
        token:tok?.token_number||tok,
      });
      nextScreen();
    }catch(e){
      setError(getErrorMessage(e));
    }finally{
      setLoading(false);
    }
  };

  const sections=summary?.sections||[];

  return <section className="screen-card">
    <p className="eyebrow">07 • {t('review')}</p>
    <h2>{t('review')}</h2>

    <div className="review-grid">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ margin: 0 }}><FileText size={19}/>{t('summary')}</h3>
          <button
            type="button"
            className="secondary-btn"
            onClick={generateSummary}
            disabled={loading}
            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCw size={14} className={loading ? 'spin' : ''} />
            {loading ? t('loading') : t('refreshSummary','Refresh Summary')}
          </button>
        </div>
        {loading&&!summary?
          <div className="loading-line"><Loader2 className="spin"/> {t('loading')}</div>
          :
          sections.length?
            sections.map(s=>
              <article key={s.id}>
                <strong>{s.heading_local||s.heading_en||s.heading_hi}</strong>
                <p>{s.body_local||s.body}</p>
              </article>
            )
            :
            <div>
              <p className="muted">{t('noSummary')}</p>
              <button
                type="button"
                className="secondary-btn"
                onClick={generateSummary}
                disabled={loading}
                style={{ marginTop: '10px' }}
              >
                {loading ? <Loader2 className="spin" size={16} /> : t('generateAiSummary','Generate AI Summary')}
              </button>
            </div>
        }
      </div>

      <div className="consent-card">
        <ShieldCheck size={28}/>
        <h3>{t('consentRecorded','Consent recorded')}</h3>
        <p>
          Your clinical-intake consent was recorded before the AI health
          interview started.
        </p>
        {sessionData.consent?.document_processing &&
          <p>{t('documentProcessingEnabled','Medical document processing is also enabled for this session.')}</p>
        }
        <button
          className="primary-btn wide"
          disabled={loading||!sessionData.consent?.clinical_intake}
          onClick={confirm}
        >
          {loading?<Loader2 className="spin"/>:t('confirm')}
        </button>
      </div>
    </div>

    {error&&(
      <div className="error-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '16px' }}>
        <span>{error}</span>
        <button
          type="button"
          className="secondary-btn"
          onClick={generateSummary}
          disabled={loading}
          style={{ padding: '6px 14px', fontSize: '13px', whiteSpace: 'nowrap' }}
        >
          {t('retrySummary','Retry Summary')}
        </button>
      </div>
    )}
  </section>
}
