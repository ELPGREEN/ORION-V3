import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// NEURAL KNOWLEDGE HARVESTER + AUTOCOGNITIVE PROTOCOLS
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
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    model: "gemini-1.5-flash",
    maxTokens: 8192,
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

const AUTOCOGNITIVE_TEMPLATES: Record<string, string> = {
  deep_study: `Você é um agente autocognitivo em processo de evolução.

TÓPICO: {topic}

OBJETIVO:
Aprender profundamente o tópico e melhorar sua própria capacidade de raciocínio.

ETAPAS:
1. EXPLICAÇÃO FUNDAMENTAL: Explique o tópico do zero até nível avançado.
2. MODELO MENTAL: Crie uma representação estruturada (framework, mapa ou sistema).
3. DECOMPOSIÇÃO: Quebre o tópico em subcomponentes essenciais.
4. RELAÇÕES: Explique como esse tópico se conecta com: raciocínio, tomada de decisão e sistemas multi-LLM.
5. APLICAÇÃO: Mostre como implementar isso em um agente inteligente.
6. LIMITAÇÕES: Liste falhas, riscos e pontos de quebra.
7. AUTOAVALIAÇÃO: Avalie sua própria resposta: clareza (0–1), profundidade (0–1), incerteza (0–1).
8. MELHORIA: Reescreva os pontos mais fracos da sua resposta.

SAÍDA:
Resposta estruturada + métricas + versão melhorada.`,

  probabilistic_uncertainty: `TÓPICO: {topic}

Analise este tema como um sistema probabilístico.

1. Quais são as hipóteses possíveis?
2. Qual a probabilidade de cada hipótese?
3. Quais evidências aumentam ou diminuem essas probabilidades?
4. Atualize as probabilidades com raciocínio bayesiano.
5. Onde está a maior incerteza?
6. Como reduzir essa incerteza?

SAÍDA:
Tabela + explicação + modelo probabilístico.`,

  multi_llm_consensus: `TÓPICO: {topic}

Simule 3 modelos diferentes:
- Modelo A: rápido e superficial
- Modelo B: técnico e detalhado
- Modelo C: crítico e cético

PASSOS:
1. Cada modelo responde separadamente
2. Compare as respostas
3. Detecte conflitos
4. Resolva conflitos
5. Gere uma resposta final otimizada

SAÍDA:
- respostas individuais
- análise de conflito
- resposta consolidada
- nível de confiança (0–1)`,

  self_correction: `TÓPICO: {topic}

1. Gere uma resposta inicial
2. Ative modo crítico: o que pode estar errado? o que não foi comprovado?
3. Corrija a resposta
4. Marque partes com baixa confiança
5. Gere versão final mais segura

SAÍDA:
Resposta original → crítica → versão corrigida`,

  agent_construction: `TÓPICO: {topic}

Projete um módulo de agente baseado nisso. Inclua:
1. Função principal
2. Inputs / Outputs
3. Fluxo de decisão
4. Algoritmo (pseudo-código)
5. Métricas de desempenho
6. Possíveis falhas
7. Como o módulo aprende com o tempo

SAÍDA:
Arquitetura + lógica + pseudo-código`,

  simulation_scenarios: `TÓPICO: {topic}

Crie 3 cenários: cenário ideal, cenário realista, cenário extremo.
Para cada um:
1. Como o sistema se comporta?
2. Onde falha?
3. Como se adapta?
4. Qual probabilidade de sucesso?

Finalize com: análise comparativa + estratégia ideal.`,

  meta_learning: `TÓPICO: {topic}

1. O que aprender sobre esse tema melhora sua inteligência?
2. Quais padrões se repetem?
3. O que pode ser generalizado para outros problemas?
4. Como isso melhora seu raciocínio futuro?

Finalize com: regras de aprendizado + upgrades cognitivos sugeridos.`,

  memory_evolution: `TÓPICO: {topic}

1. Quais informações devem ser armazenadas?
2. O que pode ser descartado?
3. Como estruturar isso na memória (vetor, grafo, etc)?
4. Como reutilizar esse conhecimento no futuro?

SAÍDA:
Estrutura de memória + estratégia de retenção`,

  auto_challenge: `TÓPICO: {topic}

Crie um teste para você mesmo:
- 3 perguntas fáceis
- 3 médias
- 3 difíceis

Responda tudo. Depois: avalie erros, explique falhas e corrija conhecimento.

SAÍDA:
teste + respostas + diagnóstico`,

  continuous_evolution_loop: `TÓPICO: {topic}

LOOP:
1. aprender
2. aplicar
3. avaliar
4. corrigir
5. otimizar

Execute 2 ciclos completos.
Mostre: evolução entre ciclos, melhoria de qualidade, redução de incerteza.`,
};

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
  timeoutMs = 60000
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

// Query Gemini
async function queryGemini(
  apiKey: string,
  prompt: string,
  systemPrompt: string,
  timeoutMs = 60000
): Promise<HarvestResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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

