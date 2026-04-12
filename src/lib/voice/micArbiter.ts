/**
 * Unified Microphone Arbiter — single global owner for all SpeechRecognition.
 * Prevents duplicate instances from HMR, wake word vs STT conflicts, etc.
 *
 * Modes: idle | wake | command
 * Only ONE recognition instance can exist at a time.
 */

export type MicMode = "idle" | "wake" | "command";

interface MicArbiterState {
  ownerId: number;
  mode: MicMode;
  rec: any | null;
  cleanup: (() => void) | null;
}

const MIC_GLOBAL_KEY = "__orion_mic_arbiter__";

function getState(): MicArbiterState {
  const w = window as any;
  if (!w[MIC_GLOBAL_KEY]) {
    w[MIC_GLOBAL_KEY] = { ownerId: 0, mode: "idle" as MicMode, rec: null, cleanup: null };
  }
  return w[MIC_GLOBAL_KEY];
}

/** Kill any existing recognition and claim ownership. Returns new owner ID. */
export function claimMic(mode: MicMode = "idle"): number {
  const s = getState();
  // Run previous cleanup
  if (s.cleanup) { try { s.cleanup(); } catch {} }
  s.cleanup = null;
  // Kill existing recognition
  try { s.rec?.abort?.(); } catch {}
  try { s.rec?.stop?.(); } catch {}
  s.rec = null;
  s.mode = mode;
  s.ownerId++;
  return s.ownerId;
}

/** Release mic ONLY if this owner is still current */
export function releaseMic(ownerId: number, nextMode: MicMode = "idle"): boolean {
  const s = getState();
  if (s.ownerId !== ownerId) return false;
  if (s.cleanup) { try { s.cleanup(); } catch {} }
  s.cleanup = null;
  try { s.rec?.abort?.(); } catch {}
  try { s.rec?.stop?.(); } catch {}
  s.rec = null;
  s.mode = nextMode;
  return true;
}

/** Check if given ID is still the active owner */
export function isMicOwner(id: number): boolean {
  return getState().ownerId === id;
}

/** Register the current recognition instance */
export function registerMicRec(rec: any, mode: MicMode) {
  const s = getState();
  s.rec = rec;
  s.mode = mode;
}

/** Register cleanup function for the ACTIVE owner */
export function registerMicCleanup(fn: () => void) {
  getState().cleanup = fn;
}

/** Get current mic mode */
export function getMicMode(): MicMode {
  return getState().mode;
}

/** Set mic mode without changing ownership */
export function setMicMode(mode: MicMode) {
  getState().mode = mode;
}

/** Force-kill any active recognition (e.g., before TTS) */
export function killMicRec() {
  const s = getState();
  if (s.cleanup) { try { s.cleanup(); } catch {} }
  s.cleanup = null;
  try { s.rec?.abort?.(); } catch {}
  try { s.rec?.stop?.(); } catch {}
  s.rec = null;
  s.mode = "idle";
}

/** Get the active recognition instance (for external checks) */
export function getActiveMicRec(): any | null {
  return getState().rec;
}
