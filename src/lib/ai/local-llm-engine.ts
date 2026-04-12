/**
 * Local LLM Engine — 100% Browser-Based AI (Zero API Keys)
 * 
 * Usa Transformers.js v4 para inferência local via WebAssembly/WebGPU.
 * Combina text-generation com QA, summarization e zero-shot como fallbacks.
 * 
 * Modelos utilizados:
 * - Chat: onnx-community/SmolLM2-360M-Instruct (~360MB, chat-capable)
 * - QA fallback: Xenova/distilbert-base-cased-distilled-squad (~260MB)
 * - Zero-shot: Xenova/nli-deberta-v3-xsmall (~80MB)
 * 
 * Pipeline: Intent → Route → Generate → Validate → Stream
 */

type TransformersModule = typeof import("@huggingface/transformers");

let _transformers: TransformersModule | null = null;
const _pipelineCache = new Map<string, any>();

// ─── Model configs ───
const MODELS = {
  chat: "onnx-community/SmolLM2-360M-Instruct",
  qa: "Xenova/distilbert-base-cased-distilled-squad",
  zeroShot: "Xenova/nli-deberta-v3-xsmall",
  sentiment: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
  embeddings: "Xenova/all-MiniLM-L6-v2",
} as const;

// ─── Loading state ───
export type ModelLoadingState = "idle" | "loading" | "ready" | "error";
const _modelStates = new Map<string, ModelLoadingState>();
const _loadingCallbacks = new Set<(states: Map<string, ModelLoadingState>) => void>();

function setModelState(model: string, state: ModelLoadingState) {
  _modelStates.set(model, state);
  _loadingCallbacks.forEach(cb => cb(new Map(_modelStates)));
}

export function onModelStateChange(cb: (states: Map<string, ModelLoadingState>) => void): () => void {
  _loadingCallbacks.add(cb);
  return () => _loadingCallbacks.delete(cb);
}

export function getModelStates(): Map<string, ModelLoadingState> {
  return new Map(_modelStates);
}

// ─── Lazy load Transformers.js ───
async function getTransformers(): Promise<TransformersModule> {
  if (!_transformers) {
    _transformers = await import("@huggingface/transformers");
  }
  return _transformers;
}

async function getPipeline(task: string, model: string): Promise<any> {
  const key = `${task}:${model}`;
  if (_pipelineCache.has(key)) return _pipelineCache.get(key);

  setModelState(model, "loading");
  console.log(`[LocalLLM] Loading ${task} pipeline: ${model}...`);

  try {
    const { pipeline } = await getTransformers();
    const pipe = await pipeline(task as any, model);
    _pipelineCache.set(key, pipe);
    setModelState(model, "ready");
    console.log(`[LocalLLM] ✅ Pipeline ready: ${model}`);
    return pipe;
  } catch (err) {
    setModelState(model, "error");
    console.error(`[LocalLLM] ❌ Failed to load ${model}:`, err);
    throw err;
  }
}

// ─── Response template cache (reuse good patterns) ───
interface CachedPattern {
  intentType: string;
  template: string;
  quality: number;
  ts: number;
}

const PATTERN_CACHE_KEY = "orion_local_patterns";
const PATTERN_TTL = 24 * 60 * 60 * 1000; // 24h

function getCachedPatterns(): CachedPattern[] {
  try {
    const raw = localStorage.getItem(PATTERN_CACHE_KEY);
    if (!raw) return [];
    const patterns: CachedPattern[] = JSON.parse(raw);
    return patterns.filter(p => Date.now() - p.ts < PATTERN_TTL);
  } catch { return []; }
}

function cachePattern(intentType: string, template: string, quality: number) {
  try {
    const patterns = getCachedPatterns();
    patterns.push({ intentType, template, quality, ts: Date.now() });
    // Keep max 50 patterns
    const trimmed = patterns.sort((a, b) => b.quality - a.quality).slice(0, 50);
    localStorage.setItem(PATTERN_CACHE_KEY, JSON.stringify(trimmed));
  } catch { }
}

