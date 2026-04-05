/**
 * ─── Slim Model Router (SLM) v2 ───
 * Intelligent router that classifies query complexity and decides
 * which processing tier to use: deep, full, slim, edge, or cached.
 * 
 * v2 Upgrades:
 * - New "deep" tier for chain-of-thought and multi-step reasoning (32K tokens)
 * - Expanded legal lexicon with 45+ complex terms
 * - Non-saturating complexity scoring up to 1.5
 * - Cross-domain and comparative law detection
 */

export type ModelTier = "deep" | "full" | "slim" | "edge" | "cached";

export interface TierConfig {
  tier: ModelTier;
  maxTokens: number;
  latencyBudgetMs: number;
  costMultiplier: number;
  capabilities: string[];
}

export interface ComplexityAnalysis {
  score: number;            // 0-1.5 (0=trivial, >0.85=deep reasoning)
  tier: ModelTier;
  reasoning: string[];
  features: {
    tokenCount: number;
    hasLegalTerms: boolean;
    hasMultipleClauses: boolean;
    requiresReasoning: boolean;
    requiresCreativity: boolean;
    isFactual: boolean;
    hasCodeOrMath: boolean;
    languageComplexity: number;
    requiresChainOfThought: boolean;
    isCrossDomain: boolean;
    isComparativeLaw: boolean;
  };
}

export interface RoutingDecision {
  tier: ModelTier;
  tierConfig: TierConfig;
  complexity: ComplexityAnalysis;
  cacheAvailable: boolean;
  estimatedLatencyMs: number;
  estimatedCost: number;
}

export interface SlimTokenization {
  tokens: string[];
  compactTokens: string[];
  compressionRatio: number;
  keyTerms: string[];
}

const TIER_CONFIGS: Record<ModelTier, TierConfig> = {
  cached: {
    tier: "cached",
    maxTokens: 0,
    latencyBudgetMs: 5,
    costMultiplier: 0,
    capabilities: ["exact_match", "fuzzy_match"],
  },
  edge: {
    tier: "edge",
    maxTokens: 256,
    latencyBudgetMs: 50,
    costMultiplier: 0.1,
    capabilities: ["classification", "extraction", "simple_qa"],
  },
  slim: {
    tier: "slim",
    maxTokens: 1024,
    latencyBudgetMs: 200,
    costMultiplier: 0.35,
    capabilities: ["summarization", "translation", "moderate_reasoning", "document_analysis"],
  },
  full: {
    tier: "full",
    maxTokens: 8192,
    latencyBudgetMs: 2000,
    costMultiplier: 1.0,
    capabilities: ["complex_reasoning", "creative_writing", "legal_analysis", "multi_step", "code_generation"],
  },
  deep: {
    tier: "deep",
    maxTokens: 32768,
    latencyBudgetMs: 5000,
    costMultiplier: 2.0,
    capabilities: [
      "deep_reasoning", "multi_step_analysis", "chain_of_thought",
      "legal_synthesis", "cross_domain", "comparative_law",
      "constitutional_hermeneutics", "complex_thesis_construction",
      "multi_norm_conflict_resolution",
    ],
  },
};

// Legal domain complexity indicators (expanded v2 lexicon — 45+ terms)
const COMPLEX_LEGAL_TERMS = [
  // Original terms
  "jurisprudência", "hermenêutica", "antinomia", "derrogação", "ab-rogação",
  "ultra petita", "extra petita", "citra petita", "venire contra factum proprium",
  "suppressio", "surrectio", "tu quoque", "nemo auditur", "exceptio non adimpleti",
  "rebus sic stantibus", "pacta sunt servanda", "lex posterior", "lex specialis",
  "erga omnes", "inter partes", "stare decisis", "obiter dictum", "ratio decidendi",
  "distinguishing", "overruling", "modulação de efeitos", "repercussão geral",
  "incidente de resolução", "IRDR", "IAC", "amicus curiae",
  // v2: Deep reasoning indicators
  "ponderação de princípios", "proporcionalidade", "razoabilidade",
  "bloco de constitucionalidade", "diálogo das fontes", "eficácia horizontal",
  "mutação constitucional", "derrotabilidade", "ônus argumentativo",
  "reserva do possível", "mínimo existencial", "vedação ao retrocesso",
  "filtragem constitucional", "constitucionalização do direito civil",
  "controle difuso", "controle concentrado", "efeito backlash",
  "ativismo judicial", "judicialização da política", "litígio estrutural",
  "state action doctrine", "drittwirkung", "neoconstitucionalismo",
];

