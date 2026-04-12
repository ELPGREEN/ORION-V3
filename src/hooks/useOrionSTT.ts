import { useState, useRef, useCallback, useEffect } from "react";

interface UseOrionSTTOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (transcript: string) => void;
  onWakeWord?: () => void;
  wakeWord?: string;
}

// Extend Window for webkitSpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function useOrionSTT(options: UseOrionSTTOptions = {}) {
  const {
    lang = "pt-BR",
    continuous = true,
    onResult,
    onWakeWord,
    wakeWord = "orion",
  } = options;

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const pausedForTTSRef = useRef(false);

  // Check support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      setError("SpeechRecognition não suportado neste navegador");
    }
  }, []);

  // Listen for TTS events to pause/resume
  useEffect(() => {
    const handleTTSStart = () => {
      if (listening) {
        pausedForTTSRef.current = true;
        recognitionRef.current?.stop();
      }
    };

    const handleTTSEnd = () => {
      if (pausedForTTSRef.current) {
        pausedForTTSRef.current = false;
        // Small delay to avoid capturing TTS audio echo
        setTimeout(() => {
          if (shouldRestartRef.current) {
            startListening();
          }
        }, 300);
      }
    };

    window.addEventListener("orion-tts-started", handleTTSStart);
    window.addEventListener("orion-tts-ended", handleTTSEnd);
    return () => {
      window.removeEventListener("orion-tts-started", handleTTSStart);
      window.removeEventListener("orion-tts-ended", handleTTSEnd);
    };
  }, [listening]); // eslint-disable-line react-hooks/exhaustive-deps

  const startListening = useCallback(() => {
    if (!supported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Stop existing
    try { recognitionRef.current?.stop(); } catch {}

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
      shouldRestartRef.current = true;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        const trimmed = final.trim();
        setTranscript(trimmed);
        setInterimTranscript("");

        // Check for wake word
        const lower = trimmed.toLowerCase();
        if (lower.includes(wakeWord.toLowerCase())) {
          onWakeWord?.();
          // Extract command after wake word
          const wakeIdx = lower.indexOf(wakeWord.toLowerCase());
          const command = trimmed.slice(wakeIdx + wakeWord.length).trim();
          if (command) {
            onResult?.(command);
          }
        } else {
          onResult?.(trimmed);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("[STT] Error:", event.error);
      if (event.error === "not-allowed") {
        setError("Permissão de microfone negada");
        shouldRestartRef.current = false;
      } else if (event.error === "no-speech") {
        // Normal — just restart
      } else {
        setError(`Erro STT: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setListening(false);
      // Auto-restart if should continue
      if (shouldRestartRef.current && !pausedForTTSRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err: any) {
      console.error("[STT] Start error:", err);
      setError(err?.message || "Erro ao iniciar microfone");
    }
  }, [supported, lang, continuous, wakeWord, onResult, onWakeWord]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    pausedForTTSRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setListening(false);
    setInterimTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    shouldRestartRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  return {
    startListening,
    stopListening,
    listening,
    transcript,
    interimTranscript,
    supported,
    error,
  };
}
