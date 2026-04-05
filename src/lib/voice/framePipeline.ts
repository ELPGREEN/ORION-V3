/**
 * Pipecat-Inspired Frame Pipeline Engine for Orion Voice
 * 
 * Implements a typed, async frame pipeline: STT → Process → TTS
 * with support for parallel pre-processing, interruption (barge-in),
 * and extensible middleware processors.
 * 
 * Architecture:
 *   FrameSource → Processor[] → FrameSink
 *   Each processor transforms frames and passes them downstream.
 *   The pipeline supports cancellation via AbortController.
 */

// ═══════════════════════════════════════════════════════════
//  Frame Types — typed union for all pipeline messages
// ═══════════════════════════════════════════════════════════

export type FrameType =
  | "stt_start"        // Mic activated
  | "stt_interim"      // Partial transcript (with progressive confidence)
  | "stt_final"        // Final transcript
  | "stt_end"          // Mic deactivated
  | "speech_start"     // Vox-inspired: neural VAD detected speech onset
  | "speech_end"       // Vox-inspired: neural VAD detected speech offset
  | "llm_start"        // LLM processing started
  | "llm_chunk"        // Streaming LLM token
  | "llm_complete"     // Full LLM response ready
  | "tts_start"        // TTS synthesis started
  | "tts_chunk"        // Audio chunk ready for playback
  | "tts_complete"     // TTS finished speaking
  | "interrupt"        // Barge-in detected
  | "system"           // Pipeline system events
  | "vad"              // Voice Activity Detection signal
  | "error";           // Error in any stage

export interface Frame<T = unknown> {
  type: FrameType;
  timestamp: number;
  payload: T;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════
//  Payload interfaces for each frame type
// ═══════════════════════════════════════════════════════════

export interface STTPayload {
  transcript: string;
  confidence?: number;
  /** Vox-inspired: stability score (0-1) — how stable this partial is */
  stability?: number;
  /** Duration of audio processed so far in ms */
  durationMs?: number;
  /** Processing latency in ms */
  processingTimeMs?: number;
  lang?: string;
  /** Whether this is the final result in a sequence */
  isFinal?: boolean;
}

/** Vox-inspired: speech lifecycle events from neural VAD */
export interface SpeechLifecyclePayload {
  /** Duration of the speech segment in ms (only on speech_end) */
  durationMs?: number;
  /** VAD probability at the boundary */
  vadProbability?: number;
  /** Number of STT partials received during this speech segment */
  partialsCount?: number;
  /** The accumulated transcript at speech end (if available) */
  transcript?: string;
}

export interface LLMPayload {
  text: string;
  provider?: string;
  tokensUsed?: number;
}

export interface TTSPayload {
  text?: string;
  audioData?: ArrayBuffer;
  tier?: string;
}

export interface VADPayload {
  isSpeech: boolean;
  probability: number;
}

export interface InterruptPayload {
  reason: "barge_in" | "manual_stop" | "timeout" | "error";
  source?: string;
}

export interface SystemPayload {
  event: string;
  detail?: string;
}

// ═══════════════════════════════════════════════════════════
//  Frame Factories — convenience constructors
// ═══════════════════════════════════════════════════════════

function createFrame<T>(type: FrameType, payload: T, meta?: Record<string, unknown>): Frame<T> {
  return { type, timestamp: Date.now(), payload, metadata: meta };
}

export const Frames = {
  sttStart:    ()                          => createFrame<null>("stt_start", null),
  sttInterim:  (transcript: string, opts?: { stability?: number; durationMs?: number; processingTimeMs?: number }) =>
    createFrame<STTPayload>("stt_interim", { transcript, stability: opts?.stability, durationMs: opts?.durationMs, processingTimeMs: opts?.processingTimeMs }),
  sttFinal:    (transcript: string, conf?: number, durationMs?: number) =>
    createFrame<STTPayload>("stt_final", { transcript, confidence: conf, durationMs, isFinal: true }),
  sttEnd:      ()                          => createFrame<null>("stt_end", null),

  // Vox-inspired speech lifecycle frames
  speechStart: (vadProbability?: number)   => createFrame<SpeechLifecyclePayload>("speech_start", { vadProbability }),
  speechEnd:   (durationMs: number, opts?: { partialsCount?: number; transcript?: string; vadProbability?: number }) =>
    createFrame<SpeechLifecyclePayload>("speech_end", { durationMs, ...opts }),

  llmStart:    ()                          => createFrame<null>("llm_start", null),
  llmChunk:    (text: string)              => createFrame<LLMPayload>("llm_chunk", { text }),
  llmComplete: (text: string, provider?: string) => createFrame<LLMPayload>("llm_complete", { text, provider }),
  ttsStart:    (tier: string)              => createFrame<TTSPayload>("tts_start", { tier }),
  ttsChunk:    (audioData: ArrayBuffer)    => createFrame<TTSPayload>("tts_chunk", { audioData }),
  ttsComplete: ()                          => createFrame<null>("tts_complete", null),
  interrupt:   (reason: InterruptPayload["reason"]) => createFrame<InterruptPayload>("interrupt", { reason }),
  vad:         (isSpeech: boolean, prob: number) => createFrame<VADPayload>("vad", { isSpeech, probability: prob }),
  system:      (event: string, detail?: string) => createFrame<SystemPayload>("system", { event, detail }),
  error:       (message: string)           => createFrame<{ message: string }>("error", { message }),
};

// ═══════════════════════════════════════════════════════════
//  Processor — transform/filter/fork frames
// ═══════════════════════════════════════════════════════════

export type FrameHandler = (frame: Frame, push: (frame: Frame) => void) => void | Promise<void>;

export interface FrameProcessor {
  name: string;
  /** Which frame types this processor handles. Empty = all. */
  handles?: FrameType[];
  /** Process a frame and optionally push downstream frames */
  process: FrameHandler;
  /** Called when pipeline is destroyed */
  destroy?: () => void;
}

// ═══════════════════════════════════════════════════════════
//  Pipeline — the main orchestrator
// ═══════════════════════════════════════════════════════════

export type PipelineEventCallback = (frame: Frame) => void;

export class VoicePipeline {
  private processors: FrameProcessor[] = [];
  private listeners: Map<FrameType | "*", Set<PipelineEventCallback>> = new Map();
  private abortController: AbortController | null = null;
  private _isRunning = false;
  private frameCount = 0;
  private startTime = 0;

