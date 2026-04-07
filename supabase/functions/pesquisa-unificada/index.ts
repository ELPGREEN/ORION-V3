import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Neural Knowledge Base Search (internal) ───
async function searchNeuralKnowledgeBase(query: string): Promise<SearchResult[]> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Search neural_knowledge_base
    const { data: knowledge } = await supabaseAdmin
      .from("neural_knowledge_base")
      .select("id, title, content, source_type, source_reference, tags")
      .eq("is_processed", true)
      .textSearch("content", query.split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(" & "), {
        type: "plain",
        config: "portuguese",
      })
      .limit(8);

    if (!knowledge?.length) return [];

    return knowledge.map((k: any) => ({
      source: "neural_knowledge",
      sourceLabel: `Rede Neural (${k.source_type})`,
      title: k.title,
      description: k.content?.substring(0, 400) || "",
      url: k.source_reference || "",
      type: (k.source_type === "jurisprudencia" ? "jurisprudencia" : k.source_type === "legislacao" || k.source_type === "legislacao_federal" ? "lei" : "doutrina") as any,
      metadata: { source_type: k.source_type, tags: k.tags, neural: true },
    }));
  } catch (err) {
    console.warn("Neural knowledge base search error:", err);
    return [];
  }
}

// ─── Legal Embeddings Search (internal vector store) ───
// Usa a função neural-search para aproveitar scoring QDL + MHA
async function searchLegalEmbeddings(query: string): Promise<SearchResult[]> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const res = await fetch(`${supabaseUrl}/functions/v1/neural-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        query,
        mode: "search",
        hybrid: true,
        rerank: true, // v11: QDL reranking
        matchCount: 10,
        filterType: null,
      }),
    });

    if (!res.ok) {
      console.warn(`neural-search call failed: ${res.status}`);
      return []; // Fallback handled by parent
    }

    const data = await res.json();
    const results = data.results || [];

    return results.map((le: any) => ({
      source: `neural_embeddings`,
      sourceLabel: `Neural: ${le.source_label || le.source}`,
      title: le.title,
      description: le.content?.substring(0, 400) || "",
      url: le.url || "",
      date: le.published_date || "",
      type: (le.content_type === "jurisprudencia" ? "jurisprudencia" : "lei") as any,
      metadata: {
        original_source: le.source,
        content_type: le.content_type,
        neural_embedding: true,
        score: le.combined_score, // QDL score
        qnn_score: le.qnn_score,   // Quantum score
      },
    }));
  } catch (err) {
    console.warn("Legal embeddings search error:", err);
    return [];
  }
}

interface SearchResult {
  source: string;
  sourceLabel: string;
  title: string;
  description: string;
  url?: string;
  date?: string;
  type: 'lei' | 'jurisprudencia' | 'doutrina' | 'entidade' | 'proposicao' | 'estatistica';
  metadata?: Record<string, unknown>;
}

interface UnifiedResponse {
  query: string;
  refinedQuery?: string;
  area?: string | null;
  totalResults: number;
  results: SearchResult[];
  errors: { source: string; error: string }[];
  timestamp: string;
}

// ─── Knowledge Graph Search ───
async function searchKnowledgeGraph(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query + ' direito brasil lei')}&key=${apiKey}&limit=5&languages=pt`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`KG API returned ${res.status}, using fallback`);
      return [{
        source: 'knowledge_graph', sourceLabel: 'Google Knowledge Graph',
        title: `Entidades: "${query}"`,
        description: `Pesquise entidades relacionadas a "${query}" no Google Knowledge Graph.`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query + ' direito brasil')}`,
        type: 'entidade' as const, metadata: { fallback: true },
      }];
    }
    const data = await res.json();

    const items = (data.itemListElement || []).map((item: any) => ({
      source: 'knowledge_graph',
      sourceLabel: 'Google Knowledge Graph',
      title: item.result?.name || 'Sem título',
      description: item.result?.detailedDescription?.articleBody || item.result?.description || '',
      url: item.result?.detailedDescription?.url || item.result?.url || '',
      type: 'entidade' as const,
      metadata: { score: item.resultScore, types: item.result?.['@type'] || [] },
    }));

    return items.length > 0 ? items : [{
      source: 'knowledge_graph', sourceLabel: 'Google Knowledge Graph',
      title: `Entidades: "${query}"`,
      description: `Nenhuma entidade encontrada para "${query}".`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query + ' direito brasil')}`,
      type: 'entidade' as const, metadata: { fallback: true },
    }];
  } catch (err) {
    console.warn('Knowledge Graph search failed, using fallback:', err);
    return [{
      source: 'knowledge_graph', sourceLabel: 'Google Knowledge Graph',
      title: `Entidades: "${query}"`,
      description: `Pesquise entidades relacionadas a "${query}".`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query + ' direito brasil')}`,
      type: 'entidade' as const, metadata: { fallback: true },
    }];
  }
}

// ─── Google Books ───
async function searchGoogleBooks(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query + ' direito')}&key=${apiKey}&maxResults=5&langRestrict=pt&printType=books`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`Books API returned ${res.status}, using fallback`);
      return [{
        source: 'google_books', sourceLabel: 'Google Books',
        title: `Livros: "${query}"`,
        description: `Pesquise livros jurídicos sobre "${query}" no Google Books.`,
        url: `https://books.google.com.br/books?q=${encodeURIComponent(query + ' direito')}&lr=lang_pt`,
        type: 'doutrina' as const, metadata: { fallback: true },
      }];
    }
    const data = await res.json();

    const items = (data.items || []).map((item: any) => ({
      source: 'google_books',
      sourceLabel: 'Google Books',
      title: item.volumeInfo?.title || 'Sem título',
      description: item.volumeInfo?.description?.substring(0, 300) || item.searchInfo?.textSnippet || '',
      url: item.volumeInfo?.infoLink || '',
      date: item.volumeInfo?.publishedDate || '',
      type: 'doutrina' as const,
      metadata: {
        authors: item.volumeInfo?.authors || [],
        publisher: item.volumeInfo?.publisher,
        pageCount: item.volumeInfo?.pageCount,
        thumbnail: item.volumeInfo?.imageLinks?.smallThumbnail,
      },
    }));

    return items.length > 0 ? items : [{
      source: 'google_books', sourceLabel: 'Google Books',
      title: `Livros: "${query}"`,
      description: `Nenhum livro encontrado para "${query}".`,
      url: `https://books.google.com.br/books?q=${encodeURIComponent(query + ' direito')}&lr=lang_pt`,
      type: 'doutrina' as const, metadata: { fallback: true },
    }];
  } catch (err) {
    console.warn('Google Books search failed, using fallback:', err);
    return [{
      source: 'google_books', sourceLabel: 'Google Books',
      title: `Livros: "${query}"`,
      description: `Pesquise livros jurídicos sobre "${query}".`,
      url: `https://books.google.com.br/books?q=${encodeURIComponent(query + ' direito')}&lr=lang_pt`,
      type: 'doutrina' as const, metadata: { fallback: true },
    }];
  }
}

