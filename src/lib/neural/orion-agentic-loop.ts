/**
 * ─── Orion Agentic Loop ───
 * Orchestrates the full AI lifecycle: Plan → Act → Verify → Learn.
 */

import { supabase } from "@/integrations/supabase/client";
import { orionSelfImprove } from "./jules-client";
import {
  evaluateRAGResponse,
  type RAGEvalResult
} from "./rag-evaluator";
import {
  submitRAGFeedback,
  getOptimizedWeights,
  classifyQueryType,
  type SearchWeights
} from "./rag-feedback-loop";
import {
  activateRAGConsciousness,
  solveRAGPuzzle,
  adaptFromEvaluation,
  getConsciousnessDiagnostics,
  recordExperientialEvent,
  type RetrievalContext
} from "./rag-consciousness";
import { getRetrievedChunks } from "./rag-retrieval-tracker";
import { getPipelineLatency, type PipelineLatency } from "./pipeline-latency-tracker";

// ─── Last classification memory (for feedback corrections) ───
let _lastClassification: { text: string; intent: string; ts: number } | null = null;

export function getLastClassification() { return _lastClassification; }
export function setLastClassification(text: string, intent: string) {
  _lastClassification = { text, intent, ts: Date.now() };
}

// ─── Types ───

export interface AgenticPlan {
  intent: string;
  steps: string[];
  risks: string[];
  confidence: number;
  requiresImage: boolean;
  timestamp: number;
}

export interface AgenticVerification {
  passed: boolean;
  score: number;
  issues: string[];
  feedback: string;
}

// ─── Protocols & Strategies ───

interface Protocol {
  intent: string;
  bestStrategy: string;
  avgQuality: number;
  sampleSize: number;
  regressionCount: number;
}

const PROTOCOL_STORAGE_KEY = "orion_agentic_protocols";
let _protocols: Record<string, Protocol> = {};
let _protocolsDirty = false;
let _lastProtocolSync = 0;

function loadProtocols() {
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( PROTOCOL_STORAGE_KEY);
    if (raw) _protocols = JSON.parse(raw);
  } catch {}
}

function saveProtocols() {
  try {
    if (typeof window !== "undefined") localStorage.setItem(PROTOCOL_STORAGE_KEY, JSON.stringify(_protocols));
    _protocolsDirty = true;
  } catch {}
}

// ─── Phase 1: Plan ───

export function planPhase(query: string, context?: any): AgenticPlan {
  const lower = query.toLowerCase();
  let intent = "general_query";
  const steps: string[] = [];
  const risks: string[] = [];
  let confidence = 0.85;

  // Intent classification (fast)
  if (lower.includes("procur") || lower.includes("busc")) intent = "search";
  else if (lower.includes("ger") || lower.includes("cri")) intent = "generate";
  else if (lower.includes("analis") || lower.includes("verific")) intent = "analyze";
  else if (lower.includes("ajud") || lower.includes("com")) intent = "help";

  // Strategy selection based on protocol
  const protocol = _protocols[intent];
  const strategy = protocol?.avgQuality > 0.8 ? protocol.bestStrategy : "balanced_exploration";

  steps.push(`Identify core objective: ${intent}`);
  if (strategy === "deep_search") steps.push("Execute recursive retrieval", "Verify context relevance");
  else steps.push("Retrieve primary context", "Synthesize response");

  return {
    intent,
    steps,
    risks,
    confidence,
    requiresImage: lower.includes("veja") || lower.includes("olha") || !!context?.visionActive,
    timestamp: Date.now(),
  };
}

// ─── Phase 2: Verify ───

export function verifyPhase(query: string, response: string, plan: AgenticPlan, latency: PipelineLatency): AgenticVerification {
  const issues: string[] = [];
  let score = 1.0;

  // 1. Check for hallucinatory markers
  if (response.includes("Não tenho certeza") || response.includes("Desculpe")) {
    score -= 0.2;
    issues.push("low_confidence_disclaimer");
  }

  // 2. Check for length vs intent
  if (plan.intent === "analyze" && response.length < 100) {
    score -= 0.3;
    issues.push("insufficient_depth");
  }

  // 3. Check for latency regression
  if (latency.totalMs > 15000) {
    score -= 0.1;
    issues.push("latency_bottleneck");
  }

  return {
    passed: score > 0.6,
    score,
    issues,
    feedback: issues.length > 0 ? `Resolved with issues: ${issues.join(", ")}` : "Perfect execution",
  };
}

