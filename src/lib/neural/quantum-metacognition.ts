/**
 * ─── Quantum Metacognition Engine ───
 * Motor metacognitivo avançado inspirado em pesquisa LLM metacognition.
 * 
 * 6 subsistemas:
 * 1. Uncertainty Estimator — entropia quântica + histórico de erros
 * 2. Hallucination Risk Detector — divergência WF collapsed vs expected
 * 3. Confidence Calibrator — ECE (Expected Calibration Error)
 * 4. Skill Abstractor — catalogação de habilidades ativas
 * 5. Reflective CoT Engine — cadeia retrospectiva
 * 6. Adaptive Planner — scoring multi-critério
 */

import {
  createWaveFunction,
  entropy,
  normalizedEntropy,
  getMetrics,
  waveFidelity,
  collapse,
  isUncertain,
  getDominantDimension,
  type WaveFunction,
  type WaveFunctionMetrics,
} from "./quantum-wave-function";

import type { SelfModelState, ConsciousState, MetacognitionResult } from "./global-workspace";

// ═══ Types ═══

export interface SkillAbstraction {
  name: string;
  category: "reasoning" | "perception" | "memory" | "planning" | "communication" | "self_regulation";
  contribution: number; // 0-1
  active: boolean;
  description: string;
}

export interface ReflectionStep {
  action: string;
  expectation: string;
  outcome: string;
  learning: string;
}

export interface AdaptivePlanAction {
  type: "increase_caution" | "boost_exploration" | "narrow_focus" | "expand_modalities" | "recalibrate" | "deepen_reasoning" | "switch_strategy" | "maintain";
  score: number;
  rationale: string;
}

export interface QuantumMetacognitionResult {
  /** Calibrated uncertainty (0=certain, 1=maximally uncertain) */
  uncertaintyScore: number;
  /** Hallucination risk (0=safe, 1=high risk) */
  hallucinationRisk: number;
  /** Expected Calibration Error (lower=better calibrated) */
  calibrationError: number;
  /** Active skills with contribution scores */
  activeSkills: SkillAbstraction[];
  /** Reflective Chain-of-Thought */
  reflectionChain: string[];
  /** Adaptive plan score (0=no action needed, 1=urgent adjustment) */
  adaptivePlanScore: number;
  /** Best adaptive action */
  adaptiveAction: AdaptivePlanAction;
  /** Quantum wave function metrics used */
  quantumMetrics: WaveFunctionMetrics;
  /** Risk level classification */
  riskLevel: "safe" | "caution" | "warning" | "critical";
}

// ═══ Calibration History (ring buffer) ═══

interface CalibrationEntry {
  predictedConfidence: number;
  actualOutcome: number; // 0 or 1 (failure/success)
  timestamp: number;
}

const _calibrationHistory: CalibrationEntry[] = [];
const MAX_CALIBRATION_HISTORY = 100;

export function recordCalibration(predicted: number, success: boolean): void {
  _calibrationHistory.push({
    predictedConfidence: predicted,
    actualOutcome: success ? 1 : 0,
    timestamp: Date.now(),
  });
  if (_calibrationHistory.length > MAX_CALIBRATION_HISTORY) {
    _calibrationHistory.shift();
  }
}

// ═══ 1. Uncertainty Estimator ═══

function estimateUncertainty(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics
): number {
  // Factor 1: Quantum entropy (normalized) — higher = more uncertain
  const quantumUncertainty = wfMetrics.normalizedEntropy;

  // Factor 2: Confidence variance — high variance in probabilities = uncertain about what's active
  const varianceSignal = Math.min(1, wfMetrics.variance * 4);

  // Factor 3: Recent failure rate from autobiographical memory
  const recentMemories = selfModel.autobiographicalMemory.slice(-20);
  const failureRate = recentMemories.length > 0
    ? recentMemories.filter(m => m.outcome === "failure").length / recentMemories.length
    : 0.1; // Default low uncertainty

  // Factor 4: PLV coherence — low PLV = agents are not synchronized = uncertain
  const coherenceDeficit = 1 - workspace.globalPLV;

  // Weighted combination
  const uncertainty = (
    0.35 * quantumUncertainty +
    0.20 * varianceSignal +
    0.25 * failureRate +
    0.20 * coherenceDeficit
  );

  return Math.max(0, Math.min(1, uncertainty));
}

