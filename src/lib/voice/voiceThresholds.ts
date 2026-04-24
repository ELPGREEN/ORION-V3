/**
 * Voice Thresholds — per-device/browser tunable parameters
 *
 * Controls "no speech" timeout, GCP STT silence handling, and turn-detection
 * tweaks per platform. Each platform can be overridden at runtime via
 * `setVoiceThresholdsOverride()` and persisted in localStorage.
 *
 * Defaults are conservative to minimize false "check your microphone" warnings
 * (Safari iOS in particular reports interim text less aggressively than Chrome).
 */

export type VoicePlatform =
  | "chrome-desktop"
  | "chrome-android"
  | "safari-desktop"
  | "safari-ios"
  | "firefox"
  | "edge"
  | "other";

export interface VoiceThresholds {
  /** ms before showing the "I can't hear you" toast while listening */
  noSpeechToastMs: number;
  /** ms of silence before GCP STT cuts the utterance (sent to backend) */
  gcpChunkIntervalMs: number;
  /** Multiplier applied to turnDetection silence durations (1 = default) */
  turnSilenceMultiplier: number;
  /** Minimum confidence to accept a 1-2 word transcript */
  shortUtteranceMinConfidence: number;
  /** When true, suppress the no-speech toast entirely on this platform */
  suppressNoSpeechToast: boolean;
}

const STORAGE_KEY = "orion.voice.thresholds.override.v1";

// ── Per-platform defaults (curated from real user reports) ──
const DEFAULTS: Record<VoicePlatform, VoiceThresholds> = {
  "chrome-desktop": {
    noSpeechToastMs: 20000,
    gcpChunkIntervalMs: 1400,
    turnSilenceMultiplier: 1,
    shortUtteranceMinConfidence: 0.12,
    suppressNoSpeechToast: false,
  },
  "chrome-android": {
    noSpeechToastMs: 25000,
    gcpChunkIntervalMs: 1600,
    turnSilenceMultiplier: 1.1,
    shortUtteranceMinConfidence: 0.15,
    suppressNoSpeechToast: false,
  },
  "safari-desktop": {
    // Safari interim events are sparser → give it more headroom
    noSpeechToastMs: 30000,
    gcpChunkIntervalMs: 1800,
    turnSilenceMultiplier: 1.25,
    shortUtteranceMinConfidence: 0.15,
    suppressNoSpeechToast: false,
  },
  "safari-ios": {
    // iOS Safari throttles audio + Web Speech is unreliable → suppress by default
    noSpeechToastMs: 35000,
    gcpChunkIntervalMs: 2000,
    turnSilenceMultiplier: 1.4,
    shortUtteranceMinConfidence: 0.18,
    suppressNoSpeechToast: true,
  },
  firefox: {
    noSpeechToastMs: 25000,
    gcpChunkIntervalMs: 1600,
    turnSilenceMultiplier: 1.1,
    shortUtteranceMinConfidence: 0.15,
    suppressNoSpeechToast: false,
  },
  edge: {
    noSpeechToastMs: 20000,
    gcpChunkIntervalMs: 1400,
    turnSilenceMultiplier: 1,
    shortUtteranceMinConfidence: 0.12,
    suppressNoSpeechToast: false,
  },
  other: {
    noSpeechToastMs: 22000,
    gcpChunkIntervalMs: 1500,
    turnSilenceMultiplier: 1.1,
    shortUtteranceMinConfidence: 0.15,
    suppressNoSpeechToast: false,
  },
};

// ── Platform detection ──
export function detectVoicePlatform(): VoicePlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || (ua.includes("mac") && "ontouchend" in document);
  const isAndroid = /android/.test(ua);
  const isEdge = /edg\//.test(ua);
  const isFirefox = /firefox\//.test(ua);
  // Safari check must come before Chrome since Chrome on iOS reports as Safari
  const isSafari = /safari\//.test(ua) && !/chrome\//.test(ua) && !/crios\//.test(ua);
  const isChrome = /chrome\//.test(ua) || /crios\//.test(ua);

  if (isEdge) return "edge";
  if (isFirefox) return "firefox";
  if (isSafari) return isIOS ? "safari-ios" : "safari-desktop";
  if (isChrome) return isAndroid ? "chrome-android" : "chrome-desktop";
  return "other";
}

// ── Override management ──
function loadOverrides(): Partial<Record<VoicePlatform, Partial<VoiceThresholds>>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(o: Partial<Record<VoicePlatform, Partial<VoiceThresholds>>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(o));
  } catch {
    // ignore — localStorage may be unavailable in private/embedded contexts
  }
}

/**
 * Resolve final thresholds for the current platform (defaults + overrides).
 */
export function getVoiceThresholds(platform?: VoicePlatform): VoiceThresholds {
  const p = platform || detectVoicePlatform();
  const base = DEFAULTS[p];
  const override = loadOverrides()[p] || {};
  return { ...base, ...override };
}

/**
 * Persist a partial override for a given platform. Pass `null` for a key
 * to revert that field to its default.
 */
export function setVoiceThresholdsOverride(
  platform: VoicePlatform,
  patch: Partial<VoiceThresholds>,
) {
  const all = loadOverrides();
  all[platform] = { ...(all[platform] || {}), ...patch };
  saveOverrides(all);
}

export function clearVoiceThresholdsOverride(platform?: VoicePlatform) {
  if (!platform) {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    return;
  }
  const all = loadOverrides();
  delete all[platform];
  saveOverrides(all);
}

export function getVoiceThresholdsDefaults(platform: VoicePlatform): VoiceThresholds {
  return { ...DEFAULTS[platform] };
}
