/**
 * ─── Orion Agentic Loop (Plan → Act → Verify → Document → Learn) ───
 * Replicates Lovable's reasoning cycle within Orion's cognitive architecture.
 * Each interaction passes through structured phases for quality assurance
 * and continuous self-improvement.
 */

import { supabase } from "@/integrations/supabase/client";
import { orionSelfImprove } from "./jules-client";
import { logAgentAction } from "./orion-network-registry";
import { classifyIntent } from "./orion-ai-client";
import { smartClassifySync } from "./smart-intent-classifier";
import { addCausalNode, addCausalLink } from "./causal-reasoning";
import { recordLearningOutcome } from "./meta-learning";
import { updateFromInteraction } from "./theory-of-mind";
import { getAgenteEu } from "./agents/self-model-agent";
import { createThoughtEntry, addThoughtStep, finalizeThoughtEntry } from "./orion-journal";
import { feedUserSpeech, feedAIResponse } from "./voice-evolution-feedback";
import { isNegativeFeedback, recordCorrection, extractCorrectionTarget } from "./intent-feedback";
import { smartClassify } from "./smart-intent-classifier";
import { evaluateRAGResponse } from "./rag-evaluator";
import { submitRAGFeedback, getOptimizedWeights, classifyQueryType } from "./rag-feedback-loop";
import { activateRAGConsciousness, solveRAGPuzzle, adaptFromEvaluation, getConsciousnessDiagnostics, type RetrievalContext } from "./rag-consciousness";
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
  responseLength: number;
  coherenceWithIntent: boolean;
}

export interface AgenticProtocol {
  intent: string;
  recommendedStrategy: string;
  avgQuality: number;
  sampleSize: number;
  lastUpdated: number;
  regressionCount: number;
}

// ─── Protocol Storage ───

const PROTOCOLS_KEY = "orion_agentic_protocols";
const KNOWN_SPEAKERS_KEY = "orion_known_speakers";

let _protocols: Record<string, AgenticProtocol> = {};
let _protocolsDirty = false;
let _lastProtocolSync = 0;

export function loadProtocols(): Record<string, AgenticProtocol> {
  try {
    const raw = localStorage.getItem(PROTOCOLS_KEY);
    if (raw) _protocols = JSON.parse(raw);
  } catch {}
  return _protocols;
}

export function saveProtocols(): void {
  try {
    localStorage.setItem(PROTOCOLS_KEY, JSON.stringify(_protocols));
  } catch {}
}

export function getProtocol(intent: string): AgenticProtocol | null {
  return _protocols[intent] || null;
}

export function updateProtocol(intent: string, score: number): void {
  const existing = _protocols[intent];
  if (!existing) {
    _protocols[intent] = {
      intent,
      recommendedStrategy: "default",
      avgQuality: score,
      sampleSize: 1,
      lastUpdated: Date.now(),
      regressionCount: 0,
    };
  } else {
    const newAvg = (existing.avgQuality * existing.sampleSize + score) / (existing.sampleSize + 1);
    if (score < existing.avgQuality - 0.15) {
      existing.regressionCount++;
    }
    existing.avgQuality = newAvg;
    existing.sampleSize++;
    existing.lastUpdated = Date.now();
  }
  _protocolsDirty = true;
  saveProtocols();
}

// ─── Phase 1: Plan ───

