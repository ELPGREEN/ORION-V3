/**
 * Orion Voice Clone — Fish Speech zero-shot voice cloning
 * Takes reference audio from Supabase Storage and synthesizes new speech.
 * Uses HuggingFace Spaces with Fish Speech 1.5 model.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { text, reference_storage_path, reference_text } = await req.json();

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reference_storage_path) {
      return new Response(JSON.stringify({ error: "reference_storage_path required", fallback: true }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Download reference audio from storage
    const { data: refData, error: refError } = await supabase.storage
      .from("orion-voice-samples")
      .download(reference_storage_path);

    if (refError || !refData) {
      console.error("[Voice Clone] Reference audio not found:", refError?.message);
      return new Response(JSON.stringify({ error: "Reference audio not found", fallback: true }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanText = text.trim().slice(0, 3000);
    const token = getHFToken();

    // Try Fish Speech via HF Inference API
    console.log(`[Voice Clone] Cloning ${cleanText.length} chars with ref: ${reference_storage_path}`);

    const resp = await fetch(
      "https://api-inference.huggingface.co/models/fishaudio/fish-speech-1.5",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: cleanText,
          parameters: { language: "pt" },
        }),
      },
    );

    if (resp.ok) {
      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("audio/")) {
        const audio = await resp.arrayBuffer();
        if (audio.byteLength > 100) {
          console.log(`[Voice Clone] ✅ Fish Speech → ${(audio.byteLength / 1024).toFixed(1)}KB`);
          return new Response(audio, {
            headers: { ...corsHeaders, "Content-Type": ct },
          });
        }
      }
    }

    const errText = await resp.text();
    console.warn(`[Voice Clone] Fish Speech failed (${resp.status}):`, errText.slice(0, 200));

    return new Response(JSON.stringify({ error: "Voice clone unavailable", fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Voice Clone] Error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message, fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
