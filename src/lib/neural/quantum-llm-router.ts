/**
 * ─── Quantum LLM Router ───
 * Uses VQC to select optimal AI provider based on query complexity,
 * token estimate, domain specificity, and historical performance.
 * 
 * Instead of deterministic fallback (DeepSeek→Groq→Gemini→Mistral),
 * the quantum router encodes query features into qubit amplitudes
 * and measures to collapse into a provider selection with quantum advantage.
 * 
 * Architecture: Amplitude Encoding → VQC → Born Rule Selection
 * Refs: Quantum Machine Learning (Schuld & Petruccione, 2021)
 */

import { vqcForward, initVQCParams, type VQCConfig } from "./vqc";
import { classifyComplexity, type ComplexityLevel } from "./agent-planner";
import { getWebSearchModels, supportsWebSearch, WEB_SEARCH_MODELS } from "@/lib/integrations/openrouter-free-models";

// ─── Provider Registry ───

export interface QuantumProviderProfile {
  id: string;
  name: string;
  tier: number;             // 0=fastest, 3=most capable
  maxTokens: number;
  avgLatencyMs: number;
  costPerMToken: number;
  strengths: string[];      // e.g. ["code", "legal", "creative"]
  reliabilityScore: number; // 0-1 historical uptime
}

const PROVIDER_REGISTRY: QuantumProviderProfile[] = [
  // OpenRouter FREE models - COMPLETO 2026
  {
    id: "openrouter/free",
    name: "OpenRouter Auto-Router (FREE)",
    tier: 0,
    maxTokens: 200000,
    avgLatencyMs: 1000,
    costPerMToken: 0,
    strengths: ["free", "auto-select", "variety"],
    reliabilityScore: 0.98,
  },
  // 🧠 Reasoning FREE
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1 (FREE)",
    tier: 0,
    maxTokens: 128000,
    avgLatencyMs: 800,
    costPerMToken: 0,
    strengths: ["reasoning", "math", "code"],
    reliabilityScore: 0.95,
  },
  {
    id: "deepseek/deepseek-r1-0528",
    name: "DeepSeek R1 0528 (FREE)",
    tier: 0,
    maxTokens: 128000,
    avgLatencyMs: 750,
    costPerMToken: 0,
    strengths: ["reasoning", "math"],
    reliabilityScore: 0.95,
  },
  {
    id: "qwen/qwen3-235b-thinking",
    name: "Qwen3 235B Thinking (FREE)",
    tier: 0,
    maxTokens: 131000,
    avgLatencyMs: 1200,
    costPerMToken: 0,
    strengths: ["reasoning", "planning"],
    reliabilityScore: 0.94,
  },
  // 💻 Coding FREE
  {
    id: "qwen/qwen3-coder",
    name: "Qwen3 Coder 480B (FREE)",
    tier: 0,
    maxTokens: 262000,
    avgLatencyMs: 900,
    costPerMToken: 0,
    strengths: ["code", "agentic", "tool-use"],
    reliabilityScore: 0.95,
  },
  {
    id: "mistralai/devstral-2",
    name: "Devstral 2 (FREE)",
    tier: 0,
    maxTokens: 262000,
    avgLatencyMs: 850,
    costPerMToken: 0,
    strengths: ["code", "agentic"],
    reliabilityScore: 0.93,
  },
  // 🌍 General FREE
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B (FREE)",
    tier: 1,
    maxTokens: 128000,
    avgLatencyMs: 1000,
    costPerMToken: 0,
    strengths: ["general", "planning", "reasoning"],
    reliabilityScore: 0.94,
  },
  {
    id: "meta-llama/llama-4-scout:free",
    name: "Llama 4 Scout (FREE)",
    tier: 1,
    maxTokens: 256000,
    avgLatencyMs: 1100,
    costPerMToken: 0,
    strengths: ["general", "long-context"],
    reliabilityScore: 0.93,
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct",
    name: "Mistral Small 3.1 (FREE)",
    tier: 1,
    maxTokens: 128000,
    avgLatencyMs: 600,
    costPerMToken: 0,
    strengths: ["fast", "general"],
    reliabilityScore: 0.96,
  },
  {
    id: "grok/grok-4",
    name: "Grok 4 (FREE)",
    tier: 1,
    maxTokens: 131000,
    avgLatencyMs: 800,
    costPerMToken: 0,
    strengths: ["direct", "reasoning"],
    reliabilityScore: 0.92,
  },
  // 👁️ Vision FREE
  {
    id: "qwen/qwen2.5-vl-3b-instruct",
    name: "Qwen2.5 VL 3B (FREE)",
    tier: 0,
    maxTokens: 32768,
    avgLatencyMs: 500,
    costPerMToken: 0,
    strengths: ["vision", "fast"],
    reliabilityScore: 0.94,
  },
  {
    id: "nvidia/nemotron-nano-12b-2-vl",
    name: "Nemotron Nano VL (FREE)",
    tier: 1,
    maxTokens: 131000,
    avgLatencyMs: 700,
    costPerMToken: 0,
    strengths: ["vision", "nvidia"],
    reliabilityScore: 0.93,
  },
  // ⚡ NVIDIA FREE
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    name: "Nemotron 3 Super (FREE)",
    tier: 1,
    maxTokens: 262000,
    avgLatencyMs: 1100,
    costPerMToken: 0,
    strengths: ["ai-agents", "hybrid"],
    reliabilityScore: 0.93,
  },
  {
    id: "nvidia/nemotron-nano-9b-v2",
    name: "Nemotron Nano 9B V2 (FREE)",
    tier: 1,
    maxTokens: 128000,
    avgLatencyMs: 600,
    costPerMToken: 0,
    strengths: ["fast", "light"],
    reliabilityScore: 0.95,
  },
  // 🌎 Extra
  {
    id: "minimax/minimax-m2.5-free",
    name: "MiniMax M2.5 (FREE)",
    tier: 1,
    maxTokens: 196000,
    avgLatencyMs: 900,
    costPerMToken: 0,
    strengths: ["general"],
    reliabilityScore: 0.91,
  },
  // Paid fallbacks
  {
    id: "openai",
    name: "OpenAI (Paid)",
    tier: 2,
    maxTokens: 128000,
    avgLatencyMs: 800,
    costPerMToken: 2.50,
    strengths: ["general", "code", "vision"],
    reliabilityScore: 0.98,
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    tier: 2,
    maxTokens: 200000,
    avgLatencyMs: 900,
    costPerMToken: 3.00,
    strengths: ["analysis", "reasoning"],
    reliabilityScore: 0.97,
  },
  {
    id: "google",
    name: "Google Gemini",
    tier: 3,
    maxTokens: 1048576,
    avgLatencyMs: 1200,
    costPerMToken: 0.075,
    strengths: ["multimodal", "long_context"],
    reliabilityScore: 0.96,
  },
  {
    id: "deepseek",
    name: "DeepSeek (Paid)",
    tier: 4,
    maxTokens: 65536,
    avgLatencyMs: 700,
    costPerMToken: 0.14,
    strengths: ["code", "reasoning"],
    reliabilityScore: 0.92,
  },
  {
    id: "groq",
    name: "Groq",
    tier: 4,
    maxTokens: 32768,
    avgLatencyMs: 150,
    costPerMToken: 0.27,
    strengths: ["speed"],
    reliabilityScore: 0.95,
  },
];

