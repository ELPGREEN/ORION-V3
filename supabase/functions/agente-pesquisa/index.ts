import { createClient } from "npm:@supabase/supabase-js@2";

// ═══ Free Search Engines (Zero API Key) ═══

const SEARXNG_INSTANCES = [
  "https://searx.be",
  "https://search.sapti.me",
  "https://searx.tiekoetter.com",
  "https://search.bus-hit.me",
  "https://priv.au"
];

async function searchSearXNG(query: string, lang?: string): Promise<{ results: any[] } | null> {
  for (const instance of SEARXNG_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&lang=${lang || "pt-BR"}&categories=general&pageno=1`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        const data = await resp.json();
        if (data.results?.length > 0) {
          console.log(`[SearXNG] ✅ ${instance}: ${data.results.length} results`);
          return {
            results: data.results.slice(0, 10).map((r: any) => ({
              title: r.title || "Sem título",
              url: r.url || "",
              content: r.content || "",
              engine: r.engine || "searxng",
            })),
          };
        }
      }
    } catch (e) {
      console.warn(`[SearXNG] ${instance} failed:`, e);
      continue;
    }
  }
  console.warn("[SearXNG] All instances failed");
  return null;
}

async function searchWikipedia(query: string, lang?: string): Promise<{ results: any[] } | null> {
  const wikiLang = (lang || "pt").split("-")[0];
  try {
    // Search API
    const searchUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=5`;
    const resp = await fetch(searchUrl, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    const searchResults = data.query?.search;
    if (!searchResults?.length) return null;

    // Get summaries for top results
    const results = await Promise.all(
      searchResults.slice(0, 3).map(async (sr: any) => {
        try {
          const summaryUrl = `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sr.title)}`;
          const sResp = await fetch(summaryUrl, { signal: AbortSignal.timeout(3000) });
          if (sResp.ok) {
            const sData = await sResp.json();
            return {
              title: sData.title || sr.title,
              extract: sData.extract || sr.snippet?.replace(/<[^>]+>/g, "") || "",
              url: sData.content_urls?.desktop?.page || `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(sr.title)}`,
              snippet: sr.snippet?.replace(/<[^>]+>/g, "") || "",
            };
          }
        } catch {}
        return {
          title: sr.title,
          snippet: sr.snippet?.replace(/<[^>]+>/g, "") || "",
          url: `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(sr.title)}`,
        };
      })
    );

    console.log(`[Wikipedia] ✅ ${results.length} results for "${query}"`);
    return { results };
  } catch (e) {
    console.warn("[Wikipedia] Failed:", e);
    return null;
  }
}

async function searchDuckDuckGo(query: string): Promise<any | null> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.Abstract && !data.Answer && !data.RelatedTopics?.length) return null;
    console.log(`[DuckDuckGo] ✅ Got instant answer for "${query}"`);
    return {
      abstract: data.Abstract || "",
      answer: data.Answer || "",
      heading: data.Heading || "",
      url: data.AbstractURL || "",
      relatedTopics: (data.RelatedTopics || []).slice(0, 5).map((t: any) => ({
        text: t.Text || "",
        url: t.FirstURL || "",
      })),
    };
  } catch (e) {
    console.warn("[DuckDuckGo] Failed:", e);
    return null;
  }
}

// ═══ Auto-ingest good search results into neural_knowledge_base ═══

// Quality gate: skip noise, duplicates, and low-value content
const NOISE_PATTERNS = [
  /^create\s+table/i, /^alter\s+table/i, /^insert\s+into/i,
  /source_tracker/i, /migration/i, /schema\s+dump/i
];

function isNoise(text: string): boolean {
  return NOISE_PATTERNS.some(p => p.test(text.trim()));
}

function buildSourceRef(source: string, query: string): string {
  // Deterministic ref for dedup via upsert
  const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 60);
  return `auto:${source}:${normalized}`;
}

async function autoIngestResults(
  supabase: any,
  results: any[],
  query: string,
  source = "web_search",
  category = "pesquisa_web",
) {
  try {
    if (!results || results.length < 1) return;

    const entries = results
      .filter((r: any) => {
        const text = r.content || r.extract || r.snippet || r.analysis || "";
        return text.length > 80 && !isNoise(text);
      })
      .slice(0, 5) // max 5 per query to avoid flooding
      .map((r: any) => ({
        title: (r.title || query).slice(0, 250),
        content: (r.content || r.extract || r.snippet || r.analysis || "").slice(0, 2000),
        source_type: source,
        source_reference: buildSourceRef(source, r.title || r.url || query),
        category,
        tags: ["auto-ingest", source, ...query.split(/\s+/).slice(0, 3)].filter(Boolean),
        is_processed: false,
      }));

    if (entries.length === 0) return;

    // Upsert with dedup on source_reference to avoid duplicates
    const { error } = await supabase.from("neural_knowledge_base").upsert(
      entries,
      { onConflict: "source_reference", ignoreDuplicates: true }
    );

    if (error) {
      // Fallback: plain insert (some DBs may not have the unique constraint yet)
      await supabase.from("neural_knowledge_base").insert(entries);
    }

    console.log(`[AutoIngest] ✅ ${entries.length} entries from ${source} for "${query.slice(0, 40)}"`);
  } catch (e) {
    console.warn("[AutoIngest] Failed:", e);
  }
}

