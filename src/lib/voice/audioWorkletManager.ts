/**
 * Orion Audio Worklet Manager
 * 
 * Manages the AudioWorkletProcessor lifecycle and provides a clean API
 * for the voice system to capture audio off the main thread.
 * 
 * Inspired by echo-albertina's AudioWorkletProcessor architecture.
 * 
 * Usage:
 *   const manager = new AudioWorkletManager();
 *   await manager.initialize();
 *   manager.onEnergy((energy, isSpeech) => { ... });
 *   manager.onAudioChunk((chunk) => { ... });
 *   await manager.start();
 *   manager.stop();
 */

export interface AudioWorkletConfig {
  chunkSize?: number;          // Samples per chunk (default: 4096)
  silenceThreshold?: number;   // RMS threshold for speech (default: 0.01)
  energySmoothing?: number;    // Smoothing factor 0-1 (default: 0.95)
  sampleRate?: number;         // Target sample rate (default: 16000)
}

type EnergyCallback = (energy: number, isSpeech: boolean) => void;
type AudioChunkCallback = (chunk: Float32Array, sampleRate: number) => void;

export class AudioWorkletManager {
  private context: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private initialized = false;
  private running = false;
  private config: Required<AudioWorkletConfig>;

  private energyCallbacks: Set<EnergyCallback> = new Set();
  private chunkCallbacks: Set<AudioChunkCallback> = new Set();

  constructor(config: AudioWorkletConfig = {}) {
    this.config = {
      chunkSize: config.chunkSize ?? 4096,
      silenceThreshold: config.silenceThreshold ?? 0.01,
      energySmoothing: config.energySmoothing ?? 0.95,
      sampleRate: config.sampleRate ?? 16000,
    };
  }

  /** Check if AudioWorklet is supported */
  static isSupported(): boolean {
    return typeof AudioContext !== "undefined" && 
           typeof AudioWorkletNode !== "undefined";
  }

  /** Initialize the AudioWorklet module (call once) */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    if (!AudioWorkletManager.isSupported()) {
      console.warn("[AudioWorklet] Not supported in this browser");
      return false;
    }

    try {
      this.context = new AudioContext({ sampleRate: this.config.sampleRate });
      await this.context.audioWorklet.addModule("/audioWorkletProcessor.js");
      this.initialized = true;
      console.log("[AudioWorklet] ✅ Module loaded, sample rate:", this.config.sampleRate);
      return true;
    } catch (err) {
      console.error("[AudioWorklet] Failed to initialize:", err);
      return false;
    }
  }

  /** Start capturing audio from the microphone */
  async start(): Promise<boolean> {
    if (this.running) return true;
    if (!this.initialized) {
      const ok = await this.initialize();
      if (!ok) return false;
    }

    try {
      // Resume context if suspended (autoplay policy)
      if (this.context!.state === "suspended") {
        await this.context!.resume();
      }

      // Get microphone stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.config.sampleRate,
        },
      });

      // Create source and worklet nodes
      this.sourceNode = this.context!.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.context!, "orion-audio-processor", {
        processorOptions: {
          chunkSize: this.config.chunkSize,
          silenceThreshold: this.config.silenceThreshold,
          energySmoothing: this.config.energySmoothing,
        },
      });

      // Listen for messages from the processor
      this.workletNode.port.onmessage = (event) => {
        const { type } = event.data;

        if (type === "energy") {
          const { energy, isSpeech } = event.data;
          this.energyCallbacks.forEach(cb => cb(energy, isSpeech));
        } else if (type === "audio_chunk") {
          const chunk = new Float32Array(event.data.chunk);
          this.chunkCallbacks.forEach(cb => cb(chunk, this.config.sampleRate));
        }
      };

      // Connect: mic → worklet (no output connection = no feedback)
      this.sourceNode.connect(this.workletNode);
      // Connect to destination to keep the graph alive (silent)
      this.workletNode.connect(this.context!.destination);

      this.running = true;
      console.log("[AudioWorklet] 🎙️ Capturing started");
      return true;
    } catch (err) {
      console.error("[AudioWorklet] Failed to start:", err);
      this.cleanup();
      return false;
    }
  }

  /** Stop capturing */
  stop(): void {
    if (!this.running) return;
    this.cleanup();
    this.running = false;
    console.log("[AudioWorklet] ⏹️ Capturing stopped");
  }

  /** Enable/disable audio ducking (reduces mic sensitivity during TTS) */
  setDucking(enabled: boolean): void {
    this.workletNode?.port.postMessage({ type: "set_ducking", data: enabled });
  }

  /** Pause/resume processing without stopping the mic */
  setActive(active: boolean): void {
    this.workletNode?.port.postMessage({ type: "set_active", data: active });
  }

  /** Subscribe to energy updates (~30Hz) */
  onEnergy(callback: EnergyCallback): () => void {
    this.energyCallbacks.add(callback);
    return () => this.energyCallbacks.delete(callback);
  }

  /** Subscribe to audio chunks */
  onAudioChunk(callback: AudioChunkCallback): () => void {
    this.chunkCallbacks.add(callback);
    return () => this.chunkCallbacks.delete(callback);
  }

  /** Get current state */
  get isRunning() { return this.running; }
  get isInitialized() { return this.initialized; }
  get sampleRate() { return this.config.sampleRate; }

  /** Destroy everything */
  destroy(): void {
    this.cleanup();
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }
    this.initialized = false;
    this.energyCallbacks.clear();
    this.chunkCallbacks.clear();
    console.log("[AudioWorklet] 🗑️ Destroyed");
  }

  private cleanup(): void {
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch { }
      this.sourceNode = null;
    }
    if (this.workletNode) {
      try { this.workletNode.disconnect(); } catch { }
      this.workletNode.port.onmessage = null;
      this.workletNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}

/** Singleton instance for the app */
let _instance: AudioWorkletManager | null = null;

export function getAudioWorkletManager(config?: AudioWorkletConfig): AudioWorkletManager {
  if (!_instance) {
    _instance = new AudioWorkletManager(config);
  }
  return _instance;
}