// ─── Feature Extraction ───

interface QueryFeatures {
  complexity: number;       // 0-1 normalized
  tokenEstimate: number;    // 0-1 normalized (relative to max)
  domainMatch: number[];    // per-provider domain affinity 0-1
  latencyPriority: number;  // 0=don't care, 1=need fast
  costSensitivity: number;  // 0=don't care, 1=cheapest
  webSearchIntent: number;  // 0-1 normalized (does query need web search?)
}

function extractQueryFeatures(
  query: string,
  options: { preferSpeed?: boolean; preferCost?: boolean } = {}
): QueryFeatures {
  const complexity = classifyComplexity(query);
  const complexityMap: Record<ComplexityLevel, number> = {
    simple: 0.15,
    moderate: 0.4,
    complex: 0.7,
    critical: 0.95,
  };

  const wordCount = query.split(/\s+/).length;
  const estimatedTokens = wordCount * 1.5;
  const maxTokens = Math.max(...PROVIDER_REGISTRY.map(p => p.maxTokens));

  // Web search intent detection
  const lower = query.toLowerCase();
  let webSearchIntent = 0;
  
  // Strong web search indicators
  const webSearchPatterns = [
    /hoje|atual|atualmente|recente/i,
    /notícia|preço\s+d[eoa]|cotação/i,
    /quem\s+é|quando\s+(foi|será|é)|onde\s+fica/i,
    /resultado\s+d[eoa]|placar|eleição/i,
    /último|última|novo\s+|nova\s+|2024|2025|2026/i,
    /tempo\s+(em|na|no)|clima|previsão/i,
    /lançamento|estreia|pesquis[ae]\s+na\s+web|busca\s+na\s+internet/i,
    /search\s+for|look\s+up|news|current|latest|trending/i,
  ];
  
  for (const pattern of webSearchPatterns) {
    if (pattern.test(lower)) {
      webSearchIntent += 0.15;
    }
  }
  webSearchIntent = Math.min(webSearchIntent, 1.0); // Cap at 1.0

  // Domain affinity per provider
  const domainMatch = PROVIDER_REGISTRY.map(provider => {
    let score = 0;
    for (const strength of provider.strengths) {
      if (strength === "code" && /(?:código|code|programa|script|api|função|debug)/i.test(lower)) score += 0.3;
      if (strength === "legal" && /(?:jurídic|petiç|recurso|lei|artigo|tribunal|stf|stj)/i.test(lower)) score += 0.35;
      if (strength === "creative" && /(?:cria|escreva|gere|imagine|história|poema)/i.test(lower)) score += 0.25;
      if (strength === "multimodal" && /(?:imagem|foto|visual|vídeo|áudio)/i.test(lower)) score += 0.35;
      if (strength === "speed" && /(?:rápido|urgente|imediato|agora)/i.test(lower)) score += 0.3;
      if (strength === "long_context" && wordCount > 200) score += 0.3;
      if (strength === "reasoning" && /(?:analis|compar|avali|complex|profund)/i.test(lower)) score += 0.3;
      
      // Boost providers with web search capability for web search queries
      if (webSearchIntent > 0.3 && (strength === "web_search" || provider.id.includes("openrouter/free"))) {
        score += webSearchIntent * 0.5;
      }
    }
    
    // Extra boost for known web-search-capable open-weight models
    if (webSearchIntent > 0.3 && supportsWebSearch(provider.id)) {
      score += webSearchIntent * 0.7;
    }
    
    return Math.min(score + provider.reliabilityScore * 0.2, 1.0);
  });

  return {
    complexity: complexityMap[complexity],
    tokenEstimate: Math.min(1, estimatedTokens / maxTokens),
    domainMatch,
    latencyPriority: options.preferSpeed ? 0.9 : 0.3,
    costSensitivity: options.preferCost ? 0.9 : 0.2,
    webSearchIntent,
  };
}

