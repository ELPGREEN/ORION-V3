/**
 * 🧠 Pentagon Reasoner — Lobo frontal real do Pentagon Pizza
 * Recebe percepção + memória, devolve plano em cadeia (chain-of-thought).
 * Usa Lovable AI Gateway com modelo de reasoning (Gemini 2.5 Pro / GPT-5).
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
- subTasks: ações paralelas se houver (ex.: "buscar jurisprudência X")
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const userPayload = [
      `PERGUNTA: ${query}`,
      intent ? `INTENT: ${intent}` : "",
      domain ? `DOMÍNIO: ${domain}` : "",
      entities && Object.keys(entities).length
        ? `ENTIDADES: ${JSON.stringify(entities)}`
        : "",
      memoryContext ? `MEMÓRIA RECENTE:\n${memoryContext.slice(0, 4000)}` : "",
      ragSnippets?.length
        ? `CONHECIMENTO INGERIDO (use isto!):\n${ragSnippets.slice(0, 6).map((s, i) => `[${i + 1}] ${s.slice(0, 800)}`).join("\n\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPayload },
        ],
        tools: [REASONING_TOOL],
        tool_choice: { type: "function", function: { name: "emit_reasoning_plan" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("[pentagon-reasoner] gateway error", aiRes.status, t);
      throw new Error(`gateway ${aiRes.status}`);
    }

    const data = await aiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(toolCall?.function?.arguments ?? "{}");
    } catch (e) {
      console.warn("[pentagon-reasoner] parse failed", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan: parsed.plan ?? ["analisar", "responder"],
        rationale: parsed.rationale ?? "",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
        subTasks: parsed.subTasks ?? [],
        responseHint: parsed.responseHint ?? "",
        model: "google/gemini-2.5-flash",
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
        rationale: "fallback local — reasoner LLM indisponível",
        confidence: 0.3,
        subTasks: [],
        responseHint: "",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