// ─── Câmara dos Deputados ───
async function searchCamara(query: string): Promise<SearchResult[]> {
  const url = `https://dadosabertos.camara.leg.br/api/v2/proposicoes?keywords=${encodeURIComponent(query)}&ordem=DESC&ordenarPor=ano&itens=10`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Câmara API ${res.status}`);
  const data = await res.json();

  return (data.dados || []).map((item: any) => ({
    source: 'camara',
    sourceLabel: 'Câmara dos Deputados',
    title: `${item.siglaTipo} ${item.numero}/${item.ano}`,
    description: item.ementa || '',
    url: item.uri ? `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${item.id}` : '',
    date: item.dataApresentacao || '',
    type: 'proposicao' as const,
    metadata: { siglaTipo: item.siglaTipo, numero: item.numero, ano: item.ano, id: item.id },
  }));
}

// ─── LexML Brasil — Multi-strategy: SRU → HTML Scraping → Catálogo Local ───

async function lexmlSRU_unified(query: string): Promise<SearchResult[]> {
  const sruUrl = `https://www.lexml.gov.br/busca/SRU?operation=searchRetrieve&version=1.1&query=${encodeURIComponent(query)}&maximumRecords=8&recordSchema=lexml`;
  try {
    const res = await fetch(sruUrl, { 
      signal: AbortSignal.timeout(8000),
      headers: { "Accept": "application/xml, text/xml", "User-Agent": "DHAdvocacia-Neural/10.0" },
    });
    if (!res.ok) throw new Error(`SRU ${res.status}`);
    const xml = await res.text();
    const results: SearchResult[] = [];
    const recordRegex = /<srw:recordData>([\s\S]*?)<\/srw:recordData>/g;
    let match;
    while ((match = recordRegex.exec(xml)) !== null && results.length < 8) {
      const rec = match[1];
      const title = rec.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/)?.[1]?.trim().replace(/<[^>]*>/g, '');
      const desc = rec.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/)?.[1]?.trim().replace(/<[^>]*>/g, '');
      const identifier = rec.match(/<dc:identifier[^>]*>([\s\S]*?)<\/dc:identifier>/)?.[1]?.trim();
      const date = rec.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/)?.[1]?.trim();
      const type = rec.match(/<dc:type[^>]*>([\s\S]*?)<\/dc:type>/)?.[1]?.trim();
      if (title) {
        results.push({
          source: 'lexml', sourceLabel: 'LexML Brasil (SRU)',
          title, description: desc || '', date: date || '',
          url: title ? `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(title)}` : '',
          type: (type?.includes('Jurisprud') ? 'jurisprudencia' : 'lei') as any,
          metadata: { urn: identifier, strategy: 'sru' },
        });
      }
    }
    if (results.length > 0) { console.log(`[lexml:sru] ${results.length} results`); return results; }
  } catch (e) { console.warn(`[lexml:sru] Failed:`, e); }
  return [];
}

async function lexmlHTMLScrape_unified(query: string): Promise<SearchResult[]> {
  const searchUrl = `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(12000),
      headers: { "Accept": "text/html", "User-Agent": "Mozilla/5.0 (compatible; DHAdvocacia-Neural/10.0)" },
    });
    if (!res.ok) throw new Error(`HTML ${res.status}`);
    const html = await res.text();
    const results: SearchResult[] = [];
    
    const htmlUrnRegex = /<a[^>]*href="(?:https:\/\/www\.lexml\.gov\.br)?\/urn\/(urn:lex:[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let m;
    const seen = new Set<string>();
    while ((m = htmlUrnRegex.exec(html)) !== null && results.length < 8) {
      const urn = m[1];
      const title = m[2].trim();
      if (title.length > 3 && !seen.has(urn)) {
        seen.add(urn);
        results.push({
          source: 'lexml', sourceLabel: 'LexML Brasil',
          title, description: title, date: '',
          url: title ? `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(title)}` : `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(urn)}`,
          type: (urn.includes('jurisprud') ? 'jurisprudencia' : 'lei') as any,
          metadata: { strategy: 'html_scrape', urn },
        });
      }
    }
    
    if (results.length > 0) { console.log(`[lexml:html] ${results.length} results`); return results; }
  } catch (e) { console.warn(`[lexml:html] Failed:`, e); }
  return [];
}

function searchLexML(query: string): Promise<SearchResult[]> {
  return (async () => {
    // Strategy 1: SRU
    const sruResults = await lexmlSRU_unified(query);
    if (sruResults.length > 0) return sruResults;

    // Strategy 2: HTML scraping
    const htmlResults = await lexmlHTMLScrape_unified(query);
    if (htmlResults.length > 0) return htmlResults;

    // Strategy 3: Local catalog fallback
    const LEXML_CATALOG = [
      { title: "Constituição Federal de 1988", urn: "urn:lex:br:federal:constituicao:1988-10-05;1988", keywords: ["constituição","federal","cf","direitos","garantias","fundamentais"], tipo: "lei", date: "05/10/1988" },
      { title: "Código Civil", urn: "urn:lex:br:federal:lei:2002-01-10;10406", keywords: ["civil","contrato","obrigação","responsabilidade","dano","indenização"], tipo: "lei", date: "10/01/2002" },
      { title: "Código Penal", urn: "urn:lex:br:federal:decreto.lei:1940-12-07;2848", keywords: ["penal","crime","pena","prisão","homicídio","furto","roubo"], tipo: "lei", date: "07/12/1940" },
      { title: "Código de Processo Civil", urn: "urn:lex:br:federal:lei:2015-03-16;13105", keywords: ["processo","civil","cpc","petição","recurso","apelação","agravo"], tipo: "lei", date: "16/03/2015" },
      { title: "Código de Processo Penal", urn: "urn:lex:br:federal:decreto.lei:1941-10-03;3689", keywords: ["processo","penal","cpp","inquérito","denúncia","habeas","corpus"], tipo: "lei", date: "03/10/1941" },
      { title: "CLT", urn: "urn:lex:br:federal:decreto.lei:1943-05-01;5452", keywords: ["trabalho","trabalhista","clt","emprego","rescisão","horas","extras","férias"], tipo: "lei", date: "01/05/1943" },
      { title: "Código de Defesa do Consumidor", urn: "urn:lex:br:federal:lei:1990-09-11;8078", keywords: ["consumidor","cdc","produto","serviço","fornecedor","defeito"], tipo: "lei", date: "11/09/1990" },
      { title: "ECA", urn: "urn:lex:br:federal:lei:1990-07-13;8069", keywords: ["criança","adolescente","eca","menor","guarda","adoção"], tipo: "lei", date: "13/07/1990" },
      { title: "Lei de Execução Penal", urn: "urn:lex:br:federal:lei:1984-07-11;7210", keywords: ["execução","penal","lep","preso","regime","progressão"], tipo: "lei", date: "11/07/1984" },
      { title: "LGPD", urn: "urn:lex:br:federal:lei:2018-08-14;13709", keywords: ["dados","proteção","lgpd","privacidade","pessoal"], tipo: "lei", date: "14/08/2018" },
      { title: "CTN", urn: "urn:lex:br:federal:lei:1966-10-25;5172", keywords: ["tributário","imposto","tributo","ctn","fiscal","taxa"], tipo: "lei", date: "25/10/1966" },
      { title: "Lei Maria da Penha", urn: "urn:lex:br:federal:lei:2006-08-07;11340", keywords: ["maria","penha","violência","doméstica","mulher","medida protetiva"], tipo: "lei", date: "07/08/2006" },
      { title: "Lei de Licitações", urn: "urn:lex:br:federal:lei:2021-04-01;14133", keywords: ["licitação","contrato administrativo","pregão"], tipo: "lei", date: "01/04/2021" },
      { title: "Marco Civil da Internet", urn: "urn:lex:br:federal:lei:2014-04-23;12965", keywords: ["internet","marco civil","digital","neutralidade"], tipo: "lei", date: "23/04/2014" },
      { title: "Lei de Drogas", urn: "urn:lex:br:federal:lei:2006-08-23;11343", keywords: ["drogas","tráfico","porte","entorpecente"], tipo: "lei", date: "23/08/2006" },
      { title: "Estatuto do Idoso", urn: "urn:lex:br:federal:lei:2003-10-01;10741", keywords: ["idoso","pessoa idosa","envelhecimento"], tipo: "lei", date: "01/10/2003" },
      { title: "Lei de Improbidade", urn: "urn:lex:br:federal:lei:1992-06-02;8429", keywords: ["improbidade","administrativa","enriquecimento ilícito"], tipo: "lei", date: "02/06/1992" },
      { title: "Lei Anticrime", urn: "urn:lex:br:federal:lei:2019-12-24;13964", keywords: ["anticrime","acordo de não persecução"], tipo: "lei", date: "24/12/2019" },
      { title: "Código de Trânsito", urn: "urn:lex:br:federal:lei:1997-09-23;9503", keywords: ["trânsito","CTB","veículo","infração","multa"], tipo: "lei", date: "23/09/1997" },
      { title: "Lei de Falências", urn: "urn:lex:br:federal:lei:2005-02-09;11101", keywords: ["falência","recuperação judicial","credor"], tipo: "lei", date: "09/02/2005" }
    ];

    const qLower = query.toLowerCase();
    const qWords = qLower.split(/\s+/).filter(w => w.length > 3);
    const scored = LEXML_CATALOG.map(lei => {
      let score = 0;
      for (const kw of lei.keywords) {
        if (qLower.includes(kw)) score += 2;
        for (const qw of qWords) { if (kw.includes(qw) || qw.includes(kw)) score += 1; }
      }
      return { ...lei, score };
    }).filter(l => l.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

    const results: SearchResult[] = scored.map(lei => ({
      source: 'lexml', sourceLabel: 'LexML Brasil',
      title: lei.title, description: `${lei.title} — Legislação Federal Brasileira`,
      url: `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(lei.title)}`, date: lei.date,
      type: lei.tipo as any, metadata: { catalog: true, strategy: 'catalog' },
    }));

    const encodedQuery = encodeURIComponent(query);
    results.push(
      { source: 'lexml', sourceLabel: 'LexML Brasil', title: `Legislação: "${query}"`,
        description: `Pesquise legislação no portal LexML Brasil.`,
        url: `https://www.lexml.gov.br/busca/search?SearchableText=${encodedQuery}&facet_tipoDocumento=Legisla%C3%A7%C3%A3o`,
        type: 'lei' as const, metadata: { fallback: true } },
      { source: 'lexml', sourceLabel: 'LexML Brasil', title: `Jurisprudência: "${query}"`,
        description: `Busque decisões e acórdãos no acervo LexML.`,
        url: `https://www.lexml.gov.br/busca/search?SearchableText=${encodedQuery}&facet_tipoDocumento=Jurisprud%C3%AAncia`,
        type: 'jurisprudencia' as const, metadata: { fallback: true } },
      { source: 'lexml', sourceLabel: 'LexML Brasil', title: `Doutrina: "${query}"`,
        description: `Pesquise doutrina jurídica no LexML.`,
        url: `https://www.lexml.gov.br/busca/search?SearchableText=${encodedQuery}&facet_tipoDocumento=Doutrina`,
        type: 'doutrina' as const, metadata: { fallback: true } },
    );

    return results;
  })();
}

