/**
 * NEUROCORE AI — Voice STT/TTS Hook
 * Primary: Piper TTS (neural WASM, offline, free)
 * Fallback: Browser Web Speech (masculine PT-BR)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getOrionVoice, initVoicePicker, ORION_VOICE_PARAMS } from "@/lib/voice/voicePicker";
import { detectTurnState, getOptimalSilenceDuration } from "@/lib/voice/turnDetection";


// ═══ Text Cleaning for Natural Speech ═══

export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " código omitido ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[\s]*[-•*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/[─═╔╗╚╝║╠╣╬┌┐└┘├┤┬┴┼]/g, "")
    .replace(/[🔹⭐◽📋🔄✅❌📌🔧⚙️🛡️⚠️📊📈📉🔍🔎💡🔗📁📂🗂️🗃️]/g, "")
    .replace(/\.{3,}/g, "...")
    .replace(/([!?.])\1+/g, "$1")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/^\.\s*/, "")
    .trim();
}

export function normalizeSpeechText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const VoiceState = {
  aiResponding: false,
};

export interface UseNeuralVoiceReturn {
  listening: boolean;
  supported: boolean;
  ttsOn: boolean;
  setTtsOn: (on: boolean) => void;
  speak: (text: string) => Promise<void>;
  speakFast: (text: string) => Promise<void>;
  startListening: (onCmd: (c: string) => void) => void;
  stop: () => void;
  bargeIn: () => void;
  startThinking: () => void;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  speechQueueRef: React.MutableRefObject<string[]>;
  bargeInCallbackRef: React.MutableRefObject<(() => void) | null>;
}

// Simple barge-in patterns (user wants AI to stop)
const STOP_PATTERNS = /^(cala?\s*a?\s*boca|para|pare|silêncio|chega|shh+|pera|peraí|espera|stop|shut\s+up|wait)\s*[.!]?$/i;