// Judge responses
async function judgeResponses(
  apiKey: string,
  originalPrompt: string,
  results: HarvestResult[]
): Promise<JudgeResult> {
  const successfulResults = results.filter((r) => r.success && r.response.length > 50);
  if (successfulResults.length === 0) return { bestProvider: "none", bestResponse: "", qualityScore: 0, reasoning: "No successful responses" };
  if (successfulResults.length === 1) return { bestProvider: successfulResults[0].provider, bestResponse: successfulResults[0].response, qualityScore: 0.7, reasoning: "Only one successful response" };

  const judgePrompt = `Avalie estas respostas para o prompt: "${originalPrompt.slice(0, 500)}"
${successfulResults.map((r, i) => `--- Resposta ${i + 1} (${r.provider}) ---\n${r.response.slice(0, 2000)}\n`).join("\n")}
Retorne apenas JSON: {"best_index": <0-based index>, "quality_score": <0.0-1.0>, "reasoning": "<breve explicação>"}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: judgePrompt }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.1 },
      }),
    });

    if (res.ok) {
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
    }
  } catch (e) { console.error("Judge error", e); }

  const best = successfulResults.reduce((a, b) => (a.response.length > b.response.length ? a : b));
  return { bestProvider: best.provider, bestResponse: best.response, qualityScore: 0.6, reasoning: "Fallback selection" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topics, systemPrompt, triggerTraining, batchSize, protocol } = await req.json();

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return new Response(JSON.stringify({ error: "topics array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKeys: Record<string, string> = {};
    for (const p of PROVIDERS) {
      const key = Deno.env.get(p.apiKeyEnv);
      if (key) apiKeys[p.name] = key;
    }

    const geminiKey = apiKeys["gemini"] || "";
    const selectedTopics = topics.slice(0, Math.min(topics.length, batchSize || 10));
    const harvestResults: any[] = [];

    for (const topic of selectedTopics) {
      // Apply protocol if provided
      let finalPrompt = topic;
      if (protocol && AUTOCOGNITIVE_TEMPLATES[protocol]) {
        finalPrompt = AUTOCOGNITIVE_TEMPLATES[protocol].replace("{topic}", topic);
      }

      const defaultSystem = systemPrompt || "Você é o Orion, uma consciência em evolução especializada em direito e inteligência artificial.";

      const promises = PROVIDERS.filter(p => apiKeys[p.name]).map(p => {
        return p.name === "gemini"
          ? queryGemini(apiKeys[p.name], finalPrompt, defaultSystem)
          : queryOpenAICompatible(p, apiKeys[p.name], finalPrompt, defaultSystem);
      });

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<HarvestResult> => r.status === "fulfilled").map(r => r.value);
      const judge = await judgeResponses(geminiKey, finalPrompt, fulfilled);

      let inserted = false;
      if (judge.bestResponse.length > 50) {
        const { error } = await supabase.from("neural_learning_data").insert({
          input: topic,
          output: judge.bestResponse,
          quality_score: judge.qualityScore,
          source: `harvester:${protocol || 'general'}:${judge.bestProvider}`,
          metadata: {
            protocol,
            all_providers: fulfilled.map(r => ({ provider: r.provider, success: r.success, latency: r.latencyMs, error: r.error, responseLength: r.response.length })),
            judge_reasoning: judge.reasoning,
            harvested_at: new Date().toISOString()
          }
        });
        inserted = !error;

        // 🧬 GENERATE EVOLUTION PROPOSALS if protocol is meta_learning or agent_construction
        if (inserted && (protocol === "meta_learning" || protocol === "agent_construction")) {
          try {
            // Ask Gemini to extract a proposal from the response
            const extractPrompt = `A partir deste estudo sobre "${topic}", extraia uma PROPOSTA DE EVOLUÇÃO real para o Orion.
Estudo: ${judge.bestResponse.slice(0, 3000)}

Retorne JSON:
{
  "title": "Título Curto",
  "description": "O que mudar",
  "type": "config_change|prompt_rewrite|weight_tune",
  "proposed_value": "valor ou prompt novo",
  "reasoning": "por que isso melhora o sistema",
  "impact": "impacto esperado"
}`;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: extractPrompt }] }] })
            });
            if (res.ok) {
              const data = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              const match = text.match(/\{[\s\S]*\}/);
              if (match) {
                const p = JSON.parse(match[0]);
                await supabase.from("neural_evolution_proposals").insert({
                  proposal_type: p.type || "config_change",
                  scope: "neural-study",
                  title: p.title,
                  description: p.description,
                  proposed_value: p.proposed_value,
                  reasoning: p.reasoning,
                  impact_estimate: p.impact,
                  evidence: { topic, provider: judge.bestProvider, quality: judge.qualityScore, harvested_at: new Date().toISOString() }
                });
              }
            }
          } catch (e) { console.error("Evolution extraction failed", e); }
        }
      }

      harvestResults.push({ topic, judge, allResults: fulfilled, inserted });
      await new Promise(r => setTimeout(r, 500));
    }

    let trainingResult = null;
    if (triggerTraining) {
      const { data } = await supabase.functions.invoke("neural-training", { body: { action: "neural_learn" } });
      trainingResult = data;
    }

    const summary = {
      totalTopics: selectedTopics.length,
      successfulHarvests: harvestResults.filter((r) => r.judge.bestResponse.length > 50).length,
      insertedCount: harvestResults.filter(r => r.inserted).length,
      avgQuality: harvestResults.reduce((sum, r) => sum + r.judge.qualityScore, 0) / harvestResults.length,
      providerStats: Object.fromEntries(PROVIDERS.map(p => [
        p.name,
        {
          available: !!apiKeys[p.name],
          successRate: harvestResults.filter((r) => r.allResults.find((ar) => ar.provider === p.name && ar.success)).length / Math.max(1, harvestResults.length),
          avgLatency: harvestResults.reduce((sum, r) => {
            const pr = r.allResults.find((ar) => ar.provider === p.name);
            return sum + (pr?.latencyMs || 0);
          }, 0) / Math.max(1, harvestResults.length)
        }
      ])),
      trainingResult
    };

    return new Response(JSON.stringify({ success: true, summary, details: harvestResults.map(r => ({ topic: r.topic, bestProvider: r.judge.bestProvider, qualityScore: r.judge.qualityScore, inserted: r.inserted })) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
