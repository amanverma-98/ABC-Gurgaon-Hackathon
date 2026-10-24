import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Keyboard,
  X,
  Play,
  Square,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Volume2,
  ArrowRight,
  RotateCcw,
  Loader2,
  Bot,
} from 'lucide-react';
import { kioskApi, getErrorMessage } from '../services/api';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';
import { useKeyboard } from '../context/KeyboardContext';

const MIN_RECORDING_SECONDS = 1.5;
const MAX_RECORDING_SECONDS = 30;

const BCP47_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  ur: 'ur-IN',
  or: 'or-IN',
  as: 'as-IN',
};

const LANGUAGE_NAMES = {
  hi: 'हिन्दी (Hindi)',
  en: 'English',
  bn: 'বাংলা (Bengali)',
  ta: 'தமிழ் (Tamil)',
  te: 'తెలుగు (Telugu)',
  mr: 'मराठी (Marathi)',
  gu: 'ગુજરાતી (Gujarati)',
  kn: 'ಕನ್ನಡ (Kannada)',
  ml: 'മലയാളം (Malayalam)',
  pa: 'ਪੰਜਾਬੀ (Punjabi)',
  or: 'ଓଡ଼ିଆ (Odia)',
  ur: 'اردو (Urdu)',
  as: 'অসমীয়া (Assamese)',
};

const getLocaleTag = (lang) => {
  if (!lang) return 'en-IN';
  const clean = String(lang).toLowerCase().trim();
  if (BCP47_MAP[clean]) return BCP47_MAP[clean];
  if (clean.includes('-')) return clean;
  return `${clean}-IN`;
};

