/**
 * 🧠 Pentagon Reasoner — Lobo frontal real do Pentagon Pizza
 * Usa OpenRouter com modelos free de reasoning (DeepSeek R1 / Nemotron / Qwen / Llama 3.3).
 * Fallback em cascata se algum modelo estiver rate-limited.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReasonRequest {
  query: string;
  intent?: string;
  entities?: Record<string, unknown>;
  memoryContext?: string;
  ragSnippets?: string[];
  domain?: string;
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
- Se houver RAG/memória, CITE os trechos mais relevantes no rationale
- Nunca invente fatos jurídicos — só use o que está no contexto
- Se o contexto for insuficiente, diga isso no rationale
- Em PT-BR, direto, sem floreio`;

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

// Cascata de modelos free do OpenRouter (do mais forte ao mais leve)
const MODEL_CASCADE = [
  "deepseek/deepseek-r1:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "qwen/qwen3-coder:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];

async function callOpenRouter(
  model: string,
  apiKey: string,
  userPayload: string,
): Promise<Record<string, unknown> | null> {
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
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPayload },
      ],
      tools: [REASONING_TOOL],
      tool_choice: { type: "function", function: { name: "emit_reasoning_plan" } },
      temperature: 0.4,
      max_tokens: 1500,
    }),
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
      // try parsing content as JSON (some models return plain JSON)
    }
  }
  if (typeof msg?.content === "string") {
    const match = msg.content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return { ...JSON.parse(match[0]), _model: model };
      } catch {
        return null;
      }
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReasonRequest;
    const { query, intent, entities, memoryContext, ragSnippets, domain } = body;

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY missing");

    const userPayload = [
      `PERGUNTA: ${query}`,
      intent ? `INTENT: ${intent}` : "",
      domain ? `DOMÍNIO: ${domain}` : "",
      entities && Object.keys(entities).length
        ? `ENTIDADES: ${JSON.stringify(entities)}`
        : "",
      memoryContext ? `MEMÓRIA RECENTE:\n${memoryContext.slice(0, 4000)}` : "",
      ragSnippets?.length
        ? `CONHECIMENTO INGERIDO (use isto!):\n${ragSnippets
            .slice(0, 6)
            .map((s, i) => `[${i + 1}] ${s.slice(0, 800)}`)
            .join("\n\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    let parsed: Record<string, unknown> | null = null;
    let usedModel = "";
    for (const model of MODEL_CASCADE) {
      parsed = await callOpenRouter(model, OPENROUTER_API_KEY, userPayload);
      if (parsed && parsed.plan) {
        usedModel = model;
        break;
      }
    }

    if (!parsed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "all_models_failed",
          plan: ["analisar_demanda", "responder_com_contexto"],
          rationale: "fallback local — todos os modelos OpenRouter indisponíveis",
          confidence: 0.3,
          subTasks: [],
          responseHint: "",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan: parsed.plan ?? ["analisar", "responder"],
        rationale: parsed.rationale ?? "",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
        subTasks: parsed.subTasks ?? [],
        responseHint: parsed.responseHint ?? "",
        model: usedModel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[pentagon-reasoner] fail", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : "unknown",
        plan: ["analisar_demanda", "responder_com_contexto"],
        rationale: "fallback local — exception",
        confidence: 0.3,
        subTasks: [],
        responseHint: "",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