// ─── STF (Jurisprudência) — Busca aprimorada com endpoint interno ───
async function searchSTF(query: string): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query);
  
  // Tentar endpoint interno do portal STF (JSON)
  try {
    const portalUrl = `https://jurisprudencia.stf.jus.br/api/search/search`;
    const res = await fetch(portalUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        query: query,
        from: 0,
        size: 8,
        base: "acordaos",
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      const hits = data.hits?.hits || data.result || data.results || [];
      
      if (Array.isArray(hits) && hits.length > 0) {
        return hits.slice(0, 8).map((hit: any) => {
          const src = hit._source || hit.fields || hit;
          return {
            source: 'stf',
            sourceLabel: 'STF',
            title: src.titulo || src.nome || src.title || `${src.classe || "Decisão"} ${src.numero || ""}`.trim(),
            description: src.ementa || src.resumo || src.description || "",
            url: src.link || src.url || `https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&queryString=${encodedQuery}`,
            date: src.dataPublicacao || src.dataJulgamento || src.data || src.date || "",
            type: 'jurisprudencia' as const,
            metadata: { 
              classe: src.classe, 
              numero: src.numero, 
              relator: src.relator,
              tribunal: "STF",
              stf_api: true,
            },
          };
        });
      }
    }
  } catch (err) {
    console.warn("STF internal API failed:", err);
  }
  
  // Fallback: links diretos para pesquisa
  return [
    {
      source: 'stf', sourceLabel: 'STF',
      title: `Acórdãos STF: "${query}"`,
      description: `Pesquise acórdãos do Supremo Tribunal Federal sobre "${query}".`,
      url: `https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10&queryString=${encodedQuery}&sort=_score&sortBy=desc`,
      type: 'jurisprudencia' as const, metadata: { fallback: true },
    },
    {
      source: 'stf', sourceLabel: 'STF',
      title: `Súmulas STF: "${query}"`,
      description: `Busque súmulas vinculantes e não-vinculantes do STF relacionadas a "${query}".`,
      url: `https://jurisprudencia.stf.jus.br/pages/search?base=sumulas&queryString=${encodedQuery}&sort=_score&sortBy=desc`,
      type: 'jurisprudencia' as const, metadata: { fallback: true },
    }
  ];
}

// ─── CNJ (Dados Abertos) ───
async function searchCNJ(query: string): Promise<SearchResult[]> {
  return [
    {
      source: 'cnj', sourceLabel: 'CNJ',
      title: `Justiça em Números: "${query}"`,
      description: `Estatísticas judiciais do CNJ sobre "${query}".`,
      url: `https://painel-estatistica.stg.cloud.cnj.jus.br/estatisticas.html`,
      type: 'estatistica' as const,
      metadata: { fallback: true, portais: ['https://www.cnj.jus.br/pesquisas-judiciarias/justica-em-numeros/'] },
    }
  ];
}

// ═══════════════════════════════════════════════════════════════
// NEW: DATAJUD CNJ — API Pública de Metadados Processuais
// Tribunais: STJ, TST, TSE, STM, TJs, TRFs
// ═══════════════════════════════════════════════════════════════

const DATAJUD_API_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

