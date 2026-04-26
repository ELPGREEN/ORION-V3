/**
 * Unified Microphone Arbiter — single global owner for all SpeechRecognition.
 * Prevents duplicate instances from HMR, wake word vs STT conflicts, etc.
 *
 * v31: Persistent Shared Recognition — maintains a SINGLE SpeechRecognition
 * instance that never stops, preventing the "beeping/clicking" sound on mobile.
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
}

const MIC_GLOBAL_KEY = "__orion_mic_arbiter_v31__";

function getState(): MicArbiterState {
  const w = window as any;
  if (!w[MIC_GLOBAL_KEY]) {
    w[MIC_GLOBAL_KEY] = {
      ownerId: 0,
      mode: "idle",
      sharedRec: null,
      listeners: null,
      isStarted: false,
      restartTimer: null
    };
  }
  return w[MIC_GLOBAL_KEY];
}

/**
 * Prime the shared recognition instance.
 * Call this from a user gesture.
 */
export function primeSharedMic() {
  const s = getState();
  if (s.sharedRec) return s.sharedRec;

  const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (!SR) return null;

  console.log("[MicArbiter] Creating persistent Shared Recognition instance");
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "pt-BR";
  rec.maxAlternatives = 3;

  rec.onstart = () => {
    console.log("[MicArbiter] Shared Mic started");
    s.isStarted = true;
    s.listeners?.onStart();
  };

  rec.onresult = (e: any) => {
    s.listeners?.onResult(e);
  };

  rec.onend = () => {
    s.isStarted = false;
    s.listeners?.onEnd();

    // Restart imediato (sem gap audível) enquanto não estiver idle.
    // Mesma lógica em todos os dispositivos — evita o ciclo liga/desliga no mobile.
    if (s.mode !== "idle") {
      if (s.restartTimer) clearTimeout(s.restartTimer);
      s.restartTimer = setTimeout(() => {
        if (s.mode !== "idle" && !s.isStarted && s.sharedRec) {
          try { s.sharedRec.start(); } catch (err: any) {
            // InvalidStateError = já está rodando; ignorar
            if (err?.name !== "InvalidStateError") {
              console.warn("[MicArbiter] Restart falhou:", err);
            }
          }
        }
      }, 50);
    }
  };

  rec.onerror = (e: any) => {
    console.warn("[MicArbiter] Shared Mic error:", e.error);
    if (e.error === "aborted") s.isStarted = false;
    s.listeners?.onError(e);
  };

  s.sharedRec = rec;
  return rec;
}

/** Claim the mic. Returns ownerId. Does NOT stop the hardware. */
export function claimMic(mode: MicMode = "idle", listeners?: MicListeners): number {
  const s = getState();
  s.mode = mode;
  s.listeners = listeners || null;
  s.ownerId++;

  // Ensure started
  if (mode !== "idle" && !s.isStarted) {
    const rec = s.sharedRec || primeSharedMic();
    if (rec) {
      try { rec.start(); } catch {}
    }
  }

  return s.ownerId;
}

export function releaseMic(ownerId: number, nextMode: MicMode = "idle"): boolean {
  const s = getState();
  if (s.ownerId !== ownerId) return false;

  s.mode = nextMode;
  s.listeners = null;

  // We DON'T stop the sharedRec here to keep it "hot"
  return true;
}

export function isMicOwner(id: number): boolean {
  return getState().ownerId === id;
}

/** Force stop everything (e.g., app logout) */
export function killMicRec() {
  const s = getState();
  s.mode = "idle";
  s.listeners = null;
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
