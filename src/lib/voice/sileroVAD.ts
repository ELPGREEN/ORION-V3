/**
 * Silero VAD — Neural Voice Activity Detection for Orion
 * 
 * Adapted from irelate-ai/voice-chat's STT worker implementation.
 * Uses Silero VAD ONNX model via @huggingface/transformers for accurate
 * neural speech detection (vs our previous energy-based RMS approach).
 * 
 * Key advantages over BrowserVAD:
 * - Neural network-based (2MB ONNX model) vs simple energy threshold
 * - Much better at distinguishing speech from noise/music
 * - Proper speech/silence state machine with padding
 * - Configurable speech/exit thresholds
 * 
 * Ref: https://github.com/snakers4/silero-vad
 *      https://github.com/irelate-ai/voice-chat
 */

export interface SileroVADConfig {
  /** Probability threshold for speech start (0-1). Default: 0.5 */
  speechThreshold: number;
  /** Probability threshold to maintain speech state. Default: 0.15 */
  exitThreshold: number;
  /** Minimum silence duration before ending speech (ms). Default: 800 */
  minSilenceDurationMs: number;
  /** Padding around speech boundaries (ms). Default: 80 */
  speechPadMs: number;
  /** Minimum speech duration to be considered valid (ms). Default: 250 */
  minSpeechDurationMs: number;
}

export interface SileroVADEvents {
  onSpeechStart?: () => void;
  onSpeechEnd?: (durationMs: number) => void;
  onVADScore?: (probability: number) => void;
  onModelLoaded?: () => void;
  onError?: (error: string) => void;
}

const DEFAULT_CONFIG: SileroVADConfig = {
  speechThreshold: 0.5,
  exitThreshold: 0.15,
  minSilenceDurationMs: 400,
  speechPadMs: 80,
  minSpeechDurationMs: 250,
};

const SAMPLE_RATE = 16000;
const CHUNK_SIZE = 512; // Silero VAD expects 512 samples at 16kHz

export class SileroVAD {
  private config: SileroVADConfig;
  private events: SileroVADEvents;
  private model: any = null;
  private vadState: any = null;
  private vadSr: any = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private _active = false;
  private _modelLoaded = false;

  // Speech state machine (from irelate-ai/voice-chat)
  private isSpeaking = false;
  private speechStartTime = 0;
  private silenceSamples = 0;
  private readonly minSilenceSamples: number;

