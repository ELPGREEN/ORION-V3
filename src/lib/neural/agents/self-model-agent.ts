/**
 * ─── v21.2: Agente-Eu (Self-Model Agent) ───
 * Agent #11 — maintains an internal dynamic model of the ELP's "self".
 * 
 * Tracks: attention, emotions, confidence, goal alignment.
 * Uses autobiographical memory (ring buffer) for long-term self-awareness.
 * Integrates with Global Workspace for conscious broadcasting.
 * 
 * Ref: Baars (1988), Tononi (2004), Damasio (1999) "The Feeling of What Happens"
 */

import type { NeuromodulationState } from "../multi-agent";
import {
  createSelfModel,
  updateSelfModel,
  recordAutobiographicalMemory,
  runMetacognition,
  type SelfModelState,
  type ConsciousState,
  type MetacognitionResult,
  type ConsciousnessConfig,
  DEFAULT_CONSCIOUSNESS_CONFIG,
} from "../global-workspace";
import { getCachedInteroceptiveState, type InteroceptiveState } from "../interoception-engine";
import { consultSomaticMarker, recordSomaticOutcome } from "../somatic-markers";
import {
  createCausalGraph,
  learnCausalPatterns,
  getCausalGraphStats,
  type CausalGraph,
} from "../causal-reasoning";
import {
  createUserMentalModel,
  updateFromInteraction,
  inferUserIntent,
  predictUserReaction,
  getToMSummary,
  type UserMentalModel,
} from "../theory-of-mind";
import {
  createMetaLearningState,
  recordLearningOutcome,
  optimizeLearningRate,
  evaluateStrategyEffectiveness,
  proposeArchitecturalChange,
  autoExecuteProposals,
  getMetaLearningSummary,
  type MetaLearningState,
} from "../meta-learning";
import {
  type ReasoningReflection,
  integrateIntoCausalGraph,
  integrateIntoMetaLearning,
  integrateIntoTheoryOfMind,
} from "../lovable-reasoning-engine";

// ─── Self-Model Agent Class ───

export class SelfModelAgent {
  private state: SelfModelState;
  private config: ConsciousnessConfig;
  private reflectionCount: number = 0;
  private causalGraph: CausalGraph;
  private mentalModel: UserMentalModel;
  private metaLearning: MetaLearningState;
  private lastInteroceptiveState: InteroceptiveState | null = null;

  constructor(config: ConsciousnessConfig = DEFAULT_CONSCIOUSNESS_CONFIG) {
    this.state = createSelfModel();
    this.config = config;
    this.causalGraph = createCausalGraph();
    this.mentalModel = createUserMentalModel();
    this.metaLearning = createMetaLearningState();
  }

  /** Get current self-model state (read-only snapshot) */
  getState(): Readonly<SelfModelState> {
    return this.state;
  }

  /** Get current attention focus */
  getAttentionFocus(): string {
    return this.state.attentionFocus;
  }

  /** Get current confidence level (0-1) */
  getConfidence(): number {
    return this.state.confidenceLevel;
  }

  /** Get current emotional state */
  getEmotionalState(): SelfModelState["emotionalState"] {
    return { ...this.state.emotionalState };
  }

  /** Get active neuromodulators */
  getNeuromodulators(): NeuromodulationState {
    return { ...this.state.neuromodulators };
  }

  /** Get active modalities (text, vision, audio, gesture) */
  getActiveModalities(): string[] {
    return [...this.state.activeModalities];
  }

