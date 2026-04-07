import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// COURTLISTENER v3 — Full hierarchy + PACER data
// Court → Docket → Cluster → Opinion (+ Audio, Citations)
// PACER: Docket Entries → RECAP Documents, Parties, Attorneys
// ═══════════════════════════════════════════════════════════════

const CL_BASE = "https://www.courtlistener.com/api/rest/v4";

const AREA_QUERIES: Record<string, string[]> = {
  civil: ["civil rights", "tort liability", "breach of contract", "due process"],
  penal: ["criminal law", "habeas corpus", "fourth amendment search", "sentencing guidelines"],
  constitucional: ["constitutional law", "first amendment", "equal protection", "separation of powers"],
  trabalhista: ["labor law", "employment discrimination", "FLSA wages", "NLRA collective bargaining"],
  tributario: ["tax law", "IRS dispute", "tax evasion", "tax exemption"],
  empresarial: ["corporate law", "securities fraud", "antitrust", "intellectual property patent"],
  ambiental: ["environmental law", "EPA regulation", "clean water act", "NEPA"],
  digital: ["data privacy", "CFAA computer fraud", "DMCA copyright", "electronic surveillance"],
};

const EXTRACTION_PROMPTS: Record<string, { label: string; focus: string }> = {
  conceitos: {
    label: "CONCEITOS E DEFINIÇÕES",
    focus: "Extraia os conceitos jurídicos centrais, definições legais, standards de prova e testes jurídicos (balancing tests). Relacione com institutos equivalentes no direito brasileiro.",
  },
  doutrina: {
    label: "DOUTRINA E CITAÇÕES",
    focus: "Identifique posições doutrinárias, precedentes (stare decisis), votos concorrentes e dissidentes. Atribua cada posição ao juiz/autor. Compare com a doutrina brasileira.",
  },
  legislacao: {
    label: "REFERÊNCIAS LEGISLATIVAS",
    focus: "Liste estatutos federais/estaduais, constitutional provisions, regulamentos e rules of procedure. Indique equivalentes na legislação brasileira (CF, CPC, CPP, CC).",
  },
  sumarios: {
    label: "SUMÁRIO TEMÁTICO",
    focus: "Estruture um sumário: fatos relevantes, questão jurídica (issue), holding, ratio decidendi, obiter dictum. Organize por temas e subtemas.",
  },
};

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════

function makeUniqueId(caseName: string, court: string, type: string): string {
  const key = `cl_${type}_${caseName.toLowerCase().trim()}_${court.toLowerCase().trim()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) { hash = ((hash << 5) - hash) + key.charCodeAt(i); hash = hash & hash; }
  return `cl_${type}_${Math.abs(hash).toString(16)}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "N/A";
  return `${Math.floor(seconds / 60)}min ${Math.floor(seconds % 60)}s`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function clFetch(path: string, apiKey: string, timeoutMs = 12000): Promise<any> {
  const url = path.startsWith("http") ? path : `${CL_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Token ${apiKey}` },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) { await res.text(); return null; }
  return res.json();
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════
// API LAYER — Full hierarchy + PACER endpoints
// ═══════════════════════════════════════════════════════════════

// Search API (type=o for opinions, oa for oral args, r for RECAP/dockets)
async function searchCL(query: string, type: string, apiKey: string, max = 5): Promise<any[]> {
  const url = `${CL_BASE}/search/?q=${encodeURIComponent(query)}&type=${type}&order_by=score+desc&page_size=${max}`;
  console.log(`   🔍 CL search [${type}]: "${query}"`);
  const data = await clFetch(url, apiKey, 15000);
  return data?.results || [];
}

// Cluster API — groups opinions for a case
async function getCluster(clusterId: number, apiKey: string): Promise<any> {
  return clFetch(`/clusters/${clusterId}/`, apiKey);
}

// Opinion API — prefers html_with_citations per docs
async function getOpinionText(opinionUrl: string, apiKey: string): Promise<string> {
  const op = await clFetch(opinionUrl, apiKey);
  if (!op) return "";
  const raw = op.html_with_citations || op.html || op.html_columbia || op.html_lawbox || op.plain_text || "";
  const clean = stripHtml(raw);
  return clean.substring(0, 5000);
}

// Docket API — top of hierarchy
async function getDocket(docketId: number, apiKey: string): Promise<any> {
  return clFetch(`/dockets/${docketId}/`, apiKey);
}

// Audio API — oral arguments
async function getAudio(audioId: number, apiKey: string): Promise<any> {
  return clFetch(`/audio/${audioId}/`, apiKey);
}

// Court API — cached metadata
async function getCourt(courtId: string, apiKey: string): Promise<any> {
  return clFetch(`/courts/${courtId}/`, apiKey);
}

// ── PACER-specific endpoints ──

