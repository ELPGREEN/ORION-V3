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
  // ═══ Video/Screen control (BEFORE everything else) ═══
  { pattern: /\b(aumentar?\s+(?:a\s+)?tela|tela\s+cheia|fullscreen|maximizar?\s+(?:o\s+)?v[ií]deo)\b/i, intent: "video_fullscreen", confidence: 0.97 },
  { pattern: /\b(diminuir?\s+(?:a\s+)?tela|sair?\s+(?:da\s+)?tela\s+cheia|reduzir?\s+(?:a\s+)?tela)\b/i, intent: "video_reduce", confidence: 0.97 },
  { pattern: /\b(minimizar?\s+(?:o\s+)?v[ií]deo|minimizar?\s+(?:a\s+)?tela)\b/i, intent: "video_minimize", confidence: 0.97 },
  { pattern: /\b(desativar?\s+(?:a\s+)?vis[aã]o|desligar?\s+(?:a\s+)?vis[aã]o|vis[aã]o\s+off|parar?\s+(?:a\s+)?vis[aã]o)\b/i, intent: "vision_off", confidence: 0.97 },
  { pattern: /\b(ativar?\s+(?:a\s+)?vis[aã]o|ligar?\s+(?:a\s+)?vis[aã]o|vis[aã]o\s+on|iniciar?\s+(?:a\s+)?vis[aã]o)\b/i, intent: "vision_on", confidence: 0.97 },

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
  
  // ═══ Vision/Identity — Massive coverage for 200+ vision commands ═══
  // "O que você vê/enxerga/está vendo"
  { pattern: /\b(?:o\s+que\s+(?:voc[eê]|vc|tu|c[eê])\s+(?:v[eê]|enxerga|est[aá]\s+vendo|consegue\s+ver|t[aá]\s+vendo))\b/i, intent: "vision_describe", confidence: 0.97 },
  // "Como eu estou/tou" — appearance check
  { pattern: /\b(?:como\s+(?:eu\s+)?(?:estou|tou|t[oô]|fico|fiquei))\b/i, intent: "vision_describe", confidence: 0.96 },
  // "O que você acha" (of what you see)
  { pattern: /\b(?:o\s+que\s+(?:voc[eê]|vc|tu|c[eê])\s+(?:acha|achou|pensa|pensou|achas))\b/i, intent: "vision_describe", confidence: 0.94 },
  // "O que tá/está escrito/escrevendo" — reading text
  { pattern: /\b(?:o\s+que\s+(?:t[aá]|est[aá])\s+(?:escrit[oa]|escrevendo|mostrando|aparecendo|exibindo))\b/i, intent: "vision_describe", confidence: 0.97 },
  // "O que é isso/aquilo/isto" — pointing at things
  { pattern: /\b(?:o\s+que\s+[eé]\s+(?:isso|aquilo|isto|essa|esse|aquele|aquela))\b/i, intent: "vision_describe", confidence: 0.96 },
  // "O que estou/tou segurando/usando/vestindo/comendo/bebendo/fazendo"
  { pattern: /\b(?:o\s+que\s+(?:eu\s+)?(?:estou|tou|t[oô])\s+(?:segurando|usando|vestindo|comendo|bebendo|fazendo|mostrando|lendo|escrevendo|olhando|assistindo|jogando|cozinhando|carregando|montando|mexendo|digitando|pintando|desenhando|costurando|construindo))\b/i, intent: "vision_describe", confidence: 0.97 },
  // "Me descreve/descreva" — describe scene
  { pattern: /\b(?:(?:me\s+)?descrev[ae]|descri[çc][aã]o\s+d[oae]|descrever)\b/i, intent: "vision_describe", confidence: 0.95 },
  // "Leia/lê isso/aquilo/o que está na tela/placa/papel"
  { pattern: /\b(?:l[eê][ia]?\s+(?:isso|aquilo|isto|o\s+que|pra\s+mim)|ler?\s+(?:isso|aquilo|isto|o\s+que))\b/i, intent: "vision_describe", confidence: 0.96 },
  // "Tem algo/alguém/alguma coisa" — presence detection
  { pattern: /\b(?:tem\s+(?:algo|algu[eé]m|alguma\s+coisa|alg[uo]\s+|gente|pessoa|animal)\s+(?:aqui|a[ií]|l[aá]|perto|na\s+frente))\b/i, intent: "vision_describe", confidence: 0.94 },
  // "Quantos/quantas" — counting objects
  { pattern: /\b(?:quant[oa]s?\s+(?:pessoa|objeto|coisa|dedo|gato|cachorro|carro|gente|item|livro|garrafa|copo|cadeira|mesa|flor|fruta|\w+)\s*(?:tem|t[eê]m|voc[eê]\s+v[eê]|est[aã]o|eu\s+tenho)?)\b/i, intent: "vision_describe", confidence: 0.95 },
  // "Qual/que cor" — color identification
  { pattern: /\b(?:(?:qual|que)\s+(?:cor|cores)\s+(?:[eé]\s+)?(?:iss[oa]|est[ea]|aquel[ea]|d[oae]\s+\w+)?)\b/i, intent: "vision_describe", confidence: 0.95 },
  // "Onde está/tá" — spatial location
  { pattern: /\b(?:(?:onde|aonde)\s+(?:est[aá]|t[aá]|fica)\s+(?:o|a|meu|minha|iss[oa]|aquel[ea]))\b/i, intent: "vision_describe", confidence: 0.94 },
  // "Olha/veja/observe/analise" — look at something
  { pattern: /\b(?:olh[ae]|veja|observe|analise|repare|percebe|nota|nota[sr]?)\s+(?:isso|aquilo|isto|aqui|l[aá]|pra|para)\b/i, intent: "vision_describe", confidence: 0.95 },
  // "Está chovendo/escuro/claro/dia/noite" — environment
  { pattern: /\b(?:(?:est[aá]|t[aá])\s+(?:chovendo|nevando|escuro|claro|bonito|feio|frio|quente|ensolarado|nublado|dia|noite|amanhecendo|anoitecendo))\b/i, intent: "vision_describe", confidence: 0.93 },
  // "Que lugar/ambiente/cômodo é esse"
  { pattern: /\b(?:(?:que|qual)\s+(?:lugar|ambiente|c[oô]modo|local|sala|espa[çc]o)\s+[eé]\s+(?:esse|este|aquele))\b/i, intent: "vision_describe", confidence: 0.95 },
  // "Você consegue ver/enxergar/ler"
  { pattern: /\b(?:(?:voc[eê]|vc|tu)\s+(?:consegue|pode|d[aá]\s+pra)\s+(?:ver|enxergar|ler|identificar|reconhecer|detectar|notar|perceber))\b/i, intent: "vision_describe", confidence: 0.96 },
  // "Mostra/diz/fala o que tem/vê"
  { pattern: /\b(?:(?:mostr[ae]|diz|fal[ae]|cont[ae]|inform[ae])\s+(?:o\s+que|pra\s+mim\s+o\s+que)\s+(?:tem|v[eê]|enxerga|aparece|est[aá]))\b/i, intent: "vision_describe", confidence: 0.95 },
  // "Que horas marca" (reading a clock in vision)
  { pattern: /\b(?:que\s+horas?\s+(?:marca|mostra|t[aá])\s+(?:no|na|nesse|nessa|a[ií]))\b/i, intent: "vision_describe", confidence: 0.94 },
  // "Tá limpo/sujo/organizado/bagunçado"
  { pattern: /\b(?:(?:t[aá]|est[aá])\s+(?:limp[oa]|suj[oa]|organizad[oa]|bagun[çc]ad[oa]|arrum[ao]d[oa]|bonit[oa]|fei[oa]))\b/i, intent: "vision_describe", confidence: 0.93 },
  // "Identifica/reconhece/detecta" — generic detection
  { pattern: /\b(?:identific|reconhec|detect|analis[ae]r?\s+(?:iss[oa]|est[ea]|imagem|foto|v[ií]deo|cena|ambiente))\b/i, intent: "vision_describe", confidence: 0.95 },
  // "Foto/imagem/câmera" context questions
  { pattern: /\b(?:(?:na|nessa|nesta)\s+(?:foto|imagem|tela|c[aâ]mera|webcam)|(?:voc[eê]|vc)\s+(?:v[eê]|est[aá]\s+vendo)\s+(?:a\s+)?(?:minha|alguma))\b/i, intent: "vision_describe", confidence: 0.95 },
  // "Isso/aquilo é perigoso/seguro/comestível/venenoso"
  { pattern: /\b(?:(?:iss[oa]|aquel[ea]|est[ea])\s+[eé]\s+(?:perigoso|seguro|comest[ií]vel|venenoso|t[oó]xico|bonit[oa]|car[oa]|barat[oa]|original|falso|verdadeir[oa]))\b/i, intent: "vision_describe", confidence: 0.94 },
  // "Que marca/modelo/tipo é" — product identification
  { pattern: /\b(?:(?:que|qual)\s+(?:marca|modelo|tipo|esp[eé]cie|ra[çc]a)\s+(?:[eé]\s+)?(?:iss[oa]|ess[ea]|aquel[ea]|d[oe]))\b/i, intent: "vision_describe", confidence: 0.95 },
  // "Tem texto/número/QR/código" — OCR detection
  { pattern: /\b(?:(?:tem|existe|aparece|mostra)\s+(?:algum\s+)?(?:texto|n[uú]mero|c[oó]digo|qr\s*code|barcode|placa|etiqueta|r[oó]tulo))\b/i, intent: "vision_describe", confidence: 0.96 },
  // "Tira/bate/capture uma foto" — photo capture
  { pattern: /\b(?:(?:tir[ae]|bat[ae]|captur[ae]|registr[ae])\s+(?:uma?\s+)?(?:foto|imagem|screenshot|print|captura))\b/i, intent: "vision_describe", confidence: 0.95 },
  // "Me vê/vejo/enxerga" — self-referencing vision
  { pattern: /\b(?:(?:voc[eê]|vc|tu)\s+(?:me\s+)?(?:v[eê]|enxerga|est[aá]\s+(?:me\s+)?vendo))\b/i, intent: "vision_describe", confidence: 0.96 },
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
  { pattern: /\b(tocar?\s+|play\s+|reproduz\w*\s+|m[uú]sica\s+d[oae]\s+|v[ií]deo\s+d[oae]\s+|ouvir?\s+|escutar?\s+)/i, intent: "media", confidence: 0.88, extractParams: (t) => {
    const m = t.match(/(?:tocar?|play|reproduz\w*|ouvir?|escutar?)\s+(.+)/i);
    return { query: m?.[1]?.trim() || t, action: /\b(par[ae]|stop|paus)\b/i.test(t) ? "pause" : "play" };
  }},
  
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
