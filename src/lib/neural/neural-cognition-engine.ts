/**
 * ─── Neural Cognition Engine (v2.0 — Quantum Cognitive Pipeline) ───
 * Central motor connecting consciousness, memory, causal reasoning,
 * Theory of Mind, somatic markers, and reward signals into a single
 * coherent pipeline with Quantum Wave Function backbone.
 * 
 * Each cognitive module contributes a qubit to the cognitive register.
 * Consciousness (Φ) = probability of collapse to "conscious" state.
 * Cognitive load = von Neumann entropy of the register.
 */

import { getWorkingMemoryContext, getCognitiveLoad } from "./orion-working-memory";
import { consultSomaticMarker, recordSomaticOutcome } from "./somatic-markers";
import { getCachedInteroceptiveState } from "./interoception-engine";
import {
  createWaveFunction,
  entropy as wfEntropy,
  normalizedEntropy,
  collapse as wfCollapse,
  evolve as wfEvolve,
  decohere as wfDecohere,
  waveFidelity,
  getMetrics,
  type WaveFunction,
  type WaveFunctionMetrics,
} from "./quantum-wave-function";

// ─── Types ───

export interface CognitionContext {
  contextString: string;
  consciousnessLevel: number;
  episodicHits: number;
  causalSummary: string;
  tomSnapshot: string;
  somaticValence: number;
  cognitiveLoad: number;
  buildTimeMs: number;
  /** Quantum metrics of the cognitive register */
  quantumMetrics?: WaveFunctionMetrics;
  /** Collapsed cognitive state bit string */
  collapsedState?: string;
}

export interface CognitionState {
  lastBuildTimeMs: number;
  totalCycles: number;
  avgBuildTimeMs: number;
  lastConsciousnessLevel: number;
  lastCognitiveLoad: number;
  lastEpisodicHits: number;
  /** Last cognitive wave function entropy */
  lastQuantumEntropy: number;
  /** Last collapsed bit string */
  lastCollapsedState: string;
}

let _state: CognitionState = {
  lastBuildTimeMs: 0, totalCycles: 0, avgBuildTimeMs: 0,
  lastConsciousnessLevel: 0, lastCognitiveLoad: 0, lastEpisodicHits: 0,
  lastQuantumEntropy: 0, lastCollapsedState: "",
};

function safeCall<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

// ─── 1. Episodic Memory ───

async function queryEpisodicMemory(question: string): Promise<{ hits: number; summary: string }> {
  try {
    const { searchEpisodes, buildEpisodicContext } = await import("./episodic-memory");
    const userId = (typeof localStorage !== "undefined" && localStorage.getItem("orion_user_id")) || "session";
    const episodes = await searchEpisodes(question, userId, 3);
    if (!episodes || episodes.length === 0) return { hits: 0, summary: "" };
    return { hits: episodes.length, summary: buildEpisodicContext(episodes).slice(0, 200) };
  } catch { return { hits: 0, summary: "" }; }
}

// ─── 2. Theory of Mind ───

function getToMSnapshot(): string {
  try {
    const { getToMSummary, createUserMentalModel } = require("./theory-of-mind");
    const model = createUserMentalModel("current");
    return getToMSummary(model).slice(0, 100);
  } catch { return ""; }
}

// ─── 3. Causal Graph ───

function getCausalSummary(): string {
  try {
    const { createCausalGraph, getCausalGraphStats } = require("./causal-reasoning");
    const graph = createCausalGraph();
    const stats = getCausalGraphStats(graph);
    if (stats.totalNodes === 0) return "";
    return `nodes:${stats.totalNodes},edges:${stats.totalEdges}`;
  } catch { return ""; }
}

// ─── 4. Consciousness ───

function getConsciousnessLevel(): number {
  try {
    const { getConsciousnessState } = require("./consciousness-bridge");
    const state = getConsciousnessState();
    return state?.phi ?? state?.consciousnessLevel ?? 0.5;
  } catch { return 0.5; }
}

// ─── 5. Somatic Valence ───

