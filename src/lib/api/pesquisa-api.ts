import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  source: string;
  sourceLabel: string;
  title: string;
  description: string;
  url?: string;
  date?: string;
  type: 'lei' | 'jurisprudencia' | 'doutrina' | 'entidade' | 'proposicao' | 'estatistica';
  metadata?: Record<string, unknown>;
  content_type?: string;
}

export interface UnifiedSearchResponse {
  query: string;
  totalResults: number;
  results: SearchResult[];
  errors: { source: string; error: string }[];
  timestamp: string;
}

export type SourceId = 
  | 'knowledge_graph' 
  | 'google_books' 
  | 'camara' 
  | 'lexml' 
  | 'stf' 
  | 'cnj' 
  | 'freelaw' 
  | 'courtlistener_dockets'
  | 'datajud_stj'
  | 'datajud_tst'
  | 'datajud_tse'
  | 'datajud_stm'
  | 'datajud_trf1'
  | 'datajud_trf2'
  | 'datajud_trf3'
  | 'datajud_trf4'
  | 'datajud_trf5'
  | 'datajud_trf6'
  | 'datajud_tjsp'
  | 'datajud_tjrj'
  | 'datajud_tjrs'
  | 'datajud_tjmg'
  | 'datajud_tjpr'
  | 'datajud_tjba'
  | 'datajud_tjpe'
  | 'datajud_tjsc'
  | 'datajud_tjce'
  | 'datajud_tjgo'
  | 'datajud_tjdft'
  | 'datajud_tjpa'
  | 'datajud_tjma'
  | 'brasilapi'
  | 'senado_legislacao'
  | 'catalogo_leis'
  | 'neural_knowledge'
  | 'neural_embeddings'
  | 'txt_biblioteca';

export type ResultType = 'lei' | 'jurisprudencia' | 'doutrina' | 'entidade' | 'proposicao' | 'estatistica';

export const SOURCE_LABELS: Record<string, string> = {
  knowledge_graph: 'Knowledge Graph',
  google_books: 'Google Books',
  camara: 'Câmara dos Deputados',
  lexml: 'LexML Brasil',
  stf: 'STF',
  cnj: 'CNJ',
  freelaw: 'CourtListener (Free Law)',
  courtlistener_dockets: 'CourtListener Dockets',
  datajud_stj: 'Datajud STJ',
  datajud_tst: 'Datajud TST',
  datajud_tse: 'Datajud TSE',
  datajud_stm: 'Datajud STM',
  datajud_trf1: 'Datajud TRF1',
  datajud_trf2: 'Datajud TRF2',
  datajud_trf3: 'Datajud TRF3',
  datajud_trf4: 'Datajud TRF4',
  datajud_trf5: 'Datajud TRF5',
  datajud_trf6: 'Datajud TRF6',
  datajud_tjsp: 'Datajud TJSP',
  datajud_tjrj: 'Datajud TJRJ',
  datajud_tjrs: 'Datajud TJRS',
  datajud_tjmg: 'Datajud TJMG',
  datajud_tjpr: 'Datajud TJPR',
  datajud_tjba: 'Datajud TJBA',
  datajud_tjpe: 'Datajud TJPE',
  datajud_tjsc: 'Datajud TJSC',
  datajud_tjce: 'Datajud TJCE',
  datajud_tjgo: 'Datajud TJGO',
  datajud_tjdft: 'Datajud TJDFT',
  datajud_tjpa: 'Datajud TJPA',
  datajud_tjma: 'Datajud TJMA',
  brasilapi: 'BrasilAPI',
  senado_legislacao: 'Senado Federal',
  catalogo_leis: 'Catálogo de Leis',
  neural_knowledge: 'Doutrina Univates',
  neural_embeddings: 'Rede Neural (Leis)',
  txt_biblioteca: '📚 Biblioteca Verificada (Livro)',
};

export const TYPE_LABELS: Record<ResultType, string> = {
  lei: 'Legislação',
  jurisprudencia: 'Jurisprudência',
  doutrina: 'Doutrina',
  entidade: 'Entidade',
  proposicao: 'Proposição',
  estatistica: 'Estatística',
};

export async function pesquisaUnificada(
  query: string,
  sources?: SourceId[],
  typeFilter?: ResultType,
): Promise<UnifiedSearchResponse> {
  const { data, error } = await supabase.functions.invoke('pesquisa-unificada', {
    body: {
      query,
      sources,
      filters: typeFilter ? { type: typeFilter } : undefined,
    },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao realizar pesquisa');
  }

  return data as UnifiedSearchResponse;
}


// Stub types for neural search (to be reimplemented)
export interface NeuralSearchResult {
  id?: string;
  title: string;
  content: string;
  source: string;
  source_label?: string;
  url?: string;
  published_date?: string;
  combined_score?: number;
  similarity?: number;
  multi_head_score?: number;
  attention_heads?: Record<string, number>;
  quantum_category?: string;
  metadata?: Record<string, unknown>;
  content_type?: string;
  type?: string;
}

export interface NeuralSearchResponse {
  results: NeuralSearchResult[];
  totalResults: number;
  timings?: Record<string, number>;
  pipeline?: string[];
  refinedQuery?: string;
  area?: string;
  queryType?: string;
  indexed?: number;
  errors?: { source: string; error: string }[];
  cacheHit?: boolean;
  embeddingCacheHit?: boolean;
  expandedQueries?: string[];
  version?: string;
}

export async function neuralSearch(
  _query: string,
  _options?: Record<string, unknown>,
): Promise<NeuralSearchResponse> {
  return { results: [], totalResults: 0 };
}

export async function submitSearchFeedback(
  _data: Record<string, unknown>,
): Promise<void> {}
