/**
 * Orion-V3 Intent Router
 * Classifies a natural-language command into one or more agents.
 *
 * Two-stage routing:
 *  1) Fast keyword match (zero-cost, sub-ms) — handles ~80% of cases.
 *  2) LLM classifier fallback (free OpenRouter cascade) — only when ambiguous.
 *
 * Output is a prioritized execution plan respecting mutex groups.
 */

import { ALL_AGENTS, AGENT_REGISTRY, type AgentId } from "./agent-registry";

export interface RoutingDecision {
  agents: AgentId[]; // ordered execution plan
  primary: AgentId;
  confidence: number; // 0-1
  reasoning: string;
  method: "keyword" | "llm" | "hybrid";
}

interface Score {
  id: AgentId;
  score: number;
  matchedTriggers: string[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Stage 1: Keyword-based scoring.
 */
export function scoreByKeywords(command: string): Score[] {
  const norm = normalize(command);
  return ALL_AGENTS.map((agent) => {
    const matched: string[] = [];
    let score = 0;
    for (const trigger of agent.triggers) {
      const t = normalize(trigger);
      if (norm.includes(t)) {
        matched.push(trigger);
        // longer triggers = stronger signal
        score += t.length >= 6 ? 2 : 1;
      }
    }
    // Penalize if exclusions match strongly
    for (const ex of agent.exclusions) {
      if (norm.includes(normalize(ex))) score -= 2;
    }
    return { id: agent.id, score, matchedTriggers: matched };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Stage 2: LLM classifier (only when keyword scores are tied or zero).
 * Uses the cheapest free model in cascade.
 */
async function classifyViaLLM(command: string): Promise<AgentId> {
  const { chatWithCascade } = await import("@/lib/integrations/llm-providers");
  const prompt = `Classifique o comando do usuário em UM agente:

- bolt → engenharia/código/lógica/performance/bugs/deploy
- palette → UI/UX/design/cor/layout/visual
- harvester → pesquisa/conhecimento/RAG/transcrição/análise textual
- justice → jurídico/jurisprudência/contratos/petições
- sentinel → segurança/autenticação/monitoramento/saúde do sistema
- factory → robótica/industrial/IoT/manufatura

Comando: "${command}"

Responda APENAS com uma palavra: bolt, palette, harvester, justice, sentinel, ou factory.`;

  try {
    const res = await chatWithCascade(
      [{ role: "user", content: prompt }],
      undefined,
      4000,
    );
    const out = (res?.content ?? "").toLowerCase().trim();
    if (out.includes("bolt")) return "bolt";
    if (out.includes("palette")) return "palette";
    if (out.includes("harvester")) return "harvester";
    if (out.includes("justice")) return "justice";
    if (out.includes("sentinel")) return "sentinel";
    if (out.includes("factory")) return "factory";
  } catch (err) {
    console.warn("[IntentRouter] LLM classifier failed, defaulting to harvester:", err);
  }
  return "harvester";
}

/**
 * Main routing entry point.
 */
export async function routeCommand(command: string): Promise<RoutingDecision> {
  const scores = scoreByKeywords(command);
  const top = scores[0];
  const second = scores[1];

  // Strong winner: top has score ≥ 2 and is at least 2 ahead
  if (top.score >= 2 && top.score - (second?.score || 0) >= 2) {
    // Add secondary agent if its score is meaningful AND parallel-safe
    const agents: AgentId[] = [top.id];
    if (second && second.score >= 2 && AGENT_REGISTRY[second.id].parallelSafe) {
      agents.push(second.id);
    }
    return {
      agents,
      primary: top.id,
      confidence: Math.min(1, top.score / 6),
      reasoning: `Keyword match: ${top.matchedTriggers.join(", ")}`,
      method: "keyword",
    };
  }

  // Ambiguous → LLM classifier
  const llmChoice = await classifyViaLLM(command);
  return {
    agents: [llmChoice],
    primary: llmChoice,
    confidence: 0.6,
    reasoning: top.score > 0
      ? `Hybrid: keyword hint=${top.id}(${top.score}), LLM=${llmChoice}`
      : `LLM classification (no keyword match)`,
    method: top.score > 0 ? "hybrid" : "llm",
  };
}

/**
 * Build an execution plan honoring mutex groups.
 * Agents in the same mutex group are queued sequentially; others run in parallel.
 */
export function buildExecutionPlan(agents: AgentId[]): AgentId[][] {
  const waves: AgentId[][] = [];
  const usedGroups = new Set<string>();
  let currentWave: AgentId[] = [];

  for (const id of agents) {
    const cap = AGENT_REGISTRY[id];
    const group = cap.mutexGroup;
    if (group && usedGroups.has(group)) {
      // flush wave, start new
      if (currentWave.length) waves.push(currentWave);
      currentWave = [id];
      usedGroups.clear();
      if (group) usedGroups.add(group);
    } else {
      currentWave.push(id);
      if (group) usedGroups.add(group);
    }
  }
  if (currentWave.length) waves.push(currentWave);
  return waves;
}
