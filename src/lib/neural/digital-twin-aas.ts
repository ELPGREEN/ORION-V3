/**
 * ─── v22: Digital Twin / Asset Administration Shell (AAS) ───
 * Implements Industry 4.0 AAS patterns for neural model representation.
 * 
 * Inspired by:
 * - Plattform Industrie 4.0 — Asset Administration Shell (AAS) specification
 * - Flex4Res — Digital Twins for resilient manufacturing
 * - THOMAS — Reconfigurable shop floors with cognitive agents
 * 
 * Applied to neural network: each neural component (agent, module, model)
 * is represented as a Digital Twin with standardized sub-models.
 * Enables: versioning, monitoring, reconfiguration, and interoperability.
 * 
 * Ref: DIN SPEC 91345, Plattform I40 AAS Details Part 1 & 2
 */

// ─── AAS Types ───

export type AssetKind = "instance" | "type" | "template";
export type ModelingKind = "template" | "instance";

export interface AssetAdministrationShell {
  idShort: string;
  identification: string;
  assetKind: AssetKind;
  description: string;
  submodels: Submodel[];
  administration: {
    version: string;
    revision: string;
    creator: string;
  };
  derivedFrom?: string; // parent AAS id
  createdAt: number;
  updatedAt: number;
}

export interface Submodel {
  idShort: string;
  semanticId: string;
  kind: ModelingKind;
  properties: SubmodelElement[];
}

export interface SubmodelElement {
  idShort: string;
  valueType: "string" | "number" | "boolean" | "array" | "object";
  value: unknown;
  unit?: string;
  semanticId?: string;
}

// ─── Neural Digital Twin ───

export interface NeuralComponentTwin {
  aas: AssetAdministrationShell;
  operationalState: OperationalState;
  performanceMetrics: PerformanceMetrics;
  configurationHistory: ConfigSnapshot[];
  healthIndicators: HealthIndicator[];
}

export interface OperationalState {
  status: "active" | "degraded" | "maintenance" | "offline";
  uptime: number; // ms since last activation
  lastHeartbeat: number;
  currentLoad: number; // 0-1
  errorRate: number; // 0-1
}

export interface PerformanceMetrics {
  accuracy: number;
  latencyMs: number;
  throughput: number; // requests/minute
  qualityScore: number;
  learningRate: number;
  epoch: number;
}

export interface ConfigSnapshot {
  version: string;
  timestamp: number;
  weights: Record<string, number>;
  hyperparameters: Record<string, unknown>;
  trigger: "manual" | "auto_optimization" | "rollback" | "federated_update";
}

export interface HealthIndicator {
  name: string;
  value: number;
  threshold: number;
  status: "healthy" | "warning" | "critical";
  lastChecked: number;
}

// ─── Digital Twin Registry (AAS Registry) ───

export class DigitalTwinRegistry {
  private twins: Map<string, NeuralComponentTwin> = new Map();

