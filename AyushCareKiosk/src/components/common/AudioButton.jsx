import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Loader2, Square } from 'lucide-react';
import { audioService } from '../../services/audioService';
import { getErrorMessage } from '../../services/api';
import { useKioskStore } from '../../store/useKioskStore';

export default function AudioButton({ textToRead, audioPayload = null, label = 'Speak', className = '', autoPlay = false }) {
  const { language, sessionData, audioEnabled } = useKioskStore();
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => { const off = audioService.subscribe(setState); return off; }, []);
  useEffect(() => () => audioService.stop(), []);
  useEffect(() => {
    if (!audioEnabled || audioPayload?.base64 || !textToRead || !sessionData.consultationId) return;
    void audioService.prefetch(sessionData.consultationId, textToRead, language).catch(() => {});
  }, [textToRead, language, sessionData.consultationId, audioEnabled]);
  useEffect(() => {
    // Immediately cut off any previous question's audio as soon as text/payload changes
    audioService.stop();
    if (!autoPlay || !audioEnabled || !textToRead || !sessionData.consultationId) return;
    const timer = window.setTimeout(() => {
      void (audioPayload?.base64
        ? audioService.playPayload({ base64: audioPayload.base64, mime: audioPayload.mime_type || (String(audioPayload.encoding || '').toUpperCase()==='WAV' ? 'audio/wav' : 'audio/mpeg') })
        : audioService.speak(sessionData.consultationId, textToRead, language)
      ).catch((e) => setError(getErrorMessage(e)));
    }, 400);
    return () => {
      window.clearTimeout(timer);
      audioService.stop();
    };
  }, [autoPlay, textToRead, audioPayload?.base64, audioPayload?.encoding, audioPayload?.mime_type, language, sessionData.consultationId, audioEnabled]);

  const toggle = async () => {
    if (!audioEnabled) return;
    if (state === 'playing' || state === 'loading') { audioService.stop(); return; }
    setError('');
    try { await (audioPayload?.base64 ? audioService.playPayload({ base64: audioPayload.base64, mime: audioPayload.mime_type || (String(audioPayload.encoding || '').toUpperCase()==='WAV' ? 'audio/wav' : 'audio/mpeg') }) : audioService.speak(sessionData.consultationId, textToRead, language)); }
    catch (e) { setError(getErrorMessage(e)); }
  };

  return <button type="button" className={`audio-btn ${state === 'playing' ? 'audio-playing' : ''} ${className}`} onClick={toggle} disabled={!audioEnabled} title={error || label} aria-label={error || label}>
    {!audioEnabled ? <VolumeX size={16}/> : state === 'loading' ? <Loader2 className="spin" size={16}/> : state === 'playing' ? <Square size={14}/> : <Volume2 size={16}/>}<span>{state === 'playing' ? 'Stop' : label}</span>
  </button>;
}