function getSomaticValence(question: string): number {
  const intero = getCachedInteroceptiveState();
  const marker = consultSomaticMarker({
    contextHash: `query_${question.slice(0, 30)}`,
    interoceptiveState: intero ?? undefined,
  });
  return marker?.valenceScore ?? 0;
}

// ─── Main: Build Cognition Context (pre-LLM) ───

export async function buildCognitionContext(
  question: string,
  _chatHistory: Array<{ role: string; text: string }>,
  _intentType: string
): Promise<CognitionContext> {
  const t0 = performance.now();

  const [episodic, tomSnap, causalSnap, consciousness, somaticV, wmItems, cogLoad] = await Promise.all([
    queryEpisodicMemory(question),
    Promise.resolve(safeCall(() => getToMSnapshot(), "")),
    Promise.resolve(safeCall(() => getCausalSummary(), "")),
    Promise.resolve(safeCall(() => getConsciousnessLevel(), 0.5)),
    Promise.resolve(safeCall(() => getSomaticValence(question), 0)),
    Promise.resolve(safeCall(() => getWorkingMemoryContext(6), [])),
    Promise.resolve(safeCall(() => getCognitiveLoad(), 0.3)),
  ]);

  // ─── Quantum Cognitive Register ───
  // Each module contributes a qubit: P(|1⟩) = signal strength
  const cognitiveWF = createWaveFunction("cognition", {
    episodic: Math.min(1, episodic.hits / 3),      // More hits → higher amplitude
    theory_of_mind: tomSnap ? 0.7 : 0.1,           // ToM active?
    causal: causalSnap ? 0.6 : 0.1,                // Causal graph populated?
    consciousness: consciousness,                    // Φ level
    somatic: Math.abs(somaticV) > 0.3 ? 0.8 : 0.2, // Strong somatic signal?
    working_memory: Array.isArray(wmItems) && wmItems.length > 0 ? 0.7 : 0.2,
  });

  // Apply decoherence proportional to cognitive load
  const cl = typeof cogLoad === "number" ? cogLoad : 0.3;
  const decoheredWF = wfDecohere(cognitiveWF, cl * 0.1);

  // Evolve under "attention" Hamiltonian — question complexity drives evolution
  const questionComplexity = Math.min(1, question.split(/\s+/).length / 20);
  const evolvedWF = wfEvolve(decoheredWF, {
    episodic: episodic.hits > 0 ? 0.5 : 0,
    consciousness: questionComplexity * 0.3,
    working_memory: 0.2,
  }, 0.05);

  // Get quantum metrics
  const qMetrics = getMetrics(evolvedWF);

  // Collapse to determine the "active" cognitive modules
  const collapseResult = wfCollapse(evolvedWF);

  // Quantum-enhanced consciousness: Φ is now the probability of the
  // consciousness qubit collapsing to |1⟩, modulated by register entropy
  const quantumPhi = consciousness * (1 - qMetrics.normalizedEntropy * 0.3);

  // Quantum cognitive load: normalized entropy of the register
  const quantumCL = qMetrics.normalizedEntropy;

  const parts: string[] = [];

  // Working memory items
  if (Array.isArray(wmItems) && wmItems.length > 0) {
    const wmStr = wmItems.map((item: any) => item.content || item.text || String(item)).join(" | ").slice(0, 200);
    if (wmStr.length > 5) parts.push(`[WM] ${wmStr}`);
  }

  if (episodic.hits > 0) parts.push(`[Episódico:${episodic.hits}] ${episodic.summary.slice(0, 150)}`);
  if (tomSnap) parts.push(`[ToM] ${tomSnap}`);
  if (causalSnap) parts.push(`[Causal] ${causalSnap}`);

  const intero = getCachedInteroceptiveState();
  if (intero) parts.push(`[Corpo] V:${intero.valence.toFixed(1)} A:${intero.arousal.toFixed(1)} P:${intero.painIndex.toFixed(1)}`);

  parts.push(`[Φ=${quantumPhi.toFixed(2)},QCL=${quantumCL.toFixed(2)},SV=${somaticV.toFixed(1)},ψ=${collapseResult.bitString}]`);

  const contextString = parts.length > 0 ? `═══ COGNIÇÃO NEURAL ψ ═══\n${parts.join("\n")}` : "";
  const buildTimeMs = performance.now() - t0;

  const prevTotal = _state.totalCycles;
  _state = {
    lastBuildTimeMs: buildTimeMs,
    totalCycles: prevTotal + 1,
    avgBuildTimeMs: (_state.avgBuildTimeMs * prevTotal + buildTimeMs) / (prevTotal + 1),
    lastConsciousnessLevel: quantumPhi,
    lastCognitiveLoad: quantumCL,
    lastEpisodicHits: episodic.hits,
    lastQuantumEntropy: qMetrics.entropy,
    lastCollapsedState: collapseResult.bitString,
  };

  return {
    contextString,
    consciousnessLevel: quantumPhi,
    episodicHits: episodic.hits,
    causalSummary: causalSnap,
    tomSnapshot: tomSnap,
    somaticValence: somaticV,
    cognitiveLoad: quantumCL,
    buildTimeMs,
    quantumMetrics: qMetrics,
    collapsedState: collapseResult.bitString,
  };
}

