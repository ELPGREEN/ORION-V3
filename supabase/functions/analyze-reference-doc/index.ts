import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Types ───
interface AnalysisRequest {
  content: string;
  fileName: string;
  promptRole: string;
  documentType?: string;
}

interface DocumentArgument {
  text: string;
  strength: number;
  weakness: string | null;
  relatedLaw: string | null;
}

interface CounterArgument {
  targetArgument: string;
  suggestion: string;
  source: string;
}

interface NeuralCorrelation {
  title: string;
  relevance: number;
  type: "jurisprudencia" | "sumula" | "doutrina";
}

interface DocumentAnalysis {
  documentType: string;
  area: string;
  sections: Array<{ name: string; content: string }>;
  arguments: DocumentArgument[];
  citedLegislation: string[];
  citedJurisprudence: string[];
  entities: {
    parties: string[];
    values: string[];
    dates: string[];
    processNumbers: string[];
  };
  counterArguments: CounterArgument[];
  strategicBriefing: string;
  neuralCorrelations: NeuralCorrelation[];
  processingLayers: string[];
  timings: Record<string, number>;
}

// ─── LLM Call with Fallback ───
async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const providers = [
    {
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      key: Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_API_KEY_2"),
      model: "gpt-4o-mini",
      format: (s: string, u: string) => ({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: s }, { role: "user", content: u }],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
      extract: (d: any) => d.choices?.[0]?.message?.content,
    },
    {
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: Deno.env.get("GROQ_API_KEY"),
      model: "llama-3.3-70b-versatile",
      format: (s: string, u: string) => ({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: s }, { role: "user", content: u }],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
      extract: (d: any) => d.choices?.[0]?.message?.content,
    },
    {
      name: "anthropic",
      url: "https://api.anthropic.com/v1/messages",
      key: Deno.env.get("ANTHROPIC_API_KEY"),
      model: "claude-3-5-sonnet-20241022",
      format: (s: string, u: string) => ({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        system: s,
        messages: [{ role: "user", content: u }],
      }),
      extract: (d: any) => d.content?.[0]?.text,
      headers: { "anthropic-version": "2023-06-01" },
    },
  ];

  for (const p of providers) {
    if (!p.key) continue;
    try {
    // FIX: A1 — Validate user authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: { user: _authUser }, error: _authErr } = await _sb.auth.getUser(authHeader.replace("Bearer ", ""));
      if (_authErr || !_authUser) {
        return new Response(
          JSON.stringify({ error: "Não autorizado." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }


      const headers: Record<string, string> = { "Content-Type": "application/json", ...(p.headers || {}) };
      if (p.name === "anthropic") {
        headers["x-api-key"] = p.key;
      } else {
        headers["Authorization"] = `Bearer ${p.key}`;
      }
      const res = await fetch(p.url, {
        method: "POST",
        headers,
        body: JSON.stringify(p.format(systemPrompt, userPrompt)),
      });
      if (!res.ok) { await res.text(); continue; }
      const data = await res.json();
      const text = p.extract(data);
      if (text) return text;
    } catch { continue; }
  }
  throw new Error("All LLM providers failed");
}

// ─── LAYER 1: Feature Extraction (Regex-based) ───
function layer1FeatureExtraction(content: string): {
  sections: Array<{ name: string; content: string }>;
  entities: DocumentAnalysis["entities"];
  detectedType: string;
  detectedArea: string;
} {
  const t0 = performance.now();
  const text = content;

  // Section segmentation
  const sectionPatterns = [
    { name: "PREÂMBULO", pattern: /^[\s\S]*?(?=(?:I\s*[-–—]\s*D[OA]S?\s+FATOS|DOS?\s+FATOS|EMENTA|RELATÓRIO))/i },
    { name: "DOS FATOS", pattern: /(?:I\s*[-–—]\s*)?D[OA]S?\s+FATOS[\s\S]*?(?=(?:I{2,}\s*[-–—]|D[OA]\s+DIREITO|DO\s+MÉRITO|FUNDAMENTAÇÃO|D[OA]S?\s+PEDIDOS))/i },
    { name: "DO DIREITO", pattern: /(?:I{2,}\s*[-–—]\s*)?(?:D[OA]\s+DIREITO|DO\s+MÉRITO|FUNDAMENTAÇÃO)[\s\S]*?(?=(?:I{2,}\s*[-–—]|D[OA]S?\s+PEDIDOS|REQUERIMENTOS|DISPOSITIVO))/i },
    { name: "DOS PEDIDOS", pattern: /(?:I{2,}\s*[-–—]\s*)?(?:D[OA]S?\s+PEDIDOS|REQUERIMENTOS|DISPOSITIVO)[\s\S]*/i },
  ];
  const sections: Array<{ name: string; content: string }> = [];
  for (const sp of sectionPatterns) {
    const m = text.match(sp.pattern);
    if (m) sections.push({ name: sp.name, content: m[0].substring(0, 3000) });
  }
  if (sections.length === 0) {
    sections.push({ name: "TEXTO INTEGRAL", content: text.substring(0, 5000) });
  }

  // Entity extraction
  const parties = [...new Set([
    ...Array.from(text.matchAll(/(?:autor|réu|requerente|requerido|reclamante|reclamado|apelante|apelado|impetrante|impetrado|querelante|querelado|paciente|acusad[oa])\s*[:\-–]\s*([^\n,;]{3,60})/gi)).map(m => m[1]?.trim()),
  ].filter(Boolean))] as string[];

  const values = [...new Set(Array.from(text.matchAll(/R\$\s*[\d.,]+(?:\s*\(?[\w\s]+\)?)?/g)).map(m => m[0]))];
  const dates = [...new Set(Array.from(text.matchAll(/\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}/g)).map(m => m[0]))];
  const processNumbers = [...new Set(Array.from(text.matchAll(/\d{7}[-.]?\d{2}[.]?\d{4}[.]?\d[.]?\d{2}[.]?\d{4}/g)).map(m => m[0]))];

  // Type classification
  const typeKeywords: Record<string, string[]> = {
    peticao_inicial: ["petição inicial", "exordial", "propositura", "propor a presente"],
    contestacao: ["contestação", "contesta a", "preliminarmente"],
    sentenca: ["sentença", "julgo procedente", "julgo improcedente", "ante o exposto", "dispositivo"],
    acordao: ["acórdão", "ementa", "acordam", "turma", "câmara", "tribunal"],
    recurso: ["apelação", "razões de recurso", "recurso", "reforma"],
    denuncia: ["denúncia", "ministério público", "oferece denúncia"],
  };
  let detectedType = "documento_generico";
  let maxHits = 0;
  for (const [type, keywords] of Object.entries(typeKeywords)) {
    const hits = keywords.filter(k => text.toLowerCase().includes(k)).length;
    if (hits > maxHits) { maxHits = hits; detectedType = type; }
  }

  // Area classification
  const areaKeywords: Record<string, string[]> = {
    penal: ["crime", "penal", "CPP", "código penal", "denúncia", "réu", "pena", "prisão"],
    civil: ["cível", "CPC", "código civil", "contrato", "obrigação", "dano", "indenização"],
    trabalhista: ["CLT", "trabalhista", "reclamação", "empregado", "empregador", "FGTS", "rescisão"],
    consumidor: ["CDC", "consumidor", "fornecedor", "produto", "serviço", "defeito"],
    familia: ["família", "divórcio", "guarda", "alimentos", "pensão"],
    tributario: ["tributário", "imposto", "tributo", "fiscal", "ICMS", "ISS"],
  };
  let detectedArea = "geral";
  maxHits = 0;
  for (const [area, keywords] of Object.entries(areaKeywords)) {
    const hits = keywords.filter(k => text.toLowerCase().includes(k)).length;
    if (hits > maxHits) { maxHits = hits; detectedArea = area; }
  }

  return { sections, entities: { parties, values, dates, processNumbers }, detectedType, detectedArea };
}

// ─── LAYER 2: Argumentative Analysis (LLM) ───
async function layer2ArgumentativeAnalysis(
  content: string,
  sections: Array<{ name: string; content: string }>,
  detectedType: string,
  detectedArea: string
): Promise<{ arguments: DocumentArgument[]; citedLegislation: string[]; citedJurisprudence: string[] }> {
  const sectionText = sections.map(s => `[${s.name}]\n${s.content}`).join("\n\n");
  const truncated = sectionText.substring(0, 8000);

  const systemPrompt = `Você é um analista jurídico especializado em direito brasileiro. Analise o documento e extraia informações em JSON.
Retorne EXATAMENTE este formato JSON:
{
  "arguments": [
    {"text": "resumo do argumento", "strength": 0.0-1.0, "weakness": "ponto fraco ou null", "relatedLaw": "artigo de lei ou null"}
  ],
  "citedLegislation": ["Art. X, Lei Y"],
  "citedJurisprudence": ["REsp/HC/AgRg nº ..."]
}
- strength: 0.0 (fraquíssimo) a 1.0 (fortíssimo)
- Identifique no máximo 10 argumentos principais
- Para cada argumento, avalie se há ponto fraco explorável
- Extraia TODAS as citações legislativas e jurisprudenciais`;

  const userPrompt = `Documento tipo: ${detectedType} | Área: ${detectedArea}

${truncated}`;

  try {
    const raw = await callLLM(systemPrompt, userPrompt);
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { arguments: [], citedLegislation: [], citedJurisprudence: [] };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      arguments: (parsed.arguments || []).map((a: any) => ({
        text: String(a.text || ""),
        strength: Math.max(0, Math.min(1, Number(a.strength) || 0.5)),
        weakness: a.weakness || null,
        relatedLaw: a.relatedLaw || null,
      })),
      citedLegislation: parsed.citedLegislation || [],
      citedJurisprudence: parsed.citedJurisprudence || [],
    };
  } catch (e) {
    console.error("Layer 2 error:", e);
    return { arguments: [], citedLegislation: [], citedJurisprudence: [] };
  }
}

