import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { action, params } = body;

    // ═══ AI Services — Bridge to Internal AI Orchestrator (No more mocks) ═══
    if (action === "vision_analyze" || action === "nl_analyze") {
      console.log(`[GoogleBridge] Redirecting ${action} to ai-orchestrator`);
      const { data, error } = await supabaseAdmin.functions.invoke("ai-orchestrator", {
        body: {
          prompt: action === "vision_analyze" ? "Descreva esta imagem" : params.text,
          imageBase64: params.imageBase64,
          useCase: action === "vision_analyze" ? "vision" : "analysis",
        }
      });
      if (error) throw error;
      return json(data);
    }

    if (action === "translation_api") {
      const { text, targetLanguage } = params;
      const { data, error } = await supabaseAdmin.functions.invoke("translate-text", {
        body: { text, targetLanguage }
      });
      if (error) throw error;
      return json(data);
    }

    // ═══ YouTube Services — Using Real API ═══
    if (action === "youtube_search") {
      // Logic already exists in previous version using YOUTUBE_API_KEY
      // Re-implementing search logic from original file...
      const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");
      if (!youtubeApiKey) return json({ error: "YOUTUBE_API_KEY not configured" }, 500);
      
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("q", params.query);
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("key", youtubeApiKey);
      
      const resp = await fetch(searchUrl.toString());
      const data = await resp.json();
      return json(data);
    }

    // ═══ Other Google Services (Gmail/Calendar/Ads) ═══
    // These still require individual API configurations.
    // Returning structured errors instead of success-mocks for non-configured services.

    const googleToken = Deno.env.get("GOOGLE_ACCESS_TOKEN");
    if (!googleToken) {
      return json({
        error: "Google integration not fully configured (Missing GOOGLE_ACCESS_TOKEN)",
        action,
        status: "unconfigured"
      }, 503);
    }

    return json({ error: "Service under migration to Google Cloud Console v3" }, 501);

  } catch (e) {
    return json({ error: e.message || "Internal error" }, 500);
  }
});
