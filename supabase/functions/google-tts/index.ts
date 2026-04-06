/**
 * Google Translate TTS — Free, unlimited text-to-speech
 * Replicates the gTTS Python library technique from eac-ufsm/texto-para-voz
 * Uses Google Translate's public TTS endpoint for PT-BR synthesis.
 * Supports text chunking (Google limits ~200 chars per request).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Google Translate TTS has a ~200 char limit per request
const CHUNK_SIZE = 190;

/**
 * Split text into chunks at sentence/word boundaries (same logic as gTTS)
 */
function splitTextIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Try to split at sentence boundary
    let splitAt = -1;
    for (const sep of [". ", "! ", "? ", "; ", ", ", " "]) {
      const idx = remaining.lastIndexOf(sep, maxLen);
      if (idx > maxLen * 0.3) {
        splitAt = idx + sep.length;
        break;
      }
    }

    if (splitAt === -1) splitAt = maxLen;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Fetch audio from Google Translate TTS for a single chunk
 */
async function fetchGoogleTTSChunk(
  text: string,
  lang: string,
  idx: number,
  total: number,
): Promise<Uint8Array> {
  const params = new URLSearchParams({
    ie: "UTF-8",
    q: text,
    tl: lang,
    client: "tw-ob",
    idx: String(idx),
    total: String(total),
    textlen: String(text.length),
  });

  const url = `https://translate.google.com/translate_tts?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://translate.google.com/",
    },
  });

  if (!response.ok) {
    throw new Error(`Google TTS chunk ${idx} failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, lang } = await req.json();
    const ttsLang = lang || "pt-br";

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Clean and truncate text (max 5000 chars)
    const cleanText = text.trim().slice(0, 5000);
    const chunks = splitTextIntoChunks(cleanText, CHUNK_SIZE);

    console.log(
      `[Google TTS] Synthesizing ${cleanText.length} chars in ${chunks.length} chunks (${ttsLang})`,
    );

    // Fetch all chunks in parallel (gTTS technique)
    const audioChunks = await Promise.all(
      chunks.map((chunk, idx) =>
        fetchGoogleTTSChunk(chunk, ttsLang, idx, chunks.length)
      ),
    );

    // Concatenate all MP3 chunks into a single buffer
    const totalLength = audioChunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(
      `[Google TTS] ✅ Generated ${(totalLength / 1024).toFixed(1)}KB audio`,
    );

    return new Response(combined.buffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Length": String(totalLength),
      },
    });
  } catch (error: any) {
    console.error("[Google TTS] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, fallback: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
