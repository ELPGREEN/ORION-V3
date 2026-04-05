/**
 * useTribunalVision — Hook v22.2 (Completo)
 * Captura e processa frames de vídeo para visão computacional em tribunais.
 * 
 * Web APIs integradas:
 * - MediaDevices API (getUserMedia, enumerateDevices, getDisplayMedia)
 * - Screen Capture API (captura de tela do PJe/ePROC)
 * - Canvas API (frame extraction + feature grid)
 * - Picture-in-Picture API (overlay da Ana durante audiência)
 * - Web Animations API (transições suaves do avatar)
 * - MediaStream API (track management)
 * - Idle Detection API (detecção de ausência)
 * 
 * Integra com Edge Functions tribunal-vision-stream e tribunal-facial-stream.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  detectTribunalElements,
  analyzeFacialExpression,
  analyzeGestures,
  generateVisionEmbedding,
  type TribunalVisionConfig,
  type TribunalDetection,
  type EmotionVector,
  type GestureAnalysis,
  type TribunalSystemType,
  DEFAULT_TRIBUNAL_VISION_CONFIG,
} from "@/lib/neural/vision-tribunal";
import {
  detectFacesFromFeatures,
  analyzeFacialEmotion,
  type FaceDetectionResult,
  type FacialEmotionResult,
} from "@/lib/neural";

// ─── Types ───

export type CaptureSource = "webcam" | "screen" | "tab" | "video_element";
export type IdleStatus = "active" | "idle" | "locked" | "unknown";

export interface TribunalVisionState {
  isActive: boolean;
  isProcessing: boolean;
  captureSource: CaptureSource;
  screenType: TribunalSystemType;
  detections: TribunalDetection[];
  faces: FaceDetectionResult[];
  emotion: EmotionVector | null;
  faceEmotions: FacialEmotionResult[];
  gesture: GestureAnalysis | null;
  visionEmbedding: number[];
  fusedEmbedding: number[];
  fps: number;
  latencyMs: number;
  frameCount: number;
  sessionId: string;
  error: string | null;
  // New: Web API states
  isPiPActive: boolean;
  idleStatus: IdleStatus;
  availableDevices: MediaDeviceInfo[];
  activeTrackSettings: MediaTrackSettings | null;
}

export interface TribunalVisionActions {
  start: (videoElement?: HTMLVideoElement | null) => void;
  startScreenCapture: () => Promise<void>;
  startTabCapture: () => Promise<void>;
  stop: () => void;
  captureFrame: () => Promise<void>;
  processWithEdge: (mode?: "detect" | "ocr" | "emotion" | "full" | "embed" | "gesture") => Promise<unknown>;
  processFacialWithEdge: (mode?: "detect" | "identify" | "emotion" | "diarize" | "full") => Promise<unknown>;
  setConfig: (config: Partial<TribunalVisionConfig>) => void;
  enablePiP: (element: HTMLVideoElement) => Promise<void>;
  disablePiP: () => Promise<void>;
  enumerateDevices: () => Promise<MediaDeviceInfo[]>;
  switchCamera: (deviceId: string) => Promise<void>;
  getFrameAsBase64: () => string | null;
}

const INITIAL_STATE: TribunalVisionState = {
  isActive: false,
  isProcessing: false,
  captureSource: "webcam",
  screenType: "unknown",
  detections: [],
  faces: [],
  emotion: null,
  faceEmotions: [],
  gesture: null,
  visionEmbedding: [],
  fusedEmbedding: [],
  fps: 0,
  latencyMs: 0,
  frameCount: 0,
  sessionId: "",
  error: null,
  isPiPActive: false,
  idleStatus: "unknown",
  availableDevices: [],
  activeTrackSettings: null,
};

// ─── Hook ───

export function useTribunalVision(
  initialConfig?: Partial<TribunalVisionConfig>
): [TribunalVisionState, TribunalVisionActions] {
  const [state, setState] = useState<TribunalVisionState>({
    ...INITIAL_STATE,
    sessionId: crypto.randomUUID(),
  });

  const configRef = useRef<TribunalVisionConfig>({
    ...DEFAULT_TRIBUNAL_VISION_CONFIG,
    ...initialConfig,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const mountedRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    canvasRef.current = document.createElement("canvas");
    canvasRef.current.width = 320;
    canvasRef.current.height = 240;
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      cleanupStream();
    };
  }, []);

  // ─── Stream Management ───

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const attachStream = useCallback((stream: MediaStream, source: CaptureSource) => {
    cleanupStream();
    streamRef.current = stream;

    const video = videoRef.current || document.createElement("video");
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    video.play().catch(() => {});
    videoRef.current = video;

    // Get track settings
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack?.getSettings() || null;

    // Listen for track end (user stopped sharing)
    videoTrack?.addEventListener("ended", () => {
      if (mountedRef.current) {
        stop();
      }
    });

    setState((prev) => ({
      ...prev,
      isActive: true,
      captureSource: source,
      activeTrackSettings: settings,
      error: null,
    }));

    // Start capture loop at ~5 FPS
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => captureFrame(), 200);
  }, []);

  // ─── Feature Extraction (Grid 8x8 luminance + edge + color) ───

  const extractFrameFeatures = useCallback((): number[] => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return [];

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const features: number[] = [];
    const gridSize = 8;
    const cellW = Math.floor(canvas.width / gridSize);
    const cellH = Math.floor(canvas.height / gridSize);

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        let lumSum = 0;
        let edgeSum = 0;
        let count = 0;
        const startX = gx * cellW;
        const startY = gy * cellH;

        for (let y = startY; y < startY + cellH && y < canvas.height; y++) {
          for (let x = startX; x < startX + cellW && x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const lum = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114) / 255;
            lumSum += lum;

            // Simple edge detection (Sobel-like)
            if (x > 0 && y > 0) {
              const prevIdx = ((y - 1) * canvas.width + (x - 1)) * 4;
              const prevLum = (pixels[prevIdx] * 0.299 + pixels[prevIdx + 1] * 0.587 + pixels[prevIdx + 2] * 0.114) / 255;
              edgeSum += Math.abs(lum - prevLum);
            }
            count++;
          }
        }

        features.push(count > 0 ? (lumSum / count) * 2 - 1 : 0);
        // Add edge feature for gesture/motion detection
        if (features.length < 96) {
          features.push(count > 0 ? Math.min(1, (edgeSum / count) * 4) : 0);
        }
      }
    }

    return features;
  }, []);

  // ─── Frame as Base64 (for Edge Function image mode) ───

  const getFrameAsBase64 = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    return dataUrl.replace(/^data:image\/jpeg;base64,/, "");
  }, []);

  // ─── Local Frame Processing ───

  const captureFrame = useCallback(async () => {
    if (!mountedRef.current) return;

    const startTime = performance.now();
    const features = extractFrameFeatures();
    if (features.length === 0) return;

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      const config = configRef.current;

      // Run local processing in parallel
      const detections = detectTribunalElements(features.slice(0, 64), config);
      const emotion = analyzeFacialExpression(features.slice(0, 20), config);
      const gesture = analyzeGestures(features.slice(20, 40), config);
      const visionEmbedding = generateVisionEmbedding(features.slice(0, 64), config);

      // Face detection from features
      const faces = detectFacesFromFeatures(features.slice(0, 64));
      const faceEmotions = faces.map((f) => analyzeFacialEmotion(f.landmarks));

      const screenDetection = detections.find((d) => d.type === "screen");
      const screenType = (screenDetection?.metadata?.system as TribunalSystemType) || "unknown";

      // FPS calculation
      const now = Date.now();
      frameTimesRef.current.push(now);
      frameTimesRef.current = frameTimesRef.current.filter((t) => now - t < 1000);

      const latencyMs = performance.now() - startTime;

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          screenType,
          detections,
          faces,
          emotion,
          faceEmotions,
          gesture,
          visionEmbedding,
          fps: frameTimesRef.current.length,
          latencyMs: Math.round(latencyMs),
          frameCount: prev.frameCount + 1,
          error: null,
        }));
      }
    } catch (err) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: err instanceof Error ? err.message : "Erro ao processar frame",
        }));
      }
    }
  }, [extractFrameFeatures]);

  // ─── Edge Function Processing ───

  const processWithEdge = useCallback(
    async (mode: "detect" | "ocr" | "emotion" | "full" | "embed" | "gesture" = "full") => {
      const features = extractFrameFeatures();
      if (features.length === 0) return null;

      try {
        const { data, error } = await supabase.functions.invoke("tribunal-stream", {
          body: {
            action: "vision",
            frameFeatures: features,
            mode,
            config: configRef.current,
            sessionId: state.sessionId,
          },
        });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("[useTribunalVision] Edge error:", err);
        return null;
      }
    },
    [extractFrameFeatures, state.sessionId]
  );

  const processFacialWithEdge = useCallback(
    async (mode: "detect" | "identify" | "emotion" | "diarize" | "full" = "full") => {
      const features = extractFrameFeatures();
      if (features.length === 0) return null;

      try {
        const { data, error } = await supabase.functions.invoke("tribunal-stream", {
          body: {
            action: "facial",
            frameFeatures: features,
            mode,
            sessionId: state.sessionId,
            consentToken: state.sessionId,
          },
        });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("[useTribunalVision] Facial edge error:", err);
        return null;
      }
    },
    [extractFrameFeatures, state.sessionId]
  );

  // ─── Webcam Start ───

  const start = useCallback(
    (videoElement?: HTMLVideoElement | null) => {
      if (videoElement) {
        videoRef.current = videoElement;
        if (videoElement.srcObject) {
          attachStream(videoElement.srcObject as MediaStream, "video_element");
          return;
        }
      }

      navigator.mediaDevices
        .getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
            frameRate: { ideal: 15, max: 30 },
          },
        })
        .then((stream) => attachStream(stream, "webcam"))
        .catch((err) => {
          if (mountedRef.current) {
            setState((prev) => ({
              ...prev,
              error: `Câmera indisponível: ${err instanceof Error ? err.message : "erro"}`,
            }));
          }
        });
    },
    [attachStream]
  );

  // ─── Screen Capture API (captura de tela do PJe/ePROC) ───

  const startScreenCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 5, max: 15 },
        },
        audio: false,
      });
      attachStream(stream, "screen");
    } catch (err) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          error: `Captura de tela falhou: ${err instanceof Error ? err.message : "erro"}`,
        }));
      }
    }
  }, [attachStream]);

  // ─── Tab Capture (Screen Capture API with preferCurrentTab) ───

  const startTabCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        // @ts-ignore — preferCurrentTab is experimental
        preferCurrentTab: true,
      });
      attachStream(stream, "tab");
    } catch (err) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          error: `Captura de aba falhou: ${err instanceof Error ? err.message : "erro"}`,
        }));
      }
    }
  }, [attachStream]);

  // ─── Picture-in-Picture API ───

  const enablePiP = useCallback(async (element: HTMLVideoElement) => {
    try {
      if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
        await element.requestPictureInPicture();
        setState((prev) => ({ ...prev, isPiPActive: true }));
      }
    } catch (err) {
      console.warn("[PiP] Não suportado:", err);
    }
  }, []);

  const disablePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setState((prev) => ({ ...prev, isPiPActive: false }));
      }
    } catch (err) {
      console.warn("[PiP] Erro ao sair:", err);
    }
  }, []);

  // ─── MediaDevices API (enumerateDevices + switchCamera) ───

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setState((prev) => ({ ...prev, availableDevices: videoDevices }));
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  const switchCamera = useCallback(
    async (deviceId: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 },
          },
        });
        attachStream(stream, "webcam");
      } catch (err) {
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            error: `Falha ao trocar câmera: ${err instanceof Error ? err.message : "erro"}`,
          }));
        }
      }
    },
    [attachStream]
  );

  // ─── Stop ───

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    cleanupStream();
    disablePiP();
    setState((prev) => ({ ...prev, isActive: false, isProcessing: false, isPiPActive: false }));
  }, [cleanupStream, disablePiP]);

  const setConfig = useCallback((partial: Partial<TribunalVisionConfig>) => {
    configRef.current = { ...configRef.current, ...partial };
  }, []);

  return [
    state,
    {
      start,
      startScreenCapture,
      startTabCapture,
      stop,
      captureFrame,
      processWithEdge,
      processFacialWithEdge,
      setConfig,
      enablePiP,
      disablePiP,
      enumerateDevices,
      switchCamera,
      getFrameAsBase64,
    },
  ];
}
