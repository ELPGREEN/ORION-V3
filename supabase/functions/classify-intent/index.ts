import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { validateBody, corsHeaders } from "../_shared/validator.ts";

const RequestSchema = z.object({
  text: z.string().min(2),
});

const SYSTEM_PROMPT = `Você é um classificador de intenções ultra-conservador do assistente Orion.

REGRA DE OURO: Em caso de QUALQUER dúvida, retorne "general" com confidence baixa (0.3-0.5).
A maioria absoluta das mensagens em uma conversa natural é "general" — apenas classifique como ação específica quando o usuário PEDIR EXPLICITAMENTE essa ação.

EXEMPLOS OBRIGATÓRIOS:
- "você consegue me ouvir?" → general (NÃO é media/spotify)
- "me fala sobre você" / "quem é você" → identity (NÃO é auto_construct)
- "tudo bem?" / "oi" / "como vai" → general
- "o que você acha disso" → general
- "toca uma música do X" → spotify (com action: play)
- "abre o youtube" → youtube
- "pesquisa por X no google" → web_search
- "que horas são" → time_date

NUNCA use auto_construct ou self_evolve a menos que o usuário diga LITERALMENTE "evolua seu código", "se modifique", "refatore-se".
NUNCA use media/spotify/youtube sem um pedido EXPLÍCITO de tocar/abrir mídia.

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
    const { data, error } = await validateBody(req, RequestSchema);
    if (error) return error;

    const { text } = data!;

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

    const resultData = await resp.json();
    const toolCall = resultData.choices?.[0]?.message?.tool_calls?.[0];

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
