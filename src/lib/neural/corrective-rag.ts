/**
 * ─── Corrective RAG (CRAG) ───
 * Implementa a lógica de auto-correção para sistemas de recuperação:
 * 1. Avalia a relevância dos documentos recuperados em relação à pergunta.
 * 2. Aciona busca na web (Firecrawl) se o conhecimento interno for insuficiente.
 * 3. Garante que a resposta final seja fundamentada em dados reais e atualizados.
 */

import { supabase } from "@/integrations/supabase/client";
import { evaluateRAGResponse } from "./rag-evaluator";

export type RetrievalGrade = "correct" | "ambiguous" | "incorrect";

export interface CRAGResult {
  grade: RetrievalGrade;
  confidence: number;
  webSearchUsed: boolean;
  finalContext: string;
  originalContext: string;
  externalData?: unknown[];
}

/**
 * Avalia se o contexto recuperado é suficiente para responder à pergunta.
 */
export function gradeRetrieval(query: string, context: string): { grade: RetrievalGrade; confidence: number } {
  if (!context || context.trim().length < 50) {
    return { grade: "incorrect", confidence: 0.1 };
  }

  const queryLower = query.toLowerCase();
  const contextLower = context.toLowerCase();

  // Extração de termos chave simplificada
  const keywords = queryLower.split(/\s+/).filter(w => w.length > 3);
  let matchCount = 0;

  for (const word of keywords) {
    if (contextLower.includes(word)) matchCount++;
  }

  const matchRatio = matchCount / Math.max(keywords.length, 1);

  if (matchRatio > 0.6) return { grade: "correct", confidence: matchRatio };
  if (matchRatio > 0.2) return { grade: "ambiguous", confidence: matchRatio };
  return { grade: "incorrect", confidence: matchRatio };
}

/**
 * Executa o fluxo de Corrective RAG.
 */
export async function executeCorrectiveRAG(params: {
  query: string;
  context: string;
  forceWebSearch?: boolean;
}): Promise<CRAGResult> {
  const { query, context, forceWebSearch = false } = params;

  const { grade, confidence } = gradeRetrieval(query, context);

  let finalContext = context;
  let webSearchUsed = false;
  let externalData: unknown[] = [];

  // Se o contexto for insuficiente ou busca web for forçada
  if (grade === "incorrect" || grade === "ambiguous" || forceWebSearch) {
    console.log(`[CRAG] Grade: ${grade} (${confidence.toFixed(2)}). Iniciando busca externa...`);

    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-search", {
        body: { query, limit: 3 }
      });

      if (!error && data?.results) {
        webSearchUsed = true;
        externalData = data.results;

        const webContext = data.results
          .map((r: { url: string; content?: string; markdown?: string; description?: string }) => `[Fonte Web: ${r.url}]\n${r.content || r.markdown || r.description}`)
          .join("\n\n");

        if (grade === "incorrect") {
          finalContext = `--- RESULTADOS DA WEB (Busca Corretiva) ---\n${webContext}`;
        } else {
          finalContext = `--- CONTEXTO INTERNO ---\n${context}\n\n--- RESULTADOS DA WEB ---\n${webContext}`;
        }
      }
    } catch (e) {
      console.warn("[CRAG] Erro na busca externa:", e);
    }
  }

  return {
    grade,
    confidence,
    webSearchUsed,
    finalContext,
    originalContext: context,
    externalData
  };
}