  /**
   * Register a neural component as a Digital Twin with AAS.
   */
  registerTwin(
    componentId: string,
    componentType: string,
    description: string,
    initialWeights: Record<string, number> = {}
  ): NeuralComponentTwin {
    const twin: NeuralComponentTwin = {
      aas: {
        idShort: componentId,
        identification: `urn:neural:${componentType}:${componentId}`,
        assetKind: "instance",
        description,
        submodels: [
          this.createIdentificationSubmodel(componentId, componentType),
          this.createOperationalSubmodel(),
          this.createPerformanceSubmodel(),
          this.createConfigurationSubmodel(initialWeights),
        ],
        administration: {
          version: "1.0",
          revision: "0",
          creator: "neural-system",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      operationalState: {
        status: "active",
        uptime: 0,
        lastHeartbeat: Date.now(),
        currentLoad: 0,
        errorRate: 0,
      },
      performanceMetrics: {
        accuracy: 0.5,
        latencyMs: 0,
        throughput: 0,
        qualityScore: 0.5,
        learningRate: 0.01,
        epoch: 0,
      },
      configurationHistory: [{
        version: "1.0.0",
        timestamp: Date.now(),
        weights: initialWeights,
        hyperparameters: {},
        trigger: "manual",
      }],
      healthIndicators: [
        { name: "accuracy", value: 0.5, threshold: 0.4, status: "healthy", lastChecked: Date.now() },
        { name: "error_rate", value: 0, threshold: 0.1, status: "healthy", lastChecked: Date.now() },
        { name: "latency", value: 0, threshold: 500, status: "healthy", lastChecked: Date.now() },
      ],
    };

    this.twins.set(componentId, twin);
    return twin;
  }

  private createIdentificationSubmodel(id: string, type: string): Submodel {
    return {
      idShort: "Identification",
      semanticId: "urn:aas:submodel:identification",
      kind: "instance",
      properties: [
        { idShort: "ComponentId", valueType: "string", value: id },
        { idShort: "ComponentType", valueType: "string", value: type },
        { idShort: "CreatedAt", valueType: "number", value: Date.now() },
      ],
    };
  }

  private createOperationalSubmodel(): Submodel {
    return {
      idShort: "OperationalData",
      semanticId: "urn:aas:submodel:operational",
      kind: "instance",
      properties: [
        { idShort: "Status", valueType: "string", value: "active" },
        { idShort: "Uptime", valueType: "number", value: 0, unit: "ms" },
        { idShort: "CurrentLoad", valueType: "number", value: 0 },
      ],
    };
  }

  private createPerformanceSubmodel(): Submodel {
    return {
      idShort: "Performance",
      semanticId: "urn:aas:submodel:performance",
      kind: "instance",
      properties: [
        { idShort: "Accuracy", valueType: "number", value: 0.5 },
        { idShort: "QualityScore", valueType: "number", value: 0.5 },
        { idShort: "Throughput", valueType: "number", value: 0, unit: "req/min" },
      ],
    };
  }

  private createConfigurationSubmodel(weights: Record<string, number>): Submodel {
    return {
      idShort: "Configuration",
      semanticId: "urn:aas:submodel:configuration",
      kind: "instance",
      properties: [
        { idShort: "Weights", valueType: "object", value: weights },
        { idShort: "Version", valueType: "string", value: "1.0.0" },
        { idShort: "LearningRate", valueType: "number", value: 0.01 },
      ],
    };
  }

  // ─── Twin Updates ───

  updateMetrics(componentId: string, metrics: Partial<PerformanceMetrics>): void {
    const twin = this.twins.get(componentId);
    if (!twin) return;

    Object.assign(twin.performanceMetrics, metrics);
    twin.aas.updatedAt = Date.now();
    twin.operationalState.lastHeartbeat = Date.now();

    // Update health indicators
    this.evaluateHealth(twin);
  }

  updateWeights(
    componentId: string,
    newWeights: Record<string, number>,
    trigger: ConfigSnapshot["trigger"] = "auto_optimization"
  ): void {
    const twin = this.twins.get(componentId);
    if (!twin) return;

    const currentVersion = twin.configurationHistory[twin.configurationHistory.length - 1];
    const [major, minor, patch] = (currentVersion?.version || "1.0.0").split(".").map(Number);

    const snapshot: ConfigSnapshot = {
      version: `${major}.${minor}.${patch + 1}`,
      timestamp: Date.now(),
      weights: newWeights,
      hyperparameters: { learningRate: twin.performanceMetrics.learningRate },
      trigger,
    };

    twin.configurationHistory.push(snapshot);
    twin.aas.updatedAt = Date.now();
    twin.aas.administration.revision = String(Number(twin.aas.administration.revision) + 1);

    // Keep only last 50 snapshots
    if (twin.configurationHistory.length > 50) {
      twin.configurationHistory = twin.configurationHistory.slice(-50);
    }
  }

  private evaluateHealth(twin: NeuralComponentTwin): void {
    for (const indicator of twin.healthIndicators) {
      indicator.lastChecked = Date.now();
      switch (indicator.name) {
        case "accuracy":
          indicator.value = twin.performanceMetrics.accuracy;
          indicator.status = indicator.value >= indicator.threshold ? "healthy" :
            indicator.value >= indicator.threshold * 0.7 ? "warning" : "critical";
          break;
        case "error_rate":
          indicator.value = twin.operationalState.errorRate;
          indicator.status = indicator.value <= indicator.threshold ? "healthy" :
            indicator.value <= indicator.threshold * 1.5 ? "warning" : "critical";
          break;
        case "latency":
          indicator.value = twin.performanceMetrics.latencyMs;
          indicator.status = indicator.value <= indicator.threshold ? "healthy" :
            indicator.value <= indicator.threshold * 2 ? "warning" : "critical";
          break;
      }
    }

    // Update operational status based on health
    const criticalCount = twin.healthIndicators.filter(h => h.status === "critical").length;
    const warningCount = twin.healthIndicators.filter(h => h.status === "warning").length;

    if (criticalCount > 0) twin.operationalState.status = "degraded";
    else if (warningCount > 1) twin.operationalState.status = "degraded";
    else twin.operationalState.status = "active";
  }

  // ─── Rollback (Reconfiguration) ───

  rollbackToVersion(componentId: string, version: string): boolean {
    const twin = this.twins.get(componentId);
    if (!twin) return false;

    const snapshot = twin.configurationHistory.find(s => s.version === version);
    if (!snapshot) return false;

    this.updateWeights(componentId, snapshot.weights, "rollback");
    return true;
  }

  // ─── Resilience Assessment (Flex4Res-inspired) ───

  assessSystemResilience(): {
    healthyComponents: number;
    degradedComponents: number;
    totalComponents: number;
    overallHealth: number;
    reconfigurationCapability: number;
  } {
    const twins = [...this.twins.values()];
    const healthy = twins.filter(t => t.operationalState.status === "active").length;
    const degraded = twins.filter(t => t.operationalState.status === "degraded").length;

    // Reconfiguration capability: ability to rollback
    const hasHistory = twins.filter(t => t.configurationHistory.length > 1).length;
    const reconfigCapability = twins.length > 0 ? hasHistory / twins.length : 0;

    const overallHealth = twins.length > 0 ? healthy / twins.length : 0;

    return {
      healthyComponents: healthy,
      degradedComponents: degraded,
      totalComponents: twins.length,
      overallHealth,
      reconfigurationCapability: reconfigCapability,
    };
  }

  // ─── Getters ───

  getTwin(componentId: string): NeuralComponentTwin | undefined {
    return this.twins.get(componentId);
  }

  getAllTwins(): NeuralComponentTwin[] {
    return [...this.twins.values()];
  }

  getComponentIds(): string[] {
    return [...this.twins.keys()];
  }
}

// ─── Factory ───

export function createNeuralTwinRegistry(): DigitalTwinRegistry {
  const registry = new DigitalTwinRegistry();

  // Register core neural components as Digital Twins
  const coreComponents = [
    { id: "search-engine", type: "neural_search", desc: "Multi-Head Attention Neural Search Engine" },
    { id: "agent-society", type: "multi_agent", desc: "Society of Mind Agent Coordination" },
    { id: "knowledge-base", type: "knowledge_store", desc: "Neural Knowledge Base with Embeddings" },
    { id: "feedback-loop", type: "learning_pipeline", desc: "STDP + Hebbian Learning Feedback Loop" },
    { id: "semantic-cache", type: "cache", desc: "Semantic Query Cache with Jaccard Similarity" },
    { id: "quantum-planner", type: "planning", desc: "Quantum-Inspired Task Planning" },
  ];

  for (const comp of coreComponents) {
    registry.registerTwin(comp.id, comp.type, comp.desc);
  }

  return registry;
}
