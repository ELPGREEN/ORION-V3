/**
 * ─── Orion Self-Reformulation Engine ───
 * 
 * Auto-comprehension module: when Orion detects unclear, ambiguous, or
 * poorly structured user input, it reformulates the text internally to
 * extract maximum meaning before processing.
 * 
 * Uses the same reformulation pipeline as the Reformulação Jurídica UI,
 * but oriented for Orion's internal comprehension rather than document output.
 * 
 * Modes:
 *  - clarify:    Rewrite for maximum clarity
 *  - simplify:   Break complex sentences into simple parts
 *  - extract:    Extract core intent and entities
 *  - formalize:  Map colloquial speech to formal commands
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export type ReformulationMode = "clarify" | "simplify" | "extract" | "formalize";

export interface ReformulationResult {
  original: string;
  reformulated: string;
  mode: ReformulationMode;
  confidence: number;
  extractedIntent: string | null;
  extractedEntities: string[];
  wasAmbiguous: boolean;
  processingTimeMs: number;
}

export interface ComprehensionAnalysis {
  score: number;           // 0-1: how well Orion understands the input
  isAmbiguous: boolean;    // multiple possible meanings
  isTruncated: boolean;    // sentence seems incomplete
  isColloquial: boolean;   // heavy slang/abbreviations
  isComplex: boolean;      // nested clauses, legal jargon mixed with informal
  suggestedMode: ReformulationMode;
  issues: string[];
}

// ─── Comprehension Analyzer ───

const AMBIGUITY_PATTERNS = [
  /^(isso|aquilo|ele|ela|eles|elas|esse|essa|este|esta)\b/i,
  /\b(coisa|negócio|parada|lance|trem|bagulho)\b/i,
  /^(faz|faze|faze aí|manda|bota|coloca)\b/i,
  /\?\s*$/,
];

const TRUNCATION_PATTERNS = [
  /\b(e|ou|mas|porém|então|pois|que|porque)\s*$/i,
  /^\S+\s*$/,         // single word
  /\.{3,}\s*$/,       // trailing ellipsis
];

const COLLOQUIAL_PATTERNS = [
  /\b(vc|tb|tbm|blz|vlw|tmj|pq|qd|ctz|mto|dps|hj|qdo|cmg|ctg)\b/i,
  /\b(tá|tô|pra|pro|num|numa|nuns|numas|cê|ocê)\b/i,
  /\b(kkkk|kkk|rs|rsrs|haha|huahua)\b/i,
];

const COMPLEX_PATTERNS = [
  /\b(art\.|§|inciso|alínea|caput|parágrafo|decreto-lei)\b/i,
  /,\s*\w+.*,\s*\w+.*,/,  // multiple comma clauses
  /\b(outrossim|destarte|conquanto|malgrado|inobstante)\b/i,
];

export function analyzeComprehension(text: string): ComprehensionAnalysis {
  const issues: string[] = [];
  let score = 1.0;

  const trimmed = text.trim();
  if (trimmed.length < 3) {
    return { score: 0.1, isAmbiguous: true, isTruncated: true, isColloquial: false, isComplex: false, suggestedMode: "clarify", issues: ["Input muito curto"] };
  }

  // Check ambiguity
  const isAmbiguous = AMBIGUITY_PATTERNS.some(p => p.test(trimmed));
  if (isAmbiguous) { score -= 0.25; issues.push("Referências ambíguas detectadas"); }

  // Check truncation
  const isTruncated = TRUNCATION_PATTERNS.some(p => p.test(trimmed));
  if (isTruncated) { score -= 0.2; issues.push("Frase aparentemente incompleta"); }

  // Check colloquial language
  const colloquialMatches = COLLOQUIAL_PATTERNS.filter(p => p.test(trimmed));
  const isColloquial = colloquialMatches.length >= 1;
  if (isColloquial) { score -= 0.15 * colloquialMatches.length; issues.push("Linguagem coloquial/abreviações"); }

  // Check complexity
  const isComplex = COMPLEX_PATTERNS.some(p => p.test(trimmed));
  if (isComplex && trimmed.length > 200) { score -= 0.1; issues.push("Estrutura complexa com jargão misto"); }

  // Word count penalty for very short but non-truncated inputs
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount <= 2 && !isTruncated) { score -= 0.1; }

  score = Math.max(0, Math.min(1, score));

  // Suggest mode
  let suggestedMode: ReformulationMode = "clarify";
  if (isColloquial) suggestedMode = "formalize";
  else if (isComplex) suggestedMode = "simplify";
  else if (isAmbiguous || isTruncated) suggestedMode = "extract";

  return { score, isAmbiguous, isTruncated, isColloquial, isComplex, suggestedMode, issues };
}

// ─── Quick Local Reformulation (no API call) ───

const COLLOQUIAL_MAP: Record<string, string> = {
  "vc": "você", "vcs": "vocês", "tb": "também", "tbm": "também", "blz": "beleza",
  "vlw": "valeu", "tmj": "estamos juntos", "pq": "porque", "pqp": "por que",
  "qd": "quando", "ctz": "certeza", "mto": "muito", "mt": "muito",
  "dps": "depois", "hj": "hoje", "qdo": "quando", "agr": "agora",
  "cmg": "comigo", "ctg": "contigo", "tá": "está", "ta": "está",
  "tô": "estou", "to": "estou", "pra": "para", "pro": "para o",
  "num": "não", "cê": "você", "ocê": "você", "neh": "né",
  "qm": "quem", "qem": "quem", "oq": "o que", "oque": "o que",
  "eh": "é", "sao": "são", "nao": "não", "naum": "não",
  "td": "tudo", "tds": "todos", "msg": "mensagem", "msgs": "mensagens",
  "qq": "qualquer", "qlqr": "qualquer", "ngm": "ninguém", "ngn": "ninguém",
  "pfv": "por favor", "pfvr": "por favor", "obg": "obrigado", "obgd": "obrigado",
  "dnv": "de novo", "dnovo": "de novo", "msm": "mesmo", "vdd": "verdade",
  "qndo": "quando", "qnd": "quando", "aki": "aqui", "aq": "aqui",
  "bjs": "beijos", "abs": "abraços", "fds": "fim de semana",
  "slk": "sério", "mn": "mano", "mds": "meu deus", "plmds": "pelo amor de deus",
  "flw": "falou", "fmz": "firmeza", "tmb": "também", "dms": "demais",
  "nd": "nada", "cm": "com", "sm": "sem", "p": "para",
  "q": "que", "d": "de", "n": "não", "s": "sim",
  "c": "com", "kd": "cadê", "cade": "cadê",
};

export function quickLocalReformulate(text: string): string {
  let result = text;

  // Replace colloquial terms
  for (const [abbrev, full] of Object.entries(COLLOQUIAL_MAP)) {
    const regex = new RegExp(`\\b${abbrev}\\b`, "gi");
    result = result.replace(regex, full);
  }

  // Remove laugh expressions
  result = result.replace(/\b(kkkk*|rs+|haha+|huahua+)\b/gi, "").trim();

  // Clean up extra spaces
  result = result.replace(/\s{2,}/g, " ").trim();

  return result;
}

// ─── AI-Powered Reformulation (via Edge Function) ───

const MODE_PROMPTS: Record<ReformulationMode, string> = {
  clarify: `Você é o módulo de auto-compreensão do Orion. Reformule a frase do usuário para que fique absolutamente clara e sem ambiguidades. Extraia a intenção real. Retorne APENAS a frase reformulada, sem explicações.`,
  simplify: `Você é o módulo de auto-compreensão do Orion. Simplifique esta entrada complexa em uma instrução direta e clara. Quebre frases compostas em partes simples. Retorne APENAS a versão simplificada.`,
  extract: `Você é o módulo de auto-compreensão do Orion. Esta entrada é ambígua ou incompleta. Extraia a intenção mais provável e reformule como um comando claro. Se houver múltiplas interpretações, escolha a mais provável no contexto jurídico/assistente virtual. Retorne no formato:\nINTENT: [intenção em 3-5 palavras]\nREFORMULADO: [frase clara e completa]`,
  formalize: `Você é o módulo de auto-compreensão do Orion. Converta esta entrada coloquial/informal em linguagem formal e precisa, mantendo a intenção original. Retorne APENAS a versão formalizada.`,
};

export async function reformulateForComprehension(
  text: string,
  mode: ReformulationMode = "clarify",
  context?: string,
): Promise<ReformulationResult> {
  const startTime = Date.now();
  const analysis = analyzeComprehension(text);

  // If comprehension is already high, return as-is with minor cleanup
  if (analysis.score >= 0.85) {
    const cleaned = quickLocalReformulate(text);
    return {
      original: text,
      reformulated: cleaned,
      mode,
      confidence: analysis.score,
      extractedIntent: null,
      extractedEntities: [],
      wasAmbiguous: false,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Try local reformulation first for colloquial inputs
  if (analysis.isColloquial && !analysis.isAmbiguous && !analysis.isTruncated) {
    const localResult = quickLocalReformulate(text);
    const reAnalysis = analyzeComprehension(localResult);
    if (reAnalysis.score >= 0.8) {
      return {
        original: text,
        reformulated: localResult,
        mode: "formalize",
        confidence: reAnalysis.score,
        extractedIntent: null,
        extractedEntities: [],
        wasAmbiguous: false,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  // AI-powered reformulation via edge function
  try {
    const prompt = MODE_PROMPTS[mode];
    const contextLine = context ? `\nContexto recente: ${context}` : "";
    const userMessage = `${prompt}${contextLine}\n\nEntrada do usuário: "${text}"`;

    const { data, error } = await supabase.functions.invoke("aprimorar-documento", {
      body: {
        currentText: text,
        documentType: "comando-oral",
        query: userMessage,
        userQuery: userMessage,
        mode: "light",
        userInstruction: "Retorne SOMENTE o resultado, sem markdown, sem prefixos, sem explicações.",
        directApply: true,
      },
    });

    if (error) throw error;

    const rawResult = data?.enrichedText || data?.content || data?.chatResponse || text;
    let reformulated = rawResult.trim();
    let extractedIntent: string | null = null;

    // Parse extract mode response
    if (mode === "extract" && reformulated.includes("INTENT:")) {
      const intentMatch = reformulated.match(/INTENT:\s*(.+?)(?:\n|$)/i);
      const reformMatch = reformulated.match(/REFORMULADO:\s*(.+?)$/im);
      extractedIntent = intentMatch?.[1]?.trim() || null;
      reformulated = reformMatch?.[1]?.trim() || reformulated;
    }

    // Extract entities (simple pattern matching)
    const entityPatterns = [
      /\b(?:artigo|art\.?)\s*\d+/gi,
      /\b(?:lei|decreto|mp)\s*n?\.?\s*[\d.]+/gi,
      /\b[A-Z][a-záéíóúãõ]+\s+[A-Z][a-záéíóúãõ]+/g, // Proper names
      /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, // CPF
      /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, // CNPJ
    ];

    const entities: string[] = [];
    for (const pattern of entityPatterns) {
      const matches = reformulated.match(pattern);
      if (matches) entities.push(...matches);
    }

    return {
      original: text,
      reformulated,
      mode,
      confidence: Math.min(0.95, analysis.score + 0.3),
      extractedIntent,
      extractedEntities: [...new Set(entities)],
      wasAmbiguous: analysis.isAmbiguous,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    console.warn("[Orion Reformulation] AI fallback to local:", err);
    // Fallback to local reformulation
    const localResult = quickLocalReformulate(text);
    return {
      original: text,
      reformulated: localResult,
      mode,
      confidence: Math.max(0.4, analysis.score),
      extractedIntent: null,
      extractedEntities: [],
      wasAmbiguous: analysis.isAmbiguous,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// ─── Batch Reformulation (for document processing) ───

export async function reformulateBatch(
  texts: string[],
  mode: ReformulationMode = "clarify",
): Promise<ReformulationResult[]> {
  return Promise.all(texts.map(t => reformulateForComprehension(t, mode)));
}

// ─── Comprehension Threshold ───
export const COMPREHENSION_THRESHOLD = 0.65;

export function needsReformulation(text: string): boolean {
  const analysis = analyzeComprehension(text);
  return analysis.score < COMPREHENSION_THRESHOLD;
}