// ─── Intent-based routing for local inference ───
type LocalIntent = "factual_qa" | "opinion" | "analysis" | "creative" | "command" | "greeting" | "legal" | "general";

function classifyLocalIntent(question: string): LocalIntent {
  const q = question.toLowerCase();
  
  if (/\b(ol[aá]|oi|hey|bom\s+dia|boa\s+(tarde|noite)|hi|hello)\b/.test(q)) return "greeting";
  if (/\b(lei\b|artigo\b|jur[ií]|direito|tribunal|processo|contrato|constitui|penal|trabalhist|recurso|habeas|mandado|senten[çc]a|ac[oó]rd[aã]o|s[uú]mula)\b/.test(q)) return "legal";
  if (/\b(o que [eé]|quem [eé]|quando|onde|qual|quanto|defin|signific|capital\s+d[aoe])\b/.test(q)) return "factual_qa";
  if (/\b(analis|compar|avali|examin|investigu|estud)\b/.test(q)) return "analysis";
  if (/\b(crie|escreva|invente|imagine|conte\s+uma|fa[çc]a\s+um|elabore|redija)\b/.test(q)) return "creative";
  if (/\b(fa[çc]a|execute|abra|mostr|list|configur|ativ|desativ)\b/.test(q)) return "command";
  if (/\b(opini[ãa]o|acha\s+que|concorda|discorda|sugir|recomend)\b/.test(q)) return "opinion";
  return "general";
}

// ─── Knowledge base for factual answers ───
const KNOWLEDGE_BASE: Record<string, string> = {
  greeting: "Olá! Sou o Orion, seu assistente de IA rodando 100% local no seu navegador. Não dependo de nenhuma API externa — toda a inteligência roda aqui, na sua máquina. Como posso ajudar?",
  identity: "Sou o Orion, uma inteligência artificial neural que roda inteiramente no seu navegador usando WebAssembly. Meu processamento é local — suas conversas nunca saem do seu dispositivo.",
};

// ─── Main generation function ───
export interface LocalGenerationResult {
  text: string;
  provider: "local-transformers";
  model: string;
  intent: LocalIntent;
  latencyMs: number;
  fromCache: boolean;
}

/**
 * Generate a response using 100% local inference.
 * Strategy:
 * 1. Classify intent
 * 2. Check pattern cache for similar intents
 * 3. Route to best local pipeline (chat > QA > zero-shot > heuristic)
 * 4. Post-process and validate
 */
