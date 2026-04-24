/**
 * Persistent Microphone Stream — keeps mic hardware "warm" on mobile.
 * Once permission is granted, maintains a single MediaStream so the browser
 * never releases the mic hardware. This prevents the activate/deactivate
 * cycling that causes delays on mobile.
 */

const MOBILE_REGEX = /android|iphone|ipad|ipod|mobile/i;

const PERSISTENT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

interface PersistentMicState {
  stream: MediaStream | null;
  granted: boolean;
  checking: boolean;
}

const GLOBAL_KEY = "__orion_persistent_mic__";

function getState(): PersistentMicState {
  const w = window as any;
  if (!w[GLOBAL_KEY]) {
    w[GLOBAL_KEY] = { stream: null, granted: false, checking: false };
  }
  return w[GLOBAL_KEY];
}

async function openPersistentStream(state: PersistentMicState): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: PERSISTENT_AUDIO_CONSTRAINTS,
  });

  state.stream = stream;
  state.granted = true;

  // Pre-warm a shared AudioContext during the same user gesture that granted mic.
  // On mobile (iOS/Android), AudioContext starts "suspended" until a gesture; warming
  // it here removes the perceived "audio sleep" delay on first STT capture.
  try {
    const w = window as any;
    let ctx: AudioContext | undefined = w.__orion_shared_audio_ctx__;
    if (!ctx || ctx.state === "closed") {
      ctx = new AudioContext({ sampleRate: 48000 });
      w.__orion_shared_audio_ctx__ = ctx;
    }
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }
  } catch (err) {
    console.warn("[PersistentMic] AudioContext pre-warm failed:", err);
  }

  console.log("[PersistentMic] Stream ativo + AudioContext pré-aquecido");
  return true;
}

export function isMobile(): boolean {
  return typeof navigator !== "undefined" && MOBILE_REGEX.test(navigator.userAgent);
}

export function getPersistentMicStream(): MediaStream | null {
  const stream = getState().stream;
  return stream && stream.active ? stream : null;
}

/** Check if mic permission is already granted (no prompt) */
export async function isMicPermissionGranted(): Promise<boolean> {
  try {
    const perm = await navigator.permissions?.query?.({ name: "microphone" as any });
    return perm?.state === "granted";
  } catch {
    return false;
  }
}

/**
 * Ensure a persistent mic stream exists on mobile.
 * On desktop, this is a no-op (desktop handles mic fine without persistence).
 * Returns true if mic is ready to use.
 */
export async function ensurePersistentMic(): Promise<boolean> {
  const s = getState();

  // Already have a live stream
  if (s.stream && s.stream.active) {
    s.granted = true;
    return true;
  }

  // Avoid concurrent checks
  if (s.checking) return s.granted;
  s.checking = true;

  try {
    // Check permission first — don't prompt
    const granted = await isMicPermissionGranted();
    if (!granted) {
      s.checking = false;
      return false;
    }

    s.granted = true;

    // Keep a persistent stream on all devices to avoid activate/deactivate cycling sounds
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        await openPersistentStream(s);
      } catch (err) {
        console.warn("[PersistentMic] Falha ao manter stream:", err);
      }
    }

    s.checking = false;
    return true;
  } catch {
    s.checking = false;
    return false;
  }
}

/** Request mic access from a direct user gesture and keep the stream open */
export async function requestPersistentMic(): Promise<boolean> {
  const s = getState();

  if (s.stream && s.stream.active) {
    s.granted = true;
    return true;
  }

  if (s.checking) return s.granted;
  s.checking = true;

  try {
    const ready = await openPersistentStream(s);
    s.checking = false;
    return ready;
  } catch (err) {
    console.warn("[PersistentMic] Falha ao solicitar stream persistente:", err);
    s.checking = false;
    return false;
  }
}

/** Release the persistent stream (only on explicit user action) */
export function releasePersistentMic() {
  const s = getState();
  if (s.stream) {
    s.stream.getTracks().forEach(t => t.stop());
    s.stream = null;
  }
  s.granted = false;
}

/** Check if mic is ready without triggering any permission */
export function isMicReady(): boolean {
  return getState().granted;
}
