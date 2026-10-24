import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Languages, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import useMobileStore from '../../store/useMobileStore';
import { getSupportedLanguages } from '../../services/languageService';
import { useLanguage } from '../../i18n/translations';

export default function LanguageSwitcher({ floating = false }) {
  const { selectedLanguage, setSelectedLanguage } = useMobileStore();
  const { tr } = useLanguage();
  const [open, setOpen] = useState(false); const [position, setPosition] = useState(null); const [languages, setLanguages] = useState([]); const [loading, setLoading] = useState(false);
  const buttonRef=useRef(null); const menuRef=useRef(null);
  useEffect(()=>{let live=true; setLoading(true); getSupportedLanguages().then((items)=>live&&setLanguages(items)).catch(()=>live&&setLanguages([])).finally(()=>live&&setLoading(false)); return()=>{live=false}},[]);
  const selected=languages.find((x)=>x.code===selectedLanguage)||{code:selectedLanguage,name:selectedLanguage,native:selectedLanguage};
  const updatePosition=()=>{const r=buttonRef.current?.getBoundingClientRect(); if(!r)return; const width=Math.min(340,window.innerWidth-24); setPosition({top:Math.min(r.bottom+8,window.innerHeight-120),left:Math.max(12,Math.min(r.left,window.innerWidth-width-12)),width});};
  useLayoutEffect(()=>{if(open)updatePosition()},[open,selectedLanguage]);
  useEffect(()=>{if(!open)return; const outside=(e)=>{if(!buttonRef.current?.contains(e.target)&&!menuRef.current?.contains(e.target))setOpen(false)}; const resize=()=>updatePosition(); document.addEventListener('pointerdown',outside); window.addEventListener('resize',resize); return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',resize)}},[open]);
  const menu=open&&position?createPortal(<div ref={menuRef} className="mobile-language-menu" style={{position:'fixed',top:position.top,left:position.left,width:position.width,maxHeight:Math.min(520,window.innerHeight-24)}} role="listbox" aria-label={tr('Select language','भाषा चुनें')}><div className="mobile-language-menu-title">{tr('Select language','भाषा चुनें')}</div><div className="mobile-language-list">{languages.map(item=>{const active=item.code===selectedLanguage; return <button key={item.code} type="button" role="option" aria-selected={active} className={`mobile-language-option ${active?'active':''}`} onClick={()=>{setSelectedLanguage(item.code);setOpen(false)}}><span className="mobile-language-native">{item.name_native||item.native||item.name_en||item.name}</span><span className="mobile-language-name">{item.name_en||item.name}</span>{item.voice_capture&&<span className="text-[10px] text-slate-400">{tr('Voice','आवाज़')}</span>}{active&&<Check size={18}/>}</button>})}</div></div>,document.body):null;
  return <><div className={floating?'mobile-language-floating':'mobile-language-control'}><button ref={buttonRef} type="button" className="mobile-language-button" onClick={()=>setOpen(v=>!v)} aria-haspopup="listbox" aria-expanded={open} aria-label={tr('Change language','भाषा बदलें')}><Languages size={18}/><span className="mobile-language-current">{selected.native||selected.name}</span>{loading?<Loader2 size={16} className="animate-spin"/>:<ChevronDown size={16} className={open?'rotate-180':''}/>}</button></div>{menu}</>;
}
