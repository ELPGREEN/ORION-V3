import { supabase } from "@/integrations/supabase/client";
import { getLearnedCorrection } from "./intent-feedback";

export interface ClassifiedIntent {
  intent: string;
  confidence: number;
  params: Record<string, any>;
  source: "regex" | "llm" | "cache" | "feedback";
  classifyMs: number;
  alternatives?: string[];
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
    return entry.result;
  }
  return null;
}

function setCache(text: string, result: ClassifiedIntent): void {
  _cache.set(normalizeForCache(text), { result, ts: Date.now() });
}

// ─── Regex Fast-Path Rules ───

interface IntentRule {
  pattern: RegExp;
  intent: string;
  confidence: number;
  extractParams?: (text: string) => any;
}

const REGEX_RULES: IntentRule[] = [
  // Conversational / Greeting (Must be high priority to avoid tool triggers)
  { pattern: /\b(oi|ol[aá]|bom\s+dia|boa\s+tarde|boa\s+noite|tudo\s+bem|como\s+vai|e\s+a[ií])\b/i, intent: "general", confidence: 0.98 },
  { pattern: /\b(consegue\s+me\s+ouvir|est[aá]\s+me\s+ouvindo|me\s+ouve|teste\s+de\s+som|teste\s+mic)\b/i, intent: "general", confidence: 0.98 },
  { pattern: /\b(quem\s+[eé]\s+voc[eê]|fala\s+(sobre|de)\s+voc[eê]|o\s+que\s+voc[eê]\s+[eé]|sua\s+identidade)\b/i, intent: "identity", confidence: 0.98 },

  // Vision
  { pattern: /\b(?:(descreva|o\s+que)\s+(?:voc[eê]\s+)?(?:v[eê]|enxerga|est[aá]\s+(?:me\s+)?vendo))\b/i, intent: "vision_describe", confidence: 0.96 },
  // "Quem sou eu / quem é essa pessoa"
  { pattern: /\b(?:quem\s+(?:sou\s+eu|[eé]\s+(?:essa?|aquele?|ele|ela|est[ea])|somos|s[aã]o\s+(?:eles|elas))|reconhe[cç])\b/i, intent: "identity", confidence: 0.92 },

  // ═══ MEDIA rules BEFORE navigation — "abrir música" must NOT be caught by nav ═══
  
  // Media — YouTube (explicit platform mention)
  { pattern: /\b(?:(?:abr[aei]?r?|tocar?|play|reproduz\w*|assistir?|ver|pesquisar?|buscar?|procurar?)\s+[\w\s]{0,20}(?:no\s+|do\s+|d[oa]\s+)?youtube|youtube\b)/i, intent: "media", confidence: 0.95, extractParams: (t) => {
    const m = t.match(/(?:tocar?|play|reproduz\w*|assistir?|ver|pesquisar?|buscar?|procurar?|abr[aei]?r?)\s+(.+?)(?:\s+(?:no|do|da)\s+youtube)?$/i);
    return { query: m?.[1]?.replace(/(?:no|do|da)\s+youtube/i, "").trim() || "", platform: "youtube" };
  }},
  
  // Media — Spotify (explicit platform mention)
  { pattern: /\b(?:(?:tocar?|play|reproduz\w*|ouvir?|escutar?)\s+[\w\s]{0,20}(?:no\s+|do\s+|d[oa]\s+)?spotify|spotify\b)/i, intent: "media", confidence: 0.95, extractParams: (t) => {
    const m = t.match(/(?:tocar?|play|reproduz\w*|ouvir?|escutar?)\s+(.+?)(?:\s+(?:no|do|da)\s+spotify)?$/i);
    return { query: m?.[1]?.replace(/(?:no|do|da)\s+spotify/i, "").trim() || "", platform: "spotify" };
  }},
  
  // Media — "abrir música/vídeo" patterns (MUST be before navigation)
  { pattern: /\b(?:abr[aei]?r?|tocar?|play|reproduz\w*|ouvir?|escutar?|assistir?|colocar?)\s+(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o|playlist|álbum|album)/i, intent: "media", confidence: 0.96, extractParams: (t) => {
    const m = t.match(/(?:abr[aei]?r?\s+(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o)\s+(?:d[oae]\s+)?|tocar?\s+|play\s+|reproduz\w*\s+|ouvir?\s+|escutar?\s+|assistir?\s+|colocar?\s+)(.+)/i);
    return { query: m?.[1]?.trim() || t, action: "play" };
  }},
  
  // Media — generic (music/video keywords without platform)
  { pattern: /\b(tocar?\s+|play\s+|reproduz\w*\s+|m[uú]sica\s+d[oae]\s+|v[ií]deo\s+d[oae]\s+|ouvir?\s+|escutar?\s+)/i, intent: "media", confidence: 0.75, extractParams: (t) => {
    const m = t.match(/(?:tocar?|play|reproduz\w*|ouvir?|escutar?)\s+(.+)/i);
    return { query: m?.[1]?.trim() || t, action: /\b(par[ae]|stop|paus)\b/i.test(t) ? "pause" : "play" };
  }},

  // Media controls — only explicit controls, never commands with a target query
  { pattern: /^\s*(pr[óò]xima?|pr[óò]ximo|avançar|seguinte|próxima\s+(m[uú]sica|faixa))\s*$/i, intent: "media_control", confidence: 0.97, extractParams: () => ({ action: "next" }) },
  { pattern: /^\s*(anterior|voltar|retornar|voltar\s+(uma|à)\s+(m[uú]sica|faixa)|m[uú]sica\s+anterior)\s*$/i, intent: "media_control", confidence: 0.97, extractParams: () => ({ action: "prev" }) },
  { pattern: /^\s*(pausar|parar|stop|pausa)\s*$/i, intent: "media_control", confidence: 0.95, extractParams: () => ({ action: "pause" }) },
  { pattern: /^\s*(continuar|retomar|resume|play|reproduzir)\s*$/i, intent: "media_control", confidence: 0.95, extractParams: () => ({ action: "play" }) },
  // Navigation — AFTER media so "abrir música" is already caught
  { pattern: /\b(v[aá]\s+para|naveg\w*\s+(para|pra)|ir\s+para|go\s+to)\b/i, intent: "navigation", confidence: 0.92, extractParams: (t) => {
    const m = t.match(/(?:v[aá]\s+para|naveg\w*\s+(?:para|pra)|ir\s+para)\s+(.+)/i);
    return { target: m?.[1]?.trim() || "" };
  }},
  // Navigation — "abrir" only for non-media targets (page names)
  { pattern: /\b(abr[aei]?r?)\s+(?:o\s+|a\s+|os\s+|as\s+)?(?:painel|dashboard|consulta|documentos?|processos?|clientes?|rede\s+neural|configura[çc][oõ]|loja|crm|analytics|extensão?)\b/i, intent: "navigation", confidence: 0.92, extractParams: (t) => {
    const m = t.match(/abr[aei]?r?\s+(?:o\s+|a\s+|os\s+|as\s+)?(.+)/i);
    return { target: m?.[1]?.trim() || "" };
  }},
  
  // ═══ "buscar música/vídeo" → media (NOT search) ═══
  { pattern: /\b(?:busc|procur|pesquis|encontr)\w*\s+(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o|playlist|álbum|album)\b/i, intent: "media", confidence: 0.95, extractParams: (t) => {
    const m = t.match(/(?:busc|procur|pesquis|encontr)\w*\s+(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o|playlist|álbum|album)\s+(?:d[oae]\s+)?(.+)/i);
    return { query: m?.[1]?.trim() || t.replace(/.*(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o)\s*/i, "").trim(), action: "play" };
  }},

  // Search — generic → web_search (user wants internet search, not internal)
  { pattern: /\b(procur|busc|encontr|pesquis)\w*\s+/i, intent: "web_search", confidence: 0.85, extractParams: (t) => {
    const cleaned = t.replace(/\b(?:pesquis|busc|procur|encontr)\w*\s+(?:na\s+internet\s+|na\s+web\s+|online\s+)?/i, "").trim();
    return { query: cleaned || t };
  }},
  
  // Legal
  { pattern: /\b(lei\b|artigo\s+\d|c[oó]digo\s+civil|jurisprud[eê]ncia|peti[çc][aã]o|habeas|direito\s+\w)/i, intent: "legal", confidence: 0.75 },
  
  // Calendar
  { pattern: /\b(agendar|marcar\s+(?:uma|reuni)|compromisso|desmarcar)\b/i, intent: "calendar", confidence: 0.90 },
  
  // CRM
  { pattern: /\b(pipeline|lead|oportunidade|neg[oó]cio|proposta|deal)\b/i, intent: "crm", confidence: 0.85 },
  
  // Image generation
  { pattern: /\b(gere?\s+(uma?\s+)?imagem|crie?\s+(uma?\s+)?imagem|desenh[ae]|ilustr[ae])\b/i, intent: "image_generation", confidence: 0.95 },
  
  // Auto-construct
  { pattern: /\b(constru[ai]|programe?|crie?\s+(uma?\s+)?fun[çc][ãa]o|implemente?|desenvolv[ae])\b/i, intent: "auto_construct", confidence: 0.75 },
  
  // Self-evolve
  { pattern: /\b(melhore-se|evolua|auto[-\s]?program|se\s+reprogram|upgrade)\b/i, intent: "self_evolve", confidence: 0.90 },
  
  // Humor
  { pattern: /\b(piada|engra[çc]ado|brincadeira|me\s+fa[çc]a\s+rir)\b/i, intent: "humor", confidence: 0.92 },
  
  // Reporting
  { pattern: /\b(relat[oó]rio|m[eé]tricas|estat[ií]sticas)\b/i, intent: "reporting", confidence: 0.85 },
  
  // Explanation
  { pattern: /\b(expliqu|o\s+que\s+[eé]\s+\w|como\s+funciona|me\s+ensin|defin[ie]|significa)\b/i, intent: "explanation", confidence: 0.85 },
  
  // Security
  { pattern: /\b(seguran[çc]a|amea[çc]a|shield)\b/i, intent: "security", confidence: 0.75 },
  
  // Web search (real-time data)
  { pattern: /\b(hoje|atual|notícia|preço\s+d[eoa]|cotação|2024|2025|2026|clima|previsão)\b/i, intent: "web_search", confidence: 0.82 },
];

function regexClassify(text: string): ClassifiedIntent | null {
  const q = text.toLowerCase().trim();
  if (q.length < 2) return null;
  
  const matches: ClassifiedIntent[] = [];

  for (const rule of REGEX_RULES) {
    if (rule.pattern.test(q)) {
      const params = rule.extractParams ? rule.extractParams(text) : {};
      matches.push({
        intent: rule.intent,
        confidence: rule.confidence,
        params,
        source: "regex",
        classifyMs: 0,
      });
      // If very high confidence, return immediately
      if (rule.confidence >= 0.96) return matches[0];
    }
  }

  if (matches.length === 0) return null;

  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);

  const primary = matches[0];
  if (matches.length > 1) {
    primary.alternatives = matches.slice(1, 4).map(m => m.intent);
  }

  return primary;
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
