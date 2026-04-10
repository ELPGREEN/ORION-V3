/**
 * ─── RAG System Evaluator ───
 * Inspired by Vertex AI RAG Evaluation (Google Codelabs)
 * 
 * Evaluates RAG responses across 4 key dimensions:
 * 1. Groundedness — Is the response faithful to the retrieved context?
 * 2. Relevance — Does the response address the user's question?
 * 3. Helpfulness — Is the response comprehensive and useful?
 * 4. Answer Correctness — Does it match reference/golden answers? (when available)
 * 
 * All scoring uses rubric-based evaluation (1-5 scale) following
 * PointwiseMetric patterns from Vertex AI Evaluation SDK.
 */

export interface RAGEvalResult {
  groundedness: RAGMetricScore;
  relevance: RAGMetricScore;
  helpfulness: RAGMetricScore;
  correctness?: RAGMetricScore; // Only when reference answer provided
  overallScore: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  retrievalQuality: RetrievalQuality;
  timestamp: string;
}

export interface RAGMetricScore {
  score: number;       // 1-5 rubric scale
  normalized: number;  // 0-100
  explanation: string;
  status: "pass" | "warning" | "fail";
}

export interface RetrievalQuality {
  contextCoverage: number;     // 0-1: how much of the response is covered by context
  contextUtilization: number;  // 0-1: how much of the context was actually used
  hallucinations: string[];    // Claims not found in context
  unusedChunks: number;        // Context chunks not referenced
}

// ─── Groundedness: Is the response faithful to retrieved context? ───

function scoreGroundedness(response: string, context: string): RAGMetricScore {
  if (!context || context.trim().length < 20) {
    return { score: 3, normalized: 60, explanation: "Contexto insuficiente para avaliar groundedness.", status: "warning" };
  }

  const responseSentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const contextLower = context.toLowerCase();
  const contextWords = new Set(contextLower.split(/\s+/).filter(w => w.length > 3));

  let groundedCount = 0;
  const ungroundedClaims: string[] = [];

  for (const sentence of responseSentences) {
    const words = sentence.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const overlapRatio = words.filter(w => contextWords.has(w)).length / Math.max(words.length, 1);

    // Also check for phrase-level overlap (3-gram)
    const phraseOverlap = checkPhraseOverlap(sentence.toLowerCase(), contextLower);

    if (overlapRatio > 0.3 || phraseOverlap > 0.2) {
      groundedCount++;
    } else if (words.length > 5) {
      ungroundedClaims.push(sentence.trim().substring(0, 80));
    }
  }

  const ratio = groundedCount / Math.max(responseSentences.length, 1);

  let score: number;
  let explanation: string;

  if (ratio >= 0.9) {
    score = 5;
    explanation = "Resposta completamente fundamentada no contexto recuperado.";
  } else if (ratio >= 0.7) {
    score = 4;
    explanation = `Resposta majoritariamente fundamentada (${Math.round(ratio * 100)}%). ${ungroundedClaims.length} afirmação(ões) sem suporte direto.`;
  } else if (ratio >= 0.5) {
    score = 3;
    explanation = `Resposta parcialmente fundamentada (${Math.round(ratio * 100)}%). Algumas afirmações extrapolam o contexto.`;
  } else if (ratio >= 0.3) {
    score = 2;
    explanation = `Resposta minimamente fundamentada (${Math.round(ratio * 100)}%). Maioria das afirmações não encontrada no contexto.`;
  } else {
    score = 1;
    explanation = "Resposta não fundamentada — possível alucinação significativa.";
  }

  return {
    score,
    normalized: score * 20,
    explanation,
    status: score >= 4 ? "pass" : score >= 3 ? "warning" : "fail",
  };
}

// ─── Relevance: Does the response address the question? ───

