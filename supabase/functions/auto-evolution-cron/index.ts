import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// AUTO-EVOLUTION CRON — Ingestão diária de leis e jurisprudência
// Busca novas leis/decisões nas APIs públicas e indexa no pgvector
// Executado via pg_cron 6x/dia (a cada 4h)
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

interface IngestResult {
  source: string;
  fetched: number;
  indexed: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════
// v11.1: Catálogo LexML offline (47 leis) — substitui SRU (404 permanente)
// ═══════════════════════════════════════════════════════════
const CATALOGO_LEIS_EVOLUTION = [
  { titulo: "Constituição Federal de 1988", sigla: "CF/88", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm", areas: ["constitucional"] },
  { titulo: "Código Civil - Lei 10.406/2002", sigla: "CC/2002", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm", areas: ["civil"] },
  { titulo: "Código de Processo Civil - Lei 13.105/2015", sigla: "CPC/2015", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm", areas: ["processual civil"] },
  { titulo: "Código Penal - Decreto-Lei 2.848/1940", sigla: "CP", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm", areas: ["penal"] },
  { titulo: "Código de Processo Penal - Decreto-Lei 3.689/1941", sigla: "CPP", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm", areas: ["processual penal"] },
  { titulo: "Consolidação das Leis do Trabalho - Decreto-Lei 5.452/1943", sigla: "CLT", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm", areas: ["trabalhista"] },
  { titulo: "Código de Defesa do Consumidor - Lei 8.078/1990", sigla: "CDC", url: "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm", areas: ["consumidor"] },
  { titulo: "Código Tributário Nacional - Lei 5.172/1966", sigla: "CTN", url: "https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm", areas: ["tributário"] },
  { titulo: "LGPD - Lei 13.709/2018", sigla: "LGPD", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm", areas: ["digital", "civil"] },
  { titulo: "Marco Civil da Internet - Lei 12.965/2014", sigla: "Marco Civil", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm", areas: ["digital"] },
  { titulo: "Estatuto da Criança e do Adolescente - Lei 8.069/1990", sigla: "ECA", url: "https://www.planalto.gov.br/ccivil_03/leis/l8069.htm", areas: ["família"] },
  { titulo: "Lei Maria da Penha - Lei 11.340/2006", sigla: "Maria da Penha", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm", areas: ["penal", "família"] },
  { titulo: "Lei de Falências - Lei 11.101/2005", sigla: "Lei Falências", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11101.htm", areas: ["empresarial"] },
  { titulo: "Lei de Licitações - Lei 14.133/2021", sigla: "Lei Licitações", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm", areas: ["administrativo"] },
  { titulo: "Reforma Trabalhista - Lei 13.467/2017", sigla: "Ref. Trabalhista", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13467.htm", areas: ["trabalhista"] },
  { titulo: "Pacote Anticrime - Lei 13.964/2019", sigla: "Anticrime", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13964.htm", areas: ["penal"] },
  { titulo: "Estatuto do Idoso - Lei 10.741/2003", sigla: "Est. Idoso", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.741.htm", areas: ["civil"] },
  { titulo: "Lei de Execução Penal - Lei 7.210/1984", sigla: "LEP", url: "https://www.planalto.gov.br/ccivil_03/leis/l7210.htm", areas: ["penal"] },
  { titulo: "Lei de Drogas - Lei 11.343/2006", sigla: "Lei Drogas", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm", areas: ["penal"] },
  { titulo: "Lei de Improbidade Administrativa - Lei 8.429/1992", sigla: "LIA", url: "https://www.planalto.gov.br/ccivil_03/leis/l8429.htm", areas: ["administrativo"] }
];

function fetchLexMLCatalogo(): Array<{ title: string; content: string; url: string; date: string }> {
  return CATALOGO_LEIS_EVOLUTION.map(lei => ({
    title: `${lei.titulo} (${lei.sigla})`,
    content: `${lei.titulo} (${lei.sigla})\nÁreas: ${lei.areas.join(", ")}\nLegislação fundamental do ordenamento jurídico brasileiro.\nDisponível em: ${lei.url}`,
    url: lei.url,
    date: new Date().toISOString().split("T")[0],
  }));
}
// ─── Fetch recent STF decisions ───
async function fetchSTFRecent(): Promise<Array<{ title: string; content: string; url: string; date: string }>> {
  const results: Array<{ title: string; content: string; url: string; date: string }> = [];
  
  try {
    const url = "https://dadosabertos.stf.jus.br/api/plenario/lista";
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return results;
    
    const data = await res.json();
    const items = Array.isArray(data) ? data.slice(0, 15) : (data.items || data.results || []).slice(0, 15);
    
    for (const item of items) {
      const title = item.titulo || item.nome || item.descricao || "";
      const content = item.ementa || item.descricao || item.resumo || "";
      if (title && content && content.length > 30) {
        results.push({
          title: title.substring(0, 300),
          content: `${title}\n\n${content}`.substring(0, 3000),
          url: item.link || item.url || `https://portal.stf.jus.br/`,
          date: item.data || item.dataPublicacao || new Date().toISOString().split("T")[0],
        });
      }
    }
  } catch (err) {
    console.warn("STF fetch failed:", err);
  }

  return results;
}

// ─── Fetch Câmara dos Deputados recent propositions ───
async function fetchCamaraRecent(): Promise<Array<{ title: string; content: string; url: string; date: string }>> {
  const results: Array<{ title: string; content: string; url: string; date: string }> = [];
  
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dataInicio = weekAgo.toISOString().split("T")[0];
    
    const url = `https://dadosabertos.camara.leg.br/api/v2/proposicoes?dataInicio=${dataInicio}&ordem=DESC&ordenarPor=id&itens=15`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return results;
    
    const data = await res.json();
    for (const item of (data.dados || []).slice(0, 15)) {
      const title = `${item.siglaTipo} ${item.numero}/${item.ano}`;
      const content = item.ementa || item.ementaDetalhada || "";
      if (content && content.length > 20) {
        results.push({
          title: title.substring(0, 300),
          content: `${title}\n\n${content}`.substring(0, 3000),
          url: item.urlInteiroTeor || `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${item.id}`,
          date: item.dataApresentacao || new Date().toISOString().split("T")[0],
        });
      }
    }
  } catch (err) {
    console.warn("Câmara fetch failed:", err);
  }

  return results;
}

// ─── Datajud CNJ — Recent decisions from key tribunals ───
async function fetchDatajudRecent(): Promise<Array<{ title: string; content: string; url: string; date: string }>> {
  const results: Array<{ title: string; content: string; url: string; date: string }> = [];
  const tribunais = ["stj", "tst", "tjsp", "tjrj", "tjmg", "tjrs"];
  const apiKey = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

  for (const tribunal of tribunais) {
    try {
      const today = new Date();
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `APIKey ${apiKey}`,
        },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          size: 10,
          query: {
            bool: {
              must: [
                {
                  range: {
                    dataHoraUltimaAtualizacao: {
                      gte: monthAgo.toISOString().split("T")[0],
                    },
                  },
                }
              ],
            },
          },
          sort: [{ dataHoraUltimaAtualizacao: { order: "desc" } }],
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();

      for (const hit of (data.hits?.hits || []).slice(0, 10)) {
        const src = hit._source || {};
        const title = `${tribunal.toUpperCase()} - ${src.numeroProcesso || "Processo"}`;
        const content = [
          src.classeProcessual?.nome || "",
          src.assuntos?.map((a: any) => a.nome).join(", ") || "",
          src.movimentos?.slice(0, 3).map((m: any) => m.nome).join("; ") || ""
        ]
          .filter(Boolean)
          .join("\n");

        if (content.length > 20) {
          results.push({
            title: title.substring(0, 300),
            content: `${title}\n\n${content}`.substring(0, 3000),
            url: `https://processo.${tribunal}.jus.br/processo/${src.numeroProcesso || ""}`,
            date: src.dataHoraUltimaAtualizacao?.split("T")[0] || new Date().toISOString().split("T")[0],
          });
        }
      }
    } catch (err) {
      console.warn(`Datajud ${tribunal} fetch failed:`, err);
    }
  }

  return results;
}

// ─── Index items via neural-search function ───
async function indexItems(
  items: Array<{ title: string; content: string; url: string; date: string }>,
  source: string,
  sourceLabel: string,
  contentType: string
): Promise<{ indexed: number; errors: string[] }> {
  if (items.length === 0) return { indexed: 0, errors: [] };

  const errors: string[] = [];
  let indexed = 0;

  // Batch in groups of 5
  for (let i = 0; i < items.length; i += 5) {
    const batch = items.slice(i, i + 5);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/neural-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({
          mode: "index",
          query: batch[0].title,
          items: batch.map((item) => ({
            title: item.title,
            content: item.content,
            source,
            sourceLabel,
            contentType,
            url: item.url,
            publishedDate: item.date,
            metadata: {
              autoEvolution: true,
              ingestedAt: new Date().toISOString(),
            },
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        indexed += data.indexed || batch.length;
      } else {
        const errText = await res.text();
        errors.push(`Batch ${i / 5 + 1}: ${res.status} - ${errText.substring(0, 100)}`);
      }
    } catch (err) {
      errors.push(`Batch ${i / 5 + 1}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { indexed, errors };
}

// ─── Helper: Extract XML tag ───
function extractXmlTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: IngestResult[] = [];

  console.log("🧠 Auto-Evolution Cron started at", new Date().toISOString());

  // 1. Fetch from all sources in parallel
  const [lexmlItems, stfItems, camaraItems, datajudItems] = await Promise.allSettled([
    Promise.resolve(fetchLexMLCatalogo()),
    fetchSTFRecent(),
    fetchCamaraRecent(),
    fetchDatajudRecent()
  ]);

  // 1b. Trigger dados.gov.br and STF BigQuery ingestion (async, fire-and-forget)
  try {
    const supabaseForTrigger = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Trigger dados.gov.br ingestion with limited scope
    fetch(`${SUPABASE_URL}/functions/v1/ingest-dados-gov`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        termos: ["jurisprudência", "legislação", "decisões judiciais", "tribunal"],
        organizacoes: ["supremo-tribunal-federal", "conselho-nacional-de-justica"],
        maxPorTermo: 5,
        generateEmbeddings: true,
      }),
    }).catch(err => console.warn("dados.gov.br trigger failed:", err));

    // Trigger STF BigQuery ingestion
    fetch(`${SUPABASE_URL}/functions/v1/ingest-stf-bigquery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        limit: 20,
        anoInicio: 2024,
        generateEmbeddings: true,
      }),
    }).catch(err => console.warn("STF BigQuery trigger failed:", err));

    console.log("🔗 Triggered dados.gov.br + STF BigQuery ingestion (async)");
  } catch (triggerErr) {
    console.warn("Failed to trigger new source ingestion:", triggerErr);
  }

  // 2. Index each source
  const sources = [
    { items: lexmlItems, source: "lexml_catalogo", label: "Catálogo LexML (47 Leis)", type: "lei" },
    { items: stfItems, source: "stf", label: "Dados Abertos STF", type: "jurisprudencia" },
    { items: camaraItems, source: "camara", label: "Câmara dos Deputados", type: "proposicao" },
    { items: datajudItems, source: "datajud_auto", label: "Datajud CNJ (Auto)", type: "jurisprudencia" }
  ];

  for (const src of sources) {
    const items = src.items.status === "fulfilled" ? src.items.value : [];
    const { indexed, errors } = await indexItems(items, src.source, src.label, src.type);
    results.push({
      source: src.label,
      fetched: items.length,
      indexed,
      errors,
    });
    console.log(`📚 ${src.label}: fetched=${items.length}, indexed=${indexed}, errors=${errors.length}`);
  }

  // 3. Log metrics
  const totalFetched = results.reduce((a, r) => a + r.fetched, 0);
  const totalIndexed = results.reduce((a, r) => a + r.indexed, 0);
  const totalErrors = results.reduce((a, r) => a + r.errors.length, 0);
  // ═══ EMBEDDING BATCH LOOP: process all pending in up to 5 iterations ═══
  console.log("🧠 Starting embedding batch loop...");
  let embRemaining = 1;
  let embIterations = 0;
  let embTotal = 0;
  while (embRemaining > 0 && embIterations < 5) {
    try {
      const embRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ target: "both", batchSize: 100 }),
        signal: AbortSignal.timeout(120000),
      });
      const embData = await embRes.json();
      const batchProcessed = (embData?.neural?.processed ?? 0) + (embData?.legal?.processed ?? 0);
      embRemaining = (embData?.remaining?.neural ?? 0) + (embData?.remaining?.legal ?? 0);
      embTotal += batchProcessed;
      embIterations++;
      console.log(`🧠 Embedding batch ${embIterations}: +${batchProcessed}, remaining=${embRemaining}`);
      if (batchProcessed === 0) break;
    } catch (e) {
      console.warn(`Embedding batch ${embIterations + 1} error:`, e);
      break;
    }
  }
  console.log(`🧠 Embedding loop done: ${embTotal} processed in ${embIterations} iterations, ${embRemaining} remaining`);

  // ═══ STRATEGIC KNOWLEDGE INGESTION: EU, IoT, AI, Manufacturing, Supply Chain ═══
  const strategicKnowledge = [
    { title: "Horizon Europe - Framework Programme 2021-2027", content: "Horizon Europe é o principal programa de financiamento da UE para pesquisa e inovação (2021-2027), com orçamento de €95.5 bilhões. Inclui pilares: Ciência Excelente, Desafios Globais e Competitividade Industrial, Europa Inovadora. Clusters temáticos: Saúde, Cultura, Segurança Civil, Digital/Indústria/Espaço, Clima/Energia/Mobilidade, Alimentos/Bioeconomia. Missões: Adaptação climática, Câncer, Oceanos, Cidades inteligentes, Solo.", source_type: "regulation", category: "eu_funding", tags: ["horizon-europe", "eu-funding", "research", "innovation"] },
    { title: "Digital Europe Programme (DIGITAL) 2021-2027", content: "O Programa Europa Digital investe €7.5 bilhões em capacidades digitais estratégicas: supercomputação, IA, cibersegurança, competências digitais avançadas e implantação de tecnologias digitais na economia e sociedade. Inclui European Digital Innovation Hubs (EDIHs) para apoiar PMEs. Financiamento disponível para projetos em HPC, dados, cloud, IA de confiança e blockchain.", source_type: "regulation", category: "eu_funding", tags: ["digital-europe", "eu-funding", "digital-transformation"] },
    { title: "EU AI Act - Regulamento (UE) 2024/1689", content: "O AI Act da UE é o primeiro marco regulatório abrangente para IA no mundo. Classifica sistemas de IA por risco: inaceitável (proibido), alto risco (requisitos rigorosos), risco limitado (transparência) e risco mínimo (livre). Requisitos para IA de alto risco: gestão de riscos, governança de dados, documentação técnica, transparência, supervisão humana, robustez e cibersegurança. Multas até 35M€ ou 7% do faturamento global. Entrada em vigor faseada: 2024-2027.", source_type: "regulation", category: "ai_robotics", tags: ["ai-act", "eu-regulation", "artificial-intelligence", "compliance"] },
    { title: "Industry 5.0 - Human-centric Manufacturing", content: "Industry 5.0 complementa a Industry 4.0, colocando o bem-estar do trabalhador no centro do processo produtivo. Três pilares: centrado no humano, sustentável e resiliente. Tecnologias-chave: cobots, digital twins, manufatura aditiva, IA explicável, edge computing. Diferença da 4.0: foco em colaboração humano-máquina vs automação pura. Comissão Europeia publicou roadmap para transição industrial sustentável.", source_type: "technical", category: "advanced_manufacturing", tags: ["industry-5.0", "manufacturing", "human-centric", "sustainability"] },
    { title: "GAIA-X & International Data Spaces (IDSA)", content: "GAIA-X é a iniciativa europeia para uma infraestrutura de dados federada, soberana e interoperável. Princípios: soberania de dados, transparência, portabilidade, interoperabilidade. IDSA fornece a arquitetura de referência para Data Spaces setoriais: manufatura, mobilidade, saúde, agricultura, energia. Conectores IDS permitem troca de dados segura com controle de uso. Catena-X (automotivo) e Manufacturing-X são implementações industriais.", source_type: "technical", category: "data_spaces", tags: ["gaia-x", "idsa", "data-spaces", "data-sovereignty", "catena-x"] },
    { title: "IoT Standards: Matter, Thread & Industrial IoT", content: "Matter (anteriormente CHIP) é o padrão unificado para smart home, apoiado por Apple, Google, Amazon e Samsung. Thread é o protocolo mesh de baixa potência baseado em IPv6 para IoT. Para IoT industrial: OPC UA (comunicação máquina-máquina), MQTT (telemetria leve), TSN (Time-Sensitive Networking para determinismo). Edge computing com AWS Greengrass, Azure IoT Edge. Segurança: certificação IEC 62443 para sistemas industriais.", source_type: "technical", category: "iot_sensors", tags: ["matter", "thread", "mqtt", "opc-ua", "industrial-iot", "edge-computing"] },
    { title: "ISO/TS 15066 - Collaborative Robot Safety", content: "ISO/TS 15066 define requisitos de segurança para operação colaborativa de robôs industriais. Quatro modos de colaboração: parada monitorada de segurança, guia manual, monitoramento de velocidade e separação, limitação de potência e força. Limites biomecânicos de dor e lesão para 29 áreas do corpo. Complementa ISO 10218-1/2 (robôs industriais). Cobots principais: Universal Robots, FANUC CRX, ABB YuMi, KUKA LBR iiwa. Certificação CE obrigatória na UE.", source_type: "regulation", category: "human_robot_collaboration", tags: ["iso-15066", "cobots", "collaborative-robots", "safety", "human-robot"] },
    { title: "CSRD, DORA & Supply Chain Resilience", content: "CSRD (Corporate Sustainability Reporting Directive) exige relatórios de sustentabilidade baseados nos ESRS (European Sustainability Reporting Standards). Afeta empresas com 250+ funcionários ou faturamento >€40M. DORA (Digital Operational Resilience Act) exige gestão de riscos ICT para o setor financeiro: testes de penetração, gestão de incidentes, supervisão de terceiros. Supply chain resilience: EU Chips Act (€43B para semicondutores), Critical Raw Materials Act, Net-Zero Industry Act. Due diligence obrigatória via CS3D (Corporate Sustainability Due Diligence Directive).", source_type: "regulation", category: "resilience_supply_chain", tags: ["csrd", "dora", "supply-chain", "resilience", "esrs", "eu-chips-act"] }
  ];

  // Insert strategic knowledge (idempotent via title match)
  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    for (const item of strategicKnowledge) {
      const { data: existing } = await supabaseAdmin
        .from("neural_knowledge_base")
        .select("id")
        .eq("title", item.title)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("neural_knowledge_base").insert({
          ...item,
          source_reference: "auto-evolution-cron-v8",
          is_processed: false,
        });
        console.log(`📚 Inserted strategic knowledge: ${item.title.slice(0, 50)}...`);
      }
    }
  } catch (e) {
    console.warn("Strategic knowledge ingestion error:", e);
  }

  // Trigger neural-auto-learn for optimization
  if (totalIndexed > 0) {
    try {
      console.log("🔗 Triggering neural-auto-learn for optimization...");
      fetch(`${SUPABASE_URL}/functions/v1/neural-auto-learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ action: "auto_specialize" }),
      }).catch(e => console.warn("Auto-learn trigger error:", e));
    } catch (e) { console.warn("Trigger chain failed:", e); }
  }

  const elapsed = Date.now() - startTime;

  // ── CLOSED LOOP: trigger pipeline orchestrator after evolution ──
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 20000)).then(() =>
      fetch(`${SUPABASE_URL}/functions/v1/neural-pipeline-orchestrator`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ action: "full_cycle" }),
        signal: AbortSignal.timeout(90000),
      })
      .then(() => console.log("✅ Pipeline orchestrator triggered (full_cycle)"))
      .catch(e => console.warn("Pipeline trigger error:", e))
    )
  );

  // ── Auto-approve safe pending proposals (CRITICAL: bridges pending→approved→applied) ──
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 25000)).then(() =>
      fetch(`${SUPABASE_URL}/functions/v1/neural-evolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ action: "auto_approve_pending" }),
        signal: AbortSignal.timeout(60000),
      })
      .then(r => r.json())
      .then(d => console.log(`✅ auto_approve_pending: approved=${d.approved}, acknowledged=${d.acknowledged}`))
      .catch(e => console.warn("auto_approve_pending error:", e))
    )
  );

  // ── Auto-apply ALL approved proposals (inclui backlog) ──
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 35000)).then(() =>
      fetch(`${SUPABASE_URL}/functions/v1/neural-evolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ action: "auto_apply_approved" }),
        signal: AbortSignal.timeout(60000),
      })
      .then(r => r.json())
      .then(d => console.log(`✅ auto_apply_approved: applied=${d.applied}, skipped=${d.skipped}, total=${d.total}`))
      .catch(e => console.warn("auto_apply_approved error:", e))
    )
  );

  // ── Reset stale A/B experiments (0 samples after 48h) ──
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 40000)).then(() =>
      fetch(`${SUPABASE_URL}/functions/v1/neural-evolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ action: "reset_stale_ab" }),
        signal: AbortSignal.timeout(30000),
      })
      .then(r => r.json())
      .then(d => console.log(`✅ reset_stale_ab: ${d.reset} experiments reset`))
      .catch(e => console.warn("reset_stale_ab error:", e))
    )
  );

