/**
 * ─── Filler Audio ───
 * Plays natural "thinking" sounds while LLM processes.
 * Reduces perceived latency by filling silence gaps.
 * Uses Web Speech API — no external dependencies.
 */

import { getOrionVoice, ORION_VOICE_PARAMS } from "@/lib/voice/voicePicker";

const FILLERS_PT = [
  "Hmm, deixa eu ver...",
  "Um momento...",
  "Certo, analisando...",
  "Hmm...",
  "Deixa eu pensar...",
  "Hmm, interessante...",
  "Um instante...",
];

let _lastFillerIdx = -1;
let _fillerUtterance: SpeechSynthesisUtterance | null = null;
let _fillerTimeout: ReturnType<typeof setTimeout> | null = null;
let _cancelled = false;

function pickFiller(): string {
  let idx = Math.floor(Math.random() * FILLERS_PT.length);
  if (idx === _lastFillerIdx) idx = (idx + 1) % FILLERS_PT.length;
  _lastFillerIdx = idx;
  return FILLERS_PT[idx];
}

/**
 * Start filler after a delay (only if still in "thinking" state).
 * @param delayMs Wait before playing filler (default 1500ms)
 * @param checkStillThinking Callback that returns true if we should still play
 */
export function scheduleFillerAudio(
  delayMs = 1500,
  checkStillThinking: () => boolean = () => true,
): void {
  cancelFillerAudio();
  _cancelled = false;

  _fillerTimeout = setTimeout(() => {
    if (_cancelled || !checkStillThinking()) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const text = pickFiller();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = ORION_VOICE_PARAMS.rate * 1.1; // Slightly faster for fillers
    u.pitch = ORION_VOICE_PARAMS.pitch;
    u.volume = ORION_VOICE_PARAMS.volume * 0.7; // Softer
    const voice = getOrionVoice();
    if (voice) u.voice = voice;

    _fillerUtterance = u;
    u.onend = () => { _fillerUtterance = null; };
    u.onerror = () => { _fillerUtterance = null; };

    window.speechSynthesis.speak(u);
    console.log(`[Filler] 🗣️ "${text}"`);
  }, delayMs);
}

/** Cancel any pending or playing filler */
export function cancelFillerAudio(): void {
  _cancelled = true;
  if (_fillerTimeout) {
    clearTimeout(_fillerTimeout);
    _fillerTimeout = null;
  }
  if (_fillerUtterance) {
    try { window.speechSynthesis.cancel(); } catch {}
    _fillerUtterance = null;
  }
}

/** Check if filler is currently playing */
export function isFillerPlaying(): boolean {
  return _fillerUtterance !== null && window.speechSynthesis?.speaking;
}