function scoreRelevance(response: string, question: string): RAGMetricScore {
  if (!question || question.trim().length < 5) {
    return { score: 3, normalized: 60, explanation: "Pergunta muito curta para avaliar relevância.", status: "warning" };
  }

  const questionWords = new Set(
    question.toLowerCase().split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS_PT.has(w))
  );
  const responseWords = response.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  // Keyword overlap
  const keywordOverlap = responseWords.filter(w => questionWords.has(w)).length / Math.max(questionWords.size, 1);
  
  // Semantic intent matching
  const questionIntent = detectQuestionIntent(question);
  const responseHasIntent = checkResponseMatchesIntent(response, questionIntent);

  // Combined score
  const rawScore = keywordOverlap * 0.4 + (responseHasIntent ? 0.6 : 0.2);

  let score: number;
  if (rawScore >= 0.7) score = 5;
  else if (rawScore >= 0.5) score = 4;
  else if (rawScore >= 0.35) score = 3;
  else if (rawScore >= 0.2) score = 2;
  else score = 1;

  const explanations: Record<number, string> = {
    5: "Resposta completamente relevante — aborda diretamente a pergunta.",
    4: "Resposta majoritariamente relevante — aborda a pergunta com pequenos desvios.",
    3: "Resposta parcialmente relevante — aborda indiretamente a pergunta.",
    2: "Resposta minimamente relevante — não aborda diretamente a instrução.",
    1: "Resposta irrelevante para a pergunta.",
  };

  return {
    score,
    normalized: score * 20,
    explanation: explanations[score],
    status: score >= 4 ? "pass" : score >= 3 ? "warning" : "fail",
  };
}

// ─── Helpfulness: Is the response comprehensive and useful? ───

function scoreHelpfulness(response: string, question: string): RAGMetricScore {
  const wordCount = response.split(/\s+/).length;
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 5);
  
  // Specificity: numbers, names, dates, legal refs
  const specificDetails = (response.match(/\d+|Art\.|Lei\s|§|Súmula|jurisprudência/gi) || []).length;
  
  // Structure: lists, paragraphs, headers
  const hasStructure = /\n\n|\d+\.\s|•|-\s/.test(response);
  
  // Completeness: does it have intro + body + conclusion markers?
  const hasIntro = /\b(inicialmente|em resposta|sobre|quanto)\b/i.test(response);
  const hasConclusion = /\b(portanto|assim|dessa forma|conclui|em síntese|por fim)\b/i.test(response);
  
  // Accuracy markers: hedging vs confidence
  const hedging = (response.match(/\b(talvez|possivelmente|pode ser|não tenho certeza)\b/gi) || []).length;
  const confidence = (response.match(/\b(conforme|segundo|nos termos|de acordo|estabelece)\b/gi) || []).length;

  let rawScore = 0;
  rawScore += Math.min(wordCount / 100, 2); // Length contribution (max 2)
  rawScore += Math.min(specificDetails / 3, 1.5); // Specificity (max 1.5)
  rawScore += hasStructure ? 0.5 : 0;
  rawScore += hasIntro ? 0.3 : 0;
  rawScore += hasConclusion ? 0.3 : 0;
  rawScore += Math.min(confidence * 0.15, 0.5);
  rawScore -= hedging * 0.2;

  let score: number;
  if (rawScore >= 4) score = 5;
  else if (rawScore >= 3) score = 4;
  else if (rawScore >= 2) score = 3;
  else if (rawScore >= 1) score = 2;
  else score = 1;

  const explanations: Record<number, string> = {
    5: "Resposta muito útil — abrangente, bem estruturada, com detalhes relevantes.",
    4: "Resposta útil — fornece informação clara e relevante com bom nível de detalhe.",
    3: "Resposta parcialmente útil — fornece algum conteúdo relevante, mas poderia ser mais completa.",
    2: "Resposta pouco útil — vaga, sem detalhes específicos.",
    1: "Resposta inútil — irrelevante, imprecisa ou sem conteúdo.",
  };

  return {
    score,
    normalized: score * 20,
    explanation: explanations[score],
    status: score >= 4 ? "pass" : score >= 3 ? "warning" : "fail",
  };
}

// ─── Correctness: Does it match reference answer? (Referenced evaluation) ───

