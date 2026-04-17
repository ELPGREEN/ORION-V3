// ─── Zilliz Collections — Fase 4 helpers ───
// Specialized collections: faces (512d L2), voices (256d COSINE), legal (768d COSINE).
// All helpers are fire-and-forget for inserts, awaitable for searches.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export type CollectionName = "orion_faces" | "orion_voices" | "orion_legal" | "orion_memory";

export interface VectorItem {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

export interface SearchHit {
  id: string;
  distance: number;
  [k: string]: unknown;
}

/** Insert raw pre-computed vectors (faces/voices). Fire-and-forget. */
export function insertVectors(collection: CollectionName, items: VectorItem[]): void {
  if (!items?.length) return;
  queueMicrotask(() => {
    fetch(`${SUPABASE_URL}/functions/v1/zilliz-vectors`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ action: "insert", collection, items }),
    })
      .then((r) => { if (!r.ok) console.warn(`[zilliz-collections] insert ${collection} HTTP ${r.status}`); })
      .catch((e) => console.warn(`[zilliz-collections] insert ${collection} failed:`, (e as Error).message));
  });
}

/** Search by raw vector (faces/voices). Awaitable; returns [] on error. */
export async function searchByVector(
  collection: CollectionName,
  vector: number[],
  topK = 5,
  filter?: string,
): Promise<SearchHit[]> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/zilliz-vectors`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ action: "search", collection, vector, topK, filter }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const arr = Array.isArray(j.results) ? j.results : [];
    return (Array.isArray(arr[0]) ? arr[0] : arr) as SearchHit[];
  } catch (e) {
    console.warn(`[zilliz-collections] search ${collection} failed:`, (e as Error).message);
    return [];
  }
}

/** Insert text into legal collection (uses Gemini embedding via zilliz-search). Fire-and-forget. */
export function insertLegalText(items: { id: string; text: string; metadata?: Record<string, unknown> }[]): void {
  if (!items?.length) return;
  queueMicrotask(() => {
    fetch(`${SUPABASE_URL}/functions/v1/zilliz-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ action: "insert", collection: "orion_legal", items }),
    }).catch((e) => console.warn("[zilliz-collections] insertLegalText failed:", (e as Error).message));
  });
}

/** Search legal collection by text query (uses Gemini embedding). */
export async function searchLegal(query: string, topK = 8): Promise<SearchHit[]> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/zilliz-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ query, topK, collection: "orion_legal" }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (Array.isArray(j.results) ? j.results : []) as SearchHit[];
  } catch (e) {
    console.warn("[zilliz-collections] searchLegal failed:", (e as Error).message);
    return [];
  }
}