// ─── Phase 3: Learn ───

export function learnPhase(query: string, response: string, plan: AgenticPlan, verification: AgenticVerification): void {
  const intent = plan.intent;
  const protocol = _protocols[intent] || {
    intent,
    bestStrategy: "balanced",
    avgQuality: 0,
    sampleSize: 0,
    regressionCount: 0,
  };

  // Moving average for quality
  const alpha = 0.1;
  protocol.avgQuality = protocol.avgQuality * (1 - alpha) + verification.score * alpha;
  protocol.sampleSize++;

  if (verification.score < 0.4) protocol.regressionCount++;

  // Optimization: if quality drops, flag for strategy shift
  if (protocol.regressionCount > 5 && protocol.avgQuality < 0.6) {
    protocol.bestStrategy = "conservative_chain_of_thought";
  }

  _protocols[intent] = protocol;
  saveProtocols();
}

// ─── Phase 4: Document ───

interface ThoughtEntry {
  id: string;
  timestamp: number;
  query: string;
  agent: string;
  thoughts: { module: string; operation: string; input: string; output: string; startTime: number; duration?: number; confidence: number }[];
  result: string;
  success: boolean;
}

const THOUGHT_HISTORY_KEY = "orion_thought_history";

function createThoughtEntry(query: string, agent: string): ThoughtEntry {
  return {
    id: Math.random().toString(36).substring(7),
    timestamp: Date.now(),
    query,
    agent,
    thoughts: [],
    result: "",
    success: false,
  };
}

function addThoughtStep(entry: ThoughtEntry, step: ThoughtEntry["thoughts"][0]): void {
  const duration = Date.now() - step.startTime;
  entry.thoughts.push({ ...step, duration });
}

