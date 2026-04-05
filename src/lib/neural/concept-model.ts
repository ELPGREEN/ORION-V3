/**
 * ─── Large Concept Model (LCM) v2 ───
 * Concept-level embeddings with diffusion-inspired denoising.
 * Maps queries to conceptual space before retrieval (pre-RAG layer).
 * 
 * v2 Upgrades:
 * - 256-dim embeddings (4x more resolution)
 * - 15 diffusion steps (3x refinement)
 * - 3 new categories: commercial, electoral, military
 * - TF-IDF weighted base embedding generation
 * - Expanded ~12 terms per category
 */

export interface ConceptEmbedding {
  id: string;
  concept: string;
  category: ConceptCategory;
  segments: string[];
  embedding: Float32Array;
  quantized: Uint8Array | null;
  confidence: number;
  relatedConcepts: string[];
  metadata: {
    diffusionSteps: number;
    noiseLevel: number;
    quantizationBits: number;
  };
}

export type ConceptCategory =
  | "constitutional"
  | "civil"
  | "criminal"
  | "labor"
  | "administrative"
  | "tax"
  | "environmental"
  | "consumer"
  | "digital"
  | "international"
  | "procedural"
  | "human_rights"
  | "commercial"
  | "electoral"
  | "military"
  | "neural_architecture";

export interface ConceptSearchResult {
  concept: ConceptEmbedding;
  similarity: number;
  mappingPath: string[];
}

export interface DiffusionConfig {
  steps: number;
  noiseSchedule: "linear" | "cosine" | "quadratic";
  learningRate: number;
  embeddingDim: number;
  quantizationBits: 4 | 8 | 16;
}

const DEFAULT_DIFFUSION_CONFIG: DiffusionConfig = {
  steps: 15,
  noiseSchedule: "cosine",
  learningRate: 0.01,
  embeddingDim: 256,
  quantizationBits: 8,
};

// Legal concept taxonomy (Brazilian law) — v2 expanded with ~12 terms each + 3 new categories
const CONCEPT_TAXONOMY: Record<ConceptCategory, string[]> = {
  constitutional: [
    "direitos fundamentais", "separação de poderes", "controle de constitucionalidade",
    "federalismo", "cláusulas pétreas", "bloco de constitucionalidade", "mutação constitucional",
    "eficácia horizontal", "ponderação de princípios", "reserva do possível",
    "mínimo existencial", "vedação ao retrocesso",
  ],
  civil: [
    "contratos", "responsabilidade civil", "direitos reais", "família", "sucessões",
    "obrigações", "usucapião", "servidão", "hipoteca", "penhor",
    "fiança", "doação",
  ],
  criminal: [
    "tipicidade", "antijuridicidade", "culpabilidade", "dosimetria", "execução penal",
    "habeas corpus", "excludente de ilicitude", "legítima defesa", "estado de necessidade",
    "erro de tipo", "erro de proibição", "concurso de crimes",
  ],
  labor: [
    "CLT", "direitos trabalhistas", "rescisão", "FGTS", "férias", "horas extras",
    "aviso prévio", "estabilidade", "acidente de trabalho", "insalubridade",
    "periculosidade", "equiparação salarial",
  ],
  administrative: [
    "licitação", "concurso público", "ato administrativo", "improbidade", "servidor público",
    "poder de polícia", "desapropriação", "concessão", "permissão", "autarquia",
    "agência reguladora", "processo administrativo disciplinar",
  ],
  tax: [
    "tributos", "imunidade", "isenção", "ICMS", "IR", "contribuições sociais",
    "substituição tributária", "elisão fiscal", "evasão fiscal", "decadência tributária",
    "prescrição tributária", "guerra fiscal",
  ],
  environmental: [
    "licenciamento", "dano ambiental", "APP", "reserva legal", "crimes ambientais",
    "estudo de impacto", "compensação ambiental", "responsabilidade objetiva",
    "princípio do poluidor-pagador", "unidade de conservação",
    "manejo sustentável", "recursos hídricos",
  ],
  consumer: [
    "CDC", "práticas abusivas", "responsabilidade do fornecedor", "recall",
    "publicidade enganosa", "direito de arrependimento", "vício do produto",
    "fato do produto", "inversão do ônus da prova", "cláusula abusiva",
    "banco de dados", "proteção contratual",
  ],
  digital: [
    "LGPD", "proteção de dados", "marco civil", "crimes digitais", "privacidade",
    "consentimento", "dados sensíveis", "transferência internacional de dados",
    "encarregado de dados", "relatório de impacto", "anonimização",
    "inteligência artificial",
  ],
  international: [
    "tratados", "extradição", "cooperação jurídica", "direito humanitário",
    "soberania", "reciprocidade", "homologação de sentença estrangeira",
    "carta rogatória", "asilo político", "refúgio",
    "organização internacional", "jurisdição universal",
  ],
  procedural: [
    "competência", "recursos", "prazos", "tutela provisória", "cumprimento de sentença",
    "litisconsórcio", "intervenção de terceiros", "coisa julgada", "preclusão",
    "conexão", "continência", "ação rescisória",
  ],
  human_rights: [
    "dignidade humana", "igualdade", "liberdade", "devido processo legal",
    "acesso à justiça", "não discriminação", "liberdade de expressão",
    "direito à vida", "proibição de tortura", "direitos sociais",
    "vulnerabilidade", "interseccionalidade",
  ],
  commercial: [
    "sociedade empresária", "falência", "recuperação judicial", "títulos de crédito",
    "propriedade industrial", "marca", "patente", "franquia", "contratos empresariais",
    "desconsideração da personalidade", "empresa individual", "holding",
  ],
  electoral: [
    "propaganda eleitoral", "abuso de poder", "cassação de mandato", "fidelidade partidária",
    "prestação de contas", "inelegibilidade", "ficha limpa", "coligação",
    "registro de candidatura", "pesquisa eleitoral", "voto", "urna eletrônica",
  ],
  military: [
    "crime militar", "deserção", "insubordinação", "justiça militar",
    "conselho de disciplina", "regulamento disciplinar", "hierarquia militar",
    "estado de defesa", "estado de sítio", "forças armadas",
    "serviço militar obrigatório", "tribunal militar",
  ],
  neural_architecture: [
    "jarvis", "neurocore", "pipeline neural", "modelos especializados", "hotpatching",
    "federação neural", "consciência reflexiva", "global workspace", "moe gating",
    "orion vs", "comparação ia", "arquitetura neural", "5 streams", "multimodal fusion",
    "agente eu", "meta aprendizagem", "código automodificável", "fallback chain",
    "mamba ssm", "cross attention", "llm judge", "slim router", "visão computacional",
  ],
};

