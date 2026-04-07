import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════════
// Orion Vision Hybrid v4 — SPEED-OPTIMIZED (≤3s target)
// Gemini 2.5 Flash Direct → Groq → Mistral (no DeepSeek refinement)
// ═══════════════════════════════════════════════════════════════════

const CONFIDENCE_THRESHOLD = 0.75;
const VISION_TIMEOUT_MS = 8000; // Hard 8s timeout for any single provider

interface VisionProvider {
  id: string;
  name: string;
  endpoint: string | ((key: string) => string);
  model: string;
  keyEnv: string | string[];
  supportsVision: boolean;
  buildBody: (systemPrompt: string, userPrompt: string, imageB64: string, mime: string) => unknown;
  extractText: (data: unknown) => string;
  buildHeaders: (key: string) => Record<string, string>;
}

const VISION_PROVIDERS: VisionProvider[] = [
  {
    id: "gemini_direct",
    name: "Gemini 2.5 Flash (Direct)",
    endpoint: (key: string) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
    model: "gemini-2.5-flash-lite",
    keyEnv: ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_5", "GEMINI_API_KEY_6", "GEMINI_API_KEY_7"],
    supportsVision: true,
    buildBody: (sys, usr, img, mime) => ({
      contents: [{ parts: [
        { text: `${sys}\n\n${usr}` },
        { inlineData: { mimeType: mime, data: img } },
      ]}],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }),
    extractText: (d: any) => d.candidates?.[0]?.content?.parts?.[0]?.text || "",
    buildHeaders: (_key) => ({ "Content-Type": "application/json" }),
  },
  {
    id: "groq",
    name: "Groq LLaVA",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.2-90b-vision-preview",
    keyEnv: "GROQ_API_KEY",
    supportsVision: true,
    buildBody: (sys, usr, img, mime) => ({
      model: "llama-3.2-90b-vision-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: [
          { type: "text", text: usr },
          { type: "image_url", image_url: { url: `data:${mime};base64,${img}` } },
        ]},
      ],
      temperature: 0.1,
      max_tokens: 800,
    }),
    extractText: (d: any) => d.choices?.[0]?.message?.content || "",
    buildHeaders: (key) => ({ "Content-Type": "application/json", Authorization: `Bearer ${key}` }),
  },
  {
    id: "mistral",
    name: "Mistral Pixtral",
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    model: "pixtral-large-latest",
    keyEnv: "MISTRAL_API_KEY",
    supportsVision: true,
    buildBody: (sys, usr, img, mime) => ({
      model: "pixtral-large-latest",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: [
          { type: "text", text: usr },
          { type: "image_url", image_url: { url: `data:${mime};base64,${img}` } },
        ]},
      ],
      temperature: 0.1,
      max_tokens: 800,
    }),
    extractText: (d: any) => d.choices?.[0]?.message?.content || "",
    buildHeaders: (key) => ({ "Content-Type": "application/json", Authorization: `Bearer ${key}` }),
  },
];

// ═══ COMPACT system prompt (saves ~2000 tokens vs v3) ═══
const SYSTEM_PROMPT = `Orion Vision — análise rápida e precisa.
Identifique objetos com nomes EXATOS (marca, modelo, cor). Transcreva texto visível.
Se houver pessoas: expressão facial (alegre/triste/neutro/focado), gesto, postura, olhar, acessórios.
JSON:
{"objetos":[{"nome":"nome exato","descricao":"detalhe breve","confianca":95,"categorias":["cat"]}],"pessoas":[{"expressao":"x","humor":"positivo","gestos":"y","postura":"z"}],"cena":"desc","texto_detectado":null}`;

interface VisionObject {
  nome: string;
  descricao: string;
  confianca: number;
  categorias?: string[];
  protocolos?: string[];
}
interface VisionResponse {
  objetos: VisionObject[];
  cena?: string;
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
        }],
        cena: parsed.cena,
        texto_detectado: parsed.texto_detectado,
      };
    }
    return { objetos: [{ nome: "desconhecido", descricao: text.substring(0, 300), confianca: 50 }] };
  } catch {
    return { objetos: [{ nome: "desconhecido", descricao: text.substring(0, 300), confianca: 50 }] };
  }
}

function resolveKey(provider: VisionProvider): string | null {
  if (typeof provider.keyEnv === "string") {
    return Deno.env.get(provider.keyEnv) || null;
  }
  for (const envName of provider.keyEnv) {
    const k = Deno.env.get(envName);
    if (k) return k;
  }
  return null;
}

