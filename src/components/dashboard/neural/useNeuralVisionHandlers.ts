/**
 * Neural Vision Handlers — extracted from NeuralVision.tsx (lines 436-1100)
 * Contains: routeOrionCommand, voice command handling, camera controls
 */

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import type { GestureType, GestureAction } from "./useGestureDetection";
import { VS } from "./useVisionProcessing";
type RealTimeVisionResult = any;
const detectRealTime: any = async () => ({ regions: [], motion: null });
import { setVSGetter } from "@/lib/neural/vision-state";
import { getPersistentMicStream } from "@/lib/voice/persistentMic";
import { shouldSuppressVisionCommand } from "@/lib/voice/visionCommandLock";
import { emitVisionDebug } from "@/lib/voice/visionDebugBus";
import { captureVideoFrame } from "@/lib/vision/gemini-vision";
import { analyzeFrameSmart, resetVisionCache } from "@/lib/vision/vision-cache";
import { useOrionReasoning } from "./useOrionReasoning";
import { useVoiceIdentityGuard } from "@/hooks/useVoiceIdentityGuard";
import { initVoiceIdentityListener } from "@/lib/neural/orion-ai-client";

// Constants extracted from NeuralVision.tsx
const VISION_POST_COMMAND_GUARD_MS = 8000;
const VISION_TTS_ECHO_RE = /\b(vis[aã]o\s+(ativad[ao]|desativad[ao]|j[aá]\s+est[aá]\s+ativ[ao]|j[aá]\s+est[aá]\s+desativad[ao])|desativando\s+vis[aã]o)\b/i;
const VISION_FOLLOW_UP_RE = /\b(o\s+que\s+(voc[eê]\s+)?(est[aá]\s+)?(vendo|enxergando)|descrev|identific|analis|leia|ler|conte|mostr|mostre|tem\s+(na|no)|quem\s+[ée]|quantos?|qual\s+[ée]|onde\s+est[aá])\b/i;
const VISION_AUTO_RESPONSE_BLOCK_RE = /\b(vejo|estou vendo|consigo ver|na imagem|na cena|detectei|identifiquei|aparece|parece haver|tem\s+(um|uma|dois|duas|v[aá]rios)|h[aá]\s+(um|uma|dois|duas|v[aá]rios))\b/i;

const _ORION_SESSION_KEY = "orion-session-ready";

function _hasSessionReady(): boolean {
  try { return sessionStorage.getItem(_ORION_SESSION_KEY) === "1"; } catch { return false; }
}
function _markSessionReady(): void {
  try { sessionStorage.setItem(_ORION_SESSION_KEY, "1"); } catch {}
}

export interface NeuralVisionHandlersProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  active: boolean;
  setActive: (active: boolean) => void;
  setRegions: (regions: any[]) => void;
  setMotion: (motion: any) => void;
  setInterimTranscript: (text: string) => void;
  interimTranscriptRef: React.RefObject<(text: string) => void>;
  awareness: number;
  setAwareness: (awareness: number) => void;
  fps: number;
  setFps: (fps: number) => void;
  identificationMode: string;
  setIdentificationMode: (mode: string) => void;
  mlDetections: any[];
  setMlDetections: (detections: any[]) => void;
  visionSettings: any;
  setVisionSettings: (settings: any) => void;
  speak: (text: string) => Promise<void>;
  speakFast: (text: string) => Promise<void>;
  startListening: () => void;
  stopListen: () => void;
  bargeIn: () => void;
  abortControllerRef: React.RefObject<AbortController | null>;
  speechQueueRef: React.RefObject<any[]>;
  bargeInCallbackRef: React.RefObject<(() => void) | null>;
  identityStatus: string;
  guestSession: any;
  isCheckingVoice: boolean;
  verifyVoiceIdentity: (blob: Blob) => Promise<string>;
  startGuestSession: () => void;
  addGuestMessage: (role: string, text: string) => void;
  endGuestSession: () => void;
  setIdentityStatus: (status: string) => void;
  chatHistory: Array<{ role: string; text: string; time: string; confidence?: number }>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  deactivateGracefully: () => void;
}