// ─── TF-IDF Term Weighting for Embeddings ───

const RARE_TERMS_IDF = new Map<string, number>();
(function buildIDF() {
  const allTerms = Object.values(CONCEPT_TAXONOMY).flat();
  const totalDocs = Object.keys(CONCEPT_TAXONOMY).length;
  const termDocFreq = new Map<string, number>();
  
  for (const [, terms] of Object.entries(CONCEPT_TAXONOMY)) {
    const seen = new Set<string>();
    for (const term of terms) {
      for (const word of term.toLowerCase().split(/\s+/)) {
        if (!seen.has(word) && word.length > 2) {
          seen.add(word);
          termDocFreq.set(word, (termDocFreq.get(word) || 0) + 1);
        }
      }
    }
  }
  
  for (const [term, df] of termDocFreq) {
    RARE_TERMS_IDF.set(term, Math.log(totalDocs / (df + 1)) + 1);
  }
})();

/**
 * Segment text into conceptual sentences (SONAR-style).
 */
export function sentenceSegment(text: string): string[] {
  return text
    .split(/[.!?;]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

/**
 * Generate initial embedding from text segments with TF-IDF weighting.
 */
function generateBaseEmbedding(segments: string[], dim: number): Float32Array {
  const emb = new Float32Array(dim);
  
  for (const seg of segments) {
    const words = seg.toLowerCase().split(/\s+/);
    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      const idf = RARE_TERMS_IDF.get(word) || 1.0;
      const tf = 1 / words.length;
      const weight = tf * idf;
      
      for (let i = 0; i < Math.min(word.length * 2, dim); i++) {
        const charVal = word.charCodeAt(i % word.length) / 255 - 0.5;
        // Spread across dim using golden ratio hash for better distribution
        const idx = (wi * 31 + i * 7 + word.charCodeAt(0)) % dim;
        emb[idx] += charVal * weight * (1 / segments.length);
      }
    }
  }
  
  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += emb[i] * emb[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) emb[i] /= norm;
  return emb;
}

/**
 * Get noise level for a given timestep based on schedule.
 */
function getNoiseLevel(step: number, totalSteps: number, schedule: DiffusionConfig["noiseSchedule"]): number {
  const t = step / totalSteps;
  switch (schedule) {
    case "cosine":
      return Math.cos(t * Math.PI * 0.5);
    case "quadratic":
      return (1 - t) * (1 - t);
    case "linear":
    default:
      return 1 - t;
  }
}

/**
 * Single diffusion denoising step on concept embedding.
 */
export function conceptDiffusionStep(
  embedding: Float32Array,
  step: number,
  config: DiffusionConfig = DEFAULT_DIFFUSION_CONFIG
): Float32Array {
  const noiseLevel = getNoiseLevel(step, config.steps, config.noiseSchedule);
  const result = new Float32Array(embedding.length);

  for (let i = 0; i < embedding.length; i++) {
    const noiseEstimate = (Math.random() - 0.5) * noiseLevel * 0.1;
    result[i] = embedding[i] - config.learningRate * noiseEstimate;
  }

  // Re-normalize to unit sphere
  let norm = 0;
  for (let i = 0; i < result.length; i++) norm += result[i] * result[i];
  norm = Math.sqrt(norm + 1e-8);
  for (let i = 0; i < result.length; i++) result[i] /= norm;

  return result;
}

/**
 * Quantize embedding to reduce memory (4/8/16-bit).
 */
export function quantizeConcept(embedding: Float32Array, bits: number = 8): Uint8Array {
  const levels = (1 << bits) - 1;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < embedding.length; i++) {
    if (embedding[i] < min) min = embedding[i];
    if (embedding[i] > max) max = embedding[i];
  }
  const range = max - min || 1;
  const quantized = new Uint8Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    quantized[i] = Math.round(((embedding[i] - min) / range) * levels);
  }
  return quantized;
}

