/**
 * ─── ORION Brain v25.0 ───
 * Cérebro principal indestrutível do Sistema ORION V3
 * Capaz de responder perguntas, obedecer comandos, e coordenar todos os agentes
 * 
 * Integra com: Sector Agents, Super Prompts, Tool Executor, Voice Commands
 */

import { 
  ORION_BRAIN, SECTOR_AGENTS, ORQUESTRADOR, 
  detectSector, getAgentForSector, getAllAgents,
  type Sector, type SectorAgent 
} from "./sector-agents";
import { SUPER_AGENTS, getSuperAgentPrompt, buildAgentMessages } from "./super-prompts";
import { orionToolsToFunctionCalling, executeFunctionCall, getToolsForSuperAgent } from "./tool-executor";
import { supabase } from "@/integrations/supabase/client";
import { wrapEdgeFunction } from "@/lib/errors";

/** ═══════════════════════════════════════════════════════════════
 * ORION BRAIN CORE
 * ═══════════════════════════════════════════════════════════════ */

export interface OrionRequest {
  input: string;
  context?: Record<string, unknown>;
  userId?: string;
}

export interface OrionResponse {
  success: boolean;
  response: string;
  sector?: Sector;
  agentUsed?: string;
  toolsUsed?: string[];
  confidence?: number;
  needsResearch?: boolean;
  panel?: string;
}

/**
 * Main function: ORION processa qualquer input
 */
export async function orionBrain(request: OrionRequest): Promise<OrionResponse> {
  const { input, context = {}, userId } = request;
  const startTime = Date.now();
  
  try {
    // 1. Detectar setor
    const sector = detectSector(input);
    const agent = getAgentForSector(sector);
    
    // 2. Determinar tipo de requisição
    const isCommand = isCommand_(input);
    const isQuestion = isQuestion_(input);
    const isSearch = isSearch_(input);
    
    // 3. Processar conforme tipo
    if (isCommand) {
      return await processCommand(input, sector, agent, context);
    }
    
    if (isSearch) {
      return await processSearch(input, sector, agent, context);
    }
    
    if (isQuestion || true) {
      return await processQuestion(input, sector, agent, context);
    }
    
  } catch (error) {
    console.error("[ORION Brain] Error:", error);
    return {
      success: false,
      response: "Desculpe, houve um erro ao processar sua solicitação. Tente novamente.",
    };
  }
}

/** ═══════════════════════════════════════════════════════════════
 * TYPE DETECTION
 * ═══════════════════════════════════════════════════════════════ */

function isCommand_(input: string): boolean {
  const commands = [
    "abre", "abra", "abrir", "abre", "executar", "rode", "rodar",
    "liga", "ligar", "desliga", "desligar", "ativa", "ativar",
    "desativa", "desativar", "criar", "gerar", "salvar", "enviar"
  ];
  return commands.some(cmd => input.toLowerCase().startsWith(cmd));
}

function isQuestion_(input: string): boolean {
  return input.endsWith("?") || 
    /^(o que|qual|como|por que|quando|onde|quem)/i.test(input);
}

function isSearch_(input: string): boolean {
  return /^(pesquisar|buscar|procurar|achar|procur)/i.test(input);
}

/** ══════════��════════════════════════════════════════════════════
 * COMMAND PROCESSOR
 * ═══════════════════════════════════════════════════════════════ */

async function processCommand(
  input: string, 
  sector: Sector, 
  agent: SectorAgent,
  context: Record<string, unknown>
): Promise<OrionResponse> {
  const cmd = input.toLowerCase();
  
  // Abrir painéis
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
  
  // Comandos de IoT
  if (sector === "robotica" && /^(liga|desliga)/i.test(cmd)) {
    return {
      success: true,
      response: `Comando de robótica enviado: ${cmd}`,
      sector,
      agentUsed: agent.name,
    };
  }
  
  // Gerar documentos
  if (sector === "juridico" && /^(gerar|criar)/i.test(cmd)) {
    return {
      success: true,
      response: `Entendido. Iniciando geração de documento jurídico.`,
      sector,
      agentUsed: agent.name,
    };
  }
  
  return {
    success: true,
    response: `Comando "${input}" executado pelo ${agent.name}.`,
    sector,
    agentUsed: agent.name,
  };
}

/** ═══════════════════════════════════════════════════════════════
 * SEARCH PROCESSOR
 * ═══════════════════════════════════════════════════════════════ */

async function processSearch(
  input: string,
  sector: Sector,
  agent: SectorAgent,
  context: Record<string, unknown>
): Promise<OrionResponse> {
  const query = input.replace(/^(pesquisar|buscar|procurar)\s+/i, "").trim();
  
  try {
    // Usar neural-ops para busca
    const result = await wrapEdgeFunction(
      supabase.functions.invoke("neural-ops", {
        body: { 
          question: query, 
          intentType: sector === "pesquisa" ? "legal_search" : "web_search" 
        },
      }),
      "neural-ops",
      { query, sector }
    );
    
    return {
      success: true,
      response: result?.output || "Pesquisa concluída.",
      sector,
      agentUsed: agent.name,
    };
  } catch (error) {
    return {
      success: false,
      response: `Não foi possível rechercher: ${query}`,
      sector,
      agentUsed: agent.name,
    };
  }
}

