import { useState, useEffect, useCallback, useRef } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useLanguage } from "@/contexts/LanguageContext";
import { languageToLocale } from "@/i18n";
import { cleanTextForSpeech } from "@/hooks/useNeuralVoice";

// ═══════════════════════════════════════════════════════════
// R.A.G ELP Voice — Always-On Continuous STT (invisible)
// Mic always active, no visible UI, auto-send, TTS on response
// ═══════════════════════════════════════════════════════════

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  onAutoSend?: (text: string) => void;
  speakText?: string;
  isProcessing?: boolean;
  className?: string;
}

async function speakHighQuality(text: string, abortSignal?: AbortSignal): Promise<void> {
  const clean = cleanTextForSpeech(text).slice(0, 3000);
  if (!clean) return;
  try {
    const { speakWithGeminiTTS } = await import("@/lib/tts/geminiTTS");
    const result = await speakWithGeminiTTS(clean, "Charon", abortSignal, "Você é ORION, IA Lumen7 AquaMonkey. Fale CONTÍNUO sem pausas. Máximo 0.2s entre frases. Voz MASCULINA grave, calorosa.", "pt-BR");
    if (result.played) return;
  } catch (e) {
    console.warn("[VoiceButton] Gemini TTS error:", e);
  }
  console.warn("[VoiceButton] Gemini TTS unavailable, staying silent");
}

export function VoiceInputButton({ onTranscript, onAutoSend, speakText, isProcessing }: VoiceInputButtonProps) {
  const [isSpeakingHQ, setIsSpeakingHQ] = useState(false);
  const lastSpokenTextRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const { language } = useLanguage();
  const voiceLang = languageToLocale[language] || "pt-BR";

  const { isSupported, startListening } = useVoiceInput({
    lang: voiceLang,
    continuous: true,
    phrasePauseMs: 1100,
    onResult: (text) => {
      onTranscript(text);
      if (onAutoSend) {
        onAutoSend(text);
      }
    },
  });

  // Auto-start mic on mount — always listening, no visible UI
  useEffect(() => {
    if (!isSupported || mountedRef.current) return;
    mountedRef.current = true;
    // Small delay to let component settle
    const timer = setTimeout(() => startListening(), 300);
    return () => clearTimeout(timer);
  }, [isSupported, startListening]);

  const doSpeak = useCallback(async (text: string, onComplete?: () => void) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSpeakingHQ(true);
    try {
      await speakHighQuality(text, controller.signal);
    } finally {
      setIsSpeakingHQ(false);
      onComplete?.();
    }
  }, []);

  // Auto-speak new assistant responses, then restart mic
  useEffect(() => {
    if (!speakText || speakText === lastSpokenTextRef.current) return;
    if (isProcessing) return;

    lastSpokenTextRef.current = speakText;

    doSpeak(speakText, () => {
      setTimeout(() => startListening(), 150);
    });
  }, [speakText, isProcessing, doSpeak, startListening]);

  // Render nothing — mic is always active invisibly
  return null;
}
