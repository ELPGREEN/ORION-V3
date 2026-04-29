import { IPentagonLayer, MemoryResult, PentagonContext, recordToolCall, completeToolCall } from "../types";
import { searchEpisodes, buildEpisodicContext } from "@/lib/neural/episodic-memory";
import { executeCorrectiveRAG } from "@/lib/neural/corrective-rag";

export class MemoryAdapter implements IPentagonLayer<any, MemoryResult> {
  public async process(perception: any, context: PentagonContext): Promise<MemoryResult> {
    console.log("[MEMORY] Initiating Parallel Data Flow with CRAG...");

    const memToolCall = recordToolCall(context, "retrieve_memory", { query: perception.rawInput });

    const [episodicResult, cragResult] = await Promise.allSettled([
      (async () => {
        const userId = (context.sharedState?.userId ?? context?.userId) as string | undefined;
        if (!userId) return { episodes: [], episodicContext: "" };
        try {
          const episodes = await searchEpisodes(perception.rawInput, userId, 3);
          const episodicContext = buildEpisodicContext(episodes);
          return { episodes, episodicContext };
        } catch (e) {
          console.warn("[MEMORY] Failed to retrieve episodic memory:", e);
          return { episodes: [], episodicContext: "" };
        }
      })(),

      executeCorrectiveRAG({
        query: perception.rawInput,
        context: "",
        userId: (context.sharedState?.userId ?? context?.userId) as string | undefined,
      }),
    ]);

    const episodes = episodicResult.status === "fulfilled"
      ? episodicResult.value.episodes
      : [];
    const episodicContext = episodicResult.status === "fulfilled"
      ? episodicResult.value.episodicContext
      : "";

    const cragData = cragResult.status === "fulfilled"
      ? cragResult.value
      : { grade: "incorrect" as const, confidence: 0, webSearchUsed: false, finalContext: "", originalContext: "", externalData: [] };

    const contextParts: string[] = [];
    if (episodicContext) contextParts.push(episodicContext);
    if (cragData.finalContext) contextParts.push(cragData.finalContext);
    let finalMergedContext = contextParts.join("\n\n");
    if (finalMergedContext.length > 3000) {
      finalMergedContext = finalMergedContext.slice(0, 2997) + "...";
    }

    const externalData = cragData.externalData || [];
    const ragSnippets: string[] = [];
    if (Array.isArray(externalData)) {
      for (const item of externalData.slice(0, 6) as any[]) {
        const text = typeof item === "string" ? item : (item?.content ?? item?.text ?? item?.snippet ?? "");
        if (text && text.length > 60) ragSnippets.push(String(text).slice(0, 500));
      }
    }
    if (ragSnippets.length === 0 && finalMergedContext) {
      const parts = finalMergedContext.split(/\n{2,}|\[\d+\]|---+/).map(s => s.trim()).filter(s => s.length > 80);
      ragSnippets.push(...parts.slice(0, 6));
    }

    completeToolCall(memToolCall, { episodes: episodes.length, ragSnippets: ragSnippets.length });
    context.accumulatedCost += 0.02;

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