// Cross-domain indicators
const CROSS_DOMAIN_PATTERNS = [
  /(?:interface|intersecção|diálogo).*(?:entre|das?\s+áreas)/i,
  /(?:civil|penal|trabalhist|tributári|constitucional).*(?:e|com|versus).*(?:civil|penal|trabalhist|tributári|constitucional)/i,
  /(?:reflexos?|implicaç|repercuss).*(?:em\s+outr|nas?\s+demais|transversal)/i,
];

// Comparative law indicators
const COMPARATIVE_LAW_PATTERNS = [
  /(?:direito\s+comparado|legislação\s+estrangeira|modelo\s+europeu|sistema\s+anglo)/i,
  /(?:common\s+law|civil\s+law|romano[- ]germânic)/i,
  /(?:tribunal\s+europeu|corte\s+interamericana|TEDH|CIDH)/i,
  /(?:ordenamento|sistema\s+jurídico).*(?:alemão|francês|italiano|americano|português)/i,
];

// Chain-of-thought indicators
const CHAIN_OF_THOUGHT_PATTERNS = [
  /(?:passo\s+a\s+passo|etapa\s+por\s+etapa|raciocínio\s+detalhado)/i,
  /(?:demonstr|comprova|fundament).*(?:cada|todos|todas).*(?:requisito|elemento|pressuposto)/i,
  /(?:silogismo|premissa|conclusão\s+lógica)/i,
  /(?:encadeamento|sequência|cadeia).*(?:argumentativ|lógic|causal)/i,
];

const SIMPLE_PATTERNS = [
  /^o que [eé]/i, /^qual [eéo]/i, /^quando/i, /^onde/i, /^quem/i,
  /^defin[aie]/i, /^resuma/i, /^traduza/i, /^liste/i, /^calcule/i,
];

const COMPLEX_PATTERNS = [
  /compar[ae].*(?:com|entre|versus)/i,
  /analis[ae].*(?:juridic|legal|constitucional)/i,
  /(?:elabor|redigi|cri)[ae].*(?:petição|contrato|parecer|recurso)/i,
  /(?:fundament|argument)[ae]/i,
  /(?:tese|estratégia|planejamento)/i,
  /(?:conflito|antinomia|colisão).*(?:norma|princípio|direito)/i,
];

/**
 * Tokenize text with compact optimization for slim models.
 */
export function slimTokenize(text: string): SlimTokenization {
  const fullTokens = text.split(/\s+/).filter(Boolean);
  
  const stopWords = new Set([
    "o", "a", "os", "as", "de", "do", "da", "dos", "das", "em", "no", "na",
    "nos", "nas", "por", "para", "com", "sem", "sob", "sobre", "que", "e",
    "ou", "mas", "se", "um", "uma", "uns", "umas", "ao", "aos", "à", "às",
  ]);

  const compactTokens = fullTokens.filter((t) => !stopWords.has(t.toLowerCase()));
  
  const keyTerms = compactTokens.filter((t) => {
    const lower = t.toLowerCase();
    return t.length > 4 || COMPLEX_LEGAL_TERMS.some((term) => lower.includes(term));
  });

  return {
    tokens: fullTokens,
    compactTokens,
    compressionRatio: fullTokens.length > 0 ? compactTokens.length / fullTokens.length : 1,
    keyTerms: [...new Set(keyTerms)].slice(0, 20),
  };
}

/**
 * Analyze query complexity and determine processing tier.
 */
