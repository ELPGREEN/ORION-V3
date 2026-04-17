// Zilliz Cloud (Milvus) edge function — semantic search + insert
// Uses Gemini embedding-001 (768d) to vectorize text, then queries Zilliz REST v2 API.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZILLIZ_ENDPOINT = Deno.env.get("ZILLIZ_ENDPOINT")!;
const ZILLIZ_TOKEN = Deno.env.get("ZILLIZ_TOKEN")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const EMBED_DIM = 768;
const DEFAULT_COLLECTION = "orion_memory";

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
  await zilliz("/v2/vectordb/collections/create", {
    collectionName: name,
    dimension: EMBED_DIM,
    metricType: "COSINE",
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
    const { action = "search", query, text, items, topK = 5, collection = DEFAULT_COLLECTION, filter } =
      await req.json();

    await ensureCollection(collection);

    // ─── INSERT ──────────────────────────────────────────────────────
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
      return new Response(JSON.stringify({ ok: true, inserted: data.length, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SEARCH ──────────────────────────────────────────────────────
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
      outputFields: ["text", "*"],
      ...(filter ? { filter } : {}),
    });
    return new Response(JSON.stringify({ ok: true, results: result.data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
