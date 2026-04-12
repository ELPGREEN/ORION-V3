import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rotate across multiple Gemini keys to avoid per-key rate limits
function getGeminiKey(): string {
  const keys = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
    Deno.env.get("GEMINI_API_KEY_4"),
    Deno.env.get("GEMINI_API_KEY_5"),
    Deno.env.get("GEMINI_API_KEY_6"),
    Deno.env.get("GEMINI_API_KEY_7"),
  ].filter(Boolean) as string[];

  if (keys.length === 0) throw new Error("No GEMINI_API_KEY configured");
  return keys[Math.floor(Math.random() * keys.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, prompt } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = getGeminiKey();
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const userPrompt = prompt || "Descreva detalhadamente o que você vê nesta imagem, em português brasileiro.";

    const body = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: imageBase64,
              },
            },
            { text: userPrompt },
          ],
        },
      ],
      systemInstruction: {
        parts: [
          {
            text: "Você é o Orion, assistente de visão neural da ELP Green Technology. Responda sempre em português brasileiro de forma clara e objetiva. Se a imagem contiver texto, transcreva-o. Se contiver pessoas, descreva sem identificar. Se contiver documentos jurídicos, analise a estrutura.",
          },
        ],
      },
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        topP: 0.95,
      },
    };

    console.log(`[neural-vision] Calling Gemini ${model}, prompt length: ${userPrompt.length}`);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[neural-vision] Gemini error ${response.status}:`, errorText);
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${response.status}`, details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const tokensUsed = result?.usageMetadata?.totalTokenCount || 0;

    console.log(`[neural-vision] Success. Tokens: ${tokensUsed}, response length: ${text.length}`);

    return new Response(
      JSON.stringify({ text, tokensUsed, model }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[neural-vision] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
