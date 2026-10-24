import React,{useEffect,useRef,useState,useCallback} from 'react';
import { Mic, Send, Loader2 } from 'lucide-react';
import { kioskApi,getErrorMessage } from '../services/api';
import SpeechRecorder from '../services/speechRecorder';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';
import AudioButton from '../components/common/AudioButton';
import KioskInput from '../components/common/KioskInput';
import audioService from '../services/audioService';

export default function Screen4_SymptomIntake({ onSwitchToSpeak }){
 const {sessionData,language,updateSession,nextScreen}=useKioskStore();
 const {t}=useTranslation();
 const [question,setQuestion]=useState(sessionData.currentQuestion);
 const [answer,setAnswer]=useState('');
 const [multiAnswer,setMultiAnswer]=useState([]);
 const [history,setHistory]=useState(sessionData.questionHistory||[]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [complete,setComplete]=useState(false);
 const [recording,setRecording]=useState(false);
 const recorderRef=useRef(null);
 const recorderServiceRef=useRef(null);
 const startingRef=useRef(false);

  useEffect(()=>{
    recorderServiceRef.current=new SpeechRecorder();
    return ()=>{
      audioService.stop();
      recorderServiceRef.current?.cancel();
    };
  },[]);

  useEffect(()=>{
    audioService.stop();
    const container=document.querySelector('.kiosk-main-scroll');
    if(container) container.scrollTo({top:0, behavior:'smooth'});
  },[question?.question_id]);

 useEffect(()=>{
   if(!sessionData.consultationId)return;
   if(complete || sessionData.isComplete)return;
   if(question)return;
   if(startingRef.current)return;

   // Safety guard: consent must be stored locally before the UI attempts
   // to start the AI conversation. The backend also enforces this rule.
   if(!sessionData.consent?.clinical_intake){
     setError('Clinical intake consent is required before starting the interview.');
     return;
   }

   startingRef.current=true;
   setLoading(true);
   kioskApi.startDialogue(sessionData.consultationId)
     .then(r=>{
       const q=r?.next_question||r?.current_question;
       setQuestion(q);
       updateSession({
         currentQuestion:q,
         progress:r?.progress_percent||0,
         redFlags:r?.red_flags||[]
       });
     })
     .catch(e=>setError(getErrorMessage(e)))
     .finally(()=>{
       setLoading(false);
       startingRef.current=false;
     });
 },[sessionData.consultationId,sessionData.consent?.clinical_intake,sessionData.isComplete,question,complete,updateSession]);

 const isMultiSelect=Boolean(question?.multiple || question?.multi_select || question?.multiSelect || question?.selection_mode==='multiple' || question?.answer_type==='multi_select' || question?.input_mode==='multi_select');
 const applyResult=useCallback((r,answerText,inputMode)=>{
   audioService.stop();
   const item={question,answer:answerText,input_mode:inputMode};
   const h=[...history,item];
   setHistory(h);
   setAnswer('');
   setMultiAnswer([]);
   setQuestion(r?.next_question||null);
   updateSession({
     currentQuestion:r?.next_question||null,
     questionHistory:h,
     progress:r?.progress_percent||0,
     redFlags:r?.red_flags||[],
     isComplete:!!r?.is_complete
   });
   if(r?.is_complete)setComplete(true);
 },[history,updateSession]);

 const submit=async()=>{
   if(!question)return;
   const answerText=isMultiSelect ? JSON.stringify(multiAnswer) : answer.trim();
   if(!answerText || (isMultiSelect && !multiAnswer.length))return;
   // Stop previous question's audio immediately on submitting
   audioService.stop();
   setLoading(true);
   setError('');
   try{
     let r=await kioskApi.answer(sessionData.consultationId,{
       question_id:question.question_id,
       answer:answerText,
       input_mode:isMultiSelect ? 'multi_select' : 'text',
       confidence:1
     });
     if(r && !r.next_question && !r.is_complete){
       try{
         const state=await kioskApi.dialogueState(sessionData.consultationId);
         r={...r,next_question:state?.next_question||state?.current_question||null,is_complete:Boolean(state?.is_complete)};
       }catch{}
     }
     applyResult(r,answerText,'text');
   }catch(e){
     setError(getErrorMessage(e));
   }finally{
     setLoading(false);
   }
 };

 // Hold-to-speak recording is encapsulated in SpeechRecorder so microphone
 // lifecycle, permission handling and cleanup are shared and testable.
 const startRecording=useCallback(async()=>{
   if(recording || loading || !sessionData.consultationId || !question) return;
   audioService.stop();
   setError('');
   try{
     const recorderService=recorderServiceRef.current || new SpeechRecorder();
     recorderServiceRef.current=recorderService;
     await recorderService.start();
     recorderRef.current=recorderService;
     setRecording(true);
   }catch(e){
     setRecording(false);
     setError(e?.name==='NotAllowedError'
       ? 'Microphone permission was denied. Please allow microphone access and try again.'
       : 'Microphone access is unavailable. You can type your answer instead.');
   }
 },[recording,loading,sessionData.consultationId,question]);

 const stopRecording=useCallback(async()=>{
   const recorderService=recorderRef.current;
   if(!recorderService) return;
   setRecording(false);
   recorderRef.current=null;
   try{
     const blob=await recorderService.stop();
     if(!blob || blob.size===0) return;
     setLoading(true);
     setError('');
     let r=await kioskApi.speech(sessionData.consultationId,question.question_id,language,blob);
     if(r && !r.next_question && !r.is_complete){
       try{
         const state=await kioskApi.dialogueState(sessionData.consultationId);
         r={...r,next_question:state?.next_question||state?.current_question||null,is_complete:Boolean(state?.is_complete)};
       }catch{}
     }
     const transcript=r?.answer_confirmed||r?.transcript||r?.answer||'';
     if(transcript) setAnswer(transcript);
     if(r && (r.next_question !== undefined || r.is_complete !== undefined)){
       applyResult(r,transcript,'speech');
     }else if(!transcript){
       setError('Could not understand the speech. Please try again or type your answer.');
     }
   }catch(e){
     setError(getErrorMessage(e));
   }finally{
     setLoading(false);
   }
 },[sessionData.consultationId,question,language,applyResult]);

 const cancelRecording=useCallback(()=>{
   recorderRef.current?.cancel();
   recorderRef.current=null;
   setRecording(false);
 },[]);

 return <section className="screen-card interview">
    <div className="section-head">
      <div>
        <p className="eyebrow">04 • {t('interview')}</p>
        <h2>{t('interview')}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onSwitchToSpeak && (
          <button
            type="button"
            onClick={() => {
              audioService.stop();
              onSwitchToSpeak();
            }}
            className="secondary-btn"
            style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Mic size={14} />
            <span>Switch to Speak Mode</span>
          </button>
        )}
        <div className="progress-ring">{Math.round(sessionData.progress||0)}%</div>
      </div>
    </div>

   {history.slice(-3).map((h,i)=>
     <div className="answer-history" key={i}>
       <small>{h.question?.prompt_local||h.question?.prompt}</small>
       <p>{h.answer||'—'}</p>
     </div>
   )}

   {sessionData.redFlags?.length>0&&
     <div className="emergency-box">{t('emergency')}</div>
   }

   {complete||!question?
     <div className="complete-panel">
       <h3>{t('done')}</h3>
       <p>{t('summary')}</p>
       <button className="primary-btn" onClick={() => { audioService.stop(); nextScreen(); }}>{t('continue')}</button>
     </div>
     :
     <div className="question-box">
       <div className="question-top">
         <div className="question-text">{question.prompt_local||question.prompt}</div>
         <AudioButton
           key={`q-audio-${question.question_id}`}
           textToRead={question.prompt_local||question.prompt}
           audioPayload={question.audio_base64 ? {base64: question.audio_base64, encoding: question.audio_encoding, mime_type: question.audio_mime_type} : null}
           label={t('speak')}
           autoPlay
         />
       </div>
       {question.helper&&<p className="helper">{question.helper}</p>}
       {question.options?.length>0&&
         <>
           {isMultiSelect&&<p className="multi-select-hint">{t('selectAllOptions','Select all options that apply.')}</p>}
           <div className="option-grid">
             {question.options.map(o=>{
               const value=String(o.value);
               const selectedOption=isMultiSelect ? multiAnswer.includes(value) : answer===value;
               return (
                 <button key={value} className={selectedOption?'selected':''} onClick={()=>{
                   if(isMultiSelect){
                     setMultiAnswer(prev=>prev.includes(value)?prev.filter(x=>x!==value):[...prev,value]);
                   }else{
                     setAnswer(value);
                   }
                 }}>
                   {o.label_local||o.label}
                 </button>
               );
             })}
           </div>
         </>
       }
       {(!question.options||question.options.length===0)&&
         <KioskInput id={`ai-answer-${question.question_id}`} value={answer} onChange={setAnswer} multiline label="Your answer" placeholder={t('typeAnswer')} />
       }
       <div className="answer-actions">
         <button
           className={`secondary-btn hold-to-speak-btn ${recording?'recording':''}`}
           onClick={() => { if (recording) stopRecording(); else startRecording(); }}
           disabled={loading}
         >
           {recording?<><Mic size={17} className="pulse-mic"/>{t('clickToStop','Click to stop')}</>:<><Mic size={17}/>{t('clickToSpeak','Click to speak')}</>}
         </button>
         <small className="hold-hint">{recording ? t('clickToStopHint','Click to stop and send') : t('clickToSpeakHint','Click once to speak; click again to send')}</small>
         <button className="primary-btn" disabled={loading||(isMultiSelect ? !multiAnswer.length : !answer.trim())} onClick={submit}>
           {loading?<Loader2 className="spin"/>:<Send size={18}/>} {t('submit')}
         </button>
       </div>
     </div>
   }

   {loading&&!question&&<div className="loading-line"><Loader2 className="spin"/> {t('loading')}</div>}
   {error&&<div className="error-box">{error}</div>}
 </section>
}

