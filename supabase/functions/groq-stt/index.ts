/**
 * Fast STT via Groq (Whisper Large v3 Turbo).
 * Opt-in alternative to google-stt — keeps mic continuous, only swaps the transcriber.
 * Falls back gracefully if Groq is unavailable; client should retry with google-stt.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface STTRequest {
  audio: string; // base64 LINEAR16 PCM
  sampleRate?: number;
  languageCode?: string; // BCP-47 (e.g. "pt-BR")
}

// Build a minimal WAV (RIFF) container around raw LINEAR16 PCM so Groq accepts it.
function wrapLinear16AsWav(pcmBytes: Uint8Array, sampleRate: number): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBytes.byteLength;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  new Uint8Array(buffer, 44).set(pcmBytes);
  return new Uint8Array(buffer);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  try {
    const { audio, sampleRate = 16000, languageCode = "pt-BR" } = (await req.json()) as STTRequest;
    if (!audio || typeof audio !== "string") {
      return new Response(JSON.stringify({ error: "audio (base64) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured", fallback: true }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pcm = base64ToBytes(audio);
    const wav = wrapLinear16AsWav(pcm, sampleRate);

    const form = new FormData();
    form.append("file", new Blob([wav], { type: "audio/wav" }), "audio.wav");
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");
    // Groq expects ISO-639-1 (e.g. "pt"), not BCP-47
    form.append("language", (languageCode || "pt-BR").split("-")[0].toLowerCase());

    const resp = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}` },
      body: form,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.warn("[groq-stt] upstream error", resp.status, errText.slice(0, 200));
      return new Response(
        JSON.stringify({ error: `groq ${resp.status}`, detail: errText.slice(0, 300), fallback: true }),
        { status: resp.status === 429 ? 429 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json();
    const text: string = (data?.text || "").trim();

    // Average segment confidence proxy (Whisper gives avg_logprob per segment).
    let confidence = 0;
    if (Array.isArray(data?.segments) && data.segments.length > 0) {
      const avg = data.segments.reduce((a: number, s: any) => a + (s.avg_logprob ?? 0), 0) / data.segments.length;
      // Map logprob (~ -1 .. 0) to (0..1)
      confidence = Math.max(0, Math.min(1, 1 + avg));
    } else if (text) {
      confidence = 0.85;
    }

    const latency = Date.now() - t0;
    return new Response(
      JSON.stringify({ text, confidence, language: data?.language ?? null, engine: "groq-whisper-v3-turbo", latency_ms: latency }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[groq-stt] error", e?.message);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown", fallback: true }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