  constructor(config?: Partial<SileroVADConfig>, events?: SileroVADEvents) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.events = events || {};
    this.minSilenceSamples = (this.config.minSilenceDurationMs / 1000) * SAMPLE_RATE;
  }

  get active(): boolean { return this._active; }
  get modelLoaded(): boolean { return this._modelLoaded; }
  get speaking(): boolean { return this.isSpeaking; }

  /**
   * Load the Silero VAD ONNX model.
   * ~2MB download, cached in IndexedDB.
   */
  async loadModel(): Promise<boolean> {
    if (this._modelLoaded) return true;

    try {
      const { AutoModel, Tensor, env } = await import("@huggingface/transformers");
      
      // Suppress ONNX warnings
      if ((env as any).backends?.onnx) {
        (env as any).backends.onnx.logSeverityLevel = 3;
      }
      env.useBrowserCache = true;

      console.log("[SileroVAD] Loading model...");
      
      this.model = await (AutoModel as any).from_pretrained("onnx-community/silero-vad", {
        config: { model_type: "custom" } as any,
        dtype: "fp32",
        device: "wasm",
      });

      // Initialize state tensors (from irelate-ai source)
      this.vadSr = new Tensor("int64", BigInt64Array.from([BigInt(SAMPLE_RATE)]), []);
      this.vadState = new Tensor("float32", new Float32Array(2 * 1 * 128), [2, 1, 128]);

      this._modelLoaded = true;
      this.events.onModelLoaded?.();
      console.log("[SileroVAD] ✅ Model loaded (2MB ONNX)");
      return true;
    } catch (err: any) {
      console.warn("[SileroVAD] Failed to load:", err?.message);
      this.events.onError?.(`Model load failed: ${err?.message}`);
      return false;
    }
  }

  /**
   * Run VAD on a single audio chunk.
   * Returns speech probability (0-1).
   */
  async processChunk(audioData: Float32Array): Promise<number> {
    if (!this.model || !this.vadSr || !this.vadState) return 0;

    try {
      const { Tensor } = await import("@huggingface/transformers");
      const input = new Tensor("float32", audioData, [1, audioData.length]);
      const { stateN, output } = await this.model({ input, sr: this.vadSr, state: this.vadState });
      this.vadState = stateN;
      
      const probability = output.data[0] as number;
      this.events.onVADScore?.(probability);

      // State machine
      const isSpeech = probability > this.config.speechThreshold ||
        (this.isSpeaking && probability >= this.config.exitThreshold);

      if (isSpeech) {
        this.silenceSamples = 0;
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.speechStartTime = performance.now();
          this.events.onSpeechStart?.();
        }
      } else if (this.isSpeaking) {
        this.silenceSamples += audioData.length;
        if (this.silenceSamples >= this.minSilenceSamples) {
          const durationMs = performance.now() - this.speechStartTime;
          this.isSpeaking = false;
          this.silenceSamples = 0;
          if (durationMs >= this.config.minSpeechDurationMs) {
            this.events.onSpeechEnd?.(durationMs);
          }
        }
      }

      return probability;
    } catch (err) {
      return 0;
    }
  }

  /**
   * Start real-time VAD on a microphone stream.
   * Uses AudioWorklet to capture 512-sample chunks at 16kHz.
   */
  async start(stream?: MediaStream): Promise<void> {
    if (this._active) return;

    const loaded = await this.loadModel();
    if (!loaded) return;

    try {
      const mediaStream = stream || await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      this.source = this.audioContext.createMediaStreamSource(mediaStream);

      // Use ScriptProcessor as fallback (AudioWorklet requires separate file)
      const processor = this.audioContext.createScriptProcessor(CHUNK_SIZE, 1, 1);
      let buffer = new Float32Array(CHUNK_SIZE);
      let bufferPointer = 0;

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < input.length; i++) {
          buffer[bufferPointer++] = input[i];
          if (bufferPointer >= CHUNK_SIZE) {
            this.processChunk(new Float32Array(buffer));
            bufferPointer = 0;
          }
        }
      };

      this.source.connect(processor);
      processor.connect(this.audioContext.destination);
      
      this._active = true;
      this.isSpeaking = false;
      this.silenceSamples = 0;
      console.log("[SileroVAD] ✅ Started real-time processing");
    } catch (err: any) {
      console.warn("[SileroVAD] Failed to start:", err?.message);
      this.events.onError?.(err?.message);
    }
  }

  /** Stop VAD processing. */
  stop(): void {
    this._active = false;
    try { this.source?.disconnect(); } catch {}
    try {
      if (this.audioContext?.state !== "closed") {
        this.audioContext?.close();
      }
    } catch {}
    this.source = null;
    this.audioContext = null;
    this.isSpeaking = false;
    this.silenceSamples = 0;
    console.log("[SileroVAD] Stopped");
  }

  /** Temporarily increase thresholds during TTS (audio ducking). */
  setDucking(enabled: boolean): void {
    if (enabled) {
      this.config.speechThreshold = 0.85;
      this.config.exitThreshold = 0.7;
    } else {
      this.config.speechThreshold = DEFAULT_CONFIG.speechThreshold;
      this.config.exitThreshold = DEFAULT_CONFIG.exitThreshold;
    }
  }
}

// ─── Singleton ───
let globalSileroVAD: SileroVAD | null = null;

export function getGlobalSileroVAD(events?: SileroVADEvents): SileroVAD {
  if (!globalSileroVAD) {
    globalSileroVAD = new SileroVAD(undefined, events);
  }
  return globalSileroVAD;
}

export function destroyGlobalSileroVAD(): void {
  globalSileroVAD?.stop();
  globalSileroVAD = null;
}

/**
 * Preload Silero VAD model in background.
 * Call early (e.g., on dashboard mount) so it's ready when voice starts.
 */
export function preloadSileroVAD(): void {
  setTimeout(() => {
    const vad = getGlobalSileroVAD();
    vad.loadModel().catch(() => {});
  }, 3000);
}