function scoreCorrectness(response: string, reference: string): RAGMetricScore {
  if (!reference || reference.trim().length < 5) {
    return { score: 3, normalized: 60, explanation: "Sem resposta de referência disponível.", status: "warning" };
  }

  const responseLower = response.toLowerCase().trim();
  const referenceLower = reference.toLowerCase().trim();

  // Exact match
  if (responseLower === referenceLower) {
    return { score: 5, normalized: 100, explanation: "Correspondência exata com a resposta de referência.", status: "pass" };
  }

  // ROUGE-like recall (unigram)
  const refWords = new Set(referenceLower.split(/\s+/).filter(w => w.length > 2));
  const respWords = responseLower.split(/\s+/).filter(w => w.length > 2);
  const recallHits = respWords.filter(w => refWords.has(w)).length;
  const recall = recallHits / Math.max(refWords.size, 1);

  // BLEU-like precision (bigram)
  const refBigrams = getBigrams(referenceLower);
  const respBigrams = getBigrams(responseLower);
  const bigramHits = [...respBigrams].filter(b => refBigrams.has(b)).length;
  const precision = bigramHits / Math.max(respBigrams.size, 1);

  // Semantic similarity via key concept overlap
  const refConcepts = extractKeyConcepts(reference);
  const respConcepts = extractKeyConcepts(response);
  const conceptOverlap = [...refConcepts].filter(c => respConcepts.has(c)).length / Math.max(refConcepts.size, 1);

  // Weighted combination
  const combined = recall * 0.35 + precision * 0.25 + conceptOverlap * 0.4;

  let score: number;
  if (combined >= 0.8) score = 5;
  else if (combined >= 0.6) score = 4;
  else if (combined >= 0.4) score = 3;
  else if (combined >= 0.2) score = 2;
  else score = 1;

  // Binary correctness (like the codelab's question_answering_correctness)
  const isCorrect = score >= 4;

  return {
    score,
    normalized: score * 20,
    explanation: isCorrect
      ? `Resposta correta (recall: ${(recall * 100).toFixed(0)}%, similaridade conceitual: ${(conceptOverlap * 100).toFixed(0)}%).`
      : `Resposta incorreta ou incompleta (recall: ${(recall * 100).toFixed(0)}%, similaridade conceitual: ${(conceptOverlap * 100).toFixed(0)}%).`,
    status: score >= 4 ? "pass" : score >= 3 ? "warning" : "fail",
  };
}

// ─── Retrieval Quality Analysis ───

function analyzeRetrievalQuality(response: string, context: string): RetrievalQuality {
  if (!context || context.trim().length < 20) {
    return { contextCoverage: 0, contextUtilization: 0, hallucinations: [], unusedChunks: 0 };
  }

  const responseSentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const contextChunks = context.split(/\n\n|\n/).filter(c => c.trim().length > 20);
  const contextLower = context.toLowerCase();

  // Context coverage: % of response sentences supported by context
  let coveredSentences = 0;
  const hallucinations: string[] = [];

  for (const sentence of responseSentences) {
    const overlap = checkPhraseOverlap(sentence.toLowerCase(), contextLower);
    if (overlap > 0.15) {
      coveredSentences++;
    } else if (sentence.trim().split(/\s+/).length > 8) {
      hallucinations.push(sentence.trim().substring(0, 100));
    }
  }

  // Context utilization: % of context chunks that contributed to the response
  const responseLower = response.toLowerCase();
  let usedChunks = 0;
  for (const chunk of contextChunks) {
    const chunkWords = chunk.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const usedWords = chunkWords.filter(w => responseLower.includes(w)).length;
    if (usedWords / Math.max(chunkWords.length, 1) > 0.2) {
      usedChunks++;
    }
  }

  return {
    contextCoverage: coveredSentences / Math.max(responseSentences.length, 1),
    contextUtilization: usedChunks / Math.max(contextChunks.length, 1),
    hallucinations: hallucinations.slice(0, 5),
    unusedChunks: contextChunks.length - usedChunks,
  };
}

// ─── Main RAG Evaluation Function ───

export function evaluateRAGResponse(params: {
  response: string;
  question: string;
  context: string;
  reference?: string;
}): RAGEvalResult {
  const { response, question, context, reference } = params;
  const plain = response.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const plainContext = context.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const groundedness = scoreGroundedness(plain, plainContext);
  const relevance = scoreRelevance(plain, question);
  const helpfulness = scoreHelpfulness(plain, question);
  const correctness = reference ? scoreCorrectness(plain, reference) : undefined;
  const retrievalQuality = analyzeRetrievalQuality(plain, plainContext);

  // Weighted overall (Vertex AI style)
  const weights = {
    groundedness: 0.35,
    relevance: 0.25,
    helpfulness: 0.20,
    correctness: 0.20,
  };

  let overall: number;
  if (correctness) {
    overall = Math.round(
      groundedness.normalized * weights.groundedness +
      relevance.normalized * weights.relevance +
      helpfulness.normalized * weights.helpfulness +
      correctness.normalized * weights.correctness
    );
  } else {
    // Without reference: redistribute correctness weight
    overall = Math.round(
      groundedness.normalized * 0.40 +
      relevance.normalized * 0.30 +
      helpfulness.normalized * 0.30
    );
  }

  const grade = overall >= 90 ? "A" : overall >= 75 ? "B" : overall >= 60 ? "C" : overall >= 40 ? "D" : "F";

  return {
    groundedness,
    relevance,
    helpfulness,
    correctness,
    overallScore: overall,
    grade,
    retrievalQuality,
    timestamp: new Date().toISOString(),
  };
}

