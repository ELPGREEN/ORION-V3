/**
 * ─── v22: Interoperability Middleware (ARISE/FIWARE/ROS4HRI-Inspired) ───
 * Implements middleware patterns for neural module interoperability.
 * 
 * Inspired by:
 * - ARISE — All-in-one middleware integrating FIWARE + ROS2
 * - ROS4HRI (REP-155) — Standard conventions for HRI
 * - FIWARE Smart Data Models — Canonical data representation
 * - SHOP4CF — Human-oriented platform for connected factories
 * - VDA 5050 / MassRobotics — Fleet interoperability standards
 * 
 * Applied to neural network: standardized message bus for inter-module
 * communication with context brokers, canonical data models, and
 * Testing & Experimentation Facility (TEF) validation patterns.
 * 
 * Ref: FIWARE NGSI-LD, ROS REP-155, ARISE Technical Guidelines
 */

// ─── NGSI-LD Inspired Entity Model ───

export interface NeuralEntity {
  id: string;
  type: string;
  properties: Record<string, EntityProperty>;
  relationships: Record<string, EntityRelationship>;
  createdAt: number;
  modifiedAt: number;
  observedAt?: number;
}

export interface EntityProperty {
  type: "Property";
  value: unknown;
  unitCode?: string;
  observedAt?: number;
  datasetId?: string;
}

export interface EntityRelationship {
  type: "Relationship";
  object: string; // target entity id
  observedAt?: number;
}

// ─── Message Bus (ROS2-inspired Topics) ───

export type TopicType =
  | "neural/feedback"
  | "neural/search/query"
  | "neural/search/result"
  | "neural/agent/task"
  | "neural/agent/result"
  | "neural/learning/update"
  | "neural/health/heartbeat"
  | "neural/config/change"
  | "neural/tef/validation"
  | "robot/cmd_vel"
  | "robot/nav/goal"
  | "robot/nav/cancel"
  | "robot/odom"
  | "robot/scan"
  | "robot/imu"
  | "robot/battery"
  | "robot/joint_states"
  | "robot/status"
  | "robot/emergency_stop"
  | "robot/actuator";

export interface BusMessage<T = unknown> {
  topic: TopicType;
  payload: T;
  publisherId: string;
  timestamp: number;
  correlationId?: string;
  qos: "best_effort" | "reliable";
}

type MessageHandler<T = unknown> = (msg: BusMessage<T>) => void;

export class NeuralMessageBus {
  private subscribers: Map<TopicType, MessageHandler[]> = new Map();
  private messageLog: BusMessage[] = [];
  private maxLogSize = 1000;

  subscribe<T>(topic: TopicType, handler: MessageHandler<T>): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic)!.push(handler as MessageHandler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(topic);
      if (handlers) {
        const idx = handlers.indexOf(handler as MessageHandler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  }

  publish<T>(topic: TopicType, payload: T, publisherId: string, qos: BusMessage["qos"] = "best_effort"): void {
    const msg: BusMessage<T> = {
      topic,
      payload,
      publisherId,
      timestamp: Date.now(),
      correlationId: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      qos,
    };

    // Log message
    this.messageLog.push(msg as BusMessage);
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog = this.messageLog.slice(-this.maxLogSize);
    }

    // Dispatch to subscribers
    const handlers = this.subscribers.get(topic) || [];
    for (const handler of handlers) {
      try {
        handler(msg as BusMessage);
      } catch (err) {
        console.debug(`[NeuralBus] Handler error on ${topic}:`, err);
      }
    }
  }

  getMessageCount(topic?: TopicType): number {
    if (topic) return this.messageLog.filter(m => m.topic === topic).length;
    return this.messageLog.length;
  }

  getRecentMessages(topic: TopicType, limit: number = 10): BusMessage[] {
    return this.messageLog.filter(m => m.topic === topic).slice(-limit);
  }
}

// ─── Context Broker (FIWARE-inspired) ───

export class NeuralContextBroker {
  private entities: Map<string, NeuralEntity> = new Map();
  private subscriptions: Map<string, ContextSubscription[]> = new Map();

  /**
   * Create or update an entity (NGSI-LD upsert pattern).
   */
  upsertEntity(entity: NeuralEntity): void {
    const existing = this.entities.get(entity.id);
    if (existing) {
      entity.modifiedAt = Date.now();
      // Merge properties
      for (const [key, prop] of Object.entries(entity.properties)) {
        existing.properties[key] = prop;
      }
      for (const [key, rel] of Object.entries(entity.relationships)) {
        existing.relationships[key] = rel;
      }
      existing.modifiedAt = Date.now();
    } else {
      this.entities.set(entity.id, entity);
    }

    // Notify subscriptions
    this.notifySubscribers(entity.id, entity.type);
  }

  queryEntities(type: string): NeuralEntity[] {
    return [...this.entities.values()].filter(e => e.type === type);
  }

