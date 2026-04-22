import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Centralized AI service to route all AI-related requests through the ai-orchestrator.
 * This ensures standardized logging, error handling, and simplified architecture.
 */
export async function callAI(action: string, payload: any = {}) {
  console.log(`[AIService] Calling action: ${action}`, payload);

  try {
    const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
      body: { action, ...payload }
    });

    if (error) {
      return await handleSelfHealing(error, action, payload);
    }

    return data;
  } catch (err: any) {
    return await handleSelfHealing(err, action, payload);
  }
}

/**
 * Intercepts errors and attempts remediation or provides clear feedback
 */
async function handleSelfHealing(error: any, action: string, payload: any) {
  const msg = error?.message || String(error);
  console.error(`[AIService] Error in ${action}:`, msg);

  if (msg.includes("404")) {
    console.warn("[SelfHealing] Function 404 - Logic should already be in Orchestrator.");
    // Fallback logic could go here
  }

  if (msg.includes("401")) {
    toast.error("IA Desconectada", {
      description: "Chave de API (Gemini/OpenRouter) ausente ou inválida no servidor.",
    });
  }

  if (msg.includes("429")) {
     toast.warning("IA Sobrecarregada", {
       description: "Muitas requisições. O sistema está aguardando liberação do provedor.",
     });
  }

  throw error;
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
