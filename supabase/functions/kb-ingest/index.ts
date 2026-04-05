import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const rows = entries.map((e: Record<string, unknown>) => ({
      title: e.title,
      content: e.content,
      source_type: e.source_type || "documentation",
      category: e.category || "general",
      tags: e.tags || [],
      is_processed: false,
    }));

    const { error } = await supabase.from("neural_knowledge_base").insert(rows);
    if (error) throw error;

    return new Response(JSON.stringify({ inserted: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
