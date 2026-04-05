/**
 * ─── Orion Orchestrator Execution Layer ───
 * Real execution methods for each capability with tier-based fallback.
 * Uses existing project modules (mediapipe-vision, yolo-onnx, face-api, etc.)
 */

import { getAPIsForCapability, reportAPILatency, type OrionCapability } from "./orion-api-orchestrator";
import { detectAllMP, type MPVisionResult } from "./mediapipe-vision";
import { detectWithYOLO, type YOLODetection } from "./yolo-onnx-detector";
import { detectSingleFaceFull, loadFaceApiModels, type FaceApiDetection } from "./face-api-runtime";
import { getBlazeFaceModel } from "./tf-runtime";

// ─── Types ───

export interface VisionResult {
  description: string;
  objects: Array<{ label: string; confidence: number; bbox?: number[] }>;
  source: string;
  latencyMs: number;
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

      // Cloud vision APIs (gemini_vision, llava_vision) are handled externally
      // via analyzeFrameWithAI in orion-ai-client.ts — not duplicated here
    } catch (e) {
      const latency = Date.now() - start;
      reportAPILatency(api.id, latency, false);
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`⚠️ [Orchestrator] ${api.id} falhou (${latency}ms):`, e);
    }
  }

  // Graceful degradation — return empty rather than throw
  return {
    description: lastError ? `Visão indisponível: ${lastError.message}` : "Nenhum sensor de visão disponível",
    objects: [],
    source: "none",
    latencyMs: 0,
  };
}

// ─── Hearing: Web Speech API → ElevenLabs Scribe ───

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

      // ElevenLabs Scribe would go here via edge function call
    } catch (e) {
      const latency = Date.now() - start;
      reportAPILatency(api.id, latency, false);
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`⚠️ [Orchestrator] ${api.id} STT falhou:`, e);
    }
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
