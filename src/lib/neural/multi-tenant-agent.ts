/**
 * ─── Multi-Tenant Agentic AI Architecture ───
 * 
 * Implements AWS Prescriptive Guidance: "Building multi-tenant architectures
 * for agentic AI on AWS" (July 2025, Aaron Sempf & Tod Golding).
 *
 * Key concepts integrated:
 *   1. Tenant Context & Identity (JWT-based, propagated across agents)
 *   2. Agent Deployment Models (Silo / Pool / Hybrid)
 *   3. Tenant-Aware Agents (per-tenant memory, knowledge, tools, guardrails)
 *   4. Control Plane (onboarding, provisioning, billing, analytics)
 *   5. Noisy Neighbor Protection (tier-based throttling)
 *   6. Tenant Isolation Policies (resource boundaries)
 *   7. Agent-as-a-Service (AaaS) patterns
 *   8. Agent-to-Agent (A2A) identity propagation
 *
 * Ref: AWS Prescriptive Guidance – Multi-Tenant Agentic AI (2025)
 */

// ═══════════════════════════════════════════════
// 1. TENANT CONTEXT & IDENTITY
// ═══════════════════════════════════════════════

export type TenantTier = "free" | "basic" | "professional" | "enterprise" | "premium";
export type DeploymentModel = "silo" | "pool" | "hybrid";
export type AgentVisibility = "public" | "private";
export type AgentRole = "interaction" | "task" | "orchestrator";

export interface TenantContext {
  tenantId: string;
  userId: string;
  tier: TenantTier;
  deploymentModel: DeploymentModel;
  jwtClaims: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
}

export interface TenantPersona {
  tenantId: string;
  name: string;
  tier: TenantTier;
  
  // Per-tenant scoping (diagram p24: tenant personas shape agent behavior)
  memoryNamespace: string;          // Isolated memory scope
  knowledgeFilter: string[];        // Tags/categories this tenant can access
  toolWhitelist: string[];          // Tools available to this tenant
  toolBlacklist: string[];          // Tools blocked for this tenant
  
  // Guardrails (diagram p24: global + per-tenant guardrails)
  guardrails: TenantGuardrails;
  
  // Consumption profile
  maxRequestsPerMinute: number;
  maxTokensPerRequest: number;
  maxConcurrentAgents: number;
  maxMemoryEntries: number;
  maxKnowledgeQueries: number;
  
  // Business metadata
  onboardedAt: number;
  lastActiveAt: number;
  isActive: boolean;
}

export interface TenantGuardrails {
  // Content guardrails
  allowedTopics: string[];
  blockedTopics: string[];
  maxResponseLength: number;
  requireSourceCitation: boolean;
  
  // Security guardrails
  allowExternalApiCalls: boolean;
  allowCodeExecution: boolean;
  allowFileAccess: boolean;
  requireHumanApproval: boolean;     // human_in_the_loop enforcement
  
  // Data guardrails
  piiHandling: "mask" | "redact" | "allow";
  dataRetentionDays: number;
  allowCrossTenantLearning: boolean; // Whether aggregate learning is permitted
}

// ═══════════════════════════════════════════════
// 2. TENANT ISOLATION POLICIES
// ═══════════════════════════════════════════════

export type IsolationLevel = "strict" | "standard" | "relaxed";

export interface TenantIsolationPolicy {
  tenantId: string;
  level: IsolationLevel;
  
  // Resource isolation (diagram p29: per-tenant knowledge in separate vector DBs)
  memoryIsolation: "dedicated" | "shared_namespaced" | "shared";
  knowledgeIsolation: "dedicated" | "shared_filtered" | "shared";
  toolIsolation: "dedicated" | "shared_scoped" | "shared";
  
  // Compute isolation (diagram p19: silo vs pool deployment)
  computeIsolation: "dedicated" | "shared_throttled" | "shared";
  
  // MCP isolation (diagram p30: MCP client/server with tenant context)
  mcpScopeRestrictions: string[];
  
  // Cross-tenant boundaries
  allowCrossTenantReads: boolean;
  allowCrossTenantWrites: boolean;
}

// ═══════════════════════════════════════════════
// 3. NOISY NEIGHBOR PROTECTION
// ═══════════════════════════════════════════════

