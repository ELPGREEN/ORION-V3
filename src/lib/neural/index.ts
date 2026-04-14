/**
 * ─── Neural Algorithms Module ───
 * Barrel export for all neural modules (v25.0 — Vision cleanup: Gemini-only).
 */

// ═══ Core Activations & Runtime ═══
export * from "./activations";
export * from "./tf-runtime";

// ═══ Reasoning & Planning ═══
export * from "./agent-planner";
export * from "./causal-reasoning";
export * from "./theory-of-mind";
export * from "./meta-learning";
export * from "./concept-model";
export * from "./cross-attention";
export * from "./cross-modal-embeddings";

// ═══ Industry 4.0 / Digital Twin / IoT ═══
export * from "./digital-twin-aas";
export * from "./federated-data-space";
export * from "./interoperability-middleware";
export * from "./industrial-protocols";
export * from "./network-iot-protocols";
export * from "./security-compliance-protocols";
export * from "./ros2-protocol-bridge";
export * from "./ros2-advanced-protocols";
export * from "./vda5050-protocol";
export * from "./smart-home-controller";
export * from "./bluetooth-manager";
export * from "./iot-device-bridge";
export * from "./web-api-integrations";

// ═══ Document & Versioning ═══
export * from "./document-versioning";

// ═══ Consciousness & Embodiment ═══
export * from "./gamma-oscillations";
export * from "./tesla-coil-amplifier";
export * from "./tesla-wireless-p2p";
export * from "./tesla-resonance";
export * from "./global-workspace";
export * from "./hierarchical-rl";
export * from "./qhrl-integration";
export * from "./consciousness-bridge";
export * from "./interoception-engine";
export * from "./somatic-markers";
export * from "./embodied-memory";
export * from "./neural-mirroring";
export * from "./orion-consciousness";

// ═══ Memory Systems ═══
export * from "./kv-cache-augmented";
export * from "./semantic-cache";
export * from "./episodic-memory";
export * from "./orion-memory";
export {
  type WorkingMemoryItem,
  type InterruptRecord,
  type WorkingMemoryState,
  initWorkingMemory,
  pushToWorkingMemory,
  getWorkingMemoryContext,
  buildWorkingMemoryPrompt,
  pinContext,
  clearWorkingMemory,
  getCognitiveLoad,
  getSuppressedInterrupts,
  getPhonologicalBuffer,
  getWorkingMemorySnapshot,
} from "./orion-working-memory";

// ═══ Models & Architectures ═══
export * from "./mamba";
export * from "./multimodal-mamba-audio";
export * from "./multimodal-fusion";
export * from "./multimodal-search";
export * from "./multimodal-pipeline";
export * from "./slim-model-router";
export * from "./llm-judge";
export * from "./masked-prediction";

// ═══ Multi-Agent ═══
export { type AgentRole, type A2AMessageType, type ExecutionMode, type MemoryLevel, type AgentState, type A2AMessage, type SharedMemoryEntry, type AgentSocietyState, createDefaultAgents, createAgentSociety, computeAgentPriority, routeTask, recordAgentCoActivation, getSuggestedPartners, getAgentBindingSummary, createSharedMemory, setMemory, getMemory, evictExpiredMemory, evaluateAgent } from "./multi-agent";
export {
  onAgentTaskComplete,
  getSmartRouting,
  getSocietySnapshot,
  getRecentBroadcasts,
  getSocietyBindingSummary,
  getAgentMetrics,
  getNeuralAgentContext,
  resetNeuralBridge,
  getP2PStatus,
  type AgentBroadcast as NeuralAgentBroadcast,
} from "./neural-agent-bridge";

// ═══ LiteRT (Google AI Edge) ═══
export * from "./litert-compiled-model";
export {
  type SourceFramework, type TargetFormat, type ConversionConfig,
  type InputSpec, type OutputSpec, type OptimizationFlag,
  type QuantizationConfig, type QuantizationMode,
  type QuantizationResult as LiteRTQuantizationResult,
  type ConversionResult, type NPUVendor, type NPUDispatchResult,
  type ProfilingResult,
} from "./litert-conversion";
export {
  type LiteRTLMConfig, type GenerationResult,
  type KVCacheEntry as LiteRTKVCacheEntry,
} from "./litert-lm";

// ═══ Audio ═══
export * from "./audio-stream-bridge";
export * from "./hf-space-client";

