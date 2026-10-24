import { kioskApi } from './api';

/** Server-generated audio controller. Bhashini is reached only through Node/Python. */
export class AudioService {
  constructor(apiClient = kioskApi, AudioCtor = typeof window !== 'undefined' ? window.Audio : null) {
    this.api = apiClient;
    this.AudioCtor = AudioCtor;
    this.activeAudio = null;
    this.cache = new Map();
    this.requestVersion = 0;
    this.listeners = new Set();
    this.state = 'idle';
  }

  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(state) { this.state = state; this.listeners.forEach((fn) => { try { fn(state); } catch {} }); }

  stop() {
    this.requestVersion += 1;
    if (this.activeAudio) {
      try {
        this.activeAudio.onplay = null;
        this.activeAudio.onended = null;
        this.activeAudio.onerror = null;
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
        this.activeAudio.src = '';
      } catch {}
      this.activeAudio = null;
    }
    this.emit('idle');
  }

  _key(sessionId, text, language) { return `${sessionId}:${language}:${text}`; }

  async prefetch(sessionId, text, language) {
    if (!sessionId || !text) return null;
    const key = this._key(sessionId, text, language);
    if (this.cache.has(key)) return this.cache.get(key);
    const response = await this.api.tts(sessionId, text, language);
    const base64 = response?.audio_base64 || response?.audio?.base64;
    if (!base64) throw new Error('The speech service returned no audio.');
    const payload = {
      base64,
      mime: response?.mime_type || (String(response?.encoding || '').toUpperCase() === 'WAV' ? 'audio/wav' : 'audio/mpeg'),
      encoding: response?.encoding || 'WAV',
    };
    this.cache.set(key, payload);
    if (this.cache.size > 96) this.cache.delete(this.cache.keys().next().value);
    return payload;
  }

  async playPayload(payload) {
    if (!payload?.base64 || !this.AudioCtor) throw new Error('The speech service returned no audio.');
    this.stop();
    const version = ++this.requestVersion;
    this.emit('loading');
    const audio = new this.AudioCtor(`data:${payload.mime || 'audio/wav'};base64,${payload.base64}`);
    this.activeAudio = audio;
    audio.onplay = () => { if (version === this.requestVersion) this.emit('playing'); };
    audio.onended = () => { if (this.activeAudio === audio) { this.activeAudio = null; this.emit('idle'); } };
    audio.onerror = () => { if (this.activeAudio === audio) { this.activeAudio = null; this.emit('error'); } };
    if (version !== this.requestVersion) return null;
    await audio.play();
    return audio;
  }

  async speak(sessionId, text, language, { useCache = true } = {}) {
    if (!sessionId || !text) throw new Error('A session and text are required for speech.');
    // Stop any active or lingering audio immediately before beginning network request
    this.stop();
    const version = ++this.requestVersion;
    this.emit('loading');
    let payload = useCache ? this.cache.get(this._key(sessionId, text, language)) : null;
    if (!payload) payload = await this.prefetch(sessionId, text, language);
    if (version !== this.requestVersion) return null;
    if (!this.AudioCtor) throw new Error('Audio playback is not supported by this device.');
    const audio = new this.AudioCtor(`data:${payload.mime};base64,${payload.base64}`);
    this.activeAudio = audio;
    audio.onplay = () => { if (version === this.requestVersion) this.emit('playing'); };
    audio.onended = () => { if (this.activeAudio === audio) { this.activeAudio = null; this.emit('idle'); } };
    audio.onerror = () => { if (this.activeAudio === audio) { this.activeAudio = null; this.emit('error'); } };
    await audio.play();
    return audio;
  }

  async speakPage(sessionId, text, language) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean || !sessionId) return;
    const currentVersion = this.requestVersion;
    const sentences = clean.match(/[^.!?।]+[.!?।]?/g) || [clean];
    const chunks = [];
    let current = '';
    for (const sentence of sentences) {
      if ((current + ' ' + sentence).trim().length > 700 && current) { chunks.push(current.trim()); current = ''; }
      current += ` ${sentence}`;
    }
    if (current.trim()) chunks.push(current.trim());
    for (const chunk of chunks.slice(0, 5)) {
      if (this.state === 'muted' || this.requestVersion !== currentVersion) return;
      await this.speak(sessionId, chunk, language);
      if (this.requestVersion !== currentVersion) return;
      await new Promise((resolve) => {
        const off = this.subscribe((state) => { if (state === 'idle' || state === 'error') { off(); resolve(); } });
      });
      if (this.requestVersion !== currentVersion) return;
    }
  }
}

export const audioService = new AudioService();
export default audioService;