// ─── Mapa de URLs corretas por tribunal ───
function getProcessUrl(tribunal: string, numeroProcesso: string): string {
  const num = encodeURIComponent(numeroProcesso || "");
  const map: Record<string, string> = {
    stj: `https://processo.stj.jus.br/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroUnico&termo=${num}`,
    tst: `https://consultaprocessual.tst.jus.br/consultaProcessual/consultaTstNumUnica.do?consulta=Consultar&conscsjt=&numeroTst=${num}`,
    tse: `https://www.tse.jus.br/servicos-judiciais/processos`,
    stm: `https://www.stm.jus.br/servicos-stm/pesquisa-de-jurisprudencia`,
    trf1: `https://processual.trf1.jus.br/consultaProcessual/consulta.php?proc=${num}`,
    trf2: `https://eproc.trf2.jus.br/eproc/externo_controlador.php?acao=processo_seleciona_publica&num_processo=${num}`,
    trf3: `https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam`,
    trf4: `https://www2.trf4.jus.br/trf4/controlador.php?acao=consulta_processual_resultado_pesquisa&txtValor=${num}`,
    trf5: `https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam`,
    trf6: `https://pje.trf6.jus.br/pje/ConsultaPublica/listView.seam`,
    tjsp: `https://esaj.tjsp.jus.br/cpopg/search.do?conversationId=&cbPesquisa=NUMPROC&numeroDigitoAnoUnificado=&fopitoEstadual=&dadosConsulta.valorConsultaNuUnificado=${num}`,
    tjrj: `https://www3.tjrj.jus.br/ejuris/ConsultarJurisprudencia.aspx`,
    tjrs: `https://www.tjrs.jus.br/novo/busca/?return=proc&client=wp_index&q=${num}`,
    tjmg: `https://www5.tjmg.jus.br/jurisprudencia/pesquisaPalavrasEspelhoAcordao.do?&palavras=${num}`,
    tjpr: `https://portal.tjpr.jus.br/jurisprudencia/j/12/pesquisa?q=${num}`,
    tjba: `https://esaj.tjba.jus.br/cpopg/search.do?conversationId=&cbPesquisa=NUMPROC&dadosConsulta.valorConsultaNuUnificado=${num}`,
    tjpe: `https://srv01.tjpe.jus.br/consultaprocessualunificada/processo/${num}`,
    tjsc: `https://esaj.tjsc.jus.br/cpopg/search.do?conversationId=&cbPesquisa=NUMPROC&dadosConsulta.valorConsultaNuUnificado=${num}`,
    tjce: `https://esaj.tjce.jus.br/cpopg/search.do?conversationId=&cbPesquisa=NUMPROC&dadosConsulta.valorConsultaNuUnificado=${num}`,
    tjgo: `https://pje.tjgo.jus.br/ConsultaPublica/listView.seam`,
    tjdft: `https://pje.tjdft.jus.br/consultapublica/ConsultaPublica/listView.seam`,
    tjpa: `https://consultas.tjpa.jus.br/consultaprocessual/cons_procs.php?proc_numero=${num}`,
    tjma: `https://jurisconsult.tjma.jus.br/`,
  };
  return map[tribunal] || `https://www.google.com/search?q=${num}+site:${tribunal}.jus.br`;
}

async function searchDatajud(query: string, tribunal: string): Promise<SearchResult[]> {
  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `APIKey ${DATAJUD_API_KEY}`,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        size: 8,
        query: {
          bool: {
            should: [
              { match: { "assuntos.nome": { query, boost: 3 } } },
              { match: { "classe.nome": { query, boost: 2 } } },
              { match: { "movimentos.nome": { query, boost: 1 } } },
              { match_phrase: { "numeroProcesso": query } }
            ],
            minimum_should_match: 1,
          },
        },
        sort: [{ "dataAjuizamento": { order: "desc" } }],
        _source: [
          "numeroProcesso", "classe.nome", "assuntos.nome", "orgaoJulgador.nome",
          "dataAjuizamento", "movimentos", "grau", "tribunal"
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Datajud ${tribunal} ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const hits = data.hits?.hits || [];

    return hits.map((hit: any) => {
      const src = hit._source || {};
      const assuntos = (src.assuntos || []).map((a: any) => a.nome).filter(Boolean).join(", ");
      const classe = src.classe?.nome || "";
      const orgao = src.orgaoJulgador?.nome || "";
      const ultimaMov = (src.movimentos || [])[0]?.nome || "";

      return {
        source: `datajud_${tribunal}`,
        sourceLabel: `Datajud ${tribunal.toUpperCase()}`,
        title: `${classe} - ${src.numeroProcesso || "N/A"}`,
        description: `${assuntos ? `Assuntos: ${assuntos}. ` : ""}${orgao ? `Órgão: ${orgao}. ` : ""}${ultimaMov ? `Última mov.: ${ultimaMov}` : ""}`,
        url: getProcessUrl(tribunal, src.numeroProcesso || ""),
        date: src.dataAjuizamento || "",
        type: "jurisprudencia" as const,
        metadata: {
          tribunal: tribunal.toUpperCase(),
          grau: src.grau,
          classe,
          assuntos: src.assuntos || [],
          orgaoJulgador: orgao,
          datajud: true,
        },
      };
    });
  } catch (err) {
    console.warn(`Datajud ${tribunal} error:`, err);
    throw err;
  }
}

// Convenience wrappers for each tribunal
async function searchDatajudSTJ(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "stj");
}

async function searchDatajudTST(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tst");
}

async function searchDatajudTSE(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tse");
}

async function searchDatajudSTM(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "stm");
}

// TRFs
async function searchDatajudTRF1(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "trf1");
}

async function searchDatajudTRF2(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "trf2");
}

async function searchDatajudTRF3(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "trf3");
}

async function searchDatajudTRF4(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "trf4");
}

async function searchDatajudTRF5(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "trf5");
}

async function searchDatajudTRF6(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "trf6");
}

// TJs principais
async function searchDatajudTJSP(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjsp");
}

async function searchDatajudTJRJ(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjrj");
}

async function searchDatajudTJRS(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjrs");
}

async function searchDatajudTJMG(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjmg");
}

// TJs adicionais
async function searchDatajudTJPR(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjpr");
}

async function searchDatajudTJBA(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjba");
}

async function searchDatajudTJPE(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjpe");
}

async function searchDatajudTJSC(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjsc");
}

async function searchDatajudTJCE(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjce");
}

async function searchDatajudTJGO(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjgo");
}

async function searchDatajudTJDFT(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjdft");
}

async function searchDatajudTJPA(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjpa");
}

async function searchDatajudTJMA(query: string): Promise<SearchResult[]> {
  return searchDatajud(query, "tjma");
}

// ═══════════════════════════════════════════════════════════════
// SENADO FEDERAL — Legislação (API Pública, sem chave)
// ═══════════════════════════════════════════════════════════════

