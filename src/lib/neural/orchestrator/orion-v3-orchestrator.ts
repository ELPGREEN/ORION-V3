/**
 * Orion-V3 Master Orchestrator
 * The "agent kernel" — receives a command (text or voice transcript),
 * routes it to the right sub-agent(s), and returns a unified response.
 *
 * Anti-hallucination rules (per project memory):
 *  - Context-only responses
 *  - Admit uncertainty when confidence < 0.5
 *  - Concise output (2–4 sentences) unless user asks for detail
 */

import { routeCommand, buildExecutionPlan, type RoutingDecision } from "./intent-router";
import { AGENT_REGISTRY, type AgentId } from "./agent-registry";

export interface OrchestrationRequest {
  command: string;
  source?: "voice" | "text" | "system";
  userId?: string;
  conversationContext?: string;
}

export interface AgentResult {
  agent: AgentId;
  output: string;
  durationMs: number;
  modelUsed?: string;
  error?: string;
}

export interface OrchestrationResponse {
  decision: RoutingDecision;
  plan: AgentId[][]; // execution waves
  results: AgentResult[];
  summary: string;
  totalMs: number;
}

/**
 * Build a system prompt tailored to the chosen agent.
 */
function buildAgentPrompt(agent: AgentId, command: string, context?: string): string {
  const cap = AGENT_REGISTRY[agent];
  const ctxBlock = context ? `\n\nCONTEXTO PRÉVIO:\n${context}\n` : "";

  const base = `Você é ${cap.name} ${cap.emoji} — sub-agente do Orion-V3.
DOMÍNIO: ${cap.domain}
NÃO FAÇA: ${cap.exclusions.join(", ")}

REGRAS ANTI-ALUCINAÇÃO:
- Responda apenas com base no contexto fornecido.
- Admita incerteza ("não sei" / "preciso de mais dados") quando aplicável.
- Seja CURTO (2–4 frases). Detalhe só se solicitado explicitamente.
- Factualidade > criatividade.
${ctxBlock}
COMANDO DO USUÁRIO: ${command}`;

  return base;
}

/**
 * Execute a single agent using the OpenRouter free cascade with the
 * agent's preferred tier.
 */
async function runAgent(
  agent: AgentId,
  command: string,
  context?: string,
): Promise<AgentResult> {
  const start = performance.now();
  const cap = AGENT_REGISTRY[agent];
  const prompt = buildAgentPrompt(agent, command, context);

  try {
    const { chatWithCascade } = await import("@/lib/integrations/llm-providers");
    // Build a tier-prioritized cascade from the free models registry
    const { OPENROUTER_FREE_MODELS } = await import(
      "@/lib/integrations/openrouter-free-models"
    );
    const tierFirst = [...OPENROUTER_FREE_MODELS].sort((a, b) =>
      a.tier === cap.preferredTier ? -1 : b.tier === cap.preferredTier ? 1 : 0,
    );
    const cascade = tierFirst.map((m) => ({
      provider: "openrouter" as const,
      model: m.id,
    }));
    const res = await chatWithCascade(
      [{ role: "user", content: prompt }],
      cascade,
      8000,
    );
    return {
      agent,
      output: res?.content ?? "",
      durationMs: Math.round(performance.now() - start),
      modelUsed: (res as any)?.model,
    };
  } catch (err) {
    return {
      agent,
      output: "",
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Main entry point — orchestrate a single command end-to-end.
 */
export async function orchestrate(
  req: OrchestrationRequest,
): Promise<OrchestrationResponse> {
  const t0 = performance.now();

  // 0a) SENSORIAL GATE — silence filter + visual identification trigger.
  //     Runs BEFORE the LLM so vision data can be injected into context.
  const { runSensorialGate } = await import("./sensorial-gate");
  const sensorial = await runSensorialGate(req.command);
  if (sensorial.skip) {
    // Passive-observation mode: no transcript, no delta → stay silent.
    return {
      decision: {
        primary: "harvester",
        agents: ["harvester"],
        method: "keyword",
        confidence: 1,
        reasoning: "Silence filter — passive observation mode (no transcript, no visual delta).",
      },
      plan: [],
      results: [],
      summary: "",
      totalMs: Math.round(performance.now() - t0),
    };
  }

  // 0) BIOGRAPHY — Load episodic memory (last interactions, failures, milestones)
  //    and any pending corrections from a prior background audit.
  const { recallEpisodes, episodesToContext, recordEpisode } = await import(
    "./episodic-memory"
  );
  const { getStoredCorrections, clearStoredCorrections, runBackgroundAudit } =
    await import("./internal-auditor");
  const { attemptSelfHeal } = await import("./self-healer");

  const [episodes] = await Promise.all([
    recallEpisodes({
      limit: 8,
      types: ["failure", "milestone", "correction", "decision"],
    }),
  ]);
  const biographyContext = episodesToContext(episodes);

  const pendingCorrections = getStoredCorrections();
  const correctionsContext = pendingCorrections.length
    ? "\n\nCORREÇÕES PENDENTES (de auditoria anterior):\n" +
      pendingCorrections
        .map((c) => `- [${c.originalAgent}] ${c.divergence} → ${c.suggestion}`)
        .join("\n")
    : "";
  if (pendingCorrections.length) clearStoredCorrections();

  // 1) Route
  const decision = await routeCommand(req.command);
  const plan = buildExecutionPlan(decision.agents);

  // 2) Execute waves with biography + corrections + visual data in context
  const results: AgentResult[] = [];
  let rollingContext = [
    sensorial.visualContext ?? "",
    biographyContext,
    correctionsContext,
    req.conversationContext ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  for (const wave of plan) {
    const waveResults = await Promise.all(
      wave.map((id) => runAgent(id, req.command, rollingContext)),
    );
    results.push(...waveResults);
    rollingContext +=
      "\n\n" +
      waveResults
        .map((r) => `[${AGENT_REGISTRY[r.agent].name}] ${r.output}`)
        .join("\n");
  }

  // 3) Summarize
  const primaryResult = results.find((r) => r.agent === decision.primary);
  const summary = primaryResult?.output || results[0]?.output || "Sem resposta.";

  // 4) META — Background audit (only critical commands), self-heal check,
  //    and persist this interaction as an episode. All fire-and-forget.
  if (primaryResult) {
    runBackgroundAudit({ command: req.command, primaryResult });
  }

  const hasError = results.some((r) => r.error);
  void recordEpisode({
    episode_type: hasError ? "failure" : "interaction",
    agent: decision.primary,
    command: req.command,
    response: summary,
    importance: hasError ? 0.7 : 0.4,
    tags: [decision.primary, decision.method, ...(req.source ? [req.source] : [])],
    metadata: {
      confidence: decision.confidence,
      durationMs: Math.round(performance.now() - t0),
      models: results.map((r) => r.modelUsed).filter(Boolean),
    },
  });

  if (hasError) {
    void attemptSelfHeal(decision.primary);
  }

  return {
    decision,
    plan,
    results,
    summary,
    totalMs: Math.round(performance.now() - t0),
  };
}
