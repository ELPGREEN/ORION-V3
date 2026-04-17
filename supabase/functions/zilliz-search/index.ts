// Zilliz Cloud (Milvus) edge function — semantic search + insert + anti-hallucination
// Uses Gemini embedding-001 (768d) to vectorize text, then queries Zilliz REST v2 API.
// Includes built-in anti-hallucination validation for legal responses.

import { 
  checkResponseAntiHallucination, 
  generateDisclaimer,
  verifyAgainstKnowledge,
  type HallucinationCheck 
} from "../_shared/zilliz-anti-hallucination.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZILLIZ_ENDPOINT = Deno.env.get("ZILLIZ_ENDPOINT")!;
const ZILLIZ_TOKEN = Deno.env.get("ZILLIZ_TOKEN")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const EMBED_DIM = 768;
const DEFAULT_COLLECTION = "orion_memory";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ZILLIZ_SEARCH_URL = `${SUPABASE_URL}/functions/v1/zilliz-search`;

// Per-collection schema config
const COLLECTION_CONFIG: Record<string, { dim: number; metric: "COSINE" | "L2" | "IP" }> = {
  orion_memory: { dim: 768, metric: "COSINE" },
  orion_legal: { dim: 768, metric: "COSINE" },
  orion_faces: { dim: 512, metric: "L2" },
  orion_voices: { dim: 256, metric: "COSINE" },
};

function cfgFor(name: string) {
  return COLLECTION_CONFIG[name] ?? { dim: EMBED_DIM, metric: "COSINE" as const };
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        outputDimensionality: EMBED_DIM,
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini embed failed: ${await res.text()}`);
  const json = await res.json();
  return json.embedding?.values ?? [];
}

async function zilliz(path: string, body: unknown) {
  const res = await fetch(`${ZILLIZ_ENDPOINT}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${ZILLIZ_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || (json.code && json.code !== 0 && json.code !== 200)) {
    throw new Error(`Zilliz error: ${JSON.stringify(json)}`);
  }
  return json;
}

async function ensureCollection(name: string) {
  const list = await zilliz("/v2/vectordb/collections/list", {});
  if ((list.data ?? []).includes(name)) return;
  const { dim, metric } = cfgFor(name);
  await zilliz("/v2/vectordb/collections/create", {
    collectionName: name,
    dimension: dim,
    metricType: metric,
    primaryFieldName: "id",
    idType: "VarChar",
    vectorFieldName: "vector",
    autoId: false,
    enableDynamicField: true,
    params: { max_length: 64 },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { 
      action = "search", 
      query, 
      text, 
      items, 
      topK = 5, 
      collection = DEFAULT_COLLECTION, 
      filter,
      // Anti-hallucination options
      validateResponse,
      responseToValidate,
      checkAgainstKnowledge = false,
    } = await req.json();

    await ensureCollection(collection);

    // ─── ANTI-HALLUCINATION CHECK ─────────────────────────────────────────────
    if (action === "validate") {
      if (!responseToValidate) {
        return new Response(JSON.stringify({ error: "responseToValidate required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Get context from Zilliz if available
      let retrievedContext: string[] | undefined;
      if (query && checkAgainstKnowledge) {
        try {
          const vector = await embed(query);
          const searchResult = await zilliz("/v2/vectordb/entities/search", {
            collectionName: "orion_legal",
            data: [vector],
            limit: 5,
            outputFields: ["text"],
          });
          retrievedContext = (searchResult.data ?? []).map((r: any) => r.text).filter(Boolean);
        } catch {
          // Ignore context retrieval errors
        }
      }
      
      const check = checkResponseAntiHallucination(
        responseToValidate,
        query || "",
        retrievedContext
      );
      
      // Verify against Zilliz knowledge base
      let verified;
      if (checkAgainstKnowledge && retrievedContext) {
        verified = {
          verified: retrievedContext.length > 0 && check.confidence > 60,
          sources: retrievedContext,
          confidence: check.confidence,
          matchedKnowledge: check.confidence > 60,
        };
      }
      
      const disclaimer = generateDisclaimer(check, verified);
      
      return new Response(JSON.stringify({
        ok: true,
        check,
        verified,
        disclaimer,
        metrics: {
          hasHallucination: check.hasHallucination,
          freeEnergy: check.freeEnergy,
          grade: check.grade,
          confidence: check.confidence,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── INSERT ──────────────────────────────────────────────────────────────
    if (action === "insert") {
      const list: { id: string; text: string; metadata?: Record<string, unknown> }[] =
        items ?? (text ? [{ id: crypto.randomUUID(), text }] : []);
      if (!list.length) {
        return new Response(JSON.stringify({ error: "no items to insert" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await Promise.all(
        list.map(async (it) => ({
          id: it.id,
          vector: await embed(it.text),
          text: it.text,
          ...(it.metadata ?? {}),
        })),
      );
      const result = await zilliz("/v2/vectordb/entities/insert", { collectionName: collection, data });
      
      // Trigger anti-hallucination cache update
      queueMicrotask(() => {
        fetch(`${SUPABASE_URL}/functions/v1/zilliz-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refresh_hallucination_cache" }),
        }).catch(() => {});
      });
      
      return new Response(JSON.stringify({ ok: true, inserted: data.length, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SEARCH ──────────────────────────────────────────────────────────────
    if (!query) {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const vector = await embed(query);
    const result = await zilliz("/v2/vectordb/entities/search", {
      collectionName: collection,
      data: [vector],
      limit: topK,
      outputFields: ["text"],
      ...(filter ? { filter } : {}),
    });
    
    // Include anti-hallucination context in search results
    const searchResults = result.data ?? [];
    
    // Extract context texts for anti-hallucination
    const contextTexts = searchResults.map((r: any) => r.text).filter(Boolean);
    
    // Run quick anti-hallucination check on retrieved context
    let hallucinationRisk = 0;
    for (const ctx of contextTexts) {
      const check = checkResponseAntiHallucination(ctx, query, []);
      hallucinationRisk += check.freeEnergy;
    }
    hallucinationRisk = hallucinationRisk / Math.max(contextTexts.length, 1);
    
    return new Response(JSON.stringify({ 
      ok: true, 
      results: searchResults,
      contextQuality: {
        hallucinationRisk,
        grade: hallucinationRisk > 50 ? "D" : hallucinationRisk > 30 ? "C" : hallucinationRisk > 15 ? "B" : "A",
        contextCount: contextTexts.length,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
