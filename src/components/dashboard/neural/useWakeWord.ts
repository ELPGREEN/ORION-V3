import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { vsLog } from "./useVisionProcessing";
import { claimMic, isMicOwner, releaseMic, primeSharedMic } from "@/lib/voice/micArbiter";
import { ensurePersistentMic, isMicPermissionGranted } from "@/lib/voice/persistentMic";

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
  const wakeSingletonIdRef = useRef<number>(0);
  const wakeWordCooldownRef = useRef(false);

  const startWakeWordListener = useCallback(() => {
    if (!speechOk || listening) return;

    // Claim mic with listeners — this uses the SHARED instance
    wakeSingletonIdRef.current = claimMic("wake", {
      onStart: () => setWakeWordActive(true),
      onResult: (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = (e.results[i][0]?.transcript || "").toLowerCase().trim();
          const confidence = e.results[i][0]?.confidence || 0;
          if (ORION_WAKE_REGEX.test(transcript) && !wakeWordCooldownRef.current) {
            wakeWordCooldownRef.current = true;
            const command = extractCommandFromTranscript(transcript);
            vsLog("🎯 Wake word detectado via Shared Mic");
            toast.success("🎯 Ativado!", { duration: 2000 });

            // Dispatch event for GlobalOrionListener
            window.dispatchEvent(new CustomEvent("orion:wake-word-detected", {
              detail: { command, wakeLabel: "Orion", confidence },
            }));

            onActivate();
            setTimeout(() => { wakeWordCooldownRef.current = false; }, 1500);
          }
        }
      },
      onEnd: () => setWakeWordActive(false),
      onError: () => setWakeWordActive(false),
    });
  }, [listening, onActivate, speechOk]);

  const stopWakeWordListener = useCallback(() => {
    releaseMic(wakeSingletonIdRef.current);
    setWakeWordActive(false);
  }, []);

  useEffect(() => {
    if (speechOk && !listening) {
      primeSharedMic();
      startWakeWordListener();
    } else {
      stopWakeWordListener();
    }
  }, [listening, speechOk, startWakeWordListener, stopWakeWordListener]);

  return {
    wakeWordActive,
    startWakeWordListener,
    stopWakeWordListener,
    enableWakeWord: () => {},
    getBackgroundTranscripts: () => [],
    clearBackgroundTranscripts: () => {},
  };
}
