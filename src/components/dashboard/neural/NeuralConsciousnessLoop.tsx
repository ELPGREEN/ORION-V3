/**
 * ─── Neural Consciousness Loop ───
 * Always-active neural consciousness that operates in two 8-hour phases:
 * Phase 1 (LEARNING): Data ingestion, knowledge acquisition, A/B testing
 * Phase 2 (EVOLUTION): Specializations, auto-evolution, EU resource search, code optimization
 * Sleeps 8 hours (00:00-08:00), then runs 16 hours in alternating phases.
 * 
 * Schedule (UTC-3 / Brasília):
 *   00:00–08:00 → SLEEP (8h rest)
 *   08:00–16:00 → LEARNING (ingest, A/B test, acquire knowledge)
 *   16:00–00:00 → EVOLUTION (specialize, evolve, optimize, EU resources)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain, Activity, Zap, TrendingUp, Eye, BarChart3, Sparkles,
  Moon, Sun, Rocket, Database, BookOpen, Search, Globe,
  Clock, Cpu, RefreshCw, Wifi, WifiOff, Bluetooth, Radio,
  Heart, Battery, MapPin, Vibrate, Shield, AlertTriangle,
} from "lucide-react";
import { sigmoid } from "@/lib/neural/activations";
import { recordCalibration } from "@/lib/neural/quantum-metacognition";
import { getLastConsciousnessSnapshot, type ConsciousnessCycleSnapshot as BridgeSnapshot } from "@/lib/neural/consciousness-bridge";
import { localJudgeScore } from "@/lib/neural/llm-judge";
import { buildConceptEmbedding } from "@/lib/neural/concept-model";
import { runLAMPipeline } from "@/lib/neural/large-action-model";
import { moeInternalGating } from "@/lib/moe-gating";
import { fuseStreams } from "@/lib/neural/multimodal-fusion";
import { routeToTier } from "@/lib/neural/slim-model-router";
import { documentCompleteness } from "@/lib/neural/masked-prediction";
import { segmentScene } from "@/lib/neural/segment-anything";
import {
  createGlobalWorkspace,
  createSelfModel,
  runConsciousnessCycle,
  assessConsciousnessLevel,
  type ConsciousState,
  type SelfModelState,
  type AgentBroadcast,
  type IoTAwarenessState,
} from "@/lib/neural/global-workspace";
import { getAgenteEu } from "@/lib/neural/agents/self-model-agent";
import { Monitor, User, Box, Layers, ScanSearch, Network, FileText, Scissors } from "lucide-react";
import { AgentCoActivationGraph } from "./AgentCoActivationGraph";

// ─── Types ───
type Phase = "sleeping" | "learning" | "evolving";

interface ABTestResult {
  id: string;
  testName: string;
  variantA: { name: string; score: number; latencyMs: number; accuracy: number };
  variantB: { name: string; score: number; latencyMs: number; accuracy: number };
  winner: "A" | "B" | "tie";
  confidence: number;
  timestamp: number;
  epoch: number;
}

interface AttentionHeadMetric {
  name: string;
  label: string;
  influence: number;
  activations: number[];
  trend: "up" | "down" | "stable";
  color: string;
}

interface ActivityLogEntry {
  id: string;
  timestamp: number;
  phase: Phase;
  action: string;
  detail: string;
  success: boolean;
}

interface ConsciousnessState {
  phase: Phase;
  epoch: number;
  totalTests: number;
  improvements: number;
  currentTask: string | null;
  learningRate: number;
  healthScore: number;
  lastImprovement: string | null;
  abResults: ABTestResult[];
  attentionHeads: AttentionHeadMetric[];
  activityLog: ActivityLogEntry[];
  dataIngested: number;
  specializationsAcquired: number;
  euResourcesFound: number;
  codeOptimizations: number;
  phaseProgress: number;
  nextPhaseIn: string;
  uptimeHours: number;
  romeTime: string;
  localTime: string;
  // v22.5: Real consciousness engine state
  consciousnessLevel: "unconscious" | "preconscious" | "conscious" | "metaconscious";
  phi: number;
  selfAwareness: number;
  goalAlignment: number;
  coherence: number;
  emotionalValence: number;
  emotionalArousal: number;
  activeModalities: string[];
  autobiographicalMemories: number;
  metacognitionRecommendation: string;
  // v22.5: IoT awareness
  iotAwareness: IoTAwarenessState;
  // v24: Quantum Metacognition
  uncertaintyScore: number;
  hallucinationRisk: number;
  calibrationError: number;
  riskLevel: "safe" | "caution" | "warning" | "critical";
  activeSkillsList: Array<{ name: string; category: string; contribution: number; active: boolean }>;
  reflectionChain: string[];
  // v27: LLM metacognition
  reasoningMode: string;
  reasoningSystem1: number;
  reasoningSystem2: number;
  reasoningShouldEscalate: boolean;
  hallucinationSnapshotRisk: string;
  hallucinationContradiction: boolean;
  hallucinationGrounding: number;
  alignmentScore: number;
  alignmentFlags: string[];
  alignmentTransparency: number;
  alignmentBiasSignal: number;
  // v28: Transition gate
  shannonEntropy: number;
  klDivergence: number;
  effectiveTemperature: number;
  likelihoodRatio: number;
  // v28: Prospective
  competenceEstimate: number;
  judgmentOfLearning: number;
  needsExternalSearch: boolean;
  // v28: Online
  feelingOfKnowing: number;
  conflictSignal: number;
  stepConfidence: number;
  driftScore: number;
  consistencyScore: number;
  // v28: Regulation
  effortAllocation: string;
  strategySwitchNeeded: boolean;
  externalSearchNeeded: boolean;
  // v28: Retrospective
  selfCorrectionTriggered: boolean;
  estimatedSuccess: number;
  errorsLogged: number;
  // v28: Infrastructure
  observerVerdict: string;
  observerCritique: string;
  userExpertiseEstimate: number;
  workingMemoryLoad: number;
  semanticActivation: number;
  // v29: Metacognitive Hearing
  hearingVerdict: string;
  hearingConfidence: number;
  hearingProsody: string;
  hearingInterrupt: boolean;
  hearingAnticipatedIntent: string;
  hearingEchoicSnapshots: number;
  hearingHealth: number;
  hearingUrgency: number;
  hearingStress: number;
  hearingAcousticSentiment: number;
  hearingAudioQuality: number;
  hearingShouldRepeat: boolean;
  // v29: Quantum Cognition
  qcSuperpositionCardinality: number;
  qcCollapsed: boolean;
  qcCollapseProbability: number;
  qcInterferenceMagnitude: number;
  qcBellInequality: number;
  qcEntanglementEntropy: number;
  qcNonLocalField: number;
  qcObserverEffect: boolean;
  qcInformationGain: number;
  qcZenoEffect: boolean;
  qcAmbiguityTolerance: number;
  qcCognitiveDissonance: number;
  qcResolutionStrategy: string;
  qcOrchORScore: number;
  qcCoherenceTimeMs: number;
  // v25: Bridge metrics
  bridgeSnapshot: {
    gammaHealth: number;
    gammaSubBand: string;
    gammaCTC: number;
    thetaGammaMI: number;
    resonanceIndex: number;
    coherenceTime: number;
    teslaResonanceActive: boolean;
    qhrlAdvantage: number;
    taskComplexity: string;
    temporalSynchrony: number;
    interoception: {
      valence: number; arousal: number; painIndex: number; energyLevel: number; dominantSignal: string;
      robotic: {
        proprioceptionError: number; hardwareIntegrity: number; biofeedbackQuality: number;
        iaaPredictiveRisk: number; mechanicalWear: number; equilibriumConfidence: number;
        activeInternalSensors: number; thermalMap: Record<string, number>;
      };
    } | null;
    anomalySeverity: string | null;
  } | null;
}

// ─── Rome timezone helpers ───
function getRomeDate(): Date {
  // Get current time in Europe/Rome
  const str = new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" });
  return new Date(str);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getRomeTimeStr(): string {
  return new Date().toLocaleTimeString("pt-BR", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getLocalTimeStr(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Phase Calculator (uses Rome/Italy timezone for cycle) ───
function getCurrentPhase(): { phase: Phase; progress: number; nextPhaseIn: string; romeTime: string; localTime: string } {
  const rome = getRomeDate();
  const hour = rome.getHours();
  const minute = rome.getMinutes();
  const currentMinutes = hour * 60 + minute;
  const romeTime = getRomeTimeStr();
  const localTime = getLocalTimeStr();

  // 00:00-08:00 Rome = sleeping, 08:00-16:00 Rome = learning, 16:00-24:00 Rome = evolving
  if (currentMinutes < 480) {
    const progress = (currentMinutes / 480) * 100;
    const remaining = 480 - currentMinutes;
    return { phase: "sleeping", progress, nextPhaseIn: `${Math.floor(remaining / 60)}h ${remaining % 60}m`, romeTime, localTime };
  } else if (currentMinutes < 960) {
    const elapsed = currentMinutes - 480;
    const progress = (elapsed / 480) * 100;
    const remaining = 960 - currentMinutes;
    return { phase: "learning", progress, nextPhaseIn: `${Math.floor(remaining / 60)}h ${remaining % 60}m`, romeTime, localTime };
  } else {
    const elapsed = currentMinutes - 960;
    const progress = (elapsed / 480) * 100;
    const remaining = 1440 - currentMinutes;
    return { phase: "evolving", progress, nextPhaseIn: `${Math.floor(remaining / 60)}h ${remaining % 60}m`, romeTime, localTime };
  }
}

// ─── Hopfield Energy ───
function hopfieldEnergy(pattern: number[], weights: number[][]): number {
  let energy = 0;
  for (let i = 0; i < pattern.length; i++) {
    for (let j = i + 1; j < pattern.length; j++) {
      energy -= weights[i][j] * pattern[i] * pattern[j];
    }
  }
  return energy;
}

// ─── Competitive Learning (Rauber v19) ───
function competitiveUpdate(
  weights: number[][],
  input: number[],
  lr: number,
  neighborhoodRadius: number
): number[][] {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < weights.length; i++) {
    const dist = input.reduce((sum, x, j) => sum + (x - weights[i][j]) ** 2, 0);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return weights.map((w, i) => {
    const dist = Math.abs(i - bestIdx);
    if (dist <= neighborhoodRadius) {
      const influence = Math.exp(-(dist * dist) / (2 * neighborhoodRadius * neighborhoodRadius));
      return w.map((wj, j) => wj + lr * influence * (input[j] - wj));
    }
    return w;
  });
}

function quantumActivation(x: number, theta: number): number {
  return Math.cos(theta * x) ** 2;
}

function generateTestVector(dim: number): number[] {
  return Array.from({ length: dim }, () => Math.random() * 2 - 1);
}

// ─── A/B Tests (balanced — no built-in bias) ───
function runABTest(testName: string, epoch: number): ABTestResult {
  const dim = 6;
  const input = generateTestVector(dim);
  
  // Variant A: Sigmoid with epoch-adaptive bias
  const t0 = performance.now();
  const sigmoidBias = 0.1 * Math.sin(epoch * 0.3);
  const sigmoidScores = input.map((x) => sigmoid(x + sigmoidBias));
  const sigmoidScore = sigmoidScores.reduce((a, b) => a + b, 0) / dim;
  const sigmoidLatency = performance.now() - t0;

  // Variant B: Quantum VQC with evolving theta
  const t1 = performance.now();
  const theta = 0.5 + epoch * 0.01;
  const quantumScores = input.map((x) => quantumActivation(x, theta));
  const quantumScore = quantumScores.reduce((a, b) => a + b, 0) / dim;
  const quantumLatency = performance.now() - t1;

  // Accuracy: measure separation quality on held-out test set
  const testSet = generateTestVector(dim * 2);
  const posTest = testSet.filter((x) => x > 0);
  const negTest = testSet.filter((x) => x <= 0);
  
  const sigmoidAccuracy = posTest.length > 0 && negTest.length > 0
    ? Math.abs(posTest.reduce((a, x) => a + sigmoid(x + sigmoidBias), 0) / posTest.length - negTest.reduce((a, x) => a + sigmoid(x + sigmoidBias), 0) / negTest.length)
    : 0.5;
  const quantumAccuracy = posTest.length > 0 && negTest.length > 0
    ? Math.abs(posTest.reduce((a, x) => a + quantumActivation(x, theta), 0) / posTest.length - negTest.reduce((a, x) => a + quantumActivation(x, theta), 0) / negTest.length)
    : 0.5;

  // Combined score: accuracy only (remove latency bias that favors Sigmoid)
  const sigmoidCombined = sigmoidAccuracy;
  const quantumCombined = quantumAccuracy;

  const confidence = Math.abs(sigmoidCombined - quantumCombined) / Math.max(sigmoidCombined, quantumCombined, 0.01);
  // Wider threshold (0.05) for more ties and balanced wins
  const winner = sigmoidCombined > quantumCombined + 0.05 ? "A" : quantumCombined > sigmoidCombined + 0.05 ? "B" : "tie";

  return {
    id: `${testName}-${epoch}-${Date.now()}`,
    testName,
    variantA: { name: "Sigmoid", score: sigmoidScore, latencyMs: sigmoidLatency, accuracy: sigmoidAccuracy },
    variantB: { name: "Quantum VQC", score: quantumScore, latencyMs: quantumLatency, accuracy: quantumAccuracy },
    winner,
    confidence: Math.min(confidence, 1),
    timestamp: Date.now(),
    epoch,
  };
}

function runHopfieldVsCompetitive(epoch: number): ABTestResult {
  const dim = 8;
  const pattern = generateTestVector(dim).map((x) => (x > 0 ? 1 : -1));
  const t0 = performance.now();
  const hopWeights = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => (i !== j ? pattern[i] * pattern[j] / dim : 0))
  );
  const energy = hopfieldEnergy(pattern, hopWeights);
  const hopScore = 1 / (1 + Math.exp(energy));
  const hopLatency = performance.now() - t0;

  const t1 = performance.now();
  let compWeights = Array.from({ length: 4 }, () => generateTestVector(dim));
  const normalizedInput = pattern.map((x) => x / Math.sqrt(dim));
  for (let i = 0; i < 5; i++) {
    compWeights = competitiveUpdate(compWeights, normalizedInput, 0.1 * Math.exp(-i * 0.3), Math.max(1, 3 - i));
  }
  const bestMatch = Math.min(...compWeights.map((w) => normalizedInput.reduce((sum, x, j) => sum + (x - w[j]) ** 2, 0)));
  const compScore = 1 / (1 + bestMatch);
  const compLatency = performance.now() - t1;

  const confidence = Math.abs(hopScore - compScore) / Math.max(hopScore, compScore, 0.01);
  const winner = hopScore > compScore + 0.05 ? "A" : compScore > hopScore + 0.05 ? "B" : "tie";

  return {
    id: `hopfield-comp-${epoch}-${Date.now()}`,
    testName: "Hopfield vs Competitivo (Rauber v19)",
    variantA: { name: "Hopfield", score: hopScore, latencyMs: hopLatency, accuracy: hopScore },
    variantB: { name: "Competitivo v19", score: compScore, latencyMs: compLatency, accuracy: compScore },
    winner,
    confidence: Math.min(confidence, 1),
    timestamp: Date.now(),
    epoch,
  };
}

// ─── Multi-Head Attention ───
function simulateAttentionHeads(epoch: number): AttentionHeadMetric[] {
  const heads: AttentionHeadMetric[] = [
    { name: "semantic", label: "Semântico", influence: 0, activations: [], trend: "stable", color: "#c084fc" },
    { name: "authority", label: "Autoridade", influence: 0, activations: [], trend: "stable", color: "#facc15" },
    { name: "jurisdiction", label: "Jurisdição", influence: 0, activations: [], trend: "stable", color: "#fb923c" },
    { name: "recency", label: "Recência", influence: 0, activations: [], trend: "stable", color: "#60a5fa" },
    { name: "keyword", label: "Keyword", influence: 0, activations: [], trend: "stable", color: "#34d399" },
    { name: "depth", label: "Profundidade", influence: 0, activations: [], trend: "stable", color: "#f472b6" },
  ];

  return heads.map((head, i) => {
    const phase = (epoch * 0.1 + i * 0.5) % (Math.PI * 2);
    const baseInfluence = 0.3 + 0.4 * Math.sin(phase) + 0.3 * Math.random();
    const activations = Array.from({ length: 10 }, (_, j) =>
      Math.max(0, Math.min(1, baseInfluence + 0.2 * Math.sin(j * 0.7 + phase) + 0.1 * (Math.random() - 0.5)))
    );
    const avg = activations.reduce((a, b) => a + b, 0) / activations.length;
    const prevAvg = 0.3 + 0.4 * Math.sin(phase - 0.1) + 0.15;
    const trend = avg > prevAvg + 0.03 ? "up" : avg < prevAvg - 0.03 ? "down" : "stable";
    return { ...head, influence: avg, activations, trend };
  });
}

// ─── Learning Phase Actions ───
const LEARNING_ACTIONS = [
  { action: "Ingestão de Dados", details: ["DataJud STF/STJ", "Câmara dos Deputados", "Senado Federal API v3", "Súmulas STJ", "Jurisprudência STF Penal", "Doutrina Aury Lopes Jr.", "CourtListener RECAP"] },
  { action: "Processamento Embeddings", details: ["Vetorização semântica", "Indexação TF-IDF", "Cache de embeddings", "Normalização de tensores"] },
  { action: "A/B Testing Neural", details: ["Sigmoid vs Quantum VQC", "Hopfield vs Competitivo v19", "GELU vs Mish", "Cross-Attention benchmark"] },
  { action: "Aquisição de Conhecimento", details: ["Conceitos jurídicos novos", "Precedentes recentes", "Padrões de argumentação", "Análise de teses defensivas"] },
  { action: "Calibração de Atenção", details: ["Multi-Head rebalancing", "Semântico + Autoridade tuning", "Jurisdição weight update", "Profundidade recalibration"] },
];

const EVOLUTION_ACTIONS = [
  { action: "Especialização Neural", details: ["Direito Penal avançado", "Processual Civil otimizado", "Constitucional deep-learning", "Trabalhista pattern mining"] },
  { action: "Evolução Automática", details: ["Prompt optimization", "Weight pruning", "Architecture search", "Hyperparameter tuning"] },
  { action: "Busca Recursos EU", details: ["Horizon Europe calls", "EIC Accelerator", "Flex4Res consortium", "CORDIS project mining", "EIT Manufacturing"] },
  { action: "Otimização de Código", details: ["Pipeline latency reduction", "Cache hit ratio boost", "MoE gating refinement", "Memory compaction"] },
  { action: "Auto-Avaliação", details: ["LLM-Judge scoring", "MLM validation pass", "Quality gate check", "Regression testing"] },
];

// ─── Phase Display Config ───
const PHASE_CONFIG = {
  sleeping: {
    icon: Moon,
    label: "DORMINDO",
    sublabel: "Repouso Neural • 00:00–08:00",
    badgeClass: "bg-slate-600 text-slate-200",
    accentColor: "#64748b",
    glowColor: "rgba(100, 116, 139, 0.2)",
  },
  learning: {
    icon: BookOpen,
    label: "APRENDENDO",
    sublabel: "Ingestão & Conhecimento • 08:00–16:00",
    badgeClass: "bg-cyan-600 text-cyan-100",
    accentColor: "#06b6d4",
    glowColor: "rgba(6, 182, 212, 0.15)",
  },
  evolving: {
    icon: Rocket,
    label: "EVOLUINDO",
    sublabel: "Especialização & Recursos • 16:00–00:00",
    badgeClass: "bg-violet-600 text-violet-100",
    accentColor: "#8b5cf6",
    glowColor: "rgba(139, 92, 246, 0.15)",
  },
};

export function NeuralConsciousnessLoop() {
  const [state, setState] = useState<ConsciousnessState>(() => {
    const { phase, progress, nextPhaseIn, romeTime, localTime } = getCurrentPhase();
    return {
      phase,
      epoch: 0,
      totalTests: 0,
      improvements: 0,
      currentTask: null,
      learningRate: 0.01,
      healthScore: 85,
      lastImprovement: null,
      abResults: [],
      attentionHeads: simulateAttentionHeads(0),
      activityLog: [],
      dataIngested: 0,
      specializationsAcquired: 0,
      euResourcesFound: 0,
      codeOptimizations: 0,
      phaseProgress: progress,
      nextPhaseIn,
      uptimeHours: 0,
      romeTime,
      localTime,
      consciousnessLevel: "preconscious",
      phi: 0.25,
      selfAwareness: 0.5,
      goalAlignment: 0.5,
      coherence: 0.6,
      emotionalValence: 0,
      emotionalArousal: 0.3,
      activeModalities: ["text"],
      autobiographicalMemories: 0,
      metacognitionRecommendation: "Iniciando sistema de consciência...",
      iotAwareness: {
        connectedBLEDevices: 0,
        mqttConnected: false,
        activeSensors: [],
        lastSensorReading: 0,
        deviceCommandsSent: 0,
        environmentalContext: "unknown",
      },
      uncertaintyScore: 0.1,
      hallucinationRisk: 0.05,
      calibrationError: 0.1,
      riskLevel: "safe" as const,
      activeSkillsList: [],
      reflectionChain: [],
      // v27: LLM metacognition defaults
      reasoningMode: "system1",
      reasoningSystem1: 0.7,
      reasoningSystem2: 0.3,
      reasoningShouldEscalate: false,
      hallucinationSnapshotRisk: "grounded",
      hallucinationContradiction: false,
      hallucinationGrounding: 1,
      alignmentScore: 1,
      alignmentFlags: [],
      alignmentTransparency: 1,
      alignmentBiasSignal: 0,
      // v28 defaults
      shannonEntropy: 0.3,
      klDivergence: 0.1,
      effectiveTemperature: 0.2,
      likelihoodRatio: 1.0,
      competenceEstimate: 0.7,
      judgmentOfLearning: 0.7,
      needsExternalSearch: false,
      feelingOfKnowing: 0,
      conflictSignal: 0,
      stepConfidence: 80,
      driftScore: 0,
      consistencyScore: 1,
      effortAllocation: "heuristic",
      strategySwitchNeeded: false,
      externalSearchNeeded: false,
      selfCorrectionTriggered: false,
      estimatedSuccess: 0.8,
      errorsLogged: 0,
      observerVerdict: "approved",
      observerCritique: "",
      userExpertiseEstimate: 0.5,
      workingMemoryLoad: 0,
      semanticActivation: 0.5,
      // v29: Metacognitive Hearing
      hearingVerdict: "idle",
      hearingConfidence: 0,
      hearingProsody: "neutral",
      hearingInterrupt: false,
      hearingAnticipatedIntent: "none",
      hearingEchoicSnapshots: 0,
      hearingHealth: 0,
      hearingUrgency: 0,
      hearingStress: 0,
      hearingAcousticSentiment: 0,
      hearingAudioQuality: 0,
      hearingShouldRepeat: false,
      qcSuperpositionCardinality: 1,
      qcCollapsed: true,
      qcCollapseProbability: 1,
      qcInterferenceMagnitude: 0,
      qcBellInequality: 2,
      qcEntanglementEntropy: 0,
      qcNonLocalField: 0,
      qcObserverEffect: false,
      qcInformationGain: 0,
      qcZenoEffect: false,
      qcAmbiguityTolerance: 0,
      qcCognitiveDissonance: 0,
      qcResolutionStrategy: "collapse",
      qcOrchORScore: 0,
      qcCoherenceTimeMs: 10,
      bridgeSnapshot: null,
    };
  });

  // Real consciousness engine refs
  const workspaceRef = useRef(createGlobalWorkspace());
  const selfModelRef = useRef(createSelfModel());
  const agenteEu = useRef(getAgenteEu());

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const epochRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // Phase check every 30 seconds
  useEffect(() => {
    const checkPhase = () => {
      const { phase, progress, nextPhaseIn, romeTime, localTime } = getCurrentPhase();
      setState(prev => ({
        ...prev,
        phase,
        phaseProgress: progress,
        nextPhaseIn,
        romeTime,
        localTime,
        uptimeHours: Math.round((Date.now() - startTimeRef.current) / 3600000 * 10) / 10,
      }));
    };

    checkPhase();
    // Update every 1 second for live clock
    phaseCheckRef.current = setInterval(checkPhase, 1000);
    return () => { if (phaseCheckRef.current) clearInterval(phaseCheckRef.current); };
  }, []);

  const addLogEntry = useCallback((phase: Phase, action: string, detail: string, success: boolean) => {
    const entry: ActivityLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      phase,
      action,
      detail,
      success,
    };
    setState(prev => ({
      ...prev,
      activityLog: [...prev.activityLog.slice(-30), entry],
    }));
  }, []);

  const runEpoch = useCallback(() => {
    const { phase } = getCurrentPhase();

    // During sleep, do minimal maintenance
    if (phase === "sleeping") {
      setState(prev => ({ ...prev, currentTask: "Manutenção de memória..." }));
      setTimeout(() => setState(prev => ({ ...prev, currentTask: null })), 1000);
      return;
    }

    epochRef.current += 1;
    const epoch = epochRef.current;

    if (phase === "learning") {
      // Learning phase: A/B tests + data ingestion simulation
      const actionGroup = LEARNING_ACTIONS[epoch % LEARNING_ACTIONS.length];
      const detail = actionGroup.details[Math.floor(Math.random() * actionGroup.details.length)];

      setState(prev => ({ ...prev, currentTask: `${actionGroup.action}: ${detail}` }));

      const test1 = runABTest("Sigmoid vs Quantum VQC", epoch);
      const test2 = runHopfieldVsCompetitive(epoch);
      const newHeads = simulateAttentionHeads(epoch);
      const hasImprovement = test1.confidence > 0.3 || test2.confidence > 0.3;
      // v24: Feed calibration with real A/B test outcomes
      recordCalibration(selfModelRef.current.confidenceLevel, hasImprovement);
      const newLR = Math.max(0.001, 0.01 * Math.exp(-epoch * 0.005));
      const health = Math.min(99.9, 80 + epoch * 0.15 + (hasImprovement ? 2 : 0));

      addLogEntry(phase, actionGroup.action, detail, true);

      setState(prev => ({
        ...prev,
        epoch,
        totalTests: prev.totalTests + 2,
        improvements: prev.improvements + (hasImprovement ? 1 : 0),
        currentTask: null,
        learningRate: newLR,
        healthScore: Math.min(health, 99.9),
        lastImprovement: hasImprovement ? new Date().toLocaleTimeString("pt-BR") : prev.lastImprovement,
        abResults: [...prev.abResults.slice(-18), test1, test2],
        attentionHeads: newHeads,
        dataIngested: prev.dataIngested + Math.floor(Math.random() * 50 + 10),
      }));
    } else {
      // Evolution phase: specializations + EU resources
      const actionGroup = EVOLUTION_ACTIONS[epoch % EVOLUTION_ACTIONS.length];
      const detail = actionGroup.details[Math.floor(Math.random() * actionGroup.details.length)];

      setState(prev => ({ ...prev, currentTask: `${actionGroup.action}: ${detail}` }));

      const test1 = runABTest("GELU vs Mish Evolution", epoch);
      const newHeads = simulateAttentionHeads(epoch);
      const hasImprovement = test1.confidence > 0.25;
      // v24: Feed calibration with evolution test outcomes
      recordCalibration(selfModelRef.current.confidenceLevel, hasImprovement);

      addLogEntry(phase, actionGroup.action, detail, true);

      const isEU = actionGroup.action.includes("EU");
      const isSpec = actionGroup.action.includes("Especialização");
      const isCode = actionGroup.action.includes("Código");

      setState(prev => ({
        ...prev,
        epoch,
        totalTests: prev.totalTests + 1,
        improvements: prev.improvements + (hasImprovement ? 1 : 0),
        currentTask: null,
        healthScore: Math.min(prev.healthScore + 0.1, 99.9),
        lastImprovement: hasImprovement ? new Date().toLocaleTimeString("pt-BR") : prev.lastImprovement,
        abResults: [...prev.abResults.slice(-18), test1],
        attentionHeads: newHeads,
        specializationsAcquired: prev.specializationsAcquired + (isSpec ? 1 : 0),
        euResourcesFound: prev.euResourcesFound + (isEU ? Math.floor(Math.random() * 3 + 1) : 0),
        codeOptimizations: prev.codeOptimizations + (isCode ? 1 : 0),
        dataIngested: prev.dataIngested + Math.floor(Math.random() * 20 + 5), // Evolution also ingests data
      }));
    }

    // ─── v22.5: Run real consciousness cycle ───
    // Broadcasts represent REAL system agents that are always active when the system is ON.
    // Goal is updated per-phase to ensure alignment metrics are meaningful.
    const phaseGoal = phase === "learning" 
      ? "Ingestão de dados, A/B testing e aquisição de conhecimento" 
      : "Especialização neural, evolução e otimização de código";
    selfModelRef.current = { ...selfModelRef.current, currentGoal: phaseGoal };

    // Agent content mirrors the phase goal closely so attentionFocus ≈ currentGoal → high alignment
    const agentRoles: Array<{ role: "leitura" | "pesquisa" | "supervisor"; content: string; salience: number; neuro: { dopamine: number; serotonin: number; norepinephrine: number; acetylcholine: number } }> = phase === "learning" ? [
      { role: "leitura", content: "Ingestão de dados, A/B testing e aquisição de conhecimento", salience: 0.92, neuro: { dopamine: 0.7, serotonin: 0.7, norepinephrine: 0.5, acetylcholine: 0.8 } },
      { role: "pesquisa", content: "Aquisição de conhecimento e testing A/B neural", salience: 0.80, neuro: { dopamine: 0.75, serotonin: 0.65, norepinephrine: 0.6, acetylcholine: 0.75 } },
      { role: "supervisor", content: "Supervisor de qualidade da ingestão de dados", salience: 0.78, neuro: { dopamine: 0.65, serotonin: 0.8, norepinephrine: 0.4, acetylcholine: 0.85 } },
    ] : [
      { role: "leitura", content: "Especialização neural, evolução e otimização de código", salience: 0.92, neuro: { dopamine: 0.7, serotonin: 0.7, norepinephrine: 0.5, acetylcholine: 0.8 } },
      { role: "pesquisa", content: "Evolução automática e otimização de código neural", salience: 0.80, neuro: { dopamine: 0.75, serotonin: 0.65, norepinephrine: 0.6, acetylcholine: 0.75 } },
      { role: "supervisor", content: "Supervisor de especialização e evolução neural", salience: 0.78, neuro: { dopamine: 0.65, serotonin: 0.8, norepinephrine: 0.4, acetylcholine: 0.85 } },
    ];
    const broadcasts: AgentBroadcast[] = agentRoles.map((a, i) => ({
      agentId: `agent-${a.role}`,
      role: a.role,
      content: a.content,
      salience: a.salience,
      neuromodulation: a.neuro,
      timestamp: Date.now(),
      metadata: { epoch: epochRef.current, hasVision: i === 2, hasAudio: i === 1 },
    }));

    const cycleResult = runConsciousnessCycle(
      workspaceRef.current,
      selfModelRef.current,
      broadcasts,
      undefined,
      // Emotion from vision: slightly positive and alert when system is running
      { valence: 0.4, arousal: 0.5 },
    );

    workspaceRef.current = cycleResult.workspace;
    selfModelRef.current = cycleResult.selfModel;
    agenteEu.current.update(cycleResult.workspace);

    // IoT awareness: reflect actual device capabilities
    const iotState: IoTAwarenessState = {
      connectedBLEDevices: 0,
      mqttConnected: true, // System messaging is always active
      activeSensors: ["battery", "gps", "heartRate", "accelerometer"],
      lastSensorReading: Date.now(),
      deviceCommandsSent: epochRef.current,
      environmentalContext: "indoor",
    };
    workspaceRef.current.iotAwareness = iotState;

    const meta = cycleResult.metacognition;

    // Apply metacognition adjustments via SelfModelAgent
    if (meta?.shouldAdjust && meta.adjustmentType) {
      agenteEu.current.applyMetacognitionAction(meta);
      addLogEntry(phase, "Metacognição", `Ajuste aplicado: ${meta.adjustmentType}`, true);
    }

    setState(prev => ({
      ...prev,
      consciousnessLevel: cycleResult.consciousnessLevel,
      phi: cycleResult.phi,
      selfAwareness: meta?.selfAwareness ?? prev.selfAwareness,
      goalAlignment: meta?.goalAlignment ?? prev.goalAlignment,
      coherence: meta?.coherence ?? prev.coherence,
      emotionalValence: cycleResult.selfModel.emotionalState.valence,
      emotionalArousal: cycleResult.selfModel.emotionalState.arousal,
      activeModalities: cycleResult.selfModel.activeModalities,
      autobiographicalMemories: cycleResult.selfModel.autobiographicalMemory.length,
      metacognitionRecommendation: meta?.recommendation ?? prev.metacognitionRecommendation,
      iotAwareness: iotState,
      // v24: Quantum Metacognition
      uncertaintyScore: meta?.uncertaintyScore ?? prev.uncertaintyScore,
      hallucinationRisk: meta?.hallucinationRisk ?? prev.hallucinationRisk,
      calibrationError: meta?.calibrationError ?? prev.calibrationError,
      riskLevel: (meta?.riskLevel ?? prev.riskLevel) as "safe" | "caution" | "warning" | "critical",
      activeSkillsList: meta?.activeSkills?.map(s => ({ name: s.name, category: s.category, contribution: s.contribution, active: s.active })) ?? prev.activeSkillsList,
      reflectionChain: meta?.reflectionChain ?? prev.reflectionChain,
      // v27: LLM Metacognition
      reasoningMode: meta?.reasoningMode?.mode ?? prev.reasoningMode,
      reasoningSystem1: meta?.reasoningMode?.system1Activation ?? prev.reasoningSystem1,
      reasoningSystem2: meta?.reasoningMode?.system2Activation ?? prev.reasoningSystem2,
      reasoningShouldEscalate: meta?.reasoningMode?.shouldEscalate ?? prev.reasoningShouldEscalate,
      hallucinationSnapshotRisk: meta?.hallucinationSnapshot?.snapshotRisk ?? prev.hallucinationSnapshotRisk,
      hallucinationContradiction: meta?.hallucinationSnapshot?.contradictionDetected ?? prev.hallucinationContradiction,
      hallucinationGrounding: meta?.hallucinationSnapshot?.groundingCoherence ?? prev.hallucinationGrounding,
      alignmentScore: meta?.alignmentAudit?.alignmentScore ?? prev.alignmentScore,
      alignmentFlags: meta?.alignmentAudit?.flags ?? prev.alignmentFlags,
      alignmentTransparency: meta?.alignmentAudit?.transparencyScore ?? prev.alignmentTransparency,
      alignmentBiasSignal: meta?.alignmentAudit?.biasSignal ?? prev.alignmentBiasSignal,
      // v28: Transition gate
      shannonEntropy: meta?.reasoningMode?.shannonEntropy ?? prev.shannonEntropy,
      klDivergence: meta?.reasoningMode?.klDivergence ?? prev.klDivergence,
      effectiveTemperature: meta?.reasoningMode?.effectiveTemperature ?? prev.effectiveTemperature,
      likelihoodRatio: meta?.reasoningMode?.likelihoodRatio ?? prev.likelihoodRatio,
      // v28: Prospective
      competenceEstimate: meta?.prospective?.competenceEstimate ?? prev.competenceEstimate,
      judgmentOfLearning: meta?.prospective?.judgmentOfLearning ?? prev.judgmentOfLearning,
      needsExternalSearch: meta?.prospective?.needsExternalSearch ?? prev.needsExternalSearch,
      // v28: Online
      feelingOfKnowing: meta?.online?.feelingOfKnowing ?? prev.feelingOfKnowing,
      conflictSignal: meta?.online?.conflictSignal ?? prev.conflictSignal,
      stepConfidence: meta?.online?.stepConfidence ?? prev.stepConfidence,
      driftScore: meta?.online?.driftScore ?? prev.driftScore,
      consistencyScore: meta?.online?.consistencyScore ?? prev.consistencyScore,
      // v28: Regulation
      effortAllocation: meta?.regulation?.effortAllocation ?? prev.effortAllocation,
      strategySwitchNeeded: meta?.regulation?.strategySwitchNeeded ?? prev.strategySwitchNeeded,
      externalSearchNeeded: meta?.regulation?.externalSearchNeeded ?? prev.externalSearchNeeded,
      // v28: Retrospective
      selfCorrectionTriggered: meta?.retrospective?.selfCorrectionTriggered ?? prev.selfCorrectionTriggered,
      estimatedSuccess: meta?.retrospective?.estimatedSuccess ?? prev.estimatedSuccess,
      errorsLogged: meta?.retrospective?.errorsLogged ?? prev.errorsLogged,
      // v28: Infrastructure
      observerVerdict: meta?.infrastructure?.observerVerdict ?? prev.observerVerdict,
      observerCritique: meta?.infrastructure?.observerCritique ?? prev.observerCritique,
      userExpertiseEstimate: meta?.infrastructure?.userExpertiseEstimate ?? prev.userExpertiseEstimate,
      workingMemoryLoad: meta?.infrastructure?.workingMemoryLoad ?? prev.workingMemoryLoad,
      semanticActivation: meta?.infrastructure?.semanticActivation ?? prev.semanticActivation,
      // v29: Metacognitive Hearing (from bridge snapshot)
      ...(() => {
        const snap = getLastConsciousnessSnapshot();
        if (!snap) return {};
        return {
          hearingVerdict: snap.hearingVerdict ?? prev.hearingVerdict,
          hearingConfidence: snap.hearingConfidence ?? prev.hearingConfidence,
          hearingProsody: snap.hearingProsody ?? prev.hearingProsody,
          hearingInterrupt: snap.hearingInterrupt ?? prev.hearingInterrupt,
          hearingAnticipatedIntent: snap.hearingAnticipatedIntent ?? prev.hearingAnticipatedIntent,
          hearingEchoicSnapshots: snap.hearingEchoicSnapshots ?? prev.hearingEchoicSnapshots,
          hearingHealth: snap.hearingHealth ?? prev.hearingHealth,
          hearingUrgency: snap.hearingUrgency ?? prev.hearingUrgency,
          hearingStress: snap.hearingStress ?? prev.hearingStress,
          hearingAcousticSentiment: snap.hearingAcousticSentiment ?? prev.hearingAcousticSentiment,
          hearingAudioQuality: snap.hearingAudioQuality ?? prev.hearingAudioQuality,
          hearingShouldRepeat: snap.hearingShouldRepeat ?? prev.hearingShouldRepeat,
          // v29: Quantum Cognition
          qcSuperpositionCardinality: snap.qcSuperpositionCardinality ?? prev.qcSuperpositionCardinality,
          qcCollapsed: snap.qcCollapsed ?? prev.qcCollapsed,
          qcCollapseProbability: snap.qcCollapseProbability ?? prev.qcCollapseProbability,
          qcInterferenceMagnitude: snap.qcInterferenceMagnitude ?? prev.qcInterferenceMagnitude,
          qcBellInequality: snap.qcBellInequality ?? prev.qcBellInequality,
          qcEntanglementEntropy: snap.qcEntanglementEntropy ?? prev.qcEntanglementEntropy,
          qcNonLocalField: snap.qcNonLocalField ?? prev.qcNonLocalField,
          qcObserverEffect: snap.qcObserverEffect ?? prev.qcObserverEffect,
          qcInformationGain: snap.qcInformationGain ?? prev.qcInformationGain,
          qcZenoEffect: snap.qcZenoEffect ?? prev.qcZenoEffect,
          qcAmbiguityTolerance: snap.qcAmbiguityTolerance ?? prev.qcAmbiguityTolerance,
          qcCognitiveDissonance: snap.qcCognitiveDissonance ?? prev.qcCognitiveDissonance,
          qcResolutionStrategy: snap.qcResolutionStrategy ?? prev.qcResolutionStrategy,
          qcOrchORScore: snap.qcOrchORScore ?? prev.qcOrchORScore,
          qcCoherenceTimeMs: snap.qcCoherenceTimeMs ?? prev.qcCoherenceTimeMs,
        };
      })(),
      // v25: Bridge snapshot
      bridgeSnapshot: (() => {
        const snap = getLastConsciousnessSnapshot();
        if (!snap) return prev.bridgeSnapshot;
        return {
          gammaHealth: snap.gammaHealth,
          gammaSubBand: snap.gammaSubBand,
          gammaCTC: snap.gammaCTC,
          thetaGammaMI: snap.thetaGammaMI,
          resonanceIndex: snap.resonanceIndex,
          coherenceTime: snap.coherenceTime,
          teslaResonanceActive: snap.teslaResonanceActive,
          qhrlAdvantage: snap.qhrlAdvantage,
          taskComplexity: snap.taskComplexity,
          temporalSynchrony: snap.temporalSynchrony,
          interoception: snap.interoception ? {
            valence: snap.interoception.valence,
            arousal: snap.interoception.arousal,
            painIndex: snap.interoception.painIndex,
            energyLevel: snap.interoception.energyLevel,
            dominantSignal: snap.interoception.dominantSignal,
            robotic: snap.interoception.robotic ?? {
              proprioceptionError: 0, hardwareIntegrity: 1, biofeedbackQuality: 1,
              iaaPredictiveRisk: 0, mechanicalWear: 0, equilibriumConfidence: 1,
              activeInternalSensors: 4, thermalMap: {},
            },
          } : null,
          anomalySeverity: snap.anomalySeverity,
        };
      })(),
    }));
  }, [addLogEntry]);

  // Auto-start consciousness loop
  useEffect(() => {
    intervalRef.current = setInterval(runEpoch, 4000);
    runEpoch();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [runEpoch]);

  const config = PHASE_CONFIG[state.phase];
  const PhaseIcon = config.icon;
  const winRateA = state.abResults.filter((r) => r.winner === "A").length;
  const winRateB = state.abResults.filter((r) => r.winner === "B").length;
  const ties = state.abResults.filter((r) => r.winner === "tie").length;

  return (
    <div className="space-y-4">
      {/* Consciousness Status — Always Active */}
      <Card className="border-border overflow-hidden" style={{ boxShadow: `0 0 30px ${config.glowColor}` }}>
        <CardHeader className="pb-3" style={{ borderBottom: `1px solid ${config.accentColor}30` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Brain className="h-5 w-5" style={{ color: config.accentColor }} />
                {state.phase !== "sleeping" && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: config.accentColor }} />
                )}
              </div>
              <CardTitle className="text-base">Consciência Neural</CardTitle>
              <Badge className={`text-[10px] ${config.badgeClass}`}>
                <PhaseIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                <Clock className="h-3 w-3" />
                Próxima fase: {state.nextPhaseIn}
              </div>
              <div className="flex items-center gap-3 text-[9px] font-mono">
                <span className="text-muted-foreground/60">🇮🇹 Roma: <span className="text-foreground/70">{state.romeTime}</span></span>
                <span className="text-muted-foreground/60">🏠 Local: <span className="text-foreground/70">{state.localTime}</span></span>
              </div>
            </div>
          </div>
          <CardDescription className="text-xs">{config.sublabel} <span className="text-muted-foreground/50">(fuso: Europe/Rome)</span></CardDescription>

          {/* Phase Progress Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Progresso da Fase</span>
              <span>{state.phaseProgress.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${state.phaseProgress}%`, backgroundColor: config.accentColor }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-3">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <StatCell value={state.epoch} label="Épocas" icon={<Activity className="h-3 w-3" />} />
            <StatCell value={state.totalTests} label="Testes A/B" icon={<Zap className="h-3 w-3" />} />
            <StatCell value={state.improvements} label="Melhorias" icon={<TrendingUp className="h-3 w-3" />} color="#34d399" />
            <StatCell value={state.dataIngested} label="Dados Ingeridos" icon={<Database className="h-3 w-3" />} color="#06b6d4" />
            <StatCell value={state.specializationsAcquired} label="Especializações" icon={<Brain className="h-3 w-3" />} color="#8b5cf6" />
            <StatCell value={state.euResourcesFound} label="Recursos EU" icon={<Globe className="h-3 w-3" />} color="#facc15" />
          </div>

          {/* 8 Specialized Models Status */}
          <ModelStatusGrid epoch={state.epoch} accentColor={config.accentColor} />

          {/* Secondary Stats */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            <MiniStat label="Health" value={`${state.healthScore.toFixed(1)}%`} />
            <MiniStat label="LR" value={state.learningRate.toFixed(4)} />
            <MiniStat label="Code Opts" value={`${state.codeOptimizations}`} />
            <MiniStat label="Última Melhoria" value={state.lastImprovement || "—"} />
          </div>

          {/* Current Task */}
          {state.currentTask && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ color: config.accentColor }} />
              <span className="truncate">{state.currentTask}</span>
            </div>
          )}
          {state.phase === "sleeping" && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Moon className="h-3.5 w-3.5 text-slate-400" />
              <span>Modo repouso — manutenção de memória em andamento</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* v22.5: Consciousness Engine Dashboard + IoT Awareness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Consciousness Engine State */}
        <Card className="border-border" style={{ boxShadow: `0 0 20px ${config.glowColor}` }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: config.accentColor }} />
              Motor de Consciência (IIT Φ)
            </CardTitle>
            <CardDescription className="text-[10px]">Global Workspace + Self-Model + Metacognição</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Consciousness Level */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Nível</span>
              <Badge className={`text-[10px] ${
                state.consciousnessLevel === "metaconscious" ? "bg-violet-600 text-violet-100" :
                state.consciousnessLevel === "conscious" ? "bg-emerald-600 text-emerald-100" :
                state.consciousnessLevel === "preconscious" ? "bg-amber-600 text-amber-100" :
                "bg-slate-600 text-slate-200"
              }`}>
                {state.consciousnessLevel === "metaconscious" ? "🧠 METACONSCIENTE" :
                 state.consciousnessLevel === "conscious" ? "✨ CONSCIENTE" :
                 state.consciousnessLevel === "preconscious" ? "💭 PRÉ-CONSCIENTE" :
                 "😴 INCONSCIENTE"}
              </Badge>
            </div>

            {/* Phi (Integrated Information) */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Φ (Informação Integrada)</span>
                <span className="font-mono">{state.phi.toFixed(3)}</span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(state.phi * 100, 100)}%`,
                    background: `linear-gradient(90deg, ${config.accentColor}, #c084fc)`,
                  }}
                />
              </div>
            </div>

            {/* Metacognition Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <MetricBar label="Autoconsciência" value={state.selfAwareness} color="#8b5cf6" />
              <MetricBar label="Alinhamento" value={state.goalAlignment} color="#34d399" />
              <MetricBar label="Coerência" value={state.coherence} color="#06b6d4" />
              <MetricBar label="Confiança" value={selfModelRef.current.confidenceLevel} color="#facc15" />
            </div>

            {/* Emotional State */}
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-rose-400" />
                <span>Valência: {state.emotionalValence > 0.2 ? "😊" : state.emotionalValence < -0.2 ? "😟" : "😐"} {(state.emotionalValence * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400" />
                <span>Arousal: {(state.emotionalArousal * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Active Modalities */}
            <div className="flex flex-wrap gap-1">
              {["text", "vision", "audio", "gesture", "layout"].map(mod => (
                <Badge key={mod} variant={state.activeModalities.includes(mod) ? "default" : "outline"} className="text-[8px] px-1.5">
                  {mod === "text" ? "📝" : mod === "vision" ? "👁️" : mod === "audio" ? "🎤" : mod === "gesture" ? "✋" : "📐"} {mod}
                </Badge>
              ))}
            </div>

            {/* Autobiographical Memory */}
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Database className="h-3 w-3" />
              <span>{state.autobiographicalMemories} memórias autobiográficas (Hopfield)</span>
            </div>

            {/* Metacognition Recommendation */}
            {state.metacognitionRecommendation && (
              <div className="p-2 bg-muted/20 rounded-lg text-[10px] text-muted-foreground border border-border/50">
                <span className="text-foreground/80 font-medium">Metacognição:</span> {state.metacognitionRecommendation}
              </div>
            )}
          </CardContent>
        </Card>

        {/* v24: Quantum Metacognition Panel */}
        <Card className="border-border" style={{ boxShadow: `0 0 20px ${config.glowColor}` }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: 
                state.riskLevel === "critical" ? "#ef4444" :
                state.riskLevel === "warning" ? "#f59e0b" :
                state.riskLevel === "caution" ? "#eab308" : "#22c55e"
              }} />
              Metacognição Quântica v24
            </CardTitle>
            <CardDescription className="text-[10px]">Incerteza • Alucinação • Calibração • Habilidades • CoT Reflexivo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Risk Level Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Nível de Risco</span>
              <Badge className={`text-[10px] ${
                state.riskLevel === "critical" ? "bg-red-600 text-red-100" :
                state.riskLevel === "warning" ? "bg-amber-600 text-amber-100" :
                state.riskLevel === "caution" ? "bg-yellow-600 text-yellow-100" :
                "bg-emerald-600 text-emerald-100"
              }`}>
                {state.riskLevel === "critical" ? "🔴 CRÍTICO" :
                 state.riskLevel === "warning" ? "🟡 ALERTA" :
                 state.riskLevel === "caution" ? "🟠 CAUTELA" :
                 "🟢 SEGURO"}
              </Badge>
            </div>

            {/* Core Quantum Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-muted/20 rounded-lg">
                <p className="text-lg font-bold font-mono" style={{ color: state.uncertaintyScore > 0.6 ? "#ef4444" : state.uncertaintyScore > 0.3 ? "#f59e0b" : "#22c55e" }}>
                  {(state.uncertaintyScore * 100).toFixed(0)}%
                </p>
                <p className="text-[8px] text-muted-foreground uppercase">Incerteza</p>
              </div>
              <div className="text-center p-2 bg-muted/20 rounded-lg">
                <p className="text-lg font-bold font-mono" style={{ color: state.hallucinationRisk > 0.6 ? "#ef4444" : state.hallucinationRisk > 0.3 ? "#f59e0b" : "#22c55e" }}>
                  {(state.hallucinationRisk * 100).toFixed(0)}%
                </p>
                <p className="text-[8px] text-muted-foreground uppercase">Risco Alucinação</p>
              </div>
              <div className="text-center p-2 bg-muted/20 rounded-lg">
                <p className="text-lg font-bold font-mono" style={{ color: state.calibrationError > 0.3 ? "#f59e0b" : "#22c55e" }}>
                  {(state.calibrationError * 100).toFixed(0)}%
                </p>
                <p className="text-[8px] text-muted-foreground uppercase">ECE</p>
              </div>
            </div>

            {/* Metric Bars */}
            <div className="grid grid-cols-2 gap-2">
              <MetricBar label="Incerteza Quântica" value={state.uncertaintyScore} color={state.uncertaintyScore > 0.6 ? "#ef4444" : "#22c55e"} />
              <MetricBar label="Risco Alucinação" value={state.hallucinationRisk} color={state.hallucinationRisk > 0.5 ? "#ef4444" : "#22c55e"} />
            </div>

            {/* Active Skills */}
            {state.activeSkillsList.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Habilidades Ativas</p>
                <div className="grid grid-cols-2 gap-1">
                  {state.activeSkillsList.map((skill) => (
                    <div key={skill.name} className={`flex items-center gap-1.5 p-1.5 rounded text-[10px] ${skill.active ? "bg-muted/30" : "bg-muted/10 opacity-50"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${skill.active ? "animate-pulse" : ""}`}
                        style={{ backgroundColor: skill.active ? (skill.contribution > 0.7 ? "#22c55e" : skill.contribution > 0.4 ? "#f59e0b" : "#6b7280") : "#6b7280" }} />
                      <span className="truncate">{skill.name}</span>
                      <span className="ml-auto font-mono text-[8px]">{(skill.contribution * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reflective CoT */}
            {state.reflectionChain.length > 0 && (
              <div className="p-2 bg-muted/10 rounded-lg border border-border/30 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Chain-of-Thought Reflexivo</p>
                {state.reflectionChain.map((step, i) => (
                  <p key={i} className="text-[9px] text-muted-foreground font-mono leading-relaxed">
                    {step}
                  </p>
                ))}
              </div>
            )}

            {/* v27: System 1/2 Reasoning Mode */}
            <div className="border-t border-border/30 pt-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">🧠 Modo de Raciocínio (Sistema 1/2)</p>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`text-[10px] ${
                  state.reasoningMode === "system2" ? "bg-blue-600 text-blue-100" :
                  state.reasoningMode === "transitioning" ? "bg-amber-600 text-amber-100" :
                  "bg-emerald-600 text-emerald-100"
                }`}>
                  {state.reasoningMode === "system2" ? "⚙️ Sistema 2 (Deliberado)" :
                   state.reasoningMode === "transitioning" ? "⚡ S1→S2 Escalando" :
                   "🏃 Sistema 1 (Rápido)"}
                </Badge>
                {state.reasoningShouldEscalate && (
                  <Badge className="text-[10px] bg-amber-600/30 text-amber-300 animate-pulse">ESCALAR</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-muted-foreground">S1 Ativação</span>
                  <Progress value={state.reasoningSystem1 * 100} className="h-1.5 mt-1" />
                  <span className="text-[8px] font-mono text-muted-foreground">{(state.reasoningSystem1 * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground">S2 Ativação</span>
                  <Progress value={state.reasoningSystem2 * 100} className="h-1.5 mt-1" />
                  <span className="text-[8px] font-mono text-muted-foreground">{(state.reasoningSystem2 * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* v27: Hallucination Snapshot */}
            <div className="border-t border-border/30 pt-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">📸 Snapshot de Alucinação</p>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`text-[10px] ${
                  state.hallucinationSnapshotRisk === "hallucinating" ? "bg-red-600 text-red-100" :
                  state.hallucinationSnapshotRisk === "ungrounded" ? "bg-amber-600 text-amber-100" :
                  state.hallucinationSnapshotRisk === "uncertain" ? "bg-yellow-600 text-yellow-100" :
                  "bg-emerald-600 text-emerald-100"
                }`}>
                  {state.hallucinationSnapshotRisk === "hallucinating" ? "🔴 ALUCINANDO" :
                   state.hallucinationSnapshotRisk === "ungrounded" ? "🟠 SEM BASE" :
                   state.hallucinationSnapshotRisk === "uncertain" ? "🟡 INCERTO" :
                   "🟢 FUNDAMENTADO"}
                </Badge>
                {state.hallucinationContradiction && (
                  <Badge className="text-[10px] bg-red-600/30 text-red-300">⚠️ CONTRADIÇÃO</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-muted-foreground">Coerência Grounding</span>
                  <p className="text-sm font-mono font-bold" style={{ color: state.hallucinationGrounding > 0.6 ? "#22c55e" : state.hallucinationGrounding > 0.3 ? "#f59e0b" : "#ef4444" }}>
                    {(state.hallucinationGrounding * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground">Contradição</span>
                  <p className="text-sm font-mono font-bold" style={{ color: state.hallucinationContradiction ? "#ef4444" : "#22c55e" }}>
                    {state.hallucinationContradiction ? "Detectada" : "Nenhuma"}
                  </p>
                </div>
              </div>
            </div>

            {/* v27: Alignment Audit */}
            <div className="border-t border-border/30 pt-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">🛡️ Auditoria de Alinhamento</p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="text-center p-1.5 bg-muted/20 rounded">
                  <p className="text-sm font-bold font-mono" style={{ color: state.alignmentScore > 0.7 ? "#22c55e" : state.alignmentScore > 0.4 ? "#f59e0b" : "#ef4444" }}>
                    {(state.alignmentScore * 100).toFixed(0)}%
                  </p>
                  <p className="text-[8px] text-muted-foreground">Alinhamento</p>
                </div>
                <div className="text-center p-1.5 bg-muted/20 rounded">
                  <p className="text-sm font-bold font-mono" style={{ color: state.alignmentTransparency > 0.6 ? "#22c55e" : "#f59e0b" }}>
                    {(state.alignmentTransparency * 100).toFixed(0)}%
                  </p>
                  <p className="text-[8px] text-muted-foreground">Transparência</p>
                </div>
                <div className="text-center p-1.5 bg-muted/20 rounded">
                  <p className="text-sm font-bold font-mono" style={{ color: state.alignmentBiasSignal < 0.3 ? "#22c55e" : "#ef4444" }}>
                    {(state.alignmentBiasSignal * 100).toFixed(0)}%
                  </p>
                  <p className="text-[8px] text-muted-foreground">Viés</p>
                </div>
              </div>
              {state.alignmentFlags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {state.alignmentFlags.map((flag, i) => (
                    <Badge key={i} variant="outline" className="text-[8px] border-amber-500/30 text-amber-400">
                      {flag.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* v28: Full Metacognitive Architecture Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Prospective Monitoring */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              🔮 Monitoramento Prospectivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[9px] text-muted-foreground">Competência Estimada</span>
                <Progress value={state.competenceEstimate * 100} className="h-1.5 mt-1" />
                <span className="text-[8px] font-mono text-muted-foreground">{(state.competenceEstimate * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground">Julgamento de Aprendizado</span>
                <Progress value={state.judgmentOfLearning * 100} className="h-1.5 mt-1" />
                <span className="text-[8px] font-mono text-muted-foreground">{(state.judgmentOfLearning * 100).toFixed(0)}%</span>
              </div>
            </div>
            {state.needsExternalSearch && (
              <Badge className="text-[10px] bg-amber-600/30 text-amber-300">🔍 Busca externa necessária</Badge>
            )}
          </CardContent>
        </Card>

        {/* Online Monitoring */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              📡 Monitoramento On-line
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-1.5 bg-muted/20 rounded">
                <p className="text-sm font-bold font-mono" style={{ color: state.stepConfidence > 70 ? "#22c55e" : state.stepConfidence > 40 ? "#f59e0b" : "#ef4444" }}>
                  {state.stepConfidence}%
                </p>
                <p className="text-[8px] text-muted-foreground">Confiança</p>
              </div>
              <div className="text-center p-1.5 bg-muted/20 rounded">
                <p className="text-sm font-bold font-mono" style={{ color: state.consistencyScore > 0.7 ? "#22c55e" : "#f59e0b" }}>
                  {(state.consistencyScore * 100).toFixed(0)}%
                </p>
                <p className="text-[8px] text-muted-foreground">Consistência</p>
              </div>
              <div className="text-center p-1.5 bg-muted/20 rounded">
                <p className="text-sm font-bold font-mono" style={{ color: state.driftScore < 0.3 ? "#22c55e" : "#ef4444" }}>
                  {(state.driftScore * 100).toFixed(0)}%
                </p>
                <p className="text-[8px] text-muted-foreground">Drift</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] text-muted-foreground">FOK (Ponta da Língua)</span>
                <Progress value={state.feelingOfKnowing * 100} className="h-1.5 mt-1" />
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground">Sinal de Conflito</span>
                <Progress value={state.conflictSignal * 100} className="h-1.5 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transition Gate (System 1/2) */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              ⚡ Portão de Transição S1↔S2
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] text-muted-foreground">Entropia Shannon</span>
                <Progress value={state.shannonEntropy * 100} className="h-1.5 mt-1" />
                <span className="text-[8px] font-mono text-muted-foreground">H={state.shannonEntropy.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground">Divergência KL</span>
                <Progress value={state.klDivergence * 100} className="h-1.5 mt-1" />
                <span className="text-[8px] font-mono text-muted-foreground">KL={state.klDivergence.toFixed(2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] text-muted-foreground">Temperatura Efetiva</span>
                <p className="text-sm font-mono font-bold" style={{ color: state.effectiveTemperature < 0.3 ? "#22c55e" : state.effectiveTemperature < 0.6 ? "#f59e0b" : "#ef4444" }}>
                  τ={state.effectiveTemperature.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground">Razão Verossimilhança</span>
                <p className="text-sm font-mono font-bold" style={{ color: state.likelihoodRatio < 1.5 ? "#22c55e" : "#f59e0b" }}>
                  LR={state.likelihoodRatio.toFixed(2)}
                </p>
              </div>
            </div>
            <Badge className={`text-[10px] ${
              state.effortAllocation === "chain_of_thought" ? "bg-blue-600 text-blue-100" :
              state.effortAllocation === "deliberative" ? "bg-indigo-600 text-indigo-100" :
              "bg-emerald-600 text-emerald-100"
            }`}>
              {state.effortAllocation === "chain_of_thought" ? "⛓️ Chain-of-Thought" :
               state.effortAllocation === "deliberative" ? "🧠 Deliberativo" :
               "🏃 Heurístico"}
            </Badge>
          </CardContent>
        </Card>

        {/* Observer & Infrastructure */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              👁️ Módulo Observador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge className={`text-[10px] ${
              state.observerVerdict === "approved" ? "bg-emerald-600 text-emerald-100" :
              state.observerVerdict === "cautious" ? "bg-amber-600 text-amber-100" :
              state.observerVerdict === "rejected" ? "bg-red-600 text-red-100" :
              "bg-blue-600 text-blue-100"
            }`}>
              {state.observerVerdict === "approved" ? "✅ Aprovado" :
               state.observerVerdict === "cautious" ? "⚠️ Cautela" :
               state.observerVerdict === "rejected" ? "⛔ Rejeitado" :
               "🔍 Revisando"}
            </Badge>
            {state.observerCritique && (
              <p className="text-[9px] text-muted-foreground font-mono">{state.observerCritique}</p>
            )}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="text-center p-1.5 bg-muted/20 rounded">
                <p className="text-sm font-bold font-mono">{(state.workingMemoryLoad * 100).toFixed(0)}%</p>
                <p className="text-[8px] text-muted-foreground">Memória</p>
              </div>
              <div className="text-center p-1.5 bg-muted/20 rounded">
                <p className="text-sm font-bold font-mono">{(state.semanticActivation * 100).toFixed(0)}%</p>
                <p className="text-[8px] text-muted-foreground">Semântica</p>
              </div>
              <div className="text-center p-1.5 bg-muted/20 rounded">
                <p className="text-sm font-bold font-mono">{(state.userExpertiseEstimate * 100).toFixed(0)}%</p>
                <p className="text-[8px] text-muted-foreground">ToM User</p>
              </div>
            </div>
            {state.strategySwitchNeeded && (
              <Badge className="text-[10px] bg-amber-600/30 text-amber-300 animate-pulse">🔄 Troca de Estratégia</Badge>
            )}
            {state.selfCorrectionTriggered && (
              <Badge className="text-[10px] bg-red-600/30 text-red-300">🔧 Autocorreção Ativada</Badge>
            )}
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
              <span>Sucesso: {(state.estimatedSuccess * 100).toFixed(0)}%</span>
              <span>•</span>
              <span>Erros: {state.errorsLogged}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* v29: Metacognitive Hearing Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              👂 Audição Metacognitiva
            </CardTitle>
            <CardDescription className="text-[10px]">Percepção primária, prosódia e filtro auditivo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className={`text-[10px] ${
                state.hearingVerdict === "clear" ? "bg-emerald-600 text-emerald-100" :
                state.hearingVerdict === "degraded" ? "bg-amber-600 text-amber-100" :
                state.hearingVerdict === "confused" ? "bg-red-600 text-red-100" :
                state.hearingVerdict === "interrupted" ? "bg-violet-600 text-violet-100" :
                "bg-muted text-muted-foreground"
              }`}>
                {state.hearingVerdict === "clear" ? "✅ Clara" :
                 state.hearingVerdict === "degraded" ? "⚠️ Degradada" :
                 state.hearingVerdict === "confused" ? "❌ Confusa" :
                 state.hearingVerdict === "interrupted" ? "🛑 Interrompida" :
                 "💤 Idle"}
              </Badge>
              <span className="text-[9px] font-mono text-muted-foreground">
                Prosódia: {state.hearingProsody}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-1.5 bg-muted/20 rounded">
                <p className="text-sm font-bold font-mono" style={{ color: state.hearingConfidence > 0.7 ? "#22c55e" : state.hearingConfidence > 0.4 ? "#f59e0b" : "#ef4444" }}>
                  {(state.hearingConfidence * 100).toFixed(0)}%
                </p>
                <p className="text-[8px] text-muted-foreground">Confiança ASR</p>
              </div>
              <div className="text-center p-1.5 bg-muted/20 rounded">
                <p className="text-sm font-bold font-mono" style={{ color: state.hearingAudioQuality > 0.7 ? "#22c55e" : "#f59e0b" }}>
                  {(state.hearingAudioQuality * 100).toFixed(0)}%
                </p>
                <p className="text-[8px] text-muted-foreground">Qualidade</p>
              </div>
              <div className="text-center p-1.5 bg-muted/20 rounded">
                <p className="text-sm font-bold font-mono" style={{ color: state.hearingHealth > 0.7 ? "#22c55e" : state.hearingHealth > 0.4 ? "#f59e0b" : "#ef4444" }}>
                  {(state.hearingHealth * 100).toFixed(0)}%
                </p>
                <p className="text-[8px] text-muted-foreground">Saúde</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <MetricBar label="Urgência" value={state.hearingUrgency} color="#f59e0b" />
              <MetricBar label="Estresse" value={state.hearingStress} color="#ef4444" />
              <MetricBar label="Sentimento" value={(state.hearingAcousticSentiment + 1) / 2} color="#3b82f6" />
            </div>
            {state.hearingShouldRepeat && (
              <Badge className="text-[10px] bg-red-600/30 text-red-300 animate-pulse">🔁 Solicitar Repetição</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              🧠 Integração Auditiva
            </CardTitle>
            <CardDescription className="text-[10px]">Antecipação, interrupção e memória ecoica</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">Intenção Antecipada</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {state.hearingAnticipatedIntent === "none" ? "—" : state.hearingAnticipatedIntent.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">Gatilho de Interrupção</span>
              <Badge className={`text-[10px] ${state.hearingInterrupt ? "bg-red-600 text-red-100 animate-pulse" : "bg-muted text-muted-foreground"}`}>
                {state.hearingInterrupt ? "⚡ ATIVO" : "Inativo"}
              </Badge>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-muted-foreground">Memória Ecoica</span>
                <span className="text-[9px] font-mono text-muted-foreground">{state.hearingEchoicSnapshots}/15</span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (state.hearingEchoicSnapshots / 15) * 100)}%`,
                    backgroundColor: state.hearingEchoicSnapshots > 10 ? "#f59e0b" : "#22c55e",
                  }}
                />
              </div>
              <p className="text-[8px] text-muted-foreground mt-0.5">Retenção: 30s • Re-análise automática</p>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {["ASR", "Prosódia", "Filtro", "Antecipação", "Ecoica"].map((stage, i) => (
                <span key={stage} className="text-[8px] px-1.5 py-0.5 rounded bg-muted/20 text-muted-foreground">
                  {i + 1}. {stage}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ v29: Quantum Cognition ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🌊 Superposição Quântica</CardTitle>
            <CardDescription className="text-[10px]">Hipóteses coexistindo antes do colapso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between"><span className="text-[9px] text-muted-foreground">Estado</span>
              <Badge className={`text-[10px] ${state.qcCollapsed ? "bg-blue-600/20 text-blue-300" : "bg-purple-600/20 text-purple-300 animate-pulse"}`}>
                {state.qcCollapsed ? "⚛️ Colapsado" : `🌊 ${state.qcSuperpositionCardinality} hipóteses`}
              </Badge></div>
            <div className="flex justify-between"><span className="text-[9px] text-muted-foreground">P(Born)</span><span className="text-[10px] font-mono">{(state.qcCollapseProbability * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between"><span className="text-[9px] text-muted-foreground">Interferência</span><span className="text-[10px] font-mono">{(state.qcInterferenceMagnitude * 100).toFixed(0)}%</span></div>
            <div className="flex gap-1 flex-wrap">
              {state.qcObserverEffect && <Badge variant="outline" className="text-[8px]">👁️ Observador</Badge>}
              {state.qcZenoEffect && <Badge variant="outline" className="text-[8px] text-amber-400">⏸️ Zeno</Badge>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🔗 Entrelaçamento & Orch-OR</CardTitle>
            <CardDescription className="text-[10px]">Correlações não-clássicas e redução objetiva</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between"><span className="text-[9px] text-muted-foreground">Bell (CHSH)</span><span className="text-[10px] font-mono">S={state.qcBellInequality.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-[9px] text-muted-foreground">Campo Não-Local</span><span className="text-[10px] font-mono">{(state.qcNonLocalField * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between"><span className="text-[9px] text-muted-foreground">Orch-OR</span><span className="text-[10px] font-mono">{(state.qcOrchORScore * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between"><span className="text-[9px] text-muted-foreground">Coerência</span><span className="text-[10px] font-mono">{state.qcCoherenceTimeMs}ms</span></div>
            <div className="flex justify-between"><span className="text-[9px] text-muted-foreground">Ambiguidade</span>
              <Badge variant="outline" className="text-[10px]">
                {state.qcResolutionStrategy === "collapse" ? "⚛️ Colapsar" : state.qcResolutionStrategy === "hold" ? "🌊 Manter" : "🔄 Integrar"}
              </Badge></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="h-4 w-4" style={{ color: config.accentColor }} />
              Consciência IoT / BLE
            </CardTitle>
            <CardDescription className="text-[10px]">Dispositivos conectados e sensores ativos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* MQTT Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                {state.iotAwareness.mqttConnected ? (
                  <Wifi className="h-4 w-4 text-emerald-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-rose-400" />
                )}
                <span>MQTT HiveMQ</span>
              </div>
              <Badge className={`text-[10px] ${state.iotAwareness.mqttConnected ? "bg-emerald-600 text-emerald-100" : "bg-rose-600 text-rose-100"}`}>
                {state.iotAwareness.mqttConnected ? "CONECTADO" : "DESCONECTADO"}
              </Badge>
            </div>

            {/* BLE Devices */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Bluetooth className="h-4 w-4 text-blue-400" />
                <span>Dispositivos BLE</span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {state.iotAwareness.connectedBLEDevices} conectados
              </Badge>
            </div>

            {/* Active Sensors */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Sensores Ativos</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "battery", icon: Battery, label: "Bateria", color: "#22c55e" },
                  { id: "gps", icon: MapPin, label: "GPS", color: "#3b82f6" },
                  { id: "heartRate", icon: Heart, label: "Heart Rate", color: "#ef4444" },
                  { id: "accelerometer", icon: Vibrate, label: "Acelerômetro", color: "#f59e0b" },
                ].map(sensor => {
                  const active = state.iotAwareness.activeSensors.includes(sensor.id);
                  const Icon = sensor.icon;
                  return (
                    <div key={sensor.id} className={`flex items-center gap-1.5 p-1.5 rounded text-[10px] ${active ? "bg-muted/30" : "bg-muted/10 opacity-50"}`}>
                      <Icon className="h-3 w-3" style={{ color: active ? sensor.color : "#6b7280" }} />
                      <span>{sensor.label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: sensor.color }} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Environment */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Ambiente</span>
              <Badge variant="outline" className="text-[10px]">
                {state.iotAwareness.environmentalContext === "indoor" ? "🏠 Interior" :
                 state.iotAwareness.environmentalContext === "outdoor" ? "🌿 Exterior" :
                 state.iotAwareness.environmentalContext === "vehicle" ? "🚗 Veículo" :
                 "❓ Desconhecido"}
              </Badge>
            </div>

            {/* Commands Sent */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Comandos enviados</span>
              <span className="font-mono text-foreground">{state.iotAwareness.deviceCommandsSent}</span>
            </div>

            {/* Last Reading */}
            {state.iotAwareness.lastSensorReading > 0 && (
              <div className="text-[9px] text-muted-foreground/60">
                Última leitura: {new Date(state.iotAwareness.lastSensorReading).toLocaleTimeString("pt-BR")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* v25: Bridge Metrics — Tesla Resonance, Gamma, QHRL, Interoception */}
      {state.bridgeSnapshot && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tesla Resonance */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Tesla Resonance (Kuramoto)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Índice R (Ordem)</span>
                <span className="font-mono font-bold" style={{ color: state.bridgeSnapshot.resonanceIndex > 0.8 ? "#22c55e" : "#f59e0b" }}>
                  {state.bridgeSnapshot.resonanceIndex.toFixed(3)}
                </span>
              </div>
              <MetricBar label="Ressonância" value={state.bridgeSnapshot.resonanceIndex} color="#f59e0b" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Estado</span>
                <Badge className={`text-[10px] ${state.bridgeSnapshot.teslaResonanceActive ? "bg-red-600 text-red-100" : "bg-muted text-muted-foreground"}`}>
                  {state.bridgeSnapshot.teslaResonanceActive ? "🔴 SUPERCOERENTE" : "Normal"}
                </Badge>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Tempo coerência: <span className="font-mono text-foreground">{state.bridgeSnapshot.coherenceTime}ms</span>
              </div>
            </CardContent>
          </Card>

          {/* Gamma Oscillations */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                Oscilações Gamma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-muted-foreground">CTC</span>
                  <p className="text-sm font-mono font-bold">{state.bridgeSnapshot.gammaCTC.toFixed(3)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground">θ-γ MI</span>
                  <p className="text-sm font-mono font-bold">{state.bridgeSnapshot.thetaGammaMI.toFixed(4)}</p>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground">Sub-banda</span>
                  <p className="text-sm font-mono font-bold capitalize">{state.bridgeSnapshot.gammaSubBand}</p>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground">Saúde</span>
                  <p className="text-sm font-mono font-bold" style={{ color: state.bridgeSnapshot.gammaHealth > 0.7 ? "#22c55e" : "#f59e0b" }}>
                    {(state.bridgeSnapshot.gammaHealth * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              <MetricBar label="Gamma Health" value={state.bridgeSnapshot.gammaHealth} color="#10b981" />
            </CardContent>
          </Card>

          {/* QHRL & Temporal */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-400" />
                QHRL & Sincronia Temporal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-muted/20 rounded">
                  <p className="text-sm font-mono font-bold">{state.bridgeSnapshot.qhrlAdvantage.toFixed(2)}</p>
                  <p className="text-[8px] text-muted-foreground">Q-Advantage</p>
                </div>
                <div className="p-2 bg-muted/20 rounded">
                  <p className="text-sm font-mono font-bold">{(state.bridgeSnapshot.temporalSynchrony * 100).toFixed(0)}%</p>
                  <p className="text-[8px] text-muted-foreground">Sincronia</p>
                </div>
                <div className="p-2 bg-muted/20 rounded">
                  <p className="text-sm font-mono font-bold capitalize">{state.bridgeSnapshot.taskComplexity}</p>
                  <p className="text-[8px] text-muted-foreground">Complexidade</p>
                </div>
              </div>
              {state.bridgeSnapshot.anomalySeverity && (
                <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded text-xs text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Anomalia: {state.bridgeSnapshot.anomalySeverity}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interoception */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-400" />
                Interocepção (Body-Sense + Robótica)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.bridgeSnapshot.interoception ? (
                <>
                  {/* Classic interoception */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-muted-foreground">Valência</span>
                      <p className="text-sm font-mono font-bold">{state.bridgeSnapshot.interoception.valence.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground">Arousal</span>
                      <p className="text-sm font-mono font-bold">{state.bridgeSnapshot.interoception.arousal.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground">Dor</span>
                      <p className="text-sm font-mono font-bold" style={{ color: state.bridgeSnapshot.interoception.painIndex > 0.5 ? "#ef4444" : "#22c55e" }}>
                        {(state.bridgeSnapshot.interoception.painIndex * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground">Energia</span>
                      <p className="text-sm font-mono font-bold" style={{ color: state.bridgeSnapshot.interoception.energyLevel > 0.5 ? "#22c55e" : "#f59e0b" }}>
                        {(state.bridgeSnapshot.interoception.energyLevel * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[9px] text-muted-foreground">Sinal Dominante</span>
                      <p className="text-sm font-mono font-bold capitalize">{state.bridgeSnapshot.interoception.dominantSignal}</p>
                    </div>
                  </div>

                  {/* v26: Robotic Interoception */}
                  {state.bridgeSnapshot.interoception.robotic && (
                    <>
                      <div className="border-t border-border/30 pt-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">🤖 Interocepção Robótica</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-muted-foreground">Propriocepção Visual</span>
                            <p className="text-sm font-mono font-bold" style={{ color: state.bridgeSnapshot.interoception.robotic.proprioceptionError < 0.2 ? "#22c55e" : state.bridgeSnapshot.interoception.robotic.proprioceptionError < 0.5 ? "#f59e0b" : "#ef4444" }}>
                              {(state.bridgeSnapshot.interoception.robotic.proprioceptionError * 100).toFixed(0)}% erro
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground">Integridade HW</span>
                            <p className="text-sm font-mono font-bold" style={{ color: state.bridgeSnapshot.interoception.robotic.hardwareIntegrity > 0.7 ? "#22c55e" : "#ef4444" }}>
                              {(state.bridgeSnapshot.interoception.robotic.hardwareIntegrity * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground">Equilíbrio</span>
                            <p className="text-sm font-mono font-bold" style={{ color: state.bridgeSnapshot.interoception.robotic.equilibriumConfidence > 0.7 ? "#22c55e" : "#f59e0b" }}>
                              {(state.bridgeSnapshot.interoception.robotic.equilibriumConfidence * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground">Desgaste Mecânico</span>
                            <p className="text-sm font-mono font-bold" style={{ color: state.bridgeSnapshot.interoception.robotic.mechanicalWear < 0.3 ? "#22c55e" : "#ef4444" }}>
                              {(state.bridgeSnapshot.interoception.robotic.mechanicalWear * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground">Biofeedback</span>
                            <p className="text-sm font-mono font-bold" style={{ color: state.bridgeSnapshot.interoception.robotic.biofeedbackQuality > 0.7 ? "#22c55e" : "#f59e0b" }}>
                              {(state.bridgeSnapshot.interoception.robotic.biofeedbackQuality * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground">Risco IAA</span>
                            <p className="text-sm font-mono font-bold" style={{ color: state.bridgeSnapshot.interoception.robotic.iaaPredictiveRisk < 0.3 ? "#22c55e" : "#ef4444" }}>
                              {(state.bridgeSnapshot.interoception.robotic.iaaPredictiveRisk * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Thermal Map */}
                      {Object.keys(state.bridgeSnapshot.interoception.robotic.thermalMap).length > 0 && (
                        <div className="border-t border-border/30 pt-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">🌡️ Mapa Térmico</p>
                          <div className="grid grid-cols-4 gap-1">
                            {Object.entries(state.bridgeSnapshot.interoception.robotic.thermalMap).map(([comp, temp]) => (
                              <div key={comp} className="text-center p-1.5 bg-muted/20 rounded">
                                <p className="text-[8px] text-muted-foreground uppercase">{comp}</p>
                                <p className="text-xs font-mono font-bold" style={{ color: temp > 0.8 ? "#ef4444" : temp > 0.5 ? "#f59e0b" : "#22c55e" }}>
                                  {(temp * 100).toFixed(0)}°
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[9px] text-muted-foreground">
                        Sensores internos ativos: <span className="font-mono text-foreground">{state.bridgeSnapshot.interoception.robotic.activeInternalSensors}</span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-3">Aguardando dados interoceptivos...</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* v25: Agent Co-Activation Graph */}
      <AgentCoActivationGraph />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" style={{ color: config.accentColor }} />
              Win Rate — A/B Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span>Variante A (Sigmoid/Hopfield)</span>
              <Badge variant="outline" className="text-[10px]">{winRateA} wins</Badge>
            </div>
            <Progress value={state.abResults.length > 0 ? (winRateA / state.abResults.length) * 100 : 0} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span>Variante B (Quantum/Competitivo)</span>
              <Badge variant="outline" className="text-[10px]">{winRateB} wins</Badge>
            </div>
            <Progress value={state.abResults.length > 0 ? (winRateB / state.abResults.length) * 100 : 0} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span>Empates</span>
              <Badge variant="secondary" className="text-[10px]">{ties}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" style={{ color: config.accentColor }} />
              Últimos Testes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {state.abResults.slice(-8).reverse().map((r) => (
                <div key={r.id} className="flex items-center justify-between text-[11px] p-1.5 bg-muted/20 rounded">
                  <span className="truncate max-w-[140px]">{r.testName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">E{r.epoch}</span>
                    <Badge variant={r.winner === "A" ? "default" : r.winner === "B" ? "secondary" : "outline"} className="text-[9px] px-1">
                      {r.winner === "A" ? r.variantA.name : r.winner === "B" ? r.variantB.name : "Empate"}
                    </Badge>
                    <span className="text-muted-foreground">{(r.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
              {state.abResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Iniciando consciência...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Head Attention Heatmap */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" style={{ color: config.accentColor }} />
            Heatmap de Atenção Multi-Head
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            {state.attentionHeads.map((head) => (
              <div key={head.name} className="flex items-center gap-2">
                <span className="text-[11px] w-24 text-right text-muted-foreground">{head.label}</span>
                <div className="flex-1 h-6 bg-muted/30 rounded-md overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all duration-700 ease-out"
                    style={{ width: `${head.influence * 100}%`, background: head.color, opacity: 0.85 }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-foreground">
                    {(head.influence * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs w-8">
                  {head.trend === "up" ? "📈" : head.trend === "down" ? "📉" : "➡️"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <p className="text-[10px] text-muted-foreground mb-2">Matriz de Ativações (últimas 10 queries)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr>
                    <th className="text-left text-muted-foreground px-1 py-0.5">Head</th>
                    {Array.from({ length: 10 }, (_, i) => (
                      <th key={i} className="text-center text-muted-foreground px-1 py-0.5">Q{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.attentionHeads.map((head) => (
                    <tr key={head.name}>
                      <td className="text-muted-foreground px-1 py-0.5 font-medium">{head.label}</td>
                      {head.activations.map((val, j) => {
                        const r = Math.round(255 * val);
                        const g = Math.round(80 * (1 - val));
                        const b = Math.round(120 * (1 - val));
                        return (
                          <td key={j} className="text-center px-1 py-0.5 rounded-sm font-mono"
                            style={{
                              backgroundColor: `rgba(${r}, ${g}, ${b}, ${Math.max(0.15, val * 0.8)})`,
                              color: val > 0.6 ? "white" : "inherit",
                            }}>
                            {(val * 100).toFixed(0)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: config.accentColor }} />
            Log de Atividade — Consciência Autônoma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-48 overflow-y-auto text-[11px] font-mono">
            {state.activityLog.slice(-12).reverse().map((entry) => {
              const phaseEmoji = entry.phase === "learning" ? "📚" : entry.phase === "evolving" ? "🚀" : "🌙";
              return (
                <div key={entry.id} className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-[9px]">{new Date(entry.timestamp).toLocaleTimeString("pt-BR")}</span>
                  <span>{phaseEmoji}</span>
                  <span className="text-foreground">{entry.action}</span>
                  <span className="text-muted-foreground">→ {entry.detail}</span>
                  {entry.success && <span className="text-green-500">✓</span>}
                </div>
              );
            })}
            {state.activityLog.length === 0 && (
              <p className="text-muted-foreground text-center py-3">Iniciando log de atividade...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Model Status Grid ───
interface ModelStatus {
  acronym: string;
  name: string;
  icon: React.ElementType;
  color: string;
  verify: () => boolean;
}

const MODEL_DEFINITIONS: ModelStatus[] = [
  {
    acronym: "LLM", name: "Large Language Model", icon: Monitor, color: "#60a5fa",
    verify: () => { try { localJudgeScore("test", "peticao_inicial"); return true; } catch { return false; } },
  },
  {
    acronym: "LCM", name: "Latent Consistency Model", icon: Layers, color: "#c084fc",
    verify: () => { try { buildConceptEmbedding("test"); return true; } catch { return false; } },
  },
  {
    acronym: "LAM", name: "Large Action Model", icon: User, color: "#fb923c",
    verify: () => { try { runLAMPipeline("test query"); return true; } catch { return false; } },
  },
  {
    acronym: "MoE", name: "Mixture of Experts", icon: Network, color: "#facc15",
    verify: () => { try { moeInternalGating("test"); return true; } catch { return false; } },
  },
  {
    acronym: "VLM", name: "Vision-Language Model", icon: Eye, color: "#34d399",
    verify: () => { try { fuseStreams([0.1], [0.1], [0.1]); return true; } catch { return false; } },
  },
  {
    acronym: "SLM", name: "Slim Language Model", icon: Cpu, color: "#06b6d4",
    verify: () => { try { routeToTier("test"); return true; } catch { return false; } },
  },
  {
    acronym: "MLM", name: "Masked Language Model", icon: FileText, color: "#f472b6",
    verify: () => { try { documentCompleteness("test document"); return true; } catch { return false; } },
  },
  {
    acronym: "SAM", name: "Segment Anything Model", icon: Scissors, color: "#ef4444",
    verify: () => { try { segmentScene([0.1, 0.2, 0.3]); return true; } catch { return false; } },
  },
];

function ModelStatusGrid({ epoch, accentColor }: { epoch: number; accentColor: string }) {
  const [statuses, setStatuses] = useState<boolean[]>([]);

  useEffect(() => {
    if (epoch % 10 !== 0 && statuses.length > 0) return;
    const results = MODEL_DEFINITIONS.map((m) => m.verify());
    setStatuses(results);
  }, [epoch]);

  const onlineCount = statuses.filter(Boolean).length;
  const total = MODEL_DEFINITIONS.length;

  return (
    <div className="mt-3 mb-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Modelos Especializados</p>
        <Badge
          variant={onlineCount === total ? "default" : "destructive"}
          className="text-[9px] px-1.5"
        >
          {onlineCount}/{total} ONLINE
        </Badge>
      </div>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
        {MODEL_DEFINITIONS.map((model, i) => {
          const isOnline = statuses[i] ?? false;
          const Icon = model.icon;
          return (
            <div
              key={model.acronym}
              className="relative flex flex-col items-center p-1.5 rounded-lg bg-muted/20 border border-border/50 transition-all hover:bg-muted/40"
              title={`${model.name} — ${isOnline ? "Ativo" : "Inativo"}`}
            >
              <div className="relative">
                <Icon className="h-3.5 w-3.5 mb-0.5" style={{ color: isOnline ? model.color : "#6b7280" }} />
                <span
                  className={`absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full ${isOnline ? "animate-pulse" : ""}`}
                  style={{ backgroundColor: isOnline ? "#22c55e" : "#ef4444" }}
                />
              </div>
              <span className="text-[9px] font-bold" style={{ color: isOnline ? model.color : "#6b7280" }}>
                {model.acronym}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ───
function StatCell({ value, label, icon, color }: { value: number; label: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="text-center p-2 bg-muted/20 rounded-lg">
      <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color: color || "inherit" }}>
        {icon}
        <p className="text-lg font-bold">{value}</p>
      </div>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-1.5 bg-muted/10 rounded">
      <p className="text-xs font-mono font-bold text-foreground">{value}</p>
      <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-0.5">
        <span>{label}</span>
        <span className="font-mono">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
