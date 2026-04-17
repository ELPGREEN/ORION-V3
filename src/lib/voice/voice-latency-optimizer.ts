/**
 * Orion V3 - Voice Pipeline Latency Optimizer
 * 
 * Problems identified:
 * 1. GCP STT silence: 4000ms (4 seconds!) - TOO LONG
 * 2. Silero VAD minSilence: 800ms - Can be faster
 * 3. No speech timeout: 2500ms - Can be faster
 * 4. Restart delay: 1500ms - Can be faster
 * 
 * Target latencies:
 * - STT silence: 1000ms (was 4000ms) = 4x faster
 * - VAD min silence: 400ms (was 800ms) = 2x faster
 * - No speech timeout: 1500ms (was 2500ms) = 1.7x faster
 * - Restart delay: 500ms (was 1500ms) = 3x faster
 */

export interface VoiceLatencyConfig {
  // STT settings
  sttSilenceMs: number;
  sttSpeechThreshold: number;
  
  // VAD settings  
  vadMinSilenceMs: number;
  vadSpeechThreshold: number;
  vadExitThreshold: number;
  
  // Timeouts
  noSpeechTimeoutMs: number;
  restartDelayMs: number;
  
  // TTS settings
  ttsStreamingEnabled: boolean;
  ttsFirstChunkMs: number;
}

export const FAST_VOICE_CONFIG: VoiceLatencyConfig = {
  sttSilenceMs: 1000,
  sttSpeechThreshold: 0.008,
  
  vadMinSilenceMs: 400,
  vadSpeechThreshold: 0.5,
  vadExitThreshold: 0.15,
  
  noSpeechTimeoutMs: 1500,
  restartDelayMs: 500,
  
  ttsStreamingEnabled: true,
  ttsFirstChunkMs: 300,
};

export const ULTRA_FAST_VOICE_CONFIG: VoiceLatencyConfig = {
  sttSilenceMs: 600,
  sttSpeechThreshold: 0.01,
  
  vadMinSilenceMs: 300,
  vadSpeechThreshold: 0.6,
  vadExitThreshold: 0.2,
  
  noSpeechTimeoutMs: 1000,
  restartDelayMs: 300,
  
  ttsStreamingEnabled: true,
  ttsFirstChunkMs: 200,
};

export interface VoiceLatencyMetrics {
  sttLatencyMs: number;
  llmLatencyMs: number;
  ttsLatencyMs: number;
  totalRoundTripMs: number;
  vadDetectionsPerSecond: number;
  droppedSpeechEvents: number;
}

export class VoiceLatencyOptimizer {
  private config: VoiceLatencyConfig;
  private metrics: VoiceLatencyMetrics;
  private lastSpeechAt = 0;
  private lastSTTAt = 0;
  private lastLLMAt = 0;
  private lastTTSAt = 0;

  constructor(config: Partial<VoiceLatencyConfig> = {}) {
    this.config = { ...FAST_VOICE_CONFIG, ...config };
    this.metrics = {
      sttLatencyMs: 0,
      llmLatencyMs: 0,
      ttsLatencyMs: 0,
      totalRoundTripMs: 0,
      vadDetectionsPerSecond: 0,
      droppedSpeechEvents: 0,
    };
  }

  markSpeechDetected(): void {
    this.lastSpeechAt = Date.now();
  }

  markSTTComplete(transcriptLength: number): void {
    this.lastSTTAt = Date.now();
    this.metrics.sttLatencyMs = this.lastSTTAt - this.lastSpeechAt;
  }

  markLLMStart(): void {
    this.lastLLMAt = Date.now();
  }

  markLLMComplete(): void {
    const now = Date.now();
    this.metrics.llmLatencyMs = now - this.lastLLMAt;
  }

  markTTSStart(): void {
    this.lastTTSAt = Date.now();
  }

  markTTSComplete(): void {
    const now = Date.now();
    this.metrics.ttsLatencyMs = now - this.lastTTSAt;
    this.metrics.totalRoundTripMs = now - this.lastSpeechAt;
  }

  shouldSendToSTT(audioLevel: number): boolean {
    return audioLevel > this.config.sttSpeechThreshold;
  }

  shouldFlushUtterance(silenceMs: number): boolean {
    return silenceMs >= this.config.sttSilenceMs;
  }

  getMetrics(): VoiceLatencyMetrics {
    return { ...this.metrics };
  }

  getGrade(): 'A+' | 'A' | 'B' | 'C' | 'D' {
    const total = this.metrics.totalRoundTripMs;
    if (total < 1500) return 'A+';
    if (total < 2500) return 'A';
    if (total < 4000) return 'B';
    if (total < 6000) return 'C';
    return 'D';
  }

  getConfig(): VoiceLatencyConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<VoiceLatencyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  suggestOptimizations(): string[] {
    const suggestions: string[] = [];
    
    if (this.config.sttSilenceMs > 1500) {
      suggestions.push('Reduce STT silence threshold for faster responses');
    }
    if (this.config.vadMinSilenceMs > 500) {
      suggestions.push('Reduce VAD minimum silence for quicker turn detection');
    }
    if (this.metrics.totalRoundTripMs > 3000) {
      suggestions.push('Consider using a faster LLM provider or local inference');
    }
    if (this.metrics.droppedSpeechEvents > 5) {
      suggestions.push('Audio processing may be overloaded - reduce concurrent tasks');
    }
    
    return suggestions;
  }
}

let optimizerInstance: VoiceLatencyOptimizer | null = null;

export function getVoiceLatencyOptimizer(): VoiceLatencyOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new VoiceLatencyOptimizer();
  }
  return optimizerInstance;
}

export function applyVoiceOptimizations(): void {
  const optimizer = getVoiceLatencyOptimizer();
  console.log('[VoiceOptimizer] Applying voice latency optimizations...');
  console.log('[VoiceOptimizer] Config:', optimizer.getConfig());
  console.log('[VoiceOptimizer] Grade:', optimizer.getGrade());
}

export function getVoicePipelineStats(): {
  latencyMs: number;
  grade: string;
  config: VoiceLatencyConfig;
  optimizations: string[];
} {
  const optimizer = getVoiceLatencyOptimizer();
  return {
    latencyMs: optimizer.getMetrics().totalRoundTripMs,
    grade: optimizer.getGrade(),
    config: optimizer.getConfig(),
    optimizations: optimizer.suggestOptimizations(),
  };
}
