import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HF_SPACE_URL = "https://ericsonv12-elp.hf.space";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, action = "chat", model = "llama3.1" } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Mensagem é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const HF_TOKEN = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY");

    if (action === "embed") {
      const response = await fetch(`${HF_SPACE_URL}/ollama/embed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {}),
        },
        body: JSON.stringify({ text: message, model: "nomic-embed-text" }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("HF embed error:", response.status, errText);
        throw new Error(`HF Space embed error: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify({ embedding: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "analyze") {
      const response = await fetch(`${HF_SPACE_URL}/gru/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {}),
        },
        body: JSON.stringify({ texts: [message], preset: "document-evolution" }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("HF GRU error:", response.status, errText);
        throw new Error(`HF Space GRU error: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify({ analysis: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: chat via ollama/generate
    const systemPrompt = `Você é ORION, uma IA jurídica brasileira avançada. Responda em português do Brasil com precisão técnica jurídica. Seja direto e útil.`;

    const fullPrompt = `${systemPrompt}\n\nUsuário: ${message}\n\nORION:`;

    const response = await fetch(`${HF_SPACE_URL}/ollama/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        model,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("HF generate error:", response.status, errText);

      // Fallback to Lovable AI if HF Space is down
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        console.log("Falling back to Lovable AI Gateway...");
        const fallbackRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
          }),
        });

        if (!fallbackRes.ok) {
          throw new Error(`Both HF and fallback failed`);
        }

        const fallbackData = await fallbackRes.json();
        const fallbackContent = fallbackData.choices?.[0]?.message?.content || "Sem resposta.";
        return new Response(JSON.stringify({
          response: fallbackContent,
          provider: "lovable-ai-fallback",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`HF Space error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.response || data.text || JSON.stringify(data);

    return new Response(JSON.stringify({
      response: responseText,
      provider: "hf-elp-space",
      model,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("chat-orion error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Erro desconhecido",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
