import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { text, targetLanguage, sourceLanguage } = body;

    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Provide text and targetLanguage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Split text into chunks of ~5000 chars to respect API limits
    const MAX_CHUNK = 5000;
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= MAX_CHUNK) {
        chunks.push(remaining);
        break;
      }
      // Find last sentence break within limit
      let breakPoint = remaining.lastIndexOf(". ", MAX_CHUNK);
      if (breakPoint === -1 || breakPoint < MAX_CHUNK * 0.5) {
        breakPoint = remaining.lastIndexOf(" ", MAX_CHUNK);
      }
      if (breakPoint === -1) breakPoint = MAX_CHUNK;
      chunks.push(remaining.substring(0, breakPoint + 1));
      remaining = remaining.substring(breakPoint + 1);
    }

    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      const translatePayload: Record<string, unknown> = {
        q: chunk,
        target: targetLanguage,
        format: "text",
      };
      if (sourceLanguage) {
        translatePayload.source = sourceLanguage;
      }

      const translateResponse = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(translatePayload),
        }
      );

      if (!translateResponse.ok) {
        const errorData = await translateResponse.text();
        throw new Error(`Translation API error [${translateResponse.status}]: ${errorData}`);
      }

      const translateData = await translateResponse.json();
      const translation = translateData.data?.translations?.[0];
      translatedChunks.push(translation?.translatedText || "");
    }

    const result = {
      translatedText: translatedChunks.join(""),
      detectedSourceLanguage:
        (await (async () => {
          // Detect from first chunk
          const detectPayload = { q: text.substring(0, 500) };
          const detectResp = await fetch(
            `https://translation.googleapis.com/language/translate/v2/detect?key=${GOOGLE_API_KEY}`,
            {
              method: "POST",
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              body: JSON.stringify(detectPayload),
            }
          );
          if (detectResp.ok) {
            const detectData = await detectResp.json();
            return detectData.data?.detections?.[0]?.[0]?.language || "unknown";
          }
          return "unknown";
        })()),
      originalLength: text.length,
      translatedLength: translatedChunks.join("").length,
      targetLanguage,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