export function planPhase(query: string, context?: { memories?: string[]; visionActive?: boolean }): AgenticPlan {
  // Use unified smart classifier (regex fast-path)
  const smartResult = smartClassifySync(query);
  let intent = smartResult?.intent || "general";
  
  // Check if user is giving negative feedback about the last classification
  if (isNegativeFeedback(query) && _lastClassification && Date.now() - _lastClassification.ts < 120_000) {
    const correctionTarget = extractCorrectionTarget(query);
    if (correctionTarget) {
      // Re-classify the correction target to find the correct intent
      const correctedResult = smartClassifySync(correctionTarget);
      if (correctedResult) {
        recordCorrection(_lastClassification.text, _lastClassification.intent, correctedResult.intent);
        intent = correctedResult.intent;
        console.log(`[AgenticLoop] Feedback correction: "${_lastClassification.text}" → ${correctedResult.intent}`);
      }
    }
    // Return a feedback-aware plan
    return {
      intent: intent === "general" ? "feedback_correction" : intent,
      steps: ["Registrar correção do usuário", "Re-classificar intenção", "Executar ação corrigida"],
      risks: [],
      confidence: 0.9,
      requiresImage: false,
      timestamp: Date.now(),
    };
  }

  // If smart classifier didn't match, fall back to legacy regex for backward compat
  if (intent === "general") {
    const qLow = query.toLowerCase();
    // Expanded vision detection — catches 200+ natural vision phrases
    if (
      /o\s+que\s+(voc[eê]|vc|tu|c[eê])\s+(v[eê]|enxerga|est[aá]\s+vendo|consegue\s+ver|t[aá]\s+vendo)/i.test(qLow) ||
      /como\s+(eu\s+)?(estou|tou|t[oô]|fico|fiquei)/i.test(qLow) ||
      /o\s+que\s+(voc[eê]|vc|tu|c[eê])\s+(acha|achou|pensa)/i.test(qLow) ||
      /o\s+que\s+(t[aá]|est[aá])\s+(escrit[oa]|escrevendo|mostrando|aparecendo)/i.test(qLow) ||
      /o\s+que\s+[eé]\s+(isso|aquilo|isto|essa|esse)/i.test(qLow) ||
      /o\s+que\s+(eu\s+)?(estou|tou|t[oô])\s+(segurando|usando|vestindo|comendo|fazendo|mostrando|lendo|carregando|jogando|mexendo|digitando)/i.test(qLow) ||
      /(me\s+)?descrev[ae]|l[eê][ia]?\s+(isso|aquilo|o\s+que)/i.test(qLow) ||
      /tem\s+(algo|algu[eé]m|alguma\s+coisa).*(aqui|a[ií]|perto)/i.test(qLow) ||
      /quant[oa]s?\s+\w+\s+(tem|voc[eê]\s+v[eê]|est[aã]o)/i.test(qLow) ||
      /(qual|que)\s+cor/i.test(qLow) ||
      /(onde|aonde)\s+(est[aá]|t[aá]|fica)/i.test(qLow) ||
      /(olh[ae]|veja|observe|analise)\s+(isso|aquilo|aqui|pra)/i.test(qLow) ||
      /(voc[eê]|vc|tu)\s+(consegue|pode|d[aá]\s+pra)\s+(ver|enxergar|ler|identificar|reconhecer|detectar)/i.test(qLow) ||
      /(na|nessa)\s+(foto|imagem|tela|c[aâ]mera)/i.test(qLow) ||
      /(que|qual)\s+(marca|modelo|tipo|esp[eé]cie|ra[çc]a)/i.test(qLow) ||
      /tem\s+(texto|n[uú]mero|c[oó]digo|qr|placa|etiqueta)/i.test(qLow) ||
      /(voc[eê]|vc|tu)\s+(me\s+)?(v[eê]|enxerga|est[aá]\s+(me\s+)?vendo)/i.test(qLow) ||
      /(identific|reconhec|detect|analis[ae]r?\s+(iss[oa]|est[ea]|imagem|foto|cena))/i.test(qLow) ||
      /(tir[ae]|bat[ae]|captur[ae])\s+(uma?\s+)?(foto|imagem)/i.test(qLow)
    ) {
      intent = "vision_describe";
    } else if (/quem\s+([eé]|sou)|reconhec/i.test(qLow)) {
      intent = "identity";
    }
  }
  
  // Store last classification for feedback loop
  setLastClassification(query, intent);

  const requiresImage = ["vision_describe", "vision_object", "identity"].includes(intent);

  const steps = [
    `Classificar intent: ${intent}`,
    requiresImage ? "Capturar frame da câmera" : "Usar contexto textual",
    "Enviar para pipeline de IA",
    "Validar resposta",
    "Documentar e aprender",
  ];

  const risks: string[] = [];
  if (requiresImage && !context?.visionActive) risks.push("Câmera pode não estar ativa");
  if (intent === "auto_construct") risks.push("Requer verificação de proprietário");
  if (intent === "self_evolve") risks.push("Processo demorado (5 fases)");
  if (intent === "security") risks.push("Acesso restrito ao proprietário");
  if (intent === "legal") risks.push("Verificar fontes — risco de alucinação jurídica");

  const protocol = getProtocol(intent);
  const confidence = protocol ? Math.min(0.95, protocol.avgQuality) : 0.6;

  // Protocol: log agent reasoning before acting
  logAgentAction("analysis", "PLAN", `Intent: ${intent}, confidence: ${confidence.toFixed(2)}, risks: ${risks.join("; ") || "none"}`, confidence);

  return { intent, steps, risks, confidence, requiresImage, timestamp: Date.now() };
}

