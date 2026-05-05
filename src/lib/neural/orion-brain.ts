/**
 * ─── ORION Brain Core v10.0 ───
 * Cérebro Central Indestrutível do Sistema ORION V3
 * Integra todos os subsistemas: Visão, Voz, RAG, Pentagon e V3 Orchestrator.
 *
 * BOLT V2.0: Zero Waste Mode - Unified orchestration and minimized entropy.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  Sector,
  SectorAgent,
  ORION_BRAIN,
  SECTOR_AGENTS,
  ORQUESTRADOR,
  detectSector,
  getAgentForSector,
  getAllAgents
} from "./sector-agents";
import { orchestrate } from "./orchestrator/orion-v3-orchestrator";
import { matchAndExecuteTool } from "./orion-tool-executor";

export interface OrionResponse {
  success: boolean;
  response: string;
  sector?: Sector;
  agentUsed?: string;
  confidence?: number;
  panel?: string;
}

export interface OrionRequest {
  input: string;
  context?: Record<string, unknown>;
}

/**
 * Processar qualquer entrada do usuário (texto ou voz)
 */
export async function processOrionRequest(
  params: string | OrionRequest,
  contextOptions: Record<string, unknown> = {}
): Promise<OrionResponse> {
  try {
    const input = typeof params === "string" ? params : params.input;
    const context = typeof params === "string" ? contextOptions : { ...contextOptions, ...params.context };

    if (!input || input.length < 2) {
      return { success: true, response: "Estou ouvindo. Como posso ajudar?" };
    }

    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id || "anonymous";

    // 1. Try Tool Execution first (Fast Lane for explicit commands)
    const toolResult = await matchAndExecuteTool(input);
    if (toolResult.handled) {
      const sector = detectSector(input);
      return {
        success: true,
        response: toolResult.response,
        sector,
        agentUsed: toolResult.toolName,
        confidence: 1.0,
        panel: toolResult.response.includes("__NAV__") ? toolResult.response.split("__NAV__")[1].split(" ")[0] : undefined
      };
    }

    // 2. 🍕 PENTAGON PIZZA — Unified consciousness orchestration.
    const v3Result = await orchestrate({
      command: input,
      source: context.source as any || "text",
      userId,
      conversationContext: context.conversationContext as string || ""
    });

    const sector = detectSector(input);

    if (v3Result && v3Result.summary) {
      return {
        success: true,
        response: v3Result.summary,
        sector,
        agentUsed: `orion-v3:${v3Result.decision.primary}`,
        confidence: v3Result.decision.confidence,
      };
    }

    return {
      success: true,
      response: "Entendido. Como posso prosseguir?",
      sector,
    };

  } catch (error) {
    console.error("[ORION Brain] Critical Error:", error);
    return {
      success: false,
      response: "Desculpe, houve um erro ao processar sua solicitação no meu núcleo neural.",
    };
  }
}

/** Alias for backward compatibility and useOrionChat */
export const orionBrain = processOrionRequest;

/**
 * Returns a detailed help message about Orion's capabilities.
 */
export async function getOrionHelp(): Promise<string> {
  const { matchAndExecuteTool } = await import("./orion-tool-executor");
  const result = await matchAndExecuteTool("help");
  return result.response;
}

export function getOrionStatus() {
  return {
    name: ORION_BRAIN.name,
    version: ORION_BRAIN.version,
    uptime: Date.now(),
    sectorsActive: ORION_BRAIN.sectors.length,
    agentsAvailable: getAllAgents().length,
  };
}

export { ORION_BRAIN, SECTOR_AGENTS, ORQUESTRADOR };
export { detectSector, getAgentForSector, getAllAgents, getAgentForSector as getAgent };