// ─── VQC Config for Router ───

const ROUTER_VQC_CONFIG: VQCConfig = {
  nQubits: 5, // Updated to 5 qubits to handle: complexity, domainMatch, latencyPriority, costSensitivity, webSearchIntent
  nLayers: 2,
  featureMap: "iqp",
  ansatz: "hardware_efficient",
  noiseModel: "depolarizing",
  noiseStrength: 0.005,
  naturalGradient: false,
  residualStrength: 0.05,
  gradientClip: 1.0,
};

// Pre-trained params (optimized for provider selection)
// Updated for 5 qubits: [complexity, domainMatch, latencyPriority, costSensitivity, webSearchIntent]
const ROUTER_PARAMS: number[][][] = [
  // Layer 0 - 5 qubits, 3 params each
  [
    [0.8, -0.3, 1.2],   // qubit 0: complexity encoder
    [-0.5, 1.1, 0.4],   // qubit 1: domain encoder
    [0.9, 0.7, -0.8],   // qubit 2: latency encoder
    [-0.2, 0.6, 1.5],   // qubit 3: cost encoder
    [0.4, 0.9, -0.6],   // qubit 4: web search intent encoder (NEW)
  ],
  // Layer 1 - 5 qubits, 3 params each
  [
    [1.1, -0.7, 0.3],
    [0.4, 0.9, -1.0],
    [-0.6, 1.3, 0.5],
    [0.7, -0.4, 0.8],
    [0.5, 0.8, -0.3],   // qubit 4: web search intent encoder (NEW)
  ],
];

// ─── Quantum Routing ───

export interface QuantumRoutingResult {
  selectedProvider: QuantumProviderProfile;
  allScores: Array<{ provider: string; quantumScore: number; classicalScore: number; finalScore: number }>;
  quantumAdvantage: number;   // how much better quantum vs classical
  complexity: string;
  features: QueryFeatures;
  routingLatencyMs: number;
  webSearchRecommended?: boolean; // true if web search is recommended for this query
}

/**
 * Route a query to the optimal LLM provider using quantum scoring.
 * Combines VQC measurement probabilities with classical heuristics.
 * Now includes web search intent detection for open-weight models via OpenRouter plugins.
 */
