/**
 * ─── Corrective RAG (CRAG) — Maestro Edition ───
 * Implementa a lógica de auto-correção para sistemas de recuperação.
 * Garante que o contexto original não seja perdido mesmo se a busca web falhar.
 */
import { supabase } from "@/integrations/supabase/client";
import { searchEpisodes, buildEpisodicContext } from "./episodic-memory";

export type RetrievalGrade = "correct" | "ambiguous" | "incorrect";

export interface CRAGResult {
  grade: RetrievalGrade;
  confidence: number;
  webSearchUsed: boolean;
  finalContext: string;
  originalContext: string;
  episodicContext?: string;
  externalData?: unknown[];
}

export function gradeRetrieval(query: string, context: string): { grade: RetrievalGrade; confidence: number } {
  if (!context || context.trim().length < 50) return { grade: "incorrect", confidence: 0.1 };
  const queryLower = query.toLowerCase();
  const contextLower = context.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(w => w.length > 3 && !["sobre", "para", "como", "mais"].includes(w));
  let matchCount = 0;
  for (const word of keywords) { if (contextLower.includes(word)) matchCount++; }
  const matchRatio = matchCount / Math.max(keywords.length, 1);
  const hasLegalMarkers = /\b(art\.?|lei|inciso|parágrafo|§|tribunal|jurisprudência)\b/i.test(contextLower);
  const structuralScore = hasLegalMarkers ? 0.2 : 0;
  const confidence = Math.min(1.0, matchRatio + structuralScore);
  if (confidence > 0.7) return { grade: "correct", confidence };
  if (confidence > 0.3) return { grade: "ambiguous", confidence };
  return { grade: "incorrect", confidence };
}

export async function executeCorrectiveRAG(params: {
  query: string; context: string; userId?: string; forceWebSearch?: boolean;
}): Promise<CRAGResult> {
  const { query, context, userId, forceWebSearch = false } = params;
  const { grade, confidence } = gradeRetrieval(query, context);
  let finalContext = context;
  let webSearchUsed = false;
  let externalData: unknown[] = [];
  let episodicContext = "";

  if (userId) {
    try {
      const episodes = await searchEpisodes(query, userId, 3);
      episodicContext = buildEpisodicContext(episodes);
    } catch (e) { console.warn("[CRAG] Erro ao buscar memória episódica:", e); }
  }

  if (grade === "incorrect" || grade === "ambiguous" || forceWebSearch) {
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-search", { body: { query, limit: 3 } });
      if (!error && data?.results && data.results.length > 0) {
        webSearchUsed = true;
        externalData = data.results;
        const webContext = data.results
          .map((r: any) => `[Fonte Web: ${r.url}]\n${r.content || r.markdown || r.description}`)
          .join("\n\n");
        // Maintain original context as backup even if incorrect
        finalContext = `${context}\n\n--- RESULTADOS ADICIONAIS DA WEB ---\n${webContext}`;
      }
    } catch (e) { console.warn("[CRAG] Erro na busca externa:", e); }
  }

  if (episodicContext) finalContext = `${episodicContext}\n\n${finalContext}`;
  return { grade, confidence, webSearchUsed, finalContext, originalContext: context, episodicContext, externalData };
}