export default function Screen4_SpeakMode({ onSwitchToInterview }) {
  const { sessionData, language, updateSession, nextScreen } = useKioskStore();
  const { t } = useTranslation();
  const { openKeyboard } = useKeyboard();

  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState(language || 'hi');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const startTimeRef = useRef(0);
  const speechRecognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const currentTakeTextRef = useRef('');

  // Clean up media and timer on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Initialize Web Speech Recognition for live real-time preview and transcription
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SpeechRecognition) return null;

    try {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = getLocaleTag(detectedLanguage || language || 'hi');
      recognizer.maxAlternatives = 1;
      recognizer.onresult = (event) => {
        let interim = '';
        let finalPhrase = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            finalPhrase += (finalPhrase ? ' ' : '') + text;
          } else {
            interim += text;
          }
        }

        if (finalPhrase.trim()) {
          const chunk = finalPhrase.trim();
          currentTakeTextRef.current = currentTakeTextRef.current
            ? `${currentTakeTextRef.current} ${chunk}`
            : chunk;

          setTranscript((prev) => {
            const cleanPrev = (prev || '').trim();
            return cleanPrev ? `${cleanPrev} ${chunk}` : chunk;
          });
        }
        setInterimText(interim);
      };

      recognizer.onerror = (event) => {
        console.warn('Web Speech API notification:', event?.error);
      };

      recognizer.onend = () => {
        // If recording is still active, automatically restart so short pauses don't cut off speech
        if (isRecordingRef.current) {
          try {
            recognizer.start();
          } catch {
            // ignore
          }
        }
      };

      return recognizer;
    } catch (e) {
      console.warn('SpeechRecognition initialization failed:', e);
      return null;
    }
  }, [detectedLanguage, language]);

  // Start Audio Recording
  const startRecording = async () => {
    if (isRecordingRef.current) return;
    setError('');
    setInfoMessage('');
    setInterimText('');
    currentTakeTextRef.current = '';
    audioChunksRef.current = [];

    try {
      // Echo cancellation and noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Prefer webm with opus
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/wav';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());

        const duration = (Date.now() - startTimeRef.current) / 1000;
        if (duration < MIN_RECORDING_SECONDS) {
          setError(
            `Recording was too short (${duration.toFixed(1)}s). Please click to speak and describe your symptoms clearly.`
          );
          setInterimText('');
          return;
        }

        // Process audio recording
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        await processAudioUpload(audioBlob, duration);
      };

      startTimeRef.current = Date.now();
      recorder.start(250);
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingSeconds(0);

      // Start duration counter
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingSeconds(elapsed);

        // Auto-stop at 30 seconds
        if (elapsed >= MAX_RECORDING_SECONDS) {
          stopRecording();
        }
      }, 200);

      // Start live speech recognizer for realtime transcript
      const recognizer = initSpeechRecognition();
      if (recognizer) {
        speechRecognitionRef.current = recognizer;
        try {
          recognizer.start();
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Microphone error:', err);
      setError(
        'Microphone access was denied or unavailable. You can also type your symptoms using the on-screen touch keyboard.'
      );
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (!isRecordingRef.current) return;
    setIsRecording(false);
    isRecordingRef.current = false;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  // Single Click to Speak / Click to Stop handler
  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Upload and transcribe audio with Bhashini ASR & Groq Whisper fallback
  const processAudioUpload = async (audioBlob, duration) => {
    if (!sessionData.consultationId) {
      setError('Consultation session is missing. Please restart registration.');
      return;
    }

    setIsProcessingAudio(true);
    setInfoMessage('Analyzing voice and enhancing symptom transcript...');

    try {
      const response = await kioskApi.audioIntake(
        sessionData.consultationId,
        'auto',
        audioBlob
      );

      const newText = (response?.transcript || '').trim();
      const detected = response?.detected_language || response?.language;
      const returnedAudioUrl = response?.audioUrl || response?.audio_url || null;

      if (detected) {
        setDetectedLanguage(detected);
        updateSession({ interviewLanguage: detected });
      }

      if (returnedAudioUrl) {
        setAudioUrl(returnedAudioUrl);
      }

      if (newText) {
        setTranscript((prev) => {
          const cleanPrev = (prev || '').trim();
          if (!cleanPrev) return newText;
          // If previous text already includes newText
          if (cleanPrev.toLowerCase().includes(newText.toLowerCase())) {
            return cleanPrev;
          }
          return `${cleanPrev} ${newText}`;
        });
        const langName = LANGUAGE_NAMES[detected] || detected?.toUpperCase() || 'Detected Language';
        setInfoMessage(`Language detected: ${langName}. Transcript written in ${langName}.`);
      } else {
        if (transcript || currentTakeTextRef.current) {
          setInfoMessage('Voice recorded successfully.');
        } else {
          setInfoMessage(
            'Voice recorded. If words were not detected, click to speak again or use the touch keyboard.'
          );
        }
      }
    } catch (err) {
      console.warn('Server ASR upload note:', err);
      // If server ASR fails, keep any interim/final text captured locally by the browser
      if (interimText) {
        setTranscript((prev) => (prev ? `${prev} ${interimText}` : interimText));
      }
    } finally {
      setIsProcessingAudio(false);
      setInterimText('');
      setRecordingSeconds(0);
      setTimeout(() => setInfoMessage(''), 4000);
    }
  };

  // Open on-screen virtual keyboard for manual editing
  const handleOpenKeyboard = () => {
    openKeyboard({
      id: 'speak-mode-transcript',
      value: transcript,
      onChange: (val) => {
        const textVal = typeof val === 'string' ? val : val?.target?.value ?? '';
        setTranscript(textVal);
      },
      label: 'Describe your symptoms & concerns',
    });
  };

  // Clear text box
  const handleClearTranscript = () => {
    setTranscript('');
    setInterimText('');
    setAudioUrl(null);
    setError('');
    setInfoMessage('');
    currentTakeTextRef.current = '';
  };

  // Submit speak mode transcript to Groq AI for medical summary
  const handleSubmit = async () => {
    const finalText = (transcript || interimText || '').trim();
    if (!finalText) {
      setError('Please click to speak or type your symptoms before submitting.');
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await kioskApi.speakModeSubmit(sessionData.consultationId, {
        transcript: finalText,
        audioUrl,
        duration: `${recordingSeconds || 30}s`,
        language: detectedLanguage || language || 'auto',
        speech_language: detectedLanguage || language || 'auto',
      });

      const summary = response?.summary || null;

      // Update session with AI summary and speak mode indicators
      updateSession({
        intakeMode: 'speak',
        summary,
        transcripts: [
          {
            id: `speech-${sessionData.consultationId}`,
            speaker: 'patient',
            text: finalText,
            audioUrl,
            audioDuration: `${recordingSeconds || 30}s`,
          },
        ],
        patientTranscript: finalText,
        progress: 100,
        isComplete: true,
      });

      // Proceed to Screen 7 (Health History / Vitals)
      nextScreen();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remaining seconds for 30s max constraint
  const remainingSeconds = Math.max(0, MAX_RECORDING_SECONDS - recordingSeconds);
  const progressPercent = Math.min(100, (recordingSeconds / MAX_RECORDING_SECONDS) * 100);

  return (
    <section className="screen-card speak-mode-screen">
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="eyebrow">04 • Speak Mode (बोलकर बताएं)</p>
          <h2>Describe Your Health Symptoms</h2>
          <p className="helper" style={{ marginTop: '4px' }}>
            Click the microphone once to start speaking. Click again when you are finished.
          </p>
        </div>

        {/* Switch back to AI Interview button */}
        {onSwitchToInterview && (
          <button
            type="button"
            onClick={onSwitchToInterview}
            className="secondary-btn"
            style={{
              fontSize: '13px',
              padding: '8px 14px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: '#044e42',
              color: '#044e42',
              background: '#f0fdf9',
              cursor: 'pointer',
            }}
          >
            <Bot size={16} />
            <span>Switch to Interview Mode</span>
          </button>
        )}
      </div>

      {/* Info / Status Notification Banner */}
      {infoMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '12px', color: '#0f766e', fontSize: '13px', marginBottom: '14px' }}>
          <Sparkles size={16} className="shrink-0 text-teal-600" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Error Alert Box */}
      {error && (
        <div className="error-box" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Central Microphone Recording Card */}
      <div
        style={{
          background: isRecording ? '#fff5f5' : '#f8fafc',
          border: isRecording ? '2px solid #f87171' : '2px solid #e2e8f0',
          borderRadius: '24px',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Animated Wave Pulse while recording */}
          {isRecording && (
            <div
              style={{
                position: 'absolute',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.25)',
                animation: 'ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite',
              }}
            />
          )}

          {/* Click to Speak / Click to Stop Mic Button */}
          <button
            type="button"
            onClick={handleMicToggle}
            className={`mic-push-button ${isRecording ? 'recording' : ''}`}
            aria-label={isRecording ? 'Click to stop recording' : 'Click to speak'}
            style={{
              width: '108px',
              height: '108px',
              borderRadius: '50%',
              background: isRecording ? '#dc2626' : '#044e42',
              color: '#ffffff',
              border: '4px solid #ffffff',
              boxShadow: isRecording
                ? '0 0 28px rgba(220, 38, 38, 0.65)'
                : '0 10px 25px rgba(4, 78, 66, 0.35)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              zIndex: 2,
            }}
          >
            {isRecording ? <Square size={34} fill="#ffffff" /> : <Mic size={38} />}
            <span style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {isRecording ? 'Click to Stop' : 'Click to Speak'}
            </span>
          </button>
        </div>

        {/* Live Recording Progress & Hints */}
        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          {isRecording ? (
            <div>
              <p style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '15px' }}>
                Recording Active ({recordingSeconds}s / 30s) · Click to Stop
              </p>
              <div style={{ width: '220px', height: '6px', background: '#fee2e2', borderRadius: '4px', margin: '8px auto', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: '#dc2626', transition: 'width 0.2s linear' }} />
              </div>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Listening to your voice in real time. Click the button again when you are finished speaking.
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
              {transcript
                ? 'Click the microphone to add more symptoms, or use the buttons below.'
                : 'Click the microphone to speak your symptoms in your preferred language.'}
            </p>
          )}
        </div>

        {/* Explicit Recording Control Button */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="secondary-btn"
              style={{ fontSize: '13px', padding: '8px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
            >
              <Play size={16} />
              <span>{transcript ? 'Add More (Click to Speak)' : 'Click to Speak'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="secondary-btn"
              style={{ fontSize: '13px', padding: '8px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}
            >
              <Square size={16} fill="#dc2626" />
              <span>Click to Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Transcript Text Box Area */}
      <div style={{ marginTop: '14px', border: '2px solid #e2e8f0', borderRadius: '20px', padding: '16px 20px', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Volume2 size={18} style={{ color: '#044e42' }} />
            <strong style={{ fontSize: '14px', color: '#1e293b' }}>Recognized Symptom Transcript</strong>
            {isProcessingAudio && <Loader2 size={16} className="spin" style={{ color: '#044e42' }} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* On-Screen Touch Keyboard Trigger */}
            <button
              type="button"
              onClick={handleOpenKeyboard}
              className="secondary-btn"
              title="Open Touch Keyboard to edit or type"
              style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <Keyboard size={15} />
              <span>Touch Keyboard</span>
            </button>

            {/* Clear (X) Button */}
            {transcript && (
              <button
                type="button"
                onClick={handleClearTranscript}
                className="secondary-btn"
                title="Clear transcript completely"
                style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '10px', color: '#ef4444', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Live Interim + Accumulated Text Display */}
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Your spoken words will appear here automatically in real time. You can also touch and type directly..."
          rows={5}
          style={{
            width: '100%',
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#1e293b',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            background: 'transparent',
            fontFamily: 'inherit',
          }}
        />

        {interimText && (
          <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px', fontSize: '13px', color: '#044e42', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 'bold' }}>Listening:</span>
            <span>&ldquo;{interimText}&rdquo;</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Language:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
              <Sparkles size={12} />
              {LANGUAGE_NAMES[detectedLanguage || language] || (detectedLanguage || language || 'EN').toUpperCase()} (Auto-Detected)
            </span>
          </div>
          <span>{transcript ? `${transcript.trim().split(/\s+/).length} words recorded` : 'No words yet'}</span>
        </div>
      </div>

      {/* Bottom Submit Actions */}
      <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <button
          type="button"
          onClick={handleClearTranscript}
          disabled={!transcript}
          className="secondary-btn"
          style={{ minWidth: '140px', opacity: transcript ? 1 : 0.4, cursor: transcript ? 'pointer' : 'not-allowed' }}
        >
          <RotateCcw size={16} />
          <span>Reset</span>
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || (!transcript.trim() && !interimText.trim())}
          className="primary-btn"
          style={{
            minWidth: '220px',
            padding: '12px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '15px',
            fontWeight: 'bold',
            opacity: isSubmitting || (!transcript.trim() && !interimText.trim()) ? 0.5 : 1,
            cursor: isSubmitting || (!transcript.trim() && !interimText.trim()) ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="spin" />
              <span>Generating AI Summary...</span>
            </>
          ) : (
            <>
              <span>Submit & Continue</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </section>
  );
}
