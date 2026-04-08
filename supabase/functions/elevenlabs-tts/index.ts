/**
 * ElevenLabs TTS — DISABLED
 * This function is a stub. ElevenLabs is not used (too expensive).
 * All TTS requests should go to gemini-tts or orion-voice-engine.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  return new Response(
    JSON.stringify({
      error: "ElevenLabs TTS is disabled. Use gemini-tts or orion-voice-engine instead.",
      fallback: true,
      redirect: "gemini-tts",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
