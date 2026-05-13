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
  metadata?: any;
}

export async function orionBrain(request: OrionRequest): Promise<OrionResponse> {
  const { input, context = {}, stream } = request;
  
  if (stream) {
    const { callAIOrchestrator } = await import("@/lib/ai-orchestrator");
    const res = await callAIOrchestrator({ prompt: input, stream: true, useCase: "chat" });
    if (res instanceof ReadableStream) return { success: true, response: "", stream: res, agentUsed: "orion-v3-stream" };
  }

  // BOLT V2.0: Enforce Cognitive Governance via Pentagon Orchestrator
  // This prevents "Intelligence Leakage" by ensuring all cognitive layers are applied.
  const orchestrator = getPentagonOrchestrator();
  const sector = detectSector(input);
  
  try {
    const result = await orchestrator.runCycleStructured(input, {
      userId: request.userId,
      sharedState: context,
    });

    return {
      success: result.success,
      response: result.output || "Sem resposta.",
      sector,
      agentUsed: "pentagon-orchestrator",
      metadata: result.metadata
    };
  } catch (err) {
    console.warn("[OrionBrain] Pentagon Cycle failed, falling back to legacy:", err);
    const agent = getAgentForSector(sector);
    try {
      const { data } = await supabase.functions.invoke("ai-orchestrator", {
        body: { prompt: input, useCase: "chat" }
      });
      return { success: true, response: data?.content || "Entendido.", sector, agentUsed: agent.name };
    } catch {
      return { success: true, response: "Entendido.", sector, agentUsed: agent.name };
    }
  }
}

export function getOrionStatus() { return {}; }
export function getOrionHelp() { return "Help"; }
export { detectSector, getAgentForSector };