export function useNeuralVoice(
  setAiResponding?: (val: boolean) => void,
): UseNeuralVoiceReturn {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const ttsRef = useRef(true);
  const recRef = useRef<any>(null);
  const speakingRef = useRef(false);
  const maleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const onCmdRef = useRef<((c: string) => void) | null>(null);
  const listeningRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const bargeInCallbackRef = useRef<(() => void) | null>(null);
  const speechBufferRef = useRef("");
  const speechDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenTextRef = useRef("");
  const lastSpokenAtRef = useRef(0);
  const lastProcessedTranscriptRef = useRef("");
  const lastProcessedAtRef = useRef(0);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Active Audio element for barge-in cancellation (Google TTS / Kokoro) */
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const updateAiResponding = useCallback((val: boolean) => {
    VoiceState.aiResponding = val;
    setAiResponding?.(val);
  }, [setAiResponding]);

  useEffect(() => { ttsRef.current = ttsOn; }, [ttsOn]);
  useEffect(() => { listeningRef.current = listening; }, [listening]);

  useEffect(() => {
    if (typeof window !== "undefined") setSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    initVoicePicker();
    const voice = getOrionVoice();
    if (voice) maleVoiceRef.current = voice;
    
    const handler = () => {
      const v = getOrionVoice();
      if (v) maleVoiceRef.current = v;
    };
    speechSynthesis?.addEventListener?.("voiceschanged", handler);
    return () => speechSynthesis?.removeEventListener?.("voiceschanged", handler);
  }, []);

  const scheduleRecognitionRestart = useCallback((delay?: number) => {
    clearRestartTimer();
    if (intentionalStopRef.current || speakingRef.current || !onCmdRef.current) {
      setListening(false);
      return;
    }

    const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    const restartDelay = delay ?? (isMobile ? 400 : 100);

    setListening(true);
    restartTimerRef.current = setTimeout(() => {
      if (intentionalStopRef.current || speakingRef.current || !onCmdRef.current) {
        setListening(false);
        return;
      }
      try {
        recRef.current?.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }, restartDelay);
  }, [clearRestartTimer]);

  const resumeSTT = useCallback(() => {
    if (listeningRef.current && onCmdRef.current && !intentionalStopRef.current) {
      if (speechBufferRef.current.trim() && onCmdRef.current) {
        const pending = speechBufferRef.current.trim();
        speechBufferRef.current = "";
        if (speechDebounceRef.current) {
          clearTimeout(speechDebounceRef.current);
          speechDebounceRef.current = null;
        }
        onCmdRef.current(pending);
      }
      const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
      scheduleRecognitionRestart(isMobile ? 600 : 100);
    }
  }, [scheduleRecognitionRestart]);

  /** Stop all audio: Web Speech, Audio elements, abort controllers */
  const bargeIn = useCallback(() => {
    try { speechSynthesis.cancel(); } catch {}
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    // Cancel active Audio element (Google TTS / Kokoro)
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current.src = "";
      } catch {}
      activeAudioRef.current = null;
    }
    speechQueueRef.current = [];
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    speakingRef.current = false;
    updateAiResponding(false);
    if (bargeInCallbackRef.current) bargeInCallbackRef.current();
  }, [updateAiResponding]);

  const browserSpeak = useCallback((rawText: string) => {
    const text = cleanTextForSpeech(rawText);
    if (!text) return Promise.resolve();
    
    // Split into smaller chunks (~160 chars) to avoid Chrome's ~15s cutoff
    const splitIntoChunks = (t: string): string[] => {
      if (t.length <= 160) return [t];
      const sentences = t.match(/[^.!?…;:]+[.!?…;:]+\s*/g) || [t];
      const chunks: string[] = [];
      let current = "";
      for (const s of sentences) {
        if (current.length + s.length > 160 && current.length > 0) {
          chunks.push(current.trim());
          current = s;
        } else {
          current += s;
        }
      }
      if (current.trim()) chunks.push(current.trim());
      return chunks;
    };

    const chunks = splitIntoChunks(text);

    return new Promise<void>((resolve) => {
      // Safety timeout: 60s max for entire speech (was 15s — too aggressive)
      const webSpeechTimeout = setTimeout(() => {
        try { speechSynthesis.cancel(); } catch {}
        if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
        speakingRef.current = false;
        updateAiResponding(false);
        resumeSTT();
        resolve();
      }, 60000);

      // Chrome bug workaround: pause/resume every 10s to prevent auto-stop
      const keepAlive = setInterval(() => {
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
          speechSynthesis.pause();
          speechSynthesis.resume();
        }
      }, 10000);
      keepAliveRef.current = keepAlive;

      try {
        speechSynthesis.cancel();
        
        const speakNextChunk = (idx: number) => {
          if (idx >= chunks.length) {
            clearTimeout(webSpeechTimeout);
            if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
            speakingRef.current = false;
            updateAiResponding(false);
            resumeSTT();
            resolve();
            return;
          }
          const u = new SpeechSynthesisUtterance(chunks[idx]);
          u.lang = "pt-BR";
          u.rate = ORION_VOICE_PARAMS.rate;
          u.pitch = ORION_VOICE_PARAMS.pitch;
          u.volume = ORION_VOICE_PARAMS.volume;
          if (maleVoiceRef.current) u.voice = maleVoiceRef.current;
          u.onend = () => speakNextChunk(idx + 1);
          u.onerror = (ev) => {
            // If canceled (barge-in), stop chain
            if ((ev as any)?.error === "canceled" || (ev as any)?.error === "interrupted") {
              clearTimeout(webSpeechTimeout);
              if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
              speakingRef.current = false;
              updateAiResponding(false);
              resumeSTT();
              resolve();
              return;
            }
            speakNextChunk(idx + 1);
          };
          speechSynthesis.speak(u);
        };
        
        speakNextChunk(0);
      } catch {
        clearTimeout(webSpeechTimeout);
        if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
        speakingRef.current = false;
        updateAiResponding(false);
        resumeSTT();
        resolve();
      }
    });
  }, [resumeSTT, updateAiResponding]);

  /** speakFast: Web Speech API only (machine voice, zero latency) */
  const speakFast = useCallback(async (text: string) => {
    if (!ttsRef.current || typeof window === "undefined") return;
    // Cancel any ongoing speech to prevent overlap
    try { speechSynthesis.cancel(); } catch {}
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); activeAudioRef.current.src = ""; } catch {}
      activeAudioRef.current = null;
    }
    if (speakingRef.current) speakingRef.current = false;
    speakingRef.current = true;
    updateAiResponding(true);
    lastSpokenTextRef.current = normalizeSpeechText(text).slice(0, 320);
    lastSpokenAtRef.current = Date.now();
    speechBufferRef.current = "";
    if (speechDebounceRef.current) { clearTimeout(speechDebounceRef.current); speechDebounceRef.current = null; }
    clearRestartTimer();
    try { recRef.current?.stop(); } catch {}

    // Web Speech API only (machine voice — no external APIs)
    if ("speechSynthesis" in window) {
      await browserSpeak(text);
      console.log("[Voice] ✅ speakFast: Web Speech (machine voice)");
    }

    speakingRef.current = false;
    updateAiResponding(false);
    resumeSTT();
  }, [browserSpeak, clearRestartTimer, resumeSTT, updateAiResponding]);

  const speak = useCallback(async (text: string) => {
    if (!ttsRef.current || typeof window === "undefined") return;
    // Cancel ALL ongoing speech to prevent dual-voice overlap
    try { speechSynthesis.cancel(); } catch {}
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); activeAudioRef.current.src = ""; } catch {}
      activeAudioRef.current = null;
    }
    speakingRef.current = true;
    updateAiResponding(true);
    lastSpokenTextRef.current = normalizeSpeechText(text).slice(0, 320);
    lastSpokenAtRef.current = Date.now();
    speechBufferRef.current = "";
    if (speechDebounceRef.current) {
      clearTimeout(speechDebounceRef.current);
      speechDebounceRef.current = null;
    }
    clearRestartTimer();
    try { recRef.current?.stop(); } catch {}

    // Safety timeout: 60s max
    const safetyTimer = setTimeout(() => {
      if (speakingRef.current) {
        try { speechSynthesis.cancel(); } catch {}
        if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
        if (activeAudioRef.current) {
          try { activeAudioRef.current.pause(); } catch {}
          activeAudioRef.current = null;
        }
        speakingRef.current = false;
        updateAiResponding(false);
        resumeSTT();
      }
    }, 60000);

    const cleanText = cleanTextForSpeech(text);

    // ── TTS: Web Speech API only (no external APIs) ──
    if ("speechSynthesis" in window) {
      try { speechSynthesis.cancel(); } catch {}
      try {
        await browserSpeak(text);
        console.log("[Voice] ✅ Web Speech API (local)");
      } catch {}
    }
    
    clearTimeout(safetyTimer);
    abortControllerRef.current = null;
    activeAudioRef.current = null;
    speakingRef.current = false;
    updateAiResponding(false);
    resumeSTT();
  }, [browserSpeak, clearRestartTimer, resumeSTT, updateAiResponding]);

  // No-op startThinking (filler audio removed)
  const startThinking = useCallback(() => {}, []);

  const startListening = useCallback((onCmd: (c: string) => void) => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    intentionalStopRef.current = false;
    clearRestartTimer();
    onCmdRef.current = onCmd;

    try {
      try { recRef.current?.stop(); } catch {}
      const rec = new SR();
      rec.lang = "pt-BR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      
      rec.onstart = () => setListening(true);
      
      rec.onresult = (e: any) => {
        const lastResult = e.results[e.results.length - 1];
        const transcript = lastResult?.[0]?.transcript?.trim() || "";
        const isFinal = lastResult?.isFinal;
        
        if (!transcript) return;

        // Barge-in: if AI is speaking and user says stop command
        if (speakingRef.current || VoiceState.aiResponding) {
          if (STOP_PATTERNS.test(transcript.trim())) {
            bargeIn();
            speechBufferRef.current = "";
            return;
          }
          // If user speaks 3+ words while AI is speaking, barge in
          if (isFinal && transcript.split(/\s+/).length >= 3) {
            bargeIn();
          }
        }

        if (!isFinal) return;

        speechBufferRef.current = speechBufferRef.current
          ? `${speechBufferRef.current} ${transcript}`
          : transcript;

        if (speechDebounceRef.current) clearTimeout(speechDebounceRef.current);
        
        // ── Dynamic Turn Detection: adapt silence based on phrase completeness ──
        const turnState = detectTurnState(speechBufferRef.current, "pt-BR");
        const silenceMs = getOptimalSilenceDuration(turnState);

        speechDebounceRef.current = setTimeout(() => {
          const fullText = speechBufferRef.current.trim();
          speechBufferRef.current = "";
          if (!fullText || !onCmdRef.current) return;

          const normalized = normalizeSpeechText(fullText);
          const now = Date.now();
          
          if (normalized.length < 3) return;
          
          // Duplicate check
          const isDuplicate = normalized === lastProcessedTranscriptRef.current && now - lastProcessedAtRef.current < 6000;
          
          // Echo detection (simple)
          const isEcho = Boolean(
            lastSpokenTextRef.current &&
            now - lastSpokenAtRef.current < 6000 &&
            normalized.length > 12 &&
            lastSpokenTextRef.current.includes(normalized.slice(0, 30))
          );

          if (isDuplicate || isEcho) return;

          lastProcessedTranscriptRef.current = normalized;
          lastProcessedAtRef.current = now;
          onCmdRef.current(fullText);
        }, silenceMs);
      };
      
      rec.onend = () => {
        if (intentionalStopRef.current) {
          setListening(false);
          return;
        }
        if (!speakingRef.current && onCmdRef.current) {
          scheduleRecognitionRestart(150);
          return;
        }
        if (!speakingRef.current) setListening(false);
      };
      
      rec.onerror = (e: any) => {
        if (intentionalStopRef.current || e.error === "aborted") return;
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setListening(false);
          toast.error("Permissão do microfone bloqueada");
          return;
        }
        if (e.error === "no-speech") {
          scheduleRecognitionRestart(150);
          return;
        }
        scheduleRecognitionRestart(400);
      };
      
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [bargeIn, clearRestartTimer, scheduleRecognitionRestart]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    clearRestartTimer();
    onCmdRef.current = null;
    speakingRef.current = false;
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    if (speechDebounceRef.current) {
      clearTimeout(speechDebounceRef.current);
      speechDebounceRef.current = null;
    }
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); activeAudioRef.current.src = ""; } catch {}
      activeAudioRef.current = null;
    }
    speechBufferRef.current = "";
    try { speechSynthesis.cancel(); } catch {}
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    setListening(false);
  }, [clearRestartTimer]);

  useEffect(() => () => clearRestartTimer(), [clearRestartTimer]);

  return { listening, supported, ttsOn, setTtsOn, speak, speakFast, startListening, stop, bargeIn, startThinking, abortControllerRef, speechQueueRef, bargeInCallbackRef };
}