// Docket Entries — lines in a PACER docket, each with nested recap_documents
async function getDocketEntries(docketId: number, apiKey: string, max = 10): Promise<any[]> {
  // Omit plain_text for speed, order by -date_filed for most recent first
  const url = `${CL_BASE}/docket-entries/?docket=${docketId}&order_by=-date_filed&page_size=${max}&fields=id,date_filed,description,entry_number,recap_documents`;
  const data = await clFetch(url, apiKey, 15000);
  return data?.results || [];
}

// RECAP Documents — individual documents within docket entries
async function getRecapDocument(docId: number, apiKey: string): Promise<any> {
  return clFetch(`/recap-documents/${docId}/?fields=id,description,document_type,plain_text,ocr_status,page_count,filepath_local,is_available,date_upload`, apiKey);
}

// Parties — people/orgs involved in a docket, with nested attorneys
async function getParties(docketId: number, apiKey: string, filterNested = true): Promise<any[]> {
  const nested = filterNested ? "&filter_nested_results=True" : "";
  const url = `${CL_BASE}/parties/?docket=${docketId}&page_size=20${nested}`;
  const data = await clFetch(url, apiKey, 15000);
  return data?.results || [];
}

// Attorneys — lawyers involved in a docket
async function getAttorneys(docketId: number, apiKey: string, filterNested = true): Promise<any[]> {
  const nested = filterNested ? "&filter_nested_results=True" : "";
  const url = `${CL_BASE}/attorneys/?docket=${docketId}&page_size=20${nested}`;
  const data = await clFetch(url, apiKey, 15000);
  return data?.results || [];
}

// Full opinion text via cluster → sub_opinions traversal
async function getFullOpinionFromCluster(clusterId: number, apiKey: string): Promise<{ text: string; opType: string; judges: string; citations: string[] }> {
  const cluster = await getCluster(clusterId, apiKey);
  if (!cluster) return { text: "", opType: "", judges: cluster?.judges || "", citations: [] };

  const subOps = cluster.sub_opinions || [];
  let bestText = "";
  let opType = "";

  if (subOps.length > 0) {
    const opUrl = typeof subOps[0] === "string" ? subOps[0] : `${CL_BASE}/opinions/${subOps[0]}/`;
    const op = await clFetch(opUrl, apiKey);
    if (op) {
      const raw = op.html_with_citations || op.html || op.plain_text || "";
      bestText = stripHtml(raw).substring(0, 5000);
      opType = op.type || "combined";
    }
  }

  const citationRefs = (cluster.citations || []).map((c: any) =>
    typeof c === "string" ? c : `${c.volume || ""} ${c.reporter || ""} ${c.page || ""}`.trim()
  );

  return {
    text: bestText || cluster.syllabus || "",
    opType,
    judges: cluster.judges || cluster.panel_str || "",
    citations: citationRefs,
  };
}

// ═══════════════════════════════════════════════════════════════
// PACER DATA EXTRACTION — builds structured content from PACER
// ═══════════════════════════════════════════════════════════════

async function extractPACERData(docketId: number, caseName: string, courtId: string, apiKey: string): Promise<{
  entries: string;
  parties: string;
  attorneys: string;
  docCount: number;
}> {
  // Fetch all three in parallel
  const [entries, partiesData, attorneysData] = await Promise.all([
    getDocketEntries(docketId, apiKey, 15),
    getParties(docketId, apiKey),
    getAttorneys(docketId, apiKey)
  ]);

  // Format docket entries
  let docCount = 0;
  const entryLines = entries.map((e: any) => {
    const docs = (e.recap_documents || []);
    docCount += docs.length;
    const docSummary = docs.length > 0
      ? ` [${docs.length} doc(s): ${docs.map((d: any) => d.description || "sem descrição").slice(0, 3).join("; ")}${docs.length > 3 ? "..." : ""}]`
      : "";
    return `#${e.entry_number || "?"} (${e.date_filed || "s/d"}): ${e.description || "Sem descrição"}${docSummary}`;
  });

  // Format parties with their roles
  const partyLines = partiesData.map((p: any) => {
    const roles = (p.party_types || []).map((pt: any) => {
      let role = pt.name || "Desconhecido";
      // Criminal info
      if (pt.highest_offense_level_opening) role += ` (offense: ${pt.highest_offense_level_opening})`;
      if (pt.criminal_counts?.length > 0) role += ` [${pt.criminal_counts.length} count(s)]`;
      return role;
    }).join(", ");
    const attyCount = (p.attorneys || []).length;
    return `• ${p.name}${p.extra_info ? ` (${p.extra_info})` : ""} — ${roles || "Papel indefinido"}${attyCount > 0 ? ` [${attyCount} advogado(s)]` : ""}`;
  });

  // Format attorneys
  const attyLines = attorneysData.map((a: any) => {
    const reps = (a.parties_represented || []).map((r: any) => `role ${r.role}`).join(", ");
    return `• ${a.name}${a.phone ? ` (${a.phone})` : ""}${a.email ? ` <${a.email}>` : ""} — ${reps || "representação geral"}`;
  });

  return {
    entries: entryLines.length > 0 ? `ENTRADAS PROCESSUAIS (${entryLines.length} de ${entries.length}):\n${entryLines.join("\n")}` : "",
    parties: partyLines.length > 0 ? `PARTES (${partyLines.length}):\n${partyLines.join("\n")}` : "",
    attorneys: attyLines.length > 0 ? `ADVOGADOS (${attyLines.length}):\n${attyLines.join("\n")}` : "",
    docCount,
  };
}

