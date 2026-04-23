/**
 * Orion Voice Hook — Refactored for real-time STT + Gemini TTS
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { STTStreamer } from "@/lib/voice/stt-streamer";
import { speakWithGeminiTTS } from "@/lib/tts/geminiTTS";
import { toast } from "sonner";

export function cleanTextForSpeech(text: string): string {
  // Remove problematic phrases with flexible matching including punctuation
  let clean = text.replace(/Prepare-se para (a\s+)?ação[,.]?\s*(Debre|Debrin|Dri)\s+(ao|é\s+o)\s+máximo[,.]?\s*(e\s+)?deixa que eu te proteja\.?!?/gi, "");
  clean = clean.replace(/(Debre|Debrin|Dri)\s+(ao|é\s+o)\s+máximo[,.]?\s*(e\s+)?deixa que eu te proteja\.?!?/gi, "");

  return clean
    .replace(/```[\s\S]*?```/g, " código omitido ")
    .replace(/[*_#\`]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\.+$/, "") // Remove trailing dots
    .trim();
}

export function useNeuralVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const streamerRef = useRef<STTStreamer | null>(null);

  const startListening = useCallback(async () => {
    if (!streamerRef.current) {
      streamerRef.current = new STTStreamer({
        onTranscript: (text, isFinal) => {
          setTranscript(prev => isFinal ? text : prev + " " + text);
          if (isFinal) {
            handleCommand(text);
          }
        },
        onError: (err) => {
          toast.error("Erro no microfone");
          setIsListening(false);
        }
      });
    }
    await streamerRef.current.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    streamerRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleCommand = async (text: string) => {
    console.log("[Orion] Command:", text);
    if (text.toLowerCase().includes("orion")) {
      await speak("Sim, estou ouvindo. Como posso ajudar?");
    }
  };

  const speak = async (text: string) => {
    setIsSpeaking(true);
    await speakWithGeminiTTS(text);
    setIsSpeaking(false);
  };

  return {
    isListening,
    transcript,
    isSpeaking,
    startListening,
    stopListening,
    speak
  };
}

export const VoiceState = { aiResponding: false };
