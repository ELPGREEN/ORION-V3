import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseOrionTTSOptions {
  voice?: string;
  lang?: string;
}

export function useOrionTTS(options: UseOrionTTSOptions = {}) {
  const { voice = "Charon", lang = "pt-BR" } = options;

  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Lazy init AudioContext
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Stop current playback
  const stop = useCallback(() => {
    try {
      sourceRef.current?.stop();
    } catch {}
    sourceRef.current = null;
    setSpeaking(false);
  }, []);

  // Speak text
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    stop();
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("gemini-tts", {
        body: { text, voice, lang },
      });

      if (fnError) throw fnError;

      // Check if response is audio binary or JSON fallback
      if (data instanceof Blob || data instanceof ArrayBuffer) {
        const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;
        const ctx = getAudioCtx();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          setSpeaking(false);
          sourceRef.current = null;
          // Dispatch event so STT can resume
          window.dispatchEvent(new CustomEvent("orion-tts-ended"));
        };

        sourceRef.current = source;
        setSpeaking(true);
        source.start();
      } else if (data?.fallback || data?.error) {
        // JSON fallback response — TTS failed, use browser synthesis
        console.warn("[TTS] Gemini fallback, using browser speech:", data.error);
        fallbackBrowserTTS(text);
      } else {
        throw new Error("Unexpected TTS response format");
      }
    } catch (err: any) {
      console.error("[useOrionTTS] Error:", err);
      setError(err?.message || "Erro ao gerar voz");
      // Fallback to browser TTS
      fallbackBrowserTTS(text);
    } finally {
      setLoading(false);
    }
  }, [voice, lang, stop, getAudioCtx]);

  // Browser TTS fallback
  const fallbackBrowserTTS = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      window.dispatchEvent(new CustomEvent("orion-tts-ended"));
    };
    window.speechSynthesis.speak(utterance);
  }, [lang]);

  return { speak, stop, speaking, loading, error };
}
