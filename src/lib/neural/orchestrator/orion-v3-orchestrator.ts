/**
 * Orion-V3 Master Orchestrator
 * The "agent kernel" — receives a command (text or voice transcript),
 * routes it to the right sub-agent(s), and returns a unified response.
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
  plan: AgentId[][];
  results: AgentResult[];
  summary: string;
  totalMs: number;
}

function buildAgentPrompt(agent: AgentId, command: string, context?: string): string {
  const cap = AGENT_REGISTRY[agent];
  const ctxBlock = context ? `\n\nCONTEXTO PRÉVIO:\n${context}\n` : "";
  return `Você é ${cap.name} ${cap.emoji}. DOMÍNIO: ${cap.domain}\nREGRAS ANTI-ALUCINAÇÃO: Responda apenas com contexto.\n${ctxBlock}\nCOMANDO: ${command}`;
}

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
    const { OPENROUTER_FREE_MODELS } = await import("@/lib/integrations/openrouter-free-models");
    const tierFirst = [...OPENROUTER_FREE_MODELS].sort((a, b) => a.tier === cap.preferredTier ? -1 : 1);
    const cascade = tierFirst.map((m) => ({ provider: "openrouter" as const, model: m.id }));
    const res = await chatWithCascade([{ role: "user", content: prompt }], cascade, 2000);
    return { agent, output: res?.content ?? "", durationMs: Math.round(performance.now() - start), modelUsed: (res as any)?.model };
  } catch (err) {
    return { agent, output: "", durationMs: Math.round(performance.now() - start), error: String(err) };
  }
}

export async function orchestrate(
  req: OrchestrationRequest & { stream?: boolean },
): Promise<OrchestrationResponse | ReadableStream> {
  const t0 = performance.now();
  const { runSensorialGate } = await import("./sensorial-gate");
  const sensorial = await runSensorialGate(req.command);

  if (sensorial.skip) {
    return { decision: { primary: "harvester", agents: ["harvester"], method: "keyword", confidence: 1, reasoning: "silence" }, plan: [], results: [], summary: "", totalMs: Math.round(performance.now() - t0) };
  }

  const { recallEpisodes, episodesToContext, recordEpisode } = await import("./episodic-memory");
  const episodes = await recallEpisodes({ limit: 4, types: ["failure", "milestone"] });
  const biographyContext = episodesToContext(episodes);

  const decision = await routeCommand(req.command);

  // ⚡ STREAMING PATH
  if (req.stream) {
    const { callAIOrchestrator } = await import("@/lib/ai-orchestrator");
    return await callAIOrchestrator({
      prompt: req.command,
      systemPrompt: buildAgentPrompt(decision.primary, req.command, biographyContext + (sensorial.visualContext || "")),
      stream: true,
      useCase: "chat",
      inputSource: req.source === "voice" ? "voice" : "text"
    }) as ReadableStream;
  }

  const plan = buildExecutionPlan(decision.agents);
  const results: AgentResult[] = [];
  let rollingContext = [sensorial.visualContext || "", biographyContext, req.conversationContext || ""].filter(Boolean).join("\n\n");

  for (const wave of plan) {
    const waveResults = await Promise.all(wave.map((id) => runAgent(id, req.command, rollingContext)));
    results.push(...waveResults);
    rollingContext += "\n\n" + waveResults.map((r) => `[${AGENT_REGISTRY[r.agent].name}] ${r.output}`).join("\n");
  }

  const primaryResult = results.find((r) => r.agent === decision.primary);
  const summary = primaryResult?.output || results[0]?.output || "Sem resposta.";

  void recordEpisode({ episode_type: "interaction", agent: decision.primary, command: req.command, response: summary, importance: 0.4, tags: [decision.primary], metadata: { durationMs: Math.round(performance.now() - t0) } });

  return { decision, plan, results, summary, totalMs: Math.round(performance.now() - t0) };
}
