/**
 * useVAD — React hook integrating Silero VAD into voice pipeline.
 * 
 * Provides neural speech boundary detection that works alongside
 * Web Speech API's SpeechRecognition. VAD detects when the user
 * truly starts/stops speaking (vs noise), enabling:
 * 
 * - Faster response (no waiting for silence timeout)
 * - Better noise rejection (neural vs energy-based)
 * - Smarter barge-in detection during TTS playback
 * - Audio ducking during AI speech
 */
import { useRef, useCallback, useEffect } from "react";
import { getGlobalSileroVAD, destroyGlobalSileroVAD, preloadSileroVAD } from "@/lib/voice/sileroVAD";
import type { SileroVADEvents } from "@/lib/voice/sileroVAD";

export interface UseVADOptions {
  /** Called when neural VAD detects speech start */
  onSpeechStart?: () => void;
  /** Called when neural VAD detects speech end */
  onSpeechEnd?: (durationMs: number) => void;
  /** Called with VAD probability score each frame */
  onVADScore?: (probability: number) => void;
  /** Enable audio ducking during TTS */
  duckingEnabled?: boolean;
}

export interface UseVADReturn {
  /** Start VAD processing on mic stream */
  startVAD: (stream?: MediaStream) => Promise<void>;
  /** Stop VAD processing */
  stopVAD: () => void;
  /** Set ducking mode (raise thresholds during TTS) */
  setDucking: (enabled: boolean) => void;
  /** Whether VAD model is loaded */
  modelLoaded: boolean;
  /** Whether VAD is actively processing */
  active: boolean;
  /** Current speech probability (0-1) */
  currentScore: number;
}

export function useVAD(options: UseVADOptions = {}): UseVADReturn {
  const scoreRef = useRef(0);
  const activeRef = useRef(false);
  const modelLoadedRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Preload model on mount
  useEffect(() => {
    preloadSileroVAD();
    return () => {
      // Don't destroy on unmount — singleton persists
    };
  }, []);

  const startVAD = useCallback(async (stream?: MediaStream) => {
    const events: SileroVADEvents = {
      onSpeechStart: () => {
        console.log("[VAD] 🎤 Speech detected (neural)");
        optionsRef.current.onSpeechStart?.();
      },
      onSpeechEnd: (durationMs) => {
        console.log(`[VAD] 🔇 Speech ended (${Math.round(durationMs)}ms)`);
        optionsRef.current.onSpeechEnd?.(durationMs);
      },
      onVADScore: (probability) => {
        scoreRef.current = probability;
        optionsRef.current.onVADScore?.(probability);
      },
      onModelLoaded: () => {
        modelLoadedRef.current = true;
        console.log("[VAD] ✅ Silero model ready");
      },
      onError: (error) => {
        console.warn("[VAD] Error:", error);
      },
    };

    const vad = getGlobalSileroVAD(events);
    await vad.start(stream);
    activeRef.current = vad.active;
    modelLoadedRef.current = vad.modelLoaded;
  }, []);

  const stopVAD = useCallback(() => {
    const vad = getGlobalSileroVAD();
    vad.stop();
    activeRef.current = false;
    scoreRef.current = 0;
  }, []);

  const setDucking = useCallback((enabled: boolean) => {
    const vad = getGlobalSileroVAD();
    vad.setDucking(enabled);
    console.log(`[VAD] Ducking ${enabled ? "ON" : "OFF"}`);
  }, []);

  return {
    startVAD,
    stopVAD,
    setDucking,
    get modelLoaded() { return modelLoadedRef.current; },
    get active() { return activeRef.current; },
    get currentScore() { return scoreRef.current; },
  };
}