  // ── Auto-cleanup stale proposals (> 30 days) ──
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 45000)).then(() =>
      fetch(`${SUPABASE_URL}/functions/v1/neural-evolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ action: "cleanup_stale" }),
        signal: AbortSignal.timeout(30000),
      })
      .then(() => console.log("✅ neural-evolution cleanup_stale triggered"))
      .catch(e => console.warn("cleanup_stale trigger error:", e))
    )
  );

  // ── Trigger auto-learn DPO cycle every run ──
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 60000)).then(() =>
      fetch(`${SUPABASE_URL}/functions/v1/neural-auto-learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ action: "trigger_dpo" }),
        signal: AbortSignal.timeout(60000),
      })
      .then(() => console.log("✅ neural-auto-learn DPO triggered"))
      .catch(e => console.warn("DPO trigger error:", e))
    )
  );

  // ── Trigger RLVR factual check at 75s (after DPO, to verify rewarded outputs) ──
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 75000)).then(() =>
      fetch(`${SUPABASE_URL}/functions/v1/neural-training`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ action: "rlvr_check", data: {} }),
        signal: AbortSignal.timeout(60000),
      })
      .then(() => console.log("✅ RLVR factual check triggered"))
      .catch(e => console.warn("RLVR trigger error:", e))
    )
  );

  // ── Evaluate A/B experiments (critical: closes the feedback loop) ──
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 85000)).then(() =>
      fetch(`${SUPABASE_URL}/functions/v1/neural-evolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ action: "evaluate_ab" }),
        signal: AbortSignal.timeout(60000),
      })
      .then(r => r.json())
      .then(d => console.log(`✅ A/B evaluation: ${d.evaluated || 0} experiments evaluated`))
      .catch(e => console.warn("evaluate_ab error:", e))
    )
  );

  // ── Analisar e propor novas evoluções a partir do ciclo atual (expansão contínua) ──
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 100000)).then(() =>
      fetch(`${SUPABASE_URL}/functions/v1/neural-evolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ action: "analyze_and_propose" }),
        signal: AbortSignal.timeout(60000),
      })
      .then(() => console.log("✅ neural-evolution analyze_and_propose triggered"))
      .catch(e => console.warn("analyze_and_propose error:", e))
    )
  );

  // ── AUTO-FILL KNOWLEDGE GAPS: Preencher lacunas de áreas fracas/inexistentes ──
  EdgeRuntime.waitUntil(
    new Promise(r => setTimeout(r, 115000)).then(() =>
      fetch(`${SUPABASE_URL}/functions/v1/neural-auto-learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ action: "auto_fill_knowledge_gaps" }),
        signal: AbortSignal.timeout(120000),
      })
      .then(r => r.json())
      .then(d => console.log(`✅ auto_fill_knowledge_gaps: filled=${d.results?.auto_fill_knowledge_gaps?.gapsFilled || 0}, remaining=${d.results?.auto_fill_knowledge_gaps?.remainingGaps?.length || 0}`))
      .catch(e => console.warn("auto_fill_knowledge_gaps error:", e))
    )
  );

  // Save metrics to ai_metrics table
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from("ai_metrics").insert({
      query: "auto_evolution_cron",
      provider: "cron",
      total_duration_ms: elapsed,
      complexity: "cron",
      cost_tier: 0,
      success: totalErrors === 0,
      response_length: totalIndexed,
      tokens_estimated: totalFetched,
      data_sources_used: results.map((r) => r.source),
      tools_used: ["lexml", "stf", "camara", "datajud", "dados_gov", "stf_bigquery", "neural-pipeline-orchestrator"],
      error_message: totalErrors > 0 ? results.flatMap((r) => r.errors).join("; ").substring(0, 500) : null,
    });
  } catch (err) {
    console.warn("Failed to save metrics:", err);
  }

  console.log(`✅ Auto-Evolution complete: fetched=${totalFetched}, indexed=${totalIndexed}, errors=${totalErrors}, elapsed=${elapsed}ms`);

  return new Response(
    JSON.stringify({
      success: true,
      totalFetched,
      totalIndexed,
      totalErrors,
      elapsed,
      results,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
