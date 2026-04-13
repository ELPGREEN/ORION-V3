import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_KEYS = [
  "GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3",
  "GEMINI_API_KEY_4", "GEMINI_API_KEY_5", "GEMINI_API_KEY_6", "GEMINI_API_KEY_7",
].map(k => Deno.env.get(k)).filter(Boolean) as string[];

let keyIndex = 0;
function getNextKey(): string {
  const key = GEMINI_KEYS[keyIndex % GEMINI_KEYS.length];
  keyIndex++;
  return key;
}

const SYSTEM_PROMPT = `Você é um classificador de intenções ultra-rápido do assistente Orion.
Classifique a frase do usuário em UMA categoria e extraia parâmetros relevantes.
Responda APENAS chamando a tool classify.`;

const TOOL_DEF = {
  type: "function",
  function: {
    name: "classify",
    description: "Classifica a intenção do usuário",
    parameters: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          enum: [
            "navigation", "search", "media", "youtube", "spotify",
            "legal", "calendar", "calculation", "translation",
            "time_date", "crm", "reporting", "vision_describe",
            "identity", "explanation", "humor", "security",
            "auto_construct", "self_evolve", "web_search",
            "image_generation", "general"
          ],
          description: "A categoria da intenção"
        },
        confidence: {
          type: "number",
          description: "Confiança de 0.0 a 1.0"
        },
        params: {
          type: "object",
          properties: {
            query: { type: "string", description: "Termo de busca ou pergunta extraída" },
            target: { type: "string", description: "Destino de navegação" },
            platform: { type: "string", description: "Plataforma: youtube, spotify, google, etc." },
            action: { type: "string", description: "Ação: play, pause, create, list, etc." },
            expression: { type: "string", description: "Expressão matemática" },
            targetLang: { type: "string", description: "Idioma alvo para tradução" },
            text: { type: "string", description: "Texto para traduzir" },
          },
          description: "Parâmetros extraídos da frase"
        }
      },
      required: ["intent", "confidence", "params"]
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.length < 2) {
      return new Response(JSON.stringify({ intent: "general", confidence: 0.3, params: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (GEMINI_KEYS.length === 0) {
      return new Response(JSON.stringify({ error: "No Gemini keys configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = getNextKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`;

    const body = {
      contents: [
        { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\nFrase do usuário: "${text}"` }] }
      ],
      tools: [{ functionDeclarations: [TOOL_DEF.function] }],
      toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["classify"] } },
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 150,
      }
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Gemini error:", resp.status, errText);
      return new Response(JSON.stringify({ intent: "general", confidence: 0.3, params: {}, error: "gemini_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const candidate = data.candidates?.[0];
    const fnCall = candidate?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;

    if (fnCall?.name === "classify" && fnCall.args) {
      return new Response(JSON.stringify({
        intent: fnCall.args.intent || "general",
        confidence: fnCall.args.confidence ?? 0.8,
        params: fnCall.args.params || {},
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback if no tool call
    return new Response(JSON.stringify({ intent: "general", confidence: 0.3, params: {} }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("classify-intent error:", err);
    return new Response(JSON.stringify({ intent: "general", confidence: 0.3, params: {}, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
