import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// GROQ WHISPER STT — Speech-to-Text (FREE)
// 20 RPM, 2.000 RPD, 7.200 audio seconds/hour
// Models: whisper-large-v3, whisper-large-v3-turbo
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") || "";

    let formData: FormData;

    if (contentType.includes("multipart/form-data")) {
      // Direct audio upload
      formData = await req.formData();
    } else {
      // JSON with base64 audio
      const body = await req.json();
      const { audio, language, model } = body;

      if (!audio) {
        return new Response(JSON.stringify({ error: "audio (base64) required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decode base64 to blob
      const binaryStr = atob(audio.replace(/^data:audio\/\w+;base64,/, ""));
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "audio/webm" });

      formData = new FormData();
      formData.append("file", blob, "audio.webm");
      formData.append("model", model || "whisper-large-v3-turbo");
      if (language) formData.append("language", language);
      formData.append("response_format", "verbose_json");
    }

    // Ensure model is set
    if (!formData.get("model")) {
      formData.set("model", "whisper-large-v3-turbo");
    }
    if (!formData.get("response_format")) {
      formData.set("response_format", "verbose_json");
    }

    const startTime = Date.now();

    const resp = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[Whisper STT] Groq error:", resp.status, errText);
      return new Response(JSON.stringify({ error: `Groq Whisper error: ${resp.status}`, details: errText }), {
        status: resp.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await resp.json();
    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        text: result.text || "",
        language: result.language || "unknown",
        duration_ms: duration,
        segments: result.segments || [],
        metadata: {
          provider: "groq",
          model: formData.get("model") || "whisper-large-v3-turbo",
          audio_duration: result.duration || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[Whisper STT] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "STT failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