export interface ThrottlingPolicy {
  tenantId: string;
  tier: TenantTier;
  
  // Rate limits (diagram p31: throttling at entry point "outer edge")
  requestsPerMinute: number;
  requestsPerHour: number;
  tokensPerMinute: number;
  
  // Deeper throttling (diagram p31: throttle at LLM, memory, tools)
  llmCallsPerMinute: number;
  memoryOpsPerMinute: number;
  toolInvocationsPerMinute: number;
  
  // Current usage tracking
  currentWindow: ThrottleWindow;
}

export interface ThrottleWindow {
  windowStart: number;
  requestCount: number;
  tokenCount: number;
  llmCallCount: number;
  memoryOpCount: number;
  toolInvocationCount: number;
}

// Default throttling by tier (diagram p31: tier-based entitlements)
export const TIER_THROTTLE_DEFAULTS: Record<TenantTier, Omit<ThrottlingPolicy, "tenantId" | "tier" | "currentWindow">> = {
  free:         { requestsPerMinute: 10,  requestsPerHour: 100,  tokensPerMinute: 5000,   llmCallsPerMinute: 5,   memoryOpsPerMinute: 20,  toolInvocationsPerMinute: 10  },
  basic:        { requestsPerMinute: 30,  requestsPerHour: 500,  tokensPerMinute: 20000,  llmCallsPerMinute: 15,  memoryOpsPerMinute: 60,  toolInvocationsPerMinute: 30  },
  professional: { requestsPerMinute: 60,  requestsPerHour: 2000, tokensPerMinute: 50000,  llmCallsPerMinute: 30,  memoryOpsPerMinute: 200, toolInvocationsPerMinute: 100 },
  enterprise:   { requestsPerMinute: 200, requestsPerHour: 8000, tokensPerMinute: 200000, llmCallsPerMinute: 100, memoryOpsPerMinute: 500, toolInvocationsPerMinute: 300 },
  premium:      { requestsPerMinute: 500, requestsPerHour: 20000,tokensPerMinute: 500000, llmCallsPerMinute: 300, memoryOpsPerMinute: 1000,toolInvocationsPerMinute: 500 },
};

// ═══════════════════════════════════════════════
// 4. AGENT-AS-A-SERVICE (AaaS) DESCRIPTOR
// ═══════════════════════════════════════════════

export interface AgentServiceDescriptor {
  agentId: string;
  name: string;
  version: string;
  role: AgentRole;
  visibility: AgentVisibility;
  deploymentModel: DeploymentModel;
  
  // Capabilities
  supportedTiers: TenantTier[];
  capabilities: string[];
  toolsProvided: string[];
  
  // Discovery & marketplace (diagram p10: agent marketplace)
  discoveryTags: string[];
  compatibleAgents: string[];      // Agent IDs this can collaborate with
  
  // Authentication (diagram p9: JWT-based A2A auth)
  authMechanism: "jwt" | "oauth2" | "api_key" | "mcp";
  acceptsExternalTenantContext: boolean;
}

// ═══════════════════════════════════════════════
// 5. CONTROL PLANE
// ═══════════════════════════════════════════════

export interface ControlPlane {
  // Tenant management (diagram p26: control plane structure)
  tenants: Map<string, TenantPersona>;
  isolationPolicies: Map<string, TenantIsolationPolicy>;
  throttlingPolicies: Map<string, ThrottlingPolicy>;
  
  // Agent management
  agents: Map<string, AgentServiceDescriptor>;
  
  // Routing (diagram p20-21: silo/pool proxy routing)
  routingTable: Map<string, AgentRoute>;
  
  // Metering & billing
  usageMetrics: Map<string, TenantUsageMetrics>;
  
  // Analytics
  systemAnalytics: SystemAnalytics;
}

export interface AgentRoute {
  tenantId: string;
  agentId: string;
  deploymentMode: DeploymentModel;
  endpoint: string;               // Where to route this tenant's requests
  priority: number;
  isActive: boolean;
}

export interface TenantUsageMetrics {
  tenantId: string;
  tier: TenantTier;
  
