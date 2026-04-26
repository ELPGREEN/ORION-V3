import { supabase } from "@/integrations/supabase/client";
import { decideHybridRoute, callLocalInference } from "./smart-hybrid-router";

/**
 * Centralized AI service to route all AI-related requests through the ai-orchestrator
 * with smart hybrid routing (Local vs Cloud).
 */
export async function callAI(action: string, payload: any = {}) {
  console.log(`[AIService] Processing action: ${action}`, payload);

  // 1. Hybrid Routing Decision (only for chat/inference actions)
  if (action === "chat" || action === "complete" || action === "generate") {
    const routingTask = {
      prompt: payload.prompt || payload.query || (payload.messages?.[payload.messages.length - 1]?.content) || "",
      isSensitive: payload.isSensitive,
      priority: payload.priority
    };

    const route = await decideHybridRoute(routingTask);
    console.log(`[HybridRouter] Target: ${route.target} | ${route.rationale}`);

    if (route.target === "local") {
      try {
        const localResponse = await callLocalInference(routingTask.prompt);
        return {
          content: localResponse,
          provider: "local_ollama",
          routed_to: "local",
          rationale: route.rationale
        };
      } catch (e) {
        console.warn("[AIService] Local inference failed, falling back to Cloud Orchestrator.");
      }
    }
  }

  // 2. Default Cloud Orchestrator Flow
  try {
    const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
      body: { action, ...payload }
    });

    if (error) {
      console.error(`[AIService] Error in ${action}:`, error);
      throw error;
    }

    return { ...data, routed_to: "cloud" };
  } catch (err) {
    console.error(`[AIService] Fatal error calling ${action}:`, err);
    throw err;
  }
}

/**
 * Evolution actions helper
 */
export async function callEvolution(action: string, payload: any = {}) {
  return callAI("evolve", { subAction: action, ...payload });
}

/**
 * ARC actions helper
 */
export async function callARC(action: string, payload: any = {}) {
  return callAI("arc", { subAction: action, ...payload });
}
