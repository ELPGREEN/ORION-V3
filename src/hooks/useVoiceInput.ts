import { useState, useCallback, useRef, useEffect } from "react";
import { getOrionVoice, initVoicePicker, ORION_VOICE_PARAMS } from "@/lib/voice/voicePicker";

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

  // Store callbacks in refs to avoid recreating startListening
  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  // Check SpeechRecognition support and current mic permission
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (navigator.permissions) {
      navigator.permissions.query({ name: "microphone" as PermissionName }).then((status) => {
        setMicPermission(status.state as "prompt" | "granted" | "denied");
        status.onchange = () => {
          setMicPermission(status.state as "prompt" | "granted" | "denied");
        };
      }).catch(() => {});
    }
  }, []);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission("granted");
      return true;
    } catch (err: any) {
      setMicPermission("denied");
      return false;
    }
  }, []);

  const startListening = useCallback(async (): Promise<boolean> => {
    // Don't start if currently speaking (mutual silencing)
    if (isSpeaking) return false;

    if (recognitionRef.current) {
      intentionalStopRef.current = true;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    if (micPermission !== "granted") {
      const granted = await requestMicPermission();
      if (!granted) return false;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      intentionalStopRef.current = false;
      setIsListening(true);
    };
    
    recognition.onresult = (event: any) => {
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
      if (event.error === "not-allowed") {
        setMicPermission("denied");
      } else if (event.error === "aborted") {
        intentionalStopRef.current = true;
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!intentionalStopRef.current) {
        onEndRef.current?.();
      }
      intentionalStopRef.current = false;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch (e) {
      return false;
    }
  }, [lang, continuous, micPermission, requestMicPermission, isSpeaking]);

  const stopListening = useCallback(() => {
    intentionalStopRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

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
      // Remove code blocks and inline code
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      // Remove markdown bold/italic
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
      // Remove headers
      .replace(/#{1,6}\s*/g, "")
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove URLs
      .replace(/https?:\/\/\S+/g, "")
      // Remove comment syntax (//, /* */)
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove decorative chars and pipe tables
      .replace(/[~|─═╔╗╚╝║╠╣╬┌┐└┘├┤┬┴┼]/g, "")
      // Remove bullet markers
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // Remove technical emojis (keep conversational ones)
      .replace(/[🔹⭐◽📋🔄✅❌📌🔧⚙️🛡️⚠️📊📈📉🔍🔎💡🔗📁📂🗂️🗃️]/g, "")
      // Normalize whitespace
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

  // ── Unified TTS Cascade: Orion → ElevenLabs → Piper → WebSpeech ──
  // Integrates all 4 synthesis platforms with evolution feedback loop
  const speak = useCallback((text: string, options?: { rate?: number; pitch?: number; onComplete?: () => void }) => {
    // Mutual silencing: stop listening before speaking
    if (recognitionRef.current) {
      intentionalStopRef.current = true;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
      setIsListening(false);
    }

    if (typeof window === "undefined") {
      options?.onComplete?.();
      return;
    }

    window.speechSynthesis?.cancel();
    setIsSpeaking(true);

    const finalize = () => {
      setIsSpeaking(false);
      const cb = options?.onComplete;
      cb?.();
    };

    // Async cascade — runs through all 4 tiers
    (async () => {
      // ── Single voice: Browser Web Speech (masculine PT-BR) ──
      if (window.speechSynthesis) {
        const bestVoice = getOrionVoice();
        const sentences = preprocessForSpeech(text);

        if (sentences.length === 0) {
          finalize();
          return;
        }

        let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

        // Fixed voice parameters — no more consciousness-based modulation
        const fixedRate = options?.rate ?? ORION_VOICE_PARAMS.rate;
        const fixedPitch = options?.pitch ?? ORION_VOICE_PARAMS.pitch;

        await new Promise<void>((resolve) => {
          sentences.forEach((sentence, i) => {
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.lang = lang;
            utterance.rate = fixedRate;
            utterance.pitch = fixedPitch;
            utterance.volume = ORION_VOICE_PARAMS.volume;

            if (bestVoice) utterance.voice = bestVoice;

            if (i === 0) {
              utterance.onstart = () => {
                keepAliveInterval = setInterval(() => {
                  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                  }
                }, 10000);
              };
            }

            if (i === sentences.length - 1) {
              utterance.onend = () => {
                if (keepAliveInterval) clearInterval(keepAliveInterval);
                resolve();
              };
              utterance.onerror = () => {
                if (keepAliveInterval) clearInterval(keepAliveInterval);
                resolve();
              };
            }

            window.speechSynthesis.speak(utterance);
          });
        });

        console.log("[VoiceInput] ✅ Web Speech (masculine voice)");
        finalize();
        return;
      }

      finalize();
    })().catch(() => finalize());
  }, [lang, selectBestVoice, preprocessForSpeech]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onSpeakEndCallbackRef.current = null;
    setIsSpeaking(false);
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
