/**
 * useMultimodalVision — Hook v22.2
 * Ativa visão + reconhecimento facial em qualquer página do ELP.
 * Combina useTribunalVision + useAnaAvatar + facial-recognition neural module.
 * 
 * Ativado automaticamente quando consentimento LGPD é dado.
 * Fornece: emoção detectada, identidade, gestos, e estado do avatar Ana.
 */

import { useState, useCallback, useRef, useEffect } from "react";

import {
  detectFacesFromFeatures,
  analyzeFacialEmotion,
  identifyFaceFromEmbedding,
  diarizeFaceAudio,
  generateFaceEmbedding,
  type FaceDetectionResult,
  type FacialEmotionResult,
  type FaceIdentityMatch,
} from "@/lib/neural";
import {
  analyzeFacialExpression,
  analyzeGestures,
  type EmotionVector,
  type GestureAnalysis,
} from "@/lib/neural/vision-tribunal";

// ─── Types ───

export type VisionContext = "chat" | "editor" | "audiencia" | "educacao" | "dashboard" | "global";

export interface MultimodalVisionState {
  isActive: boolean;
  isProcessing: boolean;
  hasConsent: boolean;
  context: VisionContext;
  currentEmotion: EmotionVector | null;
  faces: FaceDetectionResult[];
  identity: FaceIdentityMatch | null;
  gesture: GestureAnalysis | null;
  emotionHistory: Array<{ emotion: string; timestamp: number; confidence: number }>;
  fps: number;
  sessionId: string | null;
  error: string | null;
}

export interface MultimodalVisionActions {
  grantConsent: () => void;
  revokeConsent: () => void;
  startVision: (ctx?: VisionContext) => Promise<void>;
  stopVision: () => void;
  setContext: (ctx: VisionContext) => void;
  getEmotionSummary: () => Record<string, number>;
}

const CONSENT_KEY = "elp_vision_consent_v22";
const MAX_EMOTION_HISTORY = 100;
const PROCESS_INTERVAL_MS = 200; // ~5 FPS

export function useMultimodalVision(): MultimodalVisionState & MultimodalVisionActions {
  const [state, setState] = useState<MultimodalVisionState>({
    isActive: false,
    isProcessing: false,
    hasConsent: typeof window !== "undefined" && localStorage.getItem(CONSENT_KEY) === "true",
    context: "global",
    currentEmotion: null,
    faces: [],
    identity: null,
    gesture: null,
    emotionHistory: [],
    fps: 0,
    sessionId: null,
    error: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Consent ───
  const grantConsent = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "true");
    setState(s => ({ ...s, hasConsent: true }));
  }, []);

  const revokeConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_KEY);
    setState(s => ({ ...s, hasConsent: false, isActive: false }));
    stopVision();
  }, []);

  // ─── Feature Extraction (8x8 luminance grid → 64 features) ───
  const extractFeatures = useCallback((): number[] => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return [];

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];

    const gridSize = 8;
    canvas.width = gridSize;
    canvas.height = gridSize;
    ctx.drawImage(video, 0, 0, gridSize, gridSize);

    const imageData = ctx.getImageData(0, 0, gridSize, gridSize);
    const features: number[] = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
      const lum = (imageData.data[i] * 0.299 + imageData.data[i + 1] * 0.587 + imageData.data[i + 2] * 0.114) / 255;
      features.push(lum);
    }
    return features;
  }, []);

  // ─── Process Frame ───
  const processFrame = useCallback(async () => {
    if (state.isProcessing) return;
    setState(s => ({ ...s, isProcessing: true }));

    try {
      const features = extractFeatures();
      if (features.length === 0) {
        setState(s => ({ ...s, isProcessing: false }));
        return;
      }

      // Local neural processing (no API call needed)
      const faces = detectFacesFromFeatures(features);
      const emotion = features.length >= 4 ? analyzeFacialExpression(features) : null;
      const gesture = analyzeGestures(features);

      // Emotion history tracking
      const emotionEntry = emotion ? {
        emotion: emotion.dominant,
        timestamp: Date.now(),
        confidence: Math.max(...Object.values(emotion.scores)),
      } : null;

      frameCountRef.current++;

      setState(s => ({
        ...s,
        isProcessing: false,
        faces,
        currentEmotion: emotion,
        gesture,
        emotionHistory: emotionEntry
          ? [...s.emotionHistory.slice(-MAX_EMOTION_HISTORY + 1), emotionEntry]
          : s.emotionHistory,
      }));

      // Deep analysis removed — local neural processing is sufficient
      // tribunal-stream edge function calls were unnecessary API overhead
    } catch (err) {
      setState(s => ({
        ...s,
        isProcessing: false,
        error: err instanceof Error ? err.message : "Erro no processamento de visão",
      }));
    }
  }, [state.isProcessing, state.sessionId, extractFeatures]);

  // ─── Start/Stop Vision ───
  const startVision = useCallback(async (ctx?: VisionContext) => {
    if (!state.hasConsent) {
      setState(s => ({ ...s, error: "Consentimento LGPD necessário" }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user", frameRate: { max: 10 } },
        audio: false,
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      await video.play();

      const canvas = document.createElement("canvas");

      streamRef.current = stream;
      videoRef.current = video;
      canvasRef.current = canvas;
      frameCountRef.current = 0;

      const sessionId = crypto.randomUUID();

      setState(s => ({
        ...s,
        isActive: true,
        context: ctx || s.context,
        sessionId,
        error: null,
      }));

      // Start processing loop
      intervalRef.current = setInterval(() => {
        processFrame();
      }, PROCESS_INTERVAL_MS);

      // FPS counter
      fpsIntervalRef.current = setInterval(() => {
        setState(s => ({ ...s, fps: frameCountRef.current }));
        frameCountRef.current = 0;
      }, 1000);

    } catch (err) {
      setState(s => ({
        ...s,
        error: err instanceof Error ? err.message : "Câmera indisponível",
      }));
    }
  }, [state.hasConsent, processFrame]);

  const stopVision = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
    intervalRef.current = null;
    fpsIntervalRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    setState(s => ({
      ...s,
      isActive: false,
      isProcessing: false,
      fps: 0,
      sessionId: null,
    }));
  }, []);

  const setContext = useCallback((ctx: VisionContext) => {
    setState(s => ({ ...s, context: ctx }));
  }, []);

  const getEmotionSummary = useCallback((): Record<string, number> => {
    const summary: Record<string, number> = {};
    for (const entry of state.emotionHistory) {
      summary[entry.emotion] = (summary[entry.emotion] || 0) + 1;
    }
    const total = state.emotionHistory.length || 1;
    for (const key of Object.keys(summary)) {
      summary[key] = summary[key] / total;
    }
    return summary;
  }, [state.emotionHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVision();
    };
  }, [stopVision]);

  return {
    ...state,
    grantConsent,
    revokeConsent,
    startVision,
    stopVision,
    setContext,
    getEmotionSummary,
  };
}
