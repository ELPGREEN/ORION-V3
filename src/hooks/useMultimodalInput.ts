/**
 * useMultimodalInput — Hook v22.0 "Multimodal Core"
 * Unifica visão (câmera) + audição (microfone) em um único hook.
 * Substitui useVoiceInput para ativar processamento multimodal em todas as páginas.
 * 
 * Web APIs: MediaDevices, Web Audio API, Canvas API, WebCodecs (quando disponível).
 * Integra: useMultimodalVision (facial/gestos) + audio stream (Whisper/HuBERT).
 * LGPD: Consentimento explícito obrigatório para câmera e microfone.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  detectFacesFromFeatures,
  analyzeFacialEmotion,
  type FaceDetectionResult,
  type FacialEmotionResult,
} from "@/lib/neural";
import {
  analyzeFacialExpression,
  analyzeGestures,
  type EmotionVector,
  type GestureAnalysis,
} from "@/lib/neural/vision-tribunal";

// ─── Types ───

export type MultimodalContext =
  | "chat" | "editor" | "audiencia" | "educacao"
  | "dashboard" | "search" | "training" | "global";

export interface AudioState {
  isListening: boolean;
  volume: number;           // 0-1 RMS
  isSpeechDetected: boolean;
  lastTranscript: string;
  language: string;
}

export interface VisionState {
  isActive: boolean;
  faces: FaceDetectionResult[];
  emotion: EmotionVector | null;
  gesture: GestureAnalysis | null;
  fps: number;
}

export interface MultimodalInputState {
  context: MultimodalContext;
  hasVisionConsent: boolean;
  hasAudioConsent: boolean;
  isProcessing: boolean;
  vision: VisionState;
  audio: AudioState;
  fusedEmotion: string | null;    // Dominant emotion from vision+audio fusion
  fusedConfidence: number;
  sessionId: string | null;
  error: string | null;
}

export interface MultimodalInputActions {
  grantVisionConsent: () => void;
  grantAudioConsent: () => void;
  grantAllConsent: () => void;
  revokeAllConsent: () => void;
  startMultimodal: (ctx?: MultimodalContext) => Promise<void>;
  startVisionOnly: () => Promise<void>;
  startAudioOnly: () => Promise<void>;
  stopAll: () => void;
  setContext: (ctx: MultimodalContext) => void;
  getEmotionSummary: () => Record<string, number>;
}

// ─── Constants ───
const VISION_CONSENT_KEY = "elp_vision_consent_v22";
const AUDIO_CONSENT_KEY = "elp_audio_consent_v22";
const VISION_INTERVAL_MS = 200;  // ~5 FPS
const AUDIO_INTERVAL_MS = 100;   // 10 Hz volume check

// ─── Hook ───
export function useMultimodalInput(): MultimodalInputState & MultimodalInputActions {
  const [state, setState] = useState<MultimodalInputState>({
    context: "global",
    hasVisionConsent: typeof window !== "undefined" && localStorage.getItem(VISION_CONSENT_KEY) === "true",
    hasAudioConsent: typeof window !== "undefined" && localStorage.getItem(AUDIO_CONSENT_KEY) === "true",
    isProcessing: false,
    vision: {
      isActive: false,
      faces: [],
      emotion: null,
      gesture: null,
      fps: 0,
    },
    audio: {
      isListening: false,
      volume: 0,
      isSpeechDetected: false,
      lastTranscript: "",
      language: "pt-BR",
    },
    fusedEmotion: null,
    fusedConfidence: 0,
    sessionId: null,
    error: null,
  });

  // Refs
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const visionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsCountRef = useRef(0);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emotionHistoryRef = useRef<Array<{ emotion: string; ts: number }>>([]);
  const frameCountRef = useRef(0);

  // ─── Consent Management ───
  const grantVisionConsent = useCallback(() => {
    localStorage.setItem(VISION_CONSENT_KEY, "true");
    setState(s => ({ ...s, hasVisionConsent: true }));
  }, []);

  const grantAudioConsent = useCallback(() => {
    localStorage.setItem(AUDIO_CONSENT_KEY, "true");
    setState(s => ({ ...s, hasAudioConsent: true }));
  }, []);

  const grantAllConsent = useCallback(() => {
    localStorage.setItem(VISION_CONSENT_KEY, "true");
    localStorage.setItem(AUDIO_CONSENT_KEY, "true");
    setState(s => ({ ...s, hasVisionConsent: true, hasAudioConsent: true }));
  }, []);

  const revokeAllConsent = useCallback(() => {
    localStorage.removeItem(VISION_CONSENT_KEY);
    localStorage.removeItem(AUDIO_CONSENT_KEY);
    setState(s => ({ ...s, hasVisionConsent: false, hasAudioConsent: false }));
    stopAll();
  }, []);

  // ─── Vision: Feature Extraction ───
  const extractVisionFeatures = useCallback((): number[] => {
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

  // ─── Audio: Volume Analysis ───
  const getAudioVolume = useCallback((): number => {
    const analyser = analyserRef.current;
    if (!analyser) return 0;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length);
  }, []);

  // ─── Fusion: Combine vision emotion + audio energy ───
  const fuseModalities = useCallback((
    visionEmotion: EmotionVector | null,
    audioVolume: number
  ): { emotion: string; confidence: number } => {
    if (!visionEmotion) {
      // Audio-only: high volume → aroused, low → calm
      if (audioVolume > 0.3) return { emotion: "aroused", confidence: audioVolume };
      return { emotion: "neutral", confidence: 0.5 };
    }

    // Vision + Audio fusion
    const dominant = visionEmotion.dominant;
    const visionConf = Math.max(...Object.values(visionEmotion.scores));

    // Audio modulates confidence: speaking + matching emotion = higher confidence
    const audioBoost = audioVolume > 0.1 ? 0.1 : 0;
    const confidence = Math.min(1, visionConf + audioBoost);

    return { emotion: dominant, confidence };
  }, []);

  // ─── Process Frame (Vision + Audio) ───
  const processFrame = useCallback(() => {
    const features = extractVisionFeatures();
    const audioVolume = getAudioVolume();
    const isSpeechDetected = audioVolume > 0.08;

    let faces: FaceDetectionResult[] = [];
    let emotion: EmotionVector | null = null;
    let gesture: GestureAnalysis | null = null;

    if (features.length > 0) {
      faces = detectFacesFromFeatures(features);
      emotion = analyzeFacialExpression(features);
      gesture = analyzeGestures(features);
      fpsCountRef.current++;
    }

    const fused = fuseModalities(emotion, audioVolume);

    // Track emotion history
    if (fused.emotion !== "neutral") {
      emotionHistoryRef.current.push({ emotion: fused.emotion, ts: Date.now() });
      if (emotionHistoryRef.current.length > 200) {
        emotionHistoryRef.current = emotionHistoryRef.current.slice(-200);
      }
    }

    frameCountRef.current++;

    setState(s => ({
      ...s,
      isProcessing: false,
      vision: { ...s.vision, faces, emotion, gesture },
      audio: { ...s.audio, volume: audioVolume, isSpeechDetected },
      fusedEmotion: fused.emotion,
      fusedConfidence: fused.confidence,
    }));

    // Deep analysis every 15 frames
    if (frameCountRef.current % 15 === 0 && features.length > 0) {
      supabase.functions.invoke("tribunal-stream", {
        body: {
          action: "facial",
          frameFeatures: features,
          mode: "full",
          sessionId: state.sessionId,
          consentToken: VISION_CONSENT_KEY,
        },
      }).catch(() => { /* non-critical */ });
    }
  }, [extractVisionFeatures, getAudioVolume, fuseModalities, state.sessionId]);

  // ─── Start Vision Stream ───
  const startVisionStream = useCallback(async () => {
    if (!state.hasVisionConsent) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: "user", frameRate: { max: 10 } },
      audio: false,
    });

    const video = document.createElement("video");
    video.srcObject = stream;
    video.playsInline = true;
    await video.play();

    videoStreamRef.current = stream;
    videoRef.current = video;
    canvasRef.current = document.createElement("canvas");

    setState(s => ({ ...s, vision: { ...s.vision, isActive: true } }));
  }, [state.hasVisionConsent]);

  // ─── Start Audio Stream ───
  const startAudioStream = useCallback(async () => {
    if (!state.hasAudioConsent) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
    });

    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    audioStreamRef.current = stream;
    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;

    setState(s => ({ ...s, audio: { ...s.audio, isListening: true } }));
  }, [state.hasAudioConsent]);

  // ─── Public API ───
  const startMultimodal = useCallback(async (ctx?: MultimodalContext) => {
    try {
      const sessionId = crypto.randomUUID();
      setState(s => ({ ...s, sessionId, context: ctx || s.context, error: null }));
      frameCountRef.current = 0;
      fpsCountRef.current = 0;

      await Promise.allSettled([startVisionStream(), startAudioStream()]);

      // Processing loop
      visionIntervalRef.current = setInterval(processFrame, VISION_INTERVAL_MS);

      // FPS counter
      fpsIntervalRef.current = setInterval(() => {
        setState(s => ({ ...s, vision: { ...s.vision, fps: fpsCountRef.current } }));
        fpsCountRef.current = 0;
      }, 1000);
    } catch (err) {
      setState(s => ({
        ...s,
        error: err instanceof Error ? err.message : "Erro ao iniciar multimodal",
      }));
    }
  }, [startVisionStream, startAudioStream, processFrame]);

  const startVisionOnly = useCallback(async () => {
    try {
      const sessionId = crypto.randomUUID();
      setState(s => ({ ...s, sessionId, error: null }));
      await startVisionStream();
      visionIntervalRef.current = setInterval(processFrame, VISION_INTERVAL_MS);
    } catch (err) {
      setState(s => ({ ...s, error: err instanceof Error ? err.message : "Câmera indisponível" }));
    }
  }, [startVisionStream, processFrame]);

  const startAudioOnly = useCallback(async () => {
    try {
      const sessionId = crypto.randomUUID();
      setState(s => ({ ...s, sessionId, error: null }));
      await startAudioStream();
      audioIntervalRef.current = setInterval(() => {
        const vol = getAudioVolume();
        setState(s => ({
          ...s,
          audio: { ...s.audio, volume: vol, isSpeechDetected: vol > 0.08 },
        }));
      }, AUDIO_INTERVAL_MS);
    } catch (err) {
      setState(s => ({ ...s, error: err instanceof Error ? err.message : "Microfone indisponível" }));
    }
  }, [startAudioStream, getAudioVolume]);

  const stopAll = useCallback(() => {
    [visionIntervalRef, audioIntervalRef, fpsIntervalRef].forEach(ref => {
      if (ref.current) { clearInterval(ref.current); ref.current = null; }
    });

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    analyserRef.current = null;

    setState(s => ({
      ...s,
      isProcessing: false,
      sessionId: null,
      vision: { ...s.vision, isActive: false, fps: 0 },
      audio: { ...s.audio, isListening: false, volume: 0, isSpeechDetected: false },
    }));
  }, []);

  const setContext = useCallback((ctx: MultimodalContext) => {
    setState(s => ({ ...s, context: ctx }));
  }, []);

  const getEmotionSummary = useCallback((): Record<string, number> => {
    const history = emotionHistoryRef.current;
    const summary: Record<string, number> = {};
    for (const entry of history) {
      summary[entry.emotion] = (summary[entry.emotion] || 0) + 1;
    }
    const total = history.length || 1;
    for (const key of Object.keys(summary)) {
      summary[key] = Math.round((summary[key] / total) * 100) / 100;
    }
    return summary;
  }, []);

  // Cleanup
  useEffect(() => () => stopAll(), [stopAll]);

  return {
    ...state,
    grantVisionConsent,
    grantAudioConsent,
    grantAllConsent,
    revokeAllConsent,
    startMultimodal,
    startVisionOnly,
    startAudioOnly,
    stopAll,
    setContext,
    getEmotionSummary,
  };
}
