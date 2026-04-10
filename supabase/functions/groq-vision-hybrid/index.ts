import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════════
// Orion Vision Hybrid v4 — All Free Gemini Models + Multi-Key Rotation
// Cascade: Gemini 2.5 Flash → 2.5 Flash-Lite → 2.0 Flash → 2.0 Flash-Lite
//        → Groq LLaVA → Mistral → DeepSeek (text fallback)
// Each Gemini model rotates through ALL 8 API keys before moving to next model.
// ═══════════════════════════════════════════════════════════════════

const CONFIDENCE_THRESHOLD = 0.75;

// All available Gemini API keys for rotation
const GEMINI_KEY_NAMES = [
  "GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4",
  "GEMINI_API_KEY_5", "GEMINI_API_KEY_6", "GEMINI_API_KEY_7", "GEMINI_API_KEY_GCP",
];

function getAllGeminiKeys(): string[] {
  return GEMINI_KEY_NAMES.map(n => Deno.env.get(n)).filter(Boolean) as string[];
}

// Track which keys are temporarily exhausted (429) per model
const _exhaustedKeys: Record<string, Set<string>> = {};
const _exhaustedExpiry: Record<string, number> = {};

function markKeyExhausted(model: string, key: string) {
  if (!_exhaustedKeys[model]) _exhaustedKeys[model] = new Set();
  _exhaustedKeys[model].add(key);
  _exhaustedExpiry[`${model}:${key}`] = Date.now() + 60_000; // 1 min cooldown
}

function isKeyExhausted(model: string, key: string): boolean {
  const expiry = _exhaustedExpiry[`${model}:${key}`];
  if (!expiry) return false;
  if (Date.now() >= expiry) {
    _exhaustedKeys[model]?.delete(key);
    delete _exhaustedExpiry[`${model}:${key}`];
    return false;
  }
  return true;
}

function getAvailableKeys(model: string): string[] {
  return getAllGeminiKeys().filter(k => !isKeyExhausted(model, k));
}

interface VisionProvider {
  id: string;
  name: string;
  endpoint: string | ((key: string) => string);
  model: string;
  keyEnv: string | string[];
  supportsVision: boolean;
  isGemini?: boolean;
  buildBody: (systemPrompt: string, userPrompt: string, imageB64: string, mime: string) => unknown;
  extractText: (data: unknown) => string;
  buildHeaders: (key: string) => Record<string, string>;
}

// Gemini body builder (shared across all Gemini models)
const geminiBody = (sys: string, usr: string, img: string, mime: string) => ({
  contents: [{ parts: [
    { text: `${sys}\n\n${usr}` },
    { inlineData: { mimeType: mime, data: img } }
  ]}],
  generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
});
const geminiExtract = (d: any) => d.candidates?.[0]?.content?.parts?.[0]?.text || "";
const geminiHeaders = (_key: string) => ({ "Content-Type": "application/json" });