// ─── Helpers ───

function checkPhraseOverlap(text: string, context: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 2);
  if (words.length < 3) return 0;

  let matches = 0;
  const total = Math.max(words.length - 2, 1);

  for (let i = 0; i < words.length - 2; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (context.includes(trigram)) matches++;
  }

  return matches / total;
}

function getBigrams(text: string): Set<string> {
  const words = text.split(/\s+/).filter(w => w.length > 2);
  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]} ${words[i + 1]}`);
  }
  return bigrams;
}

function extractKeyConcepts(text: string): Set<string> {
  const concepts = new Set<string>();
  const lower = text.toLowerCase();

  // Legal refs
  const legalRefs = lower.match(/art\.\s*\d+|lei\s+[\d.\/]+|súmula\s+\d+|cpc|cpp|cf|clt|cdc/gi) || [];
  legalRefs.forEach(r => concepts.add(r.trim()));

  // Named entities (capitalized multi-word)
  const named = text.match(/[A-Z][a-záéíóúãõâêôç]+(?:\s+[A-Z][a-záéíóúãõâêôç]+)+/g) || [];
  named.forEach(n => concepts.add(n.toLowerCase()));

  // Numbers and dates
  const numbers = text.match(/\d{2,}/g) || [];
  numbers.forEach(n => concepts.add(n));

  return concepts;
}

function detectQuestionIntent(question: string): string {
  const lower = question.toLowerCase();
  if (/\b(o que|qual|quais|defin)\b/.test(lower)) return "definition";
  if (/\b(como|de que forma|procedimento)\b/.test(lower)) return "procedure";
  if (/\b(quando|prazo|data|tempo)\b/.test(lower)) return "temporal";
  if (/\b(por que|razão|motivo|fundamento)\b/.test(lower)) return "reason";
  if (/\b(onde|local|comarca|jurisdição)\b/.test(lower)) return "location";
  if (/\b(quem|responsável|competente|legitimad)\b/.test(lower)) return "agent";
  if (/\b(pode|possível|cabível|aplicável)\b/.test(lower)) return "possibility";
  return "general";
}

function checkResponseMatchesIntent(response: string, intent: string): boolean {
  const lower = response.toLowerCase();
  switch (intent) {
    case "definition": return /\b(é|são|consiste|trata-se|define-se|significa)\b/.test(lower);
    case "procedure": return /\b(deve|primeiro|segundo|etapa|passo|procedimento|requerer)\b/.test(lower);
    case "temporal": return /\b(prazo|dias|meses|anos|contados|a partir)\b/.test(lower);
    case "reason": return /\b(porque|pois|tendo em vista|em razão|fundament)\b/.test(lower);
    case "location": return /\b(comarca|vara|foro|jurisdição|tribunal|local)\b/.test(lower);
    case "agent": return /\b(juiz|parte|autor|réu|legitimad|competent|ministério)\b/.test(lower);
    case "possibility": return /\b(sim|não|cabível|possível|vedado|permitido|admissível)\b/.test(lower);
    default: return true;
  }
}

const STOP_WORDS_PT = new Set([
  "para", "como", "mais", "esse", "essa", "este", "esta", "pode", "deve",
  "sido", "será", "suas", "seus", "dela", "dele", "sobre", "entre", "após",
  "antes", "quando", "onde", "quem", "qual", "quais", "cada", "todo", "toda",
  "todos", "todas", "muito", "pouco", "ainda", "também", "mesmo", "sendo",
  "pela", "pelo", "pelas", "pelos", "numa", "nuns", "numa", "numas",
]);