  // Consumption tracking
  totalRequests: number;
  totalTokensConsumed: number;
  totalLlmCalls: number;
  totalToolInvocations: number;
  
  // Cost tracking
  estimatedCostCents: number;
  
  // Quality metrics
  avgResponseTimeMs: number;
  errorRate: number;
  
  // Period
  periodStart: number;
  periodEnd: number;
}

export interface SystemAnalytics {
  totalTenants: number;
  activeTenants: number;
  totalAgents: number;
  totalRequestsToday: number;
  avgLatencyMs: number;
  errorRatePercent: number;
  topTenantsByUsage: { tenantId: string; requests: number }[];
  tierDistribution: Record<TenantTier, number>;
}

// ═══════════════════════════════════════════════
// 6. CONTROL PLANE IMPLEMENTATION
// ═══════════════════════════════════════════════

let _controlPlane: ControlPlane = createInitialControlPlane();

function createInitialControlPlane(): ControlPlane {
  return {
    tenants: new Map(),
    isolationPolicies: new Map(),
    throttlingPolicies: new Map(),
    agents: new Map(),
    routingTable: new Map(),
    usageMetrics: new Map(),
    systemAnalytics: {
      totalTenants: 0,
      activeTenants: 0,
      totalAgents: 0,
      totalRequestsToday: 0,
      avgLatencyMs: 0,
      errorRatePercent: 0,
      topTenantsByUsage: [],
      tierDistribution: { free: 0, basic: 0, professional: 0, enterprise: 0, premium: 0 },
    },
  };
}

// ─── Tenant Onboarding (diagram p27-28) ───

