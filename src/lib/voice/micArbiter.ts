/**
 * Unified Microphone Arbiter — single global owner for all SpeechRecognition.
 * Prevents duplicate instances from HMR, wake word vs STT conflicts, etc.
 *
 * v32: Hardware Decoupled — Separates mic reservation from activation.
 * Keeps a single instance but gives full control over when it's "hot".
 */

export type MicMode = "idle" | "wake" | "command";

interface MicListeners {
  onResult: (e: any) => void;
  onEnd: () => void;
  onError: (e: any) => void;
  onStart: () => void;
}

interface MicArbiterState {
  ownerId: number;
  mode: MicMode;
  sharedRec: any | null;
  listeners: MicListeners | null;
  isStarted: boolean;
  restartTimer: any | null;
  manualStop: boolean; // Prevent auto-restart if explicitly stopped
}

const MIC_GLOBAL_KEY = "__orion_mic_arbiter_v32__";

function getState(): MicArbiterState {
  const w = window as any;
  if (!w[MIC_GLOBAL_KEY]) {
    w[MIC_GLOBAL_KEY] = {
      ownerId: 0,
      mode: "idle",
      sharedRec: null,
      listeners: null,
      isStarted: false,
      restartTimer: null,
      manualStop: false
    };
  }
  return w[MIC_GLOBAL_KEY];
}

/**
 * Prime the shared recognition instance.
 * Call this from a user gesture. Does NOT start the mic.
 */
export function primeSharedMic() {
  const s = getState();
  if (s.sharedRec) return s.sharedRec;

  const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (!SR) return null;

  console.log("[MicArbiter] Initializing persistent Shared Recognition (Web Speech API)");
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "pt-BR";
  rec.maxAlternatives = 3;

  rec.onstart = () => {
    console.log("[MicArbiter] Web Speech started");
    s.isStarted = true;
    s.manualStop = false;
    s.listeners?.onStart();
  };

  rec.onresult = (e: any) => {
    s.listeners?.onResult(e);
  };

  rec.onend = () => {
    console.log("[MicArbiter] Web Speech ended");
    s.isStarted = false;
    s.listeners?.onEnd();

    // Auto-restart logic — ONLY if not manually stopped and not idle
    if (s.mode !== "idle" && !s.manualStop) {
      if (s.restartTimer) clearTimeout(s.restartTimer);
      s.restartTimer = setTimeout(() => {
        if (s.mode !== "idle" && !s.manualStop && !s.isStarted && s.sharedRec) {
          try {
            s.sharedRec.start();
          } catch (err: any) {
            if (err?.name !== "InvalidStateError") {
              console.warn("[MicArbiter] Restart failed:", err);
            }
          }
        }
      }, 150); // Slightly more relaxed restart
    }
  };

  rec.onerror = (e: any) => {
    if (e.error !== "no-speech" && e.error !== "aborted") {
      console.warn("[MicArbiter] Web Speech error:", e.error);
    }
    if (e.error === "aborted" || e.error === "no-speech") s.isStarted = false;
    s.listeners?.onError(e);
  };

  s.sharedRec = rec;
  return rec;
}

/**
 * Explicitly start the Web Speech recognition hardware.
 */
export function startSharedMic() {
  const s = getState();
  const rec = s.sharedRec || primeSharedMic();
  if (!rec) return false;

  s.manualStop = false;
  if (!s.isStarted) {
    try {
  console.log(`[MicArbiter] Releasing mic from owner ${ownerId} to mode ${nextMode}`);
      rec.start();
      return true;
    } catch (err: any) {
      if (err?.name === "InvalidStateError") return true; // Already running
      console.warn("[MicArbiter] Manual start failed:", err);
      return false;
    }
  }
  return true;
}

/**
 * Explicitly stop the Web Speech recognition hardware.
 * Use this to avoid competition with GCP STT or during TTS.
 */
export function stopSharedMic() {
  const s = getState();
  s.manualStop = true;
  if (s.restartTimer) {
    clearTimeout(s.restartTimer);
    s.restartTimer = null;
  }
  if (s.isStarted && s.sharedRec) {
    try {
      s.sharedRec.stop();
      s.isStarted = false;
    } catch (err) {
      console.warn("[MicArbiter] Stop failed:", err);
    }
  }
}

/** Claim the mic resource. Does NOT start the hardware. */
export function claimMic(mode: MicMode = "idle", listeners?: MicListeners): number {
  const s = getState();
  s.mode = mode;
  s.listeners = listeners || null;
  s.ownerId++;
  console.log(`[MicArbiter] Mic claimed by owner ${s.ownerId} in ${mode} mode`);
  return s.ownerId;
}

export function releaseMic(ownerId: number, nextMode: MicMode = "idle"): boolean {
  const s = getState();
  if (s.ownerId !== ownerId) return false;

  s.mode = nextMode;
  s.listeners = null;
  // If releasing to idle, we should also stop the hardware
  if (nextMode === "idle") {
    stopSharedMic();
  }
  return true;
}

export function isMicOwner(id: number): boolean {
  return getState().ownerId === id;
}

export function isMicStarted(): boolean {
  return getState().isStarted;
}

/** Force stop everything (e.g., app logout) */
export function killMicRec() {
  const s = getState();
  s.mode = "idle";
  s.listeners = null;
  s.manualStop = true;
  if (s.restartTimer) clearTimeout(s.restartTimer);
  try { s.sharedRec?.abort(); } catch {}
  s.sharedRec = null;
  s.isStarted = false;
}

export function getMicMode(): MicMode {
  return getState().mode;
}

export function getActiveMicRec(): any | null {
  return getState().sharedRec;
}
