// Cliente Unificado para Ingestão Jurídica (DataJud + JUIT)
// Permite popular o vector store com jurisprudência brasileira

import { supabase } from "@/integrations/supabase/client";

export interface UnifiedIngestionOptions {
  // DataJud options
  tribunais?: string[];
  diasAtras?: number;
  queryTema?: string;
  size?: number;
  
  // JUIT options
  enableJuit?: boolean;
  temasJuit?: string[];
  sizeJuit?: number;
  
  // General
  generateEmbeddings?: boolean;
  mode?: "datajud" | "juit" | "full";
}

export interface IngestionResultItem {
  source: string;
  tribunal?: string;
  tema?: string;
  processados: number;
  inseridos: number;
  duplicados: number;
  erros: string[];
}

export interface UnifiedIngestionResult {
  success: boolean;
  mode: string;
  stats: {
    totalProcessados: number;
    totalInseridos: number;
    totalDuplicados: number;
    totalErros: number;
  };
  results: IngestionResultItem[];
  timestamp: string;
  error?: string;
}

// Tribunais disponíveis para ingestão DataJud
export const TRIBUNAIS_DISPONIVEIS = [
  { id: "stf", nome: "Supremo Tribunal Federal", sigla: "STF" },
  { id: "stj", nome: "Superior Tribunal de Justiça", sigla: "STJ" },
  { id: "tst", nome: "Tribunal Superior do Trabalho", sigla: "TST" },
  { id: "tse", nome: "Tribunal Superior Eleitoral", sigla: "TSE" },
  // TJs principais
  { id: "tjsp", nome: "Tribunal de Justiça de São Paulo", sigla: "TJ-SP" },
  { id: "tjrs", nome: "Tribunal de Justiça do RS", sigla: "TJ-RS" },
  { id: "tjrj", nome: "Tribunal de Justiça do RJ", sigla: "TJ-RJ" },
  { id: "tjmg", nome: "Tribunal de Justiça de MG", sigla: "TJ-MG" },
  { id: "tjpr", nome: "Tribunal de Justiça do PR", sigla: "TJ-PR" },
  { id: "tjsc", nome: "Tribunal de Justiça de SC", sigla: "TJ-SC" },
  { id: "tjba", nome: "Tribunal de Justiça da BA", sigla: "TJ-BA" },
  { id: "tjpe", nome: "Tribunal de Justiça de PE", sigla: "TJ-PE" },
  // TJs expandidos
  { id: "tjce", nome: "Tribunal de Justiça do CE", sigla: "TJ-CE" },
  { id: "tjgo", nome: "Tribunal de Justiça de GO", sigla: "TJ-GO" },
  { id: "tjdft", nome: "Tribunal de Justiça do DF", sigla: "TJ-DFT" },
  { id: "tjpa", nome: "Tribunal de Justiça do PA", sigla: "TJ-PA" },
  { id: "tjma", nome: "Tribunal de Justiça do MA", sigla: "TJ-MA" },
  { id: "tjpi", nome: "Tribunal de Justiça do PI", sigla: "TJ-PI" },
  { id: "tjrn", nome: "Tribunal de Justiça do RN", sigla: "TJ-RN" },
  { id: "tjpb", nome: "Tribunal de Justiça da PB", sigla: "TJ-PB" },
  { id: "tjse", nome: "Tribunal de Justiça de SE", sigla: "TJ-SE" },
  { id: "tjal", nome: "Tribunal de Justiça de AL", sigla: "TJ-AL" },
  { id: "tjes", nome: "Tribunal de Justiça do ES", sigla: "TJ-ES" },
  { id: "tjmt", nome: "Tribunal de Justiça do MT", sigla: "TJ-MT" },
  { id: "tjms", nome: "Tribunal de Justiça do MS", sigla: "TJ-MS" },
  { id: "tjam", nome: "Tribunal de Justiça do AM", sigla: "TJ-AM" },
  { id: "tjro", nome: "Tribunal de Justiça de RO", sigla: "TJ-RO" },
  { id: "tjto", nome: "Tribunal de Justiça do TO", sigla: "TJ-TO" },
  { id: "tjac", nome: "Tribunal de Justiça do AC", sigla: "TJ-AC" },
  { id: "tjap", nome: "Tribunal de Justiça do AP", sigla: "TJ-AP" },
  { id: "tjrr", nome: "Tribunal de Justiça de RR", sigla: "TJ-RR" },
  // TRFs
  { id: "trf1", nome: "TRF da 1ª Região", sigla: "TRF-1" },
  { id: "trf2", nome: "TRF da 2ª Região", sigla: "TRF-2" },
  { id: "trf3", nome: "TRF da 3ª Região", sigla: "TRF-3" },
  { id: "trf4", nome: "TRF da 4ª Região", sigla: "TRF-4" },
  { id: "trf5", nome: "TRF da 5ª Região", sigla: "TRF-5" },
  // TRTs
  { id: "trt2", nome: "TRT da 2ª Região (SP)", sigla: "TRT-2" },
  { id: "trt3", nome: "TRT da 3ª Região (MG)", sigla: "TRT-3" },
];