// ═══ FAST cascade — 8s timeout per provider, no refinement ═══
async function callVisionCascade(
  imageB64: string,
  mimeType: string,
  prompt: string,
): Promise<{ result: VisionResponse; provider: string; durationMs: number }> {
  const errors: string[] = [];
  const providers = VISION_PROVIDERS.filter(p => p.supportsVision);

  for (const provider of providers) {
    const key = resolveKey(provider);
    if (!key) {
      errors.push(`${provider.id}: no key`);
      continue;
    }

    const start = Date.now();
    try {
      const body = provider.buildBody(SYSTEM_PROMPT, prompt, imageB64, mimeType);
      const endpoint = typeof provider.endpoint === "function"
        ? provider.endpoint(key)
        : provider.endpoint;

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: provider.buildHeaders(key),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        errors.push(`${provider.id} [${resp.status}]: ${errText.substring(0, 150)}`);
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

// ═══ Protocol storage — fire-and-forget (non-blocking) ═══
function storeProtocolAsync(
  supabase: ReturnType<typeof createClient>,
  obj: VisionObject,
  provider: string,
) {
  const content = `## ${obj.nome}\n${obj.descricao}\nConfiança: ${obj.confianca}% | Provider: ${provider}`;
  supabase.from("neural_knowledge_base").insert({
    title: `Vision Protocol: ${obj.nome}`,
    content,
    source_type: "vision_protocol",
    category: "vision_learning",
    tags: ["vision", "auto-learned", provider, ...(obj.categorias || [])],
    is_processed: false,
  }).then(() => {}).catch(() => {});
}

// ═══ Protocol cache (in-memory, refreshed every 2 min) ═══
let _protocolCache: { map: Map<string, string>; ts: number } | null = null;
const PROTOCOL_CACHE_TTL = 120_000;

async function getProtocols(supabase: ReturnType<typeof createClient>): Promise<Map<string, string>> {
  if (_protocolCache && Date.now() - _protocolCache.ts < PROTOCOL_CACHE_TTL) {
    return _protocolCache.map;
  }
  const { data } = await supabase
    .from("neural_knowledge_base")
    .select("title")
    .eq("source_type", "vision_protocol")
    .eq("category", "vision_learning")
    .limit(200);

  const map = new Map<string, string>();
  if (data) {
    for (const row of data) {
      const label = row.title?.replace("Vision Protocol: ", "") || "";
      if (label) map.set(label.toLowerCase(), label);
    }
  }
  _protocolCache = { map, ts: Date.now() };
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

    // Fetch protocols (cached) — non-blocking if cache is warm
    const existingProtocols = await getProtocols(supabase);
    const protocolCount = existingProtocols.size;

    // ═══ MODE: TEACH ═══
    if (mode === "teach" && teach_label) {
      const { result, provider, durationMs } = await callVisionCascade(
        image_base64, mime_type,
        `Descreva "${teach_label}" para identificação futura. ${context}`,
      );

      const obj = result.objetos[0] || { nome: teach_label, descricao: "", confianca: 0 };
      obj.nome = teach_label;
      storeProtocolAsync(supabase, obj, provider);

      // Metrics: fire-and-forget
      supabase.from("ai_metrics").insert({
        provider: `vision_teach_${provider}`,
        total_duration_ms: Date.now() - startTime,
        success: true,
        query: `vision:teach:${teach_label}`,
      }).then(() => {}).catch(() => {});

      return new Response(JSON.stringify({
        success: true,
        learned: teach_label,
        description: obj.descricao,
        provider,
        duration_ms: durationMs,
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
      const hasProtocol = existingProtocols.has(d.label.toLowerCase());
      detections.push({
        objeto: d.label,
        descricao: `Confiança local: ${(d.confidence * 100).toFixed(0)}%`,
        confianca: d.confidence * 100,
        bbox: d.bbox,
        source: hasProtocol ? "hybrid_protocol" : "local",
      });
    }

    if (uncertainLocal.length > 0 || local_detections.length === 0) {
      const prompt =
        mode === "analyze"
          ? `Analise objetos, pessoas, textos, logos, emoções, contexto. Seja específico. ${context}`
          : mode === "describe"
          ? `Descrição detalhada da cena. Nomes EXATOS de objetos. ${context}`
          : uncertainLocal.length > 0
          ? `Confirme: ${uncertainLocal.map((d: any) => `"${d.label}" (${(d.confidence * 100).toFixed(0)}%)`).join(", ")}. Mais objetos? ${context}`
          : `Identifique TODOS os objetos com nomes EXATOS. ${context}`;

      const { result, provider, durationMs } = await callVisionCascade(image_base64, mime_type, prompt);
      usedProvider = provider;

      for (const obj of result.objetos) {
        const labelKey = obj.nome.toLowerCase();
        let protocolCreated = false;

        if (!existingProtocols.has(labelKey) && obj.confianca >= 75) {
          storeProtocolAsync(supabase, obj, provider);
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

      if (result.cena || result.texto_detectado) {
        detections.push({
          objeto: "📸 Cena",
          descricao: [
            result.cena ? `Cena: ${result.cena}` : "",
            result.texto_detectado ? `Texto: ${result.texto_detectado}` : "",
          ].filter(Boolean).join(" | "),
          confianca: 100,
          source: "scene_analysis",
        });
      }
    }

    const totalDuration = Date.now() - startTime;

    // Metrics: fire-and-forget
    supabase.from("ai_metrics").insert({
      provider: `vision_hybrid_${usedProvider}`,
      total_duration_ms: totalDuration,
      success: true,
      query: `vision:${mode}`,
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({
      detections,
      mode,
      provider_used: usedProvider,
      providers_available: VISION_PROVIDERS.map(p => ({
        id: p.id,
        name: p.name,
        has_key: !!resolveKey(p),
        vision: p.supportsVision,
      })),
      protocols_available: protocolCount,
      auto_learned: detections.filter(d => d.protocol_created).length,
      evolution_status: usedProvider === "local_protocol"
        ? `🧠 100% offline — ${protocolCount} protocolos`
        : `🌐 ${usedProvider} | ${protocolCount} protocolos`,
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