  getEntity(id: string): NeuralEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * Subscribe to entity changes (NGSI-LD subscription pattern).
   */
  subscribeToType(entityType: string, callback: (entity: NeuralEntity) => void): string {
    const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (!this.subscriptions.has(entityType)) {
      this.subscriptions.set(entityType, []);
    }
    this.subscriptions.get(entityType)!.push({ id: subId, callback });
    return subId;
  }

  private notifySubscribers(entityId: string, entityType: string): void {
    const subs = this.subscriptions.get(entityType) || [];
    const entity = this.entities.get(entityId);
    if (!entity) return;
    for (const sub of subs) {
      try { sub.callback(entity); } catch { /* silent */ }
    }
  }
}

interface ContextSubscription {
  id: string;
  callback: (entity: NeuralEntity) => void;
}

// ─── TEF Validation (ARISE Testing & Experimentation Facilities) ───

export interface TEFChallenge {
  id: string;
  name: string;
  description: string;
  metrics: TEFMetric[];
  status: "pending" | "running" | "passed" | "failed";
  startedAt?: number;
  completedAt?: number;
  results?: Record<string, number>;
}

export interface TEFMetric {
  name: string;
  target: number;
  actual?: number;
  unit: string;
  operator: "gte" | "lte" | "eq" | "between";
  upperBound?: number;
}

export class TEFValidator {
  private challenges: TEFChallenge[] = [];

  /**
   * Register a TEF challenge (inspired by ARISE 8 industrial challenges).
   */
  registerChallenge(challenge: TEFChallenge): void {
    this.challenges.push(challenge);
  }

  /**
   * Run all pending challenges against the neural system.
   */
  runValidation(systemMetrics: Record<string, number>): TEFChallenge[] {
    for (const challenge of this.challenges) {
      if (challenge.status !== "pending") continue;

      challenge.status = "running";
      challenge.startedAt = Date.now();
      challenge.results = {};

      let allPassed = true;
      for (const metric of challenge.metrics) {
        const actual = systemMetrics[metric.name];
        metric.actual = actual;

        let passed = false;
        switch (metric.operator) {
          case "gte": passed = actual >= metric.target; break;
          case "lte": passed = actual <= metric.target; break;
          case "eq": passed = Math.abs(actual - metric.target) < 0.001; break;
          case "between": passed = actual >= metric.target && actual <= (metric.upperBound ?? Infinity); break;
        }

        challenge.results[metric.name] = actual;
        if (!passed) allPassed = false;
      }

      challenge.status = allPassed ? "passed" : "failed";
      challenge.completedAt = Date.now();
    }

    return this.challenges;
  }

  getResults(): TEFChallenge[] {
    return this.challenges;
  }

  getPassRate(): number {
    const completed = this.challenges.filter(c => c.status === "passed" || c.status === "failed");
    if (completed.length === 0) return 0;
    return completed.filter(c => c.status === "passed").length / completed.length;
  }
}

// ─── Factory: Create Neural Middleware Stack ───

export interface NeuralMiddlewareStack {
  bus: NeuralMessageBus;
  broker: NeuralContextBroker;
  tef: TEFValidator;
}

export function createNeuralMiddleware(): NeuralMiddlewareStack {
  const bus = new NeuralMessageBus();
  const broker = new NeuralContextBroker();
  const tef = new TEFValidator();

  // Register default TEF challenges (inspired by ARISE CH1-CH8)
  const defaultChallenges: TEFChallenge[] = [
    {
      id: "tef1_accuracy", name: "Search Accuracy",
      description: "Neural search must achieve ≥70% relevance on test queries",
      metrics: [{ name: "search_accuracy", target: 0.7, unit: "ratio", operator: "gte" }],
      status: "pending",
    },
    {
      id: "tef2_latency", name: "Response Latency",
      description: "P95 response latency must be ≤2000ms",
      metrics: [{ name: "p95_latency_ms", target: 2000, unit: "ms", operator: "lte" }],
      status: "pending",
    },
    {
      id: "tef3_learning", name: "Learning Rate",
      description: "System must show measurable learning improvement (≥5% per epoch)",
      metrics: [{ name: "learning_improvement", target: 0.05, unit: "ratio", operator: "gte" }],
      status: "pending",
    },
    {
      id: "tef4_resilience", name: "Resilience Score",
      description: "System must maintain ≥60% functionality under degraded conditions",
      metrics: [{ name: "resilience_score", target: 0.6, unit: "ratio", operator: "gte" }],
      status: "pending",
    },
    {
      id: "tef5_privacy", name: "Privacy Compliance",
      description: "Differential privacy budget must not be exhausted",
      metrics: [{ name: "privacy_budget_remaining", target: 1.0, unit: "epsilon", operator: "gte" }],
      status: "pending",
    },
  ];

  for (const ch of defaultChallenges) {
    tef.registerChallenge(ch);
  }

  return { bus, broker, tef };
}