  get isRunning() { return this._isRunning; }
  get stats() {
    return {
      processors: this.processors.length,
      frameCount: this.frameCount,
      uptimeMs: this._isRunning ? Date.now() - this.startTime : 0,
    };
  }

  /** Add a processor to the pipeline */
  use(processor: FrameProcessor): this {
    this.processors.push(processor);
    return this;
  }

  /** Listen for specific frame types or "*" for all */
  on(type: FrameType | "*", callback: PipelineEventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => this.listeners.get(type)?.delete(callback);
  }

  /** Start the pipeline */
  start(): void {
    if (this._isRunning) return;
    this.abortController = new AbortController();
    this._isRunning = true;
    this.startTime = Date.now();
    this.frameCount = 0;
    this.emit(Frames.system("pipeline_start", `${this.processors.length} processors`));
    console.log(`[Pipeline] ▶️ Started with ${this.processors.length} processors`);
  }

  /** Stop the pipeline and clean up */
  stop(): void {
    if (!this._isRunning) return;
    this.abortController?.abort();
    this._isRunning = false;
    this.emit(Frames.system("pipeline_stop", `Processed ${this.frameCount} frames`));
    console.log(`[Pipeline] ⏹️ Stopped — ${this.frameCount} frames processed`);
  }

  /** Destroy the pipeline and all processors */
  destroy(): void {
    this.stop();
    this.processors.forEach(p => p.destroy?.());
    this.processors = [];
    this.listeners.clear();
  }

  /** Push a frame into the pipeline */
  async push(frame: Frame): Promise<void> {
    if (!this._isRunning) return;
    if (this.abortController?.signal.aborted) return;

    this.frameCount++;

    // Handle interrupt — cancel all pending work
    if (frame.type === "interrupt") {
      this.abortController?.abort();
      this.abortController = new AbortController();
      this.notifyListeners(frame);
      return;
    }

    // Process through the chain
    await this.processChain(frame, 0);
  }

  /** Emit a frame directly to listeners (bypasses processors) */
  emit(frame: Frame): void {
    this.notifyListeners(frame);
  }

  private async processChain(frame: Frame, startIdx: number): Promise<void> {
    if (this.abortController?.signal.aborted) return;

    if (startIdx >= this.processors.length) {
      // End of chain — notify listeners
      this.notifyListeners(frame);
      return;
    }

    const processor = this.processors[startIdx];

    // Check if processor handles this frame type
    if (processor.handles && processor.handles.length > 0 && !processor.handles.includes(frame.type)) {
      // Skip this processor, pass frame downstream
      await this.processChain(frame, startIdx + 1);
      return;
    }

    // Process and collect downstream frames
    try {
      await processor.process(frame, (downstream: Frame) => {
        // Recursively process through remaining processors
        this.processChain(downstream, startIdx + 1);
      });
    } catch (err) {
      console.error(`[Pipeline] Error in processor "${processor.name}":`, err);
      this.notifyListeners(Frames.error(`Processor ${processor.name}: ${err}`));
    }
  }

