import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// NEURAL KNOWLEDGE HARVESTER
// Multi-provider LLM knowledge collector for training phase
// Queries Groq, OpenAI, Gemini, DeepSeek in parallel
// Uses LLM-as-judge to select best response
// Feeds neural_learning_data for training pipeline
// ═══════════════════════════════════════════════════════════════

interface ProviderConfig {
  name: string;
  apiKeyEnv: string;
  endpoint: string;
  model: string;
  maxTokens: number;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "gemini",
    apiKeyEnv: "GEMINI_API_KEY_GCP",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    model: "gemini-2.5-flash",
    maxTokens: 4096,
  },
  {
    name: "groq",
    apiKeyEnv: "GROQ_API_KEY",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    maxTokens: 4096,
  },
  {
    name: "deepseek",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    maxTokens: 4096,
  }
];

interface HarvestResult {
  provider: string;
  response: string;
  latencyMs: number;
  success: boolean;
  error?: string;
}

interface JudgeResult {
  bestProvider: string;
  bestResponse: string;
  qualityScore: number;
  reasoning: string;
}

// Query a single OpenAI-compatible provider
async function queryOpenAICompatible(
  provider: ProviderConfig,
  apiKey: string,
  prompt: string,
  systemPrompt: string,
  timeoutMs = 30000
): Promise<HarvestResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: provider.maxTokens,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      return { provider: provider.name, response: "", latencyMs: Date.now() - start, success: false, error: `${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { provider: provider.name, response: content, latencyMs: Date.now() - start, success: true };
  } catch (e) {
    return { provider: provider.name, response: "", latencyMs: Date.now() - start, success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Query Gemini (different API format)
async function queryGemini(
  apiKey: string,
  prompt: string,
  systemPrompt: string,
  timeoutMs = 30000
): Promise<HarvestResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      return { provider: "gemini", response: "", latencyMs: Date.now() - start, success: false, error: `${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { provider: "gemini", response: content, latencyMs: Date.now() - start, success: true };
  } catch (e) {
    return { provider: "gemini", response: "", latencyMs: Date.now() - start, success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Use Gemini as judge to evaluate responses
async function judgeResponses(
  apiKey: string,
  originalPrompt: string,
  results: HarvestResult[]
): Promise<JudgeResult> {
  const successfulResults = results.filter((r) => r.success && r.response.length > 50);

  if (successfulResults.length === 0) {
    return { bestProvider: "none", bestResponse: "", qualityScore: 0, reasoning: "No successful responses" };
  }

  if (successfulResults.length === 1) {
    return {
      bestProvider: successfulResults[0].provider,
      bestResponse: successfulResults[0].response,
      qualityScore: 0.7,
      reasoning: "Only one successful response",
    };
  }

  const judgePrompt = `You are an AI quality judge. Evaluate these responses to the prompt: "${originalPrompt.slice(0, 500)}"

${successfulResults.map((r, i) => `--- Response ${i + 1} (${r.provider}) ---\n${r.response.slice(0, 2000)}\n`).join("\n")}

Return ONLY valid JSON:
{"best_index": <0-based index>, "quality_score": <0.0-1.0>, "reasoning": "<brief explanation>"}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: judgePrompt }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.1 },
      }),
    });

    if (!res.ok) {
      // Fallback: pick longest response
      const best = successfulResults.reduce((a, b) => (a.response.length > b.response.length ? a : b));
      return { bestProvider: best.provider, bestResponse: best.response, qualityScore: 0.6, reasoning: "Judge failed, selected longest" };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const idx = Math.min(parsed.best_index || 0, successfulResults.length - 1);
      return {
        bestProvider: successfulResults[idx].provider,
        bestResponse: successfulResults[idx].response,
        qualityScore: Math.min(1, Math.max(0, parsed.quality_score || 0.7)),
        reasoning: parsed.reasoning || "Judge selected",
      };
    }
  } catch {
    // Fallback
  }

  const best = successfulResults.reduce((a, b) => (a.response.length > b.response.length ? a : b));
  return { bestProvider: best.provider, bestResponse: best.response, qualityScore: 0.6, reasoning: "Fallback selection" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topics, systemPrompt, triggerTraining, batchSize } = await req.json();

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return new Response(JSON.stringify({ error: "topics array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxTopics = Math.min(topics.length, batchSize || 10);
    const selectedTopics = topics.slice(0, maxTopics);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const defaultSystem = systemPrompt ||
      "Você é um especialista em direito brasileiro. Responda com precisão, citando legislação e jurisprudência quando relevante. Seja completo mas conciso.";

    // Collect API keys
    const apiKeys: Record<string, string> = {};
    for (const p of PROVIDERS) {
      const key = Deno.env.get(p.apiKeyEnv);
      if (key) apiKeys[p.name] = key;
    }

    if (Object.keys(apiKeys).length === 0) {
      return new Response(JSON.stringify({ error: "No API keys configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = apiKeys["gemini"] || "";
    const harvestResults: Array<{
      topic: string;
      judge: JudgeResult;
      allResults: HarvestResult[];
      inserted: boolean;
    }> = [];

    // Process topics with rate limiting (sequential with small delay)
    for (const topic of selectedTopics) {
      // Query all available providers in parallel
      const promises: Promise<HarvestResult>[] = [];

      for (const provider of PROVIDERS) {
        const key = apiKeys[provider.name];
        if (!key) continue;

        if (provider.name === "gemini") {
          promises.push(queryGemini(key, topic, defaultSystem));
        } else {
          promises.push(queryOpenAICompatible(provider, key, topic, defaultSystem));
        }
      }

      const results = await Promise.allSettled(promises);
      const fulfilled = results
        .filter((r): r is PromiseFulfilledResult<HarvestResult> => r.status === "fulfilled")
        .map((r) => r.value);

      // Judge responses
      const judge = geminiKey
        ? await judgeResponses(geminiKey, topic, fulfilled)
        : {
            bestProvider: fulfilled.find((r) => r.success)?.provider || "none",
            bestResponse: fulfilled.find((r) => r.success)?.response || "",
            qualityScore: 0.5,
            reasoning: "No judge available",
          };

      // Insert into neural_learning_data
      let inserted = false;
      if (judge.bestResponse.length > 50) {
        const { error } = await supabase.from("neural_learning_data").insert({
          input: topic,
          output: judge.bestResponse,
          quality_score: judge.qualityScore,
          source: `harvester:${judge.bestProvider}`,
          metadata: {
            all_providers: fulfilled.map((r) => ({
              provider: r.provider,
              success: r.success,
              latencyMs: r.latencyMs,
              responseLength: r.response.length,
              error: r.error,
            })),
            judge_reasoning: judge.reasoning,
            harvested_at: new Date().toISOString(),
          },
        });
        inserted = !error;
        if (error) console.error("Insert error:", error.message);
      }

      harvestResults.push({ topic, judge, allResults: fulfilled, inserted });

      // Rate limit: 500ms between topics
      if (selectedTopics.indexOf(topic) < selectedTopics.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Optionally trigger neural training
    let trainingResult = null;
    if (triggerTraining) {
      try {
        const { data, error } = await supabase.functions.invoke("neural-training", {
          body: {
            action: "neural_learn",
            data: {
              enable_rlvr: true,
              enable_dpo: true,
              enable_hebbian: true,
              enable_cross_validation: true,
              enable_distillation: false,
            },
          },
        });
        trainingResult = error ? { error: error.message } : data;
      } catch (e) {
        trainingResult = { error: e instanceof Error ? e.message : "Training invoke failed" };
      }
    }

    const summary = {
      totalTopics: selectedTopics.length,
      successfulHarvests: harvestResults.filter((r) => r.judge.bestResponse.length > 50).length,
      insertedCount: harvestResults.filter((r) => r.inserted).length,
      avgQuality: harvestResults.reduce((sum, r) => sum + r.judge.qualityScore, 0) / harvestResults.length,
      providerStats: Object.fromEntries(
        PROVIDERS.map((p) => [
          p.name,
          {
            available: !!apiKeys[p.name],
            successRate:
              harvestResults.filter((r) => r.allResults.find((ar) => ar.provider === p.name && ar.success)).length /
              Math.max(1, harvestResults.length),
            avgLatency:
              harvestResults.reduce((sum, r) => {
                const pr = r.allResults.find((ar) => ar.provider === p.name);
                return sum + (pr?.latencyMs || 0);
              }, 0) / Math.max(1, harvestResults.length),
          }
        ])
      ),
      trainingResult,
    };

    return new Response(JSON.stringify({ success: true, summary, details: harvestResults.map((r) => ({ topic: r.topic, bestProvider: r.judge.bestProvider, qualityScore: r.judge.qualityScore, inserted: r.inserted })) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Harvester error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
