/**
 * ─── v22: Federated Data Space (IDS/GAIA-X/EDC-Inspired) ───
 * Implements data sovereignty patterns from EU Data Spaces architecture.
 * 
 * Inspired by:
 * - Eclipse Dataspace Connector (EDC) — policy-based data sharing
 * - GAIA-X — federated trust framework with self-descriptions
 * - International Data Spaces (IDS) — sovereign data exchange
 * - Flex4Res D1.2 — industrial data space for resilient manufacturing
 * 
 * Applied to neural network: enables federated learning across knowledge
 * domains while maintaining data sovereignty per user/context.
 * 
 * Ref: IDSA Reference Architecture Model 4.0, GAIA-X Architecture 22.04
 */

// ─── Types ───

export type DataSovereigntyLevel = "open" | "restricted" | "confidential" | "sovereign";
export type UsagePolicy = "allow_all" | "no_transfer" | "time_limited" | "purpose_limited" | "count_limited";
export type ConnectorRole = "provider" | "consumer" | "both";

export interface DataSpaceParticipant {
  id: string;
  name: string;
  role: ConnectorRole;
  trustLevel: number; // 0-1, GAIA-X compliance score
  selfDescription: SelfDescription;
  registeredAt: number;
}

export interface SelfDescription {
  /** GAIA-X-style self-description */
  serviceOffering: string;
  dataResources: string[];
  termsAndConditions: string;
  legalBasis: string;
  jurisdiction: string;
  complianceLevel: "basic" | "substantial" | "high";
}

export interface UsageContract {
  id: string;
  providerId: string;
  consumerId: string;
  dataResourceId: string;
  policy: UsagePolicy;
  constraints: ContractConstraints;
  createdAt: number;
  expiresAt: number;
  usageCount: number;
  maxUsages?: number;
}

export interface ContractConstraints {
  allowedPurposes: string[];
  prohibitedActions: string[];
  retentionPeriodMs: number;
  geographicRestriction?: string[];
  requiresAuditLog: boolean;
}

export interface DataAsset {
  id: string;
  ownerId: string;
  title: string;
  contentHash: string;
  sovereigntyLevel: DataSovereigntyLevel;
  policies: UsagePolicy[];
  metadata: Record<string, unknown>;
  createdAt: number;
  accessLog: AccessLogEntry[];
}

export interface AccessLogEntry {
  consumerId: string;
  contractId: string;
  timestamp: number;
  action: "read" | "transfer" | "aggregate" | "derive";
  success: boolean;
}

export interface FederatedLearningRound {
  roundId: number;
  participants: string[];
  localGradients: Map<string, number[]>;
  aggregatedGradient: number[];
  privacyBudgetUsed: number; // differential privacy epsilon
  timestamp: number;
}

// ─── Federated Data Space ───

export class FederatedDataSpace {
  private participants: Map<string, DataSpaceParticipant> = new Map();
  private assets: Map<string, DataAsset> = new Map();
  private contracts: Map<string, UsageContract> = new Map();
  private learningRounds: FederatedLearningRound[] = [];
  private privacyBudget: number;

  constructor(
    public readonly spaceId: string,
    public readonly name: string,
    privacyBudget: number = 10.0 // total epsilon budget
  ) {
    this.privacyBudget = privacyBudget;
  }

  // ─── Participant Management (GAIA-X Registry) ───

  registerParticipant(participant: DataSpaceParticipant): boolean {
    if (participant.trustLevel < 0.3) {
      console.debug(`[FederatedDS] Rejected ${participant.name}: trust too low (${participant.trustLevel})`);
      return false;
    }
    // Validate self-description (GAIA-X compliance check)
    if (!this.validateSelfDescription(participant.selfDescription)) {
      console.debug(`[FederatedDS] Rejected ${participant.name}: invalid self-description`);
      return false;
    }
    this.participants.set(participant.id, participant);
    return true;
  }