async function searchSenadoLegislacao(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://legis.senado.leg.br/dadosabertos/legislacao/lista.json?palavraChave=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Senado ${res.status}`);
    const data = await res.json();
    const normas = data?.PesquisaLegislacao?.Normas?.Norma ||
                   data?.ListaLegislacao?.Legislacao?.Norma || [];
    const list = Array.isArray(normas) ? normas : [normas];
    return list.filter(Boolean).slice(0, 8).map((n: any) => ({
      source: "senado_legislacao",
      sourceLabel: "Senado Federal",
      title: n.DescricaoIdentificacao || `${n.SiglaTipoNorma || ""} ${n.NumeroNorma || ""}/${n.AnoNorma || ""}`.trim(),
      description: n.Ementa || n.TextoAssociado || "",
      url: n.UrlTextoAssociado || `https://legis.senado.leg.br/norma/${n.CodigoNorma || ""}`,
      date: n.DataNorma || "",
      type: "lei" as const,
      metadata: { codigo: n.CodigoNorma, tipo: n.SiglaTipoNorma, senado: true },
    }));
  } catch (err) {
    console.warn("Senado legislação error:", err);
    return [{
      source: "senado_legislacao", sourceLabel: "Senado Federal",
      title: `Legislação: "${query}"`,
      description: `Pesquise normas federais no Senado sobre "${query}".`,
      url: `https://legis.senado.leg.br/legislacao/ListaTextoSigen.action?query=${encodeURIComponent(query)}`,
      type: "lei" as const, metadata: { fallback: true },
    }];
  }
}

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO DE LEIS (47 leis fundamentais — busca em legal_embeddings)
// ═══════════════════════════════════════════════════════════════

async function searchCatalogoLeis(query: string): Promise<SearchResult[]> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data } = await supabaseAdmin
      .from("legal_embeddings")
      .select("id, title, content, source, source_label, url, published_date, content_type")
      .in("source", ["lexml_catalogo", "catalogo_leis", "legislacao_federal"])
      .textSearch("content", query.split(/\s+/).filter(w => w.length > 2).slice(0, 5).join(" & "), {
        type: "plain",
        config: "portuguese",
      })
      .limit(10);

    if (!data?.length) return [];

    return data.map((le: any) => ({
      source: "catalogo_leis",
      sourceLabel: le.source_label || "Catálogo de Leis",
      title: le.title,
      description: le.content?.substring(0, 400) || "",
      url: le.url || "",
      date: le.published_date || "",
      type: "lei" as const,
      metadata: { original_source: le.source, content_type: le.content_type, catalog: true },
    }));
  } catch (err) {
    console.warn("Catálogo de leis search error:", err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// NEW: BRASIL API — Dados Auxiliares (feriados, prazos)
// ═══════════════════════════════════════════════════════════════

async function searchBrasilAPI(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const currentYear = new Date().getFullYear();

  // Feriados nacionais (útil para cálculo de prazos processuais)
  try {
    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${currentYear}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const feriados = await res.json();
      const queryLower = query.toLowerCase();
      const feriadosRelevantes = feriados.filter((f: any) =>
        f.name?.toLowerCase().includes(queryLower) ||
        queryLower.includes("feriado") ||
        queryLower.includes("prazo") ||
        queryLower.includes("dia útil")
      );

      if (feriadosRelevantes.length > 0 || queryLower.includes("feriado") || queryLower.includes("prazo")) {
        const listaFeriados = (feriadosRelevantes.length > 0 ? feriadosRelevantes : feriados.slice(0, 5))
          .map((f: any) => `${f.date}: ${f.name} (${f.type})`).join("; ");

        results.push({
          source: "brasilapi",
          sourceLabel: "BrasilAPI",
          title: `Feriados Nacionais ${currentYear}`,
          description: `Feriados para cálculo de prazos processuais: ${listaFeriados}`,
          url: "https://brasilapi.com.br/docs#tag/Feriados-Nacionais",
          type: "estatistica" as const,
          metadata: { feriados: feriadosRelevantes.length > 0 ? feriadosRelevantes : feriados, brasilapi: true },
        });
      }
    }
  } catch { /* ignore */ }

  // CNPJ lookup if query looks like a CNPJ
  const cnpjMatch = query.replace(/\D/g, "");
  if (cnpjMatch.length === 14) {
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjMatch}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const empresa = await res.json();
        results.push({
          source: "brasilapi",
          sourceLabel: "BrasilAPI",
          title: `${empresa.razao_social || "Empresa"}`,
          description: `CNPJ: ${cnpjMatch} | ${empresa.descricao_situacao_cadastral || ""} | ${empresa.cnae_fiscal_descricao || ""}`,
          url: "https://brasilapi.com.br/docs#tag/CNPJ",
          type: "entidade" as const,
          metadata: { ...empresa, brasilapi: true },
        });
      }
    } catch { /* ignore */ }
  }

  return results;
}

// ─── Free Law Project / CourtListener v4 ───
async function searchFreeLaw(query: string, apiKey: string): Promise<SearchResult[]> {
  const url = `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(query)}&type=o&format=json`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Token ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`CourtListener API ${res.status}`);
  const data = await res.json();

  return (data.results || []).slice(0, 8).map((item: any) => ({
    source: 'freelaw', sourceLabel: 'CourtListener (Free Law)',
    title: item.caseName || item.case_name || 'Caso sem título',
    description: item.snippet || '',
    url: item.absolute_url ? `https://www.courtlistener.com${item.absolute_url}` : '',
    date: item.dateFiled || item.date_filed || '',
    type: 'jurisprudencia' as const,
    metadata: { court: item.court || item.court_id, citation: item.citation, docketNumber: item.docketNumber || item.docket_number },
  }));
}

// ─── CourtListener Dockets v4 ───
async function searchCourtListenerDockets(query: string, apiKey: string): Promise<SearchResult[]> {
  const url = `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(query)}&type=r&format=json`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Token ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`CourtListener Dockets API ${res.status}`);
  const data = await res.json();

  return (data.results || []).slice(0, 5).map((item: any) => ({
    source: 'courtlistener_dockets', sourceLabel: 'CourtListener Dockets',
    title: item.caseName || item.case_name || 'Processo sem título',
    description: item.snippet || `Docket #${item.docketNumber || item.docket_number || 'N/A'}`,
    url: item.absolute_url ? `https://www.courtlistener.com${item.absolute_url}` : '',
    date: item.dateFiled || item.date_filed || '',
    type: 'jurisprudencia' as const,
    metadata: { court: item.court || item.court_id, docketNumber: item.docketNumber || item.docket_number },
  }));
}

// ═══════════════════════════════════════
// AI QUERY REFINEMENT — interprets natural language into precise legal keywords
// ═══════════════════════════════════════

