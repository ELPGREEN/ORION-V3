import { VoiceState } from "@/hooks/useNeuralVoice";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { vsLog } from "./useVisionProcessing";
import { ensurePersistentMic } from "@/lib/voice/persistentMic";
import { createGCPSTTSession, type GCPSTTSession } from "@/lib/voice/gcpSTT";

const ORION_WAKE_REGEX = /([óòôõoö][\s.]*r[iíìeéè][\s.]*[oóòôõaã][\s.]*[nmn]|orion|[oó]rion|ore[oó][nm]|oria[nm]|orie[nm]|[oó]rio[nm]|[oó]ria[nm]|oure[oó][nm]|o\s+rion|ori\s*on|painel)\b/i;

export interface BackgroundTranscript {
  text: string;
  timestamp: number;
  speakerId: string;
  confidence: number;
}

function extractCommandFromTranscript(transcript: string): string {
  const command = transcript
    .replace(ORION_WAKE_REGEX, "")
    .replace(/^\s*[,;:\-–—]+\s*/, "")
    .trim();
  if (/^(ativar?|ativad[oa]?|ativando|ligar?|ligad[oa]?|ligando|acordar?|acordad[oa]?|oi|ol[aá]|e\s*a[ií])\s*[.!?]*$/i.test(command)) return "";
  return command;
}

export function useWakeWord(listening: boolean, speechOk: boolean, onActivate: () => void) {
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const wakeWordCooldownRef = useRef(false);
  const wakeSessionRef = useRef<GCPSTTSession | null>(null);
  const startingRef = useRef(false);
  const startAttemptRef = useRef(0);

  const stopWakeWordListener = useCallback(() => {
    startAttemptRef.current += 1;
    startingRef.current = false;
    wakeSessionRef.current?.stop();
    wakeSessionRef.current?.destroy();
    wakeSessionRef.current = null;
    setWakeWordActive(false);
  }, []);

  const startWakeWordListener = useCallback(async () => {
    if (!speechOk || listening || wakeSessionRef.current || startingRef.current) return;
    startingRef.current = true;
    const attemptId = ++startAttemptRef.current;

    try {
      const micReady = await ensurePersistentMic();
      if (attemptId !== startAttemptRef.current || !startingRef.current) return;
      if (!micReady) {
        startingRef.current = false;
        setWakeWordActive(false);
        return;
      }

      const session = createGCPSTTSession({
        languageCode: "pt-BR",
        onFinal: (text, confidence) => {
          const transcript = (text || "").toLowerCase().trim();
          if (!transcript) return;
          if (ORION_WAKE_REGEX.test(transcript) && !wakeWordCooldownRef.current) {
            wakeWordCooldownRef.current = true;
            const command = extractCommandFromTranscript(transcript);
            vsLog("🎯 Wake word detectado via Persistent STT");
            toast.success("🎯 Ativado!", { duration: 2000 });

            window.dispatchEvent(new CustomEvent("orion:wake-word-detected", {
              detail: { command, wakeLabel: "Orion", confidence },
            }));

            onActivate();
            setTimeout(() => { wakeWordCooldownRef.current = false; }, 1500);
          }
        },
        onError: () => {
          setWakeWordActive(false);
        },
      });

      const ok = await session.start();
      if (attemptId !== startAttemptRef.current || !startingRef.current) {
        session.destroy();
        return;
      }
      if (!ok) {
        session.destroy();
        wakeSessionRef.current = null;
        setWakeWordActive(false);
        startingRef.current = false;
        return;
      }

      wakeSessionRef.current = session;
      setWakeWordActive(true);
    } catch {
      setWakeWordActive(false);
    } finally {
      startingRef.current = false;
    }
  }, [listening, onActivate, speechOk]);

  useEffect(() => {
    if (speechOk && !listening && !VoiceState.aiResponding) {
      startWakeWordListener();
    } else {
      stopWakeWordListener();
    }

    return () => {
      stopWakeWordListener();
    };
  }, [listening, speechOk, startWakeWordListener, stopWakeWordListener, VoiceState.aiResponding]);

  return {
    wakeWordActive,
    startWakeWordListener,
    stopWakeWordListener,
    enableWakeWord: () => {},
    getBackgroundTranscripts: () => [],
    clearBackgroundTranscripts: () => {},
  };
}

