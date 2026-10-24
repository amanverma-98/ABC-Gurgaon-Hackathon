import { useEffect } from 'react';
import useMobileStore from '../store/useMobileStore';
import { apiRequest } from '../services/apiClient';
import { getCachedTranslation, ensureTranslation } from '../services/remoteTranslationService';

const SKIP_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','INPUT','TEXTAREA','OPTION']);
const shouldSkipText = (node) => {
  const parent=node.parentElement; if(!parent||SKIP_TAGS.has(parent.tagName))return true;
  if(parent.closest('[data-no-translate],code,pre,.mobile-header-brand,[contenteditable="true"]'))return true;
  const value=node.nodeValue?.replace(/\s+/g,' ').trim();
  if(!value||value.length<2||value.length>220)return true;
  if(/^https?:\/\//i.test(value)||/@/.test(value)||/^[\d\s+().:/#%₹,-]+$/.test(value)||/^[A-Z0-9_-]{8,}$/.test(value))return true;
  return false;
};
const collect = (translatedNodes) => {
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); const nodes=[]; let n;
  while((n=walker.nextNode())) if(!translatedNodes.has(n)&&shouldSkipText(n)){} else if(!translatedNodes.has(n)&&shouldSkipText(n)===false) nodes.push(n);
  return nodes;
};

export default function useDomTranslation(){
  const language=useMobileStore((s)=>s.selectedLanguage||'en');
  useEffect(()=>{
    if(language==='en')return;
    let cancelled=false; let timer=null;
    const translatedNodes=new WeakSet(); const translatedAttrs=new WeakMap();
    const run=async()=>{
      if(cancelled)return;
      const nodes=collect(translatedNodes);
      const attrs=[...document.querySelectorAll('[placeholder],[aria-label],[title]')].flatMap(el=>['placeholder','aria-label','title'].filter(a=>el.getAttribute(a)).map(a=>({el,a,text:el.getAttribute(a)}))).filter(x=>!translatedAttrs.get(x.el)?.has(x.a));
      const items=[...nodes.map(n=>({kind:'text',node:n,text:n.nodeValue.replace(/\s+/g,' ').trim()})),...attrs.map(x=>({kind:'attr',...x,text:x.text.trim()}))].filter(x=>x.text&&x.text.length<=220);
      const unique=[...new Map(items.map(x=>[x.text,x])).values()].slice(0,100); let cursor=0;
      const worker=async()=>{while(!cancelled){const item=unique[cursor++];if(!item)return;const translated=getCachedTranslation(item.text,language)||await ensureTranslation(item.text,language,apiRequest);if(cancelled)return;items.filter(x=>x.text===item.text).forEach(x=>{if(x.kind==='text'&&x.node.isConnected){x.node.nodeValue=translated;translatedNodes.add(x.node)}else if(x.kind==='attr'&&x.el.isConnected){x.el.setAttribute(x.a,translated);let set=translatedAttrs.get(x.el);if(!set){set=new Set();translatedAttrs.set(x.el,set)}set.add(x.a)}})}};
      await Promise.all(Array.from({length:6},worker));
    };
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(run,100)};
    schedule();
    const observer=new MutationObserver(schedule); observer.observe(document.body,{childList:true,subtree:true});
    return()=>{cancelled=true;clearTimeout(timer);observer.disconnect()};
  },[language]);
}
