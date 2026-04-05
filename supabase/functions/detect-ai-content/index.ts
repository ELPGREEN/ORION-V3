import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || text.length < 50) {
      return new Response(JSON.stringify({ error: "Text too short for analysis (min 50 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const analysisPrompt = `Analyze the following text and determine if it was likely written by an AI or a human.
Return ONLY a JSON object with this exact structure:
{
  "score": <number 0-100 where 100 = definitely AI>,
  "confidence": <number 0-100>,
  "indicators": [<string array of specific indicators found>],
  "summary": "<one sentence summary>"
}

Text to analyze:
"""
${text.slice(0, 3000)}
"""`;

    let result;

    // Try OpenAI first, fallback to Gemini
    if (OPENAI_API_KEY) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: analysisPrompt }],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) result = JSON.parse(content);
    } else if (GEMINI_API_KEY) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: analysisPrompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
          }),
        }
      );
      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) result = JSON.parse(content);
    }

    if (!result) {
      // Heuristic fallback when no API key available
      const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
      const avgLen = sentences.reduce((sum: number, s: string) => sum + s.trim().length, 0) / Math.max(sentences.length, 1);
      const uniformity = sentences.length > 3 ? 1 - (Math.max(...sentences.map((s: string) => s.length)) - Math.min(...sentences.map((s: string) => s.length))) / Math.max(...sentences.map((s: string) => s.length)) : 0.5;

      const score = Math.min(100, Math.round(
        (avgLen > 80 && avgLen < 160 ? 30 : 10) +
        (uniformity > 0.6 ? 25 : 5) +
        (text.includes("Portanto") || text.includes("Em conclusão") || text.includes("É importante ressaltar") ? 20 : 0) +
        (text.match(/\b(ademais|outrossim|destarte|mister)\b/gi)?.length || 0) * 5
      ));

      result = {
        score,
        confidence: 40,
        indicators: ["Análise heurística (sem API configurada)"],
        summary: score > 60 ? "Texto apresenta padrões compatíveis com geração por IA." : "Texto parece ter sido escrito por humano.",
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[detect-ai-content] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