export function useNeuralVisionHandlers(props: NeuralVisionHandlersProps) {
  const {
    videoRef, canvasRef, active, setActive, setRegions, setMotion,
    setInterimTranscript, interimTranscriptRef, awareness, setAwareness,
    fps, setFps, identificationMode, setIdentificationMode,
    mlDetections, setMlDetections, visionSettings, setVisionSettings,
    speak, speakFast, startListening, stopListen, bargeIn,
    abortControllerRef, speechQueueRef, bargeInCallbackRef,
    identityStatus, guestSession, isCheckingVoice, verifyVoiceIdentity,
    startGuestSession, addGuestMessage, endGuestSession, setIdentityStatus,
    chatHistory, startCamera, stopCamera, deactivateGracefully,
  } = props;

  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef(0);
  const prevRef = useRef<Uint8ClampedArray | null>(null);
  const lastFpsT = useRef(Date.now());
  const fpsC = useRef(0);
  const lastLocalDetectionRef = useRef(0);
  const localDetectionRunningRef = useRef(false);
  const rtInferenceRunningRef = useRef(false);
  const mlDetectionsRef = useRef(mlDetections);
  const bgTranscriptsGetterRef = useRef<(() => any[]) | null>(null);
  const voiceCheckDoneRef = useRef(false);
  const lastHandledVoiceRef = useRef<{ text: string; ts: number }>({ text: "", ts: 0 });
  const recentVisionCommandRef = useRef<{ ts: number; text: string }>({ ts: 0, text: "" });
  const suppressVisionAutoResponseUntilRef = useRef(0);

  // Sync refs
  mlDetectionsRef.current = mlDetections;

  const routeOrionCommand = useCallback(async (cmd: string) => {
    const q = cmd.toLowerCase().trim();
    const withinVisionGuardWindow = Date.now() - recentVisionCommandRef.current.ts < VISION_POST_COMMAND_GUARD_MS;
    console.log("[NeuralVision] 🔀 routeOrionCommand:", cmd, { active, identityStatus });
    emitVisionDebug({ kind: "stt-capture", text: cmd, note: withinVisionGuardWindow ? "dentro da guard window" : undefined });
    
    if (withinVisionGuardWindow && VISION_TTS_ECHO_RE.test(q)) {
      console.log("[NeuralVision] 🧏 Suppressed vision TTS echo before routing:", cmd);
      emitVisionDebug({ kind: "guard-echo-block", text: cmd, matchedRegex: "VISION_TTS_ECHO_RE" });
      return;
    }

    const isActivateVision = /\b(ativar?|ligar?|abrir?|liga|abre|inicia[r]?|começar?|come[çc]a)\s*(a\s+)?(vis[aã]o|c[aâ]mera|webcam|olhos?|neural)\b/i.test(q);
    const isDeactivateVision = /\b(desativar?|desligar?|fechar?|parar?|pare|fecha|desliga)\s*(a\s+)?(vis[aã]o|c[aâ]mera|webcam|olhos?|neural)\b/i.test(q);

    if (isActivateVision || isDeactivateVision) {
      const action = isActivateVision ? "activate_vision" : "deactivate_vision";
      emitVisionDebug({ kind: "vision-keyword", text: cmd, action, matchedRegex: isActivateVision ? "ACTIVATE_RE" : "DEACTIVATE_RE" });
      recentVisionCommandRef.current = { ts: Date.now(), text: q };
      suppressVisionAutoResponseUntilRef.current = Date.now() + VISION_POST_COMMAND_GUARD_MS;
      emitVisionDebug({ kind: "command-dispatch", action, note: "orion-vision-command (userInitiated)" });
      window.dispatchEvent(new CustomEvent("orion-vision-command", {
        detail: { action, userInitiated: true },
      }));
      return;
    }

    if (q.includes("calar") || q.includes("silêncio")) { try { speechSynthesis?.cancel(); } catch {} return; }

    // Try voice-intent-dispatcher FIRST for actionable commands
    try {
      const { classifyVoiceCommandSmart, dispatchVoiceIntent } = await import("@/lib/neural/voice-intent-dispatcher");
      const intent = await classifyVoiceCommandSmart(cmd);
      console.log("[routeOrion] Intent:", intent.intent, "confidence:", intent.confidence);

      if (
        withinVisionGuardWindow &&
        !VISION_FOLLOW_UP_RE.test(q) &&
        (intent.intent === "unknown" || intent.confidence < 0.55)
      ) {
        console.log("[NeuralVision] 🧏 Suppressed low-confidence transcript right after vision activation:", cmd, intent);
        emitVisionDebug({ kind: "guard-lowconf-block", text: cmd, note: `intent=${intent.intent} conf=${intent.confidence.toFixed(2)}` });
        return;
      }

      // Only dispatch if it's a concrete intent with decent confidence
      if (intent.intent !== "unknown" && intent.confidence > 0.7) {
        const result = await dispatchVoiceIntent(intent, identityStatus);
        console.log("[routeOrion] Dispatch result:", result);

        // If dispatcher handled it (not passthrough), announce result
        if (result.success && !(result.data as any)?.passthrough) {
          if (result.response) {
            speakFast(result.response).catch(() => {});
          }
          return;
        }
      } else if (intent.confidence > 0.3 && intent.confidence <= 0.7) {
        const { generateFallbackResponse } = await import("@/lib/neural/voice-intent-dispatcher");
        const fallbackMsg = generateFallbackResponse(intent);
        speakFast(fallbackMsg).catch(() => {});
        return;
      }
    } catch (err) {
      console.warn("[routeOrion] Dispatcher error, falling back to AI:", err);
    }

    // Fallback: send to Orion reasoning
    if (!active) {
      if (!q.includes("ativar") && !q.includes("ligar")) {
        toast.info("Diga 'Orion ativar visão' primeiro.");
      }
      return;
    }

    // Suppress auto-response if needed
    if (Date.now() < suppressVisionAutoResponseUntilRef.current) {
      console.log("[NeuralVision] 🧏 Suppressed auto-response (post-command guard)");
      emitVisionDebug({ kind: "guard-auto-response-block" as any, text: cmd });
      return;
    }

    // Check for auto-response block patterns
    if (VISION_AUTO_RESPONSE_BLOCK_RE.test(q) && lastHandledVoiceRef.current.text === q && Date.now() - lastHandledVoiceRef.current.ts < 5000) {
      console.log("[NeuralVision] 🧏 Suppressed duplicate auto-response:", q);
      emitVisionDebug({ kind: "guard-auto-response-block" as any, text: q, note: "duplicate within 5s" } as any);
      return;
    }

    lastHandledVoiceRef.current = { text: q, ts: Date.now() };

    // Handle voice command via reasoning
    const { askAI } = useOrionReasoning(
      active, speak, canvasRef, identificationMode, bargeIn,
      abortControllerRef, speechQueueRef, bargeInCallbackRef,
      () => bgTranscriptsGetterRef.current?.() || [], identityStatus,
      () => startCamera(), mlDetectionsRef
    );

    Promise.resolve(askAI(q, "voice") as any).catch((err: any) => {
      console.error("[NeuralVision] askAI error:", err);
      toast.error("Erro ao processar comando.");
    });
  }, [active, identityStatus, speak, speakFast, startCamera]);

  return {
    routeOrionCommand,
    // Add other handlers as needed
  };
}
