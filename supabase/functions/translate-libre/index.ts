import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LIBRE_MIRRORS = [
  "https://libretranslate.com",
  "https://translate.argosopentech.com",
  "https://translate.terraprint.co",
];

async function tryLibreTranslate(
  text: string,
  source: string,
  target: string
): Promise<{ translatedText: string; engine: string } | null> {
  for (const mirror of LIBRE_MIRRORS) {
    try {
      const resp = await fetch(`${mirror}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: source || "auto",
          target,
          format: "text",
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.translatedText) {
          return { translatedText: data.translatedText, engine: "libretranslate" };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function tryGoogleTranslate(
  text: string,
  source: string,
  target: string,
  apiKey: string
): Promise<{ translatedText: string; detectedSource?: string; engine: string } | null> {
  try {
    const payload: Record<string, unknown> = { q: text, target, format: "text" };
    if (source && source !== "auto") payload.source = source;

    const resp = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (resp.ok) {
      const data = await resp.json();
      const t = data.data?.translations?.[0];
      if (t?.translatedText) {
        return {
          translatedText: t.translatedText,
          detectedSource: t.detectedSourceLanguage,
          engine: "google",
        };
      }
    }
  } catch {
    // fall through
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage, sourceLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Provide text and targetLanguage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) Try LibreTranslate (open-source, no API key)
    const libreResult = await tryLibreTranslate(text, sourceLanguage || "", targetLanguage);
    if (libreResult) {
      return new Response(
        JSON.stringify({
          translatedText: libreResult.translatedText,
          engine: libreResult.engine,
          originalLength: text.length,
          translatedLength: libreResult.translatedText.length,
          targetLanguage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Fallback to Google Translate
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (GOOGLE_API_KEY) {
      const googleResult = await tryGoogleTranslate(text, sourceLanguage || "", targetLanguage, GOOGLE_API_KEY);
      if (googleResult) {
        return new Response(
          JSON.stringify({
            translatedText: googleResult.translatedText,
            detectedSourceLanguage: googleResult.detectedSource,
            engine: googleResult.engine,
            originalLength: text.length,
            translatedLength: googleResult.translatedText.length,
            targetLanguage,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "All translation engines unavailable" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: "Translation processing error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
