// ─── Zilliz Backfill — Fase 2 ───
// Migrates existing neural_knowledge_base rows to Zilliz in resumable batches.
// Call repeatedly with ?cursor=<iso-date> until "done": true.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BATCH = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor"); // ISO timestamp
    const limit = Math.min(parseInt(url.searchParams.get("limit") || String(BATCH)), 200);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    let q = sb
      .from("neural_knowledge_base")
      .select("id, title, content, source_type, source_reference, tags, created_at")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (cursor) q = q.gt("created_at", cursor);

    const { data, error } = await q;
    if (error) throw error;

    if (!data?.length) {
      return new Response(JSON.stringify({ ok: true, done: true, migrated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = data
      .filter((r) => (r.title || r.content) && (r.content?.length ?? 0) > 5)
      .map((r) => ({
        id: r.id,
        text: `${r.title || ""}\n\n${r.content || ""}`.trim().substring(0, 4000),
        metadata: {
          source_type: r.source_type || "unknown",
          source_ref: r.source_reference || "",
          backfilled: true,
        },
      }));

    let inserted = 0;
    if (items.length) {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/zilliz-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ action: "insert", items }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`zilliz-search failed: ${JSON.stringify(j)}`);
      inserted = j.inserted ?? 0;
    }

    const lastCursor = data[data.length - 1].created_at;
    return new Response(
      JSON.stringify({
        ok: true,
        done: false,
        migrated: inserted,
        skipped: data.length - items.length,
        nextCursor: lastCursor,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