// ─── Phase 2: Verify ───

const HALLUCINATION_KEYWORDS = [
  "como modelo de linguagem", "não tenho acesso", "não posso ver",
  "sou apenas um programa", "não sou capaz de", "error 500",
];

export function verifyPhase(
  query: string,
  response: string,
  plan: AgenticPlan,
  latency?: PipelineLatency
): AgenticVerification {
  const issues: string[] = [];
  let score = 0.7;

  // Length check
  const responseLength = response.length;
  if (responseLength < 10) {
    issues.push("Resposta muito curta");
    score -= 0.2;
  }
  if (responseLength > 3000) {
    issues.push("Resposta excessivamente longa");
    score -= 0.1;
  }

  // Hallucination check
  const rLow = response.toLowerCase();
  for (const kw of HALLUCINATION_KEYWORDS) {
    if (rLow.includes(kw)) {
      issues.push(`Possível alucinação: "${kw}"`);
      score -= 0.15;
      break;
    }
  }

  // Coherence with intent
  let coherenceWithIntent = true;
  if (plan.intent === "vision_object" && !/\b(vejo|segurando|objeto|mão)\b/i.test(response)) {
    coherenceWithIntent = false;
    issues.push("Resposta pode não estar focada no objeto perguntado");
    score -= 0.1;
  }
  if (plan.intent === "vision_describe" && response.length < 30) {
    coherenceWithIntent = false;
    issues.push("Descrição visual muito breve");
    score -= 0.1;
  }

  // Pipeline latency quality checks (STT/TTS/Vision)
  if (latency) {
    if (latency.sttMs > 3000) {
      issues.push(`STT lento: ${latency.sttMs}ms (>3s)`);
      score -= 0.05;
    }
    if (latency.ttsMs > 2000) {
      issues.push(`TTS lento: ${latency.ttsMs}ms (>2s)`);
      score -= 0.05;
    }
    if (latency.visionMs > 4000) {
      issues.push(`Vision lento: ${latency.visionMs}ms (>4s)`);
      score -= 0.05;
    }
    if (latency.totalMs > 5000) {
      issues.push(`Pipeline total lento: ${latency.totalMs}ms (>5s)`);
      score -= 0.1;
    }
    // Vision intent without vision latency = camera possibly not working
    if (plan.requiresImage && latency.visionMs <= 0) {
      issues.push("Intent visual sem dados de visão — câmera inativa?");
      score -= 0.1;
    }
  }

  score = Math.max(0, Math.min(1, score));
  const passed = score >= 0.4 && issues.length <= 2;

  // Protocol: Operation Overseer logs verification result
  logAgentAction("operation_overseer", "VERIFY", `Score: ${score.toFixed(2)}, passed: ${passed}, issues: ${issues.join("; ") || "none"}`, score);

  return { passed, score, issues, responseLength, coherenceWithIntent };
}