// ═══ TensorFlow Ecosystem ═══
export * from "./tf-continuous-learning";
export * from "./tf-predictive-analytics";
export * from "./tf-mlops-pipeline";
export * from "./tf-inference-optimization";
export * from "./tf-model-monitoring";
export {
  type ActivationName as TFAddonsActivationName,
  mish as tfAddonsMish,
  gelu as tfAddonsGelu,
  swish as tfAddonsSwish,
  focalLoss as tfAddonsFocalLoss,
} from "./tf-addons";
export * from "./tf-decision-forests";
export * from "./tf-gnn-nsl";
export {
  clipGradient as dpClipGradient,
} from "./tf-fairness-privacy";
export * from "./tf-probability-ranking";
export * from "./tf-text-ops";
export * from "./tf-libraries-registry";

// ═══ TF Responsible AI ═══
export {
  type DatasetProfile, type FeatureProfile, type BiasIndicator,
  type DataSchema, type DataCard,
  profileDataset,
  validateData as responsibleValidateData,
  detectDrift as responsibleDetectDrift,
} from "./tf-responsible-ai-data";
export {
  type TFMAConfig, type SlicingSpec, type MetricThreshold,
  type CounterfactualResult as WITCounterfactualResult,
} from "./tf-responsible-ai-evaluation";
export * from "./tf-responsible-ai-training";

// ═══ TFX Pipeline ═══
export * from "./tfx-pipeline-components";

// ═══ Offline & Sync ═══
export * from "./offline-sync";
export * from "./quality-presets";

// ═══ Self-Comprehension ═══
export {
  type ReformulationMode,
  type ReformulationResult,
  type ComprehensionAnalysis,
  analyzeComprehension,
  reformulateForComprehension,
  quickLocalReformulate,
  needsReformulation,
  COMPREHENSION_THRESHOLD,
} from "./orion-reformulation";

// ═══ Active Inference & Cognitive Reasoning ═══
export * from "./active-inference-guard";
export * from "./cognitive-fast-reasoner";
export * from "./instant-response-cache";
export * from "./query-time-estimator";

// ═══ Neural Cognition Engine ═══
export * from "./neural-cognition-engine";
export * from "./drafter-critic-loop";
export * from "./nlp-semantic-analyzer";

// ═══ Local LLM Engine (100% Browser) ═══
export {
  generateLocalResponse,
  isLocalEngineAvailable,
  preloadModels,
  getLocalEngineStats,
  clearLocalModels,
} from "../ai/local-llm-engine";

// ═══ Quantum ═══
export * from "./qubit-core";
export * from "./quantum-gates";
export * from "./quantum-entanglement";
export * from "./quantum-decoherence";
export {
  type WaveFunction,
  type CollapseResult,
  type WaveFunctionMetrics,
  createWaveFunction,
  createWaveFunctionFromQubits,
  superpose,
  blend as quantumBlend,
  evolve as quantumEvolve,
  collapse as quantumCollapse,
  collapsePartial,
  entropy as quantumEntropy,
  maxEntropy as quantumMaxEntropy,
  normalizedEntropy as quantumNormalizedEntropy,
  getMetrics as getQuantumMetrics,
  waveFidelity,
  decohere as quantumDecohere,
  decoherePhysical,
  confidenceWaveFunction,
  isUncertain,
  getDominantDimension,
} from "./quantum-wave-function";
export * from "./vqc";
export * from "./qiskit-runtime";
export * from "./quantum-planner";

// ═══ Temporal & Learning ═══
export * from "./stdp";
export * from "./temporal-binding";

