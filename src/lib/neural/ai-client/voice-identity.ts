/**
 * Voice Identity — Cached state + event listener
 * Extracted from orion-ai-client.ts (lines 69-83)
 */

// ═══ VOICE IDENTITY CACHE — persists across calls, updated by orion:voice-transcription event ═══
let _cachedVoiceIdentity: string | undefined;
let _voiceIdentityListenerAttached = false;

export function initVoiceIdentityListener() {
  if (_voiceIdentityListenerAttached || typeof window === "undefined") return;
  _voiceIdentityListenerAttached = true;
  window.addEventListener("orion:voice-transcription", () => {
    _cachedVoiceIdentity = (window as any).__orionIdentityStatus || _cachedVoiceIdentity;
  });
}

export function getCachedVoiceIdentity(): string | undefined {
  return (window as any)?.__orionIdentityStatus || _cachedVoiceIdentity;
}
