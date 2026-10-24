import React, { useState } from 'react';
import { Activity, Save, Loader2 } from 'lucide-react';
import { kioskApi, getErrorMessage } from '../services/api';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';
import KioskInput from '../components/common/KioskInput';

export default function Screen6_HealthHistory(){
 const {sessionData,updateSession,nextScreen}=useKioskStore(); const {t}=useTranslation();
 const [v,setV]=useState(sessionData.vitals||{systolic:'',diastolic:'',pulse:'',temperature:'',spo2:''}); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
 const set=(k,val)=>setV((prev)=>({...prev,[k]:val}));
 const fields=[['systolic',t('systolic','Systolic BP')],['diastolic',t('diastolic','Diastolic BP')],['pulse',t('pulse','Pulse / min')],['temperature',t('temperature','Temperature °F')],['spo2','SpO₂ %']];
 const save=async()=>{setLoading(true);setError('');try{const d=await kioskApi.vitals(sessionData.consultationId,{...v,source:'manual'});updateSession({vitals:d});nextScreen()}catch(e){setError(getErrorMessage(e))}finally{setLoading(false)}};
 return <section className="screen-card"><p className="eyebrow">05 • {t('history')}</p><h2>{t('history')}</h2><div className="vitals-grid">{fields.map(([k,label])=><label key={k}><span>{label}</span><KioskInput id={`vital-${k}`} value={v[k]||''} onChange={(x)=>set(k,x)} type="number" allowDecimal={k==='temperature'} maxLength={5} label={label} placeholder={t('enterReading','Enter reading')}/></label>)}</div><div className="info-strip"><Activity size={20}/><span>{t('vitalsNote','Only enter readings you know. Connected sensor integration can be enabled later.')}</span></div>{error&&<div className="error-box">{error}</div>}<button className="primary-btn wide" onClick={save} disabled={loading}>{loading?<Loader2 className="spin"/>:<Save size={18}/>} {t('continue')}</button></section>
}
