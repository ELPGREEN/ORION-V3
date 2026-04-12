/**
 * Orion Voice Engine — Gemini-First TTS (simplified)
 * 
 * CASCADE:
 * 1. Gemini TTS (2.5 Flash) → primary, high quality
 * 2. Web Speech API → instant browser fallback
 */

import { speakWithGeminiTTS, isGeminiTTSAvailable } from "./geminiTTS";

export interface OrionVoiceResult {
  played: boolean;
  audio: HTMLAudioElement | null;
  engine: string;
}

/**
 * Synthesize speech using Gemini TTS with Web Speech fallback
 */
const ORION_STYLE_PROMPT = `Você é ORION, IA Lumen7 AquaMonkey Fusion — visionário, criativo, empático e lógico.
PERFIL VOCAL OBRIGATÓRIO:
- Voz masculina tenor, F0 médio ~200Hz, alcance 145-315Hz
- Entonação AMPLA e expressiva — variação natural como conversa animada
- Ritmo moderado-rápido (~4.4 sílabas/s), fluência CONTÍNUA sem pausas longas
- Máximo 0.15s entre frases — transições instantâneas e suaves
- Tom confiante, caloroso, amigável — como um amigo inteligente explicando algo
- Sotaque brasileiro neutro/padrão, articulação clara
- NUNCA pare no meio de frase, NUNCA faça silêncio prolongado
- Fale como podcast profissional brasileiro — ritmo constante e envolvente`;

export async function speakWithOrionVoice(
  text: string,
  signal?: AbortSignal,
): Promise<OrionVoiceResult> {
  const fail: OrionVoiceResult = { played: false, audio: null, engine: "none" };
  if (!text?.trim()) return fail;
  if (signal?.aborted) return fail;

  const cleanText = text.trim().slice(0, 3000);

  // ── 1. GEMINI TTS (primary) ──
  if (isGeminiTTSAvailable()) {
    try {
      const result = await speakWithGeminiTTS(cleanText, "Enceladus", signal, ORION_STYLE_PROMPT, "pt-BR");
      if (result.played) {
        return { played: true, audio: result.audio, engine: "gemini-tts" };
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.warn("[Orion Voice] Gemini TTS failed:", err?.message);
      }
    }
  }

  if (signal?.aborted) return fail;

  // ── 2. WEB SPEECH (browser fallback) ──
  try {
    const u = new SpeechSynthesisUtterance(cleanText);
    u.lang = "pt-BR";
    u.rate = 1.25;
    u.pitch = 1.1;
    await new Promise<void>((resolve) => {
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
    return { played: true, audio: null, engine: "web-speech" };
  } catch {}

  return fail;
}

/** Orion voice is always available */
export function isOrionVoiceAvailable(): boolean {
  return true;
}
