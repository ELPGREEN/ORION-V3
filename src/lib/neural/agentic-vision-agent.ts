/**
 * ─── Agentic Vision Agent ───
 * Implements AWS Agentic AI Foundations: Perceive → Reason → Act cycle
 * with Goals, Planning, Decision-Making, Learning, and Memory modules.
 * 
 * Architecture based on:
 * - Nwana's agent taxonomy (Autonomy, Social ability, Reactivity, Proactivity, Adaptability)
 * - Three Pillars: Autonomy, Asynchronicity, Agency
 * - E-R-C-A framework (Specialize, Neural Network, Context, Action)
 * - Cognitive Module: Goals + Plans + Decision-Making
 * - Learning Module: Short-term + Long-term memory with reinforcement
 * 
 * Reference: AWS Prescriptive Guidance - Agentic AI Foundations (July 2025)
 * Reference: StackSpot AI - Agent Architecture (Autonomy Modes, Planning Types, Memory Management)
 */

import type { RealTimeVisionResult, UnifiedDetection } from "./realtime-vision-engine";
import type { MultiTaskResult } from "./yolo-framex-types";

// ─── Types ───

export type AgentGoalType = 
  | "detect_objects"      // General object detection
  | "monitor_safety"      // Safety/PPE inspection (E-R-C-A industrial)
  | "track_person"        // Person tracking across frames
  | "recognize_scene"     // Scene understanding
  | "read_text"           // OCR priority
  | "analyze_emotion"     // Facial emotion analysis
  | "measure_distance"    // Spatial awareness via depth
  | "detect_anomaly"      // Anomaly detection in patterns
  | "navigate"            // Navigation assistance
  | "quality_inspect"     // Quality control inspection
  | "facial_recognition"  // AVFI: Face detect → align → embed → compare → decide
  | "access_control";     // AVFI: Gate access based on facial recognition

export interface VisionGoal {
  type: AgentGoalType;
  priority: number;         // 0-1, higher = more important
  description: string;
  successCriteria: string;
  deadline?: number;        // max ms to achieve
  delegatedBy: "user" | "system" | "self";
  createdAt: number;
}

export interface VisionPlan {
  goalType: AgentGoalType;
  steps: PlanStep[];
  estimatedMs: number;
  confidence: number;
  subGoals: AgentGoalType[];
}

export interface PlanStep {
  action: string;
  module: "perception" | "cognition" | "action" | "learning";
  params: Record<string, unknown>;
  priority: number;
}

export interface VisionDecision {
  action: string;
  confidence: number;
  reasoning: string;
  tradeoffs: string[];
  timestamp: number;
}

export interface VisionBelief {
  key: string;
  value: unknown;
  confidence: number;
  source: "perception" | "reasoning" | "memory" | "learning";
  updatedAt: number;
}

export interface VisionIntention {
  goalType: AgentGoalType;
  plan: VisionPlan;
  status: "pending" | "executing" | "completed" | "failed" | "revised";
  startedAt: number;
  completedAt?: number;
}

export interface ShortTermMemory {
  recentFrames: FrameSnapshot[];
  currentContext: Record<string, unknown>;
  dialogState: string;
  taskInfo: string;
  maxSize: number;
}

export interface LongTermMemory {
  patterns: PatternEntry[];
  successfulStrategies: StrategyEntry[];
  failedStrategies: StrategyEntry[];
  environmentModel: Record<string, unknown>;
  totalExperiences: number;
}

export interface FrameSnapshot {
  timestamp: number;
  objectCount: number;
  faceCount: number;
  dominantEmotion: string | null;
  sceneType: string | null;
  anomalies: string[];
  inferenceMs: number;
}

export interface PatternEntry {
  pattern: string;
  frequency: number;
  lastSeen: number;
  confidence: number;
  context: string;
}

export interface StrategyEntry {
  goalType: AgentGoalType;
  strategy: string;
  successRate: number;
  avgLatencyMs: number;
  sampleCount: number;
  lastUsed: number;
}

// ─── StackSpot-inspired Autonomy & Planning ───

export type AutonomyMode = 
  | "autonomous"           // Executa plano e ferramentas automaticamente
  | "plan_approval"        // Requer aprovação do plano antes de executar
  | "plan_tools_approval"; // Requer aprovação do plano + ferramentas críticas

