/**
 * HF Voice TTS — HuggingFace Inference API text-to-speech
 * Supports multiple models with fallback cascade.
 * Primary: facebook/mms-tts-por (Portuguese)
 * Fallback: espnet/kan-bayashi_ljspeech_vits (English)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODELS = [
  "facebook/mms-tts-por",
  "espnet/kan-bayashi_ljspeech_vits",
];

function getHFToken(): string {
  const tokens = [
    Deno.env.get("HUGGINGFACE_API_KEY"),
    Deno.env.get("HF_TOKEN"),
    Deno.env.get("HF_WRITE_TOKEN"),
    Deno.env.get("CHAVE_API_HUGGINGFACE"),
  ].filter(Boolean) as string[];
  if (tokens.length === 0) throw new Error("No HuggingFace token configured");
  return tokens[Math.floor(Date.now() / 1000) % tokens.length];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, model } = await req.json();
    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanText = text.trim().slice(0, 3000);
    const token = getHFToken();
    const modelsToTry = model ? [model, ...MODELS] : MODELS;

    for (const m of modelsToTry) {
      try {
        const resp = await fetch(`https://api-inference.huggingface.co/models/${m}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ inputs: cleanText }),
        });

        if (!resp.ok) { await resp.text(); continue; }

        const ct = resp.headers.get("content-type") || "";
        if (ct.includes("audio/")) {
          const audio = await resp.arrayBuffer();
          if (audio.byteLength > 100) {
            console.log(`[HF-Voice] ✅ ${m} → ${(audio.byteLength / 1024).toFixed(1)}KB`);
            return new Response(audio, {
              headers: { ...corsHeaders, "Content-Type": ct, "X-TTS-Model": m },
            });
          }
        }
        await resp.text();
      } catch (e) {
        console.warn(`[HF-Voice] ${m} failed:`, (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ error: "All HF TTS models unavailable", fallback: true }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[HF-Voice] Error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message, fallback: true }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
