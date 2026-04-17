import { useState, useRef, useEffect, useCallback } from "react";
import { useVoiceIdentityGuard } from "@/hooks/useVoiceIdentityGuard";
import { VoiceIdentityGate } from "./VoiceIdentityGate";
import { useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera, CameraOff, Eye, Mic, MicOff, Volume2, VolumeX,
  Cpu, Activity, Zap, Brain, MessageCircle, User, Hand,
  Search, PlayCircle, Globe,
} from "lucide-react";
import { OrionResearchBrowser } from "@/components/orion/OrionResearchBrowser";
import { OrionEmbeddedVideo } from "@/components/orion/OrionEmbeddedVideo";
import ChatIARouter from "@/pages/dashboard/ChatIARouter";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IdentifiedObjectsPanel } from "./IdentifiedObjectsPanel";
import { useGestureDetection, GESTURE_ACTIONS, type GestureType, type GestureAction } from "./useGestureDetection";
import { PlasmaCanvas } from "./EnergyOrb";
import { VoiceStateIndicator } from "./VoiceStateIndicator";
import { useNeuralVoice } from "@/hooks/useNeuralVoice";
import { useOrionVoiceClone, isVoiceCloneCommand } from "@/hooks/useOrionVoiceClone";
import { getPersistentMicStream } from "@/lib/voice/persistentMic";

// Extracted modules
import { VS, processFrame, type Region, type MotionData } from "./useVisionProcessing";
import { useSuperNetWS } from "./useSuperNetWS";
import { useOrionReasoning } from "./useOrionReasoning";
import { useWakeWord } from "./useWakeWord";
import { CameraPiP, BoundingBoxOverlay } from "./VisionOverlayComponents";
import { wakeOrionVm } from "@/lib/orion-vm-wake";
import { FaceScannerOverlay } from "./FaceScannerOverlay";
import { TeslaCoilVoltagePanel } from "./TeslaCoilVoltagePanel";
import { ActiveInferenceIndicator } from "./ActiveInferenceIndicator";
import { CognitiveRouterBadge } from "./CognitiveRouterBadge";
// Vision via Gemini on-demand + Zilliz visual memory cache
import { captureVideoFrame } from "@/lib/vision/gemini-vision";
import { analyzeFrameSmart, resetVisionCache } from "@/lib/vision/vision-cache";
// Local vision via Transformers.js
import { classifyImage } from "@/lib/huggingface/transformers-vision";
// MediaPipe Tasks Vision for fast object detection
import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";
// Vision Control Panel
import { VisionControlPanel, DEFAULT_VISION_SETTINGS, type VisionSettings } from "./VisionControlPanel";
// Vision Stats Panel
import { VisionStatsPanel, DEFAULT_DETECTION_STATS, type DetectionStats } from "./VisionStatsPanel";
import { HudCollapsibleSection } from "./HudCollapsibleSection";
// MediaPipe Object Detector - faster and more accurate than DETR
let mpObjectDetector: ObjectDetector | null = null;
let mpVisionReady = false;
// DISABLED: model URLs are broken (404) and causing errors
// Use Gemini Vision API instead for all visual analysis
async function preloadVisionModel() {
  console.warn("[Vision] Local model preload DISABLED - using Gemini Vision API");
  // Do nothing - models will not be loaded
}

// Real-time detection via Gemini Flash — optimized for real-time (1s default)
const VISION_GEMINI_THROTTLE_MS = parseInt(import.meta.env.VITE_VISION_GEMINI_THROTTLE || '1000', 10);
const VISION_MEDIAPIPE_FRAMESKIP = parseInt(import.meta.env.VITE_VISION_MEDIAPIPE_FRAMESKIP || '10', 10);
const VISION_SUPERNET_FRAMESKIP = parseInt(import.meta.env.VITE_VISION_SUPERNET_FRAMESKIP || '15', 10);

const _rtCache = { lastCall: 0, lastResult: null as RealTimeVisionResult | null };
async function detectRealTime(video?: HTMLVideoElement): Promise<RealTimeVisionResult> {
  const now = Date.now();
  // Throttle: at most once every 1 second (optimized from 6s)
  if (now - _rtCache.lastCall < VISION_GEMINI_THROTTLE_MS && _rtCache.lastResult) {
    return _rtCache.lastResult;
  }
  if (!video || video.readyState < 2) {
    return { allObjects: [], faces: [], hands: [], poses: [], detections: [], timestamp: now, processingMs: 0, status: "none" as const };
  }
  _rtCache.lastCall = now;
  try {
    const base64 = captureVideoFrame(video, 320, 0.6);
    if (!base64) {
      console.warn("[detectRealTime] Frame capture failed — video not ready");
      return { allObjects: [], faces: [], hands: [], poses: [], detections: [], timestamp: now, processingMs: 0, status: "none" as const };
    }
    const result = await analyzeFrame(base64, "Liste TODOS os objetos, pessoas, rostos e elementos visíveis. Para cada item retorne: nome em português, confiança (0-1), e posição aproximada (x,y,largura,altura em 0-1). Responda em JSON: {objects:[{name,namePt,confidence,x,y,width,height,source}], faces:[{x,y,width,height,confidence}]}").catch(() => null);
    if (!result) {
      return { allObjects: [], faces: [], hands: [], poses: [], detections: [], timestamp: now, processingMs: 0, status: "none" as const };
    }
    
    let parsed: any = {};
    if (result.description) {
      // Try to parse JSON from response
      const jsonMatch = result.description.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch { /* not JSON, use as description */ }
      }
    }
    
    const objects = (parsed.objects || result.objects || []).map((o: any) => ({
      name: o.name || o.label || "object",
      namePt: o.namePt || o.name || o.label || "objeto",
      confidence: o.confidence || 0.7,
      x: o.x || 0, y: o.y || 0,
      width: o.width || 0.1, height: o.height || 0.1,
      source: "gemini",
    }));
    
    const faces = (parsed.faces || []).map((f: any) => ({
      x: f.x || 0, y: f.y || 0,
      width: f.width || 0.1, height: f.height || 0.1,
      confidence: f.confidence || 0.8,
    }));
    
    const rtResult: RealTimeVisionResult = {
      allObjects: objects, faces, hands: [], poses: [],
      detections: objects, timestamp: now,
      processingMs: Date.now() - now,
      status: objects.length > 0 ? "active" as any : "none" as any,
    };
    _rtCache.lastResult = rtResult;
    return rtResult;
  } catch (e) {
    console.warn("[detectRealTime] Gemini vision failed:", e);
    return { allObjects: [], faces: [], hands: [], poses: [], detections: [], timestamp: now, processingMs: 0, status: "none" as const };
  }
}
type RealTimeVisionResult = { allObjects: any[]; faces: any[]; hands: any[]; poses: any[]; detections: any[]; timestamp: number; processingMs: number; status: string };
import { VmBootLoader } from "./VmBootLoader";

// Map COCO class names to overlay categories
function categoryFromSource(name: string): string {
  const n = name.toLowerCase();
  if (/person|pessoa/.test(n)) return "pessoa";
  if (/laptop|phone|cell|tv|keyboard|mouse|remote|monitor/.test(n)) return "eletrônico";
  if (/chair|couch|bed|table|desk/.test(n)) return "móvel";
  if (/car|truck|bus|bicycle|motorcycle|boat|airplane|train/.test(n)) return "veículo";
  if (/dog|cat|bird|horse|sheep|cow|bear|elephant|zebra|giraffe/.test(n)) return "animal";
  if (/banana|apple|sandwich|pizza|donut|cake|orange|broccoli|carrot|hot dog/.test(n)) return "alimento";
  if (/bottle|cup|bowl|wine|fork|knife|spoon/.test(n)) return "alimento";
  if (/book|clock|scissors|vase|toothbrush/.test(n)) return "outro";
  return "outro";
}

