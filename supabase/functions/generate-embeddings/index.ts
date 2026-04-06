import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ⚠️ CRITICAL: OpenAI text-embedding-3-small (768d) MUST be primary.
// neural-search uses OpenAI for query embeddings — document embeddings MUST match.
// Using different models (Mistral, HF) produces incompatible vector spaces.
function getEmbeddingProviders(): Array<{ name: string; apiKey: string; type: string }> {
  const providers: Array<{ name: string; apiKey: string; type: string }> = [];

  // OpenAI FIRST — matches neural-search query embeddings (text-embedding-3-small 768d)
  const openaiKeys = [
    Deno.env.get("OPENAI_API_KEY"),
    Deno.env.get("OPENAI_API_KEY_2"),
  ].filter(Boolean);
  for (const key of openaiKeys) {
    providers.push({ name: "openai", apiKey: key!, type: "openai" });
  }

  // Gemini as fallback (can output 768d natively)
  const geminiKeys = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
  ].filter(Boolean);
  for (const key of geminiKeys) {
    providers.push({ name: "gemini", apiKey: key!, type: "gemini" });
  }

  // NOTE: Mistral and HuggingFace REMOVED from pipeline.
  // They produce embeddings in different vector spaces (1024d truncated / 384d padded)
  // which are incompatible with OpenAI query embeddings in neural-search.

  return providers;
}

async function generateEmbeddingOpenAI(text: string, apiKey: string): Promise<number[]> {
  const truncated = text.slice(0, 8000);
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: truncated,
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embedding error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data?.data?.[0]?.embedding || [];
}