export function classifyQueryComplexity(query: string): ComplexityAnalysis {
  const lower = query.toLowerCase();
  const tokenization = slimTokenize(query);
  const tokenCount = tokenization.tokens.length;
  const reasoning: string[] = [];
  let score = 0;

  // Feature extraction
  const hasLegalTerms = COMPLEX_LEGAL_TERMS.some((term) => lower.includes(term));
  const hasMultipleClauses = (query.match(/[,;]/g) || []).length > 3;
  const isSimplePattern = SIMPLE_PATTERNS.some((p) => p.test(query));
  const isComplexPattern = COMPLEX_PATTERNS.some((p) => p.test(query));
  const hasCodeOrMath = /[{}\[\]<>=+\-*/^%]/.test(query) || /\d{3,}/.test(query);
  const sentenceCount = (query.match(/[.!?]/g) || []).length + 1;
  const avgWordLength = tokenization.tokens.reduce((s, t) => s + t.length, 0) / (tokenCount || 1);
  const languageComplexity = Math.min(1, avgWordLength / 10);

  // v2: New feature detectors
  const isCrossDomain = CROSS_DOMAIN_PATTERNS.some((p) => p.test(query));
  const isComparativeLaw = COMPARATIVE_LAW_PATTERNS.some((p) => p.test(query));
  const requiresChainOfThought = CHAIN_OF_THOUGHT_PATTERNS.some((p) => p.test(query));

  // Count how many complex legal terms appear (density)
  const complexTermCount = COMPLEX_LEGAL_TERMS.filter((term) => lower.includes(term)).length;

  // Scoring (v2: expanded scale 0-1.5)
  if (tokenCount <= 5) { score += 0; reasoning.push("Query muito curta"); }
  else if (tokenCount <= 15) { score += 0.15; reasoning.push("Query curta-média"); }
  else if (tokenCount <= 50) { score += 0.35; reasoning.push("Query média"); }
  else if (tokenCount <= 150) { score += 0.55; reasoning.push("Query longa/complexa"); }
  else { score += 0.70; reasoning.push("Query muito longa — análise profunda"); }

  if (hasLegalTerms) { score += 0.2; reasoning.push("Contém termos jurídicos complexos"); }
  if (complexTermCount >= 3) { score += 0.15; reasoning.push(`Alta densidade legal: ${complexTermCount} termos complexos`); }
  if (hasMultipleClauses) { score += 0.1; reasoning.push("Múltiplas cláusulas"); }
  if (isSimplePattern) { score -= 0.2; reasoning.push("Padrão de pergunta simples"); }
  if (isComplexPattern) { score += 0.25; reasoning.push("Padrão de análise complexa"); }
  if (hasCodeOrMath) { score += 0.15; reasoning.push("Contém código/matemática"); }
  if (sentenceCount > 3) { score += 0.1; reasoning.push("Múltiplas sentenças"); }

  // v2: Deep reasoning indicators
  if (isCrossDomain) { score += 0.25; reasoning.push("Análise cross-domain detectada"); }
  if (isComparativeLaw) { score += 0.20; reasoning.push("Direito comparado detectado"); }
  if (requiresChainOfThought) { score += 0.20; reasoning.push("Chain-of-thought necessário"); }

  score = Math.max(0, Math.min(1.5, score));

  const requiresReasoning = isComplexPattern || hasLegalTerms || isCrossDomain;
  const requiresCreativity = /(?:elabor|redigi|cri)[ae]/i.test(query);
  const isFactual = isSimplePattern && !requiresReasoning;

  // Determine tier (v2: 5 tiers including "deep")
  let tier: ModelTier;
  if (score <= 0.15) tier = "cached";
  else if (score <= 0.35) tier = "edge";
  else if (score <= 0.65) tier = "slim";
  else if (score <= 0.85) tier = "full";
  else tier = "deep";

  return {
    score,
    tier,
    reasoning,
    features: {
      tokenCount,
      hasLegalTerms,
      hasMultipleClauses,
      requiresReasoning,
      requiresCreativity,
      isFactual,
      hasCodeOrMath,
      languageComplexity,
      requiresChainOfThought,
      isCrossDomain,
      isComparativeLaw,
    },
  };
}

/**
 * Make full routing decision considering cache availability and latency budget.
 */
export function routeToTier(
  query: string,
  options: {
    cacheAvailable?: boolean;
    latencyBudgetMs?: number;
    forceFullPipeline?: boolean;
    forceDeepPipeline?: boolean;
  } = {}
): RoutingDecision {
  const complexity = classifyQueryComplexity(query);
  let tier = complexity.tier;

  // Override: if cache available and tier would be cached/edge, use cache
  if (options.cacheAvailable && tier !== "full" && tier !== "deep") {
    tier = "cached";
  }

  // Override: force deep pipeline
  if (options.forceDeepPipeline) {
    tier = "deep";
  }

  // Override: force full pipeline
  if (options.forceFullPipeline && tier !== "deep") {
    tier = "full";
  }

  // Override: if latency budget is very tight, downgrade
  if (options.latencyBudgetMs !== undefined) {
    const config = TIER_CONFIGS[tier];
    if (config.latencyBudgetMs > options.latencyBudgetMs) {
      if (options.latencyBudgetMs <= 5) tier = "cached";
      else if (options.latencyBudgetMs <= 50) tier = "edge";
      else if (options.latencyBudgetMs <= 200) tier = "slim";
      else if (options.latencyBudgetMs <= 2000) tier = "full";
    }
  }

  const tierConfig = TIER_CONFIGS[tier];

  return {
    tier,
    tierConfig,
    complexity,
    cacheAvailable: options.cacheAvailable || false,
    estimatedLatencyMs: tierConfig.latencyBudgetMs,
    estimatedCost: tierConfig.costMultiplier,
  };
}

/**
 * Get tier distribution stats for a batch of queries.
 */
export function analyzeTierDistribution(queries: string[]): Record<ModelTier, number> {
  const dist: Record<ModelTier, number> = { deep: 0, cached: 0, edge: 0, slim: 0, full: 0 };
  for (const q of queries) {
    const { tier } = classifyQueryComplexity(q);
    dist[tier]++;
  }
  return dist;
}
