import { useRef, useCallback, useEffect, useState } from "react";
import {
  AudioWorkletManager,
  AudioWorkletConfig,
  getAudioWorkletManager,
} from "@/lib/voice/audioWorkletManager";

/**
 * React hook for Orion's AudioWorklet-based audio capture.
 * 
 * Provides off-thread audio processing with energy-based VAD,
 * audio ducking during TTS, and raw audio chunks for Whisper/Silero.
 * 
 * Usage:
 *   const { start, stop, energy, isSpeech, setDucking } = useAudioWorklet();
 */

interface UseAudioWorkletOptions {
  /** Auto-initialize on mount (default: true) */
  autoInit?: boolean;
  /** Energy callback throttle in ms (default: 50) */
  energyThrottleMs?: number;
  chunkSize?: number;
  silenceThreshold?: number;
  energySmoothing?: number;
  sampleRate?: number;
}

interface AudioWorkletState {
  isSupported: boolean;
  isInitialized: boolean;
  isRunning: boolean;
  energy: number;
  isSpeech: boolean;
}

export function useAudioWorklet(options: UseAudioWorkletOptions = {}) {
  const [state, setState] = useState<AudioWorkletState>({
    isSupported: AudioWorkletManager.isSupported(),
    isInitialized: false,
    isRunning: false,
    energy: 0,
    isSpeech: false,
  });

  const managerRef = useRef<AudioWorkletManager | null>(null);
  const cleanupRef = useRef<Array<() => void>>([]);
  const lastEnergyUpdate = useRef(0);
  const throttleMs = options.energyThrottleMs ?? 50;

  // Initialize manager
  useEffect(() => {
    if (!AudioWorkletManager.isSupported()) return;

    const manager = getAudioWorkletManager({
      chunkSize: options.chunkSize,
      silenceThreshold: options.silenceThreshold,
      energySmoothing: options.energySmoothing,
      sampleRate: options.sampleRate,
    });
    managerRef.current = manager;

    // Subscribe to energy updates (throttled)
    const unsubEnergy = manager.onEnergy((energy, isSpeech) => {
      const now = Date.now();
      if (now - lastEnergyUpdate.current >= throttleMs) {
        lastEnergyUpdate.current = now;
        setState(prev => ({ ...prev, energy, isSpeech }));
      }
    });
    cleanupRef.current.push(unsubEnergy);

    // Auto-initialize
    if (options.autoInit !== false) {
      manager.initialize().then(ok => {
        setState(prev => ({ ...prev, isInitialized: ok }));
      });
    }

    return () => {
      cleanupRef.current.forEach(fn => fn());
      cleanupRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(async (): Promise<boolean> => {
    const manager = managerRef.current;
    if (!manager) return false;

    const ok = await manager.start();
    setState(prev => ({ ...prev, isRunning: ok, isInitialized: manager.isInitialized }));
    return ok;
  }, []);

  const stop = useCallback(() => {
    managerRef.current?.stop();
    setState(prev => ({ ...prev, isRunning: false, energy: 0, isSpeech: false }));
  }, []);

  const setDucking = useCallback((enabled: boolean) => {
    managerRef.current?.setDucking(enabled);
  }, []);

  const setActive = useCallback((active: boolean) => {
    managerRef.current?.setActive(active);
  }, []);

  /** Subscribe to raw audio chunks (for Whisper/Silero processing) */
  const onAudioChunk = useCallback((callback: (chunk: Float32Array, sampleRate: number) => void) => {
    const manager = managerRef.current;
    if (!manager) return () => {};
    const unsub = manager.onAudioChunk(callback);
    cleanupRef.current.push(unsub);
    return unsub;
  }, []);

  return {
    ...state,
    start,
    stop,
    setDucking,
    setActive,
    onAudioChunk,
    manager: managerRef.current,
  };
}
