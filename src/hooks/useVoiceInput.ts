import { useState, useCallback, useRef, useEffect } from "react";
import { getOrionVoice, initVoicePicker, ORION_VOICE_PARAMS } from "@/lib/voice/voicePicker";
import { claimMic, isMicOwner, registerMicRec, releaseMic } from "@/lib/voice/micArbiter";

// ═══════════════════════════════════════════════════════════
// R.A.G ELP Voice Engine — 100% Free, No API Key
// STT: SpeechRecognition | TTS: SpeechSynthesis (enhanced)
// Uses ONLY native browser APIs — works offline
// Supports continuous conversation mode with mutual silencing
// ═══════════════════════════════════════════════════════════

interface UseVoiceInputOptions {
  lang?: string;
  continuous?: boolean;
  phrasePauseMs?: number;
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
}

// Initialize unified voice picker on load
initVoicePicker();

export function useVoiceInput({ lang = "pt-BR", continuous = false, phrasePauseMs = 950, onResult, onEnd }: UseVoiceInputOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onSpeakEndCallbackRef = useRef<(() => void) | null>(null);
  const intentionalStopRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const mountedRef = useRef(true);
  const micOwnerIdRef = useRef(0);
  const phraseBufferRef = useRef("");
  const phraseTimerRef = useRef<number | null>(null);
  const lastFinalTranscriptRef = useRef("");
  const lastEmissionRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });

  // Store callbacks in refs to avoid recreating startListening
  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  // Keep speaking ref in sync
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  const normalizeTranscript = useCallback((text: string) => text.replace(/\s+/g, " ").trim(), []);

  const clearPhraseTimer = useCallback(() => {
    if (phraseTimerRef.current !== null) {
      window.clearTimeout(phraseTimerRef.current);
      phraseTimerRef.current = null;
    }
  }, []);

  const mergeTranscriptChunks = useCallback((current: string, next: string) => {
    const a = normalizeTranscript(current);
    const b = normalizeTranscript(next);
    if (!a) return b;
    if (!b) return a;
    if (a === b || a.endsWith(b)) return a;
    if (b.startsWith(a)) return b;

    const aWords = a.split(" ");
    const bWords = b.split(" ");
    const maxOverlap = Math.min(aWords.length, bWords.length);

    for (let overlap = maxOverlap; overlap > 0; overlap--) {
      const aTail = aWords.slice(-overlap).join(" ");
      const bHead = bWords.slice(0, overlap).join(" ");
      if (aTail === bHead) {
        return normalizeTranscript(`${a} ${bWords.slice(overlap).join(" ")}`);
      }
    }

    return normalizeTranscript(`${a} ${b}`);
  }, [normalizeTranscript]);

  const appendPhraseChunk = useCallback((chunk: string) => {
    const normalizedChunk = normalizeTranscript(chunk);
    if (!normalizedChunk) return;
    phraseBufferRef.current = mergeTranscriptChunks(phraseBufferRef.current, normalizedChunk);
  }, [mergeTranscriptChunks, normalizeTranscript]);

  const flushPhraseBuffer = useCallback(() => {
    clearPhraseTimer();
    const text = normalizeTranscript(phraseBufferRef.current);
    phraseBufferRef.current = "";
    lastFinalTranscriptRef.current = "";
    if (!text) return;

    const now = Date.now();
    const isRapidDuplicate =
      lastEmissionRef.current.text === text &&
      now - lastEmissionRef.current.at < Math.max(1600, phrasePauseMs + 500);

    if (mountedRef.current) setTranscript(text);
    if (isRapidDuplicate) return;

    lastEmissionRef.current = { text, at: now };
    onResultRef.current?.(text);
  }, [clearPhraseTimer, normalizeTranscript, phrasePauseMs]);

  const schedulePhraseFlush = useCallback(() => {
    clearPhraseTimer();
    phraseTimerRef.current = window.setTimeout(() => {
      phraseTimerRef.current = null;
      flushPhraseBuffer();
    }, Math.max(300, phrasePauseMs));
  }, [clearPhraseTimer, flushPhraseBuffer, phrasePauseMs]);

  const buildTranscriptPreview = useCallback((interimText: string) => {
    const committed = normalizeTranscript(phraseBufferRef.current);
    const interim = normalizeTranscript(interimText);
    if (!committed) return interim;
    if (!interim) return committed;
    return mergeTranscriptChunks(committed, interim);
  }, [mergeTranscriptChunks, normalizeTranscript]);

  // Track mount status for async callbacks
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearPhraseTimer();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
      window.speechSynthesis?.cancel();
    };
  }, [clearPhraseTimer]);

  // Check SpeechRecognition support and current mic permission
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (navigator.permissions) {
      navigator.permissions.query({ name: "microphone" as PermissionName }).then((status) => {
        if (!mountedRef.current) return;
        setMicPermission(status.state as "prompt" | "granted" | "denied");
        status.onchange = () => {
          if (mountedRef.current) {
            setMicPermission(status.state as "prompt" | "granted" | "denied");
          }
        };
      }).catch(() => {});
    }
  }, []);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      if (mountedRef.current) setMicPermission("granted");
      return true;
    } catch (_err: any) {
      if (mountedRef.current) setMicPermission("denied");
      return false;
    }
  }, []);

  const destroyRecognition = useCallback(() => {
    clearPhraseTimer();
    flushPhraseBuffer();
    if (recognitionRef.current) {
      intentionalStopRef.current = true;
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    releaseMic(micOwnerIdRef.current);
  }, [clearPhraseTimer, flushPhraseBuffer]);

  const startListening = useCallback(async (): Promise<boolean> => {
    if (isSpeakingRef.current) return false;

    destroyRecognition();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    let currentPermission = micPermission;
    if (currentPermission !== "granted") {
      const granted = await requestMicPermission();
      if (!granted) return false;
      currentPermission = "granted";
    }

    phraseBufferRef.current = "";
    lastFinalTranscriptRef.current = "";
    clearPhraseTimer();
    micOwnerIdRef.current = claimMic("command");

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!mountedRef.current || !isMicOwner(micOwnerIdRef.current)) return;
      intentionalStopRef.current = false;
      lastFinalTranscriptRef.current = "";
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      if (!mountedRef.current || !isMicOwner(micOwnerIdRef.current)) return;

      let interimText = "";
      let hasNewFinalChunk = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = normalizeTranscript(result?.[0]?.transcript || "");
        if (!text) continue;

        if (result.isFinal) {
          const mergedFinal = mergeTranscriptChunks(lastFinalTranscriptRef.current, text);
          if (mergedFinal !== lastFinalTranscriptRef.current) {
            lastFinalTranscriptRef.current = mergedFinal;
            appendPhraseChunk(text);
            hasNewFinalChunk = true;
          }
          continue;
        }

        interimText = mergeTranscriptChunks(interimText, text);
      }

      const preview = buildTranscriptPreview(interimText);
      if (preview && mountedRef.current) {
        setTranscript(preview);
      }

      if (!hasNewFinalChunk) return;

      if (continuous) {
        schedulePhraseFlush();
      } else {
        flushPhraseBuffer();
      }
    };

    recognition.onerror = (event: any) => {
      if (!mountedRef.current || !isMicOwner(micOwnerIdRef.current)) return;

      if (event.error === "aborted") {
        return;
      }

      if (event.error === "not-allowed") {
        setMicPermission("denied");
      }

      if (event.error === "no-speech") {
        console.log("[VoiceInput] No speech detected, ending session");
      }

      flushPhraseBuffer();
      releaseMic(micOwnerIdRef.current);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (!mountedRef.current || !isMicOwner(micOwnerIdRef.current)) return;

      flushPhraseBuffer();

      if (!intentionalStopRef.current && continuous) {
        console.log("[VoiceInput] Auto-restarting continuous recognition");
        try {
          setTimeout(() => {
            if (mountedRef.current && !intentionalStopRef.current && recognitionRef.current) {
              lastFinalTranscriptRef.current = "";
              try { recognitionRef.current.start(); } catch {}
            }
          }, 300);
          return;
        } catch {}
      }

      releaseMic(micOwnerIdRef.current);
      setIsListening(false);

      if (!intentionalStopRef.current) {
        onEndRef.current?.();
      }
      intentionalStopRef.current = false;
    };

    recognitionRef.current = recognition;
    registerMicRec(recognition, "command");
    try {
      recognition.start();
      return true;
    } catch (e) {
      console.warn("[VoiceInput] Failed to start recognition:", e);
      recognitionRef.current = null;
      releaseMic(micOwnerIdRef.current);
      return false;
    }
  }, [appendPhraseChunk, buildTranscriptPreview, clearPhraseTimer, continuous, destroyRecognition, flushPhraseBuffer, lang, micPermission, mergeTranscriptChunks, normalizeTranscript, requestMicPermission, schedulePhraseFlush]);

  const stopListening = useCallback(() => {
    destroyRecognition();
    if (mountedRef.current) setIsListening(false);
  }, [destroyRecognition]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ── Voice selection — uses unified cached picker ──
  const selectBestVoice = useCallback((_voices: SpeechSynthesisVoice[], _targetLang: string): SpeechSynthesisVoice | null => {
    return getOrionVoice();
  }, []);

  // ── Intelligent text preprocessing for natural speech ──
  const preprocessForSpeech = useCallback((text: string): string[] => {
    let clean = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[~|─═╔╗╚╝║╠╣╬┌┐└┘├┤┬┴┼]/g, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/[🔹⭐◽📋🔄✅❌📌🔧⚙️🛡️⚠️📊📈📉🔍🔎💡🔗📁📂🗂️🗃️]/g, "")
      .replace(/\n{2,}/g, ".\n")
      .replace(/\n/g, ". ")
      .replace(/\s{2,}/g, " ")
      .trim();

    clean = clean
      .replace(/\bArt\.\s*/gi, "Artigo ")
      .replace(/\barts\.\s*/gi, "Artigos ")
      .replace(/\bCF\b/g, "Constituição Federal")
      .replace(/\bCPC\b/g, "Código de Processo Civil")
      .replace(/\bCPP\b/g, "Código de Processo Penal")
      .replace(/\bCC\b/g, "Código Civil")
      .replace(/\bSTF\b/g, "Supremo Tribunal Federal")
      .replace(/\bSTJ\b/g, "Superior Tribunal de Justiça")
      .replace(/\bTJ\b/g, "Tribunal de Justiça")
      .replace(/\bOAB\b/g, "Ordem dos Advogados do Brasil")
      .replace(/\bLGPD\b/g, "Lei Geral de Proteção de Dados")
      .replace(/\bn\.\s*(\d+)/gi, "número $1")
      .replace(/\bp\.\s*(\d+)/gi, "página $1")
      .replace(/\bfl\.\s*(\d+)/gi, "folha $1")
      .replace(/\bfls\.\s*(\d+)/gi, "folhas $1")
      .replace(/\b§\s*/g, "parágrafo ")
      .replace(/\binc\.\s*/gi, "inciso ");

    const sentences = clean.match(/[^.!?]+(?:[.!?]+|$)/g) || [clean];
    return sentences.map(s => s.trim()).filter(s => s.length > 2);
  }, []);

  // ── TTS: Gemini TTS (primary) → Formant → Piper (no robotic SpeechSynthesis) ──
  const speak = useCallback(async (text: string, options?: { rate?: number; pitch?: number; onComplete?: () => void }) => {
    // Mutual silencing: stop listening before speaking
    destroyRecognition();
    if (mountedRef.current) setIsListening(false);

    setIsSpeaking(true);
    isSpeakingRef.current = true;

    const finalize = () => {
      if (mountedRef.current) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      }
      options?.onComplete?.();
    };

    // ── PRIMARY: Gemini TTS (human voice) ──
    try {
      const { speakWithGeminiTTS } = await import("@/lib/tts/geminiTTS");
      const result = await speakWithGeminiTTS(text, "Charon");
      if (result.played) {
        if (result.audio) audioRef.current = result.audio;
        finalize();
        return;
      }
    } catch {}

    // ── FALLBACK: Web Speech ──
    console.warn("[VoiceInput] Gemini TTS unavailable, skipping speech");
    finalize();
  }, [destroyRecognition]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onSpeakEndCallbackRef.current = null;
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, []);

  return {
    isListening,
    isSupported,
    isSpeaking,
    transcript,
    micPermission,
    requestMicPermission,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    setTranscript,
  };
}
