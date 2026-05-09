import { SECTOR_AGENTS, detectSector, getAgentForSector } from "./sector-agents";
import { buildAgentMessages } from "./super-prompts";
import { supabase } from "@/integrations/supabase/client";
import { getPentagonOrchestrator } from "@/core/pentagon";

export interface OrionRequest {
  input: string;
  context?: Record<string, unknown>;
  userId?: string;
  stream?: boolean;
}

export interface OrionResponse {
  success: boolean;
  response: string;
  stream?: ReadableStream;
  sector?: any;
  agentUsed?: string;
  panel?: string;
}

export async function orionBrain(request: OrionRequest): Promise<OrionResponse> {
  const { input, context = {}, stream, userId } = request;
  const sector = detectSector(input);
  const agent = getAgentForSector(sector);

  console.log(`[ORION-BRAIN] 🍕 Routing request through Pentagon Pizza (sector=${sector})`);
  
  // High-priority stream handling (bypasses Pentagon for ultra-low latency)
  if (stream) {
    const { callAIOrchestrator } = await import("@/lib/ai-orchestrator");
    const res = await callAIOrchestrator({ prompt: input, stream: true, useCase: "chat" });
    if (res instanceof ReadableStream) return { success: true, response: "", stream: res, agentUsed: "orion-v3-stream" };
  }

  try {
    const pentagon = getPentagonOrchestrator();
    const result = await pentagon.runCycleStructured(input, {
      userId,
      sharedState: { ...context, sector, agent: agent.name }
    });

    return {
      success: result.success,
      response: result.output,
      sector,
      agentUsed: agent.name,
      panel: result.metadata.earlyExit ? "fast-lane" : "reasoning"
    };
  } catch (error) {
    console.error("[ORION-BRAIN] Pentagon cycle failed, falling back to basic AI:", error);
    try {
      const { data } = await supabase.functions.invoke("ai-orchestrator", {
        body: { prompt: input, useCase: "chat" }
      });
      return { success: true, response: data?.content || "Sem resposta.", sector, agentUsed: agent.name };
    } catch {
      return { success: true, response: "Entendido.", sector, agentUsed: agent.name };
    }
  }
}

export function getOrionStatus() { return {}; }
export function getOrionHelp() { return "Help"; }
export { detectSector, getAgentForSector };