  private notifyListeners(frame: Frame): void {
    // Notify type-specific listeners
    this.listeners.get(frame.type)?.forEach(cb => {
      try { cb(frame); } catch (e) { console.error("[Pipeline] Listener error:", e); }
    });
    // Notify wildcard listeners
    this.listeners.get("*")?.forEach(cb => {
      try { cb(frame); } catch (e) { console.error("[Pipeline] Wildcard listener error:", e); }
    });
  }
}

// ═══════════════════════════════════════════════════════════
//  Built-in Processors
// ═══════════════════════════════════════════════════════════

/** Logs all frames passing through (debug) */
export function createLogProcessor(tag = "Pipeline"): FrameProcessor {
  return {
    name: "log",
    process(frame, push) {
      const preview = frame.type === "stt_final" || frame.type === "stt_interim"
        ? ` "${(frame.payload as STTPayload).transcript?.slice(0, 40)}..."`
        : frame.type === "llm_complete"
        ? ` [${(frame.payload as LLMPayload).text?.length} chars]`
        : "";
      console.log(`[${tag}] 📦 ${frame.type}${preview}`);
      push(frame);
    },
  };
}

/** Filters out interim STT results below a confidence threshold */
export function createConfidenceFilter(minConfidence = 0.6): FrameProcessor {
  return {
    name: "confidence-filter",
    handles: ["stt_final"],
    process(frame, push) {
      const payload = frame.payload as STTPayload;
      if ((payload.confidence ?? 1) >= minConfidence) {
        push(frame);
      } else {
        console.log(`[Pipeline] 🚫 Dropped low-confidence: "${payload.transcript}" (${payload.confidence})`);
      }
    },
  };
}

/** Debounces rapid STT finals (prevents double-send from recognition restarts) */
export function createDeduplicator(windowMs = 800): FrameProcessor {
  let lastTranscript = "";
  let lastTime = 0;

  return {
    name: "deduplicator",
    handles: ["stt_final"],
    process(frame, push) {
      const payload = frame.payload as STTPayload;
      const now = Date.now();

      if (payload.transcript === lastTranscript && now - lastTime < windowMs) {
        console.log(`[Pipeline] 🔄 Deduplicated: "${payload.transcript.slice(0, 30)}..."`);
        return;
      }

      lastTranscript = payload.transcript;
      lastTime = now;
      push(frame);
    },
  };
}

/** Barge-in detector — emits interrupt when user speaks during TTS */
export function createBargeInDetector(minChars = 8): FrameProcessor {
  let isTTSActive = false;
  let lastTTSText = "";

  return {
    name: "barge-in",
    handles: ["tts_start", "tts_complete", "stt_final"],
    process(frame, push) {
      if (frame.type === "tts_start") {
        isTTSActive = true;
        lastTTSText = (frame.payload as TTSPayload).text || "";
        push(frame);
        return;
      }

      if (frame.type === "tts_complete") {
        isTTSActive = false;
        lastTTSText = "";
        push(frame);
        return;
      }

      if (frame.type === "stt_final" && isTTSActive) {
        const transcript = (frame.payload as STTPayload).transcript;
        
        // Echo detection — ignore if the mic picked up the TTS output
        if (lastTTSText && transcript.length < lastTTSText.length * 0.4) {
          const overlap = lastTTSText.toLowerCase().includes(transcript.toLowerCase());
          if (overlap) {
            console.log("[Pipeline] 🔇 Echo detected, ignoring");
            return;
          }
        }

        // Real barge-in
        if (transcript.length >= minChars) {
          console.log(`[Pipeline] 🛑 Barge-in detected: "${transcript.slice(0, 30)}"`);
          push(Frames.interrupt("barge_in"));
          push(frame); // Pass the new user input downstream
          return;
        }
      }

      push(frame);
    },
  };
}

/**
 * Vox-inspired Speech Lifecycle Processor
 * 
 * Tracks speech sessions via VAD frames and correlates them with STT results.
 * Emits speech_start/speech_end frames with accumulated metadata:
 * - Duration of speech segment
 * - Number of partial transcripts received
 * - Final accumulated transcript
 * - Progressive stability tracking
 */
export function createSpeechLifecycleProcessor(): FrameProcessor {
  let speechActive = false;
  let speechStartTime = 0;
  let partialsCount = 0;
  let accumulatedTranscript = "";
  let lastVADProbability = 0;

  return {
    name: "speech-lifecycle",
    handles: ["vad", "stt_interim", "stt_final", "speech_start", "speech_end"],
    process(frame, push) {
      if (frame.type === "vad") {
        const { isSpeech, probability } = frame.payload as VADPayload;
        lastVADProbability = probability;

        if (isSpeech && !speechActive) {
          // Speech onset detected by neural VAD
          speechActive = true;
          speechStartTime = Date.now();
          partialsCount = 0;
          accumulatedTranscript = "";
          push(Frames.speechStart(probability));
        } else if (!isSpeech && speechActive) {
          // Speech offset detected
          const durationMs = Date.now() - speechStartTime;
          speechActive = false;
          push(Frames.speechEnd(durationMs, {
            partialsCount,
            transcript: accumulatedTranscript.trim(),
            vadProbability: probability,
          }));
        }

        push(frame); // Pass VAD frame downstream too
        return;
      }

      if (frame.type === "stt_interim") {
        partialsCount++;
        const payload = frame.payload as STTPayload;
        accumulatedTranscript = payload.transcript;

        // Enrich interim with progressive stability
        const enriched: STTPayload = {
          ...payload,
          stability: payload.stability ?? Math.min(0.3 + partialsCount * 0.1, 0.9),
          durationMs: speechActive ? Date.now() - speechStartTime : payload.durationMs,
        };
        push(createFrame<STTPayload>("stt_interim", enriched, frame.metadata));
        return;
      }

      if (frame.type === "stt_final") {
        const payload = frame.payload as STTPayload;
        accumulatedTranscript = payload.transcript;
        
        // Enrich final with duration
        const enriched: STTPayload = {
          ...payload,
          durationMs: speechActive ? Date.now() - speechStartTime : payload.durationMs,
          isFinal: true,
        };
        push(createFrame<STTPayload>("stt_final", enriched, frame.metadata));
        return;
      }

      push(frame);
    },
    destroy() {
      speechActive = false;
      partialsCount = 0;
      accumulatedTranscript = "";
    },
  };
}

/** Metrics collector — tracks latency between pipeline stages */
export function createMetricsCollector(): FrameProcessor & { getMetrics: () => PipelineMetrics } {
  const metrics: PipelineMetrics = {
    sttToLlmMs: [],
    llmToTtsMs: [],
    totalTurnMs: [],
    speechDurationsMs: [],
    interruptCount: 0,
    speechSegments: 0,
  };
  let lastSttFinalTime = 0;
  let lastLlmCompleteTime = 0;
  let turnStartTime = 0;

  return {
    name: "metrics",
    process(frame, push) {
      const now = Date.now();

      switch (frame.type) {
        case "speech_start":
          metrics.speechSegments++;
          break;
        case "speech_end": {
          const dur = (frame.payload as SpeechLifecyclePayload).durationMs;
          if (dur) metrics.speechDurationsMs.push(dur);
          break;
        }
        case "stt_final":
          lastSttFinalTime = now;
          turnStartTime = now;
          break;
        case "llm_complete":
          lastLlmCompleteTime = now;
          if (lastSttFinalTime) {
            metrics.sttToLlmMs.push(now - lastSttFinalTime);
          }
          break;
        case "tts_complete":
          if (lastLlmCompleteTime) {
            metrics.llmToTtsMs.push(now - lastLlmCompleteTime);
          }
          if (turnStartTime) {
            metrics.totalTurnMs.push(now - turnStartTime);
          }
          break;
        case "interrupt":
          metrics.interruptCount++;
          break;
      }

      push(frame);
    },
    getMetrics() {
      return { ...metrics };
    },
    destroy() {
      metrics.sttToLlmMs = [];
      metrics.llmToTtsMs = [];
      metrics.totalTurnMs = [];
      metrics.speechDurationsMs = [];
    },
  };
}

export interface PipelineMetrics {
  sttToLlmMs: number[];
  llmToTtsMs: number[];
  totalTurnMs: number[];
  /** Vox-inspired: duration of each speech segment detected by VAD */
  speechDurationsMs: number[];
  interruptCount: number;
  /** Total speech segments detected */
  speechSegments: number;
}

// ═══════════════════════════════════════════════════════════
//  Pipeline Factory — creates a pre-configured pipeline
// ═══════════════════════════════════════════════════════════

export interface PipelineConfig {
  debug?: boolean;
  deduplicateMs?: number;
  minBargeInChars?: number;
  collectMetrics?: boolean;
  /** Enable Vox-inspired speech lifecycle tracking via VAD */
  speechLifecycle?: boolean;
}

export function createVoicePipeline(config: PipelineConfig = {}): VoicePipeline {
  const pipeline = new VoicePipeline();

  if (config.debug) {
    pipeline.use(createLogProcessor("Orion"));
  }

  // Vox-inspired: speech lifecycle processor (before dedup/barge-in)
  if (config.speechLifecycle !== false) {
    pipeline.use(createSpeechLifecycleProcessor());
  }

  pipeline.use(createDeduplicator(config.deduplicateMs ?? 800));
  pipeline.use(createBargeInDetector(config.minBargeInChars ?? 8));

  if (config.collectMetrics) {
    pipeline.use(createMetricsCollector());
  }

  return pipeline;
}
