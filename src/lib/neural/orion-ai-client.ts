/**
 * ─── Orion AI Client (Maestro Edition v9 — Event-Driven Serverless Core) ───
 * Unifies Vision, Voice, Text, Cognition, Hardware, Finance, Actuation, and Fusion.
 * Built on AWS Serverless Agentic AI Architecture (2026).
 */

import { supabase } from "@/integrations/supabase/client";
import {
  getMemoryFacts,
  addMemoryFacts,
  initMemory
} from "./orion-memory";
import {
  getWorkingMemoryContext,
  getCognitiveLoad,
  pushToWorkingMemory,
  buildWorkingMemoryPrompt,
  initWorkingMemory
} from "./orion-working-memory";
import { buildCognitionContext, postCognitionLearn } from "./neural-cognition-engine";
import { executeCorrectiveRAG } from "./corrective-rag";
import { getAdaptiveNeurolinguisticHead, monitorMaestroPulse, dispatchMaestroEvolution } from "./orion-maestro-unification";
import { quantumRouteQuery, formatQuantumRoutingForAI } from "./quantum-llm-router";
import { summarizeLongContextMamba } from "./mamba-orchestrator";
import { getHardwareContext, getSwarmAlerts } from "./orion-hardware-intelligence";
import { getFinancialContext } from "./orion-financial-intelligence";
import { getToMStrategy, performMambaFusion, planResponseStrategy, validateActiveInference } from "./orion-deep-cognition";
import { executeMaestroActuation } from "./orion-actuators";
import { eventBus } from "./serverless-agent-runtime";
import { stripMarkdown } from "@/lib/utils/text-utils";

// ─── Constants & Patterns ───
const HEARING_CHECK_PATTERNS = /\b(ouvin|escut|me\s+ouve|teste\s+mic|t[aá]\s+me\s+ouvin|consegue\s+me\s+ouvir)\b/i;
const SELF_IDENTITY_PATTERNS = /\b(quem\s+(é|eh)\s+voc[eê]|seu\s+nome|quem\s+te\s+criou|qual\s+sua\s+fun[çc][aã]o|voc[eê]\s+faz\s+o\s+que)\b/i;
const WEB_SEARCH_PATTERNS = /\b(pesquis|busc|na\s+internet|firecrawl|google|site|url|link|naveg|chrome|edge|safari|firefox)\b/i;
const IMAGE_GEN_PATTERNS = /\b(gera|cria|desenha|faz\s+uma\s+imagem|opera|gerador\s+de\s+imagem)\b/i;

// ═══ GLOBAL AUTH CACHE ═══
let _globalAuthCache: { user: { id: string; email?: string | null } | null; ts: number } = { user: null, ts: 0 };
const AUTH_CACHE_TTL = 60_000;

async function getCachedAuthUser() {
  if (_globalAuthCache.user && Date.now() - _globalAuthCache.ts < AUTH_CACHE_TTL) return _globalAuthCache.user;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    _globalAuthCache = { user: user ? { id: user.id, email: user.email } : null, ts: Date.now() };
    return _globalAuthCache.user;
  } catch { return _globalAuthCache.user; }
}

// ═══ Memory Initialization ═══
if (typeof window !== "undefined") {
  initWorkingMemory();
}

/**
 * Unified Interaction Processor (The Maestro)
 * Orchestrates all neural systems via an Event-Driven Architecture (EDA).
 */
