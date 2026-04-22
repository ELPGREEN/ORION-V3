/**
 * Central debounce lock for vision commands.
 *
 * Prevents duplicate "Visão ativada" / "Desativando visão" TTS and camera
 * toggles when multiple paths (regex local, voice-intent-dispatcher,
 * useOrionReasoning) dispatch the same action within a short window.
 *
 * The lock is shared across the whole app via `window.__orionVisionCommandLock__`
 * so independent listeners observe the same state.
 */

export const VISION_LOCK_KEY = "__orionVisionCommandLock__" as const;
export const VISION_LOCK_WINDOW_MS = 3000;

export type VisionLockAction = "activate_vision" | "deactivate_vision";

interface LockEntry {
  action: string;
  ts: number;
}

type LockHost = Record<string, LockEntry | undefined>;

function getHost(): LockHost {
  if (typeof window === "undefined") {
    // Fallback for non-browser environments (SSR, isolated tests).
    // We still want a single shared object across calls.
    const g = globalThis as unknown as { __orionVisionLockHost__?: LockHost };
    if (!g.__orionVisionLockHost__) g.__orionVisionLockHost__ = {};
    return g.__orionVisionLockHost__;
  }
  return window as unknown as LockHost;
}

/**
 * Returns true when the action should be suppressed (same action fired
 * within `windowMs`). Otherwise records the new lock and returns false.
 */
export function shouldSuppressVisionCommand(
  action: string,
  now: number = Date.now(),
  windowMs: number = VISION_LOCK_WINDOW_MS,
): boolean {
  const host = getHost();
  const lastLock = host[VISION_LOCK_KEY];
  if (lastLock && lastLock.action === action && now - lastLock.ts < windowMs) {
    return true;
  }
  host[VISION_LOCK_KEY] = { action, ts: now };
  return false;
}

/** Test helper — clears the lock so tests start from a clean state. */
export function resetVisionCommandLock(): void {
  const host = getHost();
  host[VISION_LOCK_KEY] = undefined;
}