export type PlanningType =
  | "simple"               // Sem planejamento prévio, execução direta (40% mais rápido)
  | "tool_oriented";       // Planejamento detalhado antes da execução

export type MemoryStrategy =
  | "buffer"               // Armazena mensagens na ordem (janela parcial ou completa)
  | "summary"              // Resume interações anteriores continuamente
  | "vectorized";          // Embeddings + busca por similaridade semântica

export interface AgentConfig {
  autonomyMode: AutonomyMode;
  planningType: PlanningType;
  memoryStrategy: MemoryStrategy;
  maxIterations: number;         // Max LLM interactions before response (StackSpot: até 50)
  similarityThreshold: number;   // 0-1, default 0.4 (StackSpot default: 40%)
  maxKnowledgeObjects: number;   // KOs considered in search (StackSpot default: 4)
  conversationalMode: boolean;   // Multi-turn vs single-turn
}

export interface PendingApproval {
  type: "plan" | "critical_tool";
  plan?: VisionPlan;
  toolAction?: string;
  reason: string;
  createdAt: number;
  approved?: boolean;
}

export interface MemorySummary {
  text: string;
  coveredCycles: number;
  lastUpdatedAt: number;
}

export interface AgentState {
  isActive: boolean;
  currentGoals: VisionGoal[];
  activeIntention: VisionIntention | null;
  beliefs: VisionBelief[];
  decisions: VisionDecision[];
  shortTermMemory: ShortTermMemory;
  longTermMemory: LongTermMemory;
  config: AgentConfig;
  pendingApprovals: PendingApproval[];
  memorySummary: MemorySummary | null;
  fps: number;
  cycleCount: number;
  autonomyLevel: number; // 0-1: how independently the agent operates
}

// ─── Constants ───

const STM_MAX_FRAMES = 30;        // ~5 seconds at 6 FPS
const LTM_MAX_PATTERNS = 200;
const LTM_MAX_STRATEGIES = 50;
const DECISION_HISTORY_MAX = 20;
const BELIEF_DECAY_MS = 30_000;    // beliefs lose confidence after 30s
const LTM_STORAGE_KEY = "orion_vision_agent_ltm";
const GOALS_STORAGE_KEY = "orion_vision_agent_goals";

// ─── Agent Singleton ───

let _agentState: AgentState = createInitialState();

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  autonomyMode: "autonomous",
  planningType: "simple",
  memoryStrategy: "buffer",
  maxIterations: 30,
  similarityThreshold: 0.4,
  maxKnowledgeObjects: 4,
  conversationalMode: true,
};

function createInitialState(): AgentState {
  return {
    isActive: false,
    currentGoals: [],
    activeIntention: null,
    beliefs: [],
    decisions: [],
    shortTermMemory: {
      recentFrames: [],
      currentContext: {},
      dialogState: "idle",
      taskInfo: "",
      maxSize: STM_MAX_FRAMES,
    },
    longTermMemory: loadLTM(),
    config: { ...DEFAULT_AGENT_CONFIG },
    pendingApprovals: [],
    memorySummary: null,
    fps: 0,
    cycleCount: 0,
    autonomyLevel: 0.7,
  };
}

// ─── Persistence ───

