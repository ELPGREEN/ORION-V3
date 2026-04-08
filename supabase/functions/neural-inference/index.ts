import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// NEURAL INFERENCE ENGINE v3 — Multi-Provider FREE
// Chain: Gemini Flash → Mistral (1B/mês) → Groq Llama → HuggingFace
// ALL 100% gratuito, zero custo
// ═══════════════════════════════════════════════════════════════

interface InferenceRequest {
  query: string;
  userId?: string;
  privateContext?: Array<{ title: string; content: string }>;
  domain?: string;
  stream?: boolean;
}

// ── RAG: search neural knowledge base ──
async function searchKnowledge(
  supabase: ReturnType<typeof createClient>,
  query: string,
  limit = 5
): Promise<Array<{ title: string; content: string; similarity: number }>> {
  try {
    const _gkNames = ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"];
  const _gkAll = _gkNames.map(n => Deno.env.get(n)).filter((k): k is string => !!k);
  const geminiKey = _gkAll[Math.floor(Math.random() * _gkAll.length)] || "";
    if (geminiKey) {
      try {
        const embResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { ...corsHeaders, "Content-Type": "application/json" },
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

// ── Provider 1: Gemini 2.5 Flash (FREE — AI Studio) ──
async function callGemini(systemPrompt: string, userPrompt: string, stream: boolean): Promise<Response | string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("No GEMINI_API_KEY");

  const endpoint = stream ? "streamGenerateContent?alt=sse" : "generateContent";
  const separator = stream ? "&" : "?";
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:${endpoint}${separator}key=${key}`,
    {
      method: "POST",
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(25000),
    }
  );

  if (resp.status === 429) throw new Error("Gemini rate limited");
  if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
  if (stream) return resp;

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) throw new Error("Gemini empty response");
  return text;
}

// ── Provider 2: Mistral (FREE — 1B tokens/mês, 2 RPM) ──
async function callMistral(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("No MISTRAL_API_KEY");

  const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Mistral ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Mistral empty response");
  return text;
}

// ── Provider 3: Groq Llama (FREE — 30 RPM, 1.000 RPD) ──
async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("No GROQ_API_KEY");

  // Try 70B first (better quality), fallback to 8B (higher limits)
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  for (const model of models) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (resp.status === 429) continue; // Try next model
      if (!resp.ok) continue;

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (text) return text;
    } catch {
      continue;
    }
  }
  throw new Error("All Groq models failed");
}

// ── Provider 4: HuggingFace (FREE) ──
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
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (text) return text;
    } catch { continue; }
  }
  throw new Error("All HuggingFace models failed");
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: InferenceRequest = await req.json();
    const { query, userId, privateContext, stream } = body;

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

    // 1. RAG
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

    // 3. Call provider chain: Gemini → Mistral → Groq → HuggingFace
    const startTime = Date.now();
    let response = "";
    let providerUsed = "gemini";
    let modelUsed = "gemini-2.5-flash";

    // Streaming (Gemini only)
    if (stream) {
      try {
        const streamResp = await callGemini(systemPrompt, query, true);
        if (streamResp instanceof Response && streamResp.body) {
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

    // Non-streaming: Gemini → Mistral → Groq → HuggingFace
    try {
      const result = await callGemini(systemPrompt, query, false);
      if (typeof result === "string") response = result;
    } catch (e1) {
      console.warn("[Inference] Gemini failed:", e1);
      providerUsed = "mistral";
      modelUsed = "mistral-small-latest";
      try {
        response = await callMistral(systemPrompt, query);
      } catch (e2) {
        console.warn("[Inference] Mistral failed:", e2);
        providerUsed = "groq";
        modelUsed = "llama-3.3-70b";
        try {
          response = await callGroq(systemPrompt, query);
        } catch (e3) {
          console.warn("[Inference] Groq failed:", e3);
          providerUsed = "huggingface";
          modelUsed = "gemma-3n-E4B";
          try {
            response = await callHuggingFace(systemPrompt, query);
          } catch {
            response = "Desculpe, estou com dificuldades técnicas. Tente novamente em instantes.";
            providerUsed = "none";
            modelUsed = "none";
          }
        }
      }
    }

    // 4. Log metrics
    try {
      await supabase.from("ai_metrics").insert({
        provider: `inference:${providerUsed}`,
        total_duration_ms: Date.now() - startTime,
        success: providerUsed !== "none",
        query: query.slice(0, 500),
        user_id: userId || null,
        data_sources_used: ragResults.map((r) => r.title),
      });
    } catch {}

    return new Response(
      JSON.stringify({
        success: providerUsed !== "none",
        response,
        metadata: {
          provider: providerUsed,
          model: modelUsed,
          ragSourcesUsed: ragResults.length,
          privateContextUsed: privateContext?.length || 0,
          latency_ms: Date.now() - startTime,
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
