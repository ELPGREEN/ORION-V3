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

    // Extract individual RAG snippets for direct citation by the frontal lobe
    const ragSnippets: string[] = [];
    if (Array.isArray(cragResult.externalData)) {
      for (const item of cragResult.externalData.slice(0, 6) as any[]) {
        const text = typeof item === "string" ? item : (item?.content ?? item?.text ?? item?.snippet ?? "");
        if (text && text.length > 60) ragSnippets.push(String(text).slice(0, 800));
      }
    }
    if (ragSnippets.length === 0 && finalMergedContext) {
      // Fallback: split merged context
      const parts = finalMergedContext.split(/\n{2,}|\[\d+\]|---+/).map(s => s.trim()).filter(s => s.length > 80);
      ragSnippets.push(...parts.slice(0, 6));
    }

    return {
      shortTerm: [],
      longTerm: cragResult.externalData || [],
      episodic: episodes,
      mergedContext: finalMergedContext,
      ragSnippets,
    };
  }

  public async learn(state: any) {
    console.log("[MEMORY] Learning phase: Consolidation of breakthrough patterns.");
    // Aqui poderia integrar com memory-consolidation.ts
  }
}