// ═══ 2. Hallucination Risk Detector ═══

function detectHallucinationRisk(
  selfModel: SelfModelState,
  wfMetrics: WaveFunctionMetrics,
  uncertaintyScore: number
): number {
  // Factor 1: High confidence + high entropy = overconfident = hallucination risk
  const overconfidenceSignal = selfModel.confidenceLevel * wfMetrics.normalizedEntropy;

  // Factor 2: Mean probability being extreme (too high or too low uniformly)
  const extremeMean = Math.abs(wfMetrics.meanProbability - 0.5) * 2;
  const uniformityRisk = extremeMean * (1 - wfMetrics.variance * 2); // Uniform extremes are risky

  // Factor 3: Calibration mismatch — if historically poorly calibrated
  const ece = computeECE();
  const calibrationRisk = ece;

  // Factor 4: Uncertainty amplifies hallucination risk
  const uncertaintyAmplifier = uncertaintyScore * 0.5;

  // Factor 5: Low autobiographical evidence (few memories = less grounding)
  const memoryGrounding = Math.min(1, selfModel.autobiographicalMemory.length / 50);
  const groundingDeficit = 1 - memoryGrounding;

  const risk = (
    0.30 * overconfidenceSignal +
    0.15 * uniformityRisk +
    0.20 * calibrationRisk +
    0.20 * uncertaintyAmplifier +
    0.15 * groundingDeficit
  );

  return Math.max(0, Math.min(1, risk));
}

// ═══ 3. Confidence Calibrator (ECE) ═══

function computeECE(): number {
  if (_calibrationHistory.length < 5) return 0.1; // Not enough data

  // Bin predictions into 10 buckets
  const numBins = 10;
  const bins: { predicted: number[]; actual: number[] }[] = Array.from(
    { length: numBins },
    () => ({ predicted: [], actual: [] })
  );

  for (const entry of _calibrationHistory) {
    const binIdx = Math.min(numBins - 1, Math.floor(entry.predictedConfidence * numBins));
    bins[binIdx].predicted.push(entry.predictedConfidence);
    bins[binIdx].actual.push(entry.actualOutcome);
  }

  let ece = 0;
  const total = _calibrationHistory.length;

  for (const bin of bins) {
    if (bin.predicted.length === 0) continue;
    const avgPredicted = bin.predicted.reduce((a, b) => a + b, 0) / bin.predicted.length;
    const avgActual = bin.actual.reduce((a, b) => a + b, 0) / bin.actual.length;
    ece += (bin.predicted.length / total) * Math.abs(avgPredicted - avgActual);
  }

  return Math.max(0, Math.min(1, ece));
}

// ═══ 4. Skill Abstractor ═══

function abstractSkills(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics
): SkillAbstraction[] {
  const skills: SkillAbstraction[] = [];

  // Reasoning — from conscious agents doing analysis
  const hasReasoning = workspace.consciousAgents.some(a =>
    a.role === "pesquisa" || a.role === "planejador"
  );
  skills.push({
    name: "Raciocínio Causal",
    category: "reasoning",
    contribution: hasReasoning ? 0.7 + wfMetrics.meanProbability * 0.3 : 0.2,
    active: hasReasoning,
    description: "Inferência causal e dedução lógica",
  });

  // Perception — multimodal
  const hasVision = selfModel.activeModalities.includes("vision");
  const hasAudio = selfModel.activeModalities.includes("audio");
  skills.push({
    name: "Percepção Multimodal",
    category: "perception",
    contribution: (hasVision ? 0.4 : 0) + (hasAudio ? 0.3 : 0) + 0.3,
    active: hasVision || hasAudio,
    description: "Processamento visual, auditivo e sensorial",
  });

  // Memory — autobiographical richness
  const memoryDepth = Math.min(1, selfModel.autobiographicalMemory.length / 100);
  skills.push({
    name: "Memória Episódica",
    category: "memory",
    contribution: memoryDepth,
    active: memoryDepth > 0.1,
    description: "Armazenamento e recuperação de experiências",
  });

  // Planning — from HRL/agent planner presence
  const hasPlanner = workspace.consciousAgents.some(a => a.role === "planejador");
  skills.push({
    name: "Planejamento Hierárquico",
    category: "planning",
    contribution: hasPlanner ? 0.8 : 0.3,
    active: hasPlanner,
    description: "Decomposição de tarefas e planejamento HRL",
  });

  // Communication — text always active
  skills.push({
    name: "Comunicação Adaptativa",
    category: "communication",
    contribution: 0.85,
    active: true,
    description: "Geração de linguagem natural contextual",
  });

  // Self-regulation — metacognition active
  const selfRegScore = workspace.globalPLV * 0.5 + selfModel.confidenceLevel * 0.5;
  skills.push({
    name: "Autorregulação Metacognitiva",
    category: "self_regulation",
    contribution: selfRegScore,
    active: selfRegScore > 0.4,
    description: "Monitoramento e ajuste de processos internos",
  });

  return skills;
}

