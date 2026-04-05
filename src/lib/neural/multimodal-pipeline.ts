/**
 * ─── Multimodal Pipeline v2 ───
 * Parallel execution of vision + face + hearing sensors via Promise.all.
 * Now integrates the Agentic Vision Agent (Perceive→Reason→Act→Learn cycle)
 * for autonomous goal-driven behavior on each frame.
 * 
 * Architecture: AWS Agentic AI Foundations + E-R-C-A Framework
 */

import {
  orchestratorSee,
  orchestratorRecognizeFace,
  type VisionResult,
  type FaceResult,
} from "./orion-orchestrator-exec";
import { formatOrchestratorForAI } from "./orion-api-orchestrator";
import {
  runAgenticVisionCycle,
  getAgentState,
  formatAgentContextForPrompt,
  type AgenticVisionCycleResult,
} from "./agentic-vision-agent";

// ─── Types ───

export interface MultimodalInput {
  text?: string;
  image?: HTMLVideoElement;       // live video frame for vision
  videoFrame?: HTMLVideoElement;  // for face recognition (can be same element)
  /** Optional: inject real-time vision result from detectRealTime() for agent processing */
  realTimeVision?: import("./realtime-vision-engine").RealTimeVisionResult;
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
    agent: boolean;
  };
  orchestratorStatus: string;
  agentContext: string;
  totalLatencyMs: number;
}

export interface MultimodalResult {
  vision: VisionResult | null;
  face: FaceResult | null;
  agentCycle: AgenticVisionCycleResult | null;
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

  // Run Agentic Vision Cycle if real-time vision data is available
  let agentCycle: AgenticVisionCycleResult | null = null;
  if (input.realTimeVision) {
    try {
      agentCycle = runAgenticVisionCycle(input.realTimeVision);
    } catch (e) {
      console.warn("[MultimodalPipeline] Agent cycle failed:", e);
    }
  }

  const totalLatencyMs = Date.now() - start;
  const agentState = getAgentState();

  const context: MultimodalContext = {
    userInput: input.text || "",
    visualDescription: visionResult?.description || "",
    objectsDetected: visionResult?.objects || [],
    faceDetected: faceResult?.detected || false,
    faceExpressions: faceResult?.expressions || null,
    sensorsActive: {
      vision: !!visionResult && visionResult.source !== "none",
      face: !!faceResult && faceResult.detected,
      agent: agentState.isActive || agentState.cycleCount > 0,
    },
    orchestratorStatus: formatOrchestratorForAI(),
    agentContext: formatAgentContextForPrompt(),
    totalLatencyMs,
  };

  console.log(
    `✅ [MultimodalPipeline] ${totalLatencyMs}ms | vision=${context.sensorsActive.vision} face=${context.sensorsActive.face} agent=${context.sensorsActive.agent} objects=${context.objectsDetected.length}`
  );

  return { vision: visionResult, face: faceResult, agentCycle, context, totalLatencyMs };
}