/** Ingest the LLM synthesis itself — the high-value analysis produced by the AI */
async function autoIngestSynthesis(
  supabase: any,
  synthesis: string,
  query: string,
  source: string,
) {
  try {
    if (!synthesis || synthesis.length < 200 || isNoise(synthesis)) return;

    const ref = buildSourceRef(`synthesis_${source}`, query);
    await supabase.from("neural_knowledge_base").upsert([{
      title: `[Síntese] ${query.slice(0, 200)}`,
      content: synthesis.slice(0, 4000),
      source_type: `synthesis_${source}`,
      source_reference: ref,
      category: source.includes("legal") ? "jurisprudencia" : "pesquisa_web",
      tags: ["auto-ingest", "synthesis", source, ...query.split(/\s+/).slice(0, 3)].filter(Boolean),
      is_processed: false,
    }], { onConflict: "source_reference", ignoreDuplicates: true });

    console.log(`[AutoIngest] ✅ Synthesis ingested for "${query.slice(0, 40)}" (${source})`);
  } catch (e) {
    console.warn("[AutoIngest] Synthesis ingest failed:", e);
  }
}


// ═══ Brazilian Public APIs (Zero API Key) ═══

/** DataJud CNJ — Search court decisions across all Brazilian courts */
async function searchDataJud(query: string, tribunal?: string): Promise<any[] | null> {
  // DataJud public API endpoints by court
  const tribunais = tribunal
    ? [tribunal]
    : ["stf", "stj", "tst", "tse"];

  const apiMap: Record<string, string> = {
    stf: "https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search",
    stj: "https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search",
    tst: "https://api-publica.datajud.cnj.jus.br/api_publica_tst/_search",
    tse: "https://api-publica.datajud.cnj.jus.br/api_publica_tse/_search",
  };

  const allResults: any[] = [];

  for (const trib of tribunais) {
    const url = apiMap[trib];
    if (!url) continue;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "APIKey cDZHYzlZa0JadVREZDR4ZnhtN0g6dmlYMnBiWV9UQ21IRGlvUUpkbnotQQ==",
        },
        body: JSON.stringify({
          query: {
            match: {
              _all: query,
            },
          },
          size: 5,
          sort: [{ "@timestamp": { order: "desc" } }],
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (resp.ok) {
        const data = await resp.json();
        const hits = data.hits?.hits || [];
        for (const hit of hits) {
          const src = hit._source || {};
          allResults.push({
            tribunal: trib.toUpperCase(),
            numero_processo: src.numeroProcesso || "",
            classe: src.classe?.nome || src.classeProcessual || "",
            assunto: (src.assuntos || []).map((a: any) => a.nome || a).join(", "),
            orgao_julgador: src.orgaoJulgador?.nome || "",
            data_julgamento: src.dataJulgamento || src.dataAjuizamento || "",
            movimentos: (src.movimentos || []).slice(0, 3).map((m: any) => m.nome || m.complemento || "").filter(Boolean),
            grau: src.grau || "",
            content: `${src.classe?.nome || ""} - ${src.numeroProcesso || ""} - ${(src.assuntos || []).map((a: any) => a.nome).join(", ")}`,
          });
        }
        console.log(`[DataJud] ✅ ${trib.toUpperCase()}: ${hits.length} results`);
      }
    } catch (e) {
      console.warn(`[DataJud] ${trib} failed:`, e);
    }
  }

  return allResults.length > 0 ? allResults : null;
}

/** Câmara dos Deputados — Search bills, votes, deputies */
async function searchCamara(query: string, tipo?: string): Promise<any[] | null> {
  try {
    // Search propositions (bills)
    const url = `https://dadosabertos.camara.leg.br/api/v2/proposicoes?ordem=DESC&ordenarPor=id&itens=10&keywords=${encodeURIComponent(query)}${tipo ? `&siglaTipo=${tipo}` : ""}`;
    const resp = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const items = data.dados || [];
    if (items.length === 0) return null;

    const results = items.slice(0, 8).map((p: any) => ({
      title: `${p.siglaTipo || ""} ${p.numero || ""}/${p.ano || ""}`,
      ementa: p.ementa || "",
      tipo: p.siglaTipo || "",
      numero: p.numero,
      ano: p.ano,
      url: p.uri || "",
      content: `${p.siglaTipo} ${p.numero}/${p.ano}: ${p.ementa || ""}`,
    }));

    console.log(`[Câmara] ✅ ${results.length} proposições for "${query}"`);
    return results;
  } catch (e) {
    console.warn("[Câmara] Failed:", e);
    return null;
  }
}

