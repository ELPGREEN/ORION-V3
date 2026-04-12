/**
 * ─── Orion Orchestrator Execution Layer ───
 * Real execution methods for each capability with tier-based fallback.
 * Uses existing project modules (mediapipe-vision, yolo-onnx, face-api, etc.)
 */

import { getAPIsForCapability, reportAPILatency, type OrionCapability } from "./orion-api-orchestrator";
import { getBlazeFaceModel } from "./tf-runtime";
// Transformers.js vision/audio removed — Gemini handles all vision

// Stubs for removed local ML modules
type MPVisionResult = { objects: any[]; faces: any[]; hands: any[]; poses: any[]; timestamp: number };
type YOLODetection = { name: string; namePt: string; confidence: number; x: number; y: number; width: number; height: number };
type FaceApiDetection = { box: { x: number; y: number; width: number; height: number }; score: number; landmarks: { x: number; y: number }[]; descriptor: Float32Array | null; expressions: Record<string, number> | null };
type GazeResult = { direction: string; confidence: number } | null;
const detectAllMP = async (_v?: any): Promise<MPVisionResult> => ({ objects: [], faces: [], hands: [], poses: [], timestamp: Date.now() });
const detectWithYOLO = async (_v?: any): Promise<YOLODetection[]> => [];
const detectSingleFaceFull = async (_input: any): Promise<FaceApiDetection | null> => null;
const loadFaceApiModels = async () => false;

// ─── Types ───

export interface VisionResult {
  description: string;
  objects: Array<{ label: string; confidence: number; bbox?: number[] }>;
  source: string;
  latencyMs: number;
  vlmDescription?: string;
  handwrittenText?: string;
  gaze?: GazeResult | null;
}

export interface FaceResult {
  detected: boolean;
  landmarks: { x: number; y: number }[] | null;
  expressions: Record<string, number> | null;
  descriptor: Float32Array | null;
  source: string;
  latencyMs: number;
}

export interface ListenResult {
  transcript: string;
  source: string;
  latencyMs: number;
}

// ─── Vision: MediaPipe → YOLO → (cloud fallback is handled by caller) ───

export async function orchestratorSee(
  video: HTMLVideoElement
): Promise<VisionResult> {
  const apis = getAPIsForCapability("vision");
  let lastError: Error | null = null;

  for (const api of apis) {
    if (api.health === "offline" || api.health === "error") continue;
    const start = Date.now();

    try {
      if (api.id === "mediapipe_vision") {
        const mp: MPVisionResult = await detectAllMP(video);
        const latency = Date.now() - start;
        reportAPILatency("mediapipe_vision", latency, true);

        const objects = [
          ...mp.objects.map(o => ({ label: o.name, confidence: o.confidence, bbox: [o.x, o.y, o.width, o.height] })),
          ...mp.faces.map((f, i) => ({ label: `rosto_${i + 1}`, confidence: f.confidence, bbox: [f.x, f.y, f.width, f.height] })),
          ...mp.hands.map((h) => ({ label: `mão_${h.handedness}`, confidence: h.confidence })),
        ];

        return {
          description: objects.length > 0
            ? `Detectados: ${objects.map(o => o.label).join(", ")}`
            : "Nenhum objeto detectado",
          objects,
          source: "mediapipe",
          latencyMs: latency,
        };
      }

      if (api.id === "yolo_onnx") {
        const yoloResults: YOLODetection[] = await detectWithYOLO(video);
        const latency = Date.now() - start;
        reportAPILatency("yolo_onnx", latency, true);

        const objects = yoloResults.map(d => ({
          label: d.namePt || d.name,
          confidence: d.confidence,
          bbox: [d.x, d.y, d.width, d.height],
        }));

        return {
          description: objects.length > 0
            ? `YOLO detectou: ${objects.map(o => `${o.label}(${(o.confidence * 100).toFixed(0)}%)`).join(", ")}`
            : "Nenhum objeto detectado (YOLO)",
          objects,
          source: "yolo",
          latencyMs: latency,
        };
      }

      // ─── Transformers.js Vision (100% free, browser-side) ───
      if (api.id === "transformersjs_vision") {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          // Transformers.js removed — skip this tier
          continue;
          ]);
          const latency = Date.now() - start;
          reportAPILatency("transformersjs_vision", latency, true);
          const objects = [
            ...detections.map(d => ({ label: d.label, confidence: d.score, bbox: [d.box.xmin, d.box.ymin, d.box.xmax - d.box.xmin, d.box.ymax - d.box.ymin] })),
            ...classifications.map(c => ({ label: c.label, confidence: c.score })),
          ];
          if (objects.length > 0) {
            return {
              description: `TJS: ${objects.map(o => `${o.label}(${(o.confidence * 100).toFixed(0)}%)`).join(", ")}`,
              objects,
              source: "transformers-js",
              latencyMs: latency,
            };
          }
        }
      }
    } catch (e) {
      const latency = Date.now() - start;
      reportAPILatency(api.id, latency, false);
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`⚠️ [Orchestrator] ${api.id} falhou (${latency}ms):`, e);
    }
  }

  // ─── Ultimate fallback: Transformers.js vision (free, browser) ───
  try {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      const start = Date.now();

      const [classifications, detections] = await Promise.all([
        classifyImage(dataUrl, "Xenova/vit-base-patch16-224", 3).catch(() => []),
        detectObjects(dataUrl, "Xenova/detr-resnet-50", 0.5).catch(() => []),
      ]);

      const latency = Date.now() - start;
      const objects = [
        ...detections.map(d => ({ label: d.label, confidence: d.score, bbox: [d.box.xmin, d.box.ymin, d.box.xmax - d.box.xmin, d.box.ymax - d.box.ymin] })),
        ...classifications.map(c => ({ label: c.label, confidence: c.score })),
      ];

      if (objects.length > 0) {
        return {
          description: `TJS: ${objects.map(o => `${o.label}(${(o.confidence * 100).toFixed(0)}%)`).join(", ")}`,
          objects,
          source: "transformers-js",
          latencyMs: latency,
        };
      }
    }
  } catch (e) {
    console.warn("⚠️ [Orchestrator] Transformers.js vision fallback failed:", e);
  }

  // Graceful degradation
  return {
    description: lastError ? `Visão indisponível: ${lastError.message}` : "Nenhum sensor de visão disponível",
    objects: [],
    source: "none",
    latencyMs: 0,
  };
}

