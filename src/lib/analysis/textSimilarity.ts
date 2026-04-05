// ─── Text Similarity Engine (TF-IDF + BM25 + Cosine) ───
// Lightweight browser-based IR engine for legal document analysis

const LEGAL_STOPWORDS_PT = new Set([
  "a", "o", "e", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "um", "uma", "uns", "umas", "por", "para", "com", "sem", "que", "se", "ao",
  "aos", "à", "às", "ou", "mais", "menos", "muito", "já", "também", "como",
  "mas", "não", "nem", "este", "esta", "esse", "essa", "aquele", "aquela",
  "isto", "isso", "aquilo", "seu", "sua", "seus", "suas", "nosso", "nossa",
  "nossos", "nossas", "dele", "dela", "deles", "delas", "lhe", "lhes",
  "me", "te", "nos", "vos", "meu", "minha", "meus", "minhas", "teu", "tua",
  "teus", "tuas", "neste", "nesta", "nesse", "nessa", "deste", "desta",
  "desse", "dessa", "daquele", "daquela", "naquele", "naquela",
  "entre", "sobre", "sob", "até", "após", "ante", "desde", "contra",
  "durante", "perante", "conforme", "segundo", "mediante", "inclusive",
  "foi", "ser", "sido", "sendo", "são", "era", "eram", "será", "serão",
  "tem", "têm", "ter", "tendo", "teve", "tinha", "tinham",
  "está", "estão", "estar", "estava", "estavam",
  "há", "havia", "houve", "pode", "podem", "podia", "podiam",
  "quando", "onde", "porque", "porquê", "portanto", "porém", "todavia",
  "contudo", "entretanto", "assim", "então", "logo", "pois",
  "ainda", "apenas", "somente", "mesmo", "próprio", "qual", "quais",
  "cujo", "cuja", "cujos", "cujas", "todo", "toda", "todos", "todas",
  "outro", "outra", "outros", "outras", "cada", "demais",
  "pelo", "pela", "pelos", "pelas",
]);

/** Tokenize text: lowercase, remove accents for matching, filter stopwords */
export function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[^\wáàâãéèêíïóôõöúüçñ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized
    .split(" ")
    .filter((t) => t.length > 2 && !LEGAL_STOPWORDS_PT.has(t) && !/^\d+$/.test(t));
}

/** Term frequency: count of each token in document */
export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  return tf;
}

/** IDF across a corpus of documents (each doc = token array) */
export function inverseDocumentFrequency(corpus: string[][]): Map<string, number> {
  const N = corpus.length;
  const df = new Map<string, number>();
  for (const doc of corpus) {
    const unique = new Set(doc);
    for (const t of unique) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1);
  }
  return idf;
}

/** TF-IDF vector for a single document */
export function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = termFrequency(tokens);
  const vec = new Map<string, number>();
  for (const [term, freq] of tf) {
    const idfVal = idf.get(term) || 1;
    vec.set(term, freq * idfVal);
  }
  return vec;
}

/** Cosine similarity between two TF-IDF vectors */
export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, valA] of a) {
    normA += valA * valA;
    const valB = b.get(term);
    if (valB !== undefined) dot += valA * valB;
  }
  for (const [, valB] of b) {
    normB += valB * valB;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** BM25 score for a query against a document */
export function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  idf: Map<string, number>,
  avgDocLen: number,
  k1 = 1.5,
  b = 0.75
): number {
  const tf = termFrequency(docTokens);
  const dl = docTokens.length;
  let score = 0;

  for (const qt of queryTokens) {
    const f = tf.get(qt) || 0;
    if (f === 0) continue;
    const idfVal = idf.get(qt) || 1;
    const numerator = f * (k1 + 1);
    const denominator = f + k1 * (1 - b + b * (dl / avgDocLen));
    score += idfVal * (numerator / denominator);
  }

  return score;
}

// ─── Convenience: rank documents by similarity to a query ───

export interface RankedResult<T> {
  item: T;
  score: number;
}