// ═══ Orion Core Systems ═══
export { matchAndExecuteTool, getAvailableTools } from "./orion-tool-executor";
export {
  type NeuralCommand,
  type CommandCategory,
  NEURAL_COMMAND_REGISTRY,
  matchCommand,
  getCommandsByCategory,
  getCommandsBySubcategory,
  getRegistryStats,
  searchCommands,
} from "./orion-command-registry";
export * from "./orion-introspection";
export * from "./orion-ai-client";
export * from "./orion-api-orchestrator";
export * from "./orion-orchestrator-exec";
export * from "./orion-agentic-loop";
export * from "./orion-autonomous-media";
export * from "./orion-defense-system";
export * from "./orion-network-registry";
export * from "./orion-protocol-registry";
export * from "./orion-nav-map";
export * from "./orion-knowledge-base";
export * from "./orion-journal";
export * from "./orion-tracing";
export * from "./orion-voice-evolution";
export {
  type ReasoningSnapshot,
  type ReasoningReflection,
  type TemporalTrend,
  type ToolCoOccurrence,
  type ProviderEfficiency,
  type CognitiveMetrics,
  fetch24hReasoningData,
  generateReasoningReflection,
  runReasoningCaptureCycle,
  integrateIntoCausalGraph,
  integrateIntoMetaLearning,
  integrateIntoTheoryOfMind,
} from "./lovable-reasoning-engine";
export {
  type ActionIntent,
  type ActionStatus,
  type PerceptionResult,
  type IntentResult,
  type SubTask as LAMSubTask,
  type ActionPlan,
  type NeuroSymbolicConstraint,
  type ExecutionResult as LAMExecutionResult,
  type FeedbackEntry,
  type ActionMemory,
  perceiveInput,
  recognizeIntent,
  decomposeTask as decomposeActionTask,
  planActions,
  executeAction,
  feedbackLoop,
  runLAMPipeline,
  getActionMemoryStats,
} from "./large-action-model";

// ═══ Task, Reward & Health ═══
export * from "./reward-loop";
export * from "./task-orchestrator";
export * from "./system-health";

// ═══ Telemetry & Voice ═══
export * from "./neural-telemetry-hub";
export * from "./voice-evolution-feedback";
export * from "./provider-health";

// ═══ Perceive → Reason → Act Orchestrator (AWS Agentic AI) ═══
export {
  type PerceptionChannel,
  type TextPercept,
  type AudioPercept,
  type SensorPercept,
  type VisionPercept,
  type FacialPercept,
  type Percept,
  type PerceptionFrame,
  type GoalStatus,
  type AgentGoal as PRA_AgentGoal,
  type PlanStep as PRA_PlanStep,
  type PlanStepStatus,
  type Plan as PRA_Plan,
  type MemoryEntry as PRA_MemoryEntry,
  type AgentMemory as PRA_AgentMemory,
  type KnowledgeItem,
  type Decision as PRA_Decision,
  type ActuatorType,
  type ToolCategory,
  type ToolDefinition,
  type ToolResult as PRA_ToolResult,
  type ActionResult as PRA_ActionResult,
  type OrchestratorState,
  type FeedbackEntry as PRA_FeedbackEntry,
  type PRA_CycleResult,
  runPRA_Cycle,
  addGoal as addPRA_Goal,
  removeGoal as removePRA_Goal,
  setGoals as setPRA_Goals,
  registerTool as registerPRA_Tool,
  addKnowledge as addPRA_Knowledge,
  setAutonomyMode as setPRA_AutonomyMode,
  approveDecision as approvePRA_Decision,
  getOrchestratorState,
  resetOrchestrator,
  formatPRA_ContextForLLM,
  createVisionPercept,
  createFacialPercept,
  createTextPercept,
  createAudioPercept,
} from "./perceive-reason-act";

// ═══ Multi-Tenant AaaS (AWS Agentic AI Architecture) ═══
export {
  type TenantTier,
  type DeploymentModel,
  type AgentVisibility,
  type AgentRole as AaaSAgentRole,
  type TenantContext,
  type TenantPersona,
  type TenantGuardrails,
  type TenantIsolationPolicy,
  type IsolationLevel,
  type ThrottlingPolicy,
  type ThrottleWindow,
  type AgentServiceDescriptor,
  type ControlPlane,
  type AgentRoute,
  type TenantUsageMetrics,
  type SystemAnalytics,
  TIER_THROTTLE_DEFAULTS,
  onboardTenant,
  offboardTenant,
  checkThrottle,
  checkIsolation,
  routeAgentRequest,
  registerAgentRoute,
  registerAgent as registerAaaSAgent,
  recordUsage as recordTenantUsage,
  createTenantContext,
  getTenantPersona,
  getControlPlaneAnalytics,
  getTenantUsage,
  listTenants,
  listAgents as listAaaSAgents,
  updateTenantTier,
  resetControlPlane,
  formatTenantContextForLLM,
} from "./multi-tenant-agent";

// Re-export tenant-aware PRA cycle
export {
  runTenantAwarePRA_Cycle,
  formatMultiTenantPRA_Context,
} from "./perceive-reason-act";