/** Senado Federal — Search legislation and senators */
async function searchSenado(query: string): Promise<any[] | null> {
  try {
    const url = `https://legis.senado.leg.br/dadosabertos/dados/materia/pesquisa/lista?sigla=&numero=&ano=&palavraChave=${encodeURIComponent(query)}&tramitando=S`;
    const resp = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const materias = data?.PesquisaBasicaMateria?.Materias?.Materia || [];
    if (!Array.isArray(materias) || materias.length === 0) return null;

    const results = materias.slice(0, 8).map((m: any) => ({
      title: `${m.DescricaoIdentificacaoMateria || ""} - ${m.EmentaMateria || ""}`.slice(0, 200),
      tipo: m.DescricaoSubtipoMateria || m.SiglaCasaIdentificacaoMateria || "",
      ementa: m.EmentaMateria || "",
      autor: m.NomeAutor || "",
      data: m.DataApresentacao || "",
      situacao: m.DescricaoSituacao || "",
      url: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${m.CodigoMateria || ""}`,
      content: `${m.DescricaoIdentificacaoMateria || ""}: ${m.EmentaMateria || ""}`,
    }));

    console.log(`[Senado] ✅ ${results.length} matérias for "${query}"`);
    return results;
  } catch (e) {
    console.warn("[Senado] Failed:", e);
    return null;
  }
}

/** IBGE — Demographic and economic data */
async function searchIBGE(query: string): Promise<any | null> {
  try {
    // Search IBGE news/indicators related to the query
    const url = `https://servicodados.ibge.gov.br/api/v3/noticias/?qtd=5&busca=${encodeURIComponent(query)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    const items = data.items || [];
    if (items.length === 0) return null;

    const results = items.map((n: any) => ({
      title: n.titulo || "",
      content: (n.introducao || "").replace(/<[^>]+>/g, ""),
      url: n.link || "",
      date: n.data_publicacao || "",
    }));

    console.log(`[IBGE] ✅ ${results.length} results for "${query}"`);
    return results;
  } catch (e) {
    console.warn("[IBGE] Failed:", e);
    return null;
  }
}

/** Banco Central do Brasil — Economic indicators */
async function searchBCB(query: string): Promise<any | null> {
  // Map common terms to BCB series codes
  const seriesMap: Record<string, { code: number; name: string }> = {
    selic: { code: 432, name: "Taxa Selic" },
    ipca: { code: 433, name: "IPCA" },
    cambio: { code: 1, name: "Taxa de Câmbio (USD)" },
    dolar: { code: 1, name: "Taxa de Câmbio (USD)" },
    euro: { code: 21619, name: "Taxa de Câmbio (EUR)" },
    pib: { code: 4380, name: "PIB" },
    inflacao: { code: 433, name: "IPCA" },
    juros: { code: 432, name: "Taxa Selic" },
    cdi: { code: 12, name: "Taxa CDI" },
    igpm: { code: 189, name: "IGP-M" },
    desemprego: { code: 24369, name: "Taxa de Desocupação" },
  };

  const q = query.toLowerCase();
  const matchedSeries: Array<{ code: number; name: string }> = [];

  for (const [key, val] of Object.entries(seriesMap)) {
    if (q.includes(key)) matchedSeries.push(val);
  }

  if (matchedSeries.length === 0) return null;

  try {
    const results: any[] = [];
    for (const series of matchedSeries.slice(0, 3)) {
      const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series.code}/dados/ultimos/5?formato=json`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        const data = await resp.json();
        results.push({
          title: series.name,
          series_code: series.code,
          values: data.slice(-5).map((d: any) => ({
            date: d.data,
            value: d.valor,
          })),
          content: `${series.name}: ${data.slice(-3).map((d: any) => `${d.data}: ${d.valor}`).join(", ")}`,
        });
      }
    }

    if (results.length > 0) {
      console.log(`[BCB] ✅ ${results.length} series for "${query}"`);
      return results;
    }
  } catch (e) {
    console.warn("[BCB] Failed:", e);
  }
  return null;
}

// corsHeaders already declared at top of file

interface PesquisaRequest {
  action:
    | "web_search"
    | "legal_search"
    | "doc_search"
    | "knowledge_search"
    | "research_plan"
    | "legislation_search"
    | "economic_data";
  params: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "Authorization required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ success: false, error: "Invalid token" }, 401);
    }

    const { action, params } = (await req.json()) as PesquisaRequest;
    const startTime = Date.now();

    let result: Record<string, unknown>;

    switch (action) {
      case "web_search": {
        const { query, lang, domain_filter } = params as {
          query: string;
          lang?: string;
          domain_filter?: string[];
        };
        if (!query) return json({ success: false, error: "query required" }, 400);

        // Try Firecrawl first (best quality web search)
        const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
        if (firecrawlKey) {
          try {
            const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${firecrawlKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query,
                limit: 10,
                lang: lang || "pt-br",
                scrapeOptions: { formats: ["markdown"] },
              }),
            });

            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              const results = searchData.data || [];

              const synthesisPrompt = `Com base nos seguintes resultados de pesquisa web para "${query}":

${results
  .slice(0, 5)
  .map(
    (r: { title?: string; url?: string; markdown?: string }, i: number) =>
      `[${i + 1}] ${r.title || "Sem título"}\nURL: ${r.url || ""}\n${(r.markdown || "").slice(0, 800)}`
  )
  .join("\n\n")}

Forneça uma análise PROFISSIONAL e DETALHADA:
1. **Síntese dos achados**: Resumo consolidado dos resultados
2. **Fontes relevantes**: Lista com título, URL e grau de confiabilidade (⭐ alta, 🔹 média, ◽ baixa)
3. **Análise crítica**: Avaliação de confiabilidade, atualidade e viés das fontes
4. **Aplicabilidade jurídica**: Como esses achados podem ser usados em contexto forense
5. **Conclusão**: Resposta direta e fundamentada`;

              const synthesis = await callLLM(synthesisPrompt, "pesquisa_web");
              // Auto-ingest Firecrawl results + synthesis
              await autoIngestResults(supabase, results.slice(0, 5).map((r: any) => ({
                title: r.title, content: r.markdown || r.description || "", url: r.url,
              })), query, "firecrawl", "pesquisa_web");
              await autoIngestSynthesis(supabase, synthesis.analysis as string, query, "firecrawl");
              result = {
                ...synthesis,
                source: "firecrawl",
                results_count: results.length,
                raw_results: results.slice(0, 8).map((r: { title?: string; url?: string; description?: string }) => ({
                  title: r.title,
                  url: r.url,
                  description: r.description,
                })),
              };
              break;
            }
          } catch (e) {
            console.warn("Firecrawl search failed, trying fallbacks:", e);
          }
        }

        // Fallback to Perplexity (real-time web search with citations)
        const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
        if (perplexityKey) {
          try {
            const pResponse = await fetch("https://api.perplexity.ai/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${perplexityKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "sonar",
                messages: [
                  { role: "system", content: "Você é um pesquisador jurídico profissional. Responda em português brasileiro com citações de fontes. Priorize fontes oficiais e acadêmicas." },
                  { role: "user", content: query }
                ],
                ...(domain_filter ? { search_domain_filter: domain_filter } : {}),
              }),
            });

            if (pResponse.ok) {
              const pData = await pResponse.json();
              const perplexityAnalysis = pData.choices?.[0]?.message?.content || "Sem resultados";
              // Auto-ingest Perplexity synthesis
              await autoIngestSynthesis(supabase, perplexityAnalysis, query, "perplexity");
              result = {
                analysis: perplexityAnalysis,
                source: "perplexity",
                citations: pData.citations || [],
              };
              break;
            }
          } catch (e) {
            console.warn("Perplexity failed:", e);
          }
        }

        // ═══ FREE TIER 1: SearXNG (meta-search, zero API key) ═══
        const searxngResult = await searchSearXNG(query, lang);
        if (searxngResult) {
          const synthesisPrompt = `Com base nos seguintes resultados de pesquisa web para "${query}":

${searxngResult.results.slice(0, 5).map((r: any, i: number) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.content || "").slice(0, 600)}`).join("\n\n")}

Forneça uma análise PROFISSIONAL e DETALHADA:
1. **Síntese dos achados**: Resumo consolidado dos resultados
2. **Fontes relevantes**: Lista com título, URL e grau de confiabilidade
3. **Análise crítica**: Avaliação de confiabilidade e atualidade
4. **Conclusão**: Resposta direta e fundamentada`;

          const synthesis = await callLLM(synthesisPrompt, "pesquisa_web_searxng");
          // Auto-ingest results + synthesis
          await autoIngestResults(supabase, searxngResult.results.slice(0, 3), query, "searxng", "pesquisa_web");
          await autoIngestSynthesis(supabase, synthesis.analysis as string, query, "searxng");
          result = {
            ...synthesis,
            source: "searxng",
            results_count: searxngResult.results.length,
            raw_results: searxngResult.results.slice(0, 8),
          };
          break;
        }

        // ═══ FREE TIER 2: Wikipedia API (encyclopedic knowledge) ═══
        const wikiResult = await searchWikipedia(query, lang);
        if (wikiResult) {
          const wikiPrompt = `Com base nos resultados da Wikipedia para "${query}":

${wikiResult.results.map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.snippet || r.extract || ""}`).join("\n\n")}

Sintetize as informações de forma profissional e detalhada em português.`;

          const synthesis = await callLLM(wikiPrompt, "pesquisa_web_wikipedia");
          await autoIngestResults(supabase, wikiResult.results.slice(0, 2), query, "wikipedia", "enciclopedia");
          await autoIngestSynthesis(supabase, synthesis.analysis as string, query, "wikipedia");
          result = {
            ...synthesis,
            source: "wikipedia",
            results_count: wikiResult.results.length,
            raw_results: wikiResult.results,
          };
          break;
        }

        // ═══ FREE TIER 3: DuckDuckGo Instant Answer ═══
        const ddgResult = await searchDuckDuckGo(query);
        if (ddgResult) {
          const ddgAnalysis = ddgResult.abstract || ddgResult.answer || `Resultado DuckDuckGo: ${ddgResult.heading || "Sem resultado direto"}`;
          // Auto-ingest DuckDuckGo results
          if (ddgAnalysis.length > 80) {
            await autoIngestResults(supabase, [{
              title: ddgResult.heading || query,
              content: ddgAnalysis,
              url: ddgResult.url || "",
            }], query, "duckduckgo", "pesquisa_web");
          }
          result = {
            analysis: ddgAnalysis,
            source: "duckduckgo",
            results_count: ddgResult.relatedTopics?.length || 0,
            raw_results: ddgResult.relatedTopics || [],
          };
          break;
        }

        // Final fallback: LLM with grounding disclaimer
        const fallbackPrompt = `Pesquise sobre: ${query}\n\nForneça informações com fontes quando possível. AVISO: Sem acesso a busca web em tempo real. Responda com base no seu treinamento. Responda em português.`;
        result = await callLLM(fallbackPrompt, "pesquisa_fallback");
        result.source = "llm_fallback";
        result.warning = "Nenhum motor de busca disponível. Resultados baseados no modelo treinado.";
        break;
      }

      case "legal_search": {
        const { query, sources, court_filter, date_from } = params as {
          query: string;
          sources?: string[];
          court_filter?: string;
          date_from?: string;
        };
        if (!query) return json({ success: false, error: "query required" }, 400);

        // ═══ STEP 1: Generate embedding via Gemini (FREE) ═══
        let embeddingResults: unknown[] = [];
        const geminiEmbKeys = [
          Deno.env.get("GEMINI_API_KEY")
        ].filter((k): k is string => !!k);
        
        if (geminiEmbKeys.length > 0) {
          try {
            const embResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiEmbKeys[0]}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "models/gemini-embedding-001",
                  content: { parts: [{ text: query.slice(0, 2000) }] },
                  outputDimensionality: 768,
                }),
              }
            );

            if (embResponse.ok) {
              const embData = await embResponse.json();
              const embedding = embData?.embedding?.values;

              if (embedding && embedding.length > 0) {
                const padded = embedding.length >= 768 ? embedding.slice(0, 768) : [...embedding, ...new Array(768 - embedding.length).fill(0)];
                // ═══ STEP 2: Hybrid search with v3 function ═══
                const { data: hybridResults, error: searchErr } = await supabase.rpc(
                  "hybrid_search_legal_v3",
                  {
                    query_embedding: JSON.stringify(padded),
                    query_text: query,
                    match_count: 20,
                    semantic_weight: 0.55,
                    keyword_weight: 0.25,
                    authority_weight: 0.10,
                    recency_weight: 0.10,
                    filter_source: court_filter || null,
                    filter_sources: sources || null,
                    filter_date_from: date_from || null,
                  }
                );

                if (!searchErr && hybridResults?.length > 0) {
                  embeddingResults = hybridResults;
                  console.log(`[legal_search] Hybrid v3: ${hybridResults.length} results (Gemini embedding)`);
                }
              }
            }
          } catch (e) {
            console.warn("Gemini embedding search failed, falling back to text search:", e);
          }
        }

        // ═══ STEP 2b: Text-based fallback ═══
        if (embeddingResults.length === 0) {
          const searchTerms = query.split(/\s+/).filter(w => w.length > 2).slice(0, 6).join(" & ");
          const { data: textResults } = await supabase
            .from("legal_embeddings")
            .select("id, title, content, source, source_label, content_type, url, published_date, metadata")
            .textSearch("content", searchTerms, {
              type: "plain",
              config: "portuguese",
            })
            .limit(20);

          embeddingResults = textResults || [];
          console.log(`[legal_search] Text fallback: ${embeddingResults.length} results`);
        }

        // ═══ STEP 3: Also search neural_knowledge_base ═══
        let knowledgeResults: unknown[] = [];
        try {
          const kbTerms = query.split(/\s+/).filter(w => w.length > 2).slice(0, 4).join(" & ");
          const { data: kbData } = await supabase
            .from("neural_knowledge_base")
            .select("id, title, content, source_type, source_reference, tags")
            .eq("is_processed", true)
            .textSearch("content", kbTerms, { type: "plain", config: "portuguese" })
            .limit(5);
          knowledgeResults = kbData || [];
        } catch { /* skip */ }

        // ═══ STEP 3b: Enrich with DataJud CNJ (live court data) ═══
        let datajudResults: any[] = [];
        try {
          const djResults = await searchDataJud(query, court_filter);
          if (djResults && djResults.length > 0) {
            datajudResults = djResults;
            // Auto-ingest DataJud results
            await autoIngestResults(supabase, djResults.slice(0, 3), query, "datajud", "jurisprudencia");
          }
        } catch { /* skip */ }

        // ═══ STEP 4: AI Synthesis with Gemini (higher quality for legal) ═══
        const legalPrompt = `Você é um PESQUISADOR JURÍDICO SÊNIOR com expertise em jurisprudência brasileira.

CONSULTA: "${query}"

═══ RESULTADOS DA BASE JURISPRUDENCIAL (${embeddingResults.length} encontrados) ═══
${(embeddingResults as Array<{ title: string; source_label: string; source: string; content: string; published_date: string; combined_score?: number }>)
  .slice(0, 10)
  .map(
    (r, i) =>
      `[${i + 1}] ${r.title}
Fonte: ${r.source_label} (${r.source})
Score: ${(r.combined_score || 0).toFixed(3)}
Data: ${r.published_date || "N/A"}
Conteúdo: ${(r.content || "").slice(0, 400)}`
  )
  .join("\n\n")}

${knowledgeResults.length > 0 ? `\n═══ BASE DE CONHECIMENTO NEURAL (${knowledgeResults.length}) ═══\n${(knowledgeResults as Array<{ title: string; content: string; source_type: string }>).slice(0, 3).map((r, i) => `[K${i + 1}] ${r.title} (${r.source_type})\n${(r.content || "").slice(0, 200)}`).join("\n\n")}` : ""}

${datajudResults.length > 0 ? `\n═══ DATAJUD CNJ — PROCESSOS REAIS (${datajudResults.length}) ═══\n${datajudResults.slice(0, 5).map((r: any, i: number) => `[DJ${i + 1}] ${r.tribunal} — ${r.numero_processo}\nClasse: ${r.classe}\nAssunto: ${r.assunto}\nÓrgão: ${r.orgao_julgador}\nData: ${r.data_julgamento}`).join("\n\n")}` : ""}

═══ INSTRUÇÕES DE ANÁLISE ═══
Produza uma análise JURÍDICA PROFISSIONAL com:

1. **SÍNTESE JURISPRUDENCIAL**: Consolidação do entendimento dominante nos tribunais
2. **JURISPRUDÊNCIA RELEVANTE**: Para cada decisão citada, inclua:
   - TRIBUNAL (STF/STJ/TRF/TJ) + Órgão julgador (Turma/Câmara)
   - Tipo e número do recurso (REsp nº X.XXX.XXX/UF)
   - Relator: Min./Des. Nome
   - Data do julgamento
   - EMENTA resumida (trechos-chave em negrito)
3. **LEGISLAÇÃO APLICÁVEL**: Artigos específicos com texto legal relevante
4. **DOUTRINA**: Autores e obras de referência sobre o tema
5. **RECOMENDAÇÃO ESTRATÉGICA**: Como usar essas fontes em peça processual
6. **NÍVEL DE CONSOLIDAÇÃO**: Se o entendimento é pacífico, majoritário ou divergente

REGRAS:
- NUNCA invente números de processos, leis ou súmulas
- Se não encontrar jurisprudência real, DIGA EXPLICITAMENTE
- Priorize: Súmulas Vinculantes > STF/STJ > Tribunais Regionais
- Cite artigos de lei com número completo (Lei nº X.XXX/XX, Art. XX)`;

        const synthesis = await callLLM(legalPrompt, "pesquisa_juridica");
        // Auto-ingest legal synthesis into knowledge base
        await autoIngestSynthesis(supabase, synthesis.analysis as string, query, "legal_search");
        result = {
          ...synthesis,
          results_count: embeddingResults.length,
          knowledge_count: knowledgeResults.length,
          datajud_count: datajudResults.length,
          search_method: geminiEmbKeys.length > 0 ? "hybrid_gemini_embedding" : "text_fallback",
          raw_results: (embeddingResults as Array<{ id: string; title: string; source: string; source_label: string; url: string; published_date: string; combined_score?: number }>)
            .slice(0, 12)
            .map((r) => ({
              id: r.id,
              title: r.title,
              source: r.source,
              source_label: r.source_label,
              url: r.url,
              published_date: r.published_date,
              score: r.combined_score,
            })),
          datajud_results: datajudResults.slice(0, 5),
        };
        break;
      }

      case "doc_search": {
        const { query, document_type, status } = params as {
          query: string;
          document_type?: string;
          status?: string;
        };
        if (!query) return json({ success: false, error: "query required" }, 400);

        let docQuery = supabase
          .from("documents")
          .select("id, title, document_type, status, tags, created_at, updated_at")
          .eq("user_id", user.id)
          .textSearch("title", query, { type: "plain", config: "portuguese" })
          .limit(20);

        if (document_type) docQuery = docQuery.eq("document_type", document_type);
        if (status) docQuery = docQuery.eq("status", status);

        const { data: docs, error } = await docQuery;

        result = {
          analysis: `Encontrados ${(docs || []).length} documentos correspondentes a "${query}".`,
          results: docs || [],
          results_count: (docs || []).length,
        };
        break;
      }

      case "knowledge_search": {
        const { query, source_type } = params as {
          query: string;
          source_type?: string;
        };
        if (!query) return json({ success: false, error: "query required" }, 400);

        // ═══ Try Gemini embedding-based search first (FREE) ═══
        let kbResults: unknown[] = [];
        const geminiEmbKeys2 = [
          Deno.env.get("GEMINI_API_KEY")
        ].filter((k): k is string => !!k);

        if (geminiEmbKeys2.length > 0) {
          try {
            const embResp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiEmbKeys2[0]}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "models/gemini-embedding-001",
                  content: { parts: [{ text: query.slice(0, 2000) }] },
                  outputDimensionality: 768,
                }),
              }
            );

            if (embResp.ok) {
              const embData = await embResp.json();
              const embedding = embData?.embedding?.values;
              if (embedding && embedding.length > 0) {
                const padded = embedding.length >= 768 ? embedding.slice(0, 768) : [...embedding, ...new Array(768 - embedding.length).fill(0)];
                const { data: neuralResults } = await supabase.rpc("search_neural_knowledge", {
                  query_embedding: JSON.stringify(padded),
                  query_text: query,
                  match_count: 15,
                  filter_type: source_type || null,
                });
                kbResults = neuralResults || [];
              }
            }
          } catch { /* fallback below */ }
        }

        // Text fallback
        if (kbResults.length === 0) {
          const kbTerms = query.split(/\s+/).filter(w => w.length > 2).slice(0, 4).join(" & ");
          let kbQuery = supabase
            .from("neural_knowledge_base")
            .select("id, title, content, source_type, source_reference, tags")
            .eq("is_processed", true)
            .textSearch("content", kbTerms, { type: "plain", config: "portuguese" })
            .limit(15);
          if (source_type) kbQuery = kbQuery.eq("source_type", source_type);
          const { data: textKb } = await kbQuery;
          kbResults = textKb || [];
        }

        if (kbResults.length > 0) {
          const kbPrompt = `Baseado na base de conhecimento neural do usuário (${kbResults.length} resultados para "${query}"):

${(kbResults as Array<{ title: string; content: string; source_type: string; combined_score?: number }>)
  .slice(0, 6)
  .map((r, i) => `[${i + 1}] ${r.title} (${r.source_type}) — Score: ${(r.combined_score || 0).toFixed(3)}\n${(r.content || "").slice(0, 400)}`)
  .join("\n\n")}

Sintetize os resultados com análise profissional. Identifique padrões, conexões e insights relevantes para aplicação prática.`;

          const synthesis = await callLLM(kbPrompt, "knowledge_search");
          result = {
            ...synthesis,
            results_count: kbResults.length,
            raw_results: kbResults,
          };
        } else {
          result = {
            analysis: `Nenhum resultado encontrado na knowledge base para "${query}". Sugestão: adicione conteúdo à base de conhecimento ou tente termos mais amplos.`,
            results_count: 0,
          };
        }
        break;
      }

      case "research_plan": {
        const { topic, depth, objectives } = params as {
          topic: string;
          depth?: "quick" | "standard" | "deep";
          objectives?: string[];
        };
        if (!topic) return json({ success: false, error: "topic required" }, 400);

        const prompt = `Você é um COORDENADOR DE PESQUISA JURÍDICA com 20 anos de experiência.

Crie um plano de pesquisa EXECUTÁVEL para:

TEMA: ${topic}
PROFUNDIDADE: ${depth || "standard"}
OBJETIVOS: ${(objectives || ["Análise jurídica completa"]).join("; ")}

O plano DEVE conter:

1. **ESCOPO E DELIMITAÇÃO**: Definição precisa do objeto de pesquisa
2. **METODOLOGIA**: 
   - Pesquisa jurisprudencial (tribunais prioritários, período, tipos de decisão)
   - Pesquisa legislativa (códigos, leis especiais, normas infralegais)
   - Pesquisa doutrinária (autores de referência, obras fundamentais)
3. **FONTES A CONSULTAR** (em ordem de prioridade):
   - Bases internas: legal_embeddings, neural_knowledge_base
   - Tribunais: STF, STJ, TST, TRFs, TJs estaduais
   - Legislação: LexML, Câmara dos Deputados, Senado
   - Doutrina: obras de referência por área
4. **CRONOGRAMA DE EXECUÇÃO**: Etapas com estimativa de tempo
5. **FERRAMENTAS DO SISTEMA**: 
   - legal_search → jurisprudência e legislação
   - web_search → decisões recentes e notícias jurídicas
   - knowledge_search → base neural interna
   - doc_search → documentos do escritório
6. **CRITÉRIOS DE QUALIDADE**: Como avaliar se a pesquisa é suficiente
7. **RISCOS E LIMITAÇÕES**: Gaps potenciais e como mitigá-los
8. **ENTREGÁVEL FINAL**: Formato do relatório de pesquisa`;

        result = await callLLM(prompt, "research_plan");
        result.plan_type = depth || "standard";
        break;
      }

      // ═══ LEGISLATION SEARCH — Câmara + Senado + DataJud ═══
      case "legislation_search": {
        const { query, tipo_proposicao, tribunal } = params as {
          query: string;
          tipo_proposicao?: string;
          tribunal?: string;
        };
        if (!query) return json({ success: false, error: "query required" }, 400);

        // Search all sources in parallel
        const [camaraResults, senadoResults, datajudResults2] = await Promise.all([
          searchCamara(query, tipo_proposicao),
          searchSenado(query),
          searchDataJud(query, tribunal)
        ]);

        const allLegResults = [
          ...(camaraResults || []).map((r: any) => ({ ...r, source: "camara" })),
          ...(senadoResults || []).map((r: any) => ({ ...r, source: "senado" })),
          ...(datajudResults2 || []).map((r: any) => ({ ...r, source: "datajud" }))
        ];

        // Auto-ingest all results
        if (camaraResults) await autoIngestResults(supabase, camaraResults, query, "camara", "legislacao");
        if (senadoResults) await autoIngestResults(supabase, senadoResults, query, "senado", "legislacao");
        if (datajudResults2) await autoIngestResults(supabase, datajudResults2, query, "datajud", "jurisprudencia");

        if (allLegResults.length > 0) {
          const legPrompt = `Você é um PESQUISADOR LEGISLATIVO especializado em direito brasileiro.

CONSULTA: "${query}"

═══ CÂMARA DOS DEPUTADOS (${(camaraResults || []).length} proposições) ═══
${(camaraResults || []).slice(0, 5).map((r: any, i: number) => `[C${i + 1}] ${r.title}: ${r.ementa || ""}`).join("\n")}

═══ SENADO FEDERAL (${(senadoResults || []).length} matérias) ═══
${(senadoResults || []).slice(0, 5).map((r: any, i: number) => `[S${i + 1}] ${r.title} — Autor: ${r.autor || "N/A"} — Situação: ${r.situacao || "N/A"}`).join("\n")}

═══ DATAJUD CNJ (${(datajudResults2 || []).length} processos) ═══
${(datajudResults2 || []).slice(0, 5).map((r: any, i: number) => `[D${i + 1}] ${r.tribunal} — ${r.numero_processo} — ${r.classe} — ${r.assunto}`).join("\n")}

Produza uma análise consolidada:
1. **Legislação em tramitação**: Proposições relevantes e status
2. **Jurisprudência vinculada**: Decisões judiciais relacionadas à legislação
3. **Impacto prático**: Como a legislação afeta a prática jurídica
4. **Recomendações**: Ações sugeridas para o profissional`;

          const synthesis = await callLLM(legPrompt, "pesquisa_legislativa");
          await autoIngestSynthesis(supabase, synthesis.analysis as string, query, "legislation");
          result = {
            ...synthesis,
            camara_count: (camaraResults || []).length,
            senado_count: (senadoResults || []).length,
            datajud_count: (datajudResults2 || []).length,
            total_results: allLegResults.length,
            raw_results: allLegResults.slice(0, 15),
          };
        } else {
          result = {
            analysis: `Nenhum resultado legislativo encontrado para "${query}". Tente termos mais amplos ou verifique a ortografia.`,
            total_results: 0,
          };
        }
        break;
      }

      // ═══ ECONOMIC DATA — IBGE + BCB ═══
      case "economic_data": {
        const { query } = params as { query: string };
        if (!query) return json({ success: false, error: "query required" }, 400);

        const [ibgeResults, bcbResults] = await Promise.all([
          searchIBGE(query),
          searchBCB(query)
        ]);

        const hasData = (ibgeResults && ibgeResults.length > 0) || (bcbResults && bcbResults.length > 0);

        if (hasData) {
          // Auto-ingest
          if (ibgeResults) await autoIngestResults(supabase, ibgeResults, query, "ibge", "dados_economicos");
          if (bcbResults) await autoIngestResults(supabase, bcbResults, query, "bcb", "dados_economicos");

          const econPrompt = `Você é um ANALISTA ECONÔMICO especializado em dados brasileiros.

CONSULTA: "${query}"

${ibgeResults && ibgeResults.length > 0 ? `═══ IBGE (${ibgeResults.length} resultados) ═══\n${ibgeResults.slice(0, 3).map((r: any, i: number) => `[I${i + 1}] ${r.title}\n${(r.content || "").slice(0, 300)}`).join("\n\n")}` : ""}

${bcbResults && bcbResults.length > 0 ? `═══ BANCO CENTRAL (${bcbResults.length} séries) ═══\n${bcbResults.map((r: any) => `${r.title} (série ${r.series_code}):\n${r.values.map((v: any) => `  ${v.date}: ${v.value}`).join("\n")}`).join("\n\n")}` : ""}

Produza análise profissional:
1. **Dados atuais**: Valores e indicadores mais recentes
2. **Tendência**: Evolução recente dos indicadores
3. **Contexto jurídico**: Implicações para cálculos judiciais (correção monetária, juros, etc.)
4. **Fontes oficiais**: Referências completas dos dados`;

          const synthesis = await callLLM(econPrompt, "dados_economicos");
          await autoIngestSynthesis(supabase, synthesis.analysis as string, query, "economic");
          result = {
            ...synthesis,
            ibge_count: (ibgeResults || []).length,
            bcb_count: (bcbResults || []).length,
            ibge_results: ibgeResults || [],
            bcb_results: bcbResults || [],
          };
        } else {
          result = {
            analysis: `Nenhum dado econômico encontrado para "${query}". Para o Banco Central, tente termos como: selic, ipca, câmbio, dólar, cdi, igpm, pib.`,
            ibge_count: 0,
            bcb_count: 0,
          };
        }
        break;
      }

      default:
        return json(
          {
            success: false,
            error: `Unknown action: ${action}. Available: web_search, legal_search, doc_search, knowledge_search, research_plan, legislation_search, economic_data`,
          },
          400
        );
    }

    const totalDuration = Date.now() - startTime;

    await supabase.from("ai_metrics").insert({
      provider: (result as Record<string, unknown>).source === "firecrawl" ? "firecrawl" : "groq",
      query: `agente-pesquisa:${action}`,
      total_duration_ms: totalDuration,
      success: true,
      complexity: action === "research_plan" ? "complex" : action === "legal_search" ? "complex" : "simple",
      cost_tier: action === "web_search" ? 2 : action === "legal_search" ? 2 : 1,
      user_id: user.id,
      tools_used: ["agente-pesquisa"],
      data_sources_used: [(result as Record<string, unknown>).source as string || "llm"].filter(Boolean),
    });

    return json({ success: true, action, ...result, latencyMs: totalDuration });
  } catch (error) {
    console.error("Agente Pesquisa error:", error);
    return json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══ Multi-Provider LLM with Fallback Chain ═══
async function callLLM(prompt: string, context: string) {
  const systemPrompt = `Você é um PESQUISADOR JURÍDICO SÊNIOR especializado em direito brasileiro. Sua função é pesquisar, analisar e sintetizar informações jurídicas com precisão profissional.

REGRAS OBRIGATÓRIAS:
- Sempre cite fontes com referências completas (tribunal, número, relator, data)
- NUNCA invente números de processos, leis ou súmulas inexistentes
- Se não encontrar jurisprudência real, diga explicitamente "não encontrado na base"
- Use linguagem técnica jurídica formal em português brasileiro
- Priorize: Súmulas Vinculantes > Jurisprudência STF/STJ > Legislação > Doutrina
- Para citações, use formato ABNT/forense (STJ, REsp nº X.XXX.XXX/UF, Rel. Min. X, j. DD/MM/AAAA)`;

  // Try Groq first (fastest for search tasks)
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 8000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          console.log(`[${context}] Used Groq`);
          return { analysis: text, provider: "groq" };
        }
      }
    } catch (e) {
      console.warn(`Groq failed for ${context}:`, e);
    }
  }

  // Fallback to Mistral (excellent PT-BR + low cost)
  const mistralKey = Deno.env.get("MISTRAL_API_KEY");
  if (mistralKey) {
    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mistralKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 8000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          console.log(`[${context}] Used Mistral`);
          return { analysis: text, provider: "mistral" };
        }
      }
    } catch (e) {
      console.warn(`Mistral failed for ${context}:`, e);
    }
  }

  // Fallback to Gemini
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    try {
      const geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 8000 },
          }),
        }
      );

      if (geminiResp.ok) {
        const geminiData = await geminiResp.json();
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`[${context}] Used Gemini`);
          return { analysis: text, provider: "gemini" };
        }
      }
    } catch (e) {
      console.warn(`Gemini failed for ${context}:`, e);
    }
  }

  throw new Error("No LLM provider available (GROQ_API_KEY, MISTRAL_API_KEY and GEMINI_API_KEY missing)");
}