function finalizeThoughtEntry(entry: ThoughtEntry, result: string, success: boolean): void {
  entry.result = result;
  entry.success = success;
  try {
    const history: ThoughtEntry[] = JSON.parse((typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( THOUGHT_HISTORY_KEY) || "[]");
    history.unshift(entry);
    if (history.length > 20) history.pop();
    if (typeof window !== "undefined") localStorage.setItem(THOUGHT_HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

async function documentPhase(
  query: string,
  response: string,
  plan: AgenticPlan,
  verification: AgenticVerification,
  latency: PipelineLatency,
  iotDevices?: string[]
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Log to Supabase for global learning
    await supabase.from("neural_learning_data").insert({
      user_id: user.id,
      input_text: query,
      output_text: response,
      interaction_type: plan.intent,
      quality_score: verification.score,
      metadata: {
        plan,
        verification,
        latency,
        iot_devices: iotDevices,
        protocol: _protocols[plan.intent],
      },
    } as any);

    // Sync protocols periodically (every 5 min)
    if (_protocolsDirty && Date.now() - _lastProtocolSync > 5 * 60 * 1000) {
      _lastProtocolSync = Date.now();
      _protocolsDirty = false;
      syncProtocolsToSupabase().catch(() => {});
    }
  } catch {}
}

async function syncProtocolsToSupabase(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const protocolsSummary = Object.values(_protocols)
      .map(p => `${p.intent}: avg=${p.avgQuality.toFixed(2)}, n=${p.sampleSize}, reg=${p.regressionCount}`)
      .join("; ");

    await supabase.from("neural_learning_data").insert({
      user_id: user.id,
      interaction_type: "protocol_sync",
      input_text: "Agentic protocols sync",
      output_text: protocolsSummary.slice(0, 1000),
      quality_score: 0.9,
      metadata: {
        protocol_count: Object.keys(_protocols).length,
        protocols: _protocols,
      },
    } as any);
  } catch {}
}

// ─── Orchestrator ───

export async function runAgenticCycle(
  query: string,
  executeAction: (plan: AgenticPlan) => Promise<string>,
  context?: { memories?: string[]; visionActive?: boolean; iotDevices?: string[] }
): Promise<{ response: string; plan: AgenticPlan; verification: AgenticVerification }> {
  // Load protocols on first run
  if (Object.keys(_protocols).length === 0) loadProtocols();

  // Phase 1: Plan
  const plan = planPhase(query, context);

  // [v3] Create thought journal entry
  const thought = createThoughtEntry(query, "orion-agentic");
  const planStart = Date.now();
  addThoughtStep(thought, {
    module: "planner", operation: "plan",
    input: query.slice(0, 200), output: `intent=${plan.intent}, steps=${plan.steps.length}`,
    startTime: planStart, confidence: plan.confidence,
  });

  // Phase 2: Act (delegated to caller)
  const actStart = Date.now();
  const response = await executeAction(plan);
  addThoughtStep(thought, {
    module: "executor", operation: "act",
    input: plan.intent, output: response.slice(0, 200),
    startTime: actStart, confidence: 0.8,
  });

  // Phase 3: Verify — now includes pipeline latency metrics
  const verifyStart = Date.now();
  const latency = getPipelineLatency();
  const verification = verifyPhase(query, response, plan, latency);
  addThoughtStep(thought, {
    module: "verifier", operation: "verify",
    input: response.slice(0, 100), output: `score=${verification.score.toFixed(2)}, issues=${verification.issues.length}, totalMs=${latency.totalMs}`,
    startTime: verifyStart, confidence: verification.score,
  });

  // Phase 4: Document (async, non-blocking) — includes latency + IoT context
  documentPhase(query, response, plan, verification, latency, context?.iotDevices).catch(() => {});

  // Phase 5: Learn
  learnPhase(query, response, plan, verification);

  // Phase 6: RAG Evaluation + Feedback Loop (async, non-blocking)
  runRAGEvaluation(query, response, plan.intent).catch(() => {});

  // Phase 7: Self-Improve via Jules (if verification fails repeatedly)
  triggerJulesSelfImprove(plan, verification).catch(() => {});

  // [v3] Finalize journal + voice evolution feedback
  finalizeThoughtEntry(thought, verification.passed ? "Ciclo concluído com sucesso" : "Ciclo com issues", verification.passed);

  // Log pipeline latency for performance monitoring
  if (latency.totalMs > 0) {
    console.log(
      `[Pipeline] STT: ${latency.sttMs}ms | LLM: ${latency.llmMs}ms | TTS: ${latency.ttsMs}ms | Vision: ${latency.visionMs}ms | Total: ${latency.totalMs}ms`
    );
  }

  return { response, plan, verification };
}

// ─── Known Speakers ───

export function getKnownSpeakers(): Record<string, { lastSeen: number; transcripts: number }> {
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( KNOWN_SPEAKERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

const KNOWN_SPEAKERS_KEY = "orion_known_speakers";

export function addKnownSpeaker(name: string): void {
  try {
    const speakers = getKnownSpeakers();
    speakers[name.toLowerCase()] = {
      lastSeen: Date.now(),
      transcripts: (speakers[name.toLowerCase()]?.transcripts || 0) + 1,
    };
    if (typeof window !== "undefined") localStorage.setItem(KNOWN_SPEAKERS_KEY, JSON.stringify(speakers));
  } catch {}
}

// ─── RAG Evaluation + Feedback Loop ───

async function runRAGEvaluation(query: string, response: string, intent: string): Promise<void> {
  try {
    // Only evaluate non-trivial responses
    if (response.length < 30 || query.length < 5) return;

    // ═══ ARC-AGI-3 RAG Consciousness Integration ═══
    const queryType = classifyQueryType(query);
    const currentWeights = getOptimizedWeights(queryType);
    const retrievedChunks = getRetrievedChunks();
    
    // Build retrieval context for consciousness
    const context: RetrievalContext = {
      queryType: queryType as "legal" | "vision" | "code" | "general",
      sessionHistory: [],
      recentEvals: [],
      timeOfDay: getTimeOfDay(),
    };
    
    // Activate consciousness if chunks available
    if (retrievedChunks && retrievedChunks.length > 0) {
      const consciousnessResult = activateRAGConsciousness(
        query,
        retrievedChunks,
        currentWeights,
        context
      );
      
      // Evaluate response with context
      const evalResult = evaluateRAGResponse({
        response,
        question: query,
        context: retrievedChunks.join("\n\n"),
      });
      
      // Try to solve any "puzzles" (retrieval issues)
      const puzzleSolution = solveRAGPuzzle(query, retrievedChunks, evalResult);
      
      // Adapt from evaluation
      adaptFromEvaluation(evalResult);
      
      // Submit feedback with adapted weights
      const newWeights = submitRAGFeedback(query, evalResult, consciousnessResult.adaptedWeights);

      const diag = getConsciousnessDiagnostics();
      
      console.log(
        `[RAG-Consciousness] ${intent} | State: ${diag.state} | Patterns: ${diag.patternCount} | ` +
        `Score: ${evalResult.overallScore}/100 (${evalResult.grade}) | ` +
        `Explanation: ${consciousnessResult.reasoningExplanation}`
      );
      
      // Log puzzle solution if found
      if (puzzleSolution) {
        console.log(`[RAG-Puzzle] Solved: ${puzzleSolution.pattern} → ${puzzleSolution.solution}`);
        recordExperientialEvent({
          type: "breakthrough",
          description: `Breakthrough: Resolvido enigma RAG [${puzzleSolution.pattern}] → ${puzzleSolution.solution}`,
          meta: { puzzle: puzzleSolution }
        });
      }
      
      return;
    }

    // Fallback: standard evaluation without consciousness
    const evalResult = evaluateRAGResponse({
      response,
      question: query,
      context: "",
    });

    if (evalResult.overallScore > 0) {
      const newWeights = submitRAGFeedback(query, evalResult, currentWeights);

      console.log(
        `[RAG-Eval] ${intent} | Score: ${evalResult.overallScore}/100 (${evalResult.grade}) | ` +
        `Groundedness: ${evalResult.groundedness.score}/5 | Relevance: ${evalResult.relevance.score}/5 | ` +
        `Weights: sem=${newWeights.semantic.toFixed(2)} kw=${newWeights.keyword.toFixed(2)} auth=${newWeights.authority.toFixed(2)} rec=${newWeights.recency.toFixed(2)}`
      );
    }
  } catch (e) {
    console.warn("[RAG-Eval] Evaluation failed:", e);
  }
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

// ─── Jules Self-Improvement Trigger ───

const JULES_FAIL_KEY = "orion_jules_fail_counts";

function getJulesFailCounts(): Record<string, number> {
  try { return JSON.parse((typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( JULES_FAIL_KEY) || "{}"); } catch { return {}; }
}

async function triggerJulesSelfImprove(plan: AgenticPlan, verification: AgenticVerification): Promise<void> {
  if (verification.passed) return;

  const counts = getJulesFailCounts();
  const key = plan.intent;
  counts[key] = (counts[key] || 0) + 1;
  if (typeof window !== "undefined") localStorage.setItem(JULES_FAIL_KEY, JSON.stringify(counts));

  // Only trigger Jules after 3+ consecutive failures for the same intent
  if (counts[key] < 3) return;

  // Classify domain for themed branches
  const domain = classifyDomain(plan.intent, verification.issues);
  const branchPrefix = domain === "bug" ? "fix/" : domain === "perf" ? "perf/" : domain === "security" ? "security/" : "design/";

  console.log(`[Orion→Jules] Intent "${key}" failed ${counts[key]}x (${domain}) — requesting self-improvement`);

  const task = `Fix recurring ${domain} issue with intent "${plan.intent}". ` +
    `Verification issues: ${verification.issues.join(", ")}. ` +
    `Steps attempted: ${plan.steps.join(", ")}. ` +
    `Domain: ${domain}. Improve the handler for this intent to achieve higher quality scores.`;

  const result = await orionSelfImprove({
    task,
    autoPR: true,
    subsystem: domain === "bug" ? "core_state" : domain === "perf" ? "perf_render" : domain === "security" ? "sec_auth_flow" : "design_responsive",
    branch: `${branchPrefix}jules-${key.slice(0, 20)}-${Date.now()}`,
    _internalAutoTrigger: true, // Auto-triggered by failure detection — no voice ID needed
  });

  if (result.success) {
    console.log(`[Orion→Jules] Session ${result.sessionId} created for self-improvement`);
    counts[key] = 0;
    if (typeof window !== "undefined") localStorage.setItem(JULES_FAIL_KEY, JSON.stringify(counts));
  }
}

function classifyDomain(intent: string, issues: string[]): "bug" | "perf" | "design" | "security" {
  const combined = `${intent} ${issues.join(" ")}`.toLowerCase();
  if (combined.includes("security") || combined.includes("rls") || combined.includes("auth") || combined.includes("xss")) return "security";
  if (combined.includes("slow") || combined.includes("performance") || combined.includes("memory") || combined.includes("latency")) return "perf";
  if (combined.includes("layout") || combined.includes("responsive") || combined.includes("ui") || combined.includes("design") || combined.includes("a11y")) return "design";
  return "bug";
}

// Initialize protocols on module load
// loadProtocols();