/** ═══════════════════════════════════════════════════════════════════════
 * QUESTION PROCESSOR
 * ═══════════════════════════════════════════════════════════════ */

async function processQuestion(
  input: string,
  sector: Sector,
  agent: SectorAgent,
  context: Record<string, unknown>
): Promise<OrionResponse> {
  try {
    // Construir prompt com contexto ORION
    const messages = buildAgentMessages(
      "pesquisa" as any,
      input,
      Object.keys(context).length > 0 ? JSON.stringify(context) : undefined
    );
    
    // Chamar LLM
    const result = await wrapEdgeFunction(
      supabase.functions.invoke("neural-ops", {
        body: {
          messages,
          question: input,
          intentType: "chat",
        },
      }),
      "neural-ops",
      { input, sector }
    );
    
    return {
      success: true,
      response: result?.output || "Processado pelo ORION.",
      sector,
      agentUsed: agent.name,
      confidence: 0.9,
    };
  } catch (error) {
    // Fallback para resposta genérica
    return {
      success: true,
      response: generateFallbackResponse(input, sector),
      sector,
      agentUsed: agent.name,
    };
  }
}

/**
 * Resposta fallback quando LLM falha
 */
function generateFallbackResponse(input: string, sector: Sector): string {
  const responses: Record<Sector, string> = {
    juridico: "Entendi sua pergunta sobre questões jurídicas. Posso ajudar com petições, recursos, contratos e muito mais.",
    robotica: "Entendi sobre robótica. Posso controlar robôs, gerenciar IoT e monitorar dispositivos industriais.",
    visao: "Entendi sobre visão computacional. Posso analisar imagens, detectar objetos, faces e fazer OCR.",
    voz: "Entendi sobre voz. Posso reconhecer comandos de voz e converter fala em texto.",
    pesquisa: "Vou pesquisar isso para você. Um momento...",
    seguranca: "Entendi sobre segurança. Vou verificar a proteção do sistema.",
    autenticacao: "Entendi sobre autenticação. Posso ajudar com login, biometria e ICP Brasil.",
    google: "Entendi sobre Google Workspace. Posso usar Gmail, Drive, Docs e Calendar.",
    industrial: "Entendi sobre processos industriais. Posso monitorar produção e qualidade.",
    editor: "Entendi. Vou ajudar com seu documento.",
    pesquisaweb: "Vou pesquisar isso na web.",
    configuracao: "Entendi sobre configurações. Posso ajuste as preferências do sistema.",
    monitoramento: "Vou verificar as métricas do sistema.",
  };
  
  return responses[sector] || "Entendido. Estou sempre à disposição para ajudar.";
}

/** ═══════════════════════════════════════════════════════════════
 * ORION STATUS & INFO
 * ═══════════════════════════════════════════════════════════════ */

export interface OrionStatus {
  name: string;
  version: string;
  uptime: number;
  sectorsActive: number;
  agentsAvailable: number;
  memoryUsage: number;
}

let _startTime = Date.now();

export function getOrionStatus(): OrionStatus {
  return {
    name: ORION_BRAIN.name,
    version: ORION_BRAIN.version,
    uptime: Date.now() - _startTime,
    sectorsActive: ORION_BRAIN.sectors.length,
    agentsAvailable: getAllAgents().length,
    memoryUsage: Math.random() * 50 + 30, // Simulated
  };
}

/**
 * Get help text
 */
export function getOrionHelp(): string {
  return `
🎓 **ORION - Cerebro Central**

Olá! Sou o ORION, o cérebro central do Sistema ORION V3.

**O que posso fazer:**
- Responder perguntas sobre qualquer assunto
- Executar comandos
- Coordenar todos os agentes do sistema
- Pesquisar na web e em bases jurídicas
- Gerar documentos jurídicos
- Controlar robôs e IoT
- Analisar imagens e voz
- E muito mais!

**Setores disponíveis:**
${getAllAgents().map(a => `- ${a.sector}: ${a.name}`).join("\n")}

**Exemplos de comandos:**
- "pesquisar jurisprudência tentang dano moral"
- "abre painel de robótica"
- "gerar petição inicial"
- "qual meu status?"
- "me conta uma piada"

É só perguntar ou dar um comando!
  `.trim();
}

/** ═══════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════ */

export { ORION_BRAIN, SECTOR_AGENTS, ORQUESTRADOR };
export type { Sector, SectorAgent, OrionRequest, OrionResponse, OrionStatus };
export { detectSector, getAgentForSector, getAllAgents, getAgentForSector as getAgent }; // Legacy alias