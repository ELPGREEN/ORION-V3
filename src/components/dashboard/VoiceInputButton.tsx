import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { languageToLocale } from "@/i18n";
import { cleanTextForSpeech } from "@/hooks/useNeuralVoice";
import { speakWithGeminiTTS, isGeminiTTSAvailable } from "@/lib/tts/geminiTTS";
import { speakWithPiper } from "@/lib/tts/piperTTS";

// ═══════════════════════════════════════════════════════════
// R.A.G ELP Voice Button — Conversação Contínua Hands-Free
// Mic → Auto-send → IA responde → Gemini TTS fala → Mic reativa
// Google Translate / SpeechSynthesis removidos (voz robótica)
// ═══════════════════════════════════════════════════════════

type VoiceStatus = "idle" | "listening" | "processing" | "speaking";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  onAutoSend?: (text: string) => void;
  speakText?: string;
  isProcessing?: boolean;
  className?: string;
}

/**
 * High-quality TTS speak using the same cascade as useNeuralVoice:
 * Gemini TTS → Piper WASM (no robotic SpeechSynthesis)
 */
async function speakHighQuality(text: string, abortSignal?: AbortSignal): Promise<void> {
  const clean = cleanTextForSpeech(text).slice(0, 1500);
  if (!clean) return;

  // Try Gemini TTS first
  if (isGeminiTTSAvailable()) {
    try {
      const result = await speakWithGeminiTTS(clean, "Charon", abortSignal);
      if (result.played) return;
    } catch {}
  }

  // Fallback: Piper WASM (still not robotic)
  try {
    const played = await speakWithPiper(clean);
    if (played) return;
  } catch {}

  // Last resort: do nothing rather than use robotic SpeechSynthesis
  console.warn("[VoiceButton] No high-quality TTS available, skipping speech");
}

export function VoiceInputButton({ onTranscript, onAutoSend, speakText, isProcessing, className }: VoiceInputButtonProps) {
  const [conversationMode, setConversationMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [isSpeakingHQ, setIsSpeakingHQ] = useState(false);
  const lastSpokenTextRef = useRef("");
  const conversationModeRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const { language } = useLanguage();
  const voiceLang = languageToLocale[language] || "pt-BR";

  // Keep ref in sync
  useEffect(() => { conversationModeRef.current = conversationMode; }, [conversationMode]);

  const { isListening, isSupported, toggleListening, startListening, stopListening } = useVoiceInput({
    lang: voiceLang,
    onResult: (text) => {
      onTranscript(text);
      if (conversationModeRef.current && onAutoSend) {
        onAutoSend(text);
      }
    },
  });

  // Update visual status
  useEffect(() => {
    if (isSpeakingHQ) {
      setVoiceStatus("speaking");
    } else if (isProcessing) {
      setVoiceStatus("processing");
    } else if (isListening) {
      setVoiceStatus("listening");
    } else {
      setVoiceStatus("idle");
    }
  }, [isListening, isProcessing, isSpeakingHQ]);

  // High-quality speak wrapper
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

  const stopSpeakingHQ = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    window.speechSynthesis?.cancel();
    setIsSpeakingHQ(false);
  }, []);

  // Auto-speak new assistant responses in conversation mode
  useEffect(() => {
    if (!conversationMode || !speakText || speakText === lastSpokenTextRef.current) return;
    if (isProcessing) return;
    
    lastSpokenTextRef.current = speakText;

    doSpeak(speakText, () => {
      if (conversationModeRef.current) {
        setTimeout(() => startListening(), 400);
      }
    });
  }, [speakText, conversationMode, isProcessing, doSpeak, startListening]);

  // Toggle conversation mode
  const handleToggleConversation = useCallback(() => {
    if (conversationMode) {
      setConversationMode(false);
      stopSpeakingHQ();
      stopListening();
      setVoiceStatus("idle");
    } else {
      setConversationMode(true);
      startListening();
    }
  }, [conversationMode, startListening, stopListening, stopSpeakingHQ]);

  if (!isSupported) return null;

  const statusLabels: Record<VoiceStatus, string> = {
    idle: "",
    listening: "Ouvindo...",
    processing: "Processando...",
    speaking: "Falando...",
  };

  const statusColors: Record<VoiceStatus, string> = {
    idle: "",
    listening: "text-green-400",
    processing: "text-yellow-400",
    speaking: "text-cyan-400",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Conversation mode toggle */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleToggleConversation}
        className={cn(
          "h-[44px] w-[44px] p-0 flex items-center justify-center flex-shrink-0 relative transition-all",
          conversationMode
            ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
        title={conversationMode ? "Desativar modo conversa" : "Ativar modo conversa por voz"}
      >
        <Headphones className="h-5 w-5" />
        {conversationMode && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
        )}
      </Button>

      {/* Mic button (manual push-to-talk when not in conversation mode) */}
      {!conversationMode && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleListening}
          className={cn(
            "h-[44px] w-[44px] p-0 flex items-center justify-center flex-shrink-0 relative transition-all",
            isListening 
              ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
          title={isListening ? "Parar gravação" : "Comando de voz"}
        >
          {isListening ? (
            <>
              <MicOff className="h-5 w-5" />
              <span className="absolute inset-0 rounded-md border-2 border-red-400 animate-ping opacity-30" />
            </>
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
      )}

      {/* TTS button — speak last response (manual, when not in conversation mode) */}
      {!conversationMode && speakText && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isSpeakingHQ) {
              stopSpeakingHQ();
            } else if (speakText) {
              doSpeak(speakText);
            }
          }}
          className={cn(
            "h-8 w-8 p-0 flex-shrink-0",
            isSpeakingHQ ? "text-cyan-400 bg-cyan-400/10" : "text-muted-foreground hover:text-foreground"
          )}
          title={isSpeakingHQ ? "Parar fala" : "Ouvir resposta"}
        >
          {isSpeakingHQ ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      )}

      {/* Status label in conversation mode */}
      {conversationMode && voiceStatus !== "idle" && (
        <span className={cn("text-[10px] tracking-wider uppercase animate-pulse", statusColors[voiceStatus])}>
          {statusLabels[voiceStatus]}
        </span>
      )}
    </div>
  );
}