// Classes processuais comuns para filtro
export const CLASSES_PROCESSUAIS = [
  "Ação Civil Pública",
  "Ação de Indenização por Danos Morais",
  "Ação de Indenização por Danos Materiais",
  "Ação de Cobrança",
  "Ação de Divórcio",
  "Ação de Alimentos",
  "Ação de Guarda",
  "Mandado de Segurança",
  "Habeas Corpus",
  "Reclamação Trabalhista",
  "Recurso Especial",
  "Recurso Extraordinário",
  "Agravo de Instrumento",
  "Apelação Cível",
  "Execução Fiscal",
  "Execução de Título Extrajudicial",
];

// Temas padrão para ingestão JUIT
export const TEMAS_JUIT_DISPONIVEIS = [
  "danos morais",
  "indenização",
  "prescrição",
  "divórcio",
  "consumidor",
  "trabalhista",
  "habeas corpus",
  "recurso especial",
  "previdenciário",
  "família",
  "contratos",
  "responsabilidade civil",
  "direito administrativo",
  "direito tributário",
];

/**
 * Inicia a ingestão unificada (DataJud + JUIT)
 * Processa tribunais em batches de 3 para evitar timeout da edge function
 */
export interface TribunalProgress {
  tribunalId: string;
  status: "pending" | "processing" | "done" | "error";
  inseridos?: number;
  duplicados?: number;
  error?: string;
}

export async function ingestUnified(
  options: UnifiedIngestionOptions = {},
  onBatchProgress?: (batchIndex: number, totalBatches: number, partialResult: UnifiedIngestionResult) => void,
  onTribunalProgress?: (tribunais: TribunalProgress[]) => void
): Promise<UnifiedIngestionResult> {
  const tribunais = options.tribunais || ["stj", "tjrs", "tjsp"];
  const BATCH_SIZE = 3;

  // Initialize per-tribunal progress
  const tribunalProgress: TribunalProgress[] = tribunais.map(id => ({
    tribunalId: id,
    status: "pending",
  }));
  onTribunalProgress?.(tribunalProgress);
  
  // If 3 or fewer tribunais, single call
  if (tribunais.length <= BATCH_SIZE && options.mode !== "full") {
    // Mark all as processing
    tribunalProgress.forEach(t => t.status = "processing");
    onTribunalProgress?.([...tribunalProgress]);
    
    const result = await singleIngestionCall(options);
    
    // Mark all as done/error
    tribunalProgress.forEach(t => {
      const found = result.results.find(r => r.tribunal === t.tribunalId);
      t.status = result.success ? "done" : "error";
      t.inseridos = found?.inseridos || 0;
      t.duplicados = found?.duplicados || 0;
      if (!result.success) t.error = result.error;
    });
    onTribunalProgress?.([...tribunalProgress]);
    
    return result;
  }

  // Split tribunais into batches of 3
  const batches: string[][] = [];
  for (let i = 0; i < tribunais.length; i += BATCH_SIZE) {
    batches.push(tribunais.slice(i, i + BATCH_SIZE));
  }

  const aggregatedStats = { totalProcessados: 0, totalInseridos: 0, totalDuplicados: 0, totalErros: 0 };
  const allResults: IngestionResultItem[] = [];

  for (let i = 0; i < batches.length; i++) {
    // Mark current batch as processing
    batches[i].forEach(tid => {
      const tp = tribunalProgress.find(t => t.tribunalId === tid);
      if (tp) tp.status = "processing";
    });
    onTribunalProgress?.([...tribunalProgress]);

    const batchOptions = { ...options, tribunais: batches[i], enableJuit: i === 0 ? options.enableJuit : false };
    const batchResult = await singleIngestionCall(batchOptions);

    if (batchResult.success) {
      aggregatedStats.totalProcessados += batchResult.stats.totalProcessados;
      aggregatedStats.totalInseridos += batchResult.stats.totalInseridos;
      aggregatedStats.totalDuplicados += batchResult.stats.totalDuplicados;
      aggregatedStats.totalErros += batchResult.stats.totalErros;
      allResults.push(...batchResult.results);

      // Mark batch tribunals as done
      batches[i].forEach(tid => {
        const tp = tribunalProgress.find(t => t.tribunalId === tid);
        const found = batchResult.results.find(r => r.tribunal === tid);
        if (tp) {
          tp.status = "done";
          tp.inseridos = found?.inseridos || 0;
          tp.duplicados = found?.duplicados || 0;
        }
      });
    } else {
      aggregatedStats.totalErros += 1;
      allResults.push({ source: "datajud", tribunal: batches[i].join(","), processados: 0, inseridos: 0, duplicados: 0, erros: [batchResult.error || "Batch failed"] });

      // Mark batch tribunals as error
      batches[i].forEach(tid => {
        const tp = tribunalProgress.find(t => t.tribunalId === tid);
        if (tp) {
          tp.status = "error";
          tp.error = batchResult.error || "Batch failed";
        }
      });
    }

    onTribunalProgress?.([...tribunalProgress]);

    // Notify progress
    const partialResult: UnifiedIngestionResult = {
      success: true,
      mode: options.mode || "full",
      stats: { ...aggregatedStats },
      results: [...allResults],
      timestamp: new Date().toISOString(),
    };
    onBatchProgress?.(i + 1, batches.length, partialResult);
  }

  return {
    success: aggregatedStats.totalErros === 0 || aggregatedStats.totalInseridos > 0,
    mode: options.mode || "full",
    stats: aggregatedStats,
    results: allResults,
    timestamp: new Date().toISOString(),
  };
}

