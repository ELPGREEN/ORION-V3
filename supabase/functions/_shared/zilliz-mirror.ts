// ─── Zilliz Mirror — Fase 1 dual-write helper ───
// Fire-and-forget: never blocks, never throws upstream.
// Mirrors knowledge writes to Zilliz collection `orion_memory`.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export interface MirrorItem {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * Mirror items to Zilliz in background. Never throws.
 * Call without await — it's fire-and-forget by design.
 */
export function mirrorToZilliz(items: MirrorItem[], collection = "orion_memory"): void {
  if (!items?.length) return;

  // Use queueMicrotask + Promise so it runs after current response is sent
  queueMicrotask(() => {
    fetch(`${SUPABASE_URL}/functions/v1/zilliz-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: "insert", items, collection }),
    })
      .then((r) => {
        if (!r.ok) console.warn(`[zilliz-mirror] HTTP ${r.status}`);
      })
      .catch((e) => console.warn("[zilliz-mirror] failed:", (e as Error).message));
  });
}