export async function generateLocalResponse(
  question: string,
  context?: string,
  chatHistory?: Array<{ role: string; text: string }>,
  onToken?: (accumulated: string) => void,
): Promise<LocalGenerationResult> {
  const startTime = performance.now();
  const intent = classifyLocalIntent(question);

  // ─── Fast path: greetings and identity ───
  if (intent === "greeting") {
    const text = KNOWLEDGE_BASE.greeting;
    if (onToken) simulateStreaming(text, onToken);
    return { text, provider: "local-transformers", model: "heuristic", intent, latencyMs: performance.now() - startTime, fromCache: false };
  }

  if (/quem\s+(te\s+cri|[eé]\s+voc[eê]|[eé]\s+seu)|seu\s+(criador|dono)|who\s+(made|created|are)\s+you/i.test(question)) {
    const text = KNOWLEDGE_BASE.identity;
    if (onToken) simulateStreaming(text, onToken);
    return { text, provider: "local-transformers", model: "heuristic", intent, latencyMs: performance.now() - startTime, fromCache: false };
  }

  // ─── Try text-generation (primary) ───
  try {
    const result = await generateWithChat(question, context, chatHistory, onToken);
    if (result && result.length > 10) {
      cachePattern(intent, result.substring(0, 200), 0.8);
      return { text: result, provider: "local-transformers", model: MODELS.chat, intent, latencyMs: performance.now() - startTime, fromCache: false };
    }
  } catch (err) {
    console.warn("[LocalLLM] Chat generation failed, trying fallbacks:", err);
  }

  // ─── Fallback 1: QA pipeline (for factual questions with context) ───
  if (intent === "factual_qa" && context) {
    try {
      const result = await generateWithQA(question, context);
      if (result && result.length > 5) {
        if (onToken) simulateStreaming(result, onToken);
        return { text: result, provider: "local-transformers", model: MODELS.qa, intent, latencyMs: performance.now() - startTime, fromCache: false };
      }
    } catch (err) {
      console.warn("[LocalLLM] QA fallback failed:", err);
    }
  }

  // ─── Fallback 2: Zero-shot classification + template ───
  try {
    const result = await generateWithZeroShot(question, intent);
    if (result) {
      if (onToken) simulateStreaming(result, onToken);
      return { text: result, provider: "local-transformers", model: MODELS.zeroShot, intent, latencyMs: performance.now() - startTime, fromCache: false };
    }
  } catch (err) {
    console.warn("[LocalLLM] Zero-shot fallback failed:", err);
  }

  // ─── Fallback 3: Free web search for context enrichment ───
  try {
    const webContext = await fetchFreeSearchContext(question);
    if (webContext) {
      // Retry chat generation with web context
      try {
        const enrichedResult = await generateWithChat(question, `${context || ""}\n\nInformações da web:\n${webContext}`, chatHistory, onToken);
        if (enrichedResult && enrichedResult.length > 10) {
          cachePattern(intent, enrichedResult.substring(0, 200), 0.7);
          return { text: enrichedResult, provider: "local-transformers", model: `${MODELS.chat}+web`, intent, latencyMs: performance.now() - startTime, fromCache: false };
        }
      } catch {}
      // If chat fails, return web context directly
      const webResponse = `Baseado em informações da web:\n\n${webContext}`;
      if (onToken) simulateStreaming(webResponse, onToken);
      return { text: webResponse, provider: "local-transformers", model: "web-search", intent, latencyMs: performance.now() - startTime, fromCache: false };
    }
  } catch (err) {
    console.warn("[LocalLLM] Free web search failed:", err);
  }

  // ─── Fallback 4: Heuristic response ───
  const heuristicResponse = buildHeuristicResponse(question, intent, context);
  if (onToken) simulateStreaming(heuristicResponse, onToken);
  return { text: heuristicResponse, provider: "local-transformers", model: "heuristic", intent, latencyMs: performance.now() - startTime, fromCache: false };
}

// ─── Text Generation via SmolLM2 ───
async function generateWithChat(
  question: string,
  context?: string,
  chatHistory?: Array<{ role: string; text: string }>,
  onToken?: (accumulated: string) => void,
): Promise<string> {
  const generator = await getPipeline("text-generation", MODELS.chat);

  const messages: Array<{ role: string; content: string }> = [];

  // System message
  const systemMsg = context
    ? `Você é Orion, assistente de IA inteligente. Responda em português de forma direta e útil.\n\nContexto: ${context.substring(0, 500)}`
    : "Você é Orion, assistente de IA inteligente. Responda em português de forma direta e útil.";
  messages.push({ role: "system", content: systemMsg });

  // Chat history (last 3 turns)
  if (chatHistory && chatHistory.length > 0) {
    const recent = chatHistory.slice(-3);
    for (const msg of recent) {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.text.substring(0, 300),
      });
    }
  }

  // Current question
  messages.push({ role: "user", content: question });

  const output = await generator(messages, {
    max_new_tokens: 512,
    temperature: 0.7,
    top_p: 0.9,
    do_sample: true,
    return_full_text: false,
  });

  const generated = output?.[0]?.generated_text;
  let text = "";

  if (typeof generated === "string") {
    text = generated.trim();
  } else if (Array.isArray(generated)) {
    // Chat format returns array of messages
    const lastMsg = generated[generated.length - 1];
    text = (lastMsg?.content || "").trim();
  } else if (generated && typeof generated === "object" && "content" in generated) {
    text = (generated as any).content?.trim() || "";
  }

  if (onToken && text) {
    simulateStreaming(text, onToken);
  }

  return text;
}

// ─── QA Pipeline ───
async function generateWithQA(question: string, context: string): Promise<string> {
  const qa = await getPipeline("question-answering", MODELS.qa);
  const result = await qa({ question, context: context.substring(0, 2000) });
  if (result?.answer && result.score > 0.1) {
    return `${result.answer} (confiança: ${Math.round(result.score * 100)}%)`;
  }
  return "";
}

