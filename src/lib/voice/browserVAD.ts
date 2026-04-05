/**
 * Browser-Side Voice Activity Detection (VAD) for Orion
 * 
 * Inspired by TEN VAD (https://github.com/TEN-framework/ten-vad):
 * - Frame-level speech detection using audio energy analysis
 * - Low-latency speech boundary detection
 * - Lightweight (no WASM/model download needed)
 * 
 * Uses Web Audio API to analyze microphone input energy in real-time.
 * Provides speech start/end events with configurable thresholds.
 */

export interface VADConfig {
  /** Energy threshold for speech detection (0-1). Default: 0.015 */
  energyThreshold: number;
  /** Frames of silence before declaring speech end. Default: 12 (~192ms at 60fps) */
  silenceFrames: number;
  /** Minimum speech duration in ms to be considered valid. Default: 200 */
  minSpeechDurationMs: number;
  /** Frame size in samples. Default: 256 (16ms at 16kHz, like TEN VAD) */
  frameSize: number;
}

export interface VADEvents {
  onSpeechStart?: () => void;
  onSpeechEnd?: (durationMs: number) => void;
  onVADScore?: (probability: number) => void;
}

const DEFAULT_CONFIG: VADConfig = {
  energyThreshold: 0.015,
  silenceFrames: 12,
  minSpeechDurationMs: 200,
  frameSize: 256,
};

export class BrowserVAD {
  private config: VADConfig;
  private events: VADEvents;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private isSpeaking = false;
  private silenceCounter = 0;
  private speechStartTime = 0;
  private dataArray: Float32Array | null = null;
  private _active = false;

  // Adaptive threshold (TEN VAD insight: adapt to ambient noise)
  private noiseFloor = 0.005;
  private noiseFrames = 0;
  private readonly NOISE_ADAPTATION_FRAMES = 30; // ~500ms of initial calibration

  constructor(config?: Partial<VADConfig>, events?: VADEvents) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.events = events || {};
  }

  get active(): boolean {
    return this._active;
  }

  get speaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Start VAD processing on a media stream.
   * Can be called with an existing stream (e.g., from SpeechRecognition).
   */
  async start(stream?: MediaStream): Promise<void> {
    if (this._active) return;

    try {
      const mediaStream = stream || await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.frameSize * 2;
      this.analyser.smoothingTimeConstant = 0.3;
      this.source.connect(this.analyser);

      this.dataArray = new Float32Array(this.analyser.fftSize);
      this._active = true;
      this.noiseFrames = 0;
      this.noiseFloor = 0.005;
      this.silenceCounter = 0;
      this.isSpeaking = false;

      this.processFrame();
      console.log("[BrowserVAD] ✅ Started (frame=" + this.config.frameSize + " samples)");
    } catch (err) {
      console.warn("[BrowserVAD] Failed to start:", err);
    }
  }

  /** Stop VAD processing and release resources. */
  stop(): void {
    this._active = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch {}
      this.source = null;
    }
    if (this.audioContext?.state !== "closed") {
      try { this.audioContext?.close(); } catch {}
    }
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.isSpeaking = false;
    console.log("[BrowserVAD] Stopped");
  }

  /** Update config dynamically (e.g., reduce sensitivity during TTS) */
  updateConfig(partial: Partial<VADConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /** Temporarily increase threshold during TTS (audio ducking from TEN insights) */
  setDucking(enabled: boolean): void {
    if (enabled) {
      this.config.energyThreshold = 0.08; // Much less sensitive during TTS
      this.config.silenceFrames = 20;
    } else {
      this.config.energyThreshold = DEFAULT_CONFIG.energyThreshold;
      this.config.silenceFrames = DEFAULT_CONFIG.silenceFrames;
    }
  }

  private processFrame = (): void => {
    if (!this._active || !this.analyser || !this.dataArray) return;

    this.analyser.getFloatTimeDomainData(this.dataArray as Float32Array<ArrayBuffer>);

    // Calculate RMS energy (same metric as TEN VAD)
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sum / this.dataArray.length);

    // Adaptive noise floor calibration (first ~500ms)
    if (this.noiseFrames < this.NOISE_ADAPTATION_FRAMES) {
      this.noiseFloor = this.noiseFloor * 0.9 + rms * 0.1;
      this.noiseFrames++;
    } else {
      // Slow adaptation to ambient noise changes
      if (!this.isSpeaking && rms < this.config.energyThreshold) {
        this.noiseFloor = this.noiseFloor * 0.995 + rms * 0.005;
      }
    }

    // Effective threshold = max(configured, noiseFloor * 2.5)
    const effectiveThreshold = Math.max(
      this.config.energyThreshold,
      this.noiseFloor * 2.5,
    );

    // Voice probability (0-1 scale like TEN VAD's VadResult)
    const probability = Math.min(1, rms / (effectiveThreshold * 3));
    this.events.onVADScore?.(probability);

    const voiceDetected = rms > effectiveThreshold;

    if (voiceDetected) {
      this.silenceCounter = 0;
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.speechStartTime = performance.now();
        this.events.onSpeechStart?.();
      }
    } else if (this.isSpeaking) {
      this.silenceCounter++;
      if (this.silenceCounter >= this.config.silenceFrames) {
        const durationMs = performance.now() - this.speechStartTime;
        this.isSpeaking = false;
        this.silenceCounter = 0;

        if (durationMs >= this.config.minSpeechDurationMs) {
          this.events.onSpeechEnd?.(durationMs);
        }
      }
    }

    this.animFrameId = requestAnimationFrame(this.processFrame);
  };
}

/** Singleton instance for global VAD */
let globalVAD: BrowserVAD | null = null;

export function getGlobalVAD(events?: VADEvents): BrowserVAD {
  if (!globalVAD) {
    globalVAD = new BrowserVAD(undefined, events);
  }
  return globalVAD;
}

export function destroyGlobalVAD(): void {
  globalVAD?.stop();
  globalVAD = null;
}
