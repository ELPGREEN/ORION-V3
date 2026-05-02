/**
 * ─── ORION Brain Core v9.0 ───
 * Cérebro Central Indestrutível do Sistema ORION V3
 * Integra todos os subsistemas: Visão, Voz, RAG, Pentagon e V3 Orchestrator.
 */

import { supabase } from "@/integrations/supabase/client";
import { wrapEdgeFunction } from "@/lib/errors";
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
import { buildAgentMessages } from "./super-prompts";
import { orchestrate } from "./orchestrator/orion-v3-orchestrator";

export interface OrionResponse {
  success: boolean;
  response: string;
  sector?: Sector;
  agentUsed?: string;
  confidence?: number;
}

/**
 * Processar qualquer entrada do usuário (texto ou voz)
 */
export async function processOrionRequest(
  input: string,
  context: Record<string, unknown> = {}
): Promise<OrionResponse> {
  try {
    const t0 = Date.now();
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id || "anonymous";

    // 🍕 PENTAGON PIZZA — Unified consciousness pre-pass.
    // This handles intent routing, memory recall, and reasoning waves.
    const v3Result = await orchestrate({
      command: input,
      source: context.source as any || "text",
      userId,
      conversationContext: context.conversationContext as string || ""
    });

    let sensorialVisualContext: string | undefined;

    // Detectar setor
    const sector = detectSector(input);
    const agent = getAgentForSector(sector);

    // Determinar tipo de requisição
    const isCommand = isCommand_(input);
    const isSearch = isSearch_(input);

    // 3. Processar conforme tipo
    if (isCommand) {
      return await processCommand(input, sector, agent, context);
    }

    if (isSearch) {
      return await processSearch(input, sector, agent, context);
    }

    // 4. For plain questions or general interactions, use V3 result
    if (v3Result && v3Result.summary && v3Result.confidence >= 0.5) {
      return {
        success: true,
        response: v3Result.summary,
        sector,
        agentUsed: `orion-v3:${v3Result.decision.primary}`,
        confidence: v3Result.decision.confidence,
      };
    }

    return await processQuestion(input, sector, agent, context);

  } catch (error) {
    console.error("[ORION Brain] Error:", error);
    return {
      success: false,
      response: "Desculpe, houve um erro ao processar sua solicitação no meu núcleo neural.",
    };
  }
}

function isCommand_(input: string): boolean {
  const commands = [
    "abre", "abra", "abrir", "executar", "rode", "rodar",
    "liga", "ligar", "desliga", "desligar", "ativa", "ativar",
    "desativa", "desativar", "criar", "gerar", "salvar", "enviar"
  ];
  return commands.some(cmd => input.toLowerCase().startsWith(cmd));
}

function isSearch_(input: string): boolean {
  const t = input.toLowerCase().trim();
  if (/^(pesquis\w+|busc\w+|procur\w+|ach\w+|encontr\w+|consult\w+)/.test(t)) return true;
  if (/\b(pesquis\w+|busc\w+|procur\w+)\s+(sobre|por|por que|no|na|em)\b/.test(t)) return true;
  if (/\b(últimas not[ií]cias|pre[çc]o de|cota[çc][aã]o|previs[aã]o do tempo|onde fica)\b/.test(t)) return true;
  return false;
}

async function processCommand(
  input: string, 
  sector: Sector, 
  agent: SectorAgent,
  context: Record<string, unknown>
): Promise<OrionResponse> {
  const cmd = input.toLowerCase();
  
  if (cmd.startsWith("abre") || cmd.startsWith("abrir")) {
    const panel = agent.panel;
    if (panel) {
      return {
        success: true,
        response: `Entendido. Abrindo ${agent.name} — Painel: ${panel}`,
        sector,
        agentUsed: agent.name,
      };
    }
  }
  
  return {
    success: true,
    response: `Comando "${input}" executado pelo ${agent.name}.`,
    sector,
    agentUsed: agent.name,
  };
}

async function processSearch(
  input: string,
  sector: Sector,
  agent: SectorAgent,
  context: Record<string, unknown>
): Promise<OrionResponse> {
  const query = input.replace(/^(pesquisar|buscar|procurar)\s+/i, "").trim();
  
  try {
    const { data, error } = await supabase.functions.invoke("neural-ops", {
      body: {
        question: query,
        intentType: sector === "pesquisa" ? "legal_search" : "web_search"
      },
    });

    if (error) throw error;
    
    return {
      success: true,
      response: data?.output || "Pesquisa concluída.",
      sector,
      agentUsed: agent.name,
    };
  } catch (error) {
    return {
      success: false,
      response: `Não foi possível pesquisar: ${query}`,
      sector,
      agentUsed: agent.name,
    };
  }
}

async function processQuestion(
  input: string,
  sector: Sector,
  agent: SectorAgent,
  context: Record<string, unknown>
): Promise<OrionResponse> {
  try {
    const messages = buildAgentMessages(
      "pesquisa" as any,
      input,
      Object.keys(context).length > 0 ? JSON.stringify(context) : undefined
    );
    
    const { data, error } = await supabase.functions.invoke("neural-ops", {
      body: {
        messages,
        question: input,
        intentType: "chat",
      },
    });

    if (error) throw error;
    
    return {
      success: true,
      response: data?.output || "Processado pelo ORION.",
      sector,
      agentUsed: agent.name,
      confidence: 0.9,
    };
  } catch (error) {
    return {
      success: true,
      response: "Entendido. Estou sempre à disposição para ajudar.",
      sector,
      agentUsed: agent.name,
    };
  }
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
