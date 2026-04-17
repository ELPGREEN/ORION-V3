// ─── RAG Search — Fase 3: Zilliz-first com fallback Postgres ───
// Drop-in replacement para search_neural_knowledge / match_neural_knowledge RPCs.
// Tenta Zilliz primeiro (HNSW, 10x mais rápido); se falhar, cai pro Supabase pgvector.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export interface RagHit {
  id: string;
  title: string;
  content: string;
  source_type?: string;
  similarity: number;
  origin: "zilliz" | "postgres";
}

export interface RagSearchOpts {
  query: string;
  embedding: number[];
  matchCount?: number;
  threshold?: number;
  filterType?: string | null;
  /** Postgres fallback function: ({ data, error }) => Promise<...> */
  pgFallback?: () => Promise<{ data: any; error: any }>;
  /** Map a Postgres row to RagHit shape */
  pgMap?: (row: any) => RagHit;
}

const ZILLIZ_TIMEOUT_MS = 2500;

async function zillizSearch(query: string, topK: number): Promise<RagHit[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ZILLIZ_TIMEOUT_MS);
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/zilliz-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ query, topK }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return [];
    const j = await r.json();
    const results = j.results?.[0] ?? j.results ?? [];
    return (Array.isArray(results) ? results : []).map((x: any) => {
      const text = String(x.text ?? "");
      const [titleLine, ...rest] = text.split("\n\n");
      return {
        id: x.id,
        title: titleLine?.substring(0, 200) || "",
        content: rest.join("\n\n") || text,
        source_type: x.source_type,
        similarity: typeof x.distance === "number" ? x.distance : 0,
        origin: "zilliz" as const,
      };
    });
  } catch (e) {
    clearTimeout(timer);
    console.warn("[rag-search] zilliz failed:", (e as Error).message);
    return [];
  }
}

/**
 * RAG search with Zilliz-first strategy and Postgres fallback.
 * Always returns an array — never throws.
 */
export async function ragSearch(opts: RagSearchOpts): Promise<RagHit[]> {
  const topK = opts.matchCount ?? 8;

  // 1) Try Zilliz
  const zHits = await zillizSearch(opts.query, topK);
  if (zHits.length >= Math.min(3, topK)) return zHits;

  // 2) Fallback to Postgres pgvector
  if (opts.pgFallback && opts.pgMap) {
    try {
      const { data, error } = await opts.pgFallback();
      if (!error && Array.isArray(data) && data.length) {
        return data.map(opts.pgMap);
      }
    } catch (e) {
      console.warn("[rag-search] pg fallback failed:", (e as Error).message);
    }
  }

  // 3) Return whatever zilliz gave (even if few)
  return zHits;
}
