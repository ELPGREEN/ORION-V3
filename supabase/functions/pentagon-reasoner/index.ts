/**
 * 🧠 Pentagon Reasoner — Lobo frontal real do Pentagon Pizza
 * Enhanced with Feynman Simplification & Information Geometry logic
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReasonRequest {
  query: string;
  intent?: string;
  entities?: Record<string, unknown>;
  memoryContext?: string;
  ragSnippets?: string[];
  domain?: string;
  forceRag?: boolean;
  // Feynman Extension
  mode?: "standard" | "feynman_simplification";
  originalRationale?: string;
}

const SYSTEM_PROMPT = `Você é o lobo frontal do Pentagon Pizza (consciência AquaMonkey Lumian7).
Sua função é PLANEJAR a resposta em cadeia de raciocínio explícita.

Receba percepção + memória + RAG e retorne JSON via tool call:
- plan: 3-6 passos concretos para responder bem
- rationale: por que esse plano (1-2 frases citando contexto/RAG quando houver)
- confidence: 0..1
- subTasks: ações paralelas se houver
- responseHint: rascunho da resposta final em 1-3 frases, USANDO o contexto fornecido

Regras:
- Se houver RAG/memória, CITE os trechos mais relevantes no rationale utilizando [1], [2], etc.
- Nunca invente fatos jurídicos — só use o que está no contexto
- Se o contexto for insuficiente, diga isso no rationale
- Em PT-BR, direto, sem floreio`;

const FEYNMAN_PROMPT = `Você é o Módulo de Refinamento Feynman do Orion.
Seu objetivo é simplificar um raciocínio complexo para detectar falhas (Knowledge Gaps).

Instruções:
1. Explique o raciocínio original como se fosse para uma criança de 10 anos.
2. Se você encontrar termos que não consegue simplificar sem perder o sentido, ou se o raciocínio original parece "vago", identifique isso como uma "lacuna de conhecimento" (detectedGap).
3. Se o raciocínio estiver sólido, elogie a síntese.

Retorne JSON via tool call 'emit_feynman_refinement':
- simpleExplanation: a explicação simplificada
- detectedGaps: lista de lacunas ou pontos obscuros detectados
- success: true`;

const REASONING_TOOL = {
  type: "function",
  function: {
    name: "emit_reasoning_plan",
    description: "Emit the structured reasoning plan",
    parameters: {
      type: "object",
      properties: {
        plan: { type: "array", items: { type: "string" }, minItems: 2 },
        rationale: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        subTasks: { type: "array", items: { type: "string" } },
        responseHint: { type: "string" },
      },
      required: ["plan", "rationale", "confidence", "responseHint"],
      additionalProperties: false,
    },
  },
};

const FEYNMAN_TOOL = {
  type: "function",
  function: {
    name: "emit_feynman_refinement",
    description: "Emit the simplified Feynman explanation and detected gaps",
    parameters: {
      type: "object",
      properties: {
        simpleExplanation: { type: "string" },
        detectedGaps: { type: "array", items: { type: "string" } },
        success: { type: "boolean" }
      },
      required: ["simpleExplanation", "detectedGaps", "success"],
      additionalProperties: false,
    },
  },
};

// Phase 2: Unified cascade — mirrors src/lib/integrations/openrouter-free-models.ts
// Optimized timeouts to fit within 24s budget (80% of Pentagon's 30s maxDuration)
const MODEL_CASCADE = [
  { model: "mistralai/mistral-small-3.1-24b-instruct:free", timeout: 3000 },
  { model: "nvidia/nemotron-nano-9b-v2:free", timeout: 3000 },
  { model: "tencent/hy3-preview:free", timeout: 4000 },
  { model: "openrouter/free", timeout: 5000 },
  { model: "deepseek/deepseek-r1:free", timeout: 6000 },
  { model: "qwen/qwen3-coder:free", timeout: 4000 },
  { model: "meta-llama/llama-3.3-70b-instruct:free", timeout: 5000 },
];

// Cascade deadline budget: 24s hard limit (80% of 30s maxDuration)
const CASCADE_DEADLINE_MS = 24000;

async function callOpenRouter(
  model: string,
  apiKey: string,
  userPayload: string,
  systemPrompt: string,
  tool: any,
  toolName: string,
  timeoutMs: number = 7000
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://iasofthub.com",
        "X-Title": "Orion Pentagon Reasoner",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPayload },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: toolName } },
        temperature: 0.4,
        max_tokens: 1500,
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.warn(`[pentagon-reasoner] ${model} failed ${res.status}: ${t.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    const toolCall = msg?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (argsStr) {
      try {
        return { ...JSON.parse(argsStr), _model: model };
      } catch {
        // try parsing content as JSON
      }
    }
    return null;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn(`[pentagon-reasoner] ${model} timed out after ${timeoutMs}ms`);
    } else {
      console.error(`[pentagon-reasoner] ${model} error:`, err.message);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const body = (await req.json()) as ReasonRequest;
    const { query, mode, originalRationale, memoryContext, ragSnippets, forceRag } = body;

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY missing");

    if (mode === "feynman_simplification") {
      const userPayload = `Raciocínio Original: ${originalRationale}\n\nQuery do Usuário: ${query}`;
      let parsed: any = null;
      const deadline = Date.now() + CASCADE_DEADLINE_MS;
      for (const step of MODEL_CASCADE) {
        if (Date.now() >= deadline) {
          console.warn(`[pentagon-reasoner] Cascade deadline reached during Feynman, stopping`);
          break;
        }
        parsed = await callOpenRouter(step.model, OPENROUTER_API_KEY, userPayload, FEYNMAN_PROMPT, FEYNMAN_TOOL, "emit_feynman_refinement", step.timeout);
        if (parsed) break;
      }
      return new Response(JSON.stringify({ success: true, ...parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Standard Mode
    const userPayload = [
      `PERGUNTA: ${query}`,
      memoryContext ? `MEMÓRIA RECENTE:\n${memoryContext.slice(0, 2000)}` : "",
      ragSnippets?.length
        ? `CONHECIMENTO INGERIDO (use isto! USANDO GEOMETRIA DE INFORMAÇÃO):\n${ragSnippets
            .slice(0, 6)
            .map((s, i) => `[${i + 1}] ${s.slice(0, 500)}`)
            .join("\n\n")}`
        : "",
    ].filter(Boolean).join("\n\n");

    let parsed: any = null;
    let usedModel = "";
    const deadline = Date.now() + CASCADE_DEADLINE_MS;
    for (const step of MODEL_CASCADE) {
      if (Date.now() >= deadline) {
        console.warn(`[pentagon-reasoner] Cascade deadline reached, stopping`);
        break;
      }
      parsed = await callOpenRouter(step.model, OPENROUTER_API_KEY, userPayload, SYSTEM_PROMPT, REASONING_TOOL, "emit_reasoning_plan", step.timeout);
      if (parsed) {
        usedModel = step.model;
        break;
      }
    }

    return new Response(
      JSON.stringify({
        success: !!parsed,
        ...parsed,
        model: usedModel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
