import React from 'react';
import { CalendarDays, CheckCircle2, Printer, RotateCcw } from 'lucide-react';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';

export default function Screen10_TokenSuccess(){
 const { sessionData, resetSession }=useKioskStore(); const {t}=useTranslation();
 const p=sessionData.patientProfile||{}; const token=sessionData.token||'—'; const date=new Date().toLocaleDateString();
 return <section className="success-card"><CheckCircle2 size={70}/><p className="eyebrow">08 • AyushCare OPD</p><h1>{t('token')}</h1><div className="token-number">{token}</div><div className="token-print-card"><div><small>{t('abha')}</small><strong>{p.abha||p.abha_number||sessionData.abhaNumber||'—'}</strong></div><div><small>{t('name')}</small><strong>{p.full_name||p.name||'—'}</strong></div><div><small>{t('age')} / {t('gender')}</small><strong>{p.age||'—'} / {p.gender||'—'}</strong></div><div><small>{t('date','Date')}</small><strong><CalendarDays size={15}/> {date}</strong></div></div><p>{t('queue')}</p><div className="success-actions"><button className="secondary-btn" onClick={()=>window.print()}><Printer size={18}/>{t('printToken','Print Token')}</button><button className="primary-btn" onClick={resetSession}><RotateCcw size={18}/>{t('restart')}</button></div></section>
}
