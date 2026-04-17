/**
 * TTS Prewarm — fire-and-forget cache priming for Orion's most common
 * short utterances. Runs once per session in the background after idle.
 *
 * Effect: by the time the user hears Orion say "ok" or "claro" for the first
 * time, the audio is already in IndexedDB → instant playback (~5ms).
 */

import { fetchGeminiAudio } from "./geminiTTS";

const COMMON_PHRASES = [
  "Ok.",
  "Claro.",
  "Entendi.",
  "Pronto.",
  "Sim.",
  "Não.",
  "Um momento.",
  "Já vou.",
  "Certo.",
  "Estou ouvindo.",
  "Como posso ajudar?",
  "Pode falar.",
  "Anotado.",
  "Feito.",
  "Beleza.",
  "Sem problema.",
  "Já entendi.",
  "Estou aqui.",
];

let prewarmStarted = false;

export function prewarmCommonTTS(voice: string = "Enceladus", lang: string = "pt-BR"): void {
  if (prewarmStarted) return;
  prewarmStarted = true;

  const run = async () => {
    for (const phrase of COMMON_PHRASES) {
      try {
        const ctrl = new AbortController();
        // fetchGeminiAudio handles cache itself — duplicates are skipped server-side
        await fetchGeminiAudio(phrase, voice, ctrl.signal, undefined, lang);
        // small gap so we don't burst the edge function
        await new Promise((r) => setTimeout(r, 400));
      } catch {
        /* swallow */
      }
    }
    console.log("[TTS Prewarm] ✅ common phrases cached");
  };

  // Start when browser is idle, fall back to setTimeout
  const schedule = (cb: () => void) => {
    if (typeof (window as any).requestIdleCallback === "function") {
      (window as any).requestIdleCallback(cb, { timeout: 8000 });
    } else {
      setTimeout(cb, 4000);
    }
  };
  schedule(() => void run());
}