export async function processInteraction(params: {
  question: string; context?: string; chatHistory: Array<{ role: string; text: string }>;
  intent?: string; visionData?: any; gestureData?: any; identityStatus?: string;
  onToken?: (token: string) => void; onSentence?: (sentence: string) => void;
}): Promise<string> {
  const { question, context = "", chatHistory, intent, visionData, gestureData, identityStatus, onToken, onSentence } = params;
  const t0 = Date.now();

  const user = await getCachedAuthUser();
  const userId = user?.id || "anonymous";

  // Emit Event: user_input (EDA Trigger)
  await eventBus.emit({
    id: crypto.randomUUID(), type: "user_input", source: "maestro_client",
    detail: { question, userId }, timestamp: Date.now(), metadata: { intent }
  });

  const detectedIntent = intent || classifyIntent(question);

  // 1. Actuation Fast-Path
  const actuation = await executeMaestroActuation(question, userId, identityStatus);
  if (actuation.executed && actuation.toolResponse) {
    if (onToken) onToken(actuation.toolResponse);
    return actuation.toolResponse;
  }

  // 2. Intelligence Orchestration (Parallel Perception)
  const [routing, tomHead, hwContext, swarmContext, finContext, strategicPlan] = await Promise.all([
    quantumRouteQuery(question),
    getToMStrategy(question, userId),
    getHardwareContext(),
    getSwarmAlerts(),
    getFinancialContext(userId),
    planResponseStrategy(question)
  ]);

  const routingHead = formatQuantumRoutingForAI(routing);
  const fusionMarker = performMambaFusion(question, visionData, gestureData);

  // 3. Cognition & Corrective RAG (Inference Phase)
  const [cognition, pnlHead, crag] = await Promise.all([
    buildCognitionContext(question, chatHistory, detectedIntent),
    Promise.resolve(getAdaptiveNeurolinguisticHead(question, buildWorkingMemoryPrompt())),
    executeCorrectiveRAG({ query: question, context, userId, forceWebSearch: detectedIntent === "web_search" })
  ]);

  // 4. Mamba Context Compression
  const compressedContext = summarizeLongContextMamba(crag.finalContext);

  // 5. Maestro Neural Orchestra (Prompt Building)
  const enrichedContext = [
    routingHead, strategicPlan, tomHead, pnlHead, cognition.contextString,
    fusionMarker, hwContext, swarmContext, finContext, compressedContext,
    buildWorkingMemoryPrompt(), getMemoryFacts().slice(0, 10).join("\n")
  ].filter(Boolean).join("\n\n");

  // 6. Invoke Inference
  let responseText = "";
  try {
    const { data, error } = await supabase.functions.invoke("neural-ops", {
      body: {
        question, context: enrichedContext, chatHistory: chatHistory.slice(-5),
        intentType: detectedIntent, userName: user?.email || "Usuário",
        userId, provider: routing.selectedProvider.id
      }
    });

    if (error) throw error;
    responseText = data.content || "";

    const aiWarning = validateActiveInference(question, responseText);
    if (aiWarning) console.warn(aiWarning);

    if (onToken) onToken(responseText);
    if (onSentence) onSentence(stripMarkdown(responseText));

    // Emit Event: model_inference_result
    await eventBus.emit({
      id: crypto.randomUUID(), type: "model_inference_result", source: "neural_ops",
      detail: { response: responseText, latency: Date.now() - t0 },
      timestamp: Date.now(), metadata: { intent: detectedIntent }
    });

  } catch (err) {
    console.error("[Maestro] Interaction error:", err);
    responseText = "Desculpe, tive um problema ao orquestrar seu raciocínio neural.";
  }

  // 7. Post-Inference Loop (Evolution & Learning)
  (async () => {
    const signal = await monitorMaestroPulse();
    if (signal) await dispatchMaestroEvolution(signal);
  })().catch(console.error);

  const latency = Date.now() - t0;
  postCognitionLearn(question, responseText, latency, detectedIntent).catch(console.error);
  pushToWorkingMemory(question, "user_intent", 0.9);
  pushToWorkingMemory(responseText, "ai_response", 0.7);

  return responseText;
}

export function classifyIntent(question: string): string {
  const q = question.toLowerCase().trim();
  if (IMAGE_GEN_PATTERNS.test(q)) return "image_generation";
  if (WEB_SEARCH_PATTERNS.test(q)) return "web_search";
  if (HEARING_CHECK_PATTERNS.test(q) || SELF_IDENTITY_PATTERNS.test(q)) return "textual";
  if (/\b(veja|olha|mostra|o que|como|quem)\b/i.test(q) && /\b(est[oô]u|aqui|isso|aquilo|na\s+frente)\b/i.test(q)) return "visual";
  return "textual";
}

export function getUserMemory(): string[] { return getMemoryFacts(); }
export function addUserMemory(facts: string[]) { addMemoryFacts(facts, "fact", "chat"); }

export { buildWorkingMemoryPrompt, pushToWorkingMemory, getWorkingMemoryContext } from "./orion-working-memory";