async function refineQueryWithAI(rawQuery: string): Promise<{ refinedQuery: string; keywords: string[]; intent: string; area?: string; exclude_terms?: string[] }> {
  try {
    // Dynamic provider routing: check ai_providers table first
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    let enabledProviders: { provider_name: string; priority: number }[] = [];
    try {
      const { data: providers } = await supabaseAdmin
        .from("ai_providers")
        .select("provider_name, priority, use_for")
        .eq("is_enabled", true)
        .order("priority", { ascending: true });
      enabledProviders = (providers || []).filter((p: any) => {
        const uses = p.use_for;
        if (Array.isArray(uses)) return uses.includes("search");
        return true;
      });
    } catch (e) { console.warn("[AI Refine] Failed to load providers:", e); }
    
    // Determine which keys to try based on enabled providers (fallback to env keys)
    const groqKey = Deno.env.get("GROQ_API_KEY") || "";
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || || || "";
    const openaiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_API_KEY_2") || "";
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
    
    if (!geminiKey && !groqKey && !openaiKey && !anthropicKey) {
      console.warn("[AI Refine] No AI keys available, using raw query");
      return { refinedQuery: rawQuery, keywords: rawQuery.split(/\s+/).filter(w => w.length > 3), intent: rawQuery };
    }

    // Build ordered list of providers to try
    const tryOrder: string[] = [];
    if (enabledProviders.length > 0) {
      for (const p of enabledProviders) tryOrder.push(p.provider_name);
    } else {
      // Fallback order
      if (geminiKey) tryOrder.push("gemini");
      if (groqKey) tryOrder.push("groq");
    }
    
    let aiResponse = "";
    const refinePrompt = `Analise esta busca jurídica: "${rawQuery}"

Retorne JSON com:
{
  "refined_query": "<reescreva a busca do usuário com termos jurídicos técnicos precisos, mantendo o sentido original>",
  "keywords": ["<extraia 3-6 palavras-chave jurídicas relevantes da busca>"],
  "intent": "<descreva brevemente a intenção da busca>",
  "area": "<identifique: penal|civil|trabalhista|tributário|administrativo|constitucional|consumidor|ambiental|empresarial|previdenciário|família|eleitoral>",
  "exclude_terms": ["<termos de áreas jurídicas NÃO relacionadas à busca>"]
}

REGRAS CRÍTICAS:
1. O campo "refined_query" DEVE conter os termos reais da busca do usuário, refinados com vocabulário jurídico técnico. NUNCA use textos genéricos ou placeholders.
2. Exemplo: se o usuário busca "danos morais consumidor", refined_query deve ser algo como "responsabilidade civil danos morais relação de consumo CDC".
3. Se o usuário busca "crimes", NÃO retorne termos de direito civil. Se busca "trabalhista", NÃO retorne termos penais. Seja PRECISO na área jurídica.
4. Retorne APENAS o JSON, sem markdown, sem explicações.`;
    
    for (const providerName of tryOrder) {
      if (aiResponse) break;
      try {
        if (providerName === "groq" && groqKey) {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [
                { role: "system", content: "Retorne APENAS JSON válido, sem markdown." },
                { role: "user", content: refinePrompt }
              ],
              temperature: 0.1, max_tokens: 300,
            }),
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            const data = await res.json();
            aiResponse = data.choices?.[0]?.message?.content || "";
          }
        } else if (providerName === "gemini" && geminiKey) {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Você é um especialista em pesquisa jurídica brasileira. ${refinePrompt}\nRetorne APENAS JSON válido.` }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
              }),
              signal: AbortSignal.timeout(5000),
            }
          );
          if (res.ok) {
            const data = await res.json();
            aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          }
        } else if (providerName === "openai" && openaiKey) {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "Retorne APENAS JSON válido, sem markdown." },
                { role: "user", content: refinePrompt }
              ],
              temperature: 0.1, max_tokens: 300,
            }),
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            const data = await res.json();
            aiResponse = data.choices?.[0]?.message?.content || "";
          }
        } else if (providerName === "anthropic" && anthropicKey) {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 300,
              messages: [{ role: "user", content: `Retorne APENAS JSON válido, sem markdown.\n\n${refinePrompt}` }],
            }),
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            const data = await res.json();
            aiResponse = data.content?.[0]?.text || "";
          }
        }
        if (aiResponse) console.log(`[AI Refine] Using provider: ${providerName}`);
      } catch (e) { console.warn(`[AI Refine] ${providerName} failed:`, e); }
    }
    
    if (!aiResponse) {
      console.warn("[AI Refine] No AI response, using raw query");
      return { refinedQuery: rawQuery, keywords: rawQuery.split(/\s+/).filter(w => w.length > 3), intent: rawQuery };
    }

    // Parse JSON from response (handle possible markdown wrapping)
    const jsonStr = aiResponse.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    
    console.log(`[AI Refine] "${rawQuery}" → "${parsed.refined_query}" | area: ${parsed.area} | keywords: ${parsed.keywords?.join(", ")}`);
    
    return {
      refinedQuery: parsed.refined_query || rawQuery,
      keywords: parsed.keywords || [],
      intent: parsed.intent || rawQuery,
      ...parsed,
    };
  } catch (err) {
    console.warn("[AI Refine] Failed, using raw query:", err);
    return { refinedQuery: rawQuery, keywords: rawQuery.split(/\s+/).filter(w => w.length > 3), intent: rawQuery };
  }
}

// ═══════════════════════════════════════
// POST-SEARCH RELEVANCE FILTER — removes results that don't match the query intent
// ═══════════════════════════════════════

function filterByRelevance(results: SearchResult[], refinement: any): SearchResult[] {
  if (!refinement.keywords?.length && !refinement.exclude_terms?.length) return results;
  
  const keywords = (refinement.keywords || []).map((k: string) => k.toLowerCase());
  const excludeTerms = (refinement.exclude_terms || []).map((t: string) => t.toLowerCase());
  const area = (refinement.area || "").toLowerCase();
  
  // Score each result by how many keywords it matches
  const scored = results.map(r => {
    const text = `${r.title} ${r.description}`.toLowerCase();
    
    // Check if result contains excluded terms predominantly
    let excludeCount = 0;
    for (const term of excludeTerms) {
      if (text.includes(term)) excludeCount++;
    }
    
    // Check keyword matches
    let keywordMatches = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) keywordMatches++;
    }
    
    // Fallback/catalog results always pass (they're curated)
    const isFallback = r.metadata?.fallback || r.metadata?.catalog;
    
    // Calculate relevance score
    const relevanceScore = keywords.length > 0 
      ? keywordMatches / keywords.length 
      : 1;
    
    // Penalize if too many exclude terms match and no keywords match
    const shouldExclude = !isFallback && excludeCount > 0 && keywordMatches === 0 && keywords.length > 0;
    
    return { result: r, relevanceScore, shouldExclude };
  });
  
  // Filter out irrelevant results, keep those with at least some keyword match or fallbacks
  const filtered = scored
    .filter(s => !s.shouldExclude)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .map(s => s.result);
  
  console.log(`[Relevance Filter] ${results.length} → ${filtered.length} results (keywords: ${keywords.join(", ")})`);
  
  return filtered;
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
// TXT KNOWLEDGE BASE — Search verified books as search source
// ═══════════════════════════════════════════════════════════════

const TXT_KNOWLEDGE_FILES_UNI: Array<{ url: string; label: string; tipo: "doutrina"|"jurisprudencia"|"sumula" }> = [
  { url: "sumulas-stj-inteiro-teor.txt", label: "📚 Súmulas STJ — Inteiro Teor Completo (89k linhas)", tipo: "sumula" },
  { url: "direito-processual-penal-completo.txt", label: "📚 Aury Lopes Jr. — DPP Completo (42k linhas)", tipo: "doutrina" },
  { url: "tematica-jurisprudencia-stf-completa.txt", label: "📚 Coletânea Temática STF Completa (27k linhas)", tipo: "jurisprudencia" },
  { url: "principios-processuais-penais.txt", label: "📚 Princípios Processuais Penais", tipo: "doutrina" },
  { url: "jurisprudencia-stf-penal.txt", label: "📚 Jurisprudência STF Penal", tipo: "jurisprudencia" },
  // === Fallback ===
  { url: "sumulas-stj-completas-v4.txt", label: "📚 Súmulas STJ v4 (fallback)", tipo: "sumula" },
  { url: "aury-lopes-direito-processual-penal-v3.txt", label: "📚 Aury Lopes Jr. v3 (fallback)", tipo: "doutrina" },
  { url: "tematica-jurisprudencia-stf-v5.txt", label: "📚 Coletânea STF v5 (fallback)", tipo: "jurisprudencia" },
  { url: "nocoes-direito-processual-penal-v4.txt", label: "📚 Noções DPP v4 (fallback)", tipo: "doutrina" }
];

const _txtCacheUni = new Map<string, { content: string; loadedAt: number }>();

async function loadTxtFileUni(filename: string): Promise<string | null> {
  const cached = _txtCacheUni.get(filename);
  if (cached && (Date.now() - cached.loadedAt) < 30 * 60 * 1000) return cached.content;
  try {
    const res = await fetch(`https://gentle-maker-lab.lovable.app/docs/${filename}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 100) _txtCacheUni.set(filename, { content: text, loadedAt: Date.now() });
    return text;
  } catch (e) { console.warn(`⚠️ TXT load fail ${filename}:`, e); return null; }
}

