import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const fallbackResponse = (error: string, extra = {}) =>
  new Response(JSON.stringify({ error, fallback: true, ...extra }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const AI_STUDIO_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_VOICE = "Enceladus";
const DEFAULT_LANG = "pt-BR";

// Key rotation state
let _ttsRRIdx = 0;
const KEY_COOLDOWNS = new Map<string, number>();

function getAllGeminiKeys(): string[] {
  const names = ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_5", "GEMINI_API_KEY_6", "GEMINI_API_KEY_7"];
  const now = Date.now();
  const keys = names
    .map((n) => Deno.env.get(n))
    .filter((k): k is string => Boolean(k))
    .filter((k) => (KEY_COOLDOWNS.get(k) || 0) < now);

  if (keys.length === 0) return [];

  _ttsRRIdx = _ttsRRIdx % keys.length;
  const rotated = [...keys.slice(_ttsRRIdx), ...keys.slice(0, _ttsRRIdx)];
  _ttsRRIdx++;
  return rotated;
}

function pcmToWav(base64Pcm: string, sampleRate: number): Uint8Array {
  const binaryString = atob(base64Pcm);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, len, true);

  const finalWav = new Uint8Array(44 + len);
  finalWav.set(new Uint8Array(wavHeader));
  finalWav.set(bytes, 44);
  return finalWav;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, voice = DEFAULT_VOICE, lang = DEFAULT_LANG } = await req.json();
    if (!text?.trim()) return jsonResponse({ error: "Text required" }, 400);

    const keys = getAllGeminiKeys();
    if (keys.length === 0) return fallbackResponse("No available Gemini keys");

    for (const key of keys) {
      try {
        const url = `${AI_STUDIO_BASE}/gemini-2.5-flash:generateContent?key=${key}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Synthesize this text to audio in ${lang} with voice style ${voice}: ${text}` }] }],
            generationConfig: { response_mime_type: "audio/wav" }
          })
        });

        if (resp.status === 429) {
          KEY_COOLDOWNS.set(key, Date.now() + 60000);
          continue;
        }

        if (!resp.ok) continue;

        const data = await resp.json();
        const audioData = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;

        if (audioData) {
          const wav = pcmToWav(audioData, 24000);
          return new Response(wav, {
            headers: { ...corsHeaders, "Content-Type": "audio/wav" }
          });
        }
      } catch (e) {
        console.warn(`Key failed: ${e.message}`);
      }
    }

    return fallbackResponse("All TTS backends exhausted");
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
});