// ─── Main: Post-Cognition Learning (fire-and-forget) ───

export async function postCognitionLearn(
  question: string,
  response: string,
  latencyMs: number,
  intentType: string,
  _wasRefined: boolean = false,
  ragContext: string = ""
): Promise<void> {
  const tasks: Promise<void>[] = [];

  // 1. Somatic outcome
  tasks.push((async () => {
    try {
      recordSomaticOutcome(`query_${question.slice(0, 30)}`, `${intentType} query`, "cognition_pipeline", latencyMs < 4000, latencyMs < 4000 ? 0.4 : -0.3);
    } catch { /* silent */ }
  })());

  // 2. Episodic memory
  tasks.push((async () => {
    try {
      const { createEpisode } = await import("./episodic-memory");
      const userId = (typeof localStorage !== "undefined" && localStorage.getItem("orion_user_id")) || "session";
      const convId = `conv_${Date.now()}`;
      await createEpisode(convId, userId, [
        { role: "user", content: question },
        { role: "assistant", content: response.slice(0, 300) },
        { role: "user", content: "." }, // min 3 messages for episode
      ], intentType);
    } catch { /* silent */ }
  })());

  // 3. Theory of Mind
  tasks.push((async () => {
    try {
      const { createUserMentalModel, updateFromInteraction } = await import("./theory-of-mind");
      const model = createUserMentalModel("current");
      updateFromInteraction(model, question);
    } catch { /* silent */ }
  })());

  // 4. Meta-learning
  tasks.push((async () => {
    try {
      const { createMetaLearningState, recordLearningOutcome } = await import("./meta-learning");
      const state = createMetaLearningState();
      recordLearningOutcome(state, intentType, "query", latencyMs < 4000 ? "success" : "partial", latencyMs);
    } catch { /* silent */ }
  })());

  // 5. Causal graph
  tasks.push((async () => {
    try {
      const { createCausalGraph, addCausalLink } = await import("./causal-reasoning");
      const graph = createCausalGraph();
      addCausalLink(graph, `intent_${intentType}`, latencyMs < 4000 ? "fast_response" : "slow_response", Math.min(1, 4000 / Math.max(latencyMs, 1)));
    } catch { /* silent */ }
  })());


  // 6. RAG Feedback Loop
  tasks.push((async () => {
    try {
      const { evaluateRAGResponse } = await import("./rag-evaluator");
      const { submitRAGFeedback } = await import("./rag-feedback-loop");

      const evalResult = await evaluateRAGResponse({
        query: question,
        response: response,
        context: ragContext,
        // but evaluator can still do partial analysis
      });

      submitRAGFeedback(question, evalResult);
    } catch { /* silent */ }
  })());

  await Promise.allSettled(tasks);
}

// ─── Telemetry ───

export function getCognitionState(): Readonly<CognitionState> {
  return { ..._state };
}