async function generateEmbeddingGemini(text: string, apiKey: string): Promise<number[]> {
  const truncated = text.slice(0, 8000);
  
  // Try Gemini embedding models with multiple API versions
  const configs = [
    { model: "text-embedding-004", version: "v1beta" },
    { model: "text-embedding-004", version: "v1" },
    { model: "gemini-embedding-exp-03-07", version: "v1beta" },
    { model: "embedding-001", version: "v1beta" },
    { model: "embedding-001", version: "v1" },
  ];
  
  for (const { model, version } of configs) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models/${model}:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { parts: [{ text: truncated }] },
            ...(model !== "embedding-001" ? { outputDimensionality: 768 } : {}),
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Gemini ${model}/${version} failed (${response.status}): ${errText.slice(0, 100)}`);
        continue;
      }

      const data = await response.json();
      const values = data?.embedding?.values;
      if (values && values.length > 0) {
        // Truncate/pad to 768 dims
        if (values.length >= 768) return values.slice(0, 768);
        return [...values, ...new Array(768 - values.length).fill(0)];
      }
    } catch (e) {
      console.warn(`Gemini ${model}/${version} exception:`, e.message);
      continue;
    }
  }
  
  throw new Error("All Gemini embedding models failed");
}

async function generateEmbeddingHuggingFace(text: string, apiKey: string): Promise<number[]> {
  const truncated = text.slice(0, 8000);
  const models = [
    "BAAI/bge-small-en-v1.5",
    "sentence-transformers/all-MiniLM-L6-v2",
  ];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://router.huggingface.co/hf-inference/models/${model}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            inputs: truncated,
            options: { wait_for_model: true },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`HF ${model} failed (${response.status}): ${errText.slice(0, 100)}`);
        continue;
      }

      const data = await response.json();
      // HF returns array of floats directly or nested array
      const emb = Array.isArray(data?.[0]) ? data[0] : data;
      if (emb && emb.length > 0) {
        // Pad or truncate to 768
        if (emb.length >= 768) return emb.slice(0, 768);
        return [...emb, ...new Array(768 - emb.length).fill(0)];
      }
    } catch (e) {
      console.warn(`HF ${model} exception:`, e.message);
      continue;
    }
  }

  throw new Error("All HuggingFace embedding models failed");
}

async function generateEmbeddingMistral(text: string, apiKey: string): Promise<number[]> {
  const truncated = text.slice(0, 8000);
  const response = await fetch("https://api.mistral.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-embed",
      input: [truncated],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mistral embedding error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const emb = data?.data?.[0]?.embedding;
  if (!emb) throw new Error("No embedding from Mistral");
  
  // Mistral returns 1024-dim, truncate to 768
  return emb.slice(0, 768);
}

async function generateEmbedding(
  text: string,
  providers: Array<{ name: string; apiKey: string; type: string }>
): Promise<{ embedding: number[]; provider: string }> {
  for (const provider of providers) {
    try {
      let embedding: number[];
      if (provider.type === "gemini") {
        embedding = await generateEmbeddingGemini(text, provider.apiKey);
      } else if (provider.type === "mistral") {
        embedding = await generateEmbeddingMistral(text, provider.apiKey);
      } else if (provider.type === "huggingface") {
        embedding = await generateEmbeddingHuggingFace(text, provider.apiKey);
      } else {
        embedding = await generateEmbeddingOpenAI(text, provider.apiKey);
      }
      if (embedding.length > 0) {
        return { embedding, provider: provider.name };
      }
    } catch (e) {
      console.warn(`Provider ${provider.name} failed:`, e.message);
      continue;
    }
  }
  throw new Error("All embedding providers failed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: accept any valid JWT (anon for cron, service-role, or user)
    // Also accept SUPABASE_SERVICE_ROLE_KEY directly (used by cron functions)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // First check if it's the service role key directly (cron-to-edge calls)
    const envServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (token === envServiceKey) {
      // Service role key matched — authorized (cron pipeline)
      console.log("[Auth] Service role key matched directly — cron authorized");
    } else {
      // Decode JWT payload to check role — accept anon, service_role, or authenticated
      try {
        const parts = token.split(".");
        if (parts.length < 2) throw new Error("Not a JWT");
        const payload = JSON.parse(atob(parts[1]));
        const role = payload.role;
        if (!["anon", "service_role", "authenticated"].includes(role)) {
          throw new Error("Invalid role");
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "Não autorizado. Faça login novamente." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(body.batchSize || 100, 200); // v11.1: batch padrão 100 (antes: 20)
    const target = body.target || "both"; // "neural", "legal", "both"

    const providers = getEmbeddingProviders();
    if (providers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No embedding API keys configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🧠 Starting embedding generation (batch=${batchSize}, target=${target}, providers=${providers.map(p => p.name).join(",")})`);

    const results = { neural: { processed: 0, failed: 0 }, legal: { processed: 0, failed: 0 } };

    // Process neural_knowledge_base
    if (target === "both" || target === "neural") {
      // Use RPC to bypass PostgREST vector null filter bug with vector columns
      const { data: neuralItems, error: neuralError } = await supabase
        .rpc("get_items_needing_embeddings", { batch_limit: batchSize });

      if (neuralError) {
        console.error("Error fetching neural items:", neuralError);
      } else if (neuralItems && neuralItems.length > 0) {
        console.log(`📦 Processing ${neuralItems.length} neural_knowledge_base items`);

        const PARALLEL_BATCH = Math.min(3, providers.length);
        for (let i = 0; i < neuralItems.length; i += PARALLEL_BATCH) {
          const batch = neuralItems.slice(i, i + PARALLEL_BATCH);
          const batchResults = await Promise.allSettled(
            batch.map(async (item, idx) => {
              const text = `${item.title}\n\n${item.content}`.trim();
              if (text.length < 10) {
                // Skip items with no meaningful content
                await supabase.from("neural_knowledge_base")
                  .update({ is_processed: true })
                  .eq("id", item.id);
                return { id: item.id, provider: "skip", title: item.title };
              }
              const providerIdx = (i + idx) % providers.length;
              const rotatedProviders = [...providers.slice(providerIdx), ...providers.slice(0, providerIdx)];
              const { embedding, provider } = await generateEmbedding(text, rotatedProviders);
              const vectorStr = `[${embedding.join(",")}]`;

              const { error: updateError } = await supabase
                .from("neural_knowledge_base")
                .update({ embedding: vectorStr, is_processed: true })
                .eq("id", item.id);

              if (updateError) throw updateError;
              return { id: item.id, provider, title: item.title };
            })
          );

          for (const r of batchResults) {
            if (r.status === "fulfilled") {
              results.neural.processed++;
              console.log(`✅ Neural [${r.value.provider}]: ${r.value.title.slice(0, 60)}...`);
            } else {
              results.neural.failed++;
              console.error("❌ Neural batch failed:", r.reason);
            }
          }

          if (i + PARALLEL_BATCH < neuralItems.length) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      } else {
        console.log("✅ All neural_knowledge_base items already have embeddings");
      }
    }

    // Process legal_embeddings
    if (target === "both" || target === "legal") {
      const { data: legalItems, error: legalError } = await supabase
        .from("legal_embeddings")
        .select("id, title, content, source")
        .is("embedding", null)
        .limit(batchSize);

      if (legalError) {
        console.error("Error fetching legal items:", legalError);
      } else if (legalItems && legalItems.length > 0) {
        console.log(`📦 Processing ${legalItems.length} legal_embeddings items`);

        const PARALLEL_BATCH = Math.min(3, providers.length);
        for (let i = 0; i < legalItems.length; i += PARALLEL_BATCH) {
          const batch = legalItems.slice(i, i + PARALLEL_BATCH);
          const batchResults = await Promise.allSettled(
            batch.map(async (item, idx) => {
              const text = `${item.title}\n\n${item.content}`.trim();
              const providerIdx = (i + idx) % providers.length;
              const rotatedProviders = [...providers.slice(providerIdx), ...providers.slice(0, providerIdx)];
              const { embedding, provider } = await generateEmbedding(text, rotatedProviders);
              const vectorStr = `[${embedding.join(",")}]`;

              const { error: updateError } = await supabase
                .from("legal_embeddings")
                .update({ embedding: vectorStr })
                .eq("id", item.id);

              if (updateError) throw updateError;
              return { id: item.id, provider, title: item.title };
            })
          );

          for (const r of batchResults) {
            if (r.status === "fulfilled") {
              results.legal.processed++;
              console.log(`✅ Legal [${r.value.provider}]: ${r.value.title.slice(0, 60)}...`);
            } else {
              results.legal.failed++;
              console.error("❌ Legal batch failed:", r.reason);
            }
          }

          if (i + PARALLEL_BATCH < legalItems.length) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      } else {
        console.log("✅ All legal_embeddings items already have embeddings");
      }
    }

    // Check remaining — use RPC to avoid PostgREST vector null filter bug
    const { data: neuralRemainingData } = await supabase
      .rpc("count_items_needing_embeddings");
    const neuralRemaining = neuralRemainingData || 0;

    const { count: legalRemaining } = await supabase
      .from("legal_embeddings")
      .select("id", { count: "exact", head: true })
      .is("embedding", null);

    const summary = {
      ...results,
      remaining: {
        neural: neuralRemaining || 0,
        legal: legalRemaining || 0,
      },
      providers_used: providers.map((p) => p.name),
    };

    console.log(`🏁 Done:`, JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
