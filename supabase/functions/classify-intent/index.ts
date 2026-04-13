import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um classificador de intenções ultra-rápido do assistente Orion.
Classifique a frase do usuário em UMA categoria e extraia parâmetros relevantes.
Responda APENAS chamando a tool classify.`;

const TOOL_DEF = {
  type: "function" as const,
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ intent: "general", confidence: 0.3, params: {}, error: "no_key" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        tools: [TOOL_DEF],
        tool_choice: { type: "function", function: { name: "classify" } },
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("AI Gateway error:", resp.status, errText);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ intent: "general", confidence: 0.3, params: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.name === "classify") {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({
          intent: args.intent || "general",
          confidence: args.confidence ?? 0.8,
          params: args.params || {},
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseErr) {
        console.error("Failed to parse tool args:", parseErr);
      }
    }

    // Fallback
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