function loadLTM(): LongTermMemory {
  try {
    const raw = localStorage.getItem(LTM_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    patterns: [],
    successfulStrategies: [],
    failedStrategies: [],
    environmentModel: {},
    totalExperiences: 0,
  };
}

function saveLTM(): void {
  try {
    localStorage.setItem(LTM_STORAGE_KEY, JSON.stringify(_agentState.longTermMemory));
  } catch {}
}

// ─── PERCEIVE Module ───

function perceive(visionResult: RealTimeVisionResult): FrameSnapshot {
  const snapshot: FrameSnapshot = {
    timestamp: Date.now(),
    objectCount: visionResult.allObjects.length,
    faceCount: visionResult.faces.length,
    dominantEmotion: extractDominantEmotion(visionResult),
    sceneType: visionResult.frameXResult?.scenario?.label || null,
    anomalies: detectAnomalies(visionResult),
    inferenceMs: visionResult.inferenceMs,
  };

  // Update short-term memory
  const stm = _agentState.shortTermMemory;
  stm.recentFrames.push(snapshot);
  if (stm.recentFrames.length > stm.maxSize) {
    stm.recentFrames.shift();
  }

  // Update beliefs from perception
  updateBelief("scene_type", snapshot.sceneType, 0.9, "perception");
  updateBelief("object_count", snapshot.objectCount, 0.95, "perception");
  updateBelief("face_count", snapshot.faceCount, 0.95, "perception");
  updateBelief("has_anomaly", snapshot.anomalies.length > 0, 0.85, "perception");
  
  if (snapshot.dominantEmotion) {
    updateBelief("dominant_emotion", snapshot.dominantEmotion, 0.8, "perception");
  }

  // Track objects for patterns
  for (const obj of visionResult.allObjects) {
    trackPattern(`object:${obj.namePt}`, obj.confidence, snapshot.sceneType || "unknown");
  }

  return snapshot;
}

function extractDominantEmotion(result: RealTimeVisionResult): string | null {
  if (result.faceAttributes.length === 0) return null;
  const first = result.faceAttributes[0];
  return first.emotion || null;
}

function detectAnomalies(result: RealTimeVisionResult): string[] {
  const anomalies: string[] = [];
  const stm = _agentState.shortTermMemory;
  
  if (stm.recentFrames.length < 3) return anomalies;
  
  const recent = stm.recentFrames.slice(-3);
  const avgObjects = recent.reduce((s, f) => s + f.objectCount, 0) / recent.length;
  
  // Sudden object count change (>50% deviation)
  if (result.allObjects.length > 0 && Math.abs(result.allObjects.length - avgObjects) / (avgObjects + 1) > 0.5) {
    anomalies.push(`object_count_spike:${result.allObjects.length}vs${Math.round(avgObjects)}`);
  }

  // New high-confidence object not seen in recent frames
  const recentPatterns = new Set(stm.recentFrames.slice(-5).flatMap(f => 
    Object.keys(f).filter(k => k.startsWith("object:"))
  ));
  for (const obj of result.allObjects) {
    if (obj.confidence > 0.8 && !recentPatterns.has(`object:${obj.namePt}`)) {
      anomalies.push(`new_object:${obj.namePt}`);
    }
  }

  return anomalies;
}

// ─── REASON Module ───

function reason(snapshot: FrameSnapshot, visionResult: RealTimeVisionResult): VisionDecision | null {
  const goals = _agentState.currentGoals.sort((a, b) => b.priority - a.priority);
  if (goals.length === 0) return null;

  const topGoal = goals[0];
  
  // Generate plan if no active intention
  if (!_agentState.activeIntention || _agentState.activeIntention.goalType !== topGoal.type) {
    const plan = generatePlan(topGoal, snapshot, visionResult);
    _agentState.activeIntention = {
      goalType: topGoal.type,
      plan,
      status: "executing",
      startedAt: Date.now(),
    };
  }

  // Decision-making: evaluate current state against goal
  const decision = makeDecision(topGoal, snapshot, visionResult);
  
  // Store decision
  _agentState.decisions.push(decision);
  if (_agentState.decisions.length > DECISION_HISTORY_MAX) {
    _agentState.decisions.shift();
  }

  return decision;
}

function generatePlan(goal: VisionGoal, snapshot: FrameSnapshot, result: RealTimeVisionResult): VisionPlan {
  const steps: PlanStep[] = [];
  const subGoals: AgentGoalType[] = [];

  switch (goal.type) {
    case "monitor_safety":
      steps.push(
        { action: "detect_persons", module: "perception", params: { minConfidence: 0.7 }, priority: 1 },
        { action: "check_ppe_equipment", module: "cognition", params: { requiredItems: ["capacete", "colete", "bota"] }, priority: 0.9 },
        { action: "measure_distances", module: "perception", params: { dangerZoneMeters: 2 }, priority: 0.85 },
        { action: "classify_risk_level", module: "cognition", params: {}, priority: 0.8 },
        { action: "emit_alert_if_violation", module: "action", params: { alertType: "sonoro" }, priority: 1 },
      );
      subGoals.push("detect_objects", "measure_distance");
      break;

    case "track_person":
      steps.push(
        { action: "detect_faces", module: "perception", params: { minConfidence: 0.6 }, priority: 1 },
        { action: "extract_embeddings", module: "perception", params: {}, priority: 0.9 },
        { action: "match_identity", module: "cognition", params: {}, priority: 0.85 },
        { action: "track_movement", module: "perception", params: { bufferFrames: 4 }, priority: 0.8 },
      );
      subGoals.push("analyze_emotion");
      break;

    case "detect_anomaly":
      steps.push(
        { action: "baseline_scene", module: "perception", params: {}, priority: 1 },
        { action: "compare_to_baseline", module: "cognition", params: { deviationThreshold: 0.3 }, priority: 0.9 },
        { action: "classify_anomaly_type", module: "cognition", params: {}, priority: 0.85 },
        { action: "log_anomaly", module: "action", params: {}, priority: 0.8 },
      );
      break;

    case "quality_inspect":
      steps.push(
        { action: "capture_highres", module: "perception", params: {}, priority: 1 },
        { action: "detect_defects", module: "cognition", params: { models: ["yolo", "mediapipe"] }, priority: 0.95 },
        { action: "measure_dimensions", module: "perception", params: {}, priority: 0.85 },
        { action: "grade_quality", module: "cognition", params: { scale: "pass_fail" }, priority: 0.9 },
        { action: "generate_report", module: "action", params: {}, priority: 0.8 },
      );
      subGoals.push("read_text", "measure_distance");
      break;

    default:
      steps.push(
        { action: "full_scan", module: "perception", params: {}, priority: 1 },
        { action: "classify_scene", module: "cognition", params: {}, priority: 0.8 },
        { action: "report_findings", module: "action", params: {}, priority: 0.7 },
      );
  }

  // Check long-term memory for successful strategies
  const pastStrategy = _agentState.longTermMemory.successfulStrategies
    .find(s => s.goalType === goal.type && s.successRate > 0.7);

  return {
    goalType: goal.type,
    steps,
    estimatedMs: pastStrategy?.avgLatencyMs || 200,
    confidence: pastStrategy?.successRate || 0.5,
    subGoals,
  };
}

function makeDecision(goal: VisionGoal, snapshot: FrameSnapshot, result: RealTimeVisionResult): VisionDecision {
  const tradeoffs: string[] = [];
  let action = "continue_monitoring";
  let confidence = 0.5;
  let reasoning = "";

  switch (goal.type) {
    case "monitor_safety": {
      const persons = result.allObjects.filter(o => o.name === "person" || o.namePt === "pessoa");
      const hasDepth = !!result.depthResult;

      if (persons.length === 0) {
        action = "area_clear";
        confidence = 0.9;
        reasoning = "Nenhuma pessoa detectada na área monitorada";
      } else if (snapshot.anomalies.length > 0) {
        action = "emit_alert";
        confidence = 0.85;
        reasoning = `Anomalia detectada: ${snapshot.anomalies.join(", ")}`;
        tradeoffs.push("Possível falso positivo se iluminação mudou");
      } else {
        action = "continue_monitoring";
        confidence = 0.7;
        reasoning = `${persons.length} pessoa(s) detectada(s), sem violações`;
      }
      
      if (!hasDepth) tradeoffs.push("Sem estimativa de profundidade — distâncias imprecisas");
      break;
    }

    case "analyze_emotion": {
      if (result.faceAttributes.length > 0) {
        const emotion = snapshot.dominantEmotion || "neutro";
        action = `emotion_detected:${emotion}`;
        confidence = 0.8;
        reasoning = `Emoção dominante: ${emotion} em ${result.faceAttributes.length} rosto(s)`;
      } else {
        action = "no_face";
        confidence = 0.9;
        reasoning = "Nenhum rosto detectado para análise emocional";
      }
      break;
    }

    case "detect_anomaly": {
      if (snapshot.anomalies.length > 0) {
        action = `anomaly:${snapshot.anomalies[0]}`;
        confidence = 0.75;
        reasoning = `Anomalia detectada: ${snapshot.anomalies.join(", ")}`;
        tradeoffs.push("Limiar de desvio pode gerar falsos positivos em ambientes dinâmicos");
      } else {
        action = "normal";
        confidence = 0.85;
        reasoning = "Nenhuma anomalia detectada — dentro dos padrões esperados";
      }
      break;
    }

    default: {
      action = "observe";
      confidence = 0.6;
      reasoning = `Monitoramento geral: ${snapshot.objectCount} objetos, ${snapshot.faceCount} rostos`;
    }
  }

  return {
    action,
    confidence,
    reasoning,
    tradeoffs,
    timestamp: Date.now(),
  };
}

// ─── ACT Module ───

export interface VisionAction {
  type: "alert" | "log" | "report" | "escalate" | "adapt" | "learn";
  payload: Record<string, unknown>;
  timestamp: number;
}

function act(decision: VisionDecision, snapshot: FrameSnapshot): VisionAction[] {
  const actions: VisionAction[] = [];

  // Always log
  actions.push({
    type: "log",
    payload: {
      decision: decision.action,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      frameInfo: {
        objects: snapshot.objectCount,
        faces: snapshot.faceCount,
        scene: snapshot.sceneType,
      },
    },
    timestamp: Date.now(),
  });

  // Alert on high-priority events
  if (decision.action === "emit_alert" || decision.action.startsWith("anomaly:")) {
    actions.push({
      type: "alert",
      payload: {
        severity: decision.confidence > 0.8 ? "high" : "medium",
        message: decision.reasoning,
        anomalies: snapshot.anomalies,
      },
      timestamp: Date.now(),
    });
  }

  // Escalate if confidence is low but action is critical
  if (decision.confidence < 0.5 && _agentState.currentGoals.some(g => g.priority > 0.8)) {
    actions.push({
      type: "escalate",
      payload: {
        reason: "Low confidence on high-priority goal",
        decision: decision.action,
        confidence: decision.confidence,
      },
      timestamp: Date.now(),
    });
  }

  return actions;
}

// ─── LEARN Module ───

function learn(decision: VisionDecision, actions: VisionAction[], snapshot: FrameSnapshot): void {
  const ltm = _agentState.longTermMemory;
  ltm.totalExperiences++;

  // Update strategy success rates
  const goalType = _agentState.activeIntention?.goalType;
  if (goalType) {
    const isSuccess = decision.confidence > 0.6 && !decision.action.includes("fail");
    const targetList = isSuccess ? ltm.successfulStrategies : ltm.failedStrategies;
    
    const existing = targetList.find(s => s.goalType === goalType);
    if (existing) {
      const newCount = existing.sampleCount + 1;
      existing.successRate = (existing.successRate * existing.sampleCount + (isSuccess ? 1 : 0)) / newCount;
      existing.avgLatencyMs = (existing.avgLatencyMs * existing.sampleCount + snapshot.inferenceMs) / newCount;
      existing.sampleCount = newCount;
      existing.lastUsed = Date.now();
    } else {
      targetList.push({
        goalType,
        strategy: decision.action,
        successRate: isSuccess ? 1 : 0,
        avgLatencyMs: snapshot.inferenceMs,
        sampleCount: 1,
        lastUsed: Date.now(),
      });
    }

    // Trim strategies
    if (targetList.length > LTM_MAX_STRATEGIES) {
      targetList.sort((a, b) => b.lastUsed - a.lastUsed);
      targetList.length = LTM_MAX_STRATEGIES;
    }
  }

  // Decay old beliefs
  const now = Date.now();
  _agentState.beliefs = _agentState.beliefs.filter(b => {
    const age = now - b.updatedAt;
    if (age > BELIEF_DECAY_MS) {
      b.confidence *= 0.9; // gradual decay
      return b.confidence > 0.1;
    }
    return true;
  });

  // Persist every 10 cycles
  if (_agentState.cycleCount % 10 === 0) {
    saveLTM();
  }
}

// ─── Belief Management ───

function updateBelief(key: string, value: unknown, confidence: number, source: VisionBelief["source"]): void {
  const existing = _agentState.beliefs.find(b => b.key === key);
  if (existing) {
    existing.value = value;
    existing.confidence = Math.max(existing.confidence, confidence);
    existing.source = source;
    existing.updatedAt = Date.now();
  } else {
    _agentState.beliefs.push({ key, value, confidence, source, updatedAt: Date.now() });
  }
}

function getBelief(key: string): VisionBelief | undefined {
  return _agentState.beliefs.find(b => b.key === key);
}

// ─── Pattern Tracking ───

function trackPattern(pattern: string, confidence: number, context: string): void {
  const ltm = _agentState.longTermMemory;
  const existing = ltm.patterns.find(p => p.pattern === pattern);
  if (existing) {
    existing.frequency++;
    existing.lastSeen = Date.now();
    existing.confidence = (existing.confidence + confidence) / 2;
  } else {
    ltm.patterns.push({ pattern, frequency: 1, lastSeen: Date.now(), confidence, context });
  }

  if (ltm.patterns.length > LTM_MAX_PATTERNS) {
    ltm.patterns.sort((a, b) => b.frequency - a.frequency);
    ltm.patterns.length = LTM_MAX_PATTERNS;
  }
}

// ─── Memory Management (StackSpot-inspired) ───

function updateMemory(snapshot: FrameSnapshot, decision: VisionDecision | null): void {
  const strategy = _agentState.config.memoryStrategy;

  switch (strategy) {
    case "summary": {
      // Compress STM into running summary every 10 cycles
      if (_agentState.cycleCount % 10 === 0 && _agentState.shortTermMemory.recentFrames.length > 0) {
        const frames = _agentState.shortTermMemory.recentFrames;
        const avgObjects = frames.reduce((s, f) => s + f.objectCount, 0) / frames.length;
        const avgFaces = frames.reduce((s, f) => s + f.faceCount, 0) / frames.length;
        const avgLatency = frames.reduce((s, f) => s + f.inferenceMs, 0) / frames.length;
        const allAnomalies = [...new Set(frames.flatMap(f => f.anomalies))];
        const scenes = [...new Set(frames.map(f => f.sceneType).filter(Boolean))];

        const summaryText = [
          `Ciclos ${_agentState.cycleCount - frames.length}–${_agentState.cycleCount}:`,
          `Média: ${avgObjects.toFixed(1)} objetos, ${avgFaces.toFixed(1)} rostos, ${avgLatency.toFixed(0)}ms`,
          scenes.length > 0 ? `Cenas: ${scenes.join(", ")}` : null,
          allAnomalies.length > 0 ? `Anomalias: ${allAnomalies.join(", ")}` : null,
          decision ? `Última decisão: ${decision.action} (${(decision.confidence * 100).toFixed(0)}%)` : null,
        ].filter(Boolean).join(" | ");

        const prev = _agentState.memorySummary;
        _agentState.memorySummary = {
          text: prev ? `${prev.text}\n${summaryText}` : summaryText,
          coveredCycles: _agentState.cycleCount,
          lastUpdatedAt: Date.now(),
        };

        // Trim summary to last 500 chars
        if (_agentState.memorySummary.text.length > 500) {
          _agentState.memorySummary.text = _agentState.memorySummary.text.slice(-500);
        }

        // Clear STM after summarizing
        _agentState.shortTermMemory.recentFrames = _agentState.shortTermMemory.recentFrames.slice(-3);
      }
      break;
    }
    case "vectorized": {
      // In vectorized mode, we keep a compact STM and rely on LTM patterns as "embeddings"
      // Trim STM aggressively (keep only last 5 frames)
      if (_agentState.shortTermMemory.recentFrames.length > 5) {
        _agentState.shortTermMemory.recentFrames = _agentState.shortTermMemory.recentFrames.slice(-5);
      }
      break;
    }
    case "buffer":
    default:
      // Buffer mode: keep full window (already handled by STM maxSize)
      break;
  }
}

// ─── Autonomy Gate (StackSpot-inspired) ───

function checkAutonomyGate(plan: VisionPlan, decision: VisionDecision): boolean {
  const mode = _agentState.config.autonomyMode;

  if (mode === "autonomous") return true;

  if (mode === "plan_approval") {
    // Queue plan for approval if new
    if (_agentState.activeIntention?.status === "executing" && !_agentState.pendingApprovals.some(p => p.type === "plan")) {
      _agentState.pendingApprovals.push({
        type: "plan",
        plan,
        reason: `Plano para ${plan.goalType} com ${plan.steps.length} etapas`,
        createdAt: Date.now(),
      });
      return false; // Block until approved
    }
    // Check if approved
    const approval = _agentState.pendingApprovals.find(p => p.type === "plan" && p.approved);
    return !!approval;
  }

  if (mode === "plan_tools_approval") {
    // Like plan_approval but also gate critical actions (alerts, escalations)
    const isCritical = decision.action === "emit_alert" || decision.action.startsWith("anomaly:");
    if (isCritical && !_agentState.pendingApprovals.some(p => p.type === "critical_tool" && p.toolAction === decision.action)) {
      _agentState.pendingApprovals.push({
        type: "critical_tool",
        toolAction: decision.action,
        reason: `Ação crítica: ${decision.action} — ${decision.reasoning}`,
        createdAt: Date.now(),
      });
      return false;
    }
    const toolApproval = _agentState.pendingApprovals.find(
      p => p.type === "critical_tool" && p.toolAction === decision.action && p.approved
    );
    return isCritical ? !!toolApproval : true;
  }

  return true;
}

// ─── Main Agentic Cycle: Perceive → Reason → Act → Learn ───

export interface AgenticVisionCycleResult {
  snapshot: FrameSnapshot;
  decision: VisionDecision | null;
  actions: VisionAction[];
  beliefs: VisionBelief[];
  pendingApprovals: PendingApproval[];
  blocked: boolean;
  cycleMs: number;
  cycleCount: number;
}

export function runAgenticVisionCycle(visionResult: RealTimeVisionResult): AgenticVisionCycleResult {
  const start = performance.now();
  _agentState.cycleCount++;

  // Check iteration limit (StackSpot: maxIterations)
  if (_agentState.cycleCount > _agentState.config.maxIterations) {
    return {
      snapshot: { timestamp: Date.now(), objectCount: 0, faceCount: 0, dominantEmotion: null, sceneType: null, anomalies: [], inferenceMs: 0 },
      decision: { action: "max_iterations_reached", confidence: 1, reasoning: `Limite de ${_agentState.config.maxIterations} iterações atingido`, tradeoffs: [], timestamp: Date.now() },
      actions: [],
      beliefs: [..._agentState.beliefs],
      pendingApprovals: [..._agentState.pendingApprovals],
      blocked: true,
      cycleMs: Math.round(performance.now() - start),
      cycleCount: _agentState.cycleCount,
    };
  }

  // 1. PERCEIVE — Extract structured understanding from raw sensor data
  const snapshot = perceive(visionResult);

  // 2. REASON — Evaluate goals, form intentions, make decisions
  const decision = reason(snapshot, visionResult);

  // 3. AUTONOMY GATE — Check if action is allowed under current mode
  let blocked = false;
  let actions: VisionAction[] = [];
  if (decision && _agentState.activeIntention) {
    const allowed = checkAutonomyGate(_agentState.activeIntention.plan, decision);
    if (allowed) {
      // 4. ACT — Execute decided actions
      actions = act(decision, snapshot);
    } else {
      blocked = true;
    }
  }

  // 5. LEARN — Update memory and strategies from experience
  if (decision && !blocked) {
    learn(decision, actions, snapshot);
  }

  // 6. MEMORY MANAGEMENT — Apply strategy-specific memory handling
  updateMemory(snapshot, decision);

  return {
    snapshot,
    decision,
    actions,
    beliefs: [..._agentState.beliefs],
    pendingApprovals: [..._agentState.pendingApprovals],
    blocked,
    cycleMs: Math.round(performance.now() - start),
    cycleCount: _agentState.cycleCount,
  };
}
// ─── Public API ───

export function setVisionGoals(goals: VisionGoal[]): void {
  _agentState.currentGoals = goals;
  _agentState.activeIntention = null; // re-plan
}

export function addVisionGoal(goal: VisionGoal): void {
  _agentState.currentGoals.push(goal);
  _agentState.currentGoals.sort((a, b) => b.priority - a.priority);
}

export function removeVisionGoal(type: AgentGoalType): void {
  _agentState.currentGoals = _agentState.currentGoals.filter(g => g.type !== type);
  if (_agentState.activeIntention?.goalType === type) {
    _agentState.activeIntention = null;
  }
}

export function getAgentState(): Readonly<AgentState> {
  return _agentState;
}

export function resetAgent(): void {
  _agentState = createInitialState();
}

export function setAutonomyLevel(level: number): void {
  _agentState.autonomyLevel = Math.max(0, Math.min(1, level));
}

export function configureAgent(config: Partial<AgentConfig>): void {
  _agentState.config = { ..._agentState.config, ...config };
}

export function getAgentConfig(): Readonly<AgentConfig> {
  return _agentState.config;
}

export function approveAction(index: number): void {
  if (_agentState.pendingApprovals[index]) {
    _agentState.pendingApprovals[index].approved = true;
  }
}

export function rejectAction(index: number): void {
  _agentState.pendingApprovals.splice(index, 1);
}

export function clearApprovals(): void {
  _agentState.pendingApprovals = [];
}

export function getAgentSummaryForAI(): string {
  const state = _agentState;
  const parts: string[] = [];

  parts.push(`[AGENTE VISUAL] Ciclo #${state.cycleCount} | Autonomia: ${(state.autonomyLevel * 100).toFixed(0)}% | Modo: ${state.config.autonomyMode} | Planejamento: ${state.config.planningType} | Memória: ${state.config.memoryStrategy}`);

  if (state.pendingApprovals.length > 0) {
    parts.push(`⏳ ${state.pendingApprovals.length} ação(ões) aguardando aprovação`);
  }
  
  if (state.currentGoals.length > 0) {
    parts.push(`Metas ativas: ${state.currentGoals.map(g => `${g.type}(p=${g.priority})`).join(", ")}`);
  }

  if (state.activeIntention) {
    parts.push(`Intenção: ${state.activeIntention.goalType} [${state.activeIntention.status}]`);
  }

  const recentDecision = state.decisions[state.decisions.length - 1];
  if (recentDecision) {
    parts.push(`Última decisão: ${recentDecision.action} (conf=${(recentDecision.confidence * 100).toFixed(0)}%) — ${recentDecision.reasoning}`);
  }

  const topBeliefs = state.beliefs
    .filter(b => b.confidence > 0.5)
    .slice(0, 5)
    .map(b => `${b.key}=${JSON.stringify(b.value)}(${(b.confidence * 100).toFixed(0)}%)`);
  if (topBeliefs.length > 0) {
    parts.push(`Crenças: ${topBeliefs.join(", ")}`);
  }

  const ltm = state.longTermMemory;
  if (ltm.totalExperiences > 0) {
    parts.push(`Memória: ${ltm.totalExperiences} experiências | ${ltm.patterns.length} padrões | ${ltm.successfulStrategies.length} estratégias`);
  }

  // Anomaly summary from STM
  const recentAnomalies = state.shortTermMemory.recentFrames
    .slice(-5)
    .flatMap(f => f.anomalies);
  if (recentAnomalies.length > 0) {
    const unique = [...new Set(recentAnomalies)];
    parts.push(`⚠️ Anomalias recentes: ${unique.join(", ")}`);
  }

  return parts.join(" | ");
}

/**
 * Format the full agent context for injection into reasoning prompt
 */
export function formatAgentContextForPrompt(): string {
  const summary = getAgentSummaryForAI();
  const stm = _agentState.shortTermMemory;
  
  const parts = [summary];
  
  // Temporal awareness from STM
  if (stm.recentFrames.length >= 3) {
    const trend = analyzeTrend(stm.recentFrames);
    if (trend) parts.push(`Tendência: ${trend}`);
  }

  // Include memory summary if using summary strategy
  if (_agentState.memorySummary && _agentState.config.memoryStrategy === "summary") {
    parts.push(`[Resumo de memória] ${_agentState.memorySummary.text}`);
  }

  return parts.join("\n");
}

function analyzeTrend(frames: FrameSnapshot[]): string | null {
  if (frames.length < 3) return null;
  
  const recent = frames.slice(-5);
  const objectCounts = recent.map(f => f.objectCount);
  const avgInference = recent.reduce((s, f) => s + f.inferenceMs, 0) / recent.length;
  
  const isIncreasing = objectCounts.every((v, i) => i === 0 || v >= objectCounts[i - 1]);
  const isDecreasing = objectCounts.every((v, i) => i === 0 || v <= objectCounts[i - 1]);
  
  if (isIncreasing && objectCounts[objectCounts.length - 1] > objectCounts[0] + 2) {
    return `objetos aumentando (${objectCounts[0]}→${objectCounts[objectCounts.length - 1]})`;
  }
  if (isDecreasing && objectCounts[0] > objectCounts[objectCounts.length - 1] + 2) {
    return `objetos diminuindo (${objectCounts[0]}→${objectCounts[objectCounts.length - 1]})`;
  }
  
  if (avgInference > 300) {
    return `latência alta (${Math.round(avgInference)}ms) — considerar reduzir resolução`;
  }
  
  return null;
}