// ═══════════════════════════════════════════════════════════════
// AI ANALYSIS (multi-provider fallback)
// ═══════════════════════════════════════════════════════════════

async function generateAnalysis(
  caseName: string, court: string, dateFiled: string,
  sourceText: string, area: string, extType: string,
  sourceLabel = "decisão judicial"
): Promise<string> {
  const cfg = EXTRACTION_PROMPTS[extType] || EXTRACTION_PROMPTS.conceitos;
  const prompt = `Você é um jurista comparatista brasileiro-americano. Produza texto acadêmico de 400-800 palavras sobre ${cfg.label} baseado na ${sourceLabel} americana:

Caso: ${caseName}
Tribunal: ${court}
Data: ${dateFiled}
Área: ${area}

${cfg.focus}

Trecho:
${sourceText.substring(0, 2500)}

Texto corrido acadêmico em português. Compare com o direito brasileiro quando pertinente.`;

  const tryProvider = async (name: string, fn: () => Promise<string>) => {
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


      const r = await fn();
      if (r.length > 100) return r;
    } catch { /* next */ }
    return "";
  };

  // Anthropic
  const aKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (aKey) {
    const r = await tryProvider("anthropic", async () => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": aKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) { await res.text(); return ""; }
      const d = await res.json();
      return d?.content?.[0]?.text || "";
    });
    if (r) return r;
  }

  // OpenAI
  const oKey = Deno.env.get("OPENAI_API_KEY");
  if (oKey) {
    const r = await tryProvider("openai", async () => {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${oKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) { await res.text(); return ""; }
      const d = await res.json();
      return d?.choices?.[0]?.message?.content || "";
    });
    if (r) return r;
  }

  // Gemini
  for (const key of [ Deno.env.get("GEMINI_API_KEY")].filter(Boolean) as string[]) {
    const r = await tryProvider("gemini", async () => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 3000 } }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) { await res.text(); return ""; }
      const d = await res.json();
      return d?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    });
    if (r) return r;
  }
  return "";
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("COURTLISTENER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "COURTLISTENER_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));

    const areas: string[] = body.areas || ["civil"];
    const extractionTypes: string[] = body.extractionTypes || ["conceitos", "doutrina"];
    const maxPerArea: number = body.maxCasesPerArea || 3;
    const includeOpinions: boolean = body.includeOpinions !== false;
    const includeOralArguments: boolean = body.includeOralArguments || false;
    const includeDockets: boolean = body.includeDockets || false;
    // PACER-specific options (v3)
    const includePACER: boolean = body.includePACER || false;
    const includeParties: boolean = body.includeParties || false;
    const includeAttorneys: boolean = body.includeAttorneys || false;
    // Filters
    const courtFilter: string | null = body.courtFilter || null;
    const docketNumberFilter: string | null = body.docketNumber || null;
    const clusterIdLookup: number | null = body.clusterId || null;
    // Direct docket ID lookup (PACER)
    const docketIdLookup: number | null = body.docketId || null;

    const startTime = Date.now();
    const MAX_RUNTIME_MS = 50000;
    const timeOk = () => Date.now() - startTime < MAX_RUNTIME_MS;

    console.log(`⚖️ CourtListener v3 — Áreas: ${areas.join(", ")}, Tipos: ${extractionTypes.join(", ")}`);
    console.log(`   Opinions: ${includeOpinions}, OralArgs: ${includeOralArguments}, Dockets: ${includeDockets}, PACER: ${includePACER}`);
    if (courtFilter) console.log(`   Court filter: ${courtFilter}`);
    if (docketNumberFilter) console.log(`   Docket# filter: ${docketNumberFilter}`);
    if (clusterIdLookup) console.log(`   Cluster ID lookup: ${clusterIdLookup}`);
    if (docketIdLookup) console.log(`   Docket ID lookup: ${docketIdLookup}`);

    const { data: adminUser } = await supabase.from("user_roles").select("user_id").eq("role", "advogado").limit(1).single();
    const userId = adminUser?.user_id || "00000000-0000-0000-0000-000000000000";

    const results = {
      areas_processadas: 0,
      opinions: { encontrados: 0, inseridos: 0, duplicados: 0, erros: 0 },
      oral_arguments: { encontrados: 0, inseridos: 0, duplicados: 0, erros: 0 },
      dockets: { encontrados: 0, inseridos: 0, duplicados: 0, erros: 0 },
      pacer: { entries: 0, documents: 0, parties: 0, attorneys: 0, inseridos: 0, erros: 0 },
      detalhes: [] as Array<{ area: string; caso: string; tipo: string; fonte: string; status: string }>,
    };

    // ── DIRECT DOCKET ID LOOKUP (PACER deep-dive) ──
    if (docketIdLookup && timeOk()) {
      console.log(`📌 Direct docket lookup: ${docketIdLookup}`);
      const docket = await getDocket(docketIdLookup, apiKey);
      if (!docket) {
        return new Response(JSON.stringify({ error: `Docket ${docketIdLookup} not found` }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const caseName = docket.case_name || `Docket ${docketIdLookup}`;
      const courtId = docket.court_id || "";

      // Extract PACER data (entries, parties, attorneys) in parallel
      const pacer = await extractPACERData(docketIdLookup, caseName, courtId, apiKey);
      results.pacer.entries = pacer.entries ? pacer.entries.split("\n").length - 1 : 0;
      results.pacer.documents = pacer.docCount;
      results.pacer.parties = pacer.parties ? pacer.parties.split("\n").length - 1 : 0;
      results.pacer.attorneys = pacer.attorneys ? pacer.attorneys.split("\n").length - 1 : 0;

      // Build comprehensive docket profile
      const uid = makeUniqueId(caseName, courtId, `pacer_full_${docketIdLookup}`);
      const { data: ex } = await supabase.from("neural_knowledge_base").select("id").eq("source_reference", uid).limit(1);
      if (ex && ex.length > 0) {
        results.pacer.inseridos = 0;
        results.detalhes.push({ area: "pacer", caso: caseName, tipo: "pacer_full", fonte: "docket", status: "duplicado" });
      } else {
        const meta = [
          `Fonte: CourtListener PACER (Docket ID ${docketIdLookup})`,
          `Caso: ${caseName}`,
          `Tribunal: ${courtId}`,
          `Número: ${docket.docket_number || "N/A"}`,
          `Data Entrada: ${docket.date_filed || "N/A"}`,
          `Data Encerramento: ${docket.date_terminated || "Em andamento"}`,
          `Última Movimentação: ${docket.date_last_filing || "N/A"}`,
          `Causa: ${docket.cause || "N/A"}`,
          `Natureza: ${docket.nature_of_suit || "N/A"}`,
          `Jurisdição: ${docket.jurisdiction_type || "N/A"}`,
          `Juiz Titular: ${docket.assigned_to_str || "N/A"}`,
          `Juiz Referido: ${docket.referred_to_str || "N/A"}`,
          `Demanda Júri: ${docket.jury_demand || "N/A"}`,
          `PACER Case ID: ${docket.pacer_case_id || "N/A"}`,
          `URL: https://www.courtlistener.com${docket.absolute_url || ""}`
        ].join("\n");

        const fullContent = [meta, "", pacer.parties, "", pacer.attorneys, "", pacer.entries]
          .filter(Boolean).join("\n");

        // Generate AI analysis of the full docket
        const analysis = await generateAnalysis(
          caseName, courtId, docket.date_filed || "",
          `${pacer.parties}\n${pacer.entries}`.substring(0, 2500),
          "processual", "sumarios", "processo PACER completo"
        );

        const { error } = await supabase.from("neural_knowledge_base").insert({
          title: `[CL/PACER] ${caseName} — ${courtId} (${docket.docket_number || "s/n"})`.slice(0, 500),
          content: `${fullContent}\n\n--- ANÁLISE ---\n${analysis || "Dados catalogados para referência."}`,
          source_type: "courtlistener_pacer",
          source_reference: uid,
          tags: ["courtlistener", "pacer", "docket_entries", "parties", "attorneys", courtId, "processo_americano"].filter(Boolean),
          user_id: userId,
          is_processed: false,
        });

        if (error) { results.pacer.erros++; } else { results.pacer.inseridos++; }
        results.detalhes.push({ area: "pacer", caso: caseName, tipo: "pacer_full", fonte: "docket", status: error ? `erro: ${error.message}` : "inserido" });
      }

      // Also traverse clusters for opinions
      const clusterUrls = docket.clusters || [];
      for (const clUrl of clusterUrls.slice(0, 3)) {
        if (!timeOk()) break;
        const clId = typeof clUrl === "string" ? parseInt(clUrl.match(/clusters\/(\d+)/)?.[1] || "0") : clUrl;
        if (!clId) continue;

        const { text, judges, citations } = await getFullOpinionFromCluster(clId, apiKey);
        if (text.length < 50) continue;
        await delay(300);

        for (const ext of extractionTypes.slice(0, 2)) {
          if (!timeOk()) break;
          const oUid = makeUniqueId(caseName, courtId, `pacer_op_${ext}`);
          const { data: oEx } = await supabase.from("neural_knowledge_base").select("id").eq("source_reference", oUid).limit(1);
          if (oEx && oEx.length > 0) { results.opinions.duplicados++; continue; }

          const content = await generateAnalysis(caseName, courtId, docket.date_filed, text, "processual", ext);
          if (content.length < 100) { results.opinions.erros++; continue; }

          const { error } = await supabase.from("neural_knowledge_base").insert({
            title: `[CL/${ext}] ${caseName} — ${courtId}`.slice(0, 500),
            content: `Fonte: CourtListener (Opinion via PACER Docket #${docketIdLookup})\nCaso: ${caseName}\nTribunal: ${courtId}\nJuízes: ${judges}\nCitações: ${citations.join("; ") || "N/A"}\n\n${content}`,
            source_type: `courtlistener_${ext}`,
            source_reference: oUid,
            tags: ["courtlistener", ext, "pacer", courtId].filter(Boolean),
            user_id: userId,
            is_processed: false,
          });
          if (error) { results.opinions.erros++; } else { results.opinions.inseridos++; }
          await delay(300);
        }
      }

      return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── SPECIFIC CLUSTER LOOKUP ──
    if (clusterIdLookup && timeOk()) {
      console.log(`📌 Direct cluster lookup: ${clusterIdLookup}`);
      const { text, opType, judges, citations } = await getFullOpinionFromCluster(clusterIdLookup, apiKey);
      const cluster = await getCluster(clusterIdLookup, apiKey);
      if (cluster && text.length > 50) {
        const caseName = cluster.case_name || `Cluster ${clusterIdLookup}`;
        const courtId = cluster.docket ? "via-docket" : "";

        for (const ext of extractionTypes) {
          if (!timeOk()) break;
          const uid = makeUniqueId(caseName, courtId, ext);
          const { data: ex } = await supabase.from("neural_knowledge_base").select("id").eq("source_reference", uid).limit(1);
          if (ex && ex.length > 0) {
            results.opinions.duplicados++;
            results.detalhes.push({ area: "lookup", caso: caseName, tipo: ext, fonte: "cluster", status: "duplicado" });
            continue;
          }

          const content = await generateAnalysis(caseName, courtId, cluster.date_filed || "", text, "geral", ext);
          if (content.length < 100) {
            results.opinions.erros++;
            continue;
          }

          const citationStr = citations.length > 0 ? `\nCitações paralelas: ${citations.join("; ")}` : "";
          const { error } = await supabase.from("neural_knowledge_base").insert({
            title: `[CL/${ext}] ${caseName}`.slice(0, 500),
            content: `Fonte: CourtListener (Cluster #${clusterIdLookup})\nCaso: ${caseName}\nJuízes: ${judges}\nTipo: ${opType}${citationStr}\nURL: https://www.courtlistener.com/opinion/${clusterIdLookup}/\n\n${content}`,
            source_type: `courtlistener_${ext}`,
            source_reference: uid,
            tags: ["courtlistener", ext, "cluster_lookup", "jurisprudencia_americana"].filter(Boolean),
            user_id: userId,
            is_processed: false,
          });

          if (error) { results.opinions.erros++; }
          else { results.opinions.inseridos++; }
          results.detalhes.push({ area: "lookup", caso: caseName, tipo: ext, fonte: "cluster", status: error ? `erro: ${error.message}` : "inserido" });
          await delay(300);
        }
      }
      return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── DOCKET NUMBER FILTER ──
    if (docketNumberFilter && timeOk()) {
      console.log(`📌 Docket number filter: ${docketNumberFilter}`);
      let docketUrl = `/dockets/?docket_number=${encodeURIComponent(docketNumberFilter)}`;
      if (courtFilter) docketUrl += `&court=${courtFilter}`;
      const data = await clFetch(docketUrl, apiKey);
      const docketResults = data?.results || [];

      for (const dk of docketResults.slice(0, maxPerArea)) {
        if (!timeOk()) break;

        // If PACER data requested, extract entries/parties/attorneys
        if (includePACER && dk.id) {
          const pacer = await extractPACERData(dk.id, dk.case_name || "", dk.court_id || "", apiKey);
          results.pacer.entries += pacer.entries ? pacer.entries.split("\n").length - 1 : 0;
          results.pacer.documents += pacer.docCount;
          results.pacer.parties += pacer.parties ? pacer.parties.split("\n").length - 1 : 0;
          results.pacer.attorneys += pacer.attorneys ? pacer.attorneys.split("\n").length - 1 : 0;

          const pacerUid = makeUniqueId(dk.case_name || "", dk.court_id || "", `pacer_${dk.id}`);
          const { data: pEx } = await supabase.from("neural_knowledge_base").select("id").eq("source_reference", pacerUid).limit(1);
          if (!pEx || pEx.length === 0) {
            const pacerContent = [pacer.parties, pacer.attorneys, pacer.entries].filter(Boolean).join("\n\n");
            if (pacerContent.length > 50) {
              const { error } = await supabase.from("neural_knowledge_base").insert({
                title: `[CL/PACER] ${dk.case_name} — ${dk.court_id}`.slice(0, 500),
                content: `Fonte: CourtListener PACER\nCaso: ${dk.case_name}\nNúmero: ${dk.docket_number || ""}\nTribunal: ${dk.court_id}\n\n${pacerContent}`,
                source_type: "courtlistener_pacer",
                source_reference: pacerUid,
                tags: ["courtlistener", "pacer", dk.court_id].filter(Boolean),
                user_id: userId,
                is_processed: false,
              });
              if (error) { results.pacer.erros++; } else { results.pacer.inseridos++; }
            }
          }
          await delay(300);
        }

        // Traverse hierarchy: docket → clusters → opinions
        const clusterUrls = dk.clusters || [];
        for (const clUrl of clusterUrls.slice(0, 3)) {
          if (!timeOk()) break;
          const clId = typeof clUrl === "string" ? parseInt(clUrl.match(/clusters\/(\d+)/)?.[1] || "0") : clUrl;
          if (!clId) continue;

          const { text, judges, citations } = await getFullOpinionFromCluster(clId, apiKey);
          await delay(300);
          if (text.length < 50) continue;

          for (const ext of extractionTypes) {
            if (!timeOk()) break;
            const uid = makeUniqueId(dk.case_name || "", dk.court_id || "", `dknum_${ext}`);
            const { data: ex } = await supabase.from("neural_knowledge_base").select("id").eq("source_reference", uid).limit(1);
            if (ex && ex.length > 0) { results.opinions.duplicados++; continue; }

            const content = await generateAnalysis(dk.case_name, dk.court_id, dk.date_filed, text, "geral", ext);
            if (content.length < 100) { results.opinions.erros++; continue; }

            const { error } = await supabase.from("neural_knowledge_base").insert({
              title: `[CL/${ext}] ${dk.case_name} — ${dk.court_id}`.slice(0, 500),
              content: `Fonte: CourtListener (Docket #${dk.docket_number})\nCaso: ${dk.case_name}\nTribunal: ${dk.court_id}\nJuízes: ${judges}\nCitações: ${citations.join("; ") || "N/A"}\n\n${content}`,
              source_type: `courtlistener_${ext}`,
              source_reference: uid,
              tags: ["courtlistener", ext, "docket_filter", dk.court_id].filter(Boolean),
              user_id: userId,
              is_processed: false,
            });
            if (error) { results.opinions.erros++; } else { results.opinions.inseridos++; }
            results.detalhes.push({ area: "filter", caso: dk.case_name, tipo: ext, fonte: "docket_number", status: error ? `erro` : "inserido" });
            await delay(300);
          }
        }
      }
      return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── AREA-BASED INGESTION ──
    for (const areaKey of areas) {
      const queries = AREA_QUERIES[areaKey];
      if (!queries) continue;
      results.areas_processadas++;

      // ── OPINIONS via Search → Cluster → Opinion hierarchy ──
      if (includeOpinions) {
        const seen = new Set<number>();
        for (const q of queries.slice(0, 2)) {
          if (!timeOk()) break;
          let searchQuery = q;
          if (courtFilter) searchQuery += ` court:${courtFilter}`;

          const found = await searchCL(searchQuery, "o", apiKey, maxPerArea);
          for (const r of found) {
            if (seen.has(r.id)) continue;
            seen.add(r.id);
            if (!timeOk()) break;
            results.opinions.encontrados++;

            const caseName = r.caseName || r.case_name || "";
            const court = r.court || r.court_id || "";
            const dateFiled = r.dateFiled || r.date_filed || "";
            const clusterId = r.cluster_id || r.cluster || null;

            let opText = "";
            let judges = r.judge || "";
            let citations: string[] = [];

            if (clusterId) {
              const clId = typeof clusterId === "string"
                ? parseInt(clusterId.match(/(\d+)/)?.[1] || "0")
                : clusterId;
              if (clId) {
                const full = await getFullOpinionFromCluster(clId, apiKey);
                opText = full.text;
                judges = full.judges || judges;
                citations = full.citations;
              }
            }

            if (!opText) opText = r.snippet || "";
            await delay(400);

            for (const ext of extractionTypes) {
              if (!timeOk()) break;
              const uid = makeUniqueId(caseName, court, ext);

              const { data: ex } = await supabase.from("neural_knowledge_base").select("id").eq("source_reference", uid).limit(1);
              if (ex && ex.length > 0) {
                results.opinions.duplicados++;
                results.detalhes.push({ area: areaKey, caso: caseName, tipo: ext, fonte: "opinion", status: "duplicado" });
                continue;
              }

              const content = await generateAnalysis(caseName, court, dateFiled, opText, areaKey, ext);
              if (content.length < 100) {
                results.opinions.erros++;
                results.detalhes.push({ area: areaKey, caso: caseName, tipo: ext, fonte: "opinion", status: "sem_conteudo_ia" });
                continue;
              }

              const citStr = citations.length > 0 ? `\nCitações: ${citations.join("; ")}` : "";
              const { error } = await supabase.from("neural_knowledge_base").insert({
                title: `[CL/${ext}] ${caseName} — ${court}`.slice(0, 500),
                content: `Fonte: CourtListener (Opinion)\nCaso: ${caseName}\nTribunal: ${court}\nData: ${dateFiled}\nJuízes: ${judges}${citStr}\nURL: https://www.courtlistener.com/opinion/${clusterId || r.id}/\nÁrea: ${areaKey}\n\n${content}`,
                source_type: `courtlistener_${ext}`,
                source_reference: uid,
                tags: [areaKey, ext, "courtlistener", "opinion", "jurisprudencia_americana", court].filter(Boolean),
                user_id: userId,
                is_processed: false,
              });

              if (error) {
                results.opinions.erros++;
                results.detalhes.push({ area: areaKey, caso: caseName, tipo: ext, fonte: "opinion", status: `erro: ${error.message}` });
              } else {
                results.opinions.inseridos++;
                results.detalhes.push({ area: areaKey, caso: caseName, tipo: ext, fonte: "opinion", status: "inserido" });
              }
              await delay(300);
            }
          }
          await delay(500);
        }
      }

      // ── ORAL ARGUMENTS ──
      if (includeOralArguments && timeOk()) {
        const seenOA = new Set<number>();
        for (const q of queries.slice(0, 2)) {
          if (!timeOk()) break;
          const found = await searchCL(q, "oa", apiKey, maxPerArea);
          for (const r of found) {
            if (seenOA.has(r.id)) continue;
            seenOA.add(r.id);
            if (!timeOk()) break;
            results.oral_arguments.encontrados++;

            const caseName = r.caseName || r.case_name || "";
            const court = r.court || r.court_id || "";
            const uid = makeUniqueId(caseName, court, "oral_argument");

            const { data: ex } = await supabase.from("neural_knowledge_base").select("id").eq("source_reference", uid).limit(1);
            if (ex && ex.length > 0) {
              results.oral_arguments.duplicados++;
              results.detalhes.push({ area: areaKey, caso: caseName, tipo: "oral_argument", fonte: "audio", status: "duplicado" });
              continue;
            }

            const detail = await getAudio(r.id, apiKey);
            await delay(300);

            const duration = detail?.duration || r.duration || null;
            const downloadUrl = detail?.download_url || r.download_url || "";
            const mp3Path = detail?.local_path_mp3 || "";

            const meta = [
              `Fonte: CourtListener (Oral Argument — MP3 22050Hz/48kbps)`,
              `Caso: ${caseName}`,
              `Tribunal: ${court}`,
              `Data: ${r.dateArgued || r.date_created || ""}`,
              `Duração: ${formatDuration(duration)}`,
              `Juízes: ${r.judge || detail?.judges || "N/A"}`,
              `Download Original: ${downloadUrl || "N/A"}`,
              `MP3 Otimizado: ${mp3Path ? `https://www.courtlistener.com/${mp3Path}` : "N/A"}`,
              `URL: ${r.absolute_url || `https://www.courtlistener.com/audio/${r.id}/`}`,
              `Área: ${areaKey}`
            ].join("\n");

            const analysis = detail
              ? await generateAnalysis(caseName, court, r.dateArgued || "",
                  `Sustentação oral. Juízes: ${r.judge || ""}. Duração: ${formatDuration(duration)}.`,
                  areaKey, "sumarios", "sustentação oral")
              : "";

            const { error } = await supabase.from("neural_knowledge_base").insert({
              title: `[CL/OralArg] ${caseName} — ${court}`.slice(0, 500),
              content: `${meta}\n\n${analysis || "Gravação catalogada para referência."}`,
              source_type: "courtlistener_oral_argument",
              source_reference: uid,
              tags: [areaKey, "oral_argument", "courtlistener", "audio", "sustentacao_oral", court].filter(Boolean),
              user_id: userId,
              is_processed: false,
            });

            if (error) { results.oral_arguments.erros++; } else { results.oral_arguments.inseridos++; }
            results.detalhes.push({ area: areaKey, caso: caseName, tipo: "oral_argument", fonte: "audio", status: error ? `erro` : "inserido" });
            await delay(300);
          }
          await delay(500);
        }
      }

      // ── DOCKETS (with optional PACER enrichment) ──
      if (includeDockets && timeOk()) {
        const seenDk = new Set<number>();
        for (const q of queries.slice(0, 2)) {
          if (!timeOk()) break;
          const found = await searchCL(q, "r", apiKey, maxPerArea);
          for (const r of found) {
            const dkId = r.docket_id || r.id;
            if (seenDk.has(dkId)) continue;
            seenDk.add(dkId);
            if (!timeOk()) break;
            results.dockets.encontrados++;

            const caseName = r.caseName || r.case_name || "";
            const courtId = r.court || r.court_id || "";
            const uid = makeUniqueId(caseName, courtId, "docket");

            const { data: ex } = await supabase.from("neural_knowledge_base").select("id").eq("source_reference", uid).limit(1);
            if (ex && ex.length > 0) {
              results.dockets.duplicados++;
              results.detalhes.push({ area: areaKey, caso: caseName, tipo: "docket", fonte: "docket", status: "duplicado" });
              continue;
            }

            const detail = await getDocket(dkId, apiKey);
            await delay(300);

            // Optionally enrich with PACER entries/parties/attorneys
            let pacerSection = "";
            if (includePACER && dkId && timeOk()) {
              const pacer = await extractPACERData(dkId, caseName, courtId, apiKey);
              results.pacer.entries += pacer.entries ? pacer.entries.split("\n").length - 1 : 0;
              results.pacer.documents += pacer.docCount;
              results.pacer.parties += pacer.parties ? pacer.parties.split("\n").length - 1 : 0;
              results.pacer.attorneys += pacer.attorneys ? pacer.attorneys.split("\n").length - 1 : 0;
              pacerSection = [pacer.parties, pacer.attorneys, pacer.entries].filter(Boolean).join("\n\n");
              await delay(300);
            }

            const meta = [
              `Fonte: CourtListener (Docket/Processo${includePACER ? " + PACER" : ""})`,
              `Caso: ${caseName}`,
              `Tribunal: ${courtId}`,
              `Número: ${r.docketNumber || r.docket_number || detail?.docket_number || ""}`,
              `Data Entrada: ${r.dateFiled || r.date_filed || ""}`,
              `Data Encerramento: ${detail?.date_terminated || "Em andamento"}`,
              `Causa: ${detail?.cause || r.cause || "N/A"}`,
              `Natureza: ${detail?.nature_of_suit || r.suitNature || "N/A"}`,
              `Juiz: ${detail?.assigned_to_str || r.assignedTo || "N/A"}`,
              `Jurisdição: ${detail?.jurisdiction_type || "N/A"}`,
              `PACER ID: ${detail?.pacer_case_id || "N/A"}`,
              `URL: ${r.absolute_url || detail?.absolute_url || ""}`,
              `Área: ${areaKey}`
            ].join("\n");

            const analysisSource = pacerSection
              ? `Processo: ${detail?.cause || ""}. Natureza: ${detail?.nature_of_suit || ""}.\n${pacerSection.substring(0, 1500)}`
              : `Processo: ${detail?.cause || ""}. Natureza: ${detail?.nature_of_suit || ""}. Juiz: ${detail?.assigned_to_str || ""}.`;

            const analysis = await generateAnalysis(
              caseName, courtId, r.dateFiled || "",
              analysisSource,
              areaKey, "sumarios", "processo judicial (docket)"
            );

            const fullContent = pacerSection
              ? `${meta}\n\n${pacerSection}\n\n--- ANÁLISE ---\n${analysis || "Processo catalogado."}`
              : `${meta}\n\n${analysis || "Processo catalogado."}`;

            const { error } = await supabase.from("neural_knowledge_base").insert({
              title: `[CL/Docket] ${caseName} — ${courtId}`.slice(0, 500),
              content: fullContent,
              source_type: includePACER ? "courtlistener_pacer" : "courtlistener_docket",
              source_reference: uid,
              tags: [areaKey, "docket", "courtlistener", includePACER ? "pacer" : "", "processo", courtId].filter(Boolean),
              user_id: userId,
              is_processed: false,
            });

            if (error) { results.dockets.erros++; } else { results.dockets.inseridos++; }
            results.detalhes.push({ area: areaKey, caso: caseName, tipo: "docket", fonte: "docket", status: error ? `erro` : "inserido" });
            await delay(300);
          }
          await delay(500);
        }
      }
    }

    const totalIns = results.opinions.inseridos + results.oral_arguments.inseridos + results.dockets.inseridos + results.pacer.inseridos;
    console.log(`🏁 CL v3: ${totalIns} total inseridos (${results.opinions.inseridos} ops, ${results.oral_arguments.inseridos} OA, ${results.dockets.inseridos} dkt, ${results.pacer.inseridos} PACER)`);
    return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