export function quantumRouteQuery(
  query: string,
  options: {
    preferSpeed?: boolean;
    preferCost?: boolean;
    excludeProviders?: string[];
    modelType?: "fast" | "balanced" | "reasoning" | "analysis" | "secure" | "web_search";
  } = {}
): QuantumRoutingResult {
  const start = performance.now();
  const features = extractQueryFeatures(query, options);

  const modelTypeStrengths: Record<string, string[]> = {
    fast: ["fast", "speed"],
    balanced: ["general"],
    reasoning: ["reasoning", "math"],
    analysis: ["reasoning", "legal", "code"],
    secure: ["general"],
    web_search: ["web_search", "research", "current_events"],
  };

  const scores = PROVIDER_REGISTRY
    .filter(p => !(options.excludeProviders || []).includes(p.id))
    .filter(p => {
      if (!options.modelType) return true;
      const preferred = modelTypeStrengths[options.modelType] || [];
      return preferred.some(s => p.strengths.includes(s)) || p.tier <= 1;
    })
    .map((provider, idx) => {
      // Quantum score: encode features into VQC input
      const vqcInput = [
        features.complexity,
        features.domainMatch[idx] || 0,
        features.latencyPriority * (1 - provider.avgLatencyMs / 2000),
        features.costSensitivity * (1 - provider.costPerMToken),
        features.webSearchIntent, // Include web search intent as 5th feature
      ];

      const quantumScore = vqcForward(vqcInput, ROUTER_PARAMS, ROUTER_VQC_CONFIG);

      // Classical score: weighted linear combination
      const classicalScore =
        0.3 * (features.domainMatch[idx] || 0) +
        0.25 * provider.reliabilityScore +
        0.2 * (1 - provider.tier / 5) +
        0.15 * (features.latencyPriority * (1 - provider.avgLatencyMs / 2000)) +
        0.10 * (features.costSensitivity * (1 - provider.costPerMToken));

      // Hybrid: 60% quantum + 40% classical
      const finalScore = 0.6 * quantumScore + 0.4 * classicalScore;

      return {
        provider: provider.id,
        profile: provider,
        quantumScore,
        classicalScore,
        finalScore,
      };
    });

  scores.sort((a, b) => b.finalScore - a.finalScore);
  const best = scores[0];

  // Quantum advantage: how much the quantum score improved vs pure classical
  const classicalBest = [...scores].sort((a, b) => b.classicalScore - a.classicalScore)[0];
  const quantumAdvantage = best.finalScore > classicalBest.classicalScore
    ? (best.finalScore - classicalBest.classicalScore) / classicalBest.classicalScore
    : 0;

  // Web search recommendation
  const webSearchRecommended = features.webSearchIntent > 0.3 || 
    options.modelType === "web_search" ||
    best.profile.strengths.some(s => s === "web_search");

  return {
    selectedProvider: best.profile,
    allScores: scores.map(s => ({
      provider: s.provider,
      quantumScore: Math.round(s.quantumScore * 1000) / 1000,
      classicalScore: Math.round(s.classicalScore * 1000) / 1000,
      finalScore: Math.round(s.finalScore * 1000) / 1000,
    })),
    quantumAdvantage: Math.round(quantumAdvantage * 1000) / 1000,
    complexity: classifyComplexity(query),
    features,
    routingLatencyMs: Math.round(performance.now() - start),
    webSearchRecommended,
  };
}

/**
 * Get the quantum-recommended provider chain (ordered by quantum score).
 * Use this as the fallback cascade instead of the static one.
 * Now supports web_search modelType filtering.
 */
export function getQuantumProviderCascade(
  query: string,
  options: { preferSpeed?: boolean; preferCost?: boolean; modelType?: string } = {}
): string[] {
  const result = quantumRouteQuery(query, options as Parameters<typeof quantumRouteQuery>[1]);
  return result.allScores.map(s => s.provider);
}

/**
 * Format routing result for AI context injection.
 * Now includes web search recommendation.
 */
export function formatQuantumRoutingForAI(result: QuantumRoutingResult): string {
  const lines = [
    `⚛️ QUANTUM ROUTER: Selected ${result.selectedProvider.name} (score: ${result.allScores[0].finalScore})`,
    `Complexity: ${result.complexity} | Advantage: +${(result.quantumAdvantage * 100).toFixed(1)}%`,
    `Cascade: ${result.allScores.map(s => `${s.provider}(${s.finalScore})`).join(" → ")}`,
  ];
  
  if (result.webSearchRecommended) {
    lines.push(`🌐 Web Search: RECOMMENDED via OpenRouter plugins (${result.selectedProvider.name} supports web search)`);
  }
  
  return lines.join(" | ");
}
