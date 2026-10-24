export class SpeechRecorder {
  constructor({ MediaRecorderCtor = window.MediaRecorder, navigatorObject = navigator } = {}) {
    this.MediaRecorderCtor = MediaRecorderCtor;
    this.navigatorObject = navigatorObject;
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.mimeType = '';
  }

  static isSupported() {
    return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  }

  async start() {
    if (!SpeechRecorder.isSupported()) {
      throw new Error('This device does not support microphone recording.');
    }
    if (this.recorder?.state === 'recording') return;

    this.stream = await this.navigatorObject.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.chunks = [];
    this.recorder = new this.MediaRecorderCtor(this.stream);
    this.mimeType = this.recorder.mimeType || 'audio/webm';

    return new Promise((resolve, reject) => {
      this.recorder.ondataavailable = (event) => {
        if (event.data?.size) this.chunks.push(event.data);
      };
      this.recorder.onerror = (event) => reject(event.error || new Error('Microphone recording failed.'));
      this.recorder.onstart = () => resolve();
      this.recorder.start(250);
    });
  }

  async stop() {
    const recorder = this.recorder;
    if (!recorder || recorder.state !== 'recording') return null;

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        const blob = this.chunks.length
          ? new Blob(this.chunks, { type: this.mimeType || 'audio/webm' })
          : null;
        this.release();
        resolve(blob);
      };
      recorder.onerror = (event) => {
        this.release();
        reject(event.error || new Error('Microphone recording failed.'));
      };
      recorder.stop();
    });
  }

  cancel() {
    try {
      if (this.recorder?.state === 'recording') this.recorder.stop();
    } finally {
      this.release();
    }
  }

  release() {
    this.stream?.getTracks?.().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }
}

export default SpeechRecorder;
