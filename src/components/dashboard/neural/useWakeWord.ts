import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { vsLog } from "./useVisionProcessing";

// Expanded regex: catches "orion", "órion", "oreon", "oriom", "o rion", "orían", "orian", etc.
const ORION_WAKE_REGEX = /([óòôõoö][\s.]*r[iíìeéè][\s.]*[oóòôõaã][\s.]*[nmn]|orion|[oó]rion|ore[oó][nm]|oria[nm]|orie[nm]|[oó]rio[nm]|[oó]ria[nm]|oure[oó][nm]|o\s+rion|ori\s*on|painel)\b/i;

export interface BackgroundTranscript {
  text: string;
  timestamp: number;
  speakerId: string;
  confidence: number;
}

const MAX_BACKGROUND_TRANSCRIPTS = 10;

function isMobileBrowser() {
  return typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

export function useWakeWord(
  listening: boolean,
  speechOk: boolean,
  onActivate: () => void,
) {
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const wakeRecRef = useRef<any>(null);
  const wakeWordEnabledRef = useRef(true);
  const wakeWordCooldownRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartAttemptsRef = useRef(0);
  const startInFlightRef = useRef(false);

  const backgroundTranscriptsRef = useRef<BackgroundTranscript[]>([]);
  const speakerCounterRef = useRef(0);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const getRestartDelay = useCallback((reason?: string) => {
    if (typeof document !== "undefined" && document.hidden) return 2400;
    const base = isMobileBrowser() ? 1300 : 450;
    if (reason === "audio-capture" || reason === "network") return base + 700;
    if (reason === "aborted" || reason === "end" || reason === "no-speech") return base;
    return base + 300;
  }, []);

  const getBackgroundTranscripts = useCallback((): BackgroundTranscript[] => {
    return [...backgroundTranscriptsRef.current];
  }, []);

  const clearBackgroundTranscripts = useCallback(() => {
    backgroundTranscriptsRef.current = [];
  }, []);

  const addBackgroundTranscript = useCallback((text: string, confidence: number) => {
    const transcript: BackgroundTranscript = {
      text,
      timestamp: Date.now(),
      speakerId: `speaker_${speakerCounterRef.current}`,
      confidence,
    };

    const buffer = backgroundTranscriptsRef.current;
    if (buffer.length >= MAX_BACKGROUND_TRANSCRIPTS) buffer.shift();
    buffer.push(transcript);

    const prev = buffer[buffer.length - 2];
    if (prev && transcript.timestamp - prev.timestamp > 5000) {
      speakerCounterRef.current++;
    }
  }, []);

  const startWakeWordListener = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const hidden = typeof document !== "undefined" && document.hidden;
    if (!speechOk || !SR || listening || hidden) return;
    if (!wakeWordEnabledRef.current || wakeRecRef.current || startInFlightRef.current) return;

    clearRestartTimer();
    startInFlightRef.current = true;

    try {
      const rec = new SR();
      rec.lang = "pt-BR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        startInFlightRef.current = false;
        restartAttemptsRef.current = 0;
        setWakeWordActive(true);
      };

      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          for (let alt = 0; alt < e.results[i].length; alt++) {
            const transcript = (e.results[i][alt]?.transcript || "").toLowerCase().trim();
            const confidence = e.results[i][alt]?.confidence || 0;
            const isOrion = ORION_WAKE_REGEX.test(transcript);

            if (isOrion && !wakeWordCooldownRef.current) {
              // Very low threshold — interim results often have 0 confidence
              if (e.results[i].isFinal && confidence < 0.08) {
                vsLog(`👂 Wake word ignorado (confiança muito baixa: ${(confidence * 100).toFixed(0)}%)`);
                addBackgroundTranscript(transcript, confidence);
                continue;
              }

              wakeWordCooldownRef.current = true;
              const wakeLabel = /painel/i.test(transcript) ? "Painel" : "Orion";
              vsLog(`🎯 Wake word '${wakeLabel}' detectado! (conf=${(confidence * 100).toFixed(0)}%, interim=${!e.results[i].isFinal})`);
              toast.success(`🎯 ${wakeLabel} ativado!`, { duration: 2000 });
              clearRestartTimer();
              try { rec.abort?.(); } catch {}
              try { rec.stop(); } catch {}
              wakeRecRef.current = null;
              setWakeWordActive(false);
              onActivate();
              setTimeout(() => { wakeWordCooldownRef.current = false; }, 1200);
              return;
            }

            if (!isOrion && transcript.length > 3 && e.results[i].isFinal) {
              addBackgroundTranscript(transcript, confidence);
            }
          }
        }
      };

      rec.onend = () => {
        wakeRecRef.current = null;
        startInFlightRef.current = false;
        const shouldRestart = wakeWordEnabledRef.current && speechOk && !listening && !wakeWordCooldownRef.current && !(typeof document !== "undefined" && document.hidden);
        if (!shouldRestart) {
          setWakeWordActive(false);
          return;
        }

        // KEEP wakeWordActive=true during restart gap to prevent visual flickering
        // and to prevent NeuralVision's Effect 2 from re-triggering a competing restart
        restartAttemptsRef.current = Math.min(restartAttemptsRef.current + 1, 6);
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (wakeWordEnabledRef.current && speechOk && !listening && !wakeRecRef.current && !startInFlightRef.current && !(typeof document !== "undefined" && document.hidden)) {
            startWakeWordListener();
          } else {
            setWakeWordActive(false);
          }
        }, getRestartDelay("end") + restartAttemptsRef.current * 150);
      };

      rec.onerror = (e: any) => {
        console.warn("[WakeWord] onerror:", e.error);
        wakeRecRef.current = null;
        startInFlightRef.current = false;

        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setWakeWordActive(false);
          return;
        }

        const shouldRestart = wakeWordEnabledRef.current && speechOk && !listening && !wakeWordCooldownRef.current && !(typeof document !== "undefined" && document.hidden);
        if (!shouldRestart) {
          setWakeWordActive(false);
          return;
        }

        // KEEP wakeWordActive=true during error recovery to prevent oscillation
        restartAttemptsRef.current = Math.min(restartAttemptsRef.current + 1, 6);
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (wakeWordEnabledRef.current && speechOk && !listening && !wakeRecRef.current && !startInFlightRef.current && !(typeof document !== "undefined" && document.hidden)) {
            startWakeWordListener();
          } else {
            setWakeWordActive(false);
          }
        }, getRestartDelay(e.error) + restartAttemptsRef.current * 150);
      };

      wakeRecRef.current = rec;
      rec.start();
      setWakeWordActive(true);
      vsLog("👂 Wake word listener ativo — diga 'Orion' (estável no mobile)");
    } catch (err) {
      startInFlightRef.current = false;
      setWakeWordActive(false);
      console.warn("Wake word listener failed:", err);
    }
  }, [addBackgroundTranscript, clearRestartTimer, getRestartDelay, listening, onActivate, speechOk]);

  const stopWakeWordListener = useCallback(() => {
    wakeWordEnabledRef.current = false;
    clearRestartTimer();
    restartAttemptsRef.current = 0;
    startInFlightRef.current = false;
    try { wakeRecRef.current?.abort?.(); } catch {}
    try { wakeRecRef.current?.stop?.(); } catch {}
    wakeRecRef.current = null;
    setWakeWordActive(false);
  }, [clearRestartTimer]);

  const enableWakeWord = useCallback(() => {
    wakeWordEnabledRef.current = true;
  }, []);

  useEffect(() => {
    if (!speechOk || listening) {
      clearRestartTimer();
      if (wakeRecRef.current) {
        try { wakeRecRef.current.stop(); } catch {}
        wakeRecRef.current = null;
      }
      startInFlightRef.current = false;
      if (listening) setWakeWordActive(false);
    }
  }, [clearRestartTimer, listening, speechOk]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearRestartTimer();
        try { wakeRecRef.current?.stop?.(); } catch {}
        wakeRecRef.current = null;
        startInFlightRef.current = false;
        setWakeWordActive(false);
        return;
      }

      if (wakeWordEnabledRef.current && speechOk && !listening && !wakeRecRef.current && !startInFlightRef.current) {
        startWakeWordListener();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [clearRestartTimer, listening, speechOk, startWakeWordListener]);

  useEffect(() => () => {
    clearRestartTimer();
    try { wakeRecRef.current?.stop?.(); } catch {}
    wakeRecRef.current = null;
    startInFlightRef.current = false;
  }, [clearRestartTimer]);

  return {
    wakeWordActive,
    wakeWordEnabledRef,
    wakeRecRef,
    startWakeWordListener,
    stopWakeWordListener,
    enableWakeWord,
    getBackgroundTranscripts,
    clearBackgroundTranscripts,
  };
}
