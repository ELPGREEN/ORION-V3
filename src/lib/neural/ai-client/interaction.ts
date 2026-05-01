/**
 * Interaction Processor (The Maestro)
 * High-level orchestrator that leverages all neural subsystems.
 * Extracted from orion-ai-client.ts (lines 1204-1309)
 */
import { supabase } from "@/integrations/supabase/client";
import { wrapEdgeFunction } from "@/lib/errors";
import { buildCognitionContext, postCognitionLearn } from "./neural-cognition-engine";
import { executeCorrectiveRAG } from "./corrective-rag";
import { getAdaptiveNeurolinguisticHead, monitorMaestroPulse, dispatchMaestroEvolution } from "./orion-maestro-unification";
import { quantumRouteQuery, formatQuantumRoutingForAI } from "./quantum-llm-router";
import { summarizeLongContextMamba } from "./mamba-orchestrator";
import { buildWorkingMemoryPrompt, pushToWorkingMemory, getMemoryFacts } from "./orion-working-memory";
import { stripMarkdown } from "@/lib/utils/text-utils";
import { classifyIntent } from "./ai-client/intent-router";
import { buildPentagonPromptContext } from "./ai-client/frame-analysis";
import { getUserMemory, getCachedAuthUser } from "./ai-client/user-memory";

export async function processInteraction(params: {
  question: string;
  context?: string;
  chatHistory: Array<{ role: string; text: string }>;
  intent?: string;
  onToken?: (token: string) => void;
  onSentence?: (sentence: string) => void;
}): Promise<string> {
  const { question, context = "", chatHistory, intent, onToken, onSentence } = params;
  const t0 = Date.now();
  pushToWorkingMemory(question, "user_intent", 0.94, { source: "processInteraction", intent: intent || "auto" });

  const user = await getCachedAuthUser();
  const userId = user?.id || "anonymous";

  const detectedIntent = intent || classifyIntent(question);

  // 🍕 PENTAGON PIZZA — Unified consciousness pre-pass.
  // Mandatório e síncrono.
  const pentagonContext = await buildPentagonPromptContext(
    question,
    [context, ...(chatHistory?.slice(-4).map((msg) => `${msg.role}: ${msg.text}`) || [])].filter(Boolean).join("\n"),
    detectedIntent
  );

  // 1. Quantum LLM Routing & Maestro Monitoring
  const routing = quantumRouteQuery(question);
  const routingHead = formatQuantumRoutingForAI(routing);

  // 2. Build Cognition & Adaptive PNL Head
  const [cognition, pnlHead] = await Promise.all([
    buildCognitionContext(question, chatHistory, detectedIntent),
    Promise.resolve(getAdaptiveNeurolinguisticHead(question, buildWorkingMemoryPrompt())),
  ]);

  // 3. Execute Hybrid Corrective RAG
  const crag = await executeCorrectiveRAG({
    query: question,
    context,
    userId,
    forceWebSearch: detectedIntent === "web_search"
  });

  // 4. Mamba Long-Context Compression
  const compressedContext = summarizeLongContextMamba(crag.finalContext);

  // 5. Build Final Prompt — Pentagon outputs FIRST (highest priority)
  const wmPrompt = buildWorkingMemoryPrompt();
  const enrichedContext = [
    pentagonContext,     // 🍕 Unified pentagon context (Governance + Hint + RAG + Trail)
    routingHead,
    pnlHead,
    cognition.contextString,
    compressedContext,
    wmPrompt,
    getUserMemory().slice(0, 15).join("\n")
  ].filter(Boolean).join("\n\n");

  // 6. Invoke LLM (Neural Ops)
  let responseText = "";
  try {
    const data = await wrapEdgeFunction(
      supabase.functions.invoke("neural-ops", {
        body: {
          question,
          context: enrichedContext,
          chatHistory: chatHistory.slice(-5),
          intentType: detectedIntent,
          userName: user?.email || "Usuário",
          userId,
          provider: routing.selectedProvider.id
        }
      }),
      "neural-ops",
      { detectedIntent }
    );

    responseText = data?.content || "";

    if (onToken) onToken(responseText);
    if (onSentence) onSentence(stripMarkdown(responseText));

  } catch (err) {
    console.error("[Maestro] Interaction error:", err);
    responseText = "Desculpe, tive um problema ao processar seu raciocínio neural.";
  }

  // 7. Maestro Heartbeat: Monitor and Evolution
  (async () => {
    const signal = await monitorMaestroPulse();
    if (signal) await dispatchMaestroEvolution(signal);
  })().catch(console.error);

  // 8. Post-Interaction Learning
  const latency = Date.now() - t0;
  if (responseText?.trim()) {
    pushToWorkingMemory(responseText, "ai_response", 0.8, { source: "processInteraction", intent: detectedIntent, latency });
  }
  postCognitionLearn(question, responseText, latency, detectedIntent).catch(console.error);

  return responseText;
}
