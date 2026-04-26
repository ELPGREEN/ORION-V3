import { supabase } from "@/integrations/supabase/client";
import { getLearnedCorrection } from "./intent-feedback";

export interface ClassifiedIntent {
  intent: string;
  confidence: number;
  params: Record<string, any>;
  source: "regex" | "llm" | "cache" | "feedback" | "semantic_guard";
  classifyMs: number;
  alternatives?: string[];
  isNegation?: boolean;
}

const _cache = new Map<string, { result: ClassifiedIntent; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function normalizeForCache(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function getCached(text: string): ClassifiedIntent | null {
  const key = normalizeForCache(text);
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.result;
  return null;
}

function setCache(text: string, result: ClassifiedIntent): void {
  _cache.set(normalizeForCache(text), { result, ts: Date.now() });
}

function detectNegation(text: string): boolean {
  const lower = text.toLowerCase();
  return /\bn[ãa]o\b|\bnunca\b|\bjamais\b|\bevite\b|\bpare\b|\bcancele\b/.test(lower);
}

interface IntentRule {
  pattern: RegExp;
  intent: string;
  confidence: number;
  extractParams?: (text: string) => any;
}

const REGEX_RULES: IntentRule[] = [
  { pattern: /\b(oi|ol[aá]|bom\s+dia|boa\s+tarde|boa\s+noite|tudo\s+bem|como\s+vai)\b/i, intent: "general", confidence: 0.98 },
  { pattern: /\b(ligue|acenda|apague|desligue|mude\s+a\s+cor)\b.*\b(luz|lâmpada|led)\b/i, intent: "iot_light", confidence: 0.90 },
  { pattern: /\b(abra|v[aá]\s+para|ir\s+para|navegue|mostre)\b.*\b(documentos|clientes|processos|painel|dashboard|rede\s+neural)\b/i, intent: "navigation", confidence: 0.92 },
  { pattern: /\b(melhore-se|evolua|auto[-\s]?program|se\s+reprogram|upgrade)\b/i, intent: "self_evolve", confidence: 0.95 },
];

let _llmInFlight = false;

async function llmClassify(text: string): Promise<ClassifiedIntent> {
  const t0 = performance.now();
  try {
    _llmInFlight = true;
    const { data, error } = await supabase.functions.invoke("classify-intent", { body: { text } });
    if (error || !data?.intent) return { intent: "general", confidence: 0.4, params: {}, source: "llm", classifyMs: Math.round(performance.now() - t0) };
    return {
      intent: data.intent,
      confidence: data.confidence ?? 0.8,
      params: data.params || {},
      source: "llm",
      classifyMs: Math.round(performance.now() - t0),
    };
  } catch {
    return { intent: "general", confidence: 0.3, params: {}, source: "llm", classifyMs: Math.round(performance.now() - t0) };
  } finally {
    _llmInFlight = false;
  }
}

export async function smartClassify(text: string): Promise<ClassifiedIntent> {
  const t0 = performance.now();
  const cached = getCached(text);
  if (cached) return { ...cached, classifyMs: Math.round(performance.now() - t0) };

  const isNegated = detectNegation(text);
  const feedback = getLearnedCorrection(text);
  if (feedback) {
    const result: ClassifiedIntent = { intent: feedback.correctIntent, confidence: 0.99, params: {}, source: "feedback", classifyMs: Math.round(performance.now() - t0), isNegation: isNegated };
    setCache(text, result);
    return result;
  }

  const q = text.toLowerCase().trim();
  let bestMatch: ClassifiedIntent | null = null;

  for (const rule of REGEX_RULES) {
    if (rule.pattern.test(q)) {
      const confidence = isNegated ? rule.confidence * 0.1 : rule.confidence;
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { intent: rule.intent, confidence, params: rule.extractParams ? rule.extractParams(text) : {}, source: "regex", classifyMs: Math.round(performance.now() - t0), isNegation: isNegated };
      }
    }
  }

  if (bestMatch && bestMatch.confidence > 0.7) {
    setCache(text, bestMatch);
    return bestMatch;
  }

  const llmResult = await llmClassify(text);
  llmResult.isNegation = isNegated;
  if (isNegated) llmResult.confidence *= 0.3;
  return llmResult;
}

export function smartClassifySync(text: string): ClassifiedIntent | null {
  const cached = getCached(text);
  if (cached) return cached;
  const isNegated = detectNegation(text);
  const q = text.toLowerCase().trim();
  for (const rule of REGEX_RULES) {
    if (rule.pattern.test(q)) {
      const confidence = isNegated ? rule.confidence * 0.1 : rule.confidence;
      if (confidence > 0.7) return { intent: rule.intent, confidence, params: {}, source: "regex", classifyMs: 0, isNegation: isNegated };
    }
  }
  return null;
}

export function isClassifying(): boolean {
  return _llmInFlight;
}