// ─── Hearing: Web Speech API (free, browser-native) ───

export async function orchestratorListen(): Promise<ListenResult> {
  const apis = getAPIsForCapability("hearing");
  let lastError: Error | null = null;

  for (const api of apis) {
    if (api.health === "offline" || api.health === "error") continue;
    const start = Date.now();

    try {
      if (api.id === "web_speech_stt") {
        const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionClass) continue;

        const transcript = await new Promise<string>((resolve, reject) => {
          const recognition = new SpeechRecognitionClass();
          recognition.lang = "pt-BR";
          recognition.interimResults = false;
          recognition.maxAlternatives = 1;

          const timeout = setTimeout(() => {
            recognition.stop();
            reject(new Error("STT timeout (10s)"));
          }, 10000);

          recognition.onresult = (e: any) => {
            clearTimeout(timeout);
            resolve(e.results[0][0].transcript);
          };
          recognition.onerror = (e: any) => {
            clearTimeout(timeout);
            reject(new Error(e.error || "STT error"));
          };
          recognition.start();
        });

        const latency = Date.now() - start;
        reportAPILatency("web_speech_stt", latency, true);
        return { transcript, source: "web-speech", latencyMs: latency };
      }

      // Enhanced STT via browser-native API (free)
    } catch (e) {
      const latency = Date.now() - start;
      reportAPILatency(api.id, latency, false);
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`⚠️ [Orchestrator] ${api.id} STT falhou:`, e);
    }
  }

  // ─── Ultimate fallback: Whisper in browser (free, offline) ───
  try {
    const start = Date.now();
    const audioData = await recordMicrophoneAudio(5000);
    const result = await transcribeAudio(audioData, "Xenova/whisper-tiny", "pt");
    const latency = Date.now() - start;
    if (result.text.trim()) {
      return { transcript: result.text.trim(), source: "whisper-browser", latencyMs: latency };
    }
  } catch (e) {
    console.warn("⚠️ [Orchestrator] Whisper browser fallback failed:", e);
  }

  return { transcript: "", source: "none", latencyMs: 0 };
}

// ─── Face Recognition: face-api → BlazeFace → FaceDetector API → Heuristic ───

export async function orchestratorRecognizeFace(
  video: HTMLVideoElement
): Promise<FaceResult> {
  const apis = getAPIsForCapability("face_recognition");
  let lastError: Error | null = null;

  for (const api of apis) {
    if (api.health === "offline" || api.health === "error") continue;
    if (api.runtime === "edge_function") continue; // face_auth_edge is for login, not detection
    const start = Date.now();

    try {
      if (api.id === "face_api") {
        await loadFaceApiModels();
        const detection: FaceApiDetection | null = await detectSingleFaceFull(video);
        const latency = Date.now() - start;
        reportAPILatency("face_api", latency, true);

        if (detection) {
          return {
            detected: true,
            landmarks: detection.landmarks,
            expressions: detection.expressions,
            descriptor: detection.descriptor,
            source: "face-api",
            latencyMs: latency,
          };
        }
        // No face found, but API worked — try next for better sensitivity
      }

      if (api.id === "blazeface_tf") {
        const model = await getBlazeFaceModel();
        if (!model) continue;
        const predictions = await model.estimateFaces(video, false);
        const latency = Date.now() - start;
        reportAPILatency("blazeface_tf", latency, true);

        if (predictions.length > 0) {
          const pred = predictions[0];
          return {
            detected: true,
            landmarks: pred.landmarks?.map((l: number[]) => ({ x: l[0], y: l[1] })) || null,
            expressions: null,
            descriptor: null,
            source: "blazeface",
            latencyMs: latency,
          };
        }
      }

      if (api.id === "native_face_detector") {
        if (typeof (window as any).FaceDetector !== "function") continue;
        const detector = new (window as any).FaceDetector();
        const faces = await detector.detect(video);
        const latency = Date.now() - start;
        reportAPILatency("native_face_detector", latency, true);

        if (faces.length > 0) {
          return {
            detected: true,
            landmarks: faces[0].landmarks?.map((l: any) => ({ x: l.locations[0].x, y: l.locations[0].y })) || null,
            expressions: null,
            descriptor: null,
            source: "native-face-detector",
            latencyMs: latency,
          };
        }
      }

      // sobel_hog heuristic — always returns something
      if (api.id === "sobel_hog") {
        const latency = Date.now() - start;
        reportAPILatency("sobel_hog", latency, true);
        return {
          detected: false,
          landmarks: null,
          expressions: null,
          descriptor: null,
          source: "heuristic",
          latencyMs: latency,
        };
      }
    } catch (e) {
      const latency = Date.now() - start;
      reportAPILatency(api.id, latency, false);
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`⚠️ [Orchestrator] ${api.id} face falhou:`, e);
    }
  }

  return {
    detected: false,
    landmarks: null,
    expressions: null,
    descriptor: null,
    source: "none",
    latencyMs: 0,
  };
}
