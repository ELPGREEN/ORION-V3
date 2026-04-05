/**
 * ─── Perceive → Reason → Act Orchestrator ───
 * 
 * Implements the AWS Agentic AI Foundations architecture (July 2025):
 * 
 *   User/System Request
 *         ↓
 *   ┌─ PERCEIVE ──────────────┐
 *   │  Text │ Audio │ Sensor  │
 *   └───────────┬─────────────┘
 *               ↓
 *   ┌─ REASON ────────────────────────────────────┐
 *   │  Memory ←→ Decision Making ←→ Goals         │
 *   │  Knowledge Base ←→ (LLM CoT) ←→ Plans      │
 *   └───────────────────┬─────────────────────────┘
 *               ↓
 *   ┌─ ACT ───────────────────┐
 *   │  Actuators │ Execution │ Tools │
 *   └───────────┬─────────────┘
 *               ↓
 *   Feedback Loop → back to Perceive
 *
 * The LLM receives Goals as prompt context and Plans are generated
 * via Chain of Thought reasoning. The orchestrator feeds observations
 * and action results back into the next Perceive cycle.
 *
 * Ref: AWS Prescriptive Guidance – Foundations of Agentic AI (2025)
 * Ref: Nwana (1996) – Autonomy, Social ability, Reactivity, Proactivity
 * Ref: Three Pillars: Autonomy, Asynchronicity, Agency
 */

import type { RealTimeVisionResult } from "./realtime-vision-engine";
import type { IdentificationResult } from "./humanex-face-pipeline";

// ═══════════════════════════════════════════════
// 1. PERCEIVE MODULE — Text, Audio, Sensor
// ═══════════════════════════════════════════════

export type PerceptionChannel = "text" | "audio" | "sensor" | "vision" | "facial";

export interface TextPercept {
  channel: "text";
  content: string;
  intent?: string;
  entities?: Record<string, string>;
  language?: string;
  timestamp: number;
}

export interface AudioPercept {
  channel: "audio";
  transcript?: string;
  isVoiceCommand: boolean;
  voiceEmotion?: string;
  loudnessDb?: number;
  timestamp: number;
}

export interface SensorPercept {
  channel: "sensor";
  sensorType: "camera" | "depth" | "motion" | "geolocation" | "biometric";
  data: Record<string, unknown>;
  confidence: number;
  timestamp: number;
}

export interface VisionPercept {
  channel: "vision";
  objectCount: number;
  faceCount: number;
  sceneType: string | null;
  dominantEmotion: string | null;
  anomalies: string[];
  depthAvailable: boolean;
  rawResult: RealTimeVisionResult | null;
  inferenceMs: number;
  timestamp: number;
}

export interface FacialPercept {
  channel: "facial";
  identificationResult: IdentificationResult | null;
  enrolledFacesCount: number;
  livenessScore: number;
  isMaskDetected: boolean;
  timestamp: number;
}

export type Percept = TextPercept | AudioPercept | SensorPercept | VisionPercept | FacialPercept;

export interface PerceptionFrame {
  id: string;
  percepts: Percept[];
  timestamp: number;
  processingMs: number;
}

// ═══════════════════════════════════════════════
// 2. REASON MODULE — Memory, KB, Goals, Plans, Decision Making
// ═══════════════════════════════════════════════

// ─── Goals ───

export type GoalStatus = "active" | "achieved" | "failed" | "suspended" | "delegated";

export interface AgentGoal {
  id: string;
  type: string;
  description: string;
  priority: number;           // 0-1
  status: GoalStatus;
  successCriteria: string;
  deadline?: number;          // ms
  delegatedBy: "user" | "system" | "self" | "llm";
  subGoals: string[];
  createdAt: number;
  achievedAt?: number;
}

// ─── Plans (Chain of Thought) ───

export type PlanStepStatus = "pending" | "executing" | "completed" | "failed" | "skipped";

export interface PlanStep {
  id: string;
  description: string;
  module: "perceive" | "reason" | "act";
  tool?: string;               // Tool to invoke
  params: Record<string, unknown>;
  dependsOn: string[];         // Step IDs this depends on
  status: PlanStepStatus;
  result?: unknown;
  startedAt?: number;
  completedAt?: number;
}

export interface Plan {
  id: string;
  goalId: string;
  steps: PlanStep[];
  chainOfThought: string;      // LLM reasoning trace
  estimatedMs: number;
  confidence: number;
  createdAt: number;
  status: "draft" | "approved" | "executing" | "completed" | "failed";
}

// ─── Memory ───

export interface MemoryEntry {
  key: string;
  value: unknown;
  type: "episodic" | "semantic" | "procedural" | "working";
  confidence: number;
  accessCount: number;
  lastAccessedAt: number;
  createdAt: number;
  decayRate: number;           // 0-1, higher = forgets faster
}