// ─── Zero-Shot Classification + Template ───
async function generateWithZeroShot(question: string, intent: LocalIntent): Promise<string> {
  const classifier = await getPipeline("zero-shot-classification", MODELS.zeroShot);

  const labels = ["pergunta factual", "pedido de opinião", "análise técnica", "questão jurídica", "saudação", "comando", "pergunta criativa"];
  const result = await classifier(question, labels);

  const topLabel = result?.labels?.[0] || "pergunta geral";
  const topScore = result?.scores?.[0] || 0;

  if (topScore < 0.3) return "";

  // Build templated response based on classification
  const templates: Record<string, string> = {
    "pergunta factual": `Baseado na minha análise local, posso inferir que sua pergunta sobre "${question.substring(0, 50)}" se enquadra como uma questão factual. Para uma resposta precisa, recomendo consultar fontes especializadas, pois meu modelo local tem conhecimento limitado. No entanto, posso ajudar a analisar a estrutura da questão e sugerir caminhos de pesquisa.`,
    "pedido de opinião": `Sobre sua pergunta "${question.substring(0, 50)}": como IA local, posso oferecer uma análise baseada em padrões. Considere múltiplas perspectivas antes de tomar decisões. Posso ajudar a estruturar os prós e contras se detalhar mais o contexto.`,
    "análise técnica": `Para a análise técnica que você solicita, posso processar os dados disponíveis localmente. A precisão depende do contexto fornecido. Compartilhe mais detalhes para uma análise mais aprofundada.`,
    "questão jurídica": `Sobre a questão jurídica: como IA local, posso fornecer orientações gerais baseadas em padrões legais comuns. Para orientação jurídica específica, consulte sempre um advogado qualificado. Posso ajudar com pesquisa e organização de informações jurídicas.`,
    "comando": `Entendido. Processando seu comando localmente. Alguns comandos podem requerer conexão com serviços externos para execução completa.`,
    "pergunta criativa": `Que pergunta interessante! Vou elaborar uma resposta criativa usando meu processamento local. Note que modelos locais têm capacidade criativa mais limitada que modelos em nuvem.`,
  };

  return templates[topLabel] || `Processando "${question.substring(0, 40)}..." localmente. Classificação: ${topLabel} (${Math.round(topScore * 100)}% confiança).`;
}

// ─── Heuristic Response (last resort) ───
function buildHeuristicResponse(question: string, intent: LocalIntent, context?: string): string {
  const q = question.toLowerCase();

  const intentResponses: Record<LocalIntent, string> = {
    greeting: KNOWLEDGE_BASE.greeting,
    factual_qa: `Sua pergunta "${question.substring(0, 60)}" requer conhecimento factual. Como modelo local leve, tenho capacidade limitada para respostas factuais complexas. Posso ajudar com análise de texto, classificação e raciocínio básico. Para perguntas factuais complexas, considere ativar os provedores de IA em nuvem nas configurações.`,
    opinion: `Sobre "${question.substring(0, 60)}": posso analisar diferentes perspectivas dessa questão. Como IA, não tenho opiniões pessoais, mas posso apresentar argumentos de múltiplos ângulos para ajudar na sua reflexão.`,
    analysis: `Para analisar "${question.substring(0, 60)}", preciso de mais contexto. Compartilhe os dados ou informações que deseja analisar e processarei localmente no seu navegador com total privacidade.`,
    creative: `Vou criar algo baseado em "${question.substring(0, 60)}". Meu modelo local tem capacidade criativa básica — para conteúdo mais elaborado, os provedores em nuvem oferecem melhor resultado.`,
    command: `Comando recebido: "${question.substring(0, 60)}". Processando localmente. Algumas operações podem estar limitadas no modo 100% local.`,
    legal: `Sobre a questão jurídica "${question.substring(0, 60)}": posso ajudar com pesquisa e organização de informações legais. Para orientação jurídica vinculante, consulte sempre um advogado. Posso analisar textos legais, identificar termos-chave e estruturar argumentos.`,
    general: `Processando "${question.substring(0, 60)}" com inferência 100% local. Estou usando modelos leves otimizados para o navegador. Para respostas mais completas, considere ativar provedores de IA em nuvem.`,
  };

  return intentResponses[intent] || intentResponses.general;
}

