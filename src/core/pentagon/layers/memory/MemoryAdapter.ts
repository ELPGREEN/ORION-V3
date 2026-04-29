import { IPentagonLayer, MemoryResult } from "../types";
import { searchEpisodes, buildEpisodicContext } from "@/lib/neural/episodic-memory";
import { executeCorrectiveRAG } from "@/lib/neural/corrective-rag";

/**
 * ─── MemoryAdapter — Parallel Memory Fetching ───
 * 
 * Otimização: Busca episódica + CRAG rodam em paralelo via Promise.all
 * ao invés de sequencial. Redução estimada: -200ms por query.
 * 
 * Pipeline antigo (sequencial):
 *   searchEpisodes → buildEpisodicContext → executeCorrectiveRAG
 * 
 * Pipeline novo (paralelo):
 *   Promise.all([searchEpisodes, executeCorrectiveRAG]) → merge
 */
export class MemoryAdapter implements IPentagonLayer<any, MemoryResult> {
  public async process(perception: any, context: any): Promise<MemoryResult> {
    console.log("[MEMORY] Initiating Parallel Data Flow with CRAG...");

    // Executa busca episódica e CRAG em paralelo
    const [episodicResult, cragResult] = await Promise.allSettled([
      // Task 1: Busca de memória episódica (local + vector)
      (async () => {
        if (!context?.userId) return { episodes: [], episodicContext: "" };
        try {
          const episodes = await searchEpisodes(perception.rawInput, context.userId, 3);
          const episodicContext = buildEpisodicContext(episodes);
          return { episodes, episodicContext };
        } catch (e) {
          console.warn("[MEMORY] Failed to retrieve episodic memory:", e);
          return { episodes: [], episodicContext: "" };
        }
      })(),

      // Task 2: Corrective RAG (web search se necessário)
      // Nota: CRAG internamente também busca episódica, mas com contexto vazio
      // Passamos contexto vazio para evitar duplicação — fazemos merge depois
      executeCorrectiveRAG({
        query: perception.rawInput,
        context: "", // Contexto vazio — merge feito aqui
        userId: context?.userId,
      }),
    ]);

    // Extract episodic data
    const episodes = episodicResult.status === "fulfilled"
      ? episodicResult.value.episodes
      : [];
    const episodicContext = episodicResult.status === "fulfilled"
      ? episodicResult.value.episodicContext
      : "";

    // Extract CRAG data
    const cragData = cragResult.status === "fulfilled"
      ? cragResult.value
      : { grade: "incorrect" as const, confidence: 0, webSearchUsed: false, finalContext: "", originalContext: "", externalData: [] };

    // Merge: episodic context + external data from CRAG
    const contextParts: string[] = [];
    if (episodicContext) contextParts.push(episodicContext);
    if (cragData.finalContext) contextParts.push(cragData.finalContext);
    const finalMergedContext = contextParts.join("\n\n");

    // Extract RAG snippets for direct citation
    const externalData = cragData.externalData || [];
    const ragSnippets: string[] = [];
    if (Array.isArray(externalData)) {
      for (const item of externalData.slice(0, 6) as any[]) {
        const text = typeof item === "string" ? item : (item?.content ?? item?.text ?? item?.snippet ?? "");
        if (text && text.length > 60) ragSnippets.push(String(text).slice(0, 800));
      }
    }
    if (ragSnippets.length === 0 && finalMergedContext) {
      const parts = finalMergedContext.split(/\n{2,}|\[\d+\]|---+/).map(s => s.trim()).filter(s => s.length > 80);
      ragSnippets.push(...parts.slice(0, 6));
    }

    return {
      shortTerm: [],
      longTerm: externalData,
      episodic: episodes,
      mergedContext: finalMergedContext,
      ragSnippets,
    };
  }

  public async learn(state: any) {
    console.log("[MEMORY] Learning phase: Consolidation of breakthrough patterns.");
  }
}