async function searchTxtKnowledgeBaseUnificada(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 8);
  if (keywords.length === 0) return results;

  console.log(`📚 [pesquisa] TXT KB search: ${keywords.length} keywords`);

  const searchPromises = TXT_KNOWLEDGE_FILES_UNI.map(async (file) => {
    const content = await loadTxtFileUni(file.url);
    if (!content) return;
    const lines = content.split("\n");
    const windowSize = 15;
    const excerpts: Array<{ text: string; score: number }> = [];
    for (let i = 0; i < lines.length - windowSize; i += 5) {
      const window = lines.slice(i, i + windowSize).join("\n");
      const windowLower = window.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (windowLower.includes(kw)) score += (windowLower.match(new RegExp(kw, "g")) || []).length;
      }
      if (score >= 2) excerpts.push({ text: window.substring(0, 800), score });
    }
    excerpts.sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    let count = 0;
    for (const e of excerpts) {
      const key = e.text.substring(0, 100);
      if (!seen.has(key) && count < 3) {
        seen.add(key);
        count++;
        results.push({
          source: "txt_biblioteca",
          sourceLabel: `📚 ${file.label}`,
          title: `${file.label}: Trecho Verificado`,
          description: e.text,
          type: file.tipo === "sumula" ? "jurisprudencia" : file.tipo === "jurisprudencia" ? "jurisprudencia" : "doutrina",
          metadata: { verified: true, book: file.url, score: e.score, txt_biblioteca: true },
        });
      }
    }
  });

  await Promise.allSettled(searchPromises);
  // Boost: sort verified results by score (they get priority in final ranking)
  results.sort((a, b) => ((b.metadata?.score as number) || 0) - ((a.metadata?.score as number) || 0));
  console.log(`  📚 [pesquisa] TXT KB: ${results.length} verified results`);
  return results.slice(0, 10);
}