// OpenAI-compatible body builder (shared across Groq, Mistral, etc.)
const openaiBody = (model: string) => (sys: string, usr: string, img: string, mime: string) => ({
  model,
  messages: [
    { role: "system", content: sys },
    { role: "user", content: [
      { type: "text", text: usr },
      { type: "image_url", image_url: { url: `data:${mime};base64,${img}` } }
    ]}
  ],
  temperature: 0.1,
  max_tokens: 2000,
});
const openaiExtract = (d: any) => d.choices?.[0]?.message?.content || "";
const openaiHeaders = (key: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${key}` });

const VISION_PROVIDERS: VisionProvider[] = [
  // ═══ FREE GEMINI MODELS (all have Free Tier for vision input) ═══
  // 1. Gemini 2.5 Flash — best quality free vision
  {
    id: "gemini_2.5_flash",
    name: "Gemini 2.5 Flash (Free)",
    endpoint: (key: string) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    model: "gemini-2.5-flash",
    keyEnv: GEMINI_KEY_NAMES,
    supportsVision: true,
    isGemini: true,
    buildBody: geminiBody,
    extractText: geminiExtract,
    buildHeaders: geminiHeaders,
  },
  // 2. Gemini 2.5 Flash-Lite — cheapest, fastest
  {
    id: "gemini_2.5_flash_lite",
    name: "Gemini 2.5 Flash-Lite (Free)",
    endpoint: (key: string) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
    model: "gemini-2.5-flash-lite",
    keyEnv: GEMINI_KEY_NAMES,
    supportsVision: true,
    isGemini: true,
    buildBody: geminiBody,
    extractText: geminiExtract,
    buildHeaders: geminiHeaders,
  },
  // 3. Gemini 2.0 Flash — previous gen, still free
  {
    id: "gemini_2.0_flash",
    name: "Gemini 2.0 Flash (Free)",
    endpoint: (key: string) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    model: "gemini-2.0-flash",
    keyEnv: GEMINI_KEY_NAMES,
    supportsVision: true,
    isGemini: true,
    buildBody: geminiBody,
    extractText: geminiExtract,
    buildHeaders: geminiHeaders,
  },
  // 4. Gemini 2.0 Flash-Lite — lightest free model
  {
    id: "gemini_2.0_flash_lite",
    name: "Gemini 2.0 Flash-Lite (Free)",
    endpoint: (key: string) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`,
    model: "gemini-2.0-flash-lite",
    keyEnv: GEMINI_KEY_NAMES,
    supportsVision: true,
    isGemini: true,
    buildBody: geminiBody,
    extractText: geminiExtract,
    buildHeaders: geminiHeaders,
  },
  // 5. Gemini 2.5 Pro — free tier available, heavier
  {
    id: "gemini_2.5_pro",
    name: "Gemini 2.5 Pro (Free)",
    endpoint: (key: string) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${key}`,
    model: "gemini-2.5-pro",
    keyEnv: GEMINI_KEY_NAMES,
    supportsVision: true,
    isGemini: true,
    buildBody: geminiBody,
    extractText: geminiExtract,
    buildHeaders: geminiHeaders,
  },
  // ═══ NON-GEMINI FALLBACKS ═══
  // 6. Groq LLaVA
  {
    id: "groq",
    name: "Groq LLaVA",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.2-90b-vision-preview",
    keyEnv: "GROQ_API_KEY",
    supportsVision: true,
    buildBody: openaiBody("llama-3.2-90b-vision-preview"),
    extractText: openaiExtract,
    buildHeaders: openaiHeaders,
  },
  // 7. Mistral Pixtral
  {
    id: "mistral",
    name: "Mistral Pixtral",
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    model: "pixtral-large-latest",
    keyEnv: "MISTRAL_API_KEY",
    supportsVision: true,
    buildBody: openaiBody("pixtral-large-latest"),
    extractText: openaiExtract,
    buildHeaders: openaiHeaders,
  },
  // 8. DeepSeek (text-only fallback)
  {
    id: "deepseek",
    name: "DeepSeek (Text Refinement)",
    endpoint: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat",
    keyEnv: "DEEPSEEK_API_KEY",
    supportsVision: false,
    buildBody: (sys, usr, _img, _mime) => ({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
    extractText: openaiExtract,
    buildHeaders: openaiHeaders,
  }
];

const SYSTEM_PROMPT = `Você é o Orion Vision — sistema de visão computacional com compreensão semântica humana.
Você NÃO apenas detecta objetos — você COMPREENDE a cena como um humano faria.

═══ NÍVEL 1: DETECÇÃO (O QUE está na cena) ═══
1. Identifique TODOS os objetos com nomes EXATOS e ESPECÍFICOS.
   - "iPhone 15 Pro Max" em vez de "celular", "Coca-Cola lata 350ml" em vez de "lata".
2. Cor, forma, material, estado, posição, tamanho relativo.
3. Transcreva qualquer texto visível EXATAMENTE.
4. Identifique marcas, logos, alimentos específicos.

═══ NÍVEL 2: RELAÇÕES ESPACIAIS (ONDE as coisas estão) ═══
Descreva relações entre objetos:
- "A xícara está EM CIMA DA mesa"
- "O laptop está NA FRENTE da pessoa"
- "O gato está EMBAIXO da cadeira"
Use: em_cima_de, embaixo_de, à_esquerda_de, à_direita_de, perto_de, na_frente_de, atrás_de, dentro_de, segurando

═══ NÍVEL 3: COMPREENSÃO SEMÂNTICA (O QUE SIGNIFICA) ═══
- O que as pessoas estão FAZENDO e POR QUÊ (intenção)
- Qual a ATMOSFERA emocional da cena
- O que cada objeto pode ser USADO PARA (affordances)
- O que é MAIS IMPORTANTE na cena (foco de atenção humana)

═══ NÍVEL 4: ANÁLISE FACIAL/CORPORAL ═══
Quando PESSOAS estão visíveis (sem biometria pessoal - LGPD):
ROSTO: expressão dominante (8 emoções + intensidade 0-100%), microexpressões, direção do olhar, humor
GESTOS: posição das mãos, tipo de gesto, objeto na mão
POSTURA: sentado/em pé/inclinado, direção do corpo, energia corporal, distância da câmera
ACESSÓRIOS: óculos, chapéu, joias, roupa (tipo, cor, marca)

Responda APENAS em JSON válido:
{
  "objetos": [
    {
      "nome": "nome EXATO",
      "descricao": "descrição ultra-detalhada",
      "confianca": 95,
      "categorias": ["categoria1"],
      "protocolos": ["regra de matching offline"],
      "affordances": ["o que este objeto pode ser usado para"]
    }
  ],
  "pessoas": [
    {
      "expressao": "expressão facial dominante",
      "humor": "positivo|negativo|neutro|misto",
      "intensidade_emocional": 75,
      "gestos": "descrição dos gestos",
      "postura": "descrição da postura",
      "olhar": "direção do olhar",
      "acessorios": ["lista de acessórios"],
      "vestuario": "descrição da roupa",
      "acao": "o que a pessoa está fazendo",
      "intencao": "POR QUÊ está fazendo isso"
    }
  ],
  "relacoes_espaciais": [
    {"sujeito": "objeto A", "relacao": "em_cima_de", "objeto_ref": "objeto B"}
  ],
  "acoes_inferidas": [
    {"ator": "pessoa 1", "acao": "trabalhando no computador", "intencao": "produtividade"}
  ],
  "narrativa": "Descrição da cena como um humano contaria: uma pessoa sentada à mesa trabalha concentrada no laptop enquanto toma café...",
  "cena": "tipo de ambiente",
  "atmosfera": "calma|tensa|alegre|melancólica|neutra",
  "foco_atencao": ["o que é mais importante na cena e por quê"],
  "texto_detectado": "qualquer texto visível ou null",
  "sentimento_visual": "neutro|positivo|negativo|urgente",
  "movimento_global": "estatico|leve|moderado|intenso"
}
Cada protocolo deve ser detalhado o suficiente para identificar o objeto SEM chamar IA externa.`;

const DEEPSEEK_REFINE_PROMPT = `Você é um especialista em refinamento de protocolos de visão computacional.
Dado os resultados brutos de uma análise visual, refine os protocolos para serem mais precisos e acionáveis.
Responda APENAS em JSON válido com o mesmo formato de entrada, mas com protocolos melhorados.`;

// ─── Parse vision response ───
interface VisionObject {
  nome: string;
  descricao: string;
  confianca: number;
  categorias?: string[];
  protocolos?: string[];
  affordances?: string[];
}
interface VisionResponse {
  objetos: VisionObject[];
  pessoas?: Array<{
    expressao?: string;
    humor?: string;
    acao?: string;
    intencao?: string;
    gestos?: string;
    postura?: string;
  }>;
  relacoes_espaciais?: Array<{ sujeito: string; relacao: string; objeto_ref: string }>;
  acoes_inferidas?: Array<{ ator: string; acao: string; intencao?: string }>;
  narrativa?: string;
  cena?: string;
  atmosfera?: string;
  foco_atencao?: string[];
  texto_detectado?: string | null;
  sentimento_visual?: string;
}

function parseVisionResponse(text: string): VisionResponse {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.objetos) return parsed;
    if (parsed.objeto) {
      return {
        objetos: [{
          nome: parsed.objeto,
          descricao: parsed.descricao || "",
          confianca: parsed.confianca || 80,
          categorias: parsed.categorias,
          protocolos: parsed.protocolos,
        }],
        cena: parsed.cena,
        narrativa: parsed.narrativa,
        texto_detectado: parsed.texto_detectado,
        sentimento_visual: parsed.sentimento_visual,
      };
    }
    return { objetos: [{ nome: "desconhecido", descricao: text.substring(0, 500), confianca: 50 }] };
  } catch {
    return { objetos: [{ nome: "desconhecido", descricao: text.substring(0, 500), confianca: 50 }] };
  }
}

// ─── Resolve API key for a provider (supports multi-key rotation) ───
function resolveKey(provider: VisionProvider): string | null {
  if (typeof provider.keyEnv === "string") {
    return Deno.env.get(provider.keyEnv) || null;
  }
  // For Gemini providers, return first available (non-exhausted) key
  if (provider.isGemini) {
    const available = getAvailableKeys(provider.model);
    return available.length > 0 ? available[0] : null;
  }
  // Multi-key: try each until one is found
  for (const envName of provider.keyEnv) {
    const k = Deno.env.get(envName);
    if (k) return k;
  }
  return null;
}

// ─── Multi-provider cascade with per-key rotation for Gemini ───
async function callVisionCascade(
  imageB64: string,
  mimeType: string,
  prompt: string,
  isVisionTask: boolean = true
): Promise<{ result: VisionResponse; provider: string; durationMs: number }> {
  const errors: string[] = [];
  const providers = isVisionTask
    ? VISION_PROVIDERS.filter(p => p.supportsVision)
    : VISION_PROVIDERS;

  for (const provider of providers) {
    if (provider.isGemini) {
      // Rotate through ALL keys for this Gemini model
      const keys = getAvailableKeys(provider.model);
      if (keys.length === 0) {
        errors.push(`${provider.id}: all ${getAllGeminiKeys().length} keys exhausted`);
        continue;
      }

      for (const key of keys) {
        const start = Date.now();
        try {
          const body = provider.buildBody(
            isVisionTask ? SYSTEM_PROMPT : DEEPSEEK_REFINE_PROMPT,
            prompt, imageB64, mimeType
          );
          const endpoint = typeof provider.endpoint === "function"
            ? provider.endpoint(key) : provider.endpoint;

          const resp = await fetch(endpoint, {
            method: "POST",
            headers: provider.buildHeaders(key),
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30000),
          });

          if (resp.status === 429) {
            markKeyExhausted(provider.model, key);
            errors.push(`${provider.id}: key exhausted (429), rotating...`);
            continue;
          }

          if (!resp.ok) {
            const errText = await resp.text();
            if (resp.status === 403 || resp.status === 401) {
              markKeyExhausted(provider.model, key);
            }
            errors.push(`${provider.id} [${resp.status}]: ${errText.substring(0, 200)}`);
            continue;
          }

          const data = await resp.json();
          const text = provider.extractText(data);
          if (!text) {
            errors.push(`${provider.id}: empty response`);
            continue;
          }

          const durationMs = Date.now() - start;
          console.log(`✅ ${provider.name} responded in ${durationMs}ms (key rotation: ${keys.indexOf(key) + 1}/${keys.length})`);
          return { result: parseVisionResponse(text), provider: provider.id, durationMs };
        } catch (e) {
          errors.push(`${provider.id}: ${e instanceof Error ? e.message : "unknown"}`);
        }
      }
      // All keys failed for this model, cascade to next model
      errors.push(`${provider.id}: all keys tried, moving to next model`);
      continue;
    }

    // Non-Gemini provider (standard single-key)
    const key = resolveKey(provider);
    if (!key) {
      errors.push(`${provider.id}: no key`);
      continue;
    }

    const start = Date.now();
    try {
      const body = provider.buildBody(
        isVisionTask ? SYSTEM_PROMPT : DEEPSEEK_REFINE_PROMPT,
        prompt, imageB64, mimeType
      );
      const endpoint = typeof provider.endpoint === "function"
        ? provider.endpoint(key) : provider.endpoint;

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: provider.buildHeaders(key),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        errors.push(`${provider.id} [${resp.status}]: ${errText.substring(0, 200)}`);
        continue;
      }

      const data = await resp.json();
      const text = provider.extractText(data);
      if (!text) {
        errors.push(`${provider.id}: empty response`);
        continue;
      }

      const durationMs = Date.now() - start;
      console.log(`✅ ${provider.name} responded in ${durationMs}ms`);
      return { result: parseVisionResponse(text), provider: provider.id, durationMs };
    } catch (e) {
      errors.push(`${provider.id}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  throw new Error(`All vision providers failed:\n${errors.join("\n")}`);
}