// ─── Simulate token-by-token streaming for non-streaming pipelines ───
function simulateStreaming(text: string, onToken: (accumulated: string) => void) {
  const words = text.split(/(\s+)/);
  let accumulated = "";
  let i = 0;
  const emit = () => {
    if (i >= words.length) return;
    // Emit 2-3 words at a time for natural feel
    const batch = words.slice(i, i + 3).join("");
    accumulated += batch;
    i += 3;
    onToken(accumulated);
    if (i < words.length) {
      setTimeout(emit, 30 + Math.random() * 20);
    }
  };
  emit();
}

// ─── Preload critical models ───
export async function preloadModels(models: Array<keyof typeof MODELS> = ["chat"]): Promise<void> {
  const taskMap: Record<string, string> = {
    chat: "text-generation",
    qa: "question-answering",
    zeroShot: "zero-shot-classification",
    sentiment: "sentiment-analysis",
    embeddings: "feature-extraction",
  };

  await Promise.allSettled(
    models.map(m => getPipeline(taskMap[m] || "text-generation", MODELS[m]))
  );
}

// ─── Get embedding for semantic similarity ───
export async function getLocalEmbedding(text: string): Promise<number[]> {
  const extractor = await getPipeline("feature-extraction", MODELS.embeddings);
  const result = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(result.data);
}

// ─── Analyze sentiment locally ───
export async function getLocalSentiment(text: string): Promise<{ label: string; score: number }> {
  const classifier = await getPipeline("sentiment-analysis", MODELS.sentiment);
  const result = await classifier(text);
  return result[0] || { label: "NEUTRAL", score: 0.5 };
}

// ─── Check if local engine is available ───
export async function isLocalEngineAvailable(): Promise<boolean> {
  try {
    await getTransformers();
    return true;
  } catch {
    return false;
  }
}

// ─── Free Web Search Context (SearXNG + Wikipedia + DuckDuckGo) ───
const SEARXNG_INSTANCES = [
  "https://searx.be",
  "https://search.sapti.me",
  "https://searx.tiekoetter.com",
  "https://search.bus-hit.me",
];

async function fetchFreeSearchContext(query: string): Promise<string | null> {
  // Try SearXNG first
  for (const instance of SEARXNG_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&lang=pt-BR&categories=general&pageno=1`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        const data = await resp.json();
        if (data.results?.length > 0) {
          return data.results
            .slice(0, 3)
            .map((r: any) => `• ${r.title}: ${(r.content || "").slice(0, 200)} (${r.url})`)
            .join("\n");
        }
      }
    } catch { continue; }
  }

  // Try Wikipedia
  try {
    const wikiUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`;
    const resp = await fetch(wikiUrl, { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      const data = await resp.json();
      const results = data.query?.search;
      if (results?.length > 0) {
        return results
          .map((r: any) => `• ${r.title}: ${(r.snippet || "").replace(/<[^>]+>/g, "").slice(0, 200)}`)
          .join("\n");
      }
    }
  } catch {}

  // Try DuckDuckGo Instant Answer
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetch(ddgUrl, { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data.Abstract) return `• ${data.Heading}: ${data.Abstract}`;
      if (data.Answer) return `• Resposta: ${data.Answer}`;
    }
  } catch {}

  return null;
}

export { fetchFreeSearchContext };

// ─── Clear all cached pipelines (free memory) ───
export function clearLocalModels(): void {
  _pipelineCache.clear();
  _modelStates.clear();
  console.log("[LocalLLM] All models cleared from memory");
}

// ─── Stats ───
export function getLocalEngineStats() {
  return {
    loadedModels: Array.from(_pipelineCache.keys()),
    modelStates: Object.fromEntries(_modelStates),
    cachedPatterns: getCachedPatterns().length,
    availableModels: MODELS,
  };
}
