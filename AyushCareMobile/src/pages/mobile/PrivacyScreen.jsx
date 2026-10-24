import React, { useEffect, useState } from 'react';
import { Building2, FileText, CalendarDays, ShieldCheck, Loader2 } from 'lucide-react';
import useMobileStore from '../../store/useMobileStore';
import MobileHeader from '../../components/mobile/MobileHeader';
import { useLanguage } from '../../i18n/translations';
import { getPortalPrivacyContext, updatePortalPrivacyRule } from '../../services/portalService';

function Toggle({ enabled, label, onClick, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors duration-300 ease-in-out focus:outline-none ${
        enabled ? 'bg-[#34C759]' : 'bg-[#E9E9EB]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
    >
      <span
        className={`pointer-events-none inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-in-out ${
          enabled ? 'translate-x-[20px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function PrivacyScreen() {
 const { prevScreen }=useMobileStore(); const { tr }=useLanguage();
 const [context,setContext]=useState({hospitals:[],visits:[],documents:[],rules:[]}); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(''); const [error,setError]=useState('');
 const load=async()=>{setLoading(true);try{setContext((await getPortalPrivacyContext())||{hospitals:[],visits:[],documents:[],rules:[]})}catch(e){setError(e?.message||tr('Unable to load privacy controls','गोपनीयता नियंत्रण लोड नहीं हो सके।'))}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 const ruleFor=(scope,id)=>context.rules.find(r=>r.scope_type===scope&&(scope==='hospital'?r.hospital_id===id:scope==='visit'?r.consultation_id===id:r.document_id===id));
 const toggle=async(scope,id,current,reason)=>{const key=`${scope}:${id}`;setSaving(key);setError('');try{const saved=await updatePortalPrivacyRule({scope_type:scope,[scope==='hospital'?'hospital_id':scope==='visit'?'consultation_id':'document_id']:id,allow_doctor_access:!current,reason});setContext(c=>({...c,rules:[...c.rules.filter(r=>!(r.scope_type===scope&&(scope==='hospital'?r.hospital_id===id:scope==='visit'?r.consultation_id===id:r.document_id===id))),saved]}))}catch(e){setError(e?.message||tr('Could not save privacy rule','गोपनीयता नियम सहेजा नहीं जा सका।'))}finally{setSaving('')}};
 const Card=({scope,id,icon:Icon,title,subtitle,reason})=>{const rule=ruleFor(scope,id);const allowed=rule?.allow_doctor_access!==false;const key=`${scope}:${id}`;return <div className={`rounded-3xl border p-4 shadow-sm ${allowed?'border-teal-200 bg-white':'border-amber-200 bg-amber-50/50'}`}><div className="flex items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${allowed?'bg-teal-50 text-teal-700':'bg-amber-100 text-amber-800'}`}><Icon size={19}/></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><div><p className="font-bold text-slate-900">{title}</p><p className="text-xs text-slate-500 mt-1">{subtitle}</p></div>{saving===key?<Loader2 className="animate-spin" size={18}/>:<Toggle enabled={allowed} label={title} onClick={()=>toggle(scope,id,allowed,reason)}/>}</div><p className={`mt-2 text-xs font-semibold ${allowed?'text-teal-700':'text-amber-800'}`}>{allowed?tr('Visible to an authorized doctor','अधिकृत डॉक्टर को दिखाई दे सकता है'):tr('Hidden from doctors at this scope','इस स्तर पर डॉक्टरों से छिपा हुआ')}</p></div></div></div>};
 return <div className="min-h-screen bg-slate-50 pb-28 text-slate-900"><MobileHeader title={tr('Privacy controls','गोपनीयता नियंत्रण')} subtitle={tr('Control access hospital-by-hospital, visit-by-visit, and document-by-document','अस्पताल, विज़िट और दस्तावेज़ के स्तर पर एक्सेस नियंत्रित करें')} onBack={prevScreen}/><main className="mx-auto max-w-2xl px-4 py-6"><section className="rounded-3xl border border-teal-100 bg-teal-50 p-5"><div className="flex gap-3"><ShieldCheck className="text-teal-700"/><div><h2 className="font-bold">{tr('You control who can see your records','आप तय करते हैं कि आपके रिकॉर्ड कौन देख सकता है')}</h2><p className="mt-1 text-xs leading-5 text-teal-800">{tr('Turning access off does not delete your record. It prevents doctor access under that hospital, visit, or document scope.','एक्सेस बंद करने से रिकॉर्ड हटता नहीं है। यह उस अस्पताल, विज़िट या दस्तावेज़ के लिए डॉक्टर की पहुंच रोकता है।')}</p></div></div></section>{loading?<div className="flex justify-center py-12"><Loader2 className="animate-spin"/></div>:<><section className="mt-6 space-y-3"><h3 className="px-1 text-sm font-black uppercase tracking-wide text-slate-500">{tr('Hospitals','अस्पताल')}</h3>{context.hospitals.length?context.hospitals.map(h=><Card key={h.id} scope="hospital" id={h.id} icon={Building2} title={h.name} subtitle={tr('Control whether doctors at this hospital can access your records','तय करें कि इस अस्पताल के डॉक्टर आपके रिकॉर्ड देख सकते हैं या नहीं')} reason={`Hospital-level access: ${h.name}`}/>):<p className="text-sm text-slate-500">{tr('No hospitals found yet.','अभी कोई अस्पताल नहीं मिला।')}</p>}</section><section className="mt-7 space-y-3"><h3 className="px-1 text-sm font-black uppercase tracking-wide text-slate-500">{tr('Visits','विज़िट')}</h3>{context.visits.length?context.visits.map(v=><Card key={v.id} scope="visit" id={v.id} icon={CalendarDays} title={`${v.hospital_name||tr('Hospital','अस्पताल')} · ${v.department_name||tr('Visit','विज़िट')}`} subtitle={new Date(v.created_at).toLocaleDateString()} reason={`Visit-level access: ${v.id}`}/>):<p className="text-sm text-slate-500">{tr('No visits found yet.','अभी कोई विज़िट नहीं मिली।')}</p>}</section><section className="mt-7 space-y-3"><h3 className="px-1 text-sm font-black uppercase tracking-wide text-slate-500">{tr('Documents','दस्तावेज़')}</h3>{context.documents.length?context.documents.map(d=><Card key={d.id} scope="document" id={d.id} icon={FileText} title={d.document_type||tr('Medical document','चिकित्सीय दस्तावेज़')} subtitle={`${d.hospital_name||tr('Hospital','अस्पताल')} · ${new Date(d.created_at).toLocaleDateString()}`} reason={`Document-level access: ${d.id}`}/>):<p className="text-sm text-slate-500">{tr('No documents found yet.','अभी कोई दस्तावेज़ नहीं मिला।')}</p>}</section></>}{error&&<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}</main></div>;
}