/**
 * Detect the concept category of a legal query.
 */
export function detectConceptCategory(query: string): ConceptCategory {
  const lower = query.toLowerCase();
  let bestCategory: ConceptCategory = "procedural";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CONCEPT_TAXONOMY)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as ConceptCategory;
    }
  }
  return bestCategory;
}

/**
 * Build a full concept embedding with diffusion refinement.
 */
export function buildConceptEmbedding(
  text: string,
  config: DiffusionConfig = DEFAULT_DIFFUSION_CONFIG
): ConceptEmbedding {
  const segments = sentenceSegment(text);
  const category = detectConceptCategory(text);
  let embedding = generateBaseEmbedding(segments.length > 0 ? segments : [text], config.embeddingDim);

  // Run diffusion denoising steps (v2: 15 steps default)
  for (let step = 0; step < config.steps; step++) {
    embedding = conceptDiffusionStep(embedding, step, config);
  }

  const quantized = quantizeConcept(embedding, config.quantizationBits);
  const relatedConcepts = CONCEPT_TAXONOMY[category] || [];

  // Deterministic confidence based on input quality
  const lower = text.toLowerCase();
  let bestScore = 0;
  for (const [, keywords] of Object.entries(CONCEPT_TAXONOMY)) {
    let score = 0;
    for (const kw of keywords) { if (lower.includes(kw)) score += kw.length; }
    if (score > bestScore) bestScore = score;
  }

  return {
    id: `concept_${Date.now().toString(36)}`,
    concept: text.slice(0, 100),
    category,
    segments,
    embedding,
    quantized,
    confidence: Math.min(1, 0.65 + segments.length * 0.03 + (bestScore > 0 ? 0.15 : 0)),
    relatedConcepts,
    metadata: {
      diffusionSteps: config.steps,
      noiseLevel: getNoiseLevel(config.steps, config.steps, config.noiseSchedule),
      quantizationBits: config.quantizationBits,
    },
  };
}

/**
 * Search for similar concepts using cosine similarity on embeddings.
 */
export function conceptualSearch(
  query: string,
  conceptLibrary: ConceptEmbedding[],
  topK: number = 5,
  config: DiffusionConfig = DEFAULT_DIFFUSION_CONFIG
): ConceptSearchResult[] {
  const queryEmbedding = buildConceptEmbedding(query, config);
  const results: ConceptSearchResult[] = [];

  for (const concept of conceptLibrary) {
    let dot = 0, normA = 0, normB = 0;
    const len = Math.min(queryEmbedding.embedding.length, concept.embedding.length);
    for (let i = 0; i < len; i++) {
      dot += queryEmbedding.embedding[i] * concept.embedding[i];
      normA += queryEmbedding.embedding[i] * queryEmbedding.embedding[i];
      normB += concept.embedding[i] * concept.embedding[i];
    }
    const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);

    const mappingPath = [queryEmbedding.category];
    if (queryEmbedding.category !== concept.category) {
      mappingPath.push(concept.category);
    }

    results.push({ concept, similarity: sim, mappingPath });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

/**
 * Get related concept categories for cross-domain search.
 */
export function getRelatedCategories(category: ConceptCategory): ConceptCategory[] {
  const relations: Record<ConceptCategory, ConceptCategory[]> = {
    constitutional: ["human_rights", "administrative", "procedural", "electoral"],
    civil: ["consumer", "procedural", "labor", "commercial"],
    criminal: ["procedural", "human_rights", "constitutional", "military"],
    labor: ["civil", "procedural", "administrative"],
    administrative: ["constitutional", "tax", "environmental"],
    tax: ["administrative", "constitutional", "civil", "commercial"],
    environmental: ["administrative", "criminal", "constitutional"],
    consumer: ["civil", "criminal", "digital", "commercial"],
    digital: ["consumer", "criminal", "civil", "international"],
    international: ["constitutional", "human_rights", "criminal", "commercial"],
    procedural: ["civil", "criminal", "labor"],
    human_rights: ["constitutional", "international", "criminal"],
    commercial: ["civil", "tax", "consumer", "international"],
    electoral: ["constitutional", "criminal", "administrative"],
    military: ["criminal", "constitutional", "administrative"],
    neural_architecture: ["digital", "international", "constitutional"],
  };
  return relations[category] || [];
}
