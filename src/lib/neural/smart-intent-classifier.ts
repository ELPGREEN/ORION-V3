/**
 * ═══ Smart Intent Classifier ═══
 * Unified intent classification: learned corrections → regex fast-path → LLM semantic fallback.
 * Replaces scattered regex classifiers across the codebase.
 * Target: < 1ms for regex/feedback hits, ~300ms for LLM fallback.
 */

import { supabase } from "@/integrations/supabase/client";
import { getLearnedCorrection } from "./intent-feedback";

export interface ClassifiedIntent {
  intent: string;
  confidence: number;
  params: Record<string, string>;
  source: "regex" | "llm" | "cache" | "feedback";
  classifyMs: number;
}

// ─── Local Cache (TTL 5min) ───
const _cache = new Map<string, { result: ClassifiedIntent; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function normalizeForCache(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function getCached(text: string): ClassifiedIntent | null {
  const key = normalizeForCache(text);
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return { ...entry.result, source: "cache" };
  }
  if (entry) _cache.delete(key);
  return null;
}

function setCache(text: string, result: ClassifiedIntent): void {
  const key = normalizeForCache(text);
  _cache.set(key, { result, ts: Date.now() });
  // Evict old entries
  if (_cache.size > 200) {
    const oldest = _cache.keys().next().value;
    if (oldest) _cache.delete(oldest);
  }
}

// ─── Regex Fast-Path ───

interface RegexRule {
  pattern: RegExp;
  intent: string;
  confidence: number;
  extractParams?: (text: string) => Record<string, string>;
}

const REGEX_RULES: RegexRule[] = [
  // Time/date (very specific, high confidence)
  { pattern: /\b(que\s+hora|que\s+dia|data\s+de\s+hoje|hora\s+atual|what\s+time)\b/i, intent: "time_date", confidence: 0.98 },
  
  // Calculation
  { pattern: /\b(calcul|quanto\s+[eé]\s+\d|some|multipliqu|divid|raiz\s+quadrada|porcentagem\s+de)\b/i, intent: "calculation", confidence: 0.95, extractParams: (t) => {
    const m = t.match(/(?:calcul\w*|quanto\s+[eé])\s+(.+)/i);
    return { expression: m?.[1]?.trim() || t };
  }},
  
  // Translation
  { pattern: /\b(traduz|tradu[çc][aã]o|translate)\b/i, intent: "translation", confidence: 0.93, extractParams: (t) => {
    const lang = t.match(/(?:em|para|pro?)\s+(ingl[eê]s|espanhol|italiano|franc[eê]s|alem[aã]o|chin[eê]s|japon[eê]s)/i);
    return { targetLang: lang?.[1] || "inglês", text: t.replace(/traduz\w*\s*/i, "") };
  }},
  
  // Navigation
  { pattern: /\b(abr[ae]|v[aá]\s+para|naveg\w*\s+(para|pra)|ir\s+para|go\s+to)\b/i, intent: "navigation", confidence: 0.92, extractParams: (t) => {
    const m = t.match(/(?:abr[ae]|v[aá]\s+para|naveg\w*\s+(?:para|pra)|ir\s+para)\s+(.+)/i);
    return { target: m?.[1]?.trim() || "" };
  }},
  
  // Vision/Identity
  { pattern: /\b(o\s+que\s+(?:voc[eê]|vc|tu)\s+(?:v[eê]|enxerga)|o\s+que\s+(?:estou|tou)\s+(?:segurando|usando|vestindo))\b/i, intent: "vision_describe", confidence: 0.96 },
  { pattern: /\b(quem\s+[eé]\s+(?:essa?|aquele?|ele|ela)|reconhe[cç])\b/i, intent: "identity", confidence: 0.92 },
  
  // Media — YouTube
  { pattern: /\b(?:(?:abr[ae]?|abrir?|tocar?|play|reproduz\w*|assistir?|ver|pesquisar?|buscar?|procurar?)\s+[\w\s]{0,20}(?:no\s+|do\s+|d[oa]\s+)?youtube|youtube\b)/i, intent: "youtube", confidence: 0.93, extractParams: (t) => {
    const m = t.match(/(?:tocar?|play|reproduz\w*|assistir?|ver|pesquisar?|buscar?|procurar?|abr[ae]?)\s+(.+?)(?:\s+(?:no|do|da)\s+youtube)?$/i);
    return { query: m?.[1]?.replace(/(?:no|do|da)\s+youtube/i, "").trim() || "", platform: "youtube" };
  }},
  
  // Media — Spotify
  { pattern: /\b(?:(?:tocar?|play|reproduz\w*|ouvir?|escutar?)\s+[\w\s]{0,20}(?:no\s+|do\s+|d[oa]\s+)?spotify|spotify\b)/i, intent: "spotify", confidence: 0.93, extractParams: (t) => {
    const m = t.match(/(?:tocar?|play|reproduz\w*|ouvir?|escutar?)\s+(.+?)(?:\s+(?:no|do|da)\s+spotify)?$/i);
    return { query: m?.[1]?.replace(/(?:no|do|da)\s+spotify/i, "").trim() || "", platform: "spotify" };
  }},
  
  // Media — generic (music/video without platform)
  { pattern: /\b(tocar?\s+|play\s+|reproduz\w*\s+|m[uú]sica|v[ií]deo)/i, intent: "media", confidence: 0.85, extractParams: (t) => {
    const m = t.match(/(?:tocar?|play|reproduz\w*)\s+(.+)/i);
    return { query: m?.[1]?.trim() || t, action: /\b(par[ae]|stop|paus)\b/i.test(t) ? "pause" : "play" };
  }},
  
  // Search
  { pattern: /\b(procur|busc|encontr|pesquis)\w*\s+/i, intent: "search", confidence: 0.88, extractParams: (t) => {
    const m = t.match(/(?:procur|busc|encontr|pesquis)\w*\s+(.+)/i);
    return { query: m?.[1]?.trim() || t };
  }},
  
  // Legal
  { pattern: /\b(lei\b|artigo\s+\d|c[oó]digo\s+civil|jurisprud[eê]ncia|peti[çc][aã]o|habeas|direito\s+\w)/i, intent: "legal", confidence: 0.88 },
  
  // Calendar
  { pattern: /\b(agendar|marcar\s+(?:uma|reuni)|compromisso|desmarcar)\b/i, intent: "calendar", confidence: 0.90 },
  
  // CRM
  { pattern: /\b(pipeline|lead|oportunidade|neg[oó]cio|proposta|deal)\b/i, intent: "crm", confidence: 0.85 },
  
  // Image generation
  { pattern: /\b(gere?\s+(uma?\s+)?imagem|crie?\s+(uma?\s+)?imagem|desenh[ae]|ilustr[ae])\b/i, intent: "image_generation", confidence: 0.95 },
  
  // Auto-construct
  { pattern: /\b(constru[ai]|programe?|crie?\s+(uma?\s+)?fun[çc][ãa]o|implemente?|desenvolv[ae])\b/i, intent: "auto_construct", confidence: 0.88 },
  
  // Self-evolve
  { pattern: /\b(melhore-se|evolua|auto[-\s]?program|se\s+reprogram|upgrade)\b/i, intent: "self_evolve", confidence: 0.90 },
  
  // Humor
  { pattern: /\b(piada|engra[çc]ado|brincadeira|me\s+fa[çc]a\s+rir)\b/i, intent: "humor", confidence: 0.92 },
  
  // Reporting
  { pattern: /\b(relat[oó]rio|m[eé]tricas|estat[ií]sticas)\b/i, intent: "reporting", confidence: 0.85 },
  
  // Explanation
  { pattern: /\b(expliqu|o\s+que\s+[eé]\s+\w|como\s+funciona|me\s+ensin|defin[ie]|significa)\b/i, intent: "explanation", confidence: 0.85 },
  
  // Security
  { pattern: /\b(seguran[çc]a|amea[çc]a|shield)\b/i, intent: "security", confidence: 0.88 },
  
  // Web search (real-time data)
  { pattern: /\b(hoje|atual|notícia|preço\s+d[eoa]|cotação|2024|2025|2026|clima|previsão)\b/i, intent: "web_search", confidence: 0.82 },
];

function regexClassify(text: string): ClassifiedIntent | null {
  const q = text.toLowerCase().trim();
  if (q.length < 2) return null;
  
  for (const rule of REGEX_RULES) {
    if (rule.pattern.test(q)) {
      const params = rule.extractParams ? rule.extractParams(text) : {};
      return {
        intent: rule.intent,
        confidence: rule.confidence,
        params,
        source: "regex",
        classifyMs: 0,
      };
    }
  }
  return null;
}

// ─── LLM Semantic Fallback ───

let _llmInFlight = false;

async function llmClassify(text: string): Promise<ClassifiedIntent> {
  const t0 = performance.now();
  
  try {
    _llmInFlight = true;
    const { data, error } = await supabase.functions.invoke("classify-intent", {
      body: { text },
    });
    
    if (error || !data?.intent) {
      console.warn("[SmartClassifier] LLM fallback failed:", error?.message);
      return { intent: "general", confidence: 0.4, params: {}, source: "llm", classifyMs: Math.round(performance.now() - t0) };
    }
    
    return {
      intent: data.intent,
      confidence: data.confidence ?? 0.8,
      params: data.params || {},
      source: "llm",
      classifyMs: Math.round(performance.now() - t0),
    };
  } catch (err) {
    console.warn("[SmartClassifier] LLM error:", err);
    return { intent: "general", confidence: 0.3, params: {}, source: "llm", classifyMs: Math.round(performance.now() - t0) };
  } finally {
    _llmInFlight = false;
  }
}

// ─── Main Classifier ───

const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Classify user text into a structured intent.
 * 1. Check cache
 * 2. Try regex (instant)
 * 3. If no match or low confidence, call LLM (async)
 */
export async function smartClassify(text: string): Promise<ClassifiedIntent> {
  const t0 = performance.now();
  
  // 1. Cache hit
  const cached = getCached(text);
  if (cached) {
    cached.classifyMs = Math.round(performance.now() - t0);
    return cached;
  }
  
  // 2. Learned feedback (user corrections)
  const feedback = getLearnedCorrection(text);
  if (feedback) {
    const result: ClassifiedIntent = {
      intent: feedback.correctIntent,
      confidence: 0.95 + Math.min(feedback.count * 0.01, 0.04), // max 0.99
      params: {},
      source: "feedback",
      classifyMs: Math.round(performance.now() - t0),
    };
    console.log(`[SmartClassifier] Feedback hit: "${text}" → ${feedback.correctIntent} (learned ${feedback.count}x)`);
    setCache(text, result);
    return result;
  }
  
  // 3. Regex fast-path
  const regexResult = regexClassify(text);
  if (regexResult && regexResult.confidence >= CONFIDENCE_THRESHOLD) {
    regexResult.classifyMs = Math.round(performance.now() - t0);
    setCache(text, regexResult);
    return regexResult;
  }
  
  // 4. LLM semantic fallback
  const llmResult = await llmClassify(text);
  llmResult.classifyMs = Math.round(performance.now() - t0);
  if (llmResult.intent !== "general") {
    setCache(text, llmResult);
  }
  return llmResult;
}

/**
 * Synchronous regex-only classification (for hot paths that can't await).
 * Returns null if no regex matches — caller decides fallback.
 */
export function smartClassifySync(text: string): ClassifiedIntent | null {
  const cached = getCached(text);
  if (cached) return cached;
  
  const result = regexClassify(text);
  if (result && result.confidence >= CONFIDENCE_THRESHOLD) {
    setCache(text, result);
    return result;
  }
  return null;
}

/**
 * Check if LLM classification is currently in flight.
 */
export function isClassifying(): boolean {
  return _llmInFlight;
}