/** Rank items by BM25 relevance to query text */
export function rankByBM25<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  topN = 10
): RankedResult<T>[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return items.slice(0, topN).map((item) => ({ item, score: 0 }));

  const corpus = items.map((item) => tokenize(getText(item)));
  const idf = inverseDocumentFrequency([queryTokens, ...corpus]);
  const avgLen = corpus.reduce((sum, d) => sum + d.length, 0) / (corpus.length || 1);

  const scored = items.map((item, i) => ({
    item,
    score: bm25Score(queryTokens, corpus[i], idf, avgLen),
  }));

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/** Compare two texts and return cosine similarity [0..1] */
export function textSimilarity(textA: string, textB: string): number {
  const tokA = tokenize(textA);
  const tokB = tokenize(textB);
  if (tokA.length === 0 || tokB.length === 0) return 0;

  const idf = inverseDocumentFrequency([tokA, tokB]);
  const vecA = tfidfVector(tokA, idf);
  const vecB = tfidfVector(tokB, idf);
  return cosineSimilarity(vecA, vecB);
}

// ─── Jaccard Similarity ───

/** Jaccard similarity between two texts based on token set overlap */
export function jaccardSimilarity(textA: string, textB: string): number {
  const setA = new Set(tokenize(textA));
  const setB = new Set(tokenize(textB));
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ─── Soft Cosine Similarity (with legal collocation awareness) ───

/** Legal term clusters for soft matching — terms within same cluster get similarity boost */
const SOFT_TERM_CLUSTERS: string[][] = [
  ["responsabilidade", "civil", "dano", "moral", "material", "indenização", "culpa", "reparação"],
  ["consumidor", "fornecedor", "produto", "serviço", "cdc", "vício", "defeito"],
  ["crime", "penal", "pena", "dolo", "culpa", "tipicidade", "dosimetria", "réu", "acusado"],
  ["trabalho", "trabalhista", "empregado", "empregador", "salário", "rescisão", "clt"],
  ["família", "guarda", "alimentícia", "divórcio", "união", "estável", "adoção"],
  ["administrativo", "licitação", "servidor", "público", "improbidade", "concurso"],
  ["constitucional", "constituição", "fundamental", "liberdade", "dignidade", "igualdade"],
  ["tributário", "tributo", "imposto", "contribuição", "fiscal", "sonegação"],
  ["processo", "processual", "petição", "contestação", "recurso", "apelação", "agravo", "sentença"],
  ["ambiental", "meio", "ambiente", "licenciamento", "preservação", "poluição"],
  ["previdenciário", "aposentadoria", "benefício", "inss", "pensão", "auxílio"],
  ["imóvel", "usucapião", "propriedade", "posse", "hipoteca", "locação"],
];

/** Build a soft similarity matrix for terms based on cluster co-occurrence */
function getTermSoftSimilarity(termA: string, termB: string): number {
  if (termA === termB) return 1;
  for (const cluster of SOFT_TERM_CLUSTERS) {
    if (cluster.includes(termA) && cluster.includes(termB)) return 0.4;
  }
  return 0;
}

/** Soft cosine similarity: like cosine but accounts for term-term similarity within legal clusters */
export function softCosineSimilarity(textA: string, textB: string): number {
  const tokA = tokenize(textA);
  const tokB = tokenize(textB);
  if (tokA.length === 0 || tokB.length === 0) return 0;

  const idf = inverseDocumentFrequency([tokA, tokB]);
  const vecA = tfidfVector(tokA, idf);
  const vecB = tfidfVector(tokB, idf);

  const allTerms = new Set([...vecA.keys(), ...vecB.keys()]);
  let dotAB = 0, normA = 0, normB = 0;

  for (const ti of allTerms) {
    for (const tj of allTerms) {
      const sim = getTermSoftSimilarity(ti, tj);
      if (sim === 0) continue;
      const ai = vecA.get(ti) || 0;
      const aj = vecA.get(tj) || 0;
      const bi = vecB.get(ti) || 0;
      const bj = vecB.get(tj) || 0;
      dotAB += ai * bj * sim;
      normA += ai * aj * sim;
      normB += bi * bj * sim;
    }
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotAB / denom;
}

// ─── Ensemble Ranking (BM25 + Cosine + Jaccard) ───

/** Normalize scores to [0, 1] using min-max */
function minMaxNormalize(scores: number[]): number[] {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min;
  return range === 0 ? scores.map(() => 0) : scores.map((s) => (s - min) / range);
}

export interface EnsembleWeights {
  bm25: number;
  cosine: number;
  jaccard: number;
}

const DEFAULT_ENSEMBLE_WEIGHTS: EnsembleWeights = { bm25: 0.5, cosine: 0.3, jaccard: 0.2 };

/** Rank items using ensemble of BM25 + TF-IDF Cosine + Jaccard */
export function rankByEnsemble<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  topN = 10,
  weights: EnsembleWeights = DEFAULT_ENSEMBLE_WEIGHTS,
): RankedResult<T>[] {
  if (items.length === 0) return [];
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return items.slice(0, topN).map((item) => ({ item, score: 0 }));

  const texts = items.map(getText);
  const corpora = texts.map(tokenize);
  const idf = inverseDocumentFrequency([queryTokens, ...corpora]);
  const avgLen = corpora.reduce((s, d) => s + d.length, 0) / (corpora.length || 1);
  const queryVec = tfidfVector(queryTokens, idf);
  const querySet = new Set(queryTokens);

  // Compute raw scores per method
  const bm25Scores = corpora.map((doc) => bm25Score(queryTokens, doc, idf, avgLen));
  const cosineScores = corpora.map((doc) => cosineSimilarity(queryVec, tfidfVector(doc, idf)));
  const jaccardScores = corpora.map((doc) => {
    const docSet = new Set(doc);
    let inter = 0;
    for (const t of querySet) if (docSet.has(t)) inter++;
    const union = querySet.size + docSet.size - inter;
    return union === 0 ? 0 : inter / union;
  });

  // Normalize
  const normBM25 = minMaxNormalize(bm25Scores);
  const normCosine = minMaxNormalize(cosineScores);
  const normJaccard = minMaxNormalize(jaccardScores);

  const scored = items.map((item, i) => ({
    item,
    score: weights.bm25 * normBM25[i] + weights.cosine * normCosine[i] + weights.jaccard * normJaccard[i],
  }));

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
