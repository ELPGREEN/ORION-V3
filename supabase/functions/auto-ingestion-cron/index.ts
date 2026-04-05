import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// AUTO-INGESTION CRON v12.0 — Fixed + KB Auto-Feed + Search Results
// Triggered by pg_cron every 6 hours.
// ═══════════════════════════════════════════════════════════

const DATAJUD_API_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

const TRIBUNAIS_CRON = [
  { id: "stj", nome: "Superior Tribunal de Justiça", url: "https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search" },
  { id: "tst", nome: "Tribunal Superior do Trabalho", url: "https://api-publica.datajud.cnj.jus.br/api_publica_tst/_search" },
  { id: "tjrs", nome: "TJ do Rio Grande do Sul", url: "https://api-publica.datajud.cnj.jus.br/api_publica_tjrs/_search" },
  { id: "tjsp", nome: "TJ de São Paulo", url: "https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search" },
  { id: "tjrj", nome: "TJ do Rio de Janeiro", url: "https://api-publica.datajud.cnj.jus.br/api_publica_tjrj/_search" },
  { id: "tjmg", nome: "TJ de Minas Gerais", url: "https://api-publica.datajud.cnj.jus.br/api_publica_tjmg/_search" },
  { id: "tjpr", nome: "TJ do Paraná", url: "https://api-publica.datajud.cnj.jus.br/api_publica_tjpr/_search" },
];

const TEMAS_INGESTION = [
  "danos morais indenização",
  "consumidor responsabilidade",
  "trabalhista rescisão",
  "família divórcio alimentos",
  "contrato inadimplemento",
];

