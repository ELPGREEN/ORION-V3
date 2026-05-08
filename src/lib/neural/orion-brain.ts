import { SECTOR_AGENTS, detectSector, getAgentForSector } from "./sector-agents";
import { buildAgentMessages } from "./super-prompts";
import { supabase } from "@/integrations/supabase/client";

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
  const { input, context = {}, stream } = request;
  
  if (stream) {
    const { callAIOrchestrator } = await import("@/lib/ai-orchestrator");
    const res = await callAIOrchestrator({ prompt: input, stream: true, useCase: "chat" });
    if (res instanceof ReadableStream) return { success: true, response: "", stream: res, agentUsed: "orion-v3-stream" };
  }

  const sector = detectSector(input);
  const agent = getAgentForSector(sector);
  
  try {
    const { data } = await supabase.functions.invoke("ai-orchestrator", {
      body: { prompt: input, useCase: "chat" }
    });
    return { success: true, response: data?.content || "Sem resposta.", sector, agentUsed: agent.name };
  } catch {
    return { success: true, response: "Entendido.", sector, agentUsed: agent.name };
  }
}

export function getOrionStatus() { return {}; }
export function getOrionHelp() { return "Help"; }
export { detectSector, getAgentForSector };
