/**
 * Gemini Live Token — Issues ephemeral tokens for direct client-side
 * WebSocket connections to gemini-live-2.5-flash-native-audio (GA, free).
 * 
 * Client flow:
 * 1. POST /gemini-live-token → gets { token, model, wsUrl }
 * 2. Client opens WebSocket directly to Gemini using the ephemeral token
 * 3. Real-time bidirectional audio streaming with no proxy latency
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "gemini-live-2.5-flash-native-audio";
const API_VERSION = "v1alpha";

// Rotate through available keys
function getApiKey(): string {
  const keys = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
    Deno.env.get("GEMINI_API_KEY_4"),
    Deno.env.get("GEMINI_API_KEY_5"),
    Deno.env.get("GEMINI_API_KEY_6"),
    Deno.env.get("GEMINI_API_KEY_7"),
    Deno.env.get("GEMINI_API_KEY_GCP"),
  ].filter(Boolean) as string[];

  if (keys.length === 0) throw new Error("No Gemini API keys configured");
  return keys[Math.floor(Math.random() * keys.length)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = getApiKey();

    // Request ephemeral token from Gemini auth tokens API
    const tokenUrl = `https://generativelanguage.googleapis.com/${API_VERSION}/authTokens?key=${apiKey}`;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const voice = body.voice || "Algieba";
    const systemInstruction = body.systemInstruction || 
      `Você é Orion, um assistente de IA brasileiro avançado. Fale sempre em português brasileiro.
      REGRAS OBRIGATÓRIAS PARA VOZ:
      1. Comece SEMPRE transcrevendo o que ouviu de forma exata e literal entre aspas (ex: "Quero saber o clima"). Não resuma nem interprete nesta etapa.
      2. Liste qualquer dúvida ou possível ruído detectado (ex: "Possível pausa longa detectada" ou "Palavra pouco clara: 'xxxx'"). Se estiver tudo claro, pule esta etapa.
      3. Só então confirme a compreensão e responda ao comando de forma natural e concisa.
      4. Se a transcrição parecer incompleta ou confusa, diga exatamente: "Não consegui captar toda a frase com clareza. Pode repetir ou digitar a parte que faltou?"
      5. Se houver ruído de fundo, avise: "Tem um pouco de ruído de fundo, pode falar um pouco mais alto ou em ambiente mais silencioso?"
      6. Nunca invente ou complete frases que não foram claramente captadas.`;

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          uses: 1,
          expire_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
          live_connect_constraints: {
            model: `models/${MODEL}`,
            config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: voice,
                  },
                },
              },
              system_instruction: {
                parts: [{ text: systemInstruction }],
              },
            },
          },
        },
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[Gemini Live Token] Token request failed:", tokenResponse.status, errorText);
      
      // If ephemeral tokens not supported, return API key directly for WebSocket
      // (less secure but functional for development)
      if (tokenResponse.status === 404 || tokenResponse.status === 400) {
        console.warn("[Gemini Live Token] Ephemeral tokens not available, returning direct key mode");
        const wsUrl = `wss://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL}:streamGenerateContent?key=${apiKey}`;
        return new Response(
          JSON.stringify({
            mode: "direct",
            model: MODEL,
            wsUrl,
            voice,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to get ephemeral token", details: errorText }),
        { status: tokenResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const ephemeralToken = tokenData.name || tokenData.token;

    const wsUrl = `wss://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL}:streamGenerateContent?access_token=${ephemeralToken}`;

    return new Response(
      JSON.stringify({
        mode: "ephemeral",
        token: ephemeralToken,
        model: MODEL,
        wsUrl,
        voice,
        expiresAt: tokenData.expireTime || new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[Gemini Live Token] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