export function onboardTenant(
  tenantId: string,
  name: string,
  tier: TenantTier = "basic",
  deploymentModel: DeploymentModel = "pool",
  customGuardrails?: Partial<TenantGuardrails>
): TenantPersona {
  const defaults = getDefaultGuardrails(tier);
  const guardrails: TenantGuardrails = { ...defaults, ...customGuardrails };
  
  const tierLimits = TIER_THROTTLE_DEFAULTS[tier];
  
  const persona: TenantPersona = {
    tenantId,
    name,
    tier,
    memoryNamespace: `tenant:${tenantId}`,
    knowledgeFilter: [],
    toolWhitelist: [],
    toolBlacklist: [],
    guardrails,
    maxRequestsPerMinute: tierLimits.requestsPerMinute,
    maxTokensPerRequest: tierLimits.tokensPerMinute,
    maxConcurrentAgents: tier === "enterprise" || tier === "premium" ? 10 : tier === "professional" ? 5 : 2,
    maxMemoryEntries: tier === "enterprise" || tier === "premium" ? 10000 : tier === "professional" ? 5000 : 1000,
    maxKnowledgeQueries: tierLimits.llmCallsPerMinute * 2,
    onboardedAt: Date.now(),
    lastActiveAt: Date.now(),
    isActive: true,
  };
  
  _controlPlane.tenants.set(tenantId, persona);
  
  // Create isolation policy
  const isolation = createDefaultIsolationPolicy(tenantId, tier, deploymentModel);
  _controlPlane.isolationPolicies.set(tenantId, isolation);
  
  // Create throttling policy
  const throttling: ThrottlingPolicy = {
    tenantId,
    tier,
    ...tierLimits,
    currentWindow: { windowStart: Date.now(), requestCount: 0, tokenCount: 0, llmCallCount: 0, memoryOpCount: 0, toolInvocationCount: 0 },
  };
  _controlPlane.throttlingPolicies.set(tenantId, throttling);
  
  // Create usage metrics
  _controlPlane.usageMetrics.set(tenantId, {
    tenantId, tier,
    totalRequests: 0, totalTokensConsumed: 0, totalLlmCalls: 0, totalToolInvocations: 0,
    estimatedCostCents: 0, avgResponseTimeMs: 0, errorRate: 0,
    periodStart: Date.now(), periodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  
  // Update analytics
  _controlPlane.systemAnalytics.totalTenants++;
  _controlPlane.systemAnalytics.activeTenants++;
  _controlPlane.systemAnalytics.tierDistribution[tier]++;
  
  console.log(`[CONTROL_PLANE] Tenant "${name}" (${tenantId}) onboarded — tier: ${tier}, deployment: ${deploymentModel}`);
  return persona;
}

export function offboardTenant(tenantId: string): boolean {
  const persona = _controlPlane.tenants.get(tenantId);
  if (!persona) return false;
  
  persona.isActive = false;
  _controlPlane.systemAnalytics.activeTenants--;
  
  console.log(`[CONTROL_PLANE] Tenant ${tenantId} offboarded`);
  return true;
}

// ─── Default Guardrails by Tier ───

function getDefaultGuardrails(tier: TenantTier): TenantGuardrails {
  return {
    allowedTopics: [],
    blockedTopics: [],
    maxResponseLength: tier === "free" ? 2000 : tier === "basic" ? 5000 : 15000,
    requireSourceCitation: tier !== "free",
    allowExternalApiCalls: tier !== "free",
    allowCodeExecution: tier === "enterprise" || tier === "premium",
    allowFileAccess: tier !== "free",
    requireHumanApproval: tier === "free",
    piiHandling: tier === "enterprise" || tier === "premium" ? "allow" : "mask",
    dataRetentionDays: tier === "free" ? 7 : tier === "basic" ? 30 : tier === "professional" ? 90 : 365,
    allowCrossTenantLearning: tier === "free" || tier === "basic",
  };
}

function createDefaultIsolationPolicy(
  tenantId: string, tier: TenantTier, deployment: DeploymentModel
): TenantIsolationPolicy {
  const isSilo = deployment === "silo";
  const isEnterprise = tier === "enterprise" || tier === "premium";
  
  return {
    tenantId,
    level: isSilo || isEnterprise ? "strict" : tier === "professional" ? "standard" : "relaxed",
    memoryIsolation: isSilo ? "dedicated" : "shared_namespaced",
    knowledgeIsolation: isSilo ? "dedicated" : "shared_filtered",
    toolIsolation: isSilo ? "dedicated" : "shared_scoped",
    computeIsolation: isSilo ? "dedicated" : "shared_throttled",
    mcpScopeRestrictions: [],
    allowCrossTenantReads: !isSilo && !isEnterprise,
    allowCrossTenantWrites: false,
  };
}

// ─── Noisy Neighbor: Throttle Check ───

export function checkThrottle(tenantId: string, resource: "request" | "llm" | "memory" | "tool"): { allowed: boolean; reason?: string } {
  const policy = _controlPlane.throttlingPolicies.get(tenantId);
  if (!policy) return { allowed: true };
  
  const now = Date.now();
  const win = policy.currentWindow;
  
  // Reset window if expired (1-minute rolling window)
  if (now - win.windowStart > 60_000) {
    win.windowStart = now;
    win.requestCount = 0;
    win.tokenCount = 0;
    win.llmCallCount = 0;
    win.memoryOpCount = 0;
    win.toolInvocationCount = 0;
  }
  
  switch (resource) {
    case "request":
      if (win.requestCount >= policy.requestsPerMinute) {
        return { allowed: false, reason: `Rate limit exceeded: ${policy.requestsPerMinute} req/min (tier: ${policy.tier})` };
      }
      win.requestCount++;
      break;
    case "llm":
      if (win.llmCallCount >= policy.llmCallsPerMinute) {
        return { allowed: false, reason: `LLM call limit exceeded: ${policy.llmCallsPerMinute}/min (tier: ${policy.tier})` };
      }
      win.llmCallCount++;
      break;
    case "memory":
      if (win.memoryOpCount >= policy.memoryOpsPerMinute) {
        return { allowed: false, reason: `Memory op limit exceeded: ${policy.memoryOpsPerMinute}/min (tier: ${policy.tier})` };
      }
      win.memoryOpCount++;
      break;
    case "tool":
      if (win.toolInvocationCount >= policy.toolInvocationsPerMinute) {
        return { allowed: false, reason: `Tool invocation limit exceeded: ${policy.toolInvocationsPerMinute}/min (tier: ${policy.tier})` };
      }
      win.toolInvocationCount++;
      break;
  }
  
  return { allowed: true };
}

// ─── Tenant Isolation: Scope Check ───

export function checkIsolation(
  tenantId: string,
  targetResource: string,
  operation: "read" | "write"
): { allowed: boolean; reason?: string } {
  const policy = _controlPlane.isolationPolicies.get(tenantId);
  if (!policy) return { allowed: true };
  
  // Check if resource belongs to another tenant
  const resourceTenant = extractTenantFromResource(targetResource);
  if (resourceTenant && resourceTenant !== tenantId) {
    if (operation === "write" && !policy.allowCrossTenantWrites) {
      return { allowed: false, reason: `Cross-tenant write denied: ${tenantId} → ${resourceTenant}` };
    }
    if (operation === "read" && !policy.allowCrossTenantReads) {
      return { allowed: false, reason: `Cross-tenant read denied: ${tenantId} → ${resourceTenant}` };
    }
  }
  
  // Check MCP scope
  if (policy.mcpScopeRestrictions.length > 0) {
    const isRestricted = policy.mcpScopeRestrictions.some(scope => targetResource.startsWith(scope));
    if (isRestricted) {
      return { allowed: false, reason: `Resource in restricted MCP scope: ${targetResource}` };
    }
  }
  
  return { allowed: true };
}

function extractTenantFromResource(resource: string): string | null {
  // Resources are namespaced as "tenant:<id>:<resource_path>"
  const match = resource.match(/^tenant:([^:]+):/);
  return match ? match[1] : null;
}

// ─── Routing (diagram p20-21: proxy-based silo/pool routing) ───

export function routeAgentRequest(tenantId: string, agentId: string): AgentRoute | null {
  const routeKey = `${tenantId}:${agentId}`;
  const directRoute = _controlPlane.routingTable.get(routeKey);
  if (directRoute?.isActive) return directRoute;
  
  // Fallback: find any active route for this agent
  const poolRoute = _controlPlane.routingTable.get(`pool:${agentId}`);
  if (poolRoute?.isActive) return poolRoute;
  
  return null;
}

export function registerAgentRoute(route: AgentRoute): void {
  const key = route.deploymentMode === "silo" 
    ? `${route.tenantId}:${route.agentId}` 
    : `pool:${route.agentId}`;
  _controlPlane.routingTable.set(key, route);
}

// ─── Agent Registration (marketplace) ───

export function registerAgent(descriptor: AgentServiceDescriptor): void {
  _controlPlane.agents.set(descriptor.agentId, descriptor);
  _controlPlane.systemAnalytics.totalAgents++;
}

// ─── Metering ───

export function recordUsage(
  tenantId: string,
  metrics: { requests?: number; tokens?: number; llmCalls?: number; toolInvocations?: number; responseMs?: number; isError?: boolean }
): void {
  const usage = _controlPlane.usageMetrics.get(tenantId);
  if (!usage) return;
  
  usage.totalRequests += metrics.requests || 0;
  usage.totalTokensConsumed += metrics.tokens || 0;
  usage.totalLlmCalls += metrics.llmCalls || 0;
  usage.totalToolInvocations += metrics.toolInvocations || 0;
  
  if (metrics.responseMs) {
    usage.avgResponseTimeMs = (usage.avgResponseTimeMs * (usage.totalRequests - 1) + metrics.responseMs) / usage.totalRequests;
  }
  if (metrics.isError) {
    usage.errorRate = (usage.errorRate * (usage.totalRequests - 1) + 1) / usage.totalRequests;
  }
  
  // Estimate cost (simplified)
  const tokenCost = (metrics.tokens || 0) * 0.002; // $0.002 per 1K tokens
  usage.estimatedCostCents += Math.round(tokenCost);
  
  // Update tenant last active
  const persona = _controlPlane.tenants.get(tenantId);
  if (persona) persona.lastActiveAt = Date.now();
}

// ─── Tenant Context Factory ───

export function createTenantContext(
  tenantId: string,
  userId: string,
  additionalClaims?: Record<string, unknown>
): TenantContext | null {
  const persona = _controlPlane.tenants.get(tenantId);
  if (!persona || !persona.isActive) return null;
  
  return {
    tenantId,
    userId,
    tier: persona.tier,
    deploymentModel: _controlPlane.isolationPolicies.get(tenantId)?.computeIsolation === "dedicated" ? "silo" : "pool",
    jwtClaims: {
      sub: userId,
      tenant_id: tenantId,
      tier: persona.tier,
      iss: "orion-aaas",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...additionalClaims,
    },
    metadata: { onboardedAt: persona.onboardedAt },
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
  };
}

// ─── Public API ───

export function getTenantPersona(tenantId: string): TenantPersona | null {
  return _controlPlane.tenants.get(tenantId) || null;
}

export function getControlPlaneAnalytics(): SystemAnalytics {
  // Recompute top tenants
  const sorted = Array.from(_controlPlane.usageMetrics.entries())
    .sort((a, b) => b[1].totalRequests - a[1].totalRequests)
    .slice(0, 10)
    .map(([id, m]) => ({ tenantId: id, requests: m.totalRequests }));
  _controlPlane.systemAnalytics.topTenantsByUsage = sorted;
  return { ..._controlPlane.systemAnalytics };
}

export function getTenantUsage(tenantId: string): TenantUsageMetrics | null {
  return _controlPlane.usageMetrics.get(tenantId) || null;
}

export function listTenants(): TenantPersona[] {
  return Array.from(_controlPlane.tenants.values());
}

export function listAgents(): AgentServiceDescriptor[] {
  return Array.from(_controlPlane.agents.values());
}

export function updateTenantTier(tenantId: string, newTier: TenantTier): boolean {
  const persona = _controlPlane.tenants.get(tenantId);
  if (!persona) return false;
  
  const oldTier = persona.tier;
  persona.tier = newTier;
  persona.guardrails = { ...persona.guardrails, ...getDefaultGuardrails(newTier) };
  
  // Update throttling
  const newLimits = TIER_THROTTLE_DEFAULTS[newTier];
  const throttle = _controlPlane.throttlingPolicies.get(tenantId);
  if (throttle) {
    Object.assign(throttle, newLimits);
    throttle.tier = newTier;
  }
  
  // Update analytics
  _controlPlane.systemAnalytics.tierDistribution[oldTier]--;
  _controlPlane.systemAnalytics.tierDistribution[newTier]++;
  
  persona.maxRequestsPerMinute = newLimits.requestsPerMinute;
  persona.maxTokensPerRequest = newLimits.tokensPerMinute;
  
  console.log(`[CONTROL_PLANE] Tenant ${tenantId} tier changed: ${oldTier} → ${newTier}`);
  return true;
}

export function resetControlPlane(): void {
  _controlPlane = createInitialControlPlane();
}

/**
 * Generate a context string for LLM injection with multi-tenant awareness.
 * Appends tenant scoping, guardrails, and throttling status.
 */
export function formatTenantContextForLLM(tenantId: string): string {
  const persona = _controlPlane.tenants.get(tenantId);
  if (!persona) return "[TENANT] Unknown tenant — applying default restrictions";
  
  const isolation = _controlPlane.isolationPolicies.get(tenantId);
  const throttle = _controlPlane.throttlingPolicies.get(tenantId);
  
  const parts: string[] = [];
  parts.push(`[TENANT] ${persona.name} (${tenantId}) | Tier: ${persona.tier} | Active: ${persona.isActive}`);
  
  if (persona.guardrails.blockedTopics.length > 0) {
    parts.push(`[GUARDRAILS] Blocked topics: ${persona.guardrails.blockedTopics.join(", ")}`);
  }
  parts.push(`[GUARDRAILS] PII: ${persona.guardrails.piiHandling} | Code exec: ${persona.guardrails.allowCodeExecution} | External APIs: ${persona.guardrails.allowExternalApiCalls}`);
  
  if (isolation) {
    parts.push(`[ISOLATION] Level: ${isolation.level} | Memory: ${isolation.memoryIsolation} | Knowledge: ${isolation.knowledgeIsolation}`);
  }
  
  if (throttle) {
    const w = throttle.currentWindow;
    parts.push(`[THROTTLE] Requests: ${w.requestCount}/${throttle.requestsPerMinute}/min | LLM: ${w.llmCallCount}/${throttle.llmCallsPerMinute}/min`);
  }
  
  return parts.join("\n");
}