// ═══ Agentic Patterns Engine (AWS Agentic AI Patterns 2025) ═══
export * from "./agentic-patterns-engine";

// ═══ Agentic Protocols, Platforms & Tools (AWS Frameworks 2026) ═══
export * from "./agentic-protocols-tools";

// ═══ RAG Evaluation & Feedback ═══
export { evaluateRAGResponse, type RAGEvalResult, type RAGMetricScore, type RetrievalQuality } from "./rag-evaluator";
export { submitRAGFeedback, getOptimizedWeights, classifyQueryType, type SearchWeights, type WeightProfile } from "./rag-feedback-loop";

// ═══ Jules Self-Improvement ═══
export {
  julesClient, orionSelfImprove, pollJulesSession,
  checkJulesRateLimit, julesFollowUp, getJulesDBSessions, getPendingJulesSessions,
  updateJulesSessionStatus, type JulesDBSession,
} from "./jules-client";
export {
  recordSubsystemFailure, resetSubsystemFailures, getSubsystemFailureStatus,
  recordTFFailure, recordVisionFailure, recordSTTFailure, recordTTSFailure,
  recordIoTFailure, recordONNXFailure, recordCoreFailure, recordPerfFailure,
  recordDesignFailure, recordSecurityFailure, recordIndustrialFailure,
  checkJulesResolution, type SubsystemKey,
} from "./jules-auto-triggers";
export { startJulesPolling, stopJulesPolling, isJulesPollingActive } from "./jules-session-poller";

// ═══ Jules Evolution Engine & Immune System ═══
export {
  scanForBugs, scanPerformance, scanDesign, scanSecurity,
  runFullScan, getLastScanResults, getHealthScore,
  startAutoScan, stopAutoScan,
  type ScanResult, type ScanIssue,
} from "./jules-evolution-engine";
export {
  getImmuneMemory, registerAntibody, hasAntibody,
  recordModuleFailure, shouldQuarantine, clearQuarantine,
  checkAndRegisterResolutions, getImmuneStats,
} from "./jules-immune-system";

// ═══ Jules-Órion Fusion — Industrial Robotics ═══
export {
  triggerIndustrialAutoProgram, runIndustrialEvolutionCycle,
  triggerWeldingAutoProgram, triggerAssemblyAutoProgram,
  triggerPaintingAutoProgram, triggerInspectionAutoProgram,
  triggerPalletizationAutoProgram, triggerAdaptiveMfgAutoProgram,
  triggerProtocolBridge, generateProtocolBridgePrompt,
  registerIoTDevice, removeIoTDevice, getRegisteredDevices, getDevicesByDomain,
  type IndustrialDomain, type IndustrialProtocol, type RobotVendor,
  type IoTDevice, type IndustrialTask, type FusionResult,
} from "./jules-orion-fusion";
export {
  scanIndustrialHealth, computeIndustrialMetrics, dispatchIndustrialIssues,
  type IndustrialSubsystemKey, type IndustrialHealthMetrics,
} from "./jules-industrial-scanner";

// ═══ Serverless Agent Runtime (AWS Serverless Agentic AI Architecture 2026) ═══
export {
  type EventType as ServerlessEventType,
  type ServerlessEvent,
  type EventHandler as ServerlessEventHandler,
  type ArchitectureLayer,
  type LayerResult,
  type LayerMetrics,
  type ModelTier,
  type OrchestrationMode,
  type ArchitecturePattern,
  type PatternConfig,
  type ServerlessPipelineState,
  type PipelineExecutionResult,
  type PipelineTrace,
  type TraceSpan,
  type ObservabilityConfig,
  type CostOptimizationConfig,
  type ServerlessGuardrails,
  type ContentFilter,
  type AgentCoreRuntime,
  type AgentCoreMemory,
  type AgentCoreGateway,
  type AgentCoreTool,
  type GatewayConnector,
  type WorkflowDefinition,
  type WorkflowStep,
  type DecisioningRule,
  eventBus,
  createServerlessPipeline,
  executeServerlessPipeline,
  executeWorkflow,
  getServerlessPipelineState,
  getPipelineTraces,
  getPipelineObservability,
  registerGatewayConnector,
  registerAgentCoreTool,
  addPreprocessor,
  addDecisioningRule,
  resetServerlessPipeline,
  formatServerlessContextForLLM,
} from "./serverless-agent-runtime";