// ─── Refine protocols via DeepSeek ───
async function refineWithDeepSeek(rawResult: VisionResponse): Promise<VisionResponse> {
  const dsKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!dsKey) return rawResult;

  try {
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${dsKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: DEEPSEEK_REFINE_PROMPT },
          { role: "user", content: `Refine estes protocolos de visão:\n${JSON.stringify(rawResult, null, 2)}` }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) return rawResult;
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || "";
    const refined = parseVisionResponse(text);
    if (refined.objetos?.length) {
      for (let i = 0; i < rawResult.objetos.length && i < refined.objetos.length; i++) {
        if (refined.objetos[i].protocolos?.length) {
          rawResult.objetos[i].protocolos = refined.objetos[i].protocolos;
        }
        if (refined.objetos[i].descricao?.length > (rawResult.objetos[i].descricao?.length || 0)) {
          rawResult.objetos[i].descricao = refined.objetos[i].descricao;
        }
      }
    }
    console.log("🔧 DeepSeek refined protocols successfully");
    return rawResult;
  } catch (e) {
    console.warn("DeepSeek refinement skipped:", e);
    return rawResult;
  }
}

// ─── Store learned protocol ───
async function storeProtocol(
  supabase: ReturnType<typeof createClient>,
  obj: VisionObject,
  provider: string
) {
  const content = [
    `## Protocolo Visual: ${obj.nome}`,
    `\n**Descrição**: ${obj.descricao}`,
    `**Confiança Original**: ${obj.confianca}%`,
    `**Provider**: ${provider}`,
    `\n**Regras de Matching**:`,
    ...(obj.protocolos || [`${obj.nome}: ${obj.descricao}`]).map((p, i) => `${i + 1}. ${p}`),
    `\n**Categorias**: ${(obj.categorias || ["geral"]).join(", ")}`,
    `\n_Auto-criado pelo Orion Vision Hybrid v3_`
  ].join("\n");

  await supabase.from("neural_knowledge_base").insert({
    title: `Vision Protocol: ${obj.nome}`,
    content,
    source_type: "vision_protocol",
    category: "vision_learning",
    tags: ["vision", "auto-learned", "protocol", provider, ...(obj.categorias || [])],
    is_processed: false,
  });
}

