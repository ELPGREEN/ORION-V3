import { invokeViaRender } from "./render-proxy";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized AI service to route all AI-related requests through the ai-orchestrator.
 * This ensures standardized logging, error handling, and simplified architecture.
 */
export async function callAI(action: string, payload: any = {}) {
  console.log(`[AIService] Calling action: ${action}`, payload);

  try {
    const { data, error } = await invokeViaRender("ai-orchestrator", {
      body: { action, ...payload }
    });

    if (error) {
      console.error(`[AIService] Error in ${action}:`, error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error(`[AIService] Fatal error calling ${action}:`, err);
    throw err;
  }
}

/**
 * Evolution actions helper
 */
export async function callEvolution(action: string, payload: any = {}) {
  // Map actions to ai-orchestrator's internal router
  return callAI("evolve", { subAction: action, ...payload });
}

/**
 * ARC actions helper
 */
export async function callARC(action: string, payload: any = {}) {
  // Map actions to ai-orchestrator's internal router
  return callAI("arc", { subAction: action, ...payload });
}
