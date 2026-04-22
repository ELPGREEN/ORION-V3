/**
 * Vision Debug Bus
 *
 * Emits diagnostic events for the on-screen VisionDebugPanel so the user can
 * see in real time:
 *   - when STT captures "visão ativada" / similar
 *   - when the central debounce lock blocks a command
 *   - which guard regex (TTS echo / auto-response / follow-up) matched
 *
 * Wire-up:
 *   import { emitVisionDebug } from "@/lib/voice/visionDebugBus";
 *   emitVisionDebug({ kind: "stt-capture", text, matchedRegex: "VISION_TTS_ECHO_RE" });
 *
 * Panel subscribes via `window.addEventListener("vision-debug", …)`.
 * Zero cost when the panel is closed — events are just dispatched on window.
 */

export type VisionDebugKind =
  | "stt-capture" // raw STT transcript arrived
  | "vision-keyword" // transcript contained activate/deactivate keyword
  | "command-dispatch" // orion-vision-command event fired
  | "lock-block" // shouldSuppressVisionCommand returned true
  | "lock-pass" // shouldSuppressVisionCommand returned false
  | "guard-echo-block" // VISION_TTS_ECHO_RE matched during guard window
  | "guard-lowconf-block" // low-confidence intent suppressed inside guard window
  | "guard-auto-response-block" // VISION_AUTO_RESPONSE_BLOCK_RE matched
  | "camera-start"
  | "camera-stop"
  | "tts-speak";

export interface VisionDebugEvent {
  kind: VisionDebugKind;
  text?: string;
  action?: string;
  matchedRegex?: string;
  note?: string;
  ts?: number;
}

export const VISION_DEBUG_EVENT = "vision-debug";

export function emitVisionDebug(ev: VisionDebugEvent): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent<VisionDebugEvent>(VISION_DEBUG_EVENT, {
        detail: { ...ev, ts: ev.ts ?? Date.now() },
      }),
    );
  } catch {
    // no-op — debug must never break prod
  }
}