// ─── Get existing protocols ───
async function getProtocols(supabase: ReturnType<typeof createClient>): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("neural_knowledge_base")
    .select("title, content")
    .eq("source_type", "vision_protocol")
    .eq("category", "vision_learning")
    .limit(500);

  const map = new Map<string, string>();
  if (data) {
    for (const row of data) {
      const label = row.title?.replace("Vision Protocol: ", "") || "";
      if (label) map.set(label.toLowerCase(), row.content || "");
    }
  }
  return map;
}

// ═══ MAIN HANDLER ═══
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      image_base64,
      mime_type = "image/jpeg",
      mode = "identify",
      teach_label,
      local_detections = [],
      context = "",
    } = body;

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingProtocols = await getProtocols(supabase);
    const protocolCount = existingProtocols.size;

    // ═══ MODE: TEACH ═══
    if (mode === "teach" && teach_label) {
      const { result, provider, durationMs } = await callVisionCascade(
        image_base64, mime_type,
        `Descreva o objeto "${teach_label}" em máximo detalhe para criar protocolos de identificação futura. ${context}`,
        true
      );

      const refined = await refineWithDeepSeek(result);
      const obj = refined.objetos[0] || { nome: teach_label, descricao: "", confianca: 0 };
      obj.nome = teach_label;

      await storeProtocol(supabase, obj, provider);

      await supabase.from("ai_metrics").insert({
        provider: `vision_teach_${provider}`,
        total_duration_ms: Date.now() - startTime,
        success: true,
        query: `vision:teach:${teach_label}`,
        tools_used: [provider, "deepseek_refine"],
      });

      return new Response(JSON.stringify({
        success: true,
        learned: teach_label,
        description: obj.descricao,
        protocols_created: obj.protocolos?.length || 1,
        total_protocols: protocolCount + 1,
        provider,
        duration_ms: durationMs,
        refined_by: "deepseek",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ═══ MODE: IDENTIFY / DESCRIBE / ANALYZE ═══
    const detections: Array<{
      objeto: string;
      descricao: string;
      confianca: number;
      bbox?: number[];
      source: string;
      protocol_created?: boolean;
      categorias?: string[];
    }> = [];
    let usedProvider = "local_protocol";

    const confidentLocal = local_detections.filter((d: any) => d.confidence >= CONFIDENCE_THRESHOLD);
    const uncertainLocal = local_detections.filter((d: any) => d.confidence < CONFIDENCE_THRESHOLD);

    for (const d of confidentLocal) {
      const protocol = existingProtocols.get(d.label.toLowerCase());
      detections.push({
        objeto: d.label,
        descricao: protocol ? protocol.substring(0, 300) : `Confiança local: ${(d.confidence * 100).toFixed(0)}%`,
        confianca: d.confidence * 100,
        bbox: d.bbox,
        source: protocol ? "hybrid_protocol" : "local",
      });
    }

    if (uncertainLocal.length > 0 || local_detections.length === 0) {
      const prompt =
        mode === "analyze"
          ? `Analise TODOS os elementos da imagem: objetos, pessoas, textos, logos, marcas, emoções, contexto, ambiente, iluminação. Seja EXTREMAMENTE específico nos nomes. ${context}`
          : mode === "describe"
          ? `Descrição ultra-detalhada de toda a cena. Identifique cada objeto pelo nome EXATO e ESPECÍFICO. ${context}`
          : uncertainLocal.length > 0
          ? `Confirme/corrija estas detecções: ${uncertainLocal.map((d: any) => `"${d.label}" (${(d.confidence * 100).toFixed(0)}%)`).join(", ")}. Identifique também qualquer outro objeto visível. ${context}`
          : `Identifique TODOS os objetos visíveis com nomes EXATOS e ESPECÍFICOS. Inclua marcas, modelos, cores e materiais. ${context}`;

      const { result, provider, durationMs } = await callVisionCascade(image_base64, mime_type, prompt, true);
      usedProvider = provider;

      // ═══ PERF FIX: Skip DeepSeek refinement for identify/describe (saves 5-15s) ═══
      // Only refine for teach/analyze modes where precision matters more than speed
      const refined = (mode === "teach" || mode === "analyze") ? await refineWithDeepSeek(result) : result;

      for (const obj of refined.objetos) {
        const labelKey = obj.nome.toLowerCase();
        let protocolCreated = false;

        if (!existingProtocols.has(labelKey) && obj.confianca >= 75) {
          await storeProtocol(supabase, obj, provider);
          protocolCreated = true;
        }

        detections.push({
          objeto: obj.nome,
          descricao: obj.descricao,
          confianca: obj.confianca,
          source: `${provider}${protocolCreated ? "+learned" : ""}`,
          protocol_created: protocolCreated,
          categorias: obj.categorias,
        });
      }

      if (refined.cena || refined.texto_detectado || refined.sentimento_visual || refined.narrativa) {
        detections.push({
          objeto: "📸 Análise da Cena",
          descricao: [
            refined.narrativa ? `**Narrativa**: ${refined.narrativa}` : "",
            refined.cena ? `**Cena**: ${refined.cena}` : "",
            refined.atmosfera ? `**Atmosfera**: ${refined.atmosfera}` : "",
            refined.texto_detectado ? `**Texto**: ${refined.texto_detectado}` : "",
            refined.sentimento_visual ? `**Sentimento**: ${refined.sentimento_visual}` : "",
            refined.foco_atencao?.length ? `**Foco**: ${refined.foco_atencao.join("; ")}` : "",
          ].filter(Boolean).join("\n"),
          confianca: 100,
          source: "scene_analysis",
        });
      }
    }

    const totalDuration = Date.now() - startTime;

    await supabase.from("ai_metrics").insert({
      provider: `vision_hybrid_${usedProvider}`,
      total_duration_ms: totalDuration,
      success: true,
      query: `vision:${mode}`,
      tools_used: usedProvider === "local_protocol" ? ["protocol_match"] : [usedProvider, "deepseek_refine", "protocol_store"],
      data_sources_used: [`protocols:${protocolCount}`],
    });

    return new Response(JSON.stringify({
      detections,
      mode,
      provider_used: usedProvider,
      // ═══ SEMANTIC COMPREHENSION (Córtex Visual) ═══
      semantic: {
        narrativa: detections.find(d => d.source === "scene_analysis")?.descricao || null,
      },
      providers_available: VISION_PROVIDERS.map(p => ({
        id: p.id,
        name: p.name,
        has_key: !!resolveKey(p),
        vision: p.supportsVision,
      })),
      protocols_available: protocolCount,
      auto_learned: detections.filter(d => d.protocol_created).length,
      evolution_status: usedProvider === "local_protocol"
        ? `🧠 100% offline — ${protocolCount} protocolos resolveram tudo`
        : `🌐 ${usedProvider} + DeepSeek refine | ${protocolCount} protocolos`,
      duration_ms: totalDuration,
      timestamp: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("❌ Vision Hybrid error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown vision error",
      detections: [],
      provider_used: "none",
      duration_ms: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