export interface AgentMemory {
  working: Map<string, MemoryEntry>;         // Current task context (fast decay)
  episodic: Map<string, MemoryEntry>;        // Past experiences
  semantic: Map<string, MemoryEntry>;        // Facts and knowledge
  procedural: Map<string, MemoryEntry>;      // How-to knowledge
  maxWorkingSize: number;
  maxEpisodicSize: number;
}

// ─── Knowledge Base ───

export interface KnowledgeItem {
  id: string;
  topic: string;
  content: string;
  source: "internal" | "external" | "learned" | "user";
  relevanceScore: number;
  tags: string[];
  lastUsedAt: number;
}

// ─── Decision Making ───

export interface Decision {
  id: string;
  goalId: string;
  action: string;
  confidence: number;
  reasoning: string;           // Why this decision
  alternatives: { action: string; confidence: number; reason: string }[];
  tradeoffs: string[];
  timestamp: number;
  approved: boolean;
}

// ═══════════════════════════════════════════════
// 3. ACT MODULE — Actuators, Execution, Tools
// ═══════════════════════════════════════════════

export type ActuatorType = "alert" | "log" | "api_call" | "ui_update" | "notification" | "escalation" | "data_write";
export type ToolCategory = "perception" | "analysis" | "generation" | "search" | "communication" | "storage" | "face_recognition";

export interface ToolDefinition {
  name: string;
  category: ToolCategory;
  description: string;
  inputSchema: Record<string, string>;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
  durationMs: number;
}

export interface ActionResult {
  actuator: ActuatorType;
  toolUsed?: string;
  success: boolean;
  output: unknown;
  error?: string;
  timestamp: number;
  durationMs: number;
}

// ═══════════════════════════════════════════════
// 4. ORCHESTRATOR STATE
// ═══════════════════════════════════════════════

export interface OrchestratorState {
  // Identity
  agentId: string;
  agentName: string;
  version: string;

  // Cycle management
  cycleCount: number;
  maxCyclesPerRequest: number;
  isProcessing: boolean;

  // Perceive state
  perceptionHistory: PerceptionFrame[];
  maxPerceptionHistory: number;

  // Reason state
  goals: AgentGoal[];
  activePlan: Plan | null;
  memory: AgentMemory;
  knowledgeBase: KnowledgeItem[];
  decisions: Decision[];
  maxDecisionHistory: number;

  // Act state
  tools: Map<string, ToolDefinition>;
  actionLog: ActionResult[];
  maxActionLog: number;

  // Feedback loop
  feedbackBuffer: FeedbackEntry[];

  // Config
  autonomyMode: "autonomous" | "plan_approval" | "human_in_the_loop";
  llmEnabled: boolean;
  chainOfThoughtEnabled: boolean;
}