async function singleIngestionCall(options: UnifiedIngestionOptions): Promise<UnifiedIngestionResult> {
  const { data, error } = await supabase.functions.invoke("ingest-legal", {
    body: {
      action: "datajud",
      tribunais: options.tribunais || ["stj", "tjrs", "tjsp"],
      diasAtras: options.diasAtras || 15,
      queryTema: options.queryTema,
      size: options.size || 30,
      enableJuit: options.enableJuit ?? true,
      temasJuit: options.temasJuit || TEMAS_JUIT_DISPONIVEIS.slice(0, 5),
      sizeJuit: options.sizeJuit || 15,
      generateEmbeddings: options.generateEmbeddings ?? true,
      mode: options.mode || "full",
    },
  });

  if (error) {
    return {
      success: false,
      mode: options.mode || "full",
      stats: { totalProcessados: 0, totalInseridos: 0, totalDuplicados: 0, totalErros: 1 },
      results: [],
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }

  return data as UnifiedIngestionResult;
}

// Alias para compatibilidade
export const ingestDataJud = ingestUnified;

/**
 * Busca estatísticas do vector store
 */
export async function getVectorStoreStats(): Promise<{
  total: number;
  bySource: Record<string, number>;
  byType: Record<string, number>;
  lastUpdated: string | null;
  duplicatesAvoided?: number;
}> {
  // Total de documentos
  const { count: total } = await supabase
    .from("legal_embeddings")
    .select("*", { count: "exact", head: true });

  // Agrupado por fonte
  const { data: sourceData } = await supabase
    .from("legal_embeddings")
    .select("source");
  
  const bySource: Record<string, number> = {};
  sourceData?.forEach((item) => {
    bySource[item.source] = (bySource[item.source] || 0) + 1;
  });

  // Agrupado por tipo
  const { data: typeData } = await supabase
    .from("legal_embeddings")
    .select("content_type");
  
  const byType: Record<string, number> = {};
  typeData?.forEach((item) => {
    byType[item.content_type] = (byType[item.content_type] || 0) + 1;
  });

  // Última atualização
  const { data: lastDoc } = await supabase
    .from("legal_embeddings")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return {
    total: total || 0,
    bySource,
    byType,
    lastUpdated: lastDoc?.created_at || null,
  };
}

/**
 * Busca documentos recentes do vector store
 */
export async function getRecentDocuments(limit: number = 20): Promise<Array<{
  id: string;
  title: string;
  source: string;
  source_label: string;
  content_type: string;
  published_date: string | null;
  created_at: string;
}>> {
  const { data } = await supabase
    .from("legal_embeddings")
    .select("id, title, source, source_label, content_type, published_date, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Limpa duplicatas antigas do vector store (manutenção)
 */
export async function cleanupDuplicates(): Promise<{ removed: number }> {
  return { removed: 0 };
}

// ═══════════════════════════════════════════════════════════════
// INGESTÃO DE CÓDIGOS LEGAIS (CP, CC, CLT)
// ═══════════════════════════════════════════════════════════════

export const CODIGOS_LEGAIS_DISPONIVEIS = [
  { id: "codigo_penal", nome: "Código Penal", sigla: "CP", area: "Penal" },
  { id: "codigo_civil", nome: "Código Civil", sigla: "CC", area: "Civil" },
  { id: "clt", nome: "CLT", sigla: "CLT", area: "Trabalhista" },
];

export interface CodigosIngestionResult {
  success: boolean;
  totalArtigos: number;
  totalJurisprudencia: number;
  totalDuplicados: number;
  totalErros: number;
  stats: Array<{
    codigo: string;
    sigla: string;
    artigosIngeridos: number;
    jurisprudenciaIngerida: number;
    duplicados: number;
    erros: string[];
  }>;
  timestamp: string;
}

export async function ingestCodigosLegais(options: {
  codigos?: string[];
  includeJurisprudencia?: boolean;
  jurisprudenciaSize?: number;
}): Promise<CodigosIngestionResult> {
  const { data, error } = await supabase.functions.invoke("ingest-legal", {
    body: {
      codigos: options.codigos || ["codigo_penal", "codigo_civil", "clt"],
      includeJurisprudencia: options.includeJurisprudencia ?? true,
      jurisprudenciaSize: options.jurisprudenciaSize || 3,
    },
  });

  if (error) {
    return {
      success: false,
      totalArtigos: 0,
      totalJurisprudencia: 0,
      totalDuplicados: 0,
      totalErros: 1,
      stats: [],
      timestamp: new Date().toISOString(),
    };
  }

  return data as CodigosIngestionResult;
}
