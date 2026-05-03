/**
 * Frame Analysis Client — Orion Vision + Pentagon Integration
 */
import { supabase } from "@/integrations/supabase/client";
import { wrapEdgeFunction } from "@/lib/errors";
import {
  buildCognitionContext,
  postCognitionLearn,
  fetchDashboardContext
} from "../neural-cognition-engine";
import { executeCorrectiveRAG } from "../corrective-rag";
import { getAdaptiveNeurolinguisticHead } from "../orion-maestro-unification";
import { quantumRouteQuery, formatQuantumRoutingForAI } from "../quantum-llm-router";
import { summarizeLongContextMamba } from "../mamba-orchestrator";
import { buildWorkingMemoryPrompt, pushToWorkingMemory } from "../orion-working-memory";
import { getMemoryFacts, addUserMemory } from "../orion-memory";
import { stripMarkdown } from "@/lib/utils/text-utils";
import { classifyIntent } from "./intent-router";
import { getUserMemory, getCachedAuthUser } from "./user-memory";
import { isLocalFirstMode, isLocalEngineAvailable, generateLocalResponse } from "./local-mode";
import { learnFromDetection, getLearningStats } from "../tfm-vision-models";
import { getVS } from "../vision-state";
import { getCachedVoiceIdentity } from "./voice-identity";
import { orchestrate } from "../orchestrator/orion-v3-orchestrator";

// ─── Types ───

export interface AIAnalysisResult {
  description: string | null;
  learnedFacts: string[];
  identifiedObjects: any[];
}

/**
 * 🍕 PENTAGON Unified Consciousness Pre-pass
 * Executa o ciclo completo de percepção -> memória -> raciocínio.
 */
async function buildPentagonPromptContext(question: string, context: string, userId: string): Promise<string> {
  try {
    const v3Result = await orchestrate({
      command: question,
      source: "system",
      userId,
      conversationContext: context
    });

    if (v3Result.summary) {
      return `═══ RASCUNHO DO LOBO FRONTAL (Pentagon) ═══\n${v3Result.summary}\n`;
    }
  } catch (err) {
    console.warn("[Pentagon] Pre-pass failed:", err);
  }
  return "";
}

// ─── Local Detections Helper ───
function buildLocalDetections(): string {
  const vs = getVS();
  if (!vs || !vs.detectedObjects || vs.detectedObjects.length === 0) return "";
  return vs.detectedObjects.map(obj => `- ${obj.label} (${Math.round(obj.confidence)}%)`).join("\n");
}

/**
 * analyzeFrameWithAI - Main entry point for non-streaming vision
 */
export async function analyzeFrameWithAI(
  canvas: HTMLCanvasElement | null,
  question: string,
  chatHistory: Array<{ role: string; text: string }>,
  includeImage: boolean,
  identificationMode: string,
  intentType: string = "auto"
): Promise<AIAnalysisResult> {
  try {
    const user = await getCachedAuthUser();
    const userId = user?.id || "anonymous";

    let imageBase64: string | undefined;
    if (includeImage && canvas) {
      const cw = canvas.width || 0;
      const ch = canvas.height || 0;
      if (cw > 0 && ch > 0) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = Math.min(cw, 640);
        tempCanvas.height = Math.min(ch, 480);
        const tCtx = tempCanvas.getContext("2d");
        if (tCtx) {
          tCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
          imageBase64 = tempCanvas.toDataURL("image/jpeg", 0.7).split(",")[1];
        }
      }
    }

    const conversationContext = (chatHistory?.slice(-4).map(msg => `${msg.role}: ${msg.text}`) || []).join("\n");

    // ═══ Pentagon Pizza — unified consciousness pre-pass ═══
    const pentagonContext = await buildPentagonPromptContext(question, conversationContext, userId);

    const localDetections = buildLocalDetections();
    const routing = quantumRouteQuery(question);

    let data;
    try {
      data = await wrapEdgeFunction(
        supabase.functions.invoke("neural-ops", {
          body: {
            question,
            context: [pentagonContext, conversationContext, localDetections].filter(Boolean).join("\n\n"),
            chatHistory: chatHistory.slice(-5),
            intentType,
            userName: user?.email || "Usuário",
            userId,
            provider: routing.selectedProvider.id,
            imageBase64,
            identityStatus: getCachedVoiceIdentity() || undefined,
          },
        }),
        "neural-ops",
        { intentType }
      );
    } catch (err: any) {
      console.warn("[OrionAI] Vision analysis invoke error:", err?.message);
      return { description: null, learnedFacts: [], identifiedObjects: [] };
    }

    if (!data) return { description: null, learnedFacts: [], identifiedObjects: [] };

    if (data?.learnedFacts?.length > 0) addUserMemory(data.learnedFacts);
    if (data?.description) {
      pushToWorkingMemory(data.description, "ai_response", 0.78, { source: includeImage ? "vision" : "chat", intentType });
    }

    return { description: data?.description || null, learnedFacts: data?.learnedFacts || [], identifiedObjects: data?.identifiedObjects || [] };
  } catch (err: any) {
    console.warn("[OrionAI] analyzeFrameWithAI error:", err?.message);
    return { description: null, learnedFacts: [], identifiedObjects: [] };
  }
}

// ═══ Streaming Analysis ───
export async function analyzeFrameStreaming(
  canvas: HTMLCanvasElement | null,
  question: string,
  chatHistory: Array<{ role: string; text: string }>,
  includeImage: boolean,
  identificationMode: string,
  intentType: any,
  onToken: (accumulated: string) => void,
  onSentence: (sentence: string) => void,
  signal?: AbortSignal,
): Promise<AIAnalysisResult> {
  // Simplificação: Roda o mesmo pipeline com pre-pass Pentagon
  const user = await getCachedAuthUser();
  const userId = user?.id || "anonymous";
  const conversationContext = (chatHistory?.slice(-4).map(msg => `${msg.role}: ${msg.text}`) || []).join("\n");

  const pentagonContext = await buildPentagonPromptContext(question, conversationContext, userId);

  // Execução via neural-ops (edge function)
  try {
    const { data } = await supabase.functions.invoke("neural-ops", {
      body: {
        question,
        context: [pentagonContext, conversationContext].filter(Boolean).join("\n\n"),
        chatHistory: chatHistory.slice(-3),
        intentType,
        userId
      }
    });

    if (data?.content) {
      onToken(data.content);
      onSentence(stripMarkdown(data.content));
      return { description: data.content, learnedFacts: [], identifiedObjects: [] };
    }
  } catch {}

  return { description: null, learnedFacts: [], identifiedObjects: [] };
}

export function shouldUseVoiceFastShortcut(question: string): boolean {
  return question.length < 15;
}
