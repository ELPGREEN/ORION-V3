import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// NEURAL INFERENCE ENGINE v2 — Gemini-First (FREE)
// Primary: Gemini 2.5 Flash (7 keys rotation) — 100% gratuito
// Fallback: HuggingFace (grátis) → Groq → DeepSeek
// ═══════════════════════════════════════════════════════════════

interface InferenceRequest {
  query: string;
  userId?: string;
  privateContext?: Array<{ title: string; content: string }>;
  domain?: string;
  stream?: boolean;
}

function getGeminiKeys(): string[] {
  return [
    Deno.env.get("GEMINI_API_KEY")
  ].filter((k): k is string => !!k);
}

// RAG: search neural knowledge base for relevant context
async function searchKnowledge(
  supabase: ReturnType<typeof createClient>,
  query: string,
  limit = 5
): Promise<Array<{ title: string; content: string; similarity: number }>> {
  try {
    // Generate embedding via Gemini for semantic search
    const keys = getGeminiKeys();
    if (keys.length > 0) {
      try {
        const embResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${keys[0]}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "models/gemini-embedding-001",
              content: { parts: [{ text: query.slice(0, 2000) }] },
              outputDimensionality: 768,
            }),
            signal: AbortSignal.timeout(3000),
          }
        );
        if (embResp.ok) {
          const embData = await embResp.json();
          const embedding = embData?.embedding?.values;
          if (embedding && embedding.length > 0) {
            const padded = embedding.length >= 768 ? embedding.slice(0, 768) : [...embedding, ...new Array(768 - embedding.length).fill(0)];
            const { data } = await supabase.rpc("match_neural_knowledge", {
              query_embedding: `[${padded.join(",")}]`,
              match_threshold: 0.35,
              match_count: limit,
            });
            if (data && data.length > 0) {
              return data.map((d: any) => ({ title: d.title || "", content: (d.content || "").slice(0, 1000), similarity: d.similarity || 0.7 }));
            }
          }
        }
      } catch (e) {
        console.warn("[RAG] Gemini embedding failed:", e);
      }
    }

    // Fallback: text search
    const { data } = await supabase
      .from("neural_knowledge_base")
      .select("title, content")
      .textSearch("content", query.split(" ").slice(0, 5).join(" & "), { type: "plain" })
      .eq("is_processed", true)
      .limit(limit);

    return (data || []).map((d) => ({ title: d.title || "", content: (d.content || "").slice(0, 1000), similarity: 0.7 }));
  } catch {
    return [];
  }
}

// Call Gemini directly (FREE — 7 key rotation)
async function callGemini(systemPrompt: string, userPrompt: string, stream: boolean): Promise<Response | string> {
  const keys = getGeminiKeys();
  if (keys.length === 0) throw new Error("No Gemini keys configured");

  for (const key of keys) {
    try {
      const endpoint = stream ? "streamGenerateContent?alt=sse" : "generateContent";
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:${endpoint}&key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
          signal: AbortSignal.timeout(25000),
        }
      );

      if (resp.status === 429) { await resp.text(); continue; }
      if (!resp.ok) { await resp.text(); continue; }

      if (stream) return resp;

      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) return text;
    } catch (e) {
      console.warn(`[Inference] Gemini key failed:`, e);
    }
  }
  throw new Error("All Gemini keys failed");
}

// HuggingFace fallback (FREE)
async function callHuggingFace(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY");
  if (!apiKey) throw new Error("No HF_TOKEN");
  
  const models = ["google/gemma-3n-E4B", "Qwen/Qwen2.5-72B-Instruct", "meta-llama/Llama-3.2-3B-Instruct"];
  for (const model of models) {
    try {
      const resp = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (text) return text;
    } catch { continue; }
  }
  throw new Error("All HuggingFace models failed");
}

// Groq fallback (free tier)
async function callGroqFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });
  if (!resp.ok) throw new Error(`Groq ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: InferenceRequest = await req.json();
    const { query, userId, privateContext, domain, stream } = body;

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query string required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. RAG: search knowledge base (uses Gemini embeddings — FREE)
    const ragResults = await searchKnowledge(supabase, query);

    // 2. Build context
    let contextBlock = "";
    if (ragResults.length > 0) {
      contextBlock += "\n\n--- Conhecimento Base ---\n" +
        ragResults.map((r) => `[${r.title}]: ${r.content}`).join("\n\n");
    }
    if (privateContext && privateContext.length > 0) {
      contextBlock += "\n\n--- Contexto Privado do Usuário ---\n" +
        privateContext.map((c) => `[${c.title}]: ${c.content}`).join("\n\n");
    }

    const systemPrompt = "Você é Orion, uma inteligência artificial neural avançada. " +
      "Responda com precisão, profundidade e clareza. Use o contexto fornecido quando relevante. " +
      "Cite fontes quando possível. Seja proativo em identificar nuances e implicações." +
      (contextBlock ? `\n\nContexto relevante:${contextBlock}` : "");

    // 3. Call provider: Gemini (FREE) → HuggingFace (FREE) → Groq
    const startTime = Date.now();
    let response = "";
    let providerUsed = "gemini";

    if (stream) {
      try {
        const streamResp = await callGemini(systemPrompt, query, true);
        if (streamResp instanceof Response && streamResp.body) {
          // Transform Gemini SSE to OpenAI-compatible SSE
          const reader = streamResp.body.getReader();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          let buf = "";

          const transformStream = new ReadableStream({
            async pull(controller) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                return;
              }
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() || "";
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const payload = line.slice(6).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(payload);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
                  }
                } catch {}
              }
            },
            cancel() { reader.cancel(); },
          });

          return new Response(transformStream, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
      } catch (e) {
        console.warn("[Inference] Gemini streaming failed:", e);
      }
    }

    // Non-streaming path
    try {
      const result = await callGemini(systemPrompt, query, false);
      if (typeof result === "string") response = result;
    } catch {
      providerUsed = "huggingface";
      try {
        response = await callHuggingFace(systemPrompt, query);
      } catch {
        providerUsed = "groq";
        try {
          response = await callGroqFallback(systemPrompt, query);
        } catch {
          response = "Desculpe, estou com dificuldades técnicas. Tente novamente.";
          providerUsed = "none";
        }
      }
    }

    // 4. Log metrics
    try {
      await supabase.from("ai_metrics").insert({
        provider: `inference:${providerUsed}`,
        total_duration_ms: Date.now() - startTime,
        success: !!response,
        query: query.slice(0, 500),
        user_id: userId || null,
        data_sources_used: ragResults.map((r) => r.title),
      });
    } catch {}

    return new Response(
      JSON.stringify({
        success: true,
        response,
        metadata: {
          provider: providerUsed,
          model: providerUsed === "gemini" ? "gemini-2.5-flash" : providerUsed === "huggingface" ? "gemma-3n-E4B" : "llama-3.3-70b",
          ragSourcesUsed: ragResults.length,
          privateContextUsed: privateContext?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Inference error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Inference failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
