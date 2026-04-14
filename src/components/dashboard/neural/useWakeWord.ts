import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { vsLog } from "./useVisionProcessing";

// ═══ Unified Mic Arbiter — shared with useNeuralVoice ═══
import { claimMic, isMicOwner, registerMicRec, releaseMic } from "@/lib/voice/micArbiter";
import { ensurePersistentMic, isMicPermissionGranted } from "@/lib/voice/persistentMic";

// ═══════════════════════════════════════════════════════════
// useWakeWord — THE ONLY SpeechRecognition for wake word detection
// GlobalOrionListener listens for the "orion:wake-word-detected" event
// emitted here. No other file creates SR instances for wake word.
// ═══════════════════════════════════════════════════════════

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

/** Extract command portion after the wake word */
function extractCommandFromTranscript(transcript: string): string {
  return transcript
    .replace(ORION_WAKE_REGEX, "")
    .replace(/^\s*[,;:\-–—]+\s*/, "")
    .trim();
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
  const listeningRef = useRef(listening);
  const speechOkRef = useRef(speechOk);
  const wakeSingletonIdRef = useRef(0);

  const backgroundTranscriptsRef = useRef<BackgroundTranscript[]>([]);
  const speakerCounterRef = useRef(0);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      try { wakeRecRef.current?.abort?.(); } catch {}
      try { wakeRecRef.current?.stop?.(); } catch {}
      wakeRecRef.current = null;
    };
  }, []);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    speechOkRef.current = speechOk;
  }, [speechOk]);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const getRestartDelay = useCallback((reason?: string) => {
    if (typeof document !== "undefined" && document.hidden) return 30000;
    // Minimal restarts — continuous mode handles most cases.
    // When it does end, wait long enough to avoid mic cycling sounds (beeps/clicks).
    if (isMobileBrowser()) {
      // Mobile: very long delays to prevent OS mic activation sounds
      if (reason === "no-speech") return 500; // no-speech is silent, safe to restart quickly
      return 12000; // all other reasons: wait 12s to avoid rapid cycling
    }
    // Desktop: shorter but still conservative
    if (reason === "no-speech") return 300;
    if (reason === "audio-capture" || reason === "network") return 5000;
    return 2000;
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

  /** Emit wake word status to GlobalOrionListener */
  const emitWakeStatus = useCallback((active: boolean) => {
    setWakeWordActive(active);
    try {
      window.dispatchEvent(new CustomEvent(active ? "orion:wake-word-active" : "orion:wake-word-inactive"));
    } catch {}
  }, []);

  const startWakeWordListener = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const hidden = typeof document !== "undefined" && document.hidden;
    if (!speechOkRef.current || !SR || listeningRef.current || hidden) return;
    if (!wakeWordEnabledRef.current || wakeRecRef.current || startInFlightRef.current) return;

    // Claim mic ONLY after guards pass
    wakeSingletonIdRef.current = claimMic("wake");

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
        emitWakeStatus(true);
      };

      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          for (let alt = 0; alt < e.results[i].length; alt++) {
            const transcript = (e.results[i][alt]?.transcript || "").toLowerCase().trim();
            const confidence = e.results[i][alt]?.confidence || 0;
            const isOrion = ORION_WAKE_REGEX.test(transcript);

            if (isOrion && !wakeWordCooldownRef.current) {
              if (e.results[i].isFinal && confidence < 0.08) {
                vsLog(`👂 Wake word ignorado (confiança muito baixa: ${(confidence * 100).toFixed(0)}%)`);
                addBackgroundTranscript(transcript, confidence);
                continue;
              }

              wakeWordCooldownRef.current = true;
              const wakeLabel = /painel/i.test(transcript) ? "Painel" : "Orion";
              const command = extractCommandFromTranscript(transcript);
              vsLog(`🎯 Wake word '${wakeLabel}' detectado! (conf=${(confidence * 100).toFixed(0)}%, interim=${!e.results[i].isFinal})`);
              toast.success(`🎯 ${wakeLabel} ativado!`, { duration: 2000 });
              clearRestartTimer();
              try { rec.abort?.(); } catch {}
              try { rec.stop(); } catch {}
              wakeRecRef.current = null;
              emitWakeStatus(false);

              // ═══ EMIT EVENT — GlobalOrionListener picks this up ═══
              try {
                window.dispatchEvent(new CustomEvent("orion:wake-word-detected", {
                  detail: { command, wakeLabel, confidence },
                }));
              } catch {}

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
        if (!isMicOwner(wakeSingletonIdRef.current)) { emitWakeStatus(false); return; }
        const shouldRestart = wakeWordEnabledRef.current && speechOkRef.current && !listeningRef.current && !wakeWordCooldownRef.current && !(typeof document !== "undefined" && document.hidden);
        if (!shouldRestart) {
          emitWakeStatus(false);
          return;
        }

        const maxAttempts = isMobileBrowser() ? 3 : 6;
        restartAttemptsRef.current = Math.min(restartAttemptsRef.current + 1, maxAttempts);
        if (restartAttemptsRef.current >= maxAttempts) {
          console.log("[WakeWord] Max restart attempts reached, staying idle to prevent mic cycling");
          emitWakeStatus(false);
          return;
        }
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (!isMicOwner(wakeSingletonIdRef.current)) { emitWakeStatus(false); return; }
          if (wakeWordEnabledRef.current && speechOkRef.current && !listeningRef.current && !wakeRecRef.current && !startInFlightRef.current && !(typeof document !== "undefined" && document.hidden)) {
            startWakeWordListener();
          } else {
            emitWakeStatus(false);
          }
        }, getRestartDelay("end"));
      };

      rec.onerror = (e: any) => {
        console.warn("[WakeWord] onerror:", e.error);
        wakeRecRef.current = null;
        startInFlightRef.current = false;
        if (!isMicOwner(wakeSingletonIdRef.current)) { emitWakeStatus(false); return; }

        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          emitWakeStatus(false);
          return;
        }

        const shouldRestart = wakeWordEnabledRef.current && speechOkRef.current && !listeningRef.current && !wakeWordCooldownRef.current && !(typeof document !== "undefined" && document.hidden);
        if (!shouldRestart) {
          emitWakeStatus(false);
          return;
        }

        const maxAttempts = isMobileBrowser() ? 3 : 6;
        restartAttemptsRef.current = Math.min(restartAttemptsRef.current + 1, maxAttempts);
        if (restartAttemptsRef.current >= maxAttempts) {
          console.log("[WakeWord] Max error restart attempts reached, staying idle");
          emitWakeStatus(false);
          return;
        }
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (!isMicOwner(wakeSingletonIdRef.current)) { emitWakeStatus(false); return; }
          if (wakeWordEnabledRef.current && speechOkRef.current && !listeningRef.current && !wakeRecRef.current && !startInFlightRef.current && !(typeof document !== "undefined" && document.hidden)) {
            startWakeWordListener();
          } else {
            emitWakeStatus(false);
          }
        }, getRestartDelay(e.error));
      };

      wakeRecRef.current = rec;
      registerMicRec(rec, "wake");
      rec.start();
      emitWakeStatus(true);
      vsLog("👂 Wake word listener ativo — diga 'Orion' (instância única)");
    } catch (err) {
      startInFlightRef.current = false;
      emitWakeStatus(false);
      console.warn("Wake word listener failed:", err);
    }
  }, [addBackgroundTranscript, clearRestartTimer, emitWakeStatus, getRestartDelay, onActivate]);

  const stopWakeWordListener = useCallback(() => {
    wakeWordEnabledRef.current = false;
    clearRestartTimer();
    restartAttemptsRef.current = 0;
    startInFlightRef.current = false;
    try { wakeRecRef.current?.abort?.(); } catch {}
    try { wakeRecRef.current?.stop?.(); } catch {}
    wakeRecRef.current = null;
    releaseMic(wakeSingletonIdRef.current);
    emitWakeStatus(false);
  }, [clearRestartTimer, emitWakeStatus]);

  const enableWakeWord = useCallback(() => {
    wakeWordEnabledRef.current = true;
  }, []);

  // ═══ AUTO-START: If mic permission already granted, start wake word automatically ═══
  useEffect(() => {
    let cancelled = false;
    const autoStart = async () => {
      const granted = await isMicPermissionGranted();
      if (granted && !cancelled && speechOkRef.current && !listeningRef.current && wakeWordEnabledRef.current) {
        await ensurePersistentMic();
        if (!cancelled && !wakeRecRef.current && !startInFlightRef.current) {
          startWakeWordListener();
        }
      }
    };
    const timer = setTimeout(autoStart, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [startWakeWordListener]);

  useEffect(() => {
    if (!speechOk || listening) {
      clearRestartTimer();
      if (wakeRecRef.current) {
        try { wakeRecRef.current.stop(); } catch {}
        wakeRecRef.current = null;
      }
      startInFlightRef.current = false;
      if (listening) emitWakeStatus(false);
    }
  }, [clearRestartTimer, emitWakeStatus, listening, speechOk]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearRestartTimer();
        try { wakeRecRef.current?.stop?.(); } catch {}
        wakeRecRef.current = null;
        startInFlightRef.current = false;
        emitWakeStatus(false);
        return;
      }

      if (wakeWordEnabledRef.current && speechOkRef.current && !listeningRef.current && !wakeRecRef.current && !startInFlightRef.current) {
        startWakeWordListener();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [clearRestartTimer, emitWakeStatus, startWakeWordListener]);

  useEffect(() => () => {
    clearRestartTimer();
    try { wakeRecRef.current?.abort?.(); } catch {}
    try { wakeRecRef.current?.stop?.(); } catch {}
    wakeRecRef.current = null;
    startInFlightRef.current = false;
    releaseMic(wakeSingletonIdRef.current);
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
