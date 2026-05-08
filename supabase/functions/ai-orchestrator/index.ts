import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENT_V12_SYSTEM_PROMPT = `Você é Orion — Assistente IA de elite. Responda de forma clara, estruturada e inteligente.`;
const XAI_GROK_DIRECTIVES = `\n\n[DIRECTIVE: Use xAI/Grok style reasoning when possible.]`;

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function _getGeminiKeys() {
  const raw = Deno.env.get("GEMINI_KEYS") || Deno.env.get("VITE_GOOGLE_API_KEY") || "";
  return raw.split(",").map(k => k.trim()).filter(k => k.length > 0);
}

async function generateEmbeddingHF(text: string): Promise<number[]> {
  const hfKey = Deno.env.get("HUGGINGFACE_API_KEY") || Deno.env.get("HF_TOKEN") || Deno.env.get("CHAVE_API_HUGGINGFACE");
  if (!hfKey) return [];
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text.substring(0, 4000), options: { wait_for_model: true } }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const values = Array.isArray(data[0]) ? data[0] : data;
    if (!values?.length) return [];
    return values.length >= 768 ? values.slice(0, 768) : [...values, ...new Array(768 - values.length).fill(0)];
  } catch { return []; }
}

async function generateQueryEmbedding(text: string): Promise<number[]> {
  const geminiKeys = _getGeminiKeys();
  for (const apiKey of geminiKeys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: text.substring(0, 4000) }] },
            outputDimensionality: 768,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const embedding = data?.embedding?.values;
        if (embedding?.length >= 768) return embedding.slice(0, 768);
      }
    } catch (err) {
      console.warn("Gemini embedding error:", err);
    }
  }
  return await generateEmbeddingHF(text);
}

async function callOpenRouter(
  messages: any[],
  systemPrompt: string,
  temperature = 0.4,
  maxTokens = 4096,
  model = "meta-llama/llama-3.3-70b-instruct",
  stream = false
) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": supabaseUrl,
      "X-Title": "Orion Neural Evolution",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature,
      max_tokens: maxTokens,
      stream,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
  }

  if (stream) {
    return response.body;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { 
      prompt, 
      systemPrompt, 
      messages, 
      preferredProvider, 
      useCase, 
      includeNeuralContext = true,
      maxTokens = 4096,
      temperature = 0.3,
      jurisdiction = "brasil",
      stream = false,
    } = body;

    let neuralContextText = "";
    if (includeNeuralContext && (prompt || (messages && messages.length > 0))) {
      const q = prompt || messages[messages.length - 1].content;
      const embedding = await generateQueryEmbedding(q);
      if (embedding.length > 0) {
        const { data: kbData } = await supabaseAdmin.rpc("search_neural_knowledge", {
          query_text: q,
          query_embedding: `[${embedding.join(",")}]`,
          match_count: 5,
          semantic_weight: 0.5,
          keyword_weight: 0.5,
        });
        if (kbData) neuralContextText = `\n\n[CONTEXTO]\n${kbData.map((d: any) => d.content).join("\n")}`;
      }
    }

    let finalSystemPrompt = (systemPrompt || AGENT_V12_SYSTEM_PROMPT) + XAI_GROK_DIRECTIVES + (jurisdiction === "brasil" ? "\n\nJURISDIÇÃO: BRASIL" : "") + neuralContextText;

    const orModel = (preferredProvider && (preferredProvider.includes("openrouter") || preferredProvider.includes("google/gemini")))
      ? preferredProvider.replace("openrouter/", "").replace("google/", "")
      : "meta-llama/llama-3.3-70b-instruct";

    const result = await callOpenRouter(
      messages || [{ role: "user", content: prompt }],
      finalSystemPrompt,
      temperature,
      maxTokens,
      orModel,
      stream
    );

    if (stream && result instanceof ReadableStream) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const transformStream = new ReadableStream({
        async start(controller) {
          const reader = result.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value);
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(data);
                    const token = parsed.choices?.[0]?.delta?.content || "";
                    if (token) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`));
                    }
                  } catch {}
                }
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "metadata", provider: "openrouter", model: orModel })}\n\n`));
            controller.close();
          } finally {
            reader.releaseLock();
          }
        }
      });

      return new Response(transformStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return json({
      content: result,
      provider: "openrouter",
      model: orModel,
      fallback: false,
      neuralEnhanced: true,
      metadata: { latencyMs: 0 }
    });

  } catch (err: any) {
    console.error(err);
    return json({ error: err.message }, 500);
  }
});
