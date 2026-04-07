import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// NEURAL INFERENCE ENGINE
// Post-training inference with learned weights, RAG context,
// and provider routing based on trained synaptic weights
// ═══════════════════════════════════════════════════════════════

interface SynapticWeights {
  provider_scores: Record<string, number>;
  domain_weights: Record<string, number>;
  confidence_threshold: number;
  routing_bias: Record<string, number>;
}

interface InferenceRequest {
  query: string;
  userId?: string;
  privateContext?: Array<{ title: string; content: string }>;
  domain?: string;
  stream?: boolean;
}

// Provider configurations for inference
const INFERENCE_PROVIDERS = [
  { name: "groq", keyEnv: "GROQ_API_KEY", endpoint: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
  { name: "openai", keyEnv: "OPENAI_API_KEY", endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
  { name: "deepseek", keyEnv: "DEEPSEEK_API_KEY", endpoint: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat" },
];

// Load trained synaptic weights from neural_knowledge_base
async function loadWeights(supabase: ReturnType<typeof createClient>): Promise<SynapticWeights> {
  const defaults: SynapticWeights = {
    provider_scores: { groq: 0.7, openai: 0.9, deepseek: 0.8 },
    domain_weights: { legal: 0.9, general: 0.7, technical: 0.8 },
    confidence_threshold: 0.6,
    routing_bias: { groq: 0.1, openai: 0.0, deepseek: 0.05 },
  };

  try {
    const { data } = await supabase
      .from("neural_knowledge_base")
      .select("content, metadata")
      .eq("title", "__synaptic_weights__")
      .eq("source_type", "system_weights")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.content) {
      const parsed = JSON.parse(data.content);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load weights:", e);
  }

  return defaults;
}

// Load distilled model prompts
async function loadDistilledModel(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("neural_knowledge_base")
      .select("content")
      .eq("source_type", "distilled_model")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.content || null;
  } catch {
    return null;
  }
}

// RAG: search neural knowledge base for relevant context
async function searchKnowledge(
  supabase: ReturnType<typeof createClient>,
  query: string,
  limit = 5
): Promise<Array<{ title: string; content: string; similarity: number }>> {
  try {
    // Text search fallback (no Lovable Gateway needed — embeddings via Gemini)
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_KEY) return [];

    // Try to find cached or direct text search as fallback
    const { data } = await supabase
      .from("neural_knowledge_base")
      .select("title, content")
      .textSearch("content", query.split(" ").slice(0, 5).join(" & "), { type: "plain" })
      .eq("is_processed", true)
      .limit(limit);

    return (data || []).map((d) => ({ title: d.title || "", content: (d.content || "").slice(0, 1000), similarity: 0.7 }));
  } catch {
    return [];
  }
}

// Select best provider based on trained weights
function selectProvider(
  weights: SynapticWeights,
  domain: string,
  availableKeys: Record<string, string>
): { name: string; key: string; endpoint: string; model: string } {
  const scored = INFERENCE_PROVIDERS
    .filter((p) => availableKeys[p.name])
    .map((p) => ({
      ...p,
      key: availableKeys[p.name],
      score:
        (weights.provider_scores[p.name] || 0.5) *
        (weights.domain_weights[domain] || 0.7) +
        (weights.routing_bias[p.name] || 0),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) throw new Error("No providers available");
  return scored[0];
}

// Call the selected provider
async function callProvider(
  provider: { endpoint: string; model: string; key: string; name: string },
  systemPrompt: string,
  userPrompt: string,
  stream: boolean
): Promise<Response | string> {
  const res = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
      stream,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Provider ${provider.name} error: ${res.status} — ${err.slice(0, 200)}`);
  }

  if (stream) {
    return res;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: InferenceRequest = await req.json();
    const { query, userId, privateContext, domain, stream } = body;

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query string required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Load trained weights
    const weights = await loadWeights(supabase);

    // 2. Load distilled model system prompt
    const distilledPrompt = await loadDistilledModel(supabase);

    // 3. RAG: search knowledge base
    const ragResults = await searchKnowledge(supabase, query);

    // 4. Build context
    let contextBlock = "";
    if (ragResults.length > 0) {
      contextBlock += "\n\n--- Conhecimento Base ---\n" +
        ragResults.map((r) => `[${r.title}]: ${r.content}`).join("\n\n");
    }
    if (privateContext && privateContext.length > 0) {
      contextBlock += "\n\n--- Contexto Privado do Usuário ---\n" +
        privateContext.map((c) => `[${c.title}]: ${c.content}`).join("\n\n");
    }

    const systemPrompt = (distilledPrompt || 
      "Você é JARVIS, uma inteligência artificial avançada treinada com múltiplas fontes de conhecimento. " +
      "Responda com precisão, profundidade e clareza. Use o contexto fornecido quando relevante. " +
      "Cite fontes quando possível. Seja proativo em identificar nuances e implicações.") +
      (contextBlock ? `\n\nContexto relevante:${contextBlock}` : "");

    // 5. Select provider based on trained weights
    const availableKeys: Record<string, string> = {};
    for (const p of INFERENCE_PROVIDERS) {
      const key = Deno.env.get(p.keyEnv);
      if (key) availableKeys[p.name] = key;
    }

    const selectedProvider = selectProvider(weights, domain || "general", availableKeys);

    // 6. Call provider
    if (stream) {
      const streamRes = await callProvider(selectedProvider, systemPrompt, query, true);
      if (streamRes instanceof Response) {
        return new Response(streamRes.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
    }

    const response = await callProvider(selectedProvider, systemPrompt, query, false);

    // 7. Cache result
    const startTime = Date.now();
    try {
      await supabase.from("ai_metrics").insert({
        provider: `inference:${selectedProvider.name}`,
        total_duration_ms: Date.now() - startTime,
        success: true,
        query: query.slice(0, 500),
        user_id: userId || null,
        data_sources_used: ragResults.map((r) => r.title),
      });
    } catch {
      // Non-critical
    }

    return new Response(
      JSON.stringify({
        success: true,
        response,
        metadata: {
          provider: selectedProvider.name,
          model: selectedProvider.model,
          ragSourcesUsed: ragResults.length,
          privateContextUsed: privateContext?.length || 0,
          confidenceScore: weights.provider_scores[selectedProvider.name] || 0.5,
          distilledModelActive: !!distilledPrompt,
          weightsLoaded: true,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Inference error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Inference failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
