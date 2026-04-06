import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ⚠️ CRITICAL: Gemini gemini-embedding-001 (768d, FREE) is the SOLE embedding provider.
// ALL functions (neural-search, ai-orchestrator, gerar-documento, neural-training)
// MUST use the same model to ensure vector space compatibility.
function getEmbeddingProviders(): Array<{ name: string; apiKey: string }> {
  const geminiKeys = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
    Deno.env.get("GEMINI_API_KEY_4"),
    Deno.env.get("GEMINI_API_KEY_5"),
    Deno.env.get("GEMINI_API_KEY_6"),
    Deno.env.get("GEMINI_API_KEY_7"),
  ].filter(Boolean) as string[];
  return geminiKeys.map(k => ({ name: "gemini", apiKey: k }));
}

async function generateEmbeddingSingle(text: string, apiKey: string): Promise<number[]> {
  const truncated = text.slice(0, 4000);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: truncated }] },
        outputDimensionality: 768,
      }),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini embedding error ${response.status}: ${err.slice(0, 200)}`);
  }
  const data = await response.json();
  const values = data?.embedding?.values;
  if (!values || values.length === 0) throw new Error("No embedding from Gemini");
  return values.length >= 768 ? values.slice(0, 768) : [...values, ...new Array(768 - values.length).fill(0)];
}

// Batch embedding via Gemini batchEmbedContents (up to 100 texts per call)
async function generateEmbeddingBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const requests = texts.map(t => ({
    model: "models/gemini-embedding-001",
    content: { parts: [{ text: t.slice(0, 4000) }] },
    outputDimensionality: 768,
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini batch embedding error ${response.status}: ${err.slice(0, 200)}`);
  }
  const data = await response.json();
  return (data?.embeddings || []).map((e: any) => {
    const v = e?.values || [];
    return v.length >= 768 ? v.slice(0, 768) : [...v, ...new Array(768 - v.length).fill(0)];
  });
}

async function generateEmbedding(
  text: string,
  providers: Array<{ name: string; apiKey: string }>
): Promise<{ embedding: number[]; provider: string }> {
  for (const provider of providers) {
    try {
      const embedding = await generateEmbeddingSingle(text, provider.apiKey);
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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const envServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (token === envServiceKey) {
      console.log("[Auth] Service role key matched directly — cron authorized");
    } else {
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
    const batchSize = Math.min(body.batchSize || 100, 200);
    const target = body.target || "both";

    const providers = getEmbeddingProviders();
    if (providers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No Gemini API keys configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🧠 Starting embedding generation (batch=${batchSize}, target=${target}, providers=${providers.length} Gemini keys)`);

    const results = { neural: { processed: 0, failed: 0 }, legal: { processed: 0, failed: 0 } };

    // Process neural_knowledge_base
    if (target === "both" || target === "neural") {
      const { data: neuralItems, error: neuralError } = await supabase
        .rpc("get_items_needing_embeddings", { batch_limit: batchSize });

      if (neuralError) {
        console.error("Error fetching neural items:", neuralError);
      } else if (neuralItems && neuralItems.length > 0) {
        console.log(`📦 Processing ${neuralItems.length} neural_knowledge_base items`);

        const meaningful = [];
        for (const item of neuralItems) {
          const text = `${item.title}\n\n${item.content}`.trim();
          if (text.length < 10) {
            await supabase.from("neural_knowledge_base")
              .update({ is_processed: true })
              .eq("id", item.id);
            results.neural.processed++;
            continue;
          }
          meaningful.push({ ...item, text });
        }

        // Gemini batch API — up to 20 per call, rotate keys
        const BATCH_SIZE = 20;
        for (let i = 0; i < meaningful.length; i += BATCH_SIZE) {
          const batch = meaningful.slice(i, i + BATCH_SIZE);
          const keyIdx = Math.floor(i / BATCH_SIZE) % providers.length;
          try {
            const embeddings = await generateEmbeddingBatch(
              batch.map(b => b.text),
              providers[keyIdx].apiKey
            );

            for (let j = 0; j < batch.length; j++) {
              const vectorStr = `[${embeddings[j].join(",")}]`;
              const { error: updateError } = await supabase
                .from("neural_knowledge_base")
                .update({ embedding: vectorStr, is_processed: true })
                .eq("id", batch[j].id);
              if (updateError) {
                console.error(`❌ Update failed for ${batch[j].id}:`, updateError);
                results.neural.failed++;
              } else {
                results.neural.processed++;
                console.log(`✅ Neural [gemini]: ${batch[j].title?.slice(0, 60)}...`);
              }
            }
          } catch (e) {
            console.error(`❌ Batch failed:`, e.message);
            // Fallback: one-by-one
            for (const b of batch) {
              try {
                const { embedding } = await generateEmbedding(b.text, providers);
                const vectorStr = `[${embedding.join(",")}]`;
                await supabase.from("neural_knowledge_base")
                  .update({ embedding: vectorStr, is_processed: true })
                  .eq("id", b.id);
                results.neural.processed++;
              } catch {
                results.neural.failed++;
              }
            }
          }

          if (i + BATCH_SIZE < meaningful.length) {
            await new Promise((r) => setTimeout(r, 500));
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

        const BATCH_SIZE = 20;
        for (let i = 0; i < legalItems.length; i += BATCH_SIZE) {
          const batch = legalItems.slice(i, i + BATCH_SIZE);
          const texts = batch.map(item => `${item.title}\n\n${item.content}`.trim());
          const keyIdx = Math.floor(i / BATCH_SIZE) % providers.length;

          try {
            const embeddings = await generateEmbeddingBatch(texts, providers[keyIdx].apiKey);

            for (let j = 0; j < batch.length; j++) {
              const vectorStr = `[${embeddings[j].join(",")}]`;
              const { error: updateError } = await supabase
                .from("legal_embeddings")
                .update({ embedding: vectorStr })
                .eq("id", batch[j].id);
              if (updateError) {
                results.legal.failed++;
              } else {
                results.legal.processed++;
                console.log(`✅ Legal [gemini]: ${batch[j].title?.slice(0, 60)}...`);
              }
            }
          } catch (e) {
            console.error(`❌ Legal batch failed:`, e.message);
            results.legal.failed += batch.length;
          }

          if (i + BATCH_SIZE < legalItems.length) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      } else {
        console.log("✅ All legal_embeddings items already have embeddings");
      }
    }

    // Check remaining
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
      providers_used: ["gemini"],
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