const _ORION_SESSION_KEY = "orion-session-ready";
function _hasSessionReady(): boolean {
  try { return sessionStorage.getItem(_ORION_SESSION_KEY) === "1"; } catch { return false; }
}
function _markSessionReady(): void {
  try { sessionStorage.setItem(_ORION_SESSION_KEY, "1"); } catch {}
}

// ═══ Main Component ═══
export function NeuralVision({ skipWakeWord = false, initialCommand = "" }: { skipWakeWord?: boolean; initialCommand?: string }) {
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevRef = useRef<Uint8ClampedArray | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef(0);

  const [active, setActive] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [motion, setMotion] = useState<MotionData>({ intensity: 0, direction: "●", zones: Array(9).fill(false), vectors: [] });
  const [awareness, setAwareness] = useState(15);
  const [fps, setFps] = useState(0);
  const [identificationMode, setIdentificationMode] = useState("universal");
  const [mlDetections, setMlDetections] = useState<Array<{ name: string; category: string; confidence: number; count: number; bbox?: { x: number; y: number; w: number; h: number }; source?: string }>>([]);
  const [visionSettings, setVisionSettings] = useState<VisionSettings>(DEFAULT_VISION_SETTINGS);
  const rtInferenceRunningRef = useRef(false);
  const fpsC = useRef(0);
  const lastFpsT = useRef(Date.now());
  const lastLocalDetectionRef = useRef(0);
  const localDetectionRunningRef = useRef(false);
  const mlDetectionsRef = useRef<Array<{ name: string; category: string; confidence: number; bbox?: { x: number; y: number; w: number; h: number } }>>([]);

  // Build detection stats from current state
  const detectionStats: DetectionStats = {
    fps,
    totalFrames: Math.floor(fpsC.current),
    objectsDetected: mlDetections.length,
    facesDetected: mlDetections.filter(d => d.category === "face").length,
    handsDetected: mlDetections.filter(d => d.category === "hand").length,
    textRegionsFound: regions.filter(r => r.category === "text").length,
    lastDetectionTime: mlDetections.length > 0 ? Date.now() : 0,
    processingMs: 0,
    isActive: active,
    isConnected: true,
  };

  const { listening, supported: speechOk, ttsOn, setTtsOn, speak, speakFast, startListening, stop: stopListen, bargeIn, abortControllerRef, speechQueueRef, bargeInCallbackRef, voiceActiveRef } = useNeuralVoice();
  const bgTranscriptsGetterRef = useRef<() => import("./useWakeWord").BackgroundTranscript[]>(() => []);

  // ═══ Voice Identity Guard (must be before useOrionReasoning so identityStatus is available) ═══
  const {
    identityStatus,
    guestSession,
    isCheckingVoice,
    verifyVoiceIdentity,
    startGuestSession,
    addGuestMessage,
    endGuestSession,
    setIdentityStatus,
  } = useVoiceIdentityGuard();

  const startCameraRef = useRef<((options?: { announce?: boolean }) => Promise<void>) | null>(null);
  const { thought, log, aiDescription, askAI, askInput, setAskInput, chatHistory, isProcessing, detectedObjects } = useOrionReasoning(active, speak, canvasRef, identificationMode, bargeIn, abortControllerRef, speechQueueRef, bargeInCallbackRef, () => bgTranscriptsGetterRef.current(), identityStatus, ((opts) => startCameraRef.current?.(opts)) as any, mlDetectionsRef);
  const voiceClone = useOrionVoiceClone();

  const voiceCheckDoneRef = useRef(false);

  // Expose identityStatus globally so orion-ai-client can send it to neural-ops
  useEffect(() => {
    (window as any).__orionIdentityStatus = identityStatus;
  }, [identityStatus]);

  // Auto-check voice on first voice interaction
  const handleVoiceIdentityCheck = useCallback(async () => {
    if (voiceCheckDoneRef.current || identityStatus === "owner" || identityStatus === "creator" || identityStatus === "no_enrollment") return;
    console.log("[NeuralVision] 🎤 Starting voice identity check...");
    try {
      const persistentStream = getPersistentMicStream();
      const stream = persistentStream ?? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        if (!persistentStream || stream !== persistentStream) {
          stream.getTracks().forEach(t => t.stop());
        }
        const blob = new Blob(chunks, { type: recorder.mimeType });
        console.log("[NeuralVision] 🎤 Voice capture complete, blob size:", blob.size, "chunks:", chunks.length);
        if (blob.size < 1000) {
          console.warn("[NeuralVision] ⚠️ Audio blob too small, will retry on next interaction");
          // Do NOT mark as done — allow retry on next voice interaction
          return;
        }
        voiceCheckDoneRef.current = true;
        await verifyVoiceIdentity(blob);
      };
      recorder.start(500); // collect data every 500ms for reliable chunks
      setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 4000); // 4 seconds for better capture
    } catch (err) {
      console.warn("[NeuralVision] ⚠️ Mic access failed, skipping voice check:", err);
      voiceCheckDoneRef.current = true;
      setIdentityStatus("unknown");
    }
  }, [identityStatus, verifyVoiceIdentity, setIdentityStatus]);

  // ═══ AUTO VOICE IDENTITY on first STT transcription ═══
  useEffect(() => {
    const handler = () => {
      if (!voiceCheckDoneRef.current && identityStatus === "unknown") {
        handleVoiceIdentityCheck();
      }
    };
    window.addEventListener("orion:voice-transcription", handler);
    return () => window.removeEventListener("orion:voice-transcription", handler);
  }, [identityStatus, handleVoiceIdentityCheck]);

  // Track guest messages in chat
  useEffect(() => {
    if (!guestSession || chatHistory.length === 0) return;
    const last = chatHistory[chatHistory.length - 1];
    if (last) {
      addGuestMessage(last.role === "user" ? "user" : "assistant", last.text || "");
    }
  }, [chatHistory.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const { connected: supernetConnected, latency: supernetLatency, analysis: supernetAnalysis, sendFrame: sendSuperNetFrame, sendQuery: sendSuperNetQuery, wsUrl: supernetUrl, updateUrl: updateSuperNetUrl } = useSuperNetWS(active, canvasRef);

  // Gesture detection
  const handleGestureAction = useCallback((gesture: GestureType, action: GestureAction) => {
    toast.info(`${action.emoji} Gesto detectado: ${action.label}`, { duration: 2000 });
  }, []);
  const { currentGesture, gesturesEnabled, setGesturesEnabled } = useGestureDetection(active, canvasRef, handleGestureAction);

  // Face detection now handled by detectRealTime() unified pipeline
  const lastRtVisionRef = useRef<RealTimeVisionResult | null>(null);
  const directVoiceStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasGreetedRef = useRef(_hasSessionReady());

  // ═══ Vision models preload deferred to camera activation ═══
  // preloadAllVision() is called inside startCamera() instead of mount
  // This prevents excessive WebGL context creation and GPU usage on boot

  // ═══ Camera controls ═══
  const startCamera = useCallback(async (options?: { announce?: boolean }) => {
    const shouldAnnounce = options?.announce ?? true;
    if (!navigator.mediaDevices?.getUserMedia) { toast.error("Câmera não suportada"); return; }
    try {
      if (streamRef.current) {
        console.info("[NeuralVision] camera request skipped: stream already active");
        setActive(true); VS.active = true;
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      const video = videoRef.current;
      if (!video) {
        // Element not mounted — stop stream, retry once after 100ms, then abort silently
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        const retryAttempted = (startCamera as any).__retried;
        if (!retryAttempted) {
          (startCamera as any).__retried = true;
          setTimeout(() => {
            (startCamera as any).__retried = false;
            if (videoRef.current) startCameraRef.current?.(options);
          }, 120);
        } else {
          (startCamera as any).__retried = false;
          toast.error("Vídeo não pronto. Tente novamente.");
        }
        return;
      }
      if (streamRef.current && streamRef.current !== stream) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => { if (settled) return; settled = true; video.onloadeddata = null; video.onloadedmetadata = null; resolve(); };
        if (video.readyState >= 2) { finish(); return; }
        video.onloadeddata = finish;
        video.onloadedmetadata = finish;
        setTimeout(finish, 1500);
        video.play().catch(() => {});
      });
      await video.play().catch(() => {});
      setActive(true); VS.active = true;
      // DO NOT preload models here - they are broken and cause 404 errors
      // Models will be loaded on-demand only when actually needed
      toast.success("Visão ativada");
      // Don't announce "Núcleo ativado" - old buggy behavior
      // if (shouldAnnounce) speak("Visão ativada.").catch(() => {});
    } catch (err: any) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const name = err?.name || "";
      const msg = err?.message || "";
      console.error("[Vision] startCamera failed:", name, msg, err);
      let userMsg = "Erro na câmera";
      if (name === "NotAllowedError" || name === "SecurityError") userMsg = "Permissão da câmera negada. Autorize no navegador.";
      else if (name === "NotFoundError" || name === "OverconstrainedError") userMsg = "Nenhuma câmera disponível.";
      else if (name === "NotReadableError") userMsg = "Câmera em uso por outro app.";
      toast.error(userMsg);
    }
  }, [speak]);
  useEffect(() => { startCameraRef.current = startCamera; }, [startCamera]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false); VS.active = false; VS.regions = [];
    cancelAnimationFrame(animRef.current); prevRef.current = null;
    speak("Desativado.").catch(() => {});
  }, [speak]);

  const deactivateGracefully = useCallback(() => {
    const farewells = [
      "Até mais! Qualquer coisa, é só me chamar.",
      "Descansando. Quando precisar, diga Orion.",
      "Até logo! Estarei aqui quando precisar.",
      "Entendido. Vou descansar. Me chame quando quiser.",
    ];
    speak(farewells[Math.floor(Math.random() * farewells.length)]).catch(() => {});
    stopListen();
    setTimeout(() => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setActive(false); VS.active = false; VS.regions = [];
      cancelAnimationFrame(animRef.current); prevRef.current = null;
    }, 800);
  }, [speak, stopListen]);

  // ═══ Centralized command router — single source of truth for all commands ═══
  // Uses voice-intent-dispatcher for real execution (media, navigation, etc.)
  const routeOrionCommand = useCallback(async (cmd: string) => {
    const q = cmd.toLowerCase().trim();
    console.log("[NeuralVision] 🔀 routeOrionCommand:", cmd, { supernetConnected, identityStatus });
    const isActivateVision = /ativar?\s*(vis[aã]o|c[aâ]mera)/i.test(q) || /ligar?\s*(vis[aã]o|c[aâ]mera)/i.test(q);
    const isDeactivateVision = /desativar?\s*(vis[aã]o|c[aâ]mera)/i.test(q) || /desligar?\s*(vis[aã]o|c[aâ]mera)/i.test(q) || /parar?\s*(vis[aã]o|c[aâ]mera)/i.test(q);
    if (isActivateVision) {
      if (!active) { speakFast("Visão ativada.").catch(() => {}); startCamera({ announce: false }).catch(() => {}); }
      else { speakFast("Visão já está ativa.").catch(() => {}); }
      return;
    }
    if (isDeactivateVision) {
      if (active) { speakFast("Desativando visão.").catch(() => {}); stopCamera(); }
      else { speakFast("Visão já está desativada.").catch(() => {}); }
      return;
    }
    if (q.includes("calar") || q.includes("silêncio")) { try { speechSynthesis?.cancel(); } catch {} return; }

    // ═══ Try voice-intent-dispatcher FIRST for actionable commands ═══
    try {
      const { classifyVoiceCommandSmart, dispatchVoiceIntent } = await import("@/lib/neural/voice-intent-dispatcher");
      const intent = await classifyVoiceCommandSmart(cmd);
      console.log("[routeOrion] Intent:", intent.intent, "confidence:", intent.confidence);

      // Only dispatch if it's a concrete intent with decent confidence
      if (intent.intent !== "unknown" && intent.confidence > 0.4) {
        const result = await dispatchVoiceIntent(intent, identityStatus);
        console.log("[routeOrion] Dispatch result:", result);

        // If dispatcher handled it (not passthrough), announce result
        if (result.success && !(result.data as any)?.passthrough) {
          if (result.response) {
            speakFast(result.response).catch(() => {});
          }
          return;
        }
      }
    } catch (err) {
      console.warn("[routeOrion] Dispatcher error, falling back to AI:", err);
    }

    // Fallback to AI for complex/unknown commands
    if (supernetConnected) sendSuperNetQuery(cmd);
    else askAI(cmd, "voice");
  }, [active, startCamera, stopCamera, speakFast, askAI, supernetConnected, sendSuperNetQuery, identityStatus]);


  const handleVoice = useCallback((cmd: string) => {
    const original = cmd.trim();
    const q = original.toLowerCase();
    console.log("[NeuralVision] 🎤 handleVoice called:", cmd);

    // ═══ AUTO VOICE IDENTITY CHECK on first voice interaction ═══
    if (!voiceCheckDoneRef.current && identityStatus === "unknown") {
      handleVoiceIdentityCheck();
    }

    // Pure wake word without command — do NOT speak here.
    // Speaking right after wake word can steal the mic handoff on mobile.
    const isJustWakeWord = /^[óòôõo]r[iíìeéè][oóòôõ][nmn]\s*(ativar?|ligar?|acordar?|oi|olá|e\s*aí)?[.!?]?\s*$/i.test(q.trim()) ||
      /^oreo[nm]\s*(ativar?|ligar?|acordar?|oi|olá|e\s*aí)?[.!?]?\s*$/i.test(q.trim());
    if (isJustWakeWord) {
      if (!hasGreetedRef.current) {
        hasGreetedRef.current = true;
        _markSessionReady();
      }
      toast.info("⚡ Pode falar", { duration: 1000 });
      return;
    }

    // Orion exit/farewell
    const isOrionExit = /[óòôõo]r[iíìeéè][oóòôõ][nmn]\s*(desativ|descans|sair|dormir|parar|deslig|tchau|até|vai embora)/i.test(q) ||
      /oreo[nm]\s*(desativ|descans|sair|dormir|parar|deslig|tchau|até|vai embora)/i.test(q);
    if (isOrionExit) { deactivateGracefully(); return; }

    // ═══ CHECK VISION/CAMERA COMMANDS BEFORE stripping "ativar" ═══
    // Must happen before cleanedCommand — "ativar visão" needs the verb intact
    const isVisionCmd = /\b(ativar?|ligar?|abrir?)\s*(vis[aã]o|c[aâ]mera|neural)/i.test(q) ||
      /\b(desativar?|desligar?|fechar?|parar?)\s*(vis[aã]o|c[aâ]mera|neural)/i.test(q) ||
      /\b(vis[aã]o|c[aâ]mera)\s*(ativar?|ligar?|desativar?|desligar?)/i.test(q);
    if (isVisionCmd) {
      routeOrionCommand(original);
      toast.info(`🎤 "${original}"`);
      return;
    }

    // Now safe to strip wake word prefix and greeting verbs
    let cleanedCommand = original
      .replace(/^\s*[óòôõo]r[iíìeéè][oóòôõ][nmn][\s,;:-]*/i, "")
      .replace(/^\s*oreo[nm][\s,;:-]*/i, "");
    // Only strip "ativar/ligar" if NOT followed by media keywords
    if (!/\b(ativar?|ligar?)\s+(?:m[uú]sica|v[ií]deo|som|can[çc])/i.test(cleanedCommand)) {
      cleanedCommand = cleanedCommand.replace(/^(ativar?|ligar?|acordar?|oi|olá|e\s*aí)\s*/i, "");
    }
    cleanedCommand = cleanedCommand.trim();

    // Voice clone flow
    if (isVoiceCloneCommand(q)) {
      stopListen();
      const introMsg = voiceClone.startCloneFlow();
      speak(introMsg).then(async () => {
        await voiceClone.startRecording();
        setTimeout(async () => {
          voiceClone.stopRecording();
          setTimeout(async () => {
            await speak("Gravação concluída. Processando sua voz.");
            await voiceClone.cloneVoice();
            await speak(voiceClone.getFlowInstruction());
            startListening(handleVoice);
          }, 3000);
        }, 15000);
      }).catch(() => {
        voiceClone.startRecording();
        setTimeout(() => { voiceClone.stopRecording(); setTimeout(() => voiceClone.cloneVoice(), 3000); }, 15000);
      });
      return;
    }
    if (voiceClone.cloneFlowStep !== "idle" && voiceClone.cloneFlowStep !== "complete") return;

    // Route everything through the centralized command router
    const finalCommand = cleanedCommand || original;
    routeOrionCommand(finalCommand);
    toast.info(`🎤 "${finalCommand}"`);
  }, [deactivateGracefully, speak, speakFast, voiceClone, startListening, stopListen, routeOrionCommand, identityStatus, handleVoiceIdentityCheck]);

  // ═══ Wake word activation — handoff DIRECTLY to main STT (no TTS in between) ═══
  const activateByWakeWord = useCallback(() => {
    wakeWordEnabledRef.current = false;
    try { wakeRecRef.current?.abort?.(); } catch {}
    try { wakeRecRef.current?.stop?.(); } catch {}
    wakeRecRef.current = null;

    if (directVoiceStartTimerRef.current) {
      clearTimeout(directVoiceStartTimerRef.current);
      directVoiceStartTimerRef.current = null;
    }

    stopListen();

    const isMobileBrowser = typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    const handoffDelay = isMobileBrowser ? 220 : 180;

    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      _markSessionReady();
    }

    toast.info("⚡ Pode falar", { duration: 1000 });

    directVoiceStartTimerRef.current = setTimeout(() => {
      directVoiceStartTimerRef.current = null;
      startListening(handleVoice);
    }, handoffDelay);
  }, [handleVoice, startListening, stopListen]);

  const { wakeWordActive, wakeWordEnabledRef, wakeRecRef, startWakeWordListener, stopWakeWordListener, enableWakeWord, getBackgroundTranscripts } = useWakeWord(listening, skipWakeWord ? false : speechOk, activateByWakeWord);

  useEffect(() => { bgTranscriptsGetterRef.current = getBackgroundTranscripts; }, [getBackgroundTranscripts]);

  const startDirectVoiceCapture = useCallback(() => {
    if (directVoiceStartTimerRef.current) {
      clearTimeout(directVoiceStartTimerRef.current);
      directVoiceStartTimerRef.current = null;
    }

    stopWakeWordListener();
    stopListen();

    const isMobileBrowser = typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    const delay = skipWakeWord
      ? 0
      : (isMobileBrowser ? 160 : 180);

    console.log("[NeuralVision] 📞 startDirectVoiceCapture", { isMobileBrowser, skipWakeWord, delay });

    directVoiceStartTimerRef.current = setTimeout(() => {
      directVoiceStartTimerRef.current = null;
      console.log("[NeuralVision] 📞 Calling startListening(handleVoice)");
      startListening(handleVoice);
    }, delay);
  }, [handleVoice, skipWakeWord, startListening, stopListen, stopWakeWordListener]);

  const handleActivateVoiceButton = useCallback(() => {
    if (skipWakeWord) {
      startDirectVoiceCapture();
      return;
    }

    enableWakeWord();
    startWakeWordListener();
  }, [enableWakeWord, skipWakeWord, startDirectVoiceCapture, startWakeWordListener]);

  const autoActivatedRef = useRef(false);
  const autoBootedRef = useRef(false);

  // Auto-start direct voice capture on page load (no wake word needed).
  // Rule: mic always active, always listening — no "say Orion to activate" gate.
  useEffect(() => {
    console.log("[NeuralVision] 🔄 Auto-start effect running", { speechOk, active: !!active });
    if (typeof document !== "undefined" && document.hidden) {
      console.log("[NeuralVision] ⏸️ Skipping - document hidden");
      return;
    }
    if (!speechOk) {
      console.log("[NeuralVision] ⏸️ Skipping - speech not supported");
      return;
    }
    if (autoBootedRef.current) {
      console.log("[NeuralVision] ⏸️ Skipping - already booted");
      return;
    }
    console.log("[NeuralVision] 🚀 Starting voice capture...");
    autoBootedRef.current = true;
    wakeOrionVm();
    startDirectVoiceCapture();

    // Greet user to confirm TTS works
    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      setTimeout(() => {
        speak("Orion online. Pode falar.").catch(() => {});
      }, 600);
    }
  }, []);

  // (routeOrionCommand moved above handleVoice to avoid forward reference)

  // ═══ Listen for vision commands from text chat (useOrionReasoning) ═══
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.action === "activate_vision" && !active) {
        startCamera({ announce: false }).catch(() => {});
      } else if (detail?.action === "deactivate_vision" && active) {
        stopCamera();
      }
    };
    window.addEventListener("orion-vision-command", handler);
    return () => window.removeEventListener("orion-vision-command", handler);
  }, [active, startCamera, stopCamera]);


  useEffect(() => {
    if (autoActivatedRef.current) return;

    if (initialCommand && initialCommand.length > 2) {
      autoActivatedRef.current = true;
      activateByWakeWord();
      // Route through centralized handler (catches "ativar visão" locally)
      setTimeout(() => routeOrionCommand(initialCommand), 300);
      return;
    }

    const state = location.state as any;
    if (!state) return;
    if (state.autoActivate || state.autoCommand) {
      autoActivatedRef.current = true;
      activateByWakeWord();
      if (state.autoCommand && typeof state.autoCommand === "string") {
        // Route through centralized handler
        setTimeout(() => routeOrionCommand(state.autoCommand), 300);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, initialCommand, activateByWakeWord, routeOrionCommand]);

  // Re-enable wake word ONLY when user explicitly stops (not during auto-cycles)
  const wakeWordStabilityRef = useRef(0);
  useEffect(() => {
    // When opened from GlobalOrionListener overlay, skip wake word entirely
    if (skipWakeWord) return;

    // When main listener is active, stop wake word (mutual exclusion)
    if (listening && wakeRecRef.current) {
      stopWakeWordListener();
      return;
    }

    // Don't re-enable wake word if the voice system is logically active
    // (voiceActiveRef stays true across STT restart gaps, unlike listening state)
    if (voiceActiveRef.current) return;

    // Don't re-enable wake word if we're in auto-boot mode or recently activated
    if (active || listening) return;
    if (!speechOk || wakeWordActive) return;
    if (typeof document !== "undefined" && document.hidden) return;

    // Debounce: prevent rapid re-triggering after listener stops
    const now = Date.now();
    if (now - wakeWordStabilityRef.current < 2000) return;
    wakeWordStabilityRef.current = now;

    enableWakeWord();
    const timer = setTimeout(() => startWakeWordListener(), 1500);
    return () => clearTimeout(timer);
  }, [skipWakeWord, active, listening, speechOk, wakeWordActive, enableWakeWord, startWakeWordListener, stopWakeWordListener, wakeRecRef, voiceActiveRef]);

  // Awareness sync
  useEffect(() => {
    const iv = setInterval(() => setAwareness(VS.awareness), 400);
    return () => clearInterval(iv);
  }, []);

  // Processing loop
  useEffect(() => {
    if (!active) return;
    let running = true;
    let frameCount = 0;
    const loop = () => {
      if (!running) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) { animRef.current = requestAnimationFrame(loop); return; }
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -w, 0, w, h); ctx.restore();

      frameCount++;
      fpsC.current++;
      const now = Date.now();
      if (now - lastFpsT.current >= 1000) { setFps(fpsC.current); fpsC.current = 0; lastFpsT.current = now; }
      VS.frames++;

      // Throttle processFrame to every 15 frames (was 10) — saves more CPU
      if (frameCount % 15 === 0) {
        const result = processFrame(ctx, w, h, prevRef.current);
        VS.regions = result.regions; VS.motion = result.motion;
        VS.shapeDescriptors = result.shapeDescriptors || [];
        VS.sceneContext = result.sceneContext || null;
        VS.yoloClassifications = result.yoloClassifications || [];
        VS.textRegions = result.textRegions || [];
        VS.otsuThresholdValue = result.otsuThreshold || 0;
        VS.kmeansResult = result.kmeansResult || null;
        VS.imageQuality = result.imageQuality || null;
        setRegions(result.regions); setMotion(result.motion);
        if (!prevRef.current || prevRef.current.length !== result.pixels.length) prevRef.current = new Uint8ClampedArray(result.pixels);
        else prevRef.current.set(result.pixels);
      }

// Throttle ML detection — optimized via VISION_MEDIAPIPE_FRAMESKIP env (default: every 10 frames)
      if (frameCount % VISION_MEDIAPIPE_FRAMESKIP === 0 && !localDetectionRunningRef.current && video && video.readyState >= 2 && w > 0 && h > 0 && mpObjectDetector && mpVisionReady) {
        const now = Date.now();
        if (now - lastLocalDetectionRef.current > 300) {
          lastLocalDetectionRef.current = now;
          localDetectionRunningRef.current = true;
          try {
            const result = mpObjectDetector.detectForVideo(video, Date.now());
            if (result && result.detections && result.detections.length > 0) {
              const mapped = result.detections.map(d => ({
                name: d.categories?.[0]?.categoryName || "object",
                category: categoryFromSource(d.categories?.[0]?.categoryName || "object"),
                confidence: d.categories?.[0]?.score || 0.5,
                count: 1,
                bbox: d.boundingBox ? { 
                  x: d.boundingBox.originX / w, 
                  y: d.boundingBox.originY / h, 
                  w: d.boundingBox.width / w, 
                  h: d.boundingBox.height / h 
                } : undefined,
                source: "mediapipe_efficientdet"
              }));
              setMlDetections(mapped);
              mlDetectionsRef.current = mapped;
              console.log("[LocalVision] MediaPipe:", mapped.map(m => `${m.name}(${(m.confidence*100).toFixed(0)}%)`).join(", "));
            } else {
              mlDetectionsRef.current = [];
            }
          } catch (err) {
            console.warn("[LocalVision] MediaPipe detect error:", err);
          }
          localDetectionRunningRef.current = false;
        }
      }
      // Throttle SuperNet frames — optimized via VISION_SUPERNET_FRAMESKIP env (default: every 15 frames)
      if (frameCount % VISION_SUPERNET_FRAMESKIP === 0) sendSuperNetFrame();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [active, sendSuperNetFrame]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="space-y-3 relative">
      {/* ═══ VM Boot Loading Indicator ═══ */}
      <VmBootLoader />
      {/* ═══ Voice Identity Gate ═══ */}
      <VoiceIdentityGate
        identityStatus={identityStatus}
        isCheckingVoice={isCheckingVoice}
        onGuestIdentify={(name) => startGuestSession(name)}
        onVerifyVoice={handleVoiceIdentityCheck}
        onSkipAsOwner={() => setIdentityStatus("owner")}
      />
      {/* Controls — Tron styled */}
      <div className="relative flex flex-wrap items-center gap-2 rounded-lg p-2.5 overflow-hidden"
        style={{ backgroundColor: "rgba(10,10,15,0.7)", border: "1px solid rgba(212,175,55,0.15)", boxShadow: "0 0 15px rgba(212,175,55,0.05)" }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)" }} />
        {!active && speechOk && (
          <Badge variant="outline" className="text-[10px] h-6 font-mono border-blue-500/30 text-[hsl(var(--tron-info))] gap-1.5 px-3">
            <Mic className="h-3.5 w-3.5" /> Escuta contínua
          </Badge>
        )}
        {!active && !speechOk && (
          <Badge variant="outline" className="text-[9px] h-5 font-mono border-red-500/30 text-[hsl(var(--tron-danger))] gap-1">
            Microfone não suportado neste navegador
          </Badge>
        )}

        {/* Voice status when camera is OFF — fully automatic, no manual buttons */}
        {!active && (
          <>
            <div className="h-5 w-px bg-white/10" />
            {listening && (
              <Badge variant="outline" className="text-[9px] h-5 font-mono border-blue-500/30 text-[hsl(var(--tron-info))] animate-pulse gap-1">
                <Mic className="h-3 w-3 text-[hsl(var(--tron-danger))] animate-pulse" /> Ouvindo...
              </Badge>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={() => setTtsOn(!ttsOn)}>
              {ttsOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-[hsl(var(--tron-neon))] animate-pulse font-mono">● CONSCIENTE</Badge>
            </div>
          </>
        )}
      </div>

      {/* ═══ JARVIS HUD Layout: Left Panel | Plasma Center | Right Panel ═══ */}
      <div className="relative rounded-lg overflow-hidden" style={{
        height: "clamp(450px, 65vh, 680px)",
        backgroundColor: "#030508",
        border: "1px solid rgba(212,175,55,0.12)",
        boxShadow: "0 0 30px rgba(212,175,55,0.05), 0 0 60px rgba(59,130,246,0.03)",
      }}>
        {/* Top gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-px z-[6]" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-px z-[6]" style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)" }} />
        
        {/* Tron grid subtle */}
        <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59,130,246,0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,130,246,0.4) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }} />
        
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none z-[5] opacity-[0.015]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,200,255,0.03) 2px, rgba(0,200,255,0.03) 3px)" }} />
        <div className="absolute inset-0 pointer-events-none z-[5]"
          style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(3,5,8,0.85) 100%)" }} />

        {/* ═══ LEFT HUD PANEL ═══ */}
        <div className="absolute top-3 left-3 bottom-3 w-[220px] xl:w-[250px] hidden lg:flex flex-col gap-2 z-10 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(212,175,55,0.15) transparent" }}>

          {/* ── Consciência ── */}
          <HudCollapsibleSection icon={Brain} title="Consciência" iconColor="#D4AF37" accentColor="rgba(212,175,55,0.6)" defaultOpen>
            <div className="px-3 py-3 flex items-center gap-3">
              <div className="relative w-16 h-16 shrink-0">
                <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(0,229,255,0.08)" strokeWidth="3" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke="url(#awarenessGrad)" strokeWidth="3"
                    strokeDasharray={`${awareness * 1.76} ${176 - awareness * 1.76}`}
                    strokeLinecap="round" className="transition-all duration-700" />
                  <defs>
                    <linearGradient id="awarenessGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00e5ff" />
                      <stop offset="100%" stopColor="#00bcd4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-mono font-bold text-[hsl(var(--tron-neon))]" style={{ textShadow: "0 0 8px rgba(0,229,255,0.5)" }}>
                    {awareness.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="space-y-1 flex-1">
                {[
                  { label: "Objetos", value: `${regions.length}`, color: "#ffd740", pct: Math.min(100, regions.length * 8) },
                  { label: "Movimento", value: `${motion.intensity.toFixed(0)}%`, color: "#b388ff", pct: motion.intensity },
                  { label: "Plasma", value: VS.aiResponding ? "ON" : "OFF", color: VS.aiResponding ? "#ff5252" : "#69f0ae", pct: VS.aiResponding ? 100 : 30 },
                ].map((m, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-[7px] font-mono text-white/25">{m.label}</span>
                      <span className="text-[8px] font-mono font-bold" style={{ color: m.color }}>{m.value}</span>
                    </div>
                    <div className="w-full h-[2px] bg-white/[0.04] overflow-hidden rounded-full">
                      <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${Math.min(100, m.pct)}%`, backgroundColor: m.color, opacity: 0.7, boxShadow: `0 0 6px ${m.color}40` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </HudCollapsibleSection>

          {/* ── Stats ── */}
          <HudCollapsibleSection icon={Activity} title="Stats" iconColor="#22c55e" accentColor="rgba(34,197,94,0.4)" badge={`${fps.toFixed(0)} fps`} badgeColor="#22c55e">
            <VisionStatsPanel stats={detectionStats} className="border-0 bg-transparent" />
          </HudCollapsibleSection>

          {/* ── Controle Visão ── */}
          <HudCollapsibleSection icon={Eye} title="Controle" iconColor="#00e5ff" accentColor="rgba(0,229,255,0.4)">
            <VisionControlPanel
              settings={visionSettings}
              onSettingsChange={setVisionSettings}
              isActive={active}
              detectionStats={{
                fps,
                objectsDetected: mlDetections.length,
                facesDetected: mlDetections.filter(d => d.category === "face").length,
                handsDetected: mlDetections.filter(d => d.category === "hand").length,
                lastDetectionTime: mlDetections.length > 0 ? Date.now() : 0,
              }}
            />
          </HudCollapsibleSection>

          {/* ── Visão Legacy ── */}
          <HudCollapsibleSection icon={Eye} title="Visão" iconColor="#ec4899" accentColor="rgba(236,72,153,0.4)" badge={regions.length} badgeColor="#ec4899">
            <div className="px-3 py-2 space-y-1">
              {regions.length > 0 ? regions.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: `rgb(${r.avgR},${r.avgG},${r.avgB})`, boxShadow: `0 0 4px rgb(${r.avgR},${r.avgG},${r.avgB})` }} />
                  <span className="text-[9px] font-mono text-white/40 flex-1 truncate">{r.label}</span>
                  <span className="text-[8px] font-mono text-[hsl(var(--tron-neon))] [text-shadow:0_0_8px_hsl(var(--tron-neon)/0.4)]/50">{(r.confidence * 100).toFixed(0)}%</span>
                </div>
              )) : (
                <p className="text-[8px] text-white/15 font-mono text-center py-2">
                  {active ? "Escaneando..." : "Ative a visão"}
                </p>
              )}
            </div>
          </HudCollapsibleSection>

          {/* ── Modo ── */}
          <HudCollapsibleSection icon={Globe} title="Modo" iconColor="#7c4dff" accentColor="rgba(124,77,255,0.4)">
            <div className="px-3 py-1.5">
              <Select value={identificationMode} onValueChange={setIdentificationMode}>
                <SelectTrigger className="h-6 text-[9px] font-mono bg-transparent border-cyan-500/15 text-[hsl(var(--tron-neon))]/70 focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#070c14] border-cyan-500/20">
                  <SelectItem value="universal" className="text-[9px] font-mono">🌐 Universal</SelectItem>
                  <SelectItem value="logistics" className="text-[9px] font-mono">📦 Logística</SelectItem>
                  <SelectItem value="security" className="text-[9px] font-mono">🔒 Segurança</SelectItem>
                  <SelectItem value="inventory" className="text-[9px] font-mono">📋 Inventário</SelectItem>
                  <SelectItem value="retail" className="text-[9px] font-mono">🛒 Varejo</SelectItem>
                  <SelectItem value="autonomous" className="text-[9px] font-mono">🚗 Autônomo</SelectItem>
                  <SelectItem value="industrial" className="text-[9px] font-mono">🏭 Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </HudCollapsibleSection>

          {/* ── Objetos Identificados ── */}
          <HudCollapsibleSection icon={Search} title="Objetos" iconColor="#ffd740" accentColor="rgba(255,215,64,0.4)" badge={detectedObjects.length} badgeColor="#ffd740">
            <IdentifiedObjectsPanel objects={detectedObjects} />
          </HudCollapsibleSection>

          {/* ── Voice hint ── */}
          {listening && (
            <HudCollapsibleSection icon={Mic} title="Ouvindo" iconColor="#ef4444" accentColor="rgba(239,68,68,0.4)" defaultOpen>
              <div className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {["o que vê", "como estou", "parar"].map(c => (
                    <span key={c} className="text-[6px] font-mono text-white/10 border border-white/[0.04] rounded px-1 py-0.5">"{c}"</span>
                  ))}
                </div>
              </div>
            </HudCollapsibleSection>
          )}
        </div>

        {/* ═══ CENTER: Plasma Core — HD Enhanced ═══ */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          {/* Volumetric ambient glow layers */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[70%] h-[70%] rounded-full" style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, hsl(var(--secondary) / 0.04) 40%, transparent 70%)",
              filter: "blur(60px)",
              animation: "plasmaPulseVision 4s ease-in-out infinite",
            }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[50%] h-[50%] rounded-full" style={{
              background: "radial-gradient(circle, hsl(var(--secondary) / 0.06) 0%, transparent 60%)",
              filter: "blur(40px)",
              animation: "plasmaPulseVision 5s ease-in-out infinite reverse",
            }} />
          </div>
          {/* Main plasma canvas with bloom filter */}
          <div className="w-full h-full" style={{
            filter: "contrast(1.05) saturate(1.15)",
          }}>
            <PlasmaCanvas />
          </div>
          {/* Outer bloom overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(circle at center, transparent 30%, hsl(var(--background) / 0.4) 80%, hsl(var(--background) / 0.9) 100%)",
          }} />
        </div>

        {/* ═══ JARVIS-style Voice State Indicator ═══ */}
        <VoiceStateIndicator />
        <style>{`
          @keyframes plasmaPulseVision {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.08); }
          }
        `}</style>

        {/* Hidden video/canvas */}
        <video ref={videoRef} playsInline muted style={{ position: "absolute", top: -9999, left: -9999, width: 640, height: 480 }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Camera PiP overlay */}
        {active && streamRef.current && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 lg:left-[240px] lg:translate-x-0 xl:left-[270px] z-20">
            <div className="relative rounded-lg overflow-hidden border border-cyan-500/20 shadow-lg shadow-cyan-500/10" style={{ width: 200, height: 150 }}>
              <CameraPiP stream={streamRef.current} />
              <BoundingBoxOverlay
                objects={(mlDetections.length > 0 ? mlDetections : detectedObjects) as any}
                width={200} height={150}
                videoWidth={videoRef.current?.videoWidth || 640}
                videoHeight={videoRef.current?.videoHeight || 480}
              />
              <FaceScannerOverlay
                faces={(lastRtVisionRef.current?.faces ?? []).map(f => ({
                  x: f.x, y: f.y, width: f.width, height: f.height,
                  confidence: f.confidence, landmarks: [],
                  nx: f.x / (videoRef.current?.videoWidth || 640),
                  ny: f.y / (videoRef.current?.videoHeight || 480),
                  nw: f.width / (videoRef.current?.videoWidth || 640),
                  nh: f.height / (videoRef.current?.videoHeight || 480),
                }))}
                width={200}
                height={150}
                videoWidth={videoRef.current?.videoWidth || 640}
                videoHeight={videoRef.current?.videoHeight || 480}
                tier={(lastRtVisionRef.current as any)?.status === "native" ? "native" : "fallback"}
                faceApiDetection={null}
              />
              {gesturesEnabled && currentGesture.gesture !== "none" && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute w-6 h-6 rounded-full border-2 border-amber-400 shadow-lg shadow-amber-400/30"
                    style={{ left: `${currentGesture.handPosition.x * 100}%`, top: `${currentGesture.handPosition.y * 100}%`, transform: "translate(-50%, -50%)", opacity: currentGesture.confidence }}>
                    <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
                  </div>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/80 rounded px-1.5 py-0.5 border border-amber-400/30">
                    <span className="text-[8px] font-mono text-amber-400">
                      {GESTURE_ACTIONS.find(a => a.gesture === currentGesture.gesture)?.emoji}{" "}
                      {GESTURE_ACTIONS.find(a => a.gesture === currentGesture.gesture)?.label}
                      {" "}{Math.round(currentGesture.confidence * 100)}%
                    </span>
                  </div>
                  {currentGesture.gesture === "pointing" && currentGesture.fingerDirection && (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 150">
                      <line x1={currentGesture.handPosition.x * 200} y1={currentGesture.handPosition.y * 150}
                        x2={currentGesture.handPosition.x * 200 + currentGesture.fingerDirection.x * 60}
                        y2={currentGesture.handPosition.y * 150 + currentGesture.fingerDirection.y * 60}
                        stroke="#fbbf24" strokeWidth={2} markerEnd="url(#arrowhead)" />
                      <defs>
                        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                          <polygon points="0 0, 6 2, 0 4" fill="#fbbf24" />
                        </marker>
                      </defs>
                    </svg>
                  )}
                </div>
              )}
              <div className="absolute inset-0 border border-cyan-400/10 rounded-lg pointer-events-none" />
              <div className="absolute top-1 left-1 flex items-center gap-1 pointer-events-none">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[7px] font-mono text-white/40">CAM</span>
              </div>
              {detectedObjects.length > 0 && (
                <div className="absolute top-1 right-1 pointer-events-none">
                  <span className="text-[7px] font-mono bg-black/70 text-[hsl(var(--tron-neon))] px-1 rounded">{detectedObjects.length} obj</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top-left: Consciousness badge */}
        <div className="absolute top-3 left-3 lg:left-[240px] xl:left-[270px] z-20 pointer-events-none">
          <div className="rounded px-2.5 py-1.5" style={{ backgroundColor: "rgba(0,0,0,0.7)", border: "1px solid rgba(212,175,55,0.15)" }}>
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5" style={{ color: "#D4AF37", filter: "drop-shadow(0 0 4px rgba(212,175,55,0.5))" }} />
              <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.5)" }}>Consciência</span>
              <span className="text-xs font-mono font-bold" style={{ color: "#D4AF37", textShadow: "0 0 8px rgba(212,175,55,0.5)" }}>{awareness.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Top-right: Plasma label */}
        <div className="absolute top-3 right-3 lg:right-[240px] xl:right-[270px] z-20 pointer-events-none">
          <div className="rounded px-2.5 py-1.5" style={{ backgroundColor: "rgba(0,0,0,0.7)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3" style={{ color: "#D4AF37", filter: "drop-shadow(0 0 4px rgba(212,175,55,0.5))" }} />
              <span className="text-[9px] font-mono" style={{ color: "rgba(59,130,246,0.5)" }}>Plasma Neural</span>
            </div>
          </div>
        </div>

        {/* Bottom: Thought bar */}
        <div className="absolute bottom-3 left-3 lg:left-[240px] xl:left-[270px] right-3 lg:right-[240px] xl:right-[270px] z-20 pointer-events-none">
          <div className="rounded px-3 py-1.5" style={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(212,175,55,0.12)" }}>
            <div className="flex items-center gap-2">
              <Brain className="h-3 w-3 shrink-0" style={{ color: "#D4AF37", filter: "drop-shadow(0 0 4px rgba(212,175,55,0.4))" }} />
              <p className="text-[10px] font-mono truncate" style={{ color: "rgba(59,130,246,0.6)" }}>{thought}</p>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT HUD PANEL ═══ */}
        <div className="absolute top-3 right-3 bottom-3 w-[220px] xl:w-[250px] hidden lg:flex flex-col gap-2 z-10 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(212,175,55,0.15) transparent" }}>

          {/* Reasoning Log */}
          <div className="relative bg-black/60 backdrop-blur-sm border border-cyan-500/20 rounded-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-emerald-400/60" />
            <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-cyan-500/10">
              <Activity className="h-3 w-3 text-[hsl(var(--tron-neon))] shrink-0" />
              <span className="text-[10px] font-mono text-[hsl(var(--tron-neon))] [text-shadow:0_0_8px_hsl(var(--tron-neon)/0.4)]/80 tracking-wider uppercase">Raciocínio</span>
            </div>
            <div className="px-3 py-2">
              <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
                {log.length > 0 ? log.slice(-6).map((e, i) => (
                  <p key={i} className="text-[7px] font-mono text-white/20 leading-relaxed">{e}</p>
                )) : (
                  <p className="text-[7px] text-white/10 font-mono text-center py-1">
                    {active ? "Processando..." : "Ative a visão"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Pipeline */}
          <div className="relative bg-black/60 backdrop-blur-sm border border-cyan-500/20 rounded-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-400/40 to-amber-400/60" />
            <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-cyan-500/10">
              <Cpu className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="text-[10px] font-mono text-amber-400/80 tracking-wider uppercase">Pipeline</span>
            </div>
            <div className="px-3 py-2 space-y-0.5">
              {[
                { label: "Camera → Canvas", active: active, color: "#00e5ff" },
                { label: "Region Classification", active: active, color: "#ffd740" },
                { label: "Motion Optical Flow", active: active, color: "#ff80ab" },
                { label: "Orion Vision AI", active: active && !!aiDescription, color: "#4fc3f7" },
                { label: "SuperNet WS", active: supernetConnected, color: "#ff6d00" },
                { label: "Neural Reasoning", active: active, color: "#00e676" },
                { label: "Plasma Core VFX", active: true, color: "#ff5252" },
                { label: "Bloom + Post-FX", active: true, color: "#b388ff" },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`h-1 w-1 rounded-full shrink-0 ${p.active ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: p.active ? p.color : "rgba(255,255,255,0.05)", boxShadow: p.active ? `0 0 4px ${p.color}60` : "none" }} />
                  <span className="text-[8px] font-mono text-white/25 flex-1">{p.label}</span>
                  <span className="text-[7px] font-mono font-bold" style={{ color: p.active ? p.color : "rgba(255,255,255,0.08)" }}>
                    {p.active ? "ON" : "OFF"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SuperNet */}
          <div className="relative bg-black/60 backdrop-blur-sm border border-cyan-500/20 rounded-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-400/40 to-orange-400/60" />
            <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-cyan-500/10">
              <Zap className="h-3 w-3 text-orange-400 shrink-0" />
              <span className="text-[10px] font-mono text-orange-400/80 tracking-wider uppercase">SuperNet</span>
              <span className={`ml-auto text-[7px] font-mono font-bold ${supernetConnected ? "text-[hsl(var(--tron-neon))]" : "text-[hsl(var(--tron-danger))]/60"}`}>
                {supernetConnected ? "● ON" : "● OFF"}
              </span>
            </div>
            <div className="px-3 py-2 space-y-1.5">
              <Input className="h-5 text-[8px] font-mono bg-transparent border-cyan-500/15 text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                value={supernetUrl} onChange={(e) => updateSuperNetUrl(e.target.value)} placeholder="ws://..." />
              {supernetConnected && (
                <div className="flex justify-between text-[8px] font-mono">
                  <span className="text-white/20">Latência</span>
                  <span className="text-orange-400 font-bold">{supernetLatency}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Tesla Coil Voltage + Active Inference */}
          <TeslaCoilVoltagePanel />
          <CognitiveRouterBadge />
          <ActiveInferenceIndicator />

          {/* Chat — always visible (works without camera) */}
          {(
            <div className="relative bg-black/60 backdrop-blur-sm border border-cyan-500/20 rounded-sm overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-cyan-400/30" />
              <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-cyan-500/10">
                <MessageCircle className="h-3 w-3 text-[hsl(var(--tron-neon))] shrink-0" />
                <span className="text-[10px] font-mono text-[hsl(var(--tron-neon))] [text-shadow:0_0_8px_hsl(var(--tron-neon)/0.4)]/80 tracking-wider uppercase">IA Chat</span>
                {isProcessing && (
                  <span className="ml-auto text-[7px] font-mono text-amber-400 animate-pulse">●</span>
                )}
              </div>
              <div className="px-3 py-2 space-y-1.5">
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-2 space-y-1.5">
                      <p className="text-[8px] font-mono text-white/15">Pergunte algo</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {["O que vê?", "Como estou?", "Agenda"].map(q => (
                          <button key={q} onClick={() => askAI(q)}
                            className="text-[7px] font-mono text-[hsl(var(--tron-neon))] [text-shadow:0_0_8px_hsl(var(--tron-neon)/0.4)]/30 border border-cyan-500/10 rounded px-1 py-0.5 hover:bg-cyan-400/5 hover:text-[hsl(var(--tron-neon))]/60 transition-colors">
                            {q}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {[
                          { label: "🔍 Pesquisar", cmd: "pesquisar na web " },
                          { label: "🔬 Fontes", cmd: "comparar fontes sobre " },
                          { label: "💡 Sugestões", cmd: "sugestões de busca para " },
                        ].map(a => (
                          <button key={a.label} onClick={() => setAskInput(a.cmd)}
                            className="text-[6px] font-mono text-amber-400/25 border border-amber-500/10 rounded px-1 py-0.5 hover:bg-amber-400/5 hover:text-amber-400/50 transition-colors">
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex gap-1 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[90%] rounded px-1.5 py-0.5 ${
                        msg.role === "user" ? "bg-cyan-500/10 border border-cyan-500/15"
                        : "bg-white/[0.03] border border-white/[0.06]"
                      }`}>
                        <div className="flex items-start gap-1">
                          <p className={`text-[8px] font-mono leading-relaxed flex-1 ${
                            msg.role === "user" ? "text-[hsl(var(--tron-neon))]/70" : "text-white/50"
                          }`}>{msg.text}</p>
                          {msg.role === "ai" && msg.confidence != null && (
                            <span className={`text-[6px] font-mono shrink-0 px-1 rounded ${
                              msg.confidence >= 0.7 ? "text-[hsl(var(--tron-neon))]/70 bg-emerald-400/10"
                              : msg.confidence >= 0.4 ? "text-amber-400/70 bg-amber-400/10"
                              : "text-[hsl(var(--tron-danger))]/70 bg-red-400/10"
                            }`}>{(msg.confidence * 100).toFixed(0)}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex gap-1">
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1">
                        <div className="flex gap-0.5">
                          {[0, 150, 300].map(d => (
                            <div key={d} className="h-1 w-1 rounded-full bg-cyan-400/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <form className="flex gap-1" onSubmit={(e) => {
                  e.preventDefault();
                  if (askInput.trim() && !isProcessing) { askAI(askInput.trim()); setAskInput(""); }
                }}>
                  <input type="text" value={askInput} onChange={(e) => setAskInput(e.target.value)}
                    placeholder="Pergunte..."
                    disabled={isProcessing}
                    className="flex-1 text-[8px] font-mono bg-transparent border border-cyan-500/15 rounded px-2 py-1 text-white/60 placeholder:text-white/15 focus:outline-none focus:border-cyan-400/40 disabled:opacity-30" />
                  <Button type="submit" size="sm" variant="ghost" className="h-6 w-6 p-0 text-[hsl(var(--tron-neon))]/60 hover:text-[hsl(var(--tron-neon))]" disabled={isProcessing || !askInput.trim()}>
                    <MessageCircle className="h-3 w-3" />
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Mobile layout - below plasma ═══ */}
        <div className="lg:hidden absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[#030508] via-[#030508]/95 to-transparent p-3 pt-8">
          {active && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[
                { label: "Awareness", value: `${awareness.toFixed(0)}%`, color: "#00e5ff" },
                { label: "Objetos", value: `${regions.length}`, color: "#ffd740" },
                { label: "Movimento", value: `${motion.intensity.toFixed(0)}%`, color: "#b388ff" },
                { label: "Plasma", value: VS.aiResponding ? "ON" : "OFF", color: VS.aiResponding ? "#ff5252" : "#69f0ae" },
              ].map((m, i) => (
                <div key={i} className="flex justify-between bg-black/60 rounded px-2 py-1 border border-cyan-500/10">
                  <span className="text-[8px] font-mono text-white/25">{m.label}</span>
                  <span className="text-[9px] font-mono font-bold" style={{ color: m.color }}>{m.value}</span>
                </div>
              ))}
            </div>
          )}
          {/* Mobile chat input — always visible */}
          <form className="flex gap-1" onSubmit={(e) => {
            e.preventDefault();
            if (askInput.trim() && !isProcessing) { askAI(askInput.trim()); setAskInput(""); }
          }}>
            <input type="text" value={askInput} onChange={(e) => setAskInput(e.target.value)}
              placeholder="Pergunte ao Orion..."
              disabled={isProcessing}
              className="flex-1 text-[10px] font-mono bg-black/70 border border-cyan-500/20 rounded px-3 py-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/40 disabled:opacity-30" />
            <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 p-0 text-[hsl(var(--tron-neon))]/60 hover:text-[hsl(var(--tron-neon))]" disabled={isProcessing || !askInput.trim()}>
              <MessageCircle className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* ═══ Standalone Chat Panel — visible when camera is OFF ═══ */}
      {!active && (
        <OrionStandalonePanel
          chatHistory={chatHistory}
          isProcessing={isProcessing}
          askInput={askInput}
          setAskInput={setAskInput}
          askAI={askAI}
        />
      )}
    </div>
  );
}

// ═══ Standalone Panel with Tabs: Chat / Pesquisa / Vídeo ═══
function OrionStandalonePanel({
  chatHistory,
  isProcessing,
  askInput,
  setAskInput,
  askAI,
}: {
  chatHistory: Array<{ role: string; text: string; time: string; confidence?: number }>;
  isProcessing: boolean;
  askInput: string;
  setAskInput: (v: string) => void;
  askAI: (q: string, source?: any) => void;
}) {
  const [activeTab, setActiveTab] = useState<"chat" | "pesquisa" | "video">("chat");

  // Listen for video commands to auto-switch to video tab
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.action === "play_video" || detail?.action === "search_video") {
        // Re-dispatch as embedded event
        window.dispatchEvent(new CustomEvent("orion-embedded-video", { detail }));
        setActiveTab("video");
      }
    };
    window.addEventListener("orion-video-command", handler);
    return () => window.removeEventListener("orion-video-command", handler);
  }, []);

  // Listen for search commands to auto-switch to pesquisa tab
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.query) {
        setActiveTab("pesquisa");
      }
    };
    window.addEventListener("orion-research-navigate", handler);
    return () => window.removeEventListener("orion-research-navigate", handler);
  }, []);

  const tabs = [
    { id: "chat" as const, label: "Chat", icon: MessageCircle },
    { id: "pesquisa" as const, label: "Pesquisa", icon: Globe },
    { id: "video" as const, label: "Vídeo", icon: PlayCircle },
  ];

  return (
    <div className="relative rounded-lg overflow-hidden" style={{
      backgroundColor: "rgba(10,10,15,0.7)",
      border: "1px solid rgba(212,175,55,0.12)",
    }}>
      {/* Tab bar */}
      <div className="flex border-b border-white/[0.06]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[9px] font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? "text-[hsl(var(--tron-neon))] border-b-2 border-cyan-400/50 bg-cyan-400/[0.03]"
                : "text-white/25 hover:text-white/40 hover:bg-white/[0.02]"
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat tab — clone do Orion IA Consultoria (mesmo cérebro, mesma RAG, histórico compartilhado) */}
      {activeTab === "chat" && (
        <div className="h-[480px] overflow-hidden rounded-lg border border-cyan-500/15 bg-black/20">
          <ChatIARouter />
        </div>
      )}

      {activeTab === "pesquisa" && (
        <div className="h-[350px] flex flex-col">
          <OrionResearchBrowser onSearchQuery={(q) => askAI(`pesquisar na web ${q}`)} />
        </div>
      )}

      {/* Vídeo tab */}
      {activeTab === "video" && (
        <div className="p-2">
          <OrionEmbeddedVideo onClose={() => setActiveTab("chat")} />
        </div>
      )}
    </div>
  )}

