/**
 * Unified Voice Picker — Natural masculine PT-BR voice.
 * Picks the most HUMAN-sounding masculine voice ONCE and caches it.
 * Prioritizes neural/natural voices and avoids robotic synthesizers.
 * 
 * Tuned for warmth, depth and naturalness — like a real male speaker.
 */

let cachedVoice: SpeechSynthesisVoice | null = null;
let pickerResolved = false;

// Preferred masculine voice names (PT-BR) — ordered by quality
const PREFERRED_MALE = [
  // Microsoft Edge neural voices (best quality)
  "antonio", "humberto", "julio", "nicolau", "valerio",
  // Generic male identifiers
  "daniel", "felipe", "carlos", "luciano", "ricardo",
  "marcos", "thiago", "pedro", "paulo", "rafael",
  "male", "masc", "homme",
];

// Female names to strictly avoid
const FEMALE_NAMES = [
  "francisca", "fernanda", "luciana", "camila", "letícia",
  "vitória", "raquel", "maria", "ana", "female", "femin",
  "thalita", "heloisa", "elza", "yara", "brenda",
  "leila", "manuela", "isabela", "juliana", "natasha",
];

function scoreVoice(v: SpeechSynthesisVoice): number {
  let score = 0;
  const n = v.name.toLowerCase();

  // ── Quality tier: neural/natural voices sound most human ──
  if (n.includes("neural")) score += 200;
  if (n.includes("natural")) score += 180;
  if (n.includes("premium")) score += 160;
  if (n.includes("enhanced")) score += 120;
  if (n.includes("wavenet")) score += 100;
  if (n.includes("online")) score += 80;

  // ── Platform bonuses (Microsoft Edge has best neural voices) ──
  if (n.includes("microsoft")) score += 80;
  if (n.includes("apple")) score += 40;

  // ── Language match ──
  const lang = v.lang.toLowerCase();
  if (lang === "pt-br") score += 50;
  else if (lang.startsWith("pt")) score += 20;

  // ── Masculine preference ──
  if (PREFERRED_MALE.some(name => n.includes(name))) score += 150;

  // ── Penalize female voices heavily ──
  if (FEMALE_NAMES.some(name => n.includes(name))) score -= 300;

  // ── Penalize Google voices slightly (often robotic but usable) ──
  if (n.includes("google")) score -= 80;

  // ── Penalize default/generic voices ──
  if (v.default) score -= 20;
  
  // ── Local service bonus (lower latency, often better quality) ──
  if ((v as any).localService && !n.includes("google")) score += 30;

  return score;
}

function pickBestVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis?.getVoices?.() || [];
  if (voices.length === 0) return null;

  const ptVoices = voices.filter(v => v.lang?.toLowerCase().startsWith("pt"));
  const candidates = ptVoices.length > 0 ? ptVoices : voices;

  const scored = candidates.map(v => ({ voice: v, score: scoreVoice(v) }));
  scored.sort((a, b) => b.score - a.score);

  // Log top 3 for debugging
  if (scored.length > 0) {
    const top3 = scored.slice(0, 3).map(s => `"${s.voice.name}" (${s.score})`).join(", ");
    console.log(`[VoicePicker] 🎯 Top candidates: ${top3}`);
  }

  const best = scored[0]?.voice || null;
  if (best) {
    console.log(`[VoicePicker] ✅ Selected: "${best.name}" (${best.lang}) — locked for session`);
  }
  return best;
}

/**
 * Returns the cached voice. Call this from ALL speech synthesis points.
 */
export function getOrionVoice(): SpeechSynthesisVoice | null {
  if (pickerResolved) return cachedVoice;

  const voice = pickBestVoice();
  if (voice) {
    cachedVoice = voice;
    pickerResolved = true;
  }
  return cachedVoice;
}

/**
 * Initialize the voice picker. Call once on app startup.
 */
export function initVoicePicker(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const immediate = pickBestVoice();
  if (immediate) {
    cachedVoice = immediate;
    pickerResolved = true;
    return;
  }

  const handler = () => {
    if (pickerResolved) return;
    const voice = pickBestVoice();
    if (voice) {
      cachedVoice = voice;
      pickerResolved = true;
      speechSynthesis.removeEventListener("voiceschanged", handler);
    }
  };
  speechSynthesis.addEventListener("voiceschanged", handler);
}

/**
 * Speech parameters tuned for fast, dynamic conversational voice.
 * 
 * rate 1.30 — Faster, energetic pace (like a sharp professional)
 * pitch 0.92 — Close to natural pitch, not artificially deep
 * volume 0.92 — Clean without clipping
 */
export const ORION_VOICE_PARAMS = {
  rate: 1.30,
  pitch: 0.92,
  volume: 0.92,
} as const;