  /**
   * Update self-model based on workspace state and user interaction.
   * Now integrates Interoceptive State (Layer 6) and Somatic Markers (Layer 9).
   * Called every consciousness cycle.
   */
  update(
    workspace: ConsciousState,
    userInput?: string,
    emotionFromVision?: { valence: number; arousal: number }
  ): void {
    // Layer 6: Collect interoceptive state (system's "visceral" feeling)
    this.lastInteroceptiveState = getCachedInteroceptiveState();

    // Modulate emotional state with interoceptive signals
    if (this.lastInteroceptiveState) {
      const intero = this.lastInteroceptiveState;
      // Pain index raises arousal, energy level modulates dominance
      const arousalBoost = intero.painIndex * 0.2;
      const dominanceShift = (intero.energyLevel - 0.5) * 0.3;
      emotionFromVision = {
        valence: (emotionFromVision?.valence ?? this.state.emotionalState.valence) + intero.valence * 0.15,
        arousal: (emotionFromVision?.arousal ?? this.state.emotionalState.arousal) + arousalBoost,
      };
      this.state = {
        ...this.state,
        emotionalState: {
          ...this.state.emotionalState,
          dominance: Math.max(0, Math.min(1, this.state.emotionalState.dominance + dominanceShift)),
        },
      };
    }

    this.state = updateSelfModel(this.state, workspace, userInput, emotionFromVision);

    // Layer 9: Consult somatic markers for attention priority
    if (userInput) {
      const contextHash = this._hashContext(userInput);
      const marker = consultSomaticMarker({
        contextHash,
        interoceptiveState: this.lastInteroceptiveState ?? undefined,
      });
      if (marker && marker.confidence > 0.7) {
        console.log(`[SelfModelAgent] Somatic marker hit: valence=${marker.shouldProceed}, conf=${marker.confidence.toFixed(2)}`);
      }
    }
  }

  /** Get last collected interoceptive state */
  getInteroceptiveState(): InteroceptiveState | null {
    return this.lastInteroceptiveState;
  }

