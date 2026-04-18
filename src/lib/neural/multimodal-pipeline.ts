/**
 * ─── Multimodal Pipeline v3 ───
 * Parallel execution of vision + face sensors via Promise.all.
 *
 * NOTE (Fase 3 audit): the previous "Agentic Vision Cycle" branch was removed —
 * its underlying agent module was deleted long ago and the wrappers were stubs
 * (`runAgenticVisionCycle`, `getAgentState`, `formatAgentContextForPrompt`)
 * that always returned empty results. They added prompt noise and CPU waste
 * with zero observable behavior.
 *
 * This module currently has no in-tree callers; it is kept as a thin façade
 * over `orchestratorSee` + `orchestratorRecognizeFace` for future reuse.
 */

import {
  orchestratorSee,
  orchestratorRecognizeFace,
  type VisionResult,
  type FaceResult,
} from "./orion-orchestrator-exec";
import { formatOrchestratorForAI } from "./orion-api-orchestrator";

// ─── Types ───

export interface MultimodalInput {
  text?: string;
  image?: HTMLVideoElement;       // live video frame for vision
  videoFrame?: HTMLVideoElement;  // for face recognition (can be same element)
}

export interface MultimodalContext {
  userInput: string;
  visualDescription: string;
  objectsDetected: Array<{ label: string; confidence: number; bbox?: number[] }>;
  faceDetected: boolean;
  faceExpressions: Record<string, number> | null;
  sensorsActive: {
    vision: boolean;
    face: boolean;
  };
  orchestratorStatus: string;
  totalLatencyMs: number;
}

export interface MultimodalResult {
  vision: VisionResult | null;
  face: FaceResult | null;
  context: MultimodalContext;
  totalLatencyMs: number;
}

// ─── Main Pipeline ───

export async function runFullMultimodalPipeline(
  input: MultimodalInput
): Promise<MultimodalResult> {
  const start = Date.now();

  // Parallel sensor execution (Perceive phase — multi-modal)
  const [visionResult, faceResult] = await Promise.all([
    input.image ? orchestratorSee(input.image).catch((e) => {
      console.warn("[MultimodalPipeline] Vision failed:", e);
      return null;
    }) : Promise.resolve(null),
    input.videoFrame ? orchestratorRecognizeFace(input.videoFrame).catch((e) => {
      console.warn("[MultimodalPipeline] Face failed:", e);
      return null;
    }) : Promise.resolve(null),
  ]);

  const totalLatencyMs = Date.now() - start;

  const context: MultimodalContext = {
    userInput: input.text || "",
    visualDescription: visionResult?.description || "",
    objectsDetected: visionResult?.objects || [],
    faceDetected: faceResult?.detected || false,
    faceExpressions: faceResult?.expressions || null,
    sensorsActive: {
      vision: !!visionResult && visionResult.source !== "none",
      face: !!faceResult && faceResult.detected,
    },
    orchestratorStatus: formatOrchestratorForAI(),
    totalLatencyMs,
  };

  console.log(
    `✅ [MultimodalPipeline] ${totalLatencyMs}ms | vision=${context.sensorsActive.vision} face=${context.sensorsActive.face} objects=${context.objectsDetected.length}`
  );

  return { vision: visionResult, face: faceResult, context, totalLatencyMs };
}
