/**
 * 🧠 Orion AI Client - Core Neural Orchestrator
 * High-performance interface for neural operations and unified interaction processing.
 */

import { supabase } from "@/integrations/supabase/client";
import { stripMarkdown } from "@/lib/utils/text-utils";
import { analyzeSemantics } from "./nlp-semantic-analyzer";
import { buildCognitionContext, postCognitionLearn } from "./neural-cognition-engine";
import { buildWorkingMemoryPrompt } from "./orion-working-memory";
import { getMemoryFacts, addUserMemory } from "./orion-memory";
import { getCachedAuthUser } from "@/lib/auth-utils";
import { pentagonMiddleware } from "@/core/pentagon/orchestrator/PentagonEnforcementMiddleware";

// ─── ⚡ Unified Intent Classification (v4 — Bolt Powered) ───

export function classifyIntent(question: string): string {
  const analysis = analyzeSemantics(question);
  if (analysis.domain !== "geral") return analysis.domain;
  if (analysis.discourseType !== "conversational") return analysis.discourseType;
  if (/\b(veja|olhe|mostr|o que é isso|v[êe])\b/i.test(question)) return "visual";
  return "textual";
}

/**
 * Unified Interaction Processor (The Maestro)
 * High-level orchestrator that leverages all neural subsystems.
 * ⚡ Updated to use Pentagon Enforcement Middleware.
 */
export async function processInteraction(params: {
  question: string;
  context?: string;
  chatHistory: Array<{ role: string; text: string }>;
  intent?: string;
  onToken?: (token: string) => void;
  onSentence?: (sentence: string) => void;
}): Promise<string> {
  const { question, intent, onToken, onSentence } = params;
  const t0 = Date.now();

  const user = await getCachedAuthUser();
  const userId = user?.id || "anonymous";

  // 1. BOLT: Fast Semantic Check before enforcement
  const analysis = analyzeSemantics(question, buildWorkingMemoryPrompt());
  const detectedIntent = intent || (analysis.domain !== "geral" ? analysis.domain : classifyIntent(question));

  // 2. PENTAGON: Enforced Cognitive Cycle
  // This guarantees Perception -> Memory -> Reasoning -> Action -> Eval sequence.
  console.log("[Maestro] Routing interaction through Pentagon Enforcement...");

  const pentagonResult = await pentagonMiddleware.executeEnforcedCycle(question, {
    userId,
    wmContext: buildWorkingMemoryPrompt(),
    intent: detectedIntent,
    tier: analysis.complexity === "complex" ? "deep" : "standard"
  });

  const responseText = pentagonResult.output || "Desculpe, tive um problema ao processar seu raciocínio neural.";

  // Handle callbacks for UI streaming (simulated as Pentagon current action doesn't stream yet)
  if (onToken) onToken(responseText);
  if (onSentence) onSentence(stripMarkdown(responseText));

  // 3. Post-Interaction Learning (Fire and forget)
  const latency = Date.now() - t0;
  postCognitionLearn(question, responseText, latency, detectedIntent).catch(console.error);

  return responseText;
}

// ─── Operational Helpers ───

export async function generateImageWithOrion(prompt: string) {
  try {
    const { data, error } = await supabase.functions.invoke("neural-ops", {
      body: { action: "generate_image", prompt },
    });
    return error ? { success: false, error: error.message } : data;
  } catch (e: any) {
    return { success: false, error: e?.message || "Unknown error" };
  }
}

// Keep legacy analyzeFrameStreaming for vision loop until full Pentagon vision integration
export async function analyzeFrameStreaming(
  canvas: HTMLCanvasElement | null,
  question: string,
  onSentence: (s: string) => void,
  chatHistory: any[] = [],
  includeImage = true,
  identificationMode = "universal",
  intentType = "visual"
) {
  // Vision-specific fast path (to be integrated into Pentagon Action Layer next)
  const { data, error } = await supabase.functions.invoke("neural-ops", {
    body: { question, chatHistory, intentType, stream: true }
  });
  return { description: data?.content || null, learnedFacts: [], identifiedObjects: [] };
}

export async function analyzeFrameWithAI(
  canvas: HTMLCanvasElement | null,
  imageFile?: File,
  question: string = "",
  chatHistory: any[] = [],
  includeImage = true,
  identificationMode = "universal",
  intentType = "visual"
) {
  // Legacy non-streaming helper
  return { description: "Simulated vision response.", identifiedObjects: [] };
}