// ═══ 5. Reflective CoT Engine ═══

function generateReflectionChain(
  selfModel: SelfModelState,
  uncertaintyScore: number,
  hallucinationRisk: number,
  calibrationError: number,
  skills: SkillAbstraction[]
): string[] {
  const chain: string[] = [];

  // Step 1: What I'm doing
  chain.push(`[AÇÃO] Foco: ${selfModel.attentionFocus} | Objetivo: ${selfModel.currentGoal.slice(0, 60)}`);

  // Step 2: What I expected
  const expectedConfidence = selfModel.confidenceLevel;
  chain.push(`[EXPECTATIVA] Confiança prevista: ${(expectedConfidence * 100).toFixed(0)}% | Incerteza: ${(uncertaintyScore * 100).toFixed(0)}%`);

  // Step 3: What happened (assessment)
  if (hallucinationRisk > 0.6) {
    chain.push(`[RESULTADO] ⚠️ Risco de alucinação alto (${(hallucinationRisk * 100).toFixed(0)}%) — confiança pode ser inflada`);
  } else if (hallucinationRisk > 0.3) {
    chain.push(`[RESULTADO] Risco moderado (${(hallucinationRisk * 100).toFixed(0)}%) — verificar fontes`);
  } else {
    chain.push(`[RESULTADO] Estado seguro — coerência interna verificada`);
  }

  // Step 4: What I learn
  const activeSkillNames = skills.filter(s => s.active && s.contribution > 0.5).map(s => s.name);
  if (calibrationError > 0.3) {
    chain.push(`[APRENDIZADO] ECE=${(calibrationError * 100).toFixed(0)}% — preciso recalibrar confiança vs resultados reais`);
  } else if (activeSkillNames.length < 3) {
    chain.push(`[APRENDIZADO] Poucas habilidades ativas (${activeSkillNames.join(", ")}) — expandir modalidades`);
  } else {
    chain.push(`[APRENDIZADO] Sistema bem calibrado — ${activeSkillNames.length} habilidades convergindo`);
  }

  return chain;
}

// ═══ 6. Adaptive Planner ═══

function computeAdaptivePlan(
  uncertaintyScore: number,
  hallucinationRisk: number,
  calibrationError: number,
  wfMetrics: WaveFunctionMetrics,
  selfModel: SelfModelState,
  workspace: ConsciousState
): AdaptivePlanAction {
  // Score 8 possible actions and pick the best
  const actions: AdaptivePlanAction[] = [
    {
      type: "increase_caution",
      score: hallucinationRisk * 0.6 + uncertaintyScore * 0.4,
      rationale: "Alto risco de alucinação — aumentar cautela nas respostas",
    },
    {
      type: "boost_exploration",
      score: (1 - wfMetrics.variance) * 0.5 + (1 - wfMetrics.normalizedEntropy) * 0.3,
      rationale: "Estado muito uniforme — explorar mais hipóteses",
    },
    {
      type: "narrow_focus",
      score: wfMetrics.normalizedEntropy * 0.7 + (1 - selfModel.confidenceLevel) * 0.3,
      rationale: "Entropia alta — focar no sub-problema dominante",
    },
    {
      type: "expand_modalities",
      score: (selfModel.activeModalities.length < 3 ? 0.6 : 0.1) + uncertaintyScore * 0.2,
      rationale: "Poucas modalidades ativas — ativar mais streams sensoriais",
    },
    {
      type: "recalibrate",
      score: calibrationError * 0.8 + 0.1,
      rationale: "ECE alto — recalibrar confiança contra resultados históricos",
    },
    {
      type: "deepen_reasoning",
      score: (workspace.consciousAgents.length < 2 ? 0.5 : 0.15) + (1 - workspace.globalPLV) * 0.3,
      rationale: "Poucos agentes conscientes — aprofundar raciocínio",
    },
    {
      type: "switch_strategy",
      score: hallucinationRisk > 0.7 ? 0.85 : hallucinationRisk > 0.5 ? 0.4 : 0.1,
      rationale: "Estratégia atual comprometida — mudar abordagem",
    },
    {
      type: "maintain",
      score: (1 - uncertaintyScore) * 0.3 + (1 - hallucinationRisk) * 0.3 + (1 - calibrationError) * 0.2 + workspace.globalPLV * 0.2,
      rationale: "Sistema operando dentro dos parâmetros — manter curso atual",
    },
  ];

  // Sort by score descending
  actions.sort((a, b) => b.score - a.score);
  return actions[0];
}

