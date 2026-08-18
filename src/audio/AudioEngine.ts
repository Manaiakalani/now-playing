import {
  analyzeFrame,
  applyEnvelopes,
  compress,
  createAudioFrame,
  createBeatState,
  createEnvelopeState,
  type AudioFrame,
} from "./features.ts";

export type AudioSourceKind = "none" | "demo" | "file" | "mic";

export interface EngineInfo {
  playing: boolean;
  currentTime: number;
  duration: number;
  title: string;
  source: AudioSourceKind;
  error: string | null;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private master: GainNode | null = null;
  private element: HTMLAudioElement | null = null;
  private mediaNode: MediaElementAudioSourceNode | null = null;
  private streamNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private objectUrl: string | null = null;
  private readonly frame: AudioFrame;
  private readonly beat;
  private readonly envelope;
  private lastSample = 0;
  private readonly freqHold: Uint8Array;
  private readonly timeHold: Float32Array;
  private activity = 0;
  private engaged = false;
  private source: AudioSourceKind = "none";
  private title = "Nothing playing";
  private error: string | null = null;
  private listeners = new Set<() => void>();

  constructor() {
    this.frame = createAudioFrame(2048);
    this.beat = createBeatState(1024);
    this.envelope = createEnvelopeState();
    this.freqHold = new Uint8Array(1024);
    this.timeHold = new Float32Array(2048);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  private async ensureGraph(): Promise<AudioContext> {
    if (!this.ctx) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.56;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -18;
      const master = ctx.createGain();
      master.gain.value = 1;
      master.connect(analyser);
      analyser.connect(ctx.destination);
      this.ctx = ctx;
      this.analyser = analyser;
      this.master = master;
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  private disconnectSources(): void {
    this.mediaNode?.disconnect();
    this.mediaNode = null;
    this.streamNode?.disconnect();
    this.streamNode = null;
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.element) {
      this.element.pause();
      this.element.src = "";
      this.element = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private hookElement(el: HTMLAudioElement, ctx: AudioContext): void {
    el.addEventListener("play", () => this.emit());
    el.addEventListener("pause", () => this.emit());
    el.addEventListener("ended", () => this.emit());
    el.addEventListener("timeupdate", () => this.emit());
    el.addEventListener("loadedmetadata", () => this.emit());
    el.addEventListener("error", () => {
      this.error = "Could not decode that audio file.";
      this.emit();
    });
    this.mediaNode = ctx.createMediaElementSource(el);
    if (this.master) this.mediaNode.connect(this.master);
  }

  async playDemo(): Promise<void> {
    this.error = null;
    const ctx = await this.ensureGraph();
    this.disconnectSources();
    const el = new Audio("/demo.wav");
    el.loop = true;
    el.crossOrigin = "anonymous";
    el.preload = "auto";
    this.element = el;
    this.hookElement(el, ctx);
    this.source = "demo";
    this.title = "Demo loop";
    await el.play();
    this.emit();
  }

  async playFile(file: File): Promise<void> {
    this.error = null;
    const ctx = await this.ensureGraph();
    this.disconnectSources();
    const url = URL.createObjectURL(file);
    this.objectUrl = url;
    const el = new Audio(url);
    el.loop = true;
    el.preload = "auto";
    this.element = el;
    this.hookElement(el, ctx);
    this.source = "file";
    this.title = file.name.replace(/\.[^.]+$/, "");
    await el.play();
    this.emit();
  }

  async playMic(): Promise<void> {
    this.error = null;
    const ctx = await this.ensureGraph();
    this.disconnectSources();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false },
        video: false,
      });
      this.stream = stream;
      this.streamNode = ctx.createMediaStreamSource(stream);
      if (this.master) this.streamNode.connect(this.master);
      this.source = "mic";
      this.title = "Microphone";
      this.emit();
    } catch {
      this.error = "Microphone permission was denied.";
      this.source = "none";
      this.title = "Nothing playing";
      this.emit();
    }
  }

  async toggle(): Promise<void> {
    if (this.source === "none") {
      await this.playDemo();
      return;
    }
    if (this.source === "mic") return;
    if (!this.element) return;
    await this.ensureGraph();
    if (this.element.paused) await this.element.play();
    else this.element.pause();
    this.emit();
  }

  seek(ratio: number): void {
    if (!this.element || !Number.isFinite(this.element.duration)) return;
    this.element.currentTime = Math.min(
      this.element.duration,
      Math.max(0, ratio * this.element.duration),
    );
    this.emit();
  }

  getInfo(): EngineInfo {
    const el = this.element;
    const playing =
      this.source === "mic"
        ? true
        : Boolean(el && !el.paused && !el.ended);
    return {
      playing,
      currentTime: el?.currentTime ?? 0,
      duration: el?.duration && Number.isFinite(el.duration) ? el.duration : 0,
      title: this.title,
      source: this.source,
      error: this.error,
    };
  }

  isPlaying(): boolean {
    if (this.source === "mic") return true;
    return Boolean(this.element && !this.element.paused && !this.element.ended);
  }

  sample(): AudioFrame {
    const playing = this.isPlaying();
    if (playing) this.engaged = true;

    const analyser = this.analyser;
    if (analyser && playing) {
      analyser.getFloatTimeDomainData(this.frame.time as Float32Array<ArrayBuffer>);
      analyser.getByteFrequencyData(this.frame.freq as Uint8Array<ArrayBuffer>);
      this.freqHold.set(this.frame.freq);
      this.timeHold.set(this.frame.time);
    } else {
      for (let i = 0; i < this.freqHold.length; i++) {
        this.freqHold[i] = Math.floor((this.freqHold[i] ?? 0) * 0.973);
      }
      for (let i = 0; i < this.timeHold.length; i++) {
        this.timeHold[i] = (this.timeHold[i] ?? 0) * 0.92;
      }
      this.frame.freq.set(this.freqHold);
      this.frame.time.set(this.timeHold);
    }

    analyzeFrame(this.frame, this.beat, this.ctx?.sampleRate ?? 44100);
    const now = performance.now();
    const dt = this.lastSample === 0 ? 1 / 60 : Math.min(0.05, (now - this.lastSample) / 1000);
    this.lastSample = now;
    applyEnvelopes(this.frame, this.envelope, dt);
    this.frame.playing = playing;
    this.frame.engaged = this.engaged;
    const target = compress(this.frame.rms * 3.0 + this.frame.bass * 0.7);
    if (playing) {
      this.activity = this.activity * 0.88 + target * 0.12;
    } else {
      this.activity *= this.engaged ? 0.981 : 0.94;
      if (this.activity < 0.008) this.activity = 0;
    }
    this.frame.activity = this.activity;
    return this.frame;
  }

  dispose(): void {
    this.disconnectSources();
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.master = null;
    this.listeners.clear();
  }
}