// ─── LAYER 3: Neural Correlation ───
async function layer3NeuralCorrelation(
  args: DocumentArgument[],
  citedLegislation: string[]
): Promise<{ counterArguments: CounterArgument[]; neuralCorrelations: NeuralCorrelation[] }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const counterArguments: CounterArgument[] = [];
  const neuralCorrelations: NeuralCorrelation[] = [];

  // Search for counter-arguments for top 5 strongest arguments
  const topArgs = args.sort((a, b) => b.strength - a.strength).slice(0, 5);

  for (const arg of topArgs) {
    try {
      const query = `${arg.text} ${arg.relatedLaw || ""}`.trim();
      const res = await fetch(`${supabaseUrl}/functions/v1/neural-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          query,
          mode: "search",
          hybrid: true,
          rerank: true,
          matchCount: 3,
          matchThreshold: 0.3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        for (const r of results.slice(0, 2)) {
          counterArguments.push({
            targetArgument: arg.text.substring(0, 100),
            suggestion: `${r.title}: ${r.content?.substring(0, 200)}`,
            source: r.source || "neural_search",
          });
          neuralCorrelations.push({
            title: r.title || "Sem título",
            relevance: r.combined_score || r.similarity || 0.5,
            type: r.content_type === "sumula" ? "sumula" : r.content_type === "doutrina" ? "doutrina" : "jurisprudencia",
          });
        }
      }
    } catch (e) {
      console.error("Neural search error for arg:", e);
    }
  }

  return { counterArguments, neuralCorrelations };
}

// ─── LAYER 4: Strategic Synthesis (LLM) ───
async function layer4StrategicSynthesis(
  detectedType: string,
  area: string,
  args: DocumentArgument[],
  counterArguments: CounterArgument[],
  citedLegislation: string[],
  promptRole: string,
  documentType?: string
): Promise<string> {
  const systemPrompt = `Você é um estrategista jurídico. Gere um BRIEFING ESTRATÉGICO conciso (máx 500 palavras) para o advogado usar na redação da peça.
Retorne JSON: {"strategicBriefing": "texto do briefing"}`;

  const userPrompt = `CONTEXTO:
- Tipo do documento analisado: ${detectedType}
- Área: ${area}
- Papel: ${promptRole}
- Peça a ser gerada: ${documentType || "não especificada"}

ARGUMENTOS IDENTIFICADOS (${args.length}):
${args.map((a, i) => `${i + 1}. [Força: ${a.strength.toFixed(2)}] ${a.text}${a.weakness ? ` | FRACO: ${a.weakness}` : ""}${a.relatedLaw ? ` | Lei: ${a.relatedLaw}` : ""}`).join("\n")}

CONTRA-ARGUMENTOS DA REDE NEURAL (${counterArguments.length}):
${counterArguments.map((c, i) => `${i + 1}. Alvo: "${c.targetArgument}" → ${c.suggestion}`).join("\n")}

LEGISLAÇÃO CITADA: ${citedLegislation.join(", ") || "nenhuma"}

Gere o briefing estratégico priorizando:
1. Argumentos mais fortes (> 0.7) que precisam ser enfrentados
2. Pontos fracos a explorar
3. Contra-argumentos sugeridos
4. Ordem de prioridade para contestação`;

  try {
    const raw = await callLLM(systemPrompt, userPrompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.strategicBriefing || parsed.briefing || raw;
    }
    return raw;
  } catch {
    return `Análise de ${args.length} argumentos identificados. ${counterArguments.length} contra-argumentos sugeridos pela Rede Neural.`;
  }
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, fileName, promptRole, documentType } = (await req.json()) as AnalysisRequest;

    if (!content || content.length < 50) {
      return new Response(JSON.stringify({ error: "Conteúdo insuficiente para análise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timings: Record<string, number> = {};
    const processingLayers: string[] = [];

    // ─── LAYER 1: Feature Extraction ───
    const t1 = performance.now();
    const { sections, entities, detectedType, detectedArea } = layer1FeatureExtraction(content);
    timings.layer1_ms = Math.round(performance.now() - t1);
    processingLayers.push(`L1: Feature Extraction — ${sections.length} seções, ${entities.parties.length} partes, tipo=${detectedType}, área=${detectedArea}`);

    // ─── LAYER 2: Argumentative Analysis ───
    const t2 = performance.now();
    const { arguments: args, citedLegislation, citedJurisprudence } = await layer2ArgumentativeAnalysis(
      content, sections, detectedType, detectedArea
    );
    timings.layer2_ms = Math.round(performance.now() - t2);
    processingLayers.push(`L2: Argumentative Analysis — ${args.length} argumentos, ${citedLegislation.length} leis citadas`);

    // ─── LAYER 3: Neural Correlation ───
    const t3 = performance.now();
    const { counterArguments, neuralCorrelations } = await layer3NeuralCorrelation(args, citedLegislation);
    timings.layer3_ms = Math.round(performance.now() - t3);
    processingLayers.push(`L3: Neural Correlation — ${counterArguments.length} contra-argumentos, ${neuralCorrelations.length} correlações`);

    // ─── LAYER 4: Strategic Synthesis ───
    const t4 = performance.now();
    const strategicBriefing = await layer4StrategicSynthesis(
      detectedType, detectedArea, args, counterArguments, citedLegislation, promptRole, documentType
    );
    timings.layer4_ms = Math.round(performance.now() - t4);
    processingLayers.push(`L4: Strategic Synthesis — briefing gerado`);
    timings.total_ms = Math.round(timings.layer1_ms + timings.layer2_ms + timings.layer3_ms + timings.layer4_ms);

    const analysis: DocumentAnalysis = {
      documentType: detectedType,
      area: detectedArea,
      sections,
      arguments: args,
      citedLegislation,
      citedJurisprudence,
      entities,
      counterArguments,
      strategicBriefing,
      neuralCorrelations,
      processingLayers,
      timings,
    };

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-reference-doc error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