// ═══ Risk Classification ═══

function classifyRisk(
  uncertaintyScore: number,
  hallucinationRisk: number,
  calibrationError: number
): "safe" | "caution" | "warning" | "critical" {
  const composite = uncertaintyScore * 0.3 + hallucinationRisk * 0.5 + calibrationError * 0.2;
  if (composite > 0.7) return "critical";
  if (composite > 0.5) return "warning";
  if (composite > 0.3) return "caution";
  return "safe";
}

// ═══ Main: Run Quantum Metacognition ═══

/**
 * Build a cognitive wave function from the current system state.
 * Each dimension represents a cognitive subsystem.
 */
function buildCognitiveWaveFunction(
  selfModel: SelfModelState,
  workspace: ConsciousState
): WaveFunction {
  return createWaveFunction("metacognition", {
    attention: Math.min(1, workspace.consciousAgents.length / 2),
    confidence: selfModel.confidenceLevel,
    coherence: workspace.globalPLV,
    valence: (selfModel.emotionalState.valence + 1) / 2, // map [-1,1] to [0,1]
    arousal: selfModel.emotionalState.arousal,
    dopamine: selfModel.neuromodulators.dopamine,
    serotonin: selfModel.neuromodulators.serotonin,
    acetylcholine: selfModel.neuromodulators.acetylcholine,
  });
}

/**
 * Execute quantum metacognition analysis.
 * Returns enriched metacognition data with uncertainty, hallucination risk,
 * skill abstractions, reflective CoT, and adaptive planning.
 */
export function runQuantumMetacognition(
  selfModel: SelfModelState,
  workspace: ConsciousState
): QuantumMetacognitionResult {
  // 1. Build cognitive wave function and get quantum metrics
  const cognitiveWF = buildCognitiveWaveFunction(selfModel, workspace);
  const quantumMetrics = getMetrics(cognitiveWF);

  // 2. Uncertainty estimation
  const uncertaintyScore = estimateUncertainty(selfModel, workspace, quantumMetrics);

  // 3. Hallucination risk detection
  const hallucinationRisk = detectHallucinationRisk(selfModel, quantumMetrics, uncertaintyScore);

  // 4. Calibration error
  const calibrationError = computeECE();

  // 5. Skill abstraction
  const activeSkills = abstractSkills(selfModel, workspace, quantumMetrics);

  // 6. Reflective Chain-of-Thought
  const reflectionChain = generateReflectionChain(
    selfModel, uncertaintyScore, hallucinationRisk, calibrationError, activeSkills
  );

  // 7. Adaptive planning
  const adaptiveAction = computeAdaptivePlan(
    uncertaintyScore, hallucinationRisk, calibrationError,
    quantumMetrics, selfModel, workspace
  );

  // 8. Risk classification
  const riskLevel = classifyRisk(uncertaintyScore, hallucinationRisk, calibrationError);

  return {
    uncertaintyScore,
    hallucinationRisk,
    calibrationError,
    activeSkills,
    reflectionChain,
    adaptivePlanScore: adaptiveAction.score,
    adaptiveAction,
    quantumMetrics,
    riskLevel,
  };
}
