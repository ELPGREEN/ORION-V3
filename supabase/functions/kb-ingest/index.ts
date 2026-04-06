import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { entries } = await req.json();
    if (!Array.isArray(entries) || entries.length === 0) {
      return new Response(JSON.stringify({ error: "entries array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Deduplicate: check existing titles to prevent redundant entries
    const titles = entries.map((e: Record<string, unknown>) => e.title).filter(Boolean);
    const { data: existing } = await supabase
      .from("neural_knowledge_base")
      .select("title")
      .in("title", titles);

    const existingTitles = new Set((existing || []).map((r: { title: string }) => r.title));

    const rows = entries
      .filter((e: Record<string, unknown>) => !existingTitles.has(e.title as string))
      .map((e: Record<string, unknown>) => ({
        title: e.title,
        content: e.content,
        source_type: e.source_type || "documentation",
        category: e.category || "general",
        tags: e.tags || [],
        is_processed: false,
      }));

    if (rows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, skipped: entries.length, reason: "all entries already exist" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error } = await supabase.from("neural_knowledge_base").insert(rows);
    if (error) throw error;

    return new Response(JSON.stringify({ inserted: rows.length, skipped: entries.length - rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