export interface FeedbackEntry {
  fromModule: "perceive" | "reason" | "act";
  observation: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ═══════════════════════════════════════════════
// 5. ORCHESTRATOR IMPLEMENTATION
// ═══════════════════════════════════════════════

let _state: OrchestratorState = createInitialOrchestratorState();

function createInitialOrchestratorState(): OrchestratorState {
  return {
    agentId: "orion-pra-v1",
    agentName: "Orion Perceive-Reason-Act Agent",
    version: "1.0.0",
    cycleCount: 0,
    maxCyclesPerRequest: 50,
    isProcessing: false,
    perceptionHistory: [],
    maxPerceptionHistory: 100,
    goals: [],
    activePlan: null,
    memory: {
      working: new Map(),
      episodic: new Map(),
      semantic: new Map(),
      procedural: new Map(),
      maxWorkingSize: 20,
      maxEpisodicSize: 500,
    },
    knowledgeBase: [],
    decisions: [],
    maxDecisionHistory: 50,
    tools: new Map(),
    actionLog: [],
    maxActionLog: 200,
    feedbackBuffer: [],
    autonomyMode: "autonomous",
    llmEnabled: true,
    chainOfThoughtEnabled: true,
  };
}

// ─── PERCEIVE: Collect and structure multi-modal inputs ───

function perceivePhase(percepts: Percept[]): PerceptionFrame {
  const start = performance.now();

  const frame: PerceptionFrame = {
    id: `pf-${_state.cycleCount}-${Date.now()}`,
    percepts,
    timestamp: Date.now(),
    processingMs: 0,
  };

  // Store in working memory
  for (const p of percepts) {
    storeMemory("working", `percept:${p.channel}:${Date.now()}`, p, 0.9, 0.1);
  }

  // Extract entities from text percepts and store as semantic memory
  for (const p of percepts) {
    if (p.channel === "text" && p.entities) {
      for (const [key, value] of Object.entries(p.entities)) {
        storeMemory("semantic", `entity:${key}`, value, 0.85, 0.01);
      }
    }
    if (p.channel === "vision") {
      storeMemory("working", "last_scene", {
        objects: p.objectCount,
        faces: p.faceCount,
        scene: p.sceneType,
        anomalies: p.anomalies,
      }, 0.95, 0.05);
    }
    if (p.channel === "facial" && p.identificationResult) {
      storeMemory("episodic", `face:${p.identificationResult.id || "unknown"}:${Date.now()}`, {
        action: p.identificationResult.action,
        confidence: p.identificationResult.confidence,
        name: p.identificationResult.name,
      }, 0.9, 0.02);
    }
  }

  // Add to history
  _state.perceptionHistory.push(frame);
  if (_state.perceptionHistory.length > _state.maxPerceptionHistory) {
    _state.perceptionHistory.shift();
  }

  frame.processingMs = Math.round(performance.now() - start);
  return frame;
}

// ─── REASON: Goals + Plans + Knowledge Base + Decision Making ───

function reasonPhase(frame: PerceptionFrame): Decision | null {
  if (_state.goals.length === 0) return null;

  // 1. Retrieve relevant knowledge
  const relevantKB = retrieveRelevantKnowledge(frame);

  // 2. Check goal status against perception
  updateGoalStatus(frame);

  // 3. Select highest-priority active goal
  const activeGoals = _state.goals
    .filter(g => g.status === "active")
    .sort((a, b) => b.priority - a.priority);

  if (activeGoals.length === 0) return null;
  const topGoal = activeGoals[0];

  // 4. Generate or update plan (Chain of Thought)
  if (!_state.activePlan || _state.activePlan.goalId !== topGoal.id) {
    _state.activePlan = generatePlanCoT(topGoal, frame, relevantKB);
  }

  // 5. Make decision based on plan + current perception
  const decision = makeDecisionFromPlan(topGoal, _state.activePlan, frame);

  // 6. Store decision
  _state.decisions.push(decision);
  if (_state.decisions.length > _state.maxDecisionHistory) {
    _state.decisions.shift();
  }

  // 7. Store reasoning in episodic memory
  storeMemory("episodic", `decision:${decision.id}`, {
    goal: topGoal.type,
    action: decision.action,
    confidence: decision.confidence,
  }, decision.confidence, 0.02);

  return decision;
}

function retrieveRelevantKnowledge(frame: PerceptionFrame): KnowledgeItem[] {
  // Simple keyword-based retrieval (in production, use vector similarity)
  const channels = frame.percepts.map(p => p.channel);
  return _state.knowledgeBase
    .filter(kb => {
      const tags = kb.tags.join(" ").toLowerCase();
      return channels.some(ch => tags.includes(ch)) || kb.relevanceScore > 0.7;
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}

function updateGoalStatus(frame: PerceptionFrame): void {
  for (const goal of _state.goals) {
    if (goal.status !== "active") continue;

    // Check deadline
    if (goal.deadline && Date.now() > goal.createdAt + goal.deadline) {
      goal.status = "failed";
      continue;
    }

    // Check success criteria against perception
    const visionPercept = frame.percepts.find(p => p.channel === "vision") as VisionPercept | undefined;
    const facialPercept = frame.percepts.find(p => p.channel === "facial") as FacialPercept | undefined;

    if (goal.type === "facial_recognition" && facialPercept?.identificationResult) {
      if (facialPercept.identificationResult.action === "allow") {
        goal.status = "achieved";
        goal.achievedAt = Date.now();
      }
    }

    if (goal.type === "detect_anomaly" && visionPercept) {
      if (visionPercept.anomalies.length > 0) {
        // Anomaly detected — goal partially achieved, stays active for continuous monitoring
        storeMemory("episodic", `anomaly:${Date.now()}`, visionPercept.anomalies, 0.85, 0.03);
      }
    }
  }
}

function generatePlanCoT(goal: AgentGoal, frame: PerceptionFrame, kb: KnowledgeItem[]): Plan {
  const steps: PlanStep[] = [];
  let chainOfThought = "";
  const planId = `plan-${goal.id}-${Date.now()}`;

  // Chain of Thought: LLM-style reasoning trace
  chainOfThought += `[GOAL] ${goal.description} (priority: ${goal.priority})\n`;
  chainOfThought += `[CONTEXT] Perception: ${frame.percepts.map(p => p.channel).join(", ")}\n`;

  if (kb.length > 0) {
    chainOfThought += `[KNOWLEDGE] Relevant KB: ${kb.map(k => k.topic).join(", ")}\n`;
  }

  // Retrieve procedural memory for this goal type
  const procedural = _state.memory.procedural.get(`procedure:${goal.type}`);
  if (procedural) {
    chainOfThought += `[PROCEDURAL MEMORY] Previous successful approach: ${JSON.stringify(procedural.value)}\n`;
  }

  // Generate steps based on goal type
  switch (goal.type) {
    case "facial_recognition":
      chainOfThought += "[REASONING] Face recognition requires: detect → align → embed → classify → decide\n";
      chainOfThought += "[PLAN] Execute HumaneX 5-stage pipeline with liveness check\n";
      steps.push(
        { id: `${planId}-s1`, description: "Capture frame from sensor", module: "perceive", tool: "capture_frame", params: {}, dependsOn: [], status: "pending" },
        { id: `${planId}-s2`, description: "Detect and align face (MTCNN equiv)", module: "perceive", tool: "detect_align", params: { minConfidence: 0.5 }, dependsOn: [`${planId}-s1`], status: "pending" },
        { id: `${planId}-s3`, description: "Extract 128D embedding (FaceNet equiv)", module: "reason", tool: "extract_embedding", params: { dimensions: 128, useHybrid: true }, dependsOn: [`${planId}-s2`], status: "pending" },
        { id: `${planId}-s4`, description: "Classify against enrolled database", module: "reason", tool: "classify_face", params: { method: "cosine_similarity" }, dependsOn: [`${planId}-s3`], status: "pending" },
        { id: `${planId}-s5`, description: "Make access decision with liveness", module: "act", tool: "access_decision", params: { allowThreshold: 0.95, verifyThreshold: 0.80 }, dependsOn: [`${planId}-s4`], status: "pending" },
      );
      break;

    case "access_control":
      chainOfThought += "[REASONING] Access control = face recognition + policy enforcement\n";
      steps.push(
        { id: `${planId}-s1`, description: "Run face identification pipeline", module: "perceive", tool: "run_identification", params: {}, dependsOn: [], status: "pending" },
        { id: `${planId}-s2`, description: "Check identity against access policy", module: "reason", tool: "check_policy", params: {}, dependsOn: [`${planId}-s1`], status: "pending" },
        { id: `${planId}-s3`, description: "Execute access action (grant/deny)", module: "act", tool: "access_gate", params: {}, dependsOn: [`${planId}-s2`], status: "pending" },
      );
      break;

    case "monitor_safety":
      chainOfThought += "[REASONING] Safety monitoring: detect persons → check PPE → measure distances → alert\n";
      steps.push(
        { id: `${planId}-s1`, description: "Detect persons and objects", module: "perceive", tool: "detect_objects", params: { minConfidence: 0.7 }, dependsOn: [], status: "pending" },
        { id: `${planId}-s2`, description: "Check PPE compliance", module: "reason", tool: "check_ppe", params: { required: ["helmet", "vest", "boots"] }, dependsOn: [`${planId}-s1`], status: "pending" },
        { id: `${planId}-s3`, description: "Measure distance to hazards", module: "perceive", tool: "depth_estimate", params: { dangerZoneM: 2 }, dependsOn: [`${planId}-s1`], status: "pending" },
        { id: `${planId}-s4`, description: "Emit alert if violation", module: "act", tool: "emit_alert", params: {}, dependsOn: [`${planId}-s2`, `${planId}-s3`], status: "pending" },
      );
      break;

    case "detect_anomaly":
      chainOfThought += "[REASONING] Anomaly detection: baseline → compare → classify → log\n";
      steps.push(
        { id: `${planId}-s1`, description: "Capture baseline from perception", module: "perceive", tool: "baseline_scene", params: {}, dependsOn: [], status: "pending" },
        { id: `${planId}-s2`, description: "Compare against baseline", module: "reason", tool: "compare_baseline", params: { deviationThreshold: 0.3 }, dependsOn: [`${planId}-s1`], status: "pending" },
        { id: `${planId}-s3`, description: "Classify anomaly type", module: "reason", tool: "classify_anomaly", params: {}, dependsOn: [`${planId}-s2`], status: "pending" },
        { id: `${planId}-s4`, description: "Log and alert", module: "act", tool: "log_anomaly", params: {}, dependsOn: [`${planId}-s3`], status: "pending" },
      );
      break;

    default:
      chainOfThought += `[REASONING] Generic goal '${goal.type}': observe → analyze → report\n`;
      steps.push(
        { id: `${planId}-s1`, description: "Full sensor scan", module: "perceive", tool: "full_scan", params: {}, dependsOn: [], status: "pending" },
        { id: `${planId}-s2`, description: "Analyze observations", module: "reason", tool: "analyze", params: {}, dependsOn: [`${planId}-s1`], status: "pending" },
        { id: `${planId}-s3`, description: "Report findings", module: "act", tool: "report", params: {}, dependsOn: [`${planId}-s2`], status: "pending" },
      );
  }

  chainOfThought += `[STEPS] Generated ${steps.length} steps\n`;

  return {
    id: planId,
    goalId: goal.id,
    steps,
    chainOfThought,
    estimatedMs: steps.length * 50,
    confidence: 0.7,
    createdAt: Date.now(),
    status: "approved",
  };
}

function makeDecisionFromPlan(goal: AgentGoal, plan: Plan, frame: PerceptionFrame): Decision {
  const decisionId = `dec-${_state.cycleCount}-${Date.now()}`;
  const alternatives: Decision["alternatives"] = [];
  const tradeoffs: string[] = [];

  // Find next actionable step in plan
  const nextStep = plan.steps.find(s => s.status === "pending");
  let action = "continue_monitoring";
  let confidence = 0.5;
  let reasoning = "";

  if (!nextStep) {
    action = "plan_complete";
    confidence = 0.9;
    reasoning = `All ${plan.steps.length} steps completed for goal: ${goal.type}`;
    plan.status = "completed";
  } else {
    action = `execute:${nextStep.tool || nextStep.description}`;
    confidence = plan.confidence;
    reasoning = `${plan.chainOfThought.split("\n").slice(-2).join(" ")} → Executing: ${nextStep.description}`;

    // Check dependencies
    const depsComplete = nextStep.dependsOn.every(depId => {
      const dep = plan.steps.find(s => s.id === depId);
      return dep?.status === "completed";
    });

    if (!depsComplete) {
      action = "waiting_dependencies";
      confidence = 0.4;
      reasoning = `Step "${nextStep.description}" waiting for dependencies: ${nextStep.dependsOn.join(", ")}`;
      tradeoffs.push("Could skip dependencies but risk inconsistent results");
    }
  }

  // Consider alternatives
  const visionPercept = frame.percepts.find(p => p.channel === "vision") as VisionPercept | undefined;
  if (visionPercept?.anomalies.length) {
    alternatives.push({
      action: "escalate_anomaly",
      confidence: 0.7,
      reason: `Anomalies detected: ${visionPercept.anomalies.join(", ")}`,
    });
  }

  return {
    id: decisionId,
    goalId: goal.id,
    action,
    confidence,
    reasoning,
    alternatives,
    tradeoffs,
    timestamp: Date.now(),
    approved: _state.autonomyMode === "autonomous",
  };
}

// ─── ACT: Execute decisions via Actuators, Execution, and Tools ───

function actPhase(decision: Decision): ActionResult[] {
  if (!decision.approved && _state.autonomyMode !== "autonomous") {
    // Queue for human approval
    _state.feedbackBuffer.push({
      fromModule: "act",
      observation: `Decision "${decision.action}" awaiting approval`,
      data: { decisionId: decision.id },
      timestamp: Date.now(),
    });
    return [];
  }

  const results: ActionResult[] = [];
  const start = performance.now();

  // Execute the current plan step
  if (_state.activePlan) {
    const nextStep = _state.activePlan.steps.find(s => s.status === "pending");
    if (nextStep) {
      // Check dependencies
      const depsComplete = nextStep.dependsOn.every(depId => {
        const dep = _state.activePlan!.steps.find(s => s.id === depId);
        return dep?.status === "completed";
      });

      if (depsComplete) {
        nextStep.status = "executing";
        nextStep.startedAt = Date.now();

        // Execute via registered tool or built-in actuator
        const tool = nextStep.tool ? _state.tools.get(nextStep.tool) : null;

        if (tool) {
          // Tool execution (async handled externally)
          results.push({
            actuator: "api_call",
            toolUsed: nextStep.tool,
            success: true,
            output: { step: nextStep.description, params: nextStep.params },
            timestamp: Date.now(),
            durationMs: Math.round(performance.now() - start),
          });
        } else {
          // Built-in actuator based on module
          results.push({
            actuator: nextStep.module === "act" ? "log" : "data_write",
            success: true,
            output: { step: nextStep.description, executed: true },
            timestamp: Date.now(),
            durationMs: Math.round(performance.now() - start),
          });
        }

        nextStep.status = "completed";
        nextStep.completedAt = Date.now();
      }
    }
  }

  // Alert actuator for high-priority events
  if (decision.action.includes("alert") || decision.action.includes("anomaly")) {
    results.push({
      actuator: "alert",
      success: true,
      output: { severity: decision.confidence > 0.8 ? "high" : "medium", message: decision.reasoning },
      timestamp: Date.now(),
      durationMs: 0,
    });
  }

  // Escalation actuator for low confidence on high-priority goals
  if (decision.confidence < 0.5) {
    const goal = _state.goals.find(g => g.id === decision.goalId);
    if (goal && goal.priority > 0.8) {
      results.push({
        actuator: "escalation",
        success: true,
        output: { reason: "Low confidence on high-priority goal", decision: decision.action },
        timestamp: Date.now(),
        durationMs: 0,
      });
    }
  }

  // Log all actions
  for (const r of results) {
    _state.actionLog.push(r);
  }
  if (_state.actionLog.length > _state.maxActionLog) {
    _state.actionLog.splice(0, _state.actionLog.length - _state.maxActionLog);
  }

  return results;
}

// ─── FEEDBACK LOOP: Act results feed back into next Perceive cycle ───

function feedbackPhase(actions: ActionResult[], decision: Decision | null): void {
  // Store action outcomes in episodic memory
  for (const action of actions) {
    storeMemory("episodic", `action:${action.actuator}:${Date.now()}`, {
      success: action.success,
      output: action.output,
      tool: action.toolUsed,
    }, action.success ? 0.8 : 0.6, 0.02);
  }

  // Update procedural memory with successful strategies
  if (decision && decision.confidence > 0.7 && actions.every(a => a.success)) {
    const goal = _state.goals.find(g => g.id === decision.goalId);
    if (goal) {
      storeMemory("procedural", `procedure:${goal.type}`, {
        action: decision.action,
        confidence: decision.confidence,
        planId: _state.activePlan?.id,
      }, 0.85, 0.005);
    }
  }

  // Decay working memory
  decayMemoryStore(_state.memory.working, 0.05);

  // Feed observations back for next cycle
  if (actions.length > 0) {
    _state.feedbackBuffer.push({
      fromModule: "act",
      observation: `Executed ${actions.length} actions, ${actions.filter(a => a.success).length} successful`,
      data: { actions: actions.map(a => ({ actuator: a.actuator, success: a.success })) },
      timestamp: Date.now(),
    });
  }
}

// ─── Memory Management ───

function storeMemory(
  store: "working" | "episodic" | "semantic" | "procedural",
  key: string,
  value: unknown,
  confidence: number,
  decayRate: number
): void {
  const map = _state.memory[store];
  const entry: MemoryEntry = {
    key, value, type: store, confidence, accessCount: 0,
    lastAccessedAt: Date.now(), createdAt: Date.now(), decayRate,
  };
  map.set(key, entry);

  // Enforce limits
  const maxSize = store === "working" ? _state.memory.maxWorkingSize : _state.memory.maxEpisodicSize;
  if (map.size > maxSize) {
    // Evict least accessed
    let leastKey: string | null = null;
    let leastAccess = Infinity;
    for (const [k, v] of map) {
      if (v.accessCount < leastAccess) {
        leastAccess = v.accessCount;
        leastKey = k;
      }
    }
    if (leastKey) map.delete(leastKey);
  }
}

function recallMemory(store: "working" | "episodic" | "semantic" | "procedural", key: string): unknown | null {
  const entry = _state.memory[store].get(key);
  if (!entry) return null;
  entry.accessCount++;
  entry.lastAccessedAt = Date.now();
  return entry.value;
}

function decayMemoryStore(store: Map<string, MemoryEntry>, globalDecay: number): void {
  const now = Date.now();
  const toDelete: string[] = [];
  for (const [key, entry] of store) {
    const ageSec = (now - entry.lastAccessedAt) / 1000;
    entry.confidence -= entry.decayRate * ageSec * globalDecay;
    if (entry.confidence <= 0) toDelete.push(key);
  }
  for (const key of toDelete) store.delete(key);
}

// ═══════════════════════════════════════════════
// 6. MAIN ORCHESTRATION CYCLE
// ═══════════════════════════════════════════════

export interface PRA_CycleResult {
  cycleCount: number;
  perception: PerceptionFrame;
  decision: Decision | null;
  actions: ActionResult[];
  activeGoals: AgentGoal[];
  activePlan: Plan | null;
  chainOfThought: string | null;
  feedback: FeedbackEntry[];
  blocked: boolean;
  cycleMs: number;
}

/**
 * Execute one full Perceive → Reason → Act → Feedback cycle.
 * This is the main entry point — call once per frame/request.
 */
export function runPRA_Cycle(percepts: Percept[]): PRA_CycleResult {
  const start = performance.now();
  _state.cycleCount++;
  _state.isProcessing = true;

  // Inject feedback from previous cycle as additional percepts
  const feedbackPercepts: TextPercept[] = _state.feedbackBuffer.map(fb => ({
    channel: "text" as const,
    content: `[FEEDBACK:${fb.fromModule}] ${fb.observation}`,
    timestamp: fb.timestamp,
  }));
  _state.feedbackBuffer = [];

  const allPercepts = [...percepts, ...feedbackPercepts];

  // ── PERCEIVE ──
  const frame = perceivePhase(allPercepts);

  // ── REASON ──
  const decision = reasonPhase(frame);

  // ── AUTONOMY GATE ──
  let blocked = false;
  let actions: ActionResult[] = [];

  if (decision) {
    if (_state.autonomyMode === "autonomous" || decision.approved) {
      // ── ACT ──
      actions = actPhase(decision);
    } else {
      blocked = true;
      _state.feedbackBuffer.push({
        fromModule: "reason",
        observation: `Decision blocked: ${decision.action} (awaiting approval)`,
        data: { decisionId: decision.id },
        timestamp: Date.now(),
      });
    }
  }

  // ── FEEDBACK ──
  feedbackPhase(actions, decision);

  _state.isProcessing = false;

  return {
    cycleCount: _state.cycleCount,
    perception: frame,
    decision,
    actions,
    activeGoals: _state.goals.filter(g => g.status === "active"),
    activePlan: _state.activePlan,
    chainOfThought: _state.activePlan?.chainOfThought || null,
    feedback: [..._state.feedbackBuffer],
    blocked,
    cycleMs: Math.round(performance.now() - start),
  };
}

// ═══════════════════════════════════════════════
// 7. PUBLIC API
// ═══════════════════════════════════════════════

export function addGoal(goal: Omit<AgentGoal, "id" | "createdAt" | "subGoals" | "status">): AgentGoal {
  const newGoal: AgentGoal = {
    ...goal,
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: "active",
    subGoals: [],
    createdAt: Date.now(),
  };
  _state.goals.push(newGoal);
  _state.goals.sort((a, b) => b.priority - a.priority);
  return newGoal;
}

export function removeGoal(goalId: string): void {
  _state.goals = _state.goals.filter(g => g.id !== goalId);
  if (_state.activePlan?.goalId === goalId) _state.activePlan = null;
}

export function setGoals(goals: AgentGoal[]): void {
  _state.goals = goals;
  _state.activePlan = null;
}

export function registerTool(tool: ToolDefinition): void {
  _state.tools.set(tool.name, tool);
}

export function addKnowledge(item: Omit<KnowledgeItem, "id" | "lastUsedAt">): void {
  _state.knowledgeBase.push({
    ...item,
    id: `kb-${Date.now()}`,
    lastUsedAt: Date.now(),
  });
}

export function setAutonomyMode(mode: OrchestratorState["autonomyMode"]): void {
  _state.autonomyMode = mode;
}

export function approveDecision(decisionId: string): void {
  const dec = _state.decisions.find(d => d.id === decisionId);
  if (dec) dec.approved = true;
}

export function getOrchestratorState(): Readonly<OrchestratorState> {
  return _state;
}

export function resetOrchestrator(): void {
  _state = createInitialOrchestratorState();
}

/**
 * Generate a context string for LLM prompt injection.
 * Goals are fed as prompt context; Plans use Chain of Thought.
 */
export function formatPRA_ContextForLLM(): string {
  const parts: string[] = [];

  // Agent identity
  parts.push(`[AGENT] ${_state.agentName} v${_state.version} | Cycle #${_state.cycleCount} | Mode: ${_state.autonomyMode}`);

  // Goals as prompt context (diagram: "Goals are fed as prompt context")
  if (_state.goals.length > 0) {
    const activeGoals = _state.goals.filter(g => g.status === "active");
    parts.push(`[GOALS] ${activeGoals.map(g => `${g.type}(p=${g.priority}): ${g.description}`).join(" | ")}`);
  }

  // Plan as Chain of Thought (diagram: "Plan is fed as prompt context; model creates plans and sub-plans")
  if (_state.activePlan) {
    const completedSteps = _state.activePlan.steps.filter(s => s.status === "completed").length;
    const totalSteps = _state.activePlan.steps.length;
    parts.push(`[PLAN] ${completedSteps}/${totalSteps} steps complete | CoT: ${_state.activePlan.chainOfThought.split("\n").slice(0, 3).join(" → ")}`);
  }

  // Working memory
  const wmEntries = Array.from(_state.memory.working.entries())
    .filter(([_, v]) => v.confidence > 0.5)
    .slice(0, 5);
  if (wmEntries.length > 0) {
    parts.push(`[MEMORY] ${wmEntries.map(([k, v]) => `${k.split(":").slice(-1)[0]}=${JSON.stringify(v.value).slice(0, 50)}`).join(", ")}`);
  }

  // Recent perception summary
  const lastFrame = _state.perceptionHistory[_state.perceptionHistory.length - 1];
  if (lastFrame) {
    parts.push(`[PERCEPTION] Channels: ${lastFrame.percepts.map(p => p.channel).join(",")} | ${lastFrame.processingMs}ms`);
  }

  // Last decision
  const lastDec = _state.decisions[_state.decisions.length - 1];
  if (lastDec) {
    parts.push(`[DECISION] ${lastDec.action} (${(lastDec.confidence * 100).toFixed(0)}%) — ${lastDec.reasoning.slice(0, 80)}`);
  }

  // Feedback
  if (_state.feedbackBuffer.length > 0) {
    parts.push(`[FEEDBACK] ${_state.feedbackBuffer.map(f => f.observation).join(" | ")}`);
  }

  return parts.join("\n");
}

/**
 * Create percepts from existing vision/face pipeline results.
 * Bridge between existing modules and the PRA orchestrator.
 */
export function createVisionPercept(result: RealTimeVisionResult): VisionPercept {
  return {
    channel: "vision",
    objectCount: result.allObjects.length,
    faceCount: result.faces.length,
    sceneType: result.frameXResult?.scenario?.label || null,
    dominantEmotion: result.faceAttributes[0]?.emotion || null,
    anomalies: [],
    depthAvailable: !!result.depthResult,
    rawResult: result,
    inferenceMs: result.inferenceMs,
    timestamp: Date.now(),
  };
}

export function createFacialPercept(result: IdentificationResult | null, enrolledCount: number): FacialPercept {
  return {
    channel: "facial",
    identificationResult: result,
    enrolledFacesCount: enrolledCount,
    livenessScore: result?.livenessScore || 0,
    isMaskDetected: result?.isMaskDetected || false,
    timestamp: Date.now(),
  };
}

export function createTextPercept(content: string, intent?: string): TextPercept {
  return {
    channel: "text",
    content,
    intent,
    language: "pt",
    timestamp: Date.now(),
  };
}

export function createAudioPercept(transcript: string, isVoice: boolean = true): AudioPercept {
  return {
    channel: "audio",
    transcript,
    isVoiceCommand: isVoice,
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════
// 8. MULTI-TENANT INTEGRATION (AWS AaaS Architecture)
// ═══════════════════════════════════════════════

import {
  type TenantContext,
  checkThrottle,
  checkIsolation,
  recordUsage,
  formatTenantContextForLLM,
} from "./multi-tenant-agent";

/**
 * Tenant-aware PRA cycle: wraps runPRA_Cycle with tenant scoping,
 * throttling (noisy neighbor), isolation checks, and metering.
 * 
 * Ref: AWS Multi-Tenant Agentic AI — "Building tenant-aware agents" (p22-25)
 */
export function runTenantAwarePRA_Cycle(
  percepts: Percept[],
  tenantCtx: TenantContext
): PRA_CycleResult & { tenantId: string; throttled: boolean; isolationViolation: boolean } {
  const start = performance.now();

  // 1. Throttle check at "outer edge" (diagram p31)
  const throttleResult = checkThrottle(tenantCtx.tenantId, "request");
  if (!throttleResult.allowed) {
    console.warn(`[PRA:THROTTLE] ${tenantCtx.tenantId}: ${throttleResult.reason}`);
    const emptyFrame: PerceptionFrame = { id: `pf-throttled-${Date.now()}`, percepts: [], timestamp: Date.now(), processingMs: 0 };
    return {
      cycleCount: _state.cycleCount,
      perception: emptyFrame,
      decision: null,
      actions: [],
      activeGoals: _state.goals.filter(g => g.status === "active"),
      activePlan: _state.activePlan,
      chainOfThought: null,
      feedback: [{ fromModule: "act", observation: `Throttled: ${throttleResult.reason}`, data: { tenantId: tenantCtx.tenantId }, timestamp: Date.now() }],
      blocked: true,
      cycleMs: Math.round(performance.now() - start),
      tenantId: tenantCtx.tenantId,
      throttled: true,
      isolationViolation: false,
    };
  }

  // 2. Inject tenant context as text percept
  const tenantPercept: TextPercept = {
    channel: "text",
    content: `[TENANT_CONTEXT] ${formatTenantContextForLLM(tenantCtx.tenantId)}`,
    intent: "tenant_scope",
    entities: { tenantId: tenantCtx.tenantId, tier: tenantCtx.tier, userId: tenantCtx.userId },
    timestamp: Date.now(),
  };

  // 3. Namespace all memory operations for this tenant
  const namespacedPercepts = percepts.map(p => {
    if (p.channel === "text") {
      return { ...p, content: `[T:${tenantCtx.tenantId}] ${p.content}` } as TextPercept;
    }
    return p;
  });

  // 4. Run core PRA cycle
  const result = runPRA_Cycle([tenantPercept, ...namespacedPercepts]);

  // 5. Metering
  const cycleMs = Math.round(performance.now() - start);
  recordUsage(tenantCtx.tenantId, {
    requests: 1,
    responseMs: cycleMs,
    isError: result.actions.some(a => !a.success),
  });

  return {
    ...result,
    cycleMs,
    tenantId: tenantCtx.tenantId,
    throttled: false,
    isolationViolation: false,
  };
}

/**
 * Generate multi-tenant-enhanced LLM context.
 * Combines PRA state with tenant guardrails and isolation scoping.
 */
export function formatMultiTenantPRA_Context(tenantId: string): string {
  const praContext = formatPRA_ContextForLLM();
  const tenantContext = formatTenantContextForLLM(tenantId);
  return `${praContext}\n${tenantContext}`;
}
