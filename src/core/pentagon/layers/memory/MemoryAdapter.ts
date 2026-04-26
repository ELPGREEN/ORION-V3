import { IPentagonLayer, MemoryResult } from "../types";
import { searchEpisodes, buildEpisodicContext } from "@/lib/neural/episodic-memory";
import { executeCorrectiveRAG } from "@/lib/neural/corrective-rag";

export class MemoryAdapter implements IPentagonLayer<any, MemoryResult> {
  public async process(perception: any, context: any): Promise<MemoryResult> {
    console.log("[MEMORY] Initiating Data Flow with CRAG...");

    let episodicContext = "";
    let episodes: any[] = [];
    let finalMergedContext = "";

    // 1. Busca inicial de memória episódica
    if (context?.userId) {
      try {
        episodes = await searchEpisodes(perception.rawInput, context.userId, 3);
        episodicContext = buildEpisodicContext(episodes);
      } catch (e) {
        console.warn("[MEMORY] Failed to retrieve episodic memory:", e);
      }
    }

    // 2. Integração com Corrective RAG (CRAG)
    // Se a memória interna for insuficiente ou ambígua, o CRAG busca fontes externas
    const cragResult = await executeCorrectiveRAG({
      query: perception.rawInput,
      context: episodicContext,
      userId: context?.userId
    });

    finalMergedContext = cragResult.finalContext;

    return {
      shortTerm: [],
      longTerm: cragResult.externalData || [], // Dados externos via CRAG
      episodic: episodes,
      mergedContext: finalMergedContext
    };
  }

  public async learn(state: any) {
    console.log("[MEMORY] Learning phase: Consolidation of breakthrough patterns.");
    // Aqui poderia integrar com memory-consolidation.ts
  }
}