// ═══════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: A1 — Validate user authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuthClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query: rawQuery, sources, filters } = await req.json();

    if (!rawQuery || typeof rawQuery !== 'string' || rawQuery.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: AI refines the user's natural language into precise legal keywords
    const refinement = await refineQueryWithAI(rawQuery.trim());
    const query = refinement.refinedQuery;
    
    console.log(`[Search] Raw: "${rawQuery.trim()}" → Refined: "${query}"`);

    const googleApiKey = Deno.env.get('GOOGLE_API_KEY') || '';
    const freelawApiKey = Deno.env.get('FREELAW_API_KEY') || '';

    // Default: all sources enabled (including prioritized Datajud tribunals + BrasilAPI + Senado)
    const enabledSources = sources || [
      'knowledge_graph', 'google_books', 'camara', 'lexml', 'stf', 'cnj',
      'freelaw', 'courtlistener_dockets',
      'datajud_stj', 'datajud_tst', 'datajud_tse', 'datajud_stm',
      'datajud_trf1', 'datajud_trf2', 'datajud_trf3', 'datajud_trf4', 'datajud_trf5', 'datajud_trf6',
      'datajud_tjsp', 'datajud_tjrj', 'datajud_tjrs', 'datajud_tjmg',
      'datajud_tjpr', 'datajud_tjba', 'datajud_tjpe', 'datajud_tjsc',
      'datajud_tjce', 'datajud_tjgo', 'datajud_tjdft', 'datajud_tjpa', 'datajud_tjma',
      'brasilapi', 'senado_legislacao', 'catalogo_leis'
    ];

    const allResults: SearchResult[] = [];
    const errors: { source: string; error: string }[] = [];

    // ─── Separate Datajud sources from non-Datajud for batched execution ───
    const datajudSources = enabledSources.filter((s: string) => s.startsWith('datajud_'));
    const nonDatajudSources = enabledSources.filter((s: string) => !s.startsWith('datajud_'));

    const promises: { source: string; promise: Promise<SearchResult[]> }[] = [];

    if (nonDatajudSources.includes('knowledge_graph') && googleApiKey && googleApiKey.length > 10) {
      promises.push({ source: 'knowledge_graph', promise: searchKnowledgeGraph(query, googleApiKey) });
    }
    if (nonDatajudSources.includes('google_books') && googleApiKey && googleApiKey.length > 10) {
      promises.push({ source: 'google_books', promise: searchGoogleBooks(query, googleApiKey) });
    }
    if (nonDatajudSources.includes('camara')) {
      promises.push({ source: 'camara', promise: searchCamara(query) });
    }
    if (nonDatajudSources.includes('lexml')) {
      promises.push({ source: 'lexml', promise: searchLexML(query) });
    }
    if (nonDatajudSources.includes('stf')) {
      promises.push({ source: 'stf', promise: searchSTF(query) });
    }
    if (nonDatajudSources.includes('cnj')) {
      promises.push({ source: 'cnj', promise: searchCNJ(query) });
    }
    if (nonDatajudSources.includes('freelaw') && freelawApiKey) {
      promises.push({ source: 'freelaw', promise: searchFreeLaw(query, freelawApiKey) });
    }
    if (nonDatajudSources.includes('courtlistener_dockets') && freelawApiKey) {
      promises.push({ source: 'courtlistener_dockets', promise: searchCourtListenerDockets(query, freelawApiKey) });
    }
    if (nonDatajudSources.includes('brasilapi')) {
      promises.push({ source: 'brasilapi', promise: searchBrasilAPI(query) });
    }
    if (nonDatajudSources.includes('senado_legislacao')) {
      promises.push({ source: 'senado_legislacao', promise: searchSenadoLegislacao(query) });
    }
    if (nonDatajudSources.includes('catalogo_leis')) {
      promises.push({ source: 'catalogo_leis', promise: searchCatalogoLeis(query) });
    }
    // Neural sources always included
    promises.push({ source: 'neural_knowledge', promise: searchNeuralKnowledgeBase(query) });
    promises.push({ source: 'neural_embeddings', promise: searchLegalEmbeddings(query) });
    // TXT Knowledge Base (verified books)
    promises.push({ source: 'txt_biblioteca', promise: searchTxtKnowledgeBaseUnificada(query) });

    // ─── Datajud: batch in waves of 5 to avoid rate-limiting ───
    const DATAJUD_BATCH_SIZE = 5;
    const datajudMap: Record<string, (q: string) => Promise<SearchResult[]>> = {
      datajud_stj: searchDatajudSTJ, datajud_tst: searchDatajudTST,
      datajud_tse: searchDatajudTSE, datajud_stm: searchDatajudSTM,
      datajud_trf1: searchDatajudTRF1, datajud_trf2: searchDatajudTRF2,
      datajud_trf3: searchDatajudTRF3, datajud_trf4: searchDatajudTRF4,
      datajud_trf5: searchDatajudTRF5, datajud_trf6: searchDatajudTRF6,
      datajud_tjsp: searchDatajudTJSP, datajud_tjrj: searchDatajudTJRJ,
      datajud_tjrs: searchDatajudTJRS, datajud_tjmg: searchDatajudTJMG,
      datajud_tjpr: searchDatajudTJPR, datajud_tjba: searchDatajudTJBA,
      datajud_tjpe: searchDatajudTJPE, datajud_tjsc: searchDatajudTJSC,
      datajud_tjce: searchDatajudTJCE, datajud_tjgo: searchDatajudTJGO,
      datajud_tjdft: searchDatajudTJDFT, datajud_tjpa: searchDatajudTJPA,
      datajud_tjma: searchDatajudTJMA,
    };

    // Priority order: superiores first, then TRFs, then TJs
    const datajudPriority = [
      'datajud_stj', 'datajud_tst', 'datajud_trf4', 'datajud_tjrs', 'datajud_tjsp',
      'datajud_tse', 'datajud_stm', 'datajud_trf1', 'datajud_trf2', 'datajud_trf3',
      'datajud_trf5', 'datajud_trf6', 'datajud_tjrj', 'datajud_tjmg',
      'datajud_tjpr', 'datajud_tjba', 'datajud_tjpe', 'datajud_tjsc',
      'datajud_tjce', 'datajud_tjgo', 'datajud_tjdft', 'datajud_tjpa', 'datajud_tjma'
    ];
    const activeDatejud = datajudPriority.filter(s => datajudSources.includes(s) && datajudMap[s]);

    // Execute non-Datajud + first Datajud batch in parallel
    const firstBatch = activeDatejud.slice(0, DATAJUD_BATCH_SIZE);
    for (const src of firstBatch) {
      promises.push({ source: src, promise: datajudMap[src](query) });
    }

    // Execute first wave (non-Datajud + priority Datajud)
    const settled = await Promise.allSettled(promises.map(p => p.promise));
    settled.forEach((result, index) => {
      const { source } = promises[index];
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      } else {
        console.error(`Error from ${source}:`, result.reason);
        errors.push({ source, error: String(result.reason?.message || result.reason) });
      }
    });

    // Execute remaining Datajud batches sequentially (wave by wave)
    const remainingDatejud = activeDatejud.slice(DATAJUD_BATCH_SIZE);
    for (let i = 0; i < remainingDatejud.length; i += DATAJUD_BATCH_SIZE) {
      const batch = remainingDatejud.slice(i, i + DATAJUD_BATCH_SIZE);
      const batchPromises = batch.map(src => ({
        source: src,
        promise: datajudMap[src](query),
      }));
      const batchSettled = await Promise.allSettled(batchPromises.map(p => p.promise));
      batchSettled.forEach((result, idx) => {
        const { source } = batchPromises[idx];
        if (result.status === 'fulfilled') {
          allResults.push(...result.value);
        } else {
          console.error(`Error from ${source}:`, result.reason);
          errors.push({ source, error: String(result.reason?.message || result.reason) });
        }
      });
    }

    // Step 2: Apply AI relevance filter to remove irrelevant results
    let filteredResults = filterByRelevance(allResults, refinement);
    
    // Apply type filter if provided
    if (filters?.type) {
      filteredResults = filteredResults.filter(r => r.type === filters.type);
    }

    const response: UnifiedResponse = {
      query: rawQuery.trim(),
      refinedQuery: query,
      area: (refinement as any).area || null,
      totalResults: filteredResults.length,
      results: filteredResults,
      errors,
      timestamp: new Date().toISOString(),
    };

    // Auto-index real results (non-fallback) into legal_embeddings for neural enrichment
    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const realResults = filteredResults.filter(r =>
        !r.metadata?.fallback && !r.metadata?.catalog && !r.metadata?.neural &&
        !r.metadata?.neural_embedding && !r.source?.startsWith('neural_embeddings') &&
        r.title && r.description && r.description.length > 50
      ).slice(0, 5);

      if (realResults.length > 0) {
        const inserts = realResults.map(r => ({
          title: r.title.substring(0, 500),
          content: (r.description || "").substring(0, 5000),
          source: r.source,
          source_label: r.sourceLabel,
          content_type: r.type || "lei",
          url: r.url || null,
          published_date: r.date || null,
          query_origin: query.substring(0, 200),
          metadata: r.metadata ? JSON.parse(JSON.stringify(r.metadata)) : {},
        }));
        const { error: insertError } = await supabaseAdmin
          .from("legal_embeddings")
          .upsert(inserts, { onConflict: "title,source", ignoreDuplicates: true });
        if (!insertError) {
          console.log(`📚 Auto-indexed ${inserts.length} search results into legal_embeddings`);
        }
      }
    } catch (e) {
      console.warn("Auto-indexing error (non-blocking):", e);
    }

    // ── CLOSED LOOP: neural feedback + generate-embeddings para itens indexados ──
    const supabaseUrlEnv = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKeyEnv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Registrar pesquisa no neural_learning_data para RLHF
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          const supa = createClient(supabaseUrlEnv, serviceKeyEnv);
          await supa.from("neural_learning_data").insert({
            interaction_type: "pesquisa_unificada",
            input_text: query.substring(0, 500),
            output_text: filteredResults.slice(0, 3).map(r => `[${r.sourceLabel}] ${r.title}: ${(r.description || "").substring(0, 300)}`).join("\n\n"),
            quality_score: filteredResults.length > 0 ? Math.min(0.5 + (filteredResults.length / 20) * 0.4, 0.9) : 0.3,
            learned: filteredResults.length >= 3,
            metadata: {
              query,
              resultCount: filteredResults.length,
              sources: [...new Set(filteredResults.slice(0, 10).map(r => r.source))],
              autoScored: true,
              source: "pesquisa_unificada",
            },
          });
          console.log("✅ Neural learning data registrado (pesquisa_unificada)");
        } catch (e) { console.warn("Neural RLHF registration failed:", e); }
      })()
    );

    // Triggar generate-embeddings se novos itens foram indexados
    if (filteredResults.length > 0) {
      EdgeRuntime.waitUntil(
        new Promise(r => setTimeout(r, 5000)).then(() =>
          fetch(`${supabaseUrlEnv}/functions/v1/generate-embeddings`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKeyEnv}` },
            body: JSON.stringify({ target: "legal", batchSize: 30 }),
            signal: AbortSignal.timeout(60000),
          })
          .then(() => console.log("✅ generate-embeddings triggered (pesquisa-unificada)"))
          .catch(e => console.warn("generate-embeddings trigger error:", e))
        )
      );
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unified search error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar pesquisa' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
