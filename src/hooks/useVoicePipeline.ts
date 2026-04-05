import { useRef, useCallback, useEffect } from "react";
import {
  VoicePipeline,
  createVoicePipeline,
  Frames,
  Frame,
  FrameType,
  STTPayload,
  SpeechLifecyclePayload,
  LLMPayload,
  InterruptPayload,
  PipelineEventCallback,
} from "@/lib/voice/framePipeline";

/**
 * React hook that exposes Orion's Pipecat-inspired Frame Pipeline.
 * 
 * Wraps the VoicePipeline in a React-friendly API with auto-cleanup.
 * Components can push frames and subscribe to pipeline events.
 * 
 * Usage:
 *   const { pipeline, push, on } = useVoicePipeline({ debug: true });
 *   
 *   on("tts_complete", () => startListening());
 *   push(Frames.sttFinal("Olá, Orion"));
 */

interface UseVoicePipelineOptions {
  debug?: boolean;
  deduplicateMs?: number;
  minBargeInChars?: number;
  collectMetrics?: boolean;
  /** Auto-start the pipeline on mount */
  autoStart?: boolean;
}

export function useVoicePipeline(options: UseVoicePipelineOptions = {}) {
  const pipelineRef = useRef<VoicePipeline | null>(null);
  const cleanupFns = useRef<Array<() => void>>([]);

  // Initialize pipeline once
  if (!pipelineRef.current) {
    pipelineRef.current = createVoicePipeline({
      debug: options.debug ?? false,
      deduplicateMs: options.deduplicateMs,
      minBargeInChars: options.minBargeInChars,
      collectMetrics: options.collectMetrics ?? true,
    });
  }

  const pipeline = pipelineRef.current;

  // Auto-start on mount, destroy on unmount
  useEffect(() => {
    if (options.autoStart !== false) {
      pipeline.start();
    }
    return () => {
      cleanupFns.current.forEach(fn => fn());
      cleanupFns.current = [];
      pipeline.destroy();
      pipelineRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Push a frame into the pipeline */
  const push = useCallback((frame: Frame) => {
    pipeline.push(frame);
  }, [pipeline]);

  /** Subscribe to pipeline events — auto-cleaned on unmount */
  const on = useCallback((type: FrameType | "*", callback: PipelineEventCallback) => {
    const unsub = pipeline.on(type, callback);
    cleanupFns.current.push(unsub);
    return unsub;
  }, [pipeline]);

  /** Trigger a barge-in interrupt */
  const interrupt = useCallback((reason: InterruptPayload["reason"] = "manual_stop") => {
    pipeline.push(Frames.interrupt(reason));
  }, [pipeline]);

  /** Bridge STT events into the pipeline with Vox-style progressive confidence */
  const bridgeSTT = useCallback((transcript: string, isFinal: boolean, opts?: { stability?: number; durationMs?: number }) => {
    if (isFinal) {
      push(Frames.sttFinal(transcript, undefined, opts?.durationMs));
    } else {
      push(Frames.sttInterim(transcript, { stability: opts?.stability, durationMs: opts?.durationMs }));
    }
  }, [push]);

  /** Bridge LLM response into the pipeline */
  const bridgeLLM = useCallback((text: string, provider?: string) => {
    push(Frames.llmComplete(text, provider));
  }, [push]);

  /** Bridge TTS start event into the pipeline */
  const bridgeTTSStart = useCallback((tier: string) => {
    push(Frames.ttsStart(tier));
  }, [push]);

  /** Bridge TTS complete event into the pipeline */
  const bridgeTTSComplete = useCallback(() => {
    push(Frames.ttsComplete());
  }, [push]);

  /** Bridge VAD score into the pipeline — triggers speech_start/speech_end via lifecycle processor */
  const bridgeVAD = useCallback((isSpeech: boolean, probability: number) => {
    push(Frames.vad(isSpeech, probability));
  }, [push]);

  return {
    pipeline,
    push,
    on,
    interrupt,
    bridgeSTT,
    bridgeLLM,
    bridgeTTSStart,
    bridgeTTSComplete,
    bridgeVAD,
    Frames,
  };
}