const CATALOGO_LEIS = [
  { titulo: "Constituição Federal de 1988", sigla: "CF/88", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm", areas: ["constitucional"] },
  { titulo: "Código Civil - Lei 10.406/2002", sigla: "CC/2002", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm", areas: ["civil"] },
  { titulo: "Código de Processo Civil - Lei 13.105/2015", sigla: "CPC/2015", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm", areas: ["processual civil"] },
  { titulo: "Código Penal - Decreto-Lei 2.848/1940", sigla: "CP", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm", areas: ["penal"] },
  { titulo: "Código de Processo Penal - Decreto-Lei 3.689/1941", sigla: "CPP", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm", areas: ["processual penal"] },
  { titulo: "Lei de Execução Penal - Lei 7.210/1984", sigla: "LEP", url: "https://www.planalto.gov.br/ccivil_03/leis/l7210.htm", areas: ["penal", "execução penal"] },
  { titulo: "Consolidação das Leis do Trabalho - Decreto-Lei 5.452/1943", sigla: "CLT", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm", areas: ["trabalhista"] },
  { titulo: "Código de Defesa do Consumidor - Lei 8.078/1990", sigla: "CDC", url: "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm", areas: ["consumidor"] },
  { titulo: "Código Tributário Nacional - Lei 5.172/1966", sigla: "CTN", url: "https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm", areas: ["tributário"] },
  { titulo: "Estatuto da Criança e do Adolescente - Lei 8.069/1990", sigla: "ECA", url: "https://www.planalto.gov.br/ccivil_03/leis/l8069.htm", areas: ["família", "criança"] },
  { titulo: "Estatuto do Idoso - Lei 10.741/2003", sigla: "Est. Idoso", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.741.htm", areas: ["idoso", "civil"] },
  { titulo: "Lei Maria da Penha - Lei 11.340/2006", sigla: "Maria da Penha", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm", areas: ["penal", "família"] },
  { titulo: "Lei de Drogas - Lei 11.343/2006", sigla: "Lei Drogas", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm", areas: ["penal"] },
  { titulo: "Pacote Anticrime - Lei 13.964/2019", sigla: "Anticrime", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13964.htm", areas: ["penal", "processual penal"] },
  { titulo: "Reforma Trabalhista - Lei 13.467/2017", sigla: "Ref. Trabalhista", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13467.htm", areas: ["trabalhista"] },
  { titulo: "LGPD - Lei 13.709/2018", sigla: "LGPD", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm", areas: ["digital", "civil"] },
  { titulo: "Marco Civil da Internet - Lei 12.965/2014", sigla: "Marco Civil", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm", areas: ["digital", "civil"] },
  { titulo: "Lei de Falências - Lei 11.101/2005", sigla: "Lei Falências", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11101.htm", areas: ["empresarial"] },
  { titulo: "Lei de Licitações - Lei 14.133/2021", sigla: "Lei Licitações", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm", areas: ["administrativo"] },
  { titulo: "Lei de Improbidade Administrativa - Lei 8.429/1992", sigla: "LIA", url: "https://www.planalto.gov.br/ccivil_03/leis/l8429.htm", areas: ["administrativo"] },
  { titulo: "Lei do Inquilinato - Lei 8.245/1991", sigla: "Lei Inquilinato", url: "https://www.planalto.gov.br/ccivil_03/leis/l8245.htm", areas: ["civil", "imobiliário"] },
  { titulo: "Estatuto da Advocacia - Lei 8.906/1994", sigla: "EAOAB", url: "https://www.planalto.gov.br/ccivil_03/leis/l8906.htm", areas: ["advocacia"] },
  { titulo: "Lei de Arbitragem - Lei 9.307/1996", sigla: "Lei Arbitragem", url: "https://www.planalto.gov.br/ccivil_03/leis/l9307.htm", areas: ["civil", "arbitragem"] },
  { titulo: "Lei dos Juizados Especiais - Lei 9.099/1995", sigla: "Lei JEC", url: "https://www.planalto.gov.br/ccivil_03/leis/l9099.htm", areas: ["processual civil"] },
  { titulo: "Lei de Execução Fiscal - Lei 6.830/1980", sigla: "LEF", url: "https://www.planalto.gov.br/ccivil_03/leis/l6830.htm", areas: ["tributário", "fiscal"] },
  { titulo: "Lei do Mandado de Segurança - Lei 12.016/2009", sigla: "LMS", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12016.htm", areas: ["constitucional", "administrativo"] },
  { titulo: "Lei da Ação Civil Pública - Lei 7.347/1985", sigla: "LACP", url: "https://www.planalto.gov.br/ccivil_03/leis/l7347orig.htm", areas: ["civil", "coletivo"] },
  { titulo: "Lei de Abuso de Autoridade - Lei 13.869/2019", sigla: "Lei Abuso", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13869.htm", areas: ["penal", "administrativo"] },
  { titulo: "Lei Anticorrupção - Lei 12.846/2013", sigla: "Lei Anticorrupção", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm", areas: ["administrativo", "empresarial"] },
  { titulo: "Estatuto da Pessoa com Deficiência - Lei 13.146/2015", sigla: "EPD", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm", areas: ["civil", "acessibilidade"] },
  { titulo: "Lei do Processo Administrativo Federal - Lei 9.784/1999", sigla: "LPA", url: "https://www.planalto.gov.br/ccivil_03/leis/l9784.htm", areas: ["administrativo"] },
  { titulo: "Lei Orgânica da Seguridade Social - Lei 8.212/1991", sigla: "LOSS", url: "https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm", areas: ["previdenciário"] },
  { titulo: "Lei de Benefícios da Previdência Social - Lei 8.213/1991", sigla: "LBPS", url: "https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm", areas: ["previdenciário"] },
  { titulo: "Estatuto da Terra - Lei 4.504/1964", sigla: "Est. Terra", url: "https://www.planalto.gov.br/ccivil_03/leis/l4504.htm", areas: ["agrário"] },
  { titulo: "Código Florestal - Lei 12.651/2012", sigla: "Cód. Florestal", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm", areas: ["ambiental"] },
  { titulo: "Lei de Crimes Ambientais - Lei 9.605/1998", sigla: "LCA", url: "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm", areas: ["ambiental", "penal"] },
  { titulo: "Código Eleitoral - Lei 4.737/1965", sigla: "CE", url: "https://www.planalto.gov.br/ccivil_03/leis/l4737.htm", areas: ["eleitoral"] },
  { titulo: "Lei dos Partidos Políticos - Lei 9.096/1995", sigla: "LPP", url: "https://www.planalto.gov.br/ccivil_03/leis/l9096.htm", areas: ["eleitoral"] },
  { titulo: "Lei das Eleições - Lei 9.504/1997", sigla: "Lei Eleições", url: "https://www.planalto.gov.br/ccivil_03/leis/l9504.htm", areas: ["eleitoral"] },
  { titulo: "Lei de Migração - Lei 13.445/2017", sigla: "Lei Migração", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13445.htm", areas: ["internacional"] },
  { titulo: "Lei do FGTS - Lei 8.036/1990", sigla: "Lei FGTS", url: "https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm", areas: ["trabalhista"] },
  { titulo: "Lei de Registros Públicos - Lei 6.015/1973", sigla: "LRP", url: "https://www.planalto.gov.br/ccivil_03/leis/l6015compilada.htm", areas: ["civil", "imobiliário"] },
  { titulo: "Lei do Condomínio e Incorporações - Lei 4.591/1964", sigla: "Lei Condomínio", url: "https://www.planalto.gov.br/ccivil_03/leis/l4591.htm", areas: ["civil", "imobiliário"] },
  { titulo: "Lei do Divórcio - Lei 6.515/1977", sigla: "Lei Divórcio", url: "https://www.planalto.gov.br/ccivil_03/leis/l6515.htm", areas: ["família"] },
  { titulo: "Lei de Alienação Parental - Lei 12.318/2010", sigla: "Lei Alien. Parental", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12318.htm", areas: ["família"] },
  { titulo: "Lei da Guarda Compartilhada - Lei 13.058/2014", sigla: "Lei Guarda Comp.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l13058.htm", areas: ["família"] },
  { titulo: "Marco Legal das Startups - LC 182/2021", sigla: "Marco Startups", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp182.htm", areas: ["empresarial", "digital"] },
];

interface IngestionStats {
  tribunal: string;
  tema: string;
  fetched: number;
  inserted: number;
  duplicates: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════
// FIXED: fetchDataJud no longer references out-of-scope `req`
// ═══════════════════════════════════════════════════════════
async function fetchDataJud(
  tribunalUrl: string,
  tema: string,
  size: number = 3
): Promise<Array<{ titulo: string; conteudo: string; numero: string; data: string; orgao: string }>> {
  try {
    const res = await fetch(tribunalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `APIKey ${DATAJUD_API_KEY}`,
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        size,
        query: {
          bool: {
            should: [
              { match: { "assuntos.nome": { query: tema, boost: 3 } } },
              { match: { "classe.nome": { query: tema, boost: 2 } } },
            ],
            minimum_should_match: 1,
          },
        },
        sort: [{ dataAjuizamento: { order: "desc" } }],
        _source: [
          "numeroProcesso", "classe.nome", "assuntos.nome",
          "orgaoJulgador.nome", "dataAjuizamento", "movimentos",
        ],
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const hits = data.hits?.hits || [];

    return hits.map((hit: any) => {
      const src = hit._source || {};
      const assuntos = (src.assuntos || []).map((a: any) => a.nome).filter(Boolean);
      const movimentos = (src.movimentos || [])
        .slice(0, 3)
        .map((m: any) => m.nome || m.complementosTabelados?.map((c: any) => c.descricao).join(", "))
        .filter(Boolean);

      return {
        titulo: `${src.classe?.nome || "Processo"} - ${src.numeroProcesso || "N/A"}`,
        conteudo: [
          `Classe: ${src.classe?.nome || "N/A"}`,
          `Assuntos: ${assuntos.join(", ") || "N/A"}`,
          `Órgão Julgador: ${src.orgaoJulgador?.nome || "N/A"}`,
          movimentos.length > 0 ? `Movimentos: ${movimentos.join("; ")}` : "",
        ].filter(Boolean).join("\n"),
        numero: src.numeroProcesso || "",
        data: src.dataAjuizamento || "",
        orgao: src.orgaoJulgador?.nome || "",
      };
    });
  } catch (e) {
    console.warn(`DataJud fetch error: ${e}`);
    return [];
  }
}

async function ingestLexMLCatalogo(
  supabase: any
): Promise<{ inserted: number; duplicates: number; errors: string[] }> {
  let inserted = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (const lei of CATALOGO_LEIS) {
    try {
      const { data: existing } = await supabase
        .from("legal_embeddings")
        .select("id")
        .eq("title", lei.titulo)
        .eq("source", "lexml_catalogo")
        .limit(1);

      if (existing && existing.length > 0) {
        duplicates++;
        continue;
      }

      const content = [
        `${lei.titulo} (${lei.sigla})`,
        `Áreas: ${lei.areas.join(", ")}`,
        `Legislação fundamental do ordenamento jurídico brasileiro.`,
        `Disponível em: ${lei.url}`,
      ].join("\n");

      const { error: insertError } = await supabase
        .from("legal_embeddings")
        .insert({
          title: lei.titulo,
          content,
          source: "lexml_catalogo",
          source_label: "Catálogo LexML (47 Leis)",
          content_type: "lei",
          url: lei.url,
          metadata: { sigla: lei.sigla, areas: lei.areas, autoIngested: true, catalogVersion: "v12.0" },
        });

      if (insertError) {
        errors.push(`${lei.sigla}: ${insertError.message}`);
      } else {
        inserted++;
      }
    } catch (e) {
      errors.push(`${lei.sigla}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { inserted, duplicates, errors };
}

// ═══════════════════════════════════════════════════════════
// NEW v12.0: Auto-feed neural_knowledge_base from successful AI interactions
// Harvests high-quality chat_ia_messages and promotes them to KB
// ═══════════════════════════════════════════════════════════
async function feedKBFromSearchResults(supabase: any): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  try {
    // 1. Harvest high-quality AI chat responses from last 24h
    const { data: aiMessages } = await supabase
      .from("chat_ia_messages")
      .select("id, content, intent, sources, created_at, conversation_id")
      .eq("role", "assistant")
      .eq("neural_enhanced", true)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    for (const msg of aiMessages || []) {
      if (!msg.content || msg.content.length < 100) { skipped++; continue; }
      // Skip noise
      if (msg.content.includes("CREATE TABLE") || msg.content.includes("source_tracker")) { skipped++; continue; }

      // Check for duplicates by content hash (first 200 chars)
      const contentKey = msg.content.substring(0, 200).trim();
      const { data: existing } = await supabase
        .from("neural_knowledge_base")
        .select("id")
        .eq("source_type", "ai_interaction")
        .ilike("content", `${contentKey.substring(0, 80)}%`)
        .limit(1);

      if (existing && existing.length > 0) { skipped++; continue; }

      // Determine category from intent
      const category = msg.intent === "legal_search" ? "jurisprudencia"
        : msg.intent === "document_generation" ? "documentos"
        : msg.intent === "analysis" ? "analise"
        : "geral";

      const tags = [msg.intent || "chat", "auto_ingested", "ai_response"];
      if (msg.sources) {
        try {
          const srcArr = typeof msg.sources === "string" ? JSON.parse(msg.sources) : msg.sources;
          if (Array.isArray(srcArr)) {
            for (const s of srcArr.slice(0, 3)) {
              if (s.source) tags.push(s.source);
            }
          }
        } catch { /* ignore */ }
      }

      const { error } = await supabase.from("neural_knowledge_base").insert({
        title: `AI Response: ${msg.intent || "chat"} — ${new Date(msg.created_at).toLocaleDateString("pt-BR")}`,
        content: msg.content.substring(0, 5000),
        source_type: "ai_interaction",
        category,
        tags,
        is_processed: false,
        metadata: {
          conversation_id: msg.conversation_id,
          intent: msg.intent,
          autoIngested: true,
          ingestedAt: new Date().toISOString(),
        },
      });

      if (!error) inserted++;
    }

    // 2. Harvest high-quality neural_learning_data not yet in KB
    const { data: learnedItems } = await supabase
      .from("neural_learning_data")
      .select("id, interaction_type, input_text, output_text, quality_score, metadata")
      .eq("learned", true)
      .gte("quality_score", 0.8)
      .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .limit(30);

    for (const item of learnedItems || []) {
      if (!item.output_text || item.output_text.length < 80) continue;
      // Skip if already auto-ingested
      const meta = item.metadata as Record<string, unknown> | null;
      if (meta?.source?.toString().startsWith("auto_ingestion")) continue;

      const contentKey2 = item.output_text.substring(0, 80);
      const { data: existing2 } = await supabase
        .from("neural_knowledge_base")
        .select("id")
        .eq("source_type", "learned_interaction")
        .ilike("content", `${contentKey2}%`)
        .limit(1);

      if (existing2 && existing2.length > 0) continue;

      const { error } = await supabase.from("neural_knowledge_base").insert({
        title: `Learned: ${item.interaction_type} (score ${item.quality_score})`,
        content: `${item.input_text}\n\n---\n\n${item.output_text}`.substring(0, 5000),
        source_type: "learned_interaction",
        category: item.interaction_type === "legal_search" ? "jurisprudencia" : "geral",
        tags: [item.interaction_type, "auto_ingested", "high_quality"],
        is_processed: false,
      });

      if (!error) inserted++;
    }
  } catch (e) {
    console.warn("feedKBFromSearchResults error:", e);
  }

  return { inserted, skipped };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("🕐 Auto-Ingestion Cron v12.0: Starting (7 tribunais + 47 leis + KB feed)...");
  const allStats: IngestionStats[] = [];

  // ── Phase 1: DataJud ingestion ──
  for (const tribunal of TRIBUNAIS_CRON) {
    for (const tema of TEMAS_INGESTION) {
      const stats: IngestionStats = {
        tribunal: tribunal.id,
        tema,
        fetched: 0,
        inserted: 0,
        duplicates: 0,
        errors: [],
      };

      try {
        const results = await fetchDataJud(tribunal.url, tema, 3);
        stats.fetched = results.length;

        for (const result of results) {
          if (!result.conteudo || result.conteudo.length < 50) continue;

          const { data: existing } = await supabase
            .from("legal_embeddings")
            .select("id")
            .eq("title", result.titulo)
            .eq("source", `datajud_${tribunal.id}`)
            .limit(1);

          if (existing && existing.length > 0) {
            stats.duplicates++;
            continue;
          }

          const { error: insertError } = await supabase
            .from("legal_embeddings")
            .insert({
              title: result.titulo,
              content: result.conteudo,
              source: `datajud_${tribunal.id}`,
              source_label: `DataJud ${tribunal.id.toUpperCase()}`,
              content_type: "jurisprudencia",
              published_date: result.data || null,
              url: `https://processo.stj.jus.br/processo/pesquisa/?termo=${result.numero}`,
              metadata: { orgao: result.orgao, tema, autoIngested: true },
            });

          if (insertError) {
            stats.errors.push(insertError.message);
          } else {
            stats.inserted++;
          }
        }
      } catch (e) {
        stats.errors.push(e instanceof Error ? e.message : String(e));
      }

      allStats.push(stats);
    }
  }

  // ── Phase 2: LexML Catálogo ──
  console.log("📜 Ingesting LexML Catálogo (47 leis)...");
  const catalogResult = await ingestLexMLCatalogo(supabase);
  allStats.push({
    tribunal: "lexml_catalogo",
    tema: "47 leis fundamentais",
    fetched: CATALOGO_LEIS.length,
    inserted: catalogResult.inserted,
    duplicates: catalogResult.duplicates,
    errors: catalogResult.errors,
  });

  // ── Phase 3: NEW — Feed KB from search results & AI interactions ──
  console.log("🧠 Feeding neural_knowledge_base from AI interactions...");
  const kbFeedResult = await feedKBFromSearchResults(supabase);
  console.log(`🧠 KB Feed: ${kbFeedResult.inserted} inserted, ${kbFeedResult.skipped} skipped`);

  const totalInserted = allStats.reduce((sum, s) => sum + s.inserted, 0) + kbFeedResult.inserted;
  const totalDuplicates = allStats.reduce((sum, s) => sum + s.duplicates, 0);
  const totalErrors = allStats.reduce((sum, s) => sum + s.errors.length, 0);

  // ── Closed Loop: embeddings + RLHF + pipeline ──
  const serviceKey = supabaseKey;

  if (totalInserted > 0) {
    console.log(`🔗 Triggering closed loop for ${totalInserted} new items...`);

    // 1. generate-embeddings
    EdgeRuntime.waitUntil(
      fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ target: "both", batchSize: Math.min(totalInserted * 2, 200) }),
        signal: AbortSignal.timeout(90000),
      })
      .then(() => console.log("✅ generate-embeddings triggered"))
      .catch(e => console.warn("generate-embeddings error:", e))
    );

    // 2. Register RLHF cycle
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          await supabase.from("neural_learning_data").insert({
            interaction_type: "auto_ingestion_cycle",
            input_text: `auto-ingestion-cron v12.0 — ${TRIBUNAIS_CRON.length} tribunais + ${CATALOGO_LEIS.length} leis + KB feed`,
            output_text: JSON.stringify({ totalInserted, totalDuplicates, kbFeed: kbFeedResult }),
            quality_score: Math.min(0.5 + (totalInserted / 50) * 0.35, 0.9),
            learned: totalInserted >= 10,
            metadata: { totalInserted, totalDuplicates, totalErrors, kbFeed: kbFeedResult, autoScored: true, source: "auto_ingestion_cron" },
          });
          console.log("✅ RLHF cycle registered");
        } catch (e) { console.warn("RLHF registration failed:", e); }
      })()
    );
  }

  // ── RLHF Modules: Avaliações + Chat Humano + CRM ──
  EdgeRuntime.waitUntil(
    (async () => {
      try {
        // Avaliações aprovadas
        const { data: avaliacoes } = await supabase
          .from("avaliacoes")
          .select("nome, nota, depoimento, user_id")
          .eq("aprovado", true)
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(20);

        for (const av of avaliacoes || []) {
          await supabase.from("neural_learning_data").upsert({
            interaction_type: "avaliacao",
            input_text: `Avaliação aprovada de ${av.nome} — ${av.nota} estrelas`,
            output_text: av.depoimento?.substring(0, 1000) || "",
            quality_score: Math.min(av.nota / 5, 1.0),
            learned: av.nota >= 4,
            user_id: av.user_id || null,
            metadata: { nota: av.nota, aprovado: true, source: "auto_ingestion_avaliacoes" },
          }, { onConflict: "interaction_type,input_text" });
        }

        // Chat humano (advogado)
        const { data: chatMsgs } = await supabase
          .from("chat_messages")
          .select("content, sender_role, conversation_id")
          .eq("sender_role", "advogado")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(30);

        for (const msg of chatMsgs || []) {
          if ((msg.content || "").length < 50) continue;
          await supabase.from("neural_learning_data").insert({
            interaction_type: "chat_humano",
            input_text: `[advogado] ${(msg.content || "").substring(0, 500)}`,
            output_text: msg.content?.substring(0, 2000) || "",
            quality_score: 0.75,
            learned: true,
            metadata: { sender_role: msg.sender_role, conversation_id: msg.conversation_id, source: "auto_ingestion_chat_humano" },
          }).catch(() => {});
        }

        // Processos recentes
        const { data: processos } = await supabase
          .from("processos")
          .select("numero_processo, tipo, cliente_nome, status, descricao, valor_causa")
          .in("status", ["concluido", "em_andamento"])
          .gte("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(10);

        for (const p of processos || []) {
          if (!p.descricao || p.descricao.length < 30) continue;
          await supabase.from("neural_learning_data").insert({
            interaction_type: "document_generation",
            input_text: `Processo ${p.numero_processo} (${p.tipo}): ${p.descricao.substring(0, 300)}`,
            output_text: `Status: ${p.status} | Valor: ${p.valor_causa || 0} | Cliente: ${p.cliente_nome}`,
            quality_score: p.status === "concluido" ? 0.88 : 0.72,
            learned: p.status === "concluido",
            metadata: { tipo: p.tipo, status: p.status, source: "auto_ingestion_processos" },
          }).catch(() => {});
        }

        // Andamentos recentes
        const { data: andamentos } = await supabase
          .from("andamentos")
          .select("descricao, tipo, data_ocorrencia")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(20);

        for (const a of andamentos || []) {
          if ((a.descricao || "").length < 40) continue;
          await supabase.from("neural_learning_data").insert({
            interaction_type: "document_generation",
            input_text: `Andamento processual [${a.tipo}] em ${a.data_ocorrencia}`,
            output_text: a.descricao.substring(0, 2000),
            quality_score: 0.78,
            learned: true,
            metadata: { tipo: a.tipo, source: "auto_ingestion_andamentos" },
          }).catch(() => {});
        }

        console.log("✅ RLHF modules processed (Avaliações + Chat + CRM + Processos + Andamentos)");
      } catch (e) {
        console.warn("RLHF modules error:", e);
      }
    })()
  );

  // Senado sync (10s delay)
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 10000)).then(() =>
      fetch(`${supabaseUrl}/functions/v1/neural-pipeline-orchestrator`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ action: "senado_sync" }),
        signal: AbortSignal.timeout(90000),
      })
      .then(() => console.log("✅ senado_sync triggered"))
      .catch(e => console.warn("senado_sync error:", e))
    )
  );

  // Full cycle (30s delay)
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 30000)).then(() =>
      fetch(`${supabaseUrl}/functions/v1/neural-pipeline-orchestrator`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ action: "full_cycle" }),
        signal: AbortSignal.timeout(90000),
      })
      .then(() => console.log("✅ full_cycle triggered"))
      .catch(e => console.warn("full_cycle error:", e))
    )
  );

  // DPO if enough samples (45s delay)
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 45000)).then(async () => {
      try {
        const { count } = await supabase
          .from("neural_learning_data")
          .select("id", { count: "exact", head: true })
          .gte("quality_score", 0.7)
          .is("learned", true);

        if ((count || 0) >= 10) {
          await fetch(`${supabaseUrl}/functions/v1/neural-training`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ action: "dpo_optimize" }),
            signal: AbortSignal.timeout(60000),
          });
          console.log(`✅ DPO triggered with ${count} high-quality samples`);
        }
      } catch (e) { console.warn("DPO trigger error:", e); }
    })
  );

  console.log(`✅ Auto-Ingestion v12.0 complete: ${totalInserted} inserted, ${totalDuplicates} duplicates, ${totalErrors} errors`);

  return new Response(
    JSON.stringify({
      success: true,
      version: "v12.0",
      totalInserted,
      totalDuplicates,
      totalErrors,
      kbFeed: kbFeedResult,
      stats: allStats,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