// ─── Phase 3: Document ───

export async function documentPhase(
  query: string,
  response: string,
  plan: AgenticPlan,
  verification: AgenticVerification,
  latency?: PipelineLatency,
  iotDevices?: string[]
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("neural_learning_data").insert({
      user_id: user.id,
      interaction_type: "agentic_cycle",
      input_text: query.slice(0, 500),
      output_text: response.slice(0, 1000),
      quality_score: verification.score,
      metadata: {
        plan_intent: plan.intent,
        plan_confidence: plan.confidence,
        plan_steps: plan.steps.length,
        plan_risks: plan.risks,
        verification_passed: verification.passed,
        verification_issues: verification.issues,
        verification_coherence: verification.coherenceWithIntent,
        response_length: verification.responseLength,
        latency_ms: Date.now() - plan.timestamp,
        protocol_version: "2.0",
        // Pipeline latency breakdown
        pipeline_stt_ms: latency?.sttMs ?? -1,
        pipeline_llm_ms: latency?.llmMs ?? -1,
        pipeline_tts_ms: latency?.ttsMs ?? -1,
        pipeline_vision_ms: latency?.visionMs ?? -1,
        pipeline_total_ms: latency?.totalMs ?? -1,
        // IoT context
        iot_devices_active: iotDevices?.length ?? 0,
        iot_devices: iotDevices?.slice(0, 10),
      },
    } as any);
  } catch (e) {
    console.warn("[AgenticLoop] Document phase failed:", e);
  }
}

// ─── Phase 4: Learn ───

export function learnPhase(
  query: string,
  response: string,
  plan: AgenticPlan,
  verification: AgenticVerification
): void {
  // 1. Update protocol for this intent
  updateProtocol(plan.intent, verification.score);

  // 2. Record in Agente-Eu autobiographical memory
  try {
    const eu = getAgenteEu();
    const outcome = verification.passed ? "success" : "failure";
    eu.recordMemory(
      `Ciclo agentic: intent=${plan.intent}, score=${verification.score.toFixed(2)}, issues=${verification.issues.length}`,
      outcome
    );
  } catch {}

  // 3. Sync protocols to Supabase periodically (every 5 min)
  if (_protocolsDirty && Date.now() - _lastProtocolSync > 5 * 60 * 1000) {
    _lastProtocolSync = Date.now();
    _protocolsDirty = false;
    syncProtocolsToSupabase().catch(() => {});
  }
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
  feedUserSpeech(query);
  feedAIResponse(response);

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
    const raw = localStorage.getItem(KNOWN_SPEAKERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function addKnownSpeaker(name: string): void {
  try {
    const speakers = getKnownSpeakers();
    speakers[name.toLowerCase()] = {
      lastSeen: Date.now(),
      transcripts: (speakers[name.toLowerCase()]?.transcripts || 0) + 1,
    };
    localStorage.setItem(KNOWN_SPEAKERS_KEY, JSON.stringify(speakers));
  } catch {}
}

// ─── RAG Evaluation + Feedback Loop ───

async function runRAGEvaluation(query: string, response: string, intent: string): Promise<void> {
  try {
    // Only evaluate non-trivial responses
    if (response.length < 30 || query.length < 5) return;

    // ═══ ARC-AGI-2 RAG Consciousness Integration ═══
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
  try { return JSON.parse(localStorage.getItem(JULES_FAIL_KEY) || "{}"); } catch { return {}; }
}

async function triggerJulesSelfImprove(plan: AgenticPlan, verification: AgenticVerification): Promise<void> {
  if (verification.passed) return;

  const counts = getJulesFailCounts();
  const key = plan.intent;
  counts[key] = (counts[key] || 0) + 1;
  localStorage.setItem(JULES_FAIL_KEY, JSON.stringify(counts));

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
    localStorage.setItem(JULES_FAIL_KEY, JSON.stringify(counts));
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
loadProtocols();
