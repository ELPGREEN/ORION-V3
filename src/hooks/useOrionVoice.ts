import { useState, useCallback } from "react";
import { useOrionTTS } from "./useOrionTTS";
import { useOrionSTT } from "./useOrionSTT";

interface UseOrionVoiceOptions {
  onCommand?: (command: string) => void;
  onWakeWord?: () => void;
  lang?: string;
  voice?: string;
  autoListen?: boolean;
}

export function useOrionVoice(options: UseOrionVoiceOptions = {}) {
  const {
    onCommand,
    onWakeWord,
    lang = "pt-BR",
    voice = "Charon",
  } = options;

  const [wakeWordDetected, setWakeWordDetected] = useState(false);

  const tts = useOrionTTS({ voice, lang });

  const stt = useOrionSTT({
    lang,
    continuous: true,
    wakeWord: "orion",
    onWakeWord: () => {
      setWakeWordDetected(true);
      onWakeWord?.();
      // Reset after 10s
      setTimeout(() => setWakeWordDetected(false), 10_000);
    },
    onResult: (text) => {
      onCommand?.(text);
    },
  });

  // Speak and auto-resume listening after
  const speakAndResume = useCallback(async (text: string) => {
    window.dispatchEvent(new CustomEvent("orion-tts-started"));
    await tts.speak(text);
  }, [tts]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (stt.listening) {
      stt.stopListening();
    } else {
      stt.startListening();
    }
  }, [stt]);

  return {
    // STT
    listening: stt.listening,
    transcript: stt.transcript,
    interimTranscript: stt.interimTranscript,
    startListening: stt.startListening,
    stopListening: stt.stopListening,
    toggleListening,
    sttSupported: stt.supported,
    sttError: stt.error,

    // TTS
    speaking: tts.speaking,
    ttsLoading: tts.loading,
    speak: tts.speak,
    speakAndResume,
    stopSpeaking: tts.stop,
    ttsError: tts.error,

    // Wake word
    wakeWordDetected,
  };
}
