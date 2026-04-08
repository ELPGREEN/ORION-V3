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
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
}

// Initialize unified voice picker on load
initVoicePicker();

export function useVoiceInput({ lang = "pt-BR", continuous = false, onResult, onEnd }: UseVoiceInputOptions = {}) {
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

  // Store callbacks in refs to avoid recreating startListening
  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  // Keep speaking ref in sync
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  // Track mount status for async callbacks
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cleanup on unmount
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

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
    } catch (err: any) {
      if (mountedRef.current) setMicPermission("denied");
      return false;
    }
  }, []);

  const destroyRecognition = useCallback(() => {
    if (recognitionRef.current) {
      intentionalStopRef.current = true;
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    releaseMic(micOwnerIdRef.current);
  }, []);

  const startListening = useCallback(async (): Promise<boolean> => {
    // Don't start if currently speaking (mutual silencing) — use ref to avoid stale closure
    if (isSpeakingRef.current) return false;

    // Destroy any existing instance first
    destroyRecognition();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    // Check/request mic permission
    let currentPermission = micPermission;
    if (currentPermission !== "granted") {
      const granted = await requestMicPermission();
      if (!granted) return false;
      currentPermission = "granted";
    }

    micOwnerIdRef.current = claimMic("command");

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!mountedRef.current || !isMicOwner(micOwnerIdRef.current)) return;
      intentionalStopRef.current = false;
      setIsListening(true);
    };
    
    recognition.onresult = (event: any) => {
      if (!mountedRef.current || !isMicOwner(micOwnerIdRef.current)) return;
      let finalTranscript = "";
      let interimTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      const combined = finalTranscript || interimTranscript;
      setTranscript(combined);
      
      if (finalTranscript && onResultRef.current) {
        onResultRef.current(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (!mountedRef.current || !isMicOwner(micOwnerIdRef.current)) return;
      
      // "aborted" is expected when we stop intentionally — ignore it
      if (event.error === "aborted") {
        return;
      }
      
      if (event.error === "not-allowed") {
        setMicPermission("denied");
      }
      
      // "no-speech" is not fatal — the user just didn't say anything
      if (event.error === "no-speech") {
        console.log("[VoiceInput] No speech detected, ending session");
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      if (!mountedRef.current || !isMicOwner(micOwnerIdRef.current)) return;
      setIsListening(false);
      
      // Only fire onEnd if stop was NOT intentional
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
  }, [lang, continuous, micPermission, requestMicPermission, destroyRecognition]);

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

  // ── TTS: High-quality Gemini TTS → Piper (no robotic SpeechSynthesis) ──
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

    try {
      // Orion's own formant voice (100% offline)
      const { speakWithOrionVoice } = await import("@/lib/tts/orionVoiceEngine");
      const result = await speakWithOrionVoice(text);
      if (result.played) {
        if (result.audio) audioRef.current = result.audio;
        finalize();
        return;
      }
    } catch {}

    try {
      // Fallback to Piper WASM
      const { speakWithPiper } = await import("@/lib/tts/piperTTS");
      const played = await speakWithPiper(text);
      if (played) {
        finalize();
        return;
      }
    } catch {}

    // No robotic SpeechSynthesis — prefer silence
    console.warn("[VoiceInput] No high-quality TTS available, skipping");
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