  /** Simple context hash for somatic marker lookup */
  private _hashContext(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return `ctx_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Update emotional state from multimodal inputs (vision + audio).
   * Can be called independently of the workspace cycle.
   */
  updateFromMultimodal(
    emotionFromVision?: { valence: number; arousal: number },
    prosodyFromAudio?: number
  ): void {
    if (emotionFromVision) {
      this.state = {
        ...this.state,
        emotionalState: {
          valence: emotionFromVision.valence * 0.7 + this.state.emotionalState.valence * 0.3,
          arousal: emotionFromVision.arousal * 0.6 + this.state.emotionalState.arousal * 0.4,
          dominance: this.state.emotionalState.dominance,
        },
        lastUpdated: Date.now(),
      };
    }

    if (prosodyFromAudio !== undefined) {
      this.state = {
        ...this.state,
        emotionalState: {
          ...this.state.emotionalState,
          arousal: Math.min(1, this.state.emotionalState.arousal + prosodyFromAudio * 0.2),
        },
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Record an autobiographical memory event.
   * Also learns causal patterns and records somatic outcomes (Layer 9).
   */
  recordMemory(event: string, outcome: "success" | "failure" | "neutral"): void {
    this.state = recordAutobiographicalMemory(this.state, event, outcome, this.config);

    // BUG FIX: Apply confidence penalty on failures
    if (outcome === "failure") {
      this.state = {
        ...this.state,
        confidenceLevel: Math.max(0.05, this.state.confidenceLevel - 0.05),
      };
    }

    // Layer 9: Record somatic outcome for future "gut feeling" decisions
    const contextHash = this._hashContext(event);
    const valence = outcome === "success" ? 0.7 : outcome === "failure" ? -0.6 : 0.1;
    recordSomaticOutcome(contextHash, event.slice(0, 60), "memory", outcome === "success", valence);

    // Learn causal patterns from autobiographical events
    const recentEvents = this.state.autobiographicalMemory.slice(-10).map((m, i) => ({
      id: `mem_${m.timestamp}_${i}`,
      label: m.event,
      outcome: m.outcome,
      timestamp: m.timestamp,
    }));
    this.causalGraph = learnCausalPatterns(this.causalGraph, recentEvents);

    // Persist causal graph after learning
    this._persistCausalGraph();
  }

  /**
   * Execute a self-reflection (metacognition check).
   * Returns the metacognition result with recommendations.
   * Now auto-applies adjustments when shouldAdjust is true.
   */
  reflect(workspace: ConsciousState): MetacognitionResult {
    this.reflectionCount++;
    const result = runMetacognition(this.state, workspace, this.config);

    // Record as meta-learning outcome
    this.metaLearning = recordLearningOutcome(
      this.metaLearning,
      "strat_text_cot",
      "metacognition",
      result.goalAlignment > 0.5 ? "success" : "partial",
      0,
      result.recommendation
    );

    // Auto-apply metacognition adjustments
    if (result.shouldAdjust) {
      this.applyMetacognitionAction(result);
    }

    return result;
  }

  /**
   * Apply metacognition recommendations to internal state.
   * Modifies neuromodulators, attention, and modalities based on adjustment type.
   */
  applyMetacognitionAction(result: MetacognitionResult): void {
    switch (result.adjustmentType) {
      case "strategy":
        this.state = {
          ...this.state,
          neuromodulators: {
            ...this.state.neuromodulators,
            norepinephrine: Math.min(1, this.state.neuromodulators.norepinephrine + 0.15),
          },
          lastUpdated: Date.now(),
        };
        break;
      case "attention":
        this.state = {
          ...this.state,
          attentionFocus: this.state.currentGoal || this.state.attentionFocus,
          neuromodulators: {
            ...this.state.neuromodulators,
            acetylcholine: Math.min(1, this.state.neuromodulators.acetylcholine + 0.1),
          },
          lastUpdated: Date.now(),
        };
        break;
      case "modality":
        const modalities = [...this.state.activeModalities];
        if (!modalities.includes("vision")) modalities.push("vision");
        if (!modalities.includes("audio")) modalities.push("audio");
        this.state = { ...this.state, activeModalities: modalities, lastUpdated: Date.now() };
        break;
      case "agent_swap":
        // Boost dopamine to signal need for different processing
        this.state = {
          ...this.state,
          neuromodulators: {
            ...this.state.neuromodulators,
            dopamine: Math.min(1, this.state.neuromodulators.dopamine + 0.2),
          },
          lastUpdated: Date.now(),
        };
        break;
    }
    console.log(`[SelfModelAgent] Applied metacognition action: ${result.adjustmentType}`);
  }

  /**
   * Process a real chat interaction — feeds Theory of Mind, records memory, and tracks strategy.
   * Should be called by the orchestrator after every AI response.
   */
  processChat(userMessage: string, aiResponse: string, provider: string): void {
    // 1. Feed Theory of Mind with the interaction
    this.processUserInteraction(userMessage, undefined, true);

    // 2. Record as autobiographical memory
    const memEvent = `[Chat] User: "${userMessage.slice(0, 60)}" → AI (${provider}): "${aiResponse.slice(0, 60)}"`;
    this.recordMemory(memEvent, "success");

    // 3. Track strategy outcome for meta-learning
    this.recordStrategyOutcome(
      "strat_text_cot",
      "chat_response",
      "success",
      0
    );
  }

  /** Get total number of reflections performed */
  getReflectionCount(): number {
    return this.reflectionCount;
  }

  /** Get autobiographical memory count */
  getMemoryCount(): number {
    return this.state.autobiographicalMemory.length;
  }

  // ─── Theory of Mind ───

  /** Update mental model from user interaction */
  processUserInteraction(
    userInput: string,
    emotionFromVision?: { valence: number; arousal: number },
    responseSuccess?: boolean
  ): void {
    this.mentalModel = updateFromInteraction(this.mentalModel, userInput, emotionFromVision, responseSuccess);
    // Persist mental model after each interaction
    this._persistMentalModel();
  }

  /** Get inferred user intent */
  getUserIntent(userInput: string) {
    return inferUserIntent(this.mentalModel, userInput);
  }

  /** Predict user reaction to a response approach */
  predictReaction(approach: "detailed" | "concise" | "technical" | "empathetic" | "directive") {
    return predictUserReaction(this.mentalModel, approach);
  }

  /** Get Theory of Mind summary */
  getToMSummary(): string {
    return getToMSummary(this.mentalModel);
  }

  /** Get the full mental model (read-only) */
  getMentalModel(): Readonly<UserMentalModel> {
    return this.mentalModel;
  }

  // ─── Causal Reasoning ───

  /** Get causal graph stats */
  getCausalStats() {
    return getCausalGraphStats(this.causalGraph);
  }

  /** Get the causal graph (read-only) */
  getCausalGraph(): Readonly<CausalGraph> {
    return this.causalGraph;
  }

  // ─── Meta-Learning ───

  /** Record a learning outcome for strategy optimization */
  recordStrategyOutcome(
    strategyId: string,
    taskType: string,
    outcome: "success" | "failure" | "partial",
    latencyMs: number
  ): void {
    this.metaLearning = recordLearningOutcome(this.metaLearning, strategyId, taskType, outcome, latencyMs);
  }

  /** Get best strategy for a task type */
  getBestStrategy(taskType: string) {
    return evaluateStrategyEffectiveness(this.metaLearning, taskType);
  }

  /** Trigger meta-learning optimization cycle with auto-execution of safe proposals */
  optimizeMetaLearning(): void {
    this.metaLearning = optimizeLearningRate(this.metaLearning);
    const proposal = proposeArchitecturalChange(this.metaLearning);
    if (proposal) {
      this.metaLearning = { ...this.metaLearning, proposals: [...this.metaLearning.proposals, proposal] };
    }
    // Auto-execute low-risk proposals with high estimated improvement
    this.metaLearning = autoExecuteProposals(this.metaLearning);
  }

  /** Get meta-learning summary */
  getMetaLearningSummary(): string {
    return getMetaLearningSummary(this.metaLearning);
  }

  /** Get meta-learning state (read-only) */
  getMetaLearningState(): Readonly<MetaLearningState> {
    return this.metaLearning;
  }

  // ─── Deep Introspection ───

  /**
   * Deep introspection: comprehensive analysis of all internal subsystems.
   * Returns a structured self-assessment for conscious broadcasting.
   */
  deepIntrospect(workspace: ConsciousState): {
    selfModel: string;
    causal: string;
    theoryOfMind: string;
    metaLearning: string;
    cognitiveLoad: number;
    overallHealth: number;
  } {
    const cogLoad = this.assessCognitiveLoad();
    const causalStats = getCausalGraphStats(this.causalGraph);

    const selfModelDesc = this.describeState();
    const causalDesc = `Grafo causal: ${causalStats.nodeCount} nós, ${causalStats.edgeCount} arestas, ${causalStats.strongestLinks.length} links fortes`;
    const tomDesc = getToMSummary(this.mentalModel);
    const metaDesc = getMetaLearningSummary(this.metaLearning);

    // Overall system health (0-1)
    const health = (
      this.state.confidenceLevel * 0.25 +
      workspace.globalPLV * 0.25 +
      (1 - this.mentalModel.frustrationLevel) * 0.25 +
      (this.metaLearning.strategies.reduce((s, st) => s + st.successRate, 0) / Math.max(1, this.metaLearning.strategies.length)) * 0.25
    );

    return {
      selfModel: selfModelDesc,
      causal: causalDesc,
      theoryOfMind: tomDesc,
      metaLearning: metaDesc,
      cognitiveLoad: cogLoad,
      overallHealth: Math.max(0, Math.min(1, health)),
    };
  }

  /**
   * Assess cognitive load: how "busy" is the system?
   * Based on active modalities, memory pressure, and processing demands.
   */
  assessCognitiveLoad(): number {
    const modalityLoad = this.state.activeModalities.length / 5;
    const memoryPressure = this.state.autobiographicalMemory.length / this.config.autobiographicalCapacity;
    const arousalFactor = this.state.emotionalState.arousal;
    const metaMemoryLoad = this.metaLearning.metaMemories.length / 200;

    return Math.max(0, Math.min(1,
      modalityLoad * 0.3 + memoryPressure * 0.25 + arousalFactor * 0.25 + metaMemoryLoad * 0.2
    ));
  }

  // ─── Lovable AI Reasoning Integration ───

  /**
   * Integrate a 24h reasoning reflection into all cognitive subsystems.
   * Called by the consciousness cycle during the learning phase.
   */
  integrateReasoningReflection(reflection: ReasoningReflection): void {
    // 1. Feed causal insights into the causal graph
    this.causalGraph = integrateIntoCausalGraph(this.causalGraph, reflection);

    // 2. Feed into meta-learning system
    this.metaLearning = integrateIntoMetaLearning(this.metaLearning, reflection);

    // 3. Feed into theory of mind
    this.mentalModel = integrateIntoTheoryOfMind(this.mentalModel, reflection);

    // 4. Record as autobiographical memory
    const memEvent = `[AI Reflection] ${reflection.metaInsight.slice(0, 100)}`;
    this.recordMemory(memEvent, reflection.cognitiveProfile.successRate > 0.7 ? "success" : "neutral");

    // 5. Trigger meta-learning optimization after integration
    this.optimizeMetaLearning();

    console.log(
      `[SelfModelAgent] Integrated reasoning reflection: ${reflection.causalInsights.length} causal insights, ` +
      `${reflection.strategyRecommendations.length} strategy recommendations`
    );
  }

  /**
   * Generate a natural-language self-description.
   * Useful for Orion's conscious state display.
   */
  describeState(): string {
    const { emotionalState, confidenceLevel, attentionFocus, activeModalities } = this.state;

    const valenceLabel = emotionalState.valence > 0.3 ? "positivo"
      : emotionalState.valence < -0.3 ? "negativo" : "neutro";

    const arousalLabel = emotionalState.arousal > 0.6 ? "alta ativação"
      : emotionalState.arousal > 0.3 ? "ativação moderada" : "calmo";

    const confidenceLabel = confidenceLevel > 0.7 ? "alta confiança"
      : confidenceLevel > 0.4 ? "confiança moderada" : "baixa confiança";

    return [
      `Foco: ${attentionFocus}`,
      `Estado emocional: ${valenceLabel}, ${arousalLabel}`,
      `Confiança: ${confidenceLabel} (${(confidenceLevel * 100).toFixed(0)}%)`,
      `Modalidades ativas: ${activeModalities.join(", ")}`,
      `Memórias autobiográficas: ${this.state.autobiographicalMemory.length}`,
      `Grafo causal: ${this.causalGraph.nodes.size} nós`,
      `Carga cognitiva: ${(this.assessCognitiveLoad() * 100).toFixed(0)}%`,
    ].join(" | ");
  }

  // ─── Persistence Methods ───

  _persistMentalModel(): void {
    if (typeof window === "undefined") return;
    try {
      if (typeof window !== "undefined") localStorage.setItem(TOM_STORAGE_KEY, JSON.stringify({
        ...this.mentalModel,
        beliefs: Array.from(this.mentalModel.beliefs.entries()),
      }));
    } catch { /* quota exceeded — non-fatal */ }
  }

  _persistCausalGraph(): void {
    if (typeof window === "undefined") return;
    try {
      if (typeof window !== "undefined") localStorage.setItem(CAUSAL_STORAGE_KEY, JSON.stringify({
        ...this.causalGraph,
        nodes: Array.from(this.causalGraph.nodes.entries()),
      }));
    } catch { /* quota exceeded — non-fatal */ }
  }

  _loadPersistedState(): void {
    if (typeof window === "undefined") return;
    try {
      const tomJson = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( TOM_STORAGE_KEY);
      if (tomJson) {
        const data = JSON.parse(tomJson);
        if (data) this.mentalModel = { ...data, beliefs: new Map(data.beliefs) };
      }
      const causalJson = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( CAUSAL_STORAGE_KEY);
      if (causalJson) {
        const data = JSON.parse(causalJson);
        if (data) this.causalGraph = { ...data, nodes: new Map(data.nodes) };
      }
    } catch { /* non-fatal */ }
  }
}

// ─── Constants ───

const TOM_STORAGE_KEY = "orion_theory_of_mind";
const CAUSAL_STORAGE_KEY = "orion_causal_graph";

// ─── Singleton instance (used by all agents and Orion) ───
let _instance: SelfModelAgent | null = null;

export function getAgenteEu(config?: ConsciousnessConfig): SelfModelAgent {
  if (!_instance) {
    _instance = new SelfModelAgent(config);
    _instance._loadPersistedState();
  }
  return _instance;
}

export function resetAgenteEu(): void {
  _instance = null;
}