  private validateSelfDescription(sd: SelfDescription): boolean {
    return !!(sd.serviceOffering && sd.legalBasis && sd.jurisdiction && sd.dataResources.length > 0);
  }

  // ─── Asset Registration (IDS Broker) ───

  registerAsset(asset: DataAsset): string {
    this.assets.set(asset.id, asset);
    return asset.id;
  }

  // ─── Contract Negotiation (EDC Protocol) ───

  negotiateContract(
    providerId: string,
    consumerId: string,
    assetId: string,
    requestedPolicy: UsagePolicy,
    purpose: string
  ): UsageContract | null {
    const provider = this.participants.get(providerId);
    const consumer = this.participants.get(consumerId);
    const asset = this.assets.get(assetId);

    if (!provider || !consumer || !asset) return null;

    // Check asset sovereignty allows this consumer
    if (asset.sovereigntyLevel === "sovereign" && consumer.trustLevel < 0.8) {
      return null;
    }
    if (asset.sovereigntyLevel === "confidential" && consumer.trustLevel < 0.6) {
      return null;
    }

    // Check policy compatibility
    if (!asset.policies.includes(requestedPolicy) && !asset.policies.includes("allow_all")) {
      return null;
    }

    const contract: UsageContract = {
      id: `contract_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      providerId,
      consumerId,
      dataResourceId: assetId,
      policy: requestedPolicy,
      constraints: {
        allowedPurposes: [purpose],
        prohibitedActions: ["redistribution"],
        retentionPeriodMs: 30 * 24 * 3600 * 1000, // 30 days
        requiresAuditLog: asset.sovereigntyLevel !== "open",
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 90 * 24 * 3600 * 1000, // 90 days
      usageCount: 0,
    };

    if (requestedPolicy === "count_limited") {
      contract.maxUsages = 100;
    }

    this.contracts.set(contract.id, contract);
    return contract;
  }

  // ─── Data Access with Policy Enforcement ───

  accessAsset(contractId: string, consumerId: string, action: AccessLogEntry["action"]): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;
    if (contract.consumerId !== consumerId) return false;
    if (Date.now() > contract.expiresAt) return false;
    if (contract.maxUsages && contract.usageCount >= contract.maxUsages) return false;

    const asset = this.assets.get(contract.dataResourceId);
    if (!asset) return false;

    // Log access
    const logEntry: AccessLogEntry = {
      consumerId,
      contractId,
      timestamp: Date.now(),
      action,
      success: true,
    };
    asset.accessLog.push(logEntry);
    contract.usageCount++;

    return true;
  }

  // ─── Federated Learning (Privacy-Preserving) ───

  /**
   * Federated averaging with differential privacy.
   * Each participant computes local gradients; server aggregates
   * without seeing raw data (inspired by Flex4Res data spaces).
   */
  federatedAveraging(
    localGradients: Map<string, number[]>,
    noiseScale: number = 0.01
  ): number[] {
    if (localGradients.size === 0) return [];

    const dims = [...localGradients.values()][0].length;
    const aggregated = new Array(dims).fill(0);
    let totalWeight = 0;

    for (const [participantId, grads] of localGradients) {
      const participant = this.participants.get(participantId);
      const weight = participant?.trustLevel ?? 0.5;

      for (let i = 0; i < dims; i++) {
        // Add calibrated Gaussian noise for differential privacy
        const noise = this.gaussianNoise() * noiseScale;
        aggregated[i] += (grads[i] + noise) * weight;
      }
      totalWeight += weight;
    }

    // Normalize by total weight
    for (let i = 0; i < dims; i++) {
      aggregated[i] /= totalWeight || 1;
    }

    // Track privacy budget consumption
    const epsilonUsed = noiseScale > 0 ? 1 / noiseScale : 10;
    this.privacyBudget -= epsilonUsed;

    const round: FederatedLearningRound = {
      roundId: this.learningRounds.length,
      participants: [...localGradients.keys()],
      localGradients,
      aggregatedGradient: aggregated,
      privacyBudgetUsed: epsilonUsed,
      timestamp: Date.now(),
    };
    this.learningRounds.push(round);

    console.debug(
      `[FederatedDS] Round ${round.roundId}: ${localGradients.size} participants, ε=${epsilonUsed.toFixed(3)}, budget remaining=${this.privacyBudget.toFixed(2)}`
    );

    return aggregated;
  }

  private gaussianNoise(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // ─── Trust Score Computation (GAIA-X Compliance) ───

  computeTrustScore(participantId: string): number {
    const participant = this.participants.get(participantId);
    if (!participant) return 0;

    let score = 0;
    const sd = participant.selfDescription;

    // Compliance level weight
    const complianceWeights = { basic: 0.3, substantial: 0.6, high: 1.0 };
    score += complianceWeights[sd.complianceLevel] * 0.4;

    // Contract fulfillment rate
    const participantContracts = [...this.contracts.values()]
      .filter(c => c.providerId === participantId || c.consumerId === participantId);
    const fulfilled = participantContracts.filter(c => c.usageCount > 0).length;
    const fulfillmentRate = participantContracts.length > 0 ? fulfilled / participantContracts.length : 0.5;
    score += fulfillmentRate * 0.3;

    // Data quality indicator
    const participantAssets = [...this.assets.values()].filter(a => a.ownerId === participantId);
    const hasQualityData = participantAssets.length > 0;
    score += (hasQualityData ? 0.3 : 0.1);

    return Math.min(score, 1.0);
  }

  // ─── Resilience Assessment (Flex4Res-inspired) ───

  assessResilienceScore(): {
    redundancy: number;
    diversification: number;
    responsiveness: number;
    overall: number;
  } {
    const totalParticipants = this.participants.size;
    const totalAssets = this.assets.size;
    const activeContracts = [...this.contracts.values()].filter(c => Date.now() < c.expiresAt).length;

    // Redundancy: how many participants can provide similar data
    const redundancy = Math.min(totalParticipants / 5, 1.0);

    // Diversification: variety of data sovereignty levels
    const levels = new Set([...this.assets.values()].map(a => a.sovereigntyLevel));
    const diversification = levels.size / 4;

    // Responsiveness: recent learning rounds
    const recentRounds = this.learningRounds.filter(r => Date.now() - r.timestamp < 3600_000).length;
    const responsiveness = Math.min(recentRounds / 3, 1.0);

    const overall = redundancy * 0.3 + diversification * 0.3 + responsiveness * 0.4;

    return { redundancy, diversification, responsiveness, overall };
  }

  // ─── Getters ───

  getParticipants(): DataSpaceParticipant[] {
    return [...this.participants.values()];
  }

  getAssets(): DataAsset[] {
    return [...this.assets.values()];
  }

  getActiveContracts(): UsageContract[] {
    return [...this.contracts.values()].filter(c => Date.now() < c.expiresAt);
  }

  getRemainingPrivacyBudget(): number {
    return this.privacyBudget;
  }

  getLearningRounds(): FederatedLearningRound[] {
    return this.learningRounds;
  }
}

// ─── Factory ───

export function createNeuralDataSpace(userId: string): FederatedDataSpace {
  const space = new FederatedDataSpace(
    `neural_ds_${userId.slice(0, 8)}`,
    "Neural Knowledge Data Space"
  );

  // Register the user as the primary participant
  space.registerParticipant({
    id: userId,
    name: "Owner",
    role: "both",
    trustLevel: 1.0,
    selfDescription: {
      serviceOffering: "Neural Knowledge Management",
      dataResources: ["neural_knowledge_base", "neural_learning_data"],
      termsAndConditions: "Internal use",
      legalBasis: "Owner consent",
      jurisdiction: "BR",
      complianceLevel: "high",
    },
    registeredAt: Date.now(),
  });

  return space;
}
