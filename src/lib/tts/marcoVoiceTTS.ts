/**
 * Marco-Voice TTS — Tier 1.3 in Orion's Voice Cascade
 * 
 * Uses AIDC-AI/Marco-Voice via HuggingFace Inference API.
 * Supports emotional speech synthesis with speaker-emotion disentanglement.
 * 
 * Key features:
 * - 7 controllable emotions (neutral, happy, angry, sad, surprise, disgust, fear)
 * - Voice cloning capability
 * - High quality neural TTS
 * 
 * Fallback: Returns false if Space is unavailable (sleeping/error).
 */

import { cleanTextForSpeech } from "@/hooks/useNeuralVoice";

export type MarcoEmotion = "neutral" | "happy" | "angry" | "sad" | "surprise" | "disgust" | "fear";

interface MarcoVoiceOptions {
  emotion?: MarcoEmotion;
  speed?: number; // 0.5 - 2.0
}

let marcoDisabled = false;
let marcoRetryAfter = 0;

/**
 * Synthesize speech using Marco-Voice via HF Inference API.
 * Returns true if audio was played successfully.
 */
export async function speakWithMarcoVoice(
  rawText: string,
  options: MarcoVoiceOptions = {}
): Promise<boolean> {
  const text = cleanTextForSpeech(rawText);
  if (!text || text.length < 2) return false;

  // Check cooldown
  if (marcoDisabled && Date.now() < marcoRetryAfter) return false;
  if (marcoDisabled) marcoDisabled = false;

  const { emotion = "neutral", speed = 1.0 } = options;

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    
    if (!accessToken) {
      throw new Error("No auth session for HF inference");
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hf-inference`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: "inference",
        task: "text-to-speech",
        model: "AIDC-AI/Marco-Voice",
        inputs: text,
        parameters: {
          emotion,
          speed,
        },
        options: { wait_for_model: false },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 503) {
        // Model sleeping — disable for 2 minutes
        marcoDisabled = true;
        marcoRetryAfter = Date.now() + 120_000;
        console.warn("[TTS] Marco-Voice sleeping, retry em 2min");
      } else if (response.status === 429) {
        marcoDisabled = true;
        marcoRetryAfter = Date.now() + 30_000;
      }
      return false;
    }

    const data = await response.json();

    if (data?.data && data?.content_type?.startsWith("audio/")) {
      const binaryString = atob(data.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.content_type });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(audioUrl); reject(); };
        audio.play().catch(reject);
      });
      return true;
    }

    return false;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("[TTS] Marco-Voice timeout (12s)");
    } else {
      console.warn("[TTS] Marco-Voice error:", err?.message);
    }
    return false;
  }
}

/**
 * Detect emotion from text for automatic emotional TTS.
 * Simple heuristic — could be enhanced with sentiment analysis.
 */
export function detectEmotionFromText(text: string): MarcoEmotion {
  const lower = text.toLowerCase();
  
  // Happy indicators
  if (/[😊😄🎉👏✅]|parabéns|incrível|maravilh|excelente|fantástic|ótim[oa]|perfeito|legal|show|massa|demais|feliz|alegr/i.test(lower)) {
    return "happy";
  }
  
  // Sad indicators
  if (/[😢😞💔]|triste|infeliz|lament|pena|sinto muito|desculp|perdão|saudade|chorar/i.test(lower)) {
    return "sad";
  }
  
  // Angry/urgent indicators
  if (/[😤😡🔥]|urgente|grave|absurd|ridícul|inaceitável|revoltante|vergonha|cuidado|atenção|alerta/i.test(lower)) {
    return "angry";
  }
  
  // Surprise indicators
  if (/[😮😲🤯]|surpres|impressionante|inacreditável|caramba|nossa|puxa|uau|wow|sério\?/i.test(lower)) {
    return "surprise";
  }
  
  return "neutral";
}
