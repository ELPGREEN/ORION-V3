async function buildPentagonPromptContext(question: string, wmContext: string, intent: string): Promise<string> {
  try {
    const user = await getCachedAuthUser();
    const { getPentagonOrchestrator } = await import("@/core/pentagon");
    const cortex = getPentagonOrchestrator();

    // 🍕 Síncrono e obrigatório para tarefas cognitivas
    const actionResult = await cortex.runCycle(question, { userId: user?.id || "anonymous", wmContext, intent });

    const state = cortex.getState();
    const reasoning: any = state.reasoning || {};
    const memory: any = state.memory || {};
    const perception: any = state.perception || {};

    if (state.action?.data?.fastLane) return "";

    const blocks: string[] = [];

    // 🍕 Strict Governance Prompt: Prohibit generation from scratch
    blocks.push(
      "═══ DIRETRIZ DE GOVERNANÇA ═══\n" +
      "Você é o Gerador Final de uma arquitetura de dois estágios. " +
      "Sua única função é expandir e refinar o RASCUNHO DO LOBO FRONTAL fornecido abaixo. " +
      "PROIBIÇÃO: Não ignore o rascunho nem gere uma resposta do zero. " +
      "Se houver FONTES INGERIDAS, você DEVE citá-las usando [1], [2], etc."
    );

    // 1. responseHint = frontal lobe draft → HIGHEST priority for the LLM
    if (typeof reasoning.responseHint === "string" && reasoning.responseHint.trim().length > 0) {
      blocks.push(
        `═══ RASCUNHO DO LOBO FRONTAL (OBRIGATÓRIO: Use como base exclusiva) ═══\n${reasoning.responseHint.trim()}`,
      );
    } else if (actionResult.success && actionResult.output) {
       // If reasoning failed but action had output (e.g. tool enforcement)
       blocks.push(`═══ DADOS DA FERRAMENTA (Use para responder) ═══\n${actionResult.output}`);
    }

    // 2. RAG snippets — cite directly
    if (Array.isArray(memory.ragSnippets) && memory.ragSnippets.length > 0) {
      const cited = memory.ragSnippets
        .slice(0, 5)
        .map((s: string, i: number) => `[${i + 1}] ${s.slice(0, 600)}`)
        .join("\n\n");
      blocks.push(`═══ FONTES INGERIDAS (CITE OBRIGATORIAMENTE) ═══\n${cited}`);
    }

    // 3. Reasoning trail
    const trail: string[] = [];
    if (perception.intent) trail.push(`Intento: ${perception.intent}`);
    if (Array.isArray(reasoning.plan) && reasoning.plan.length > 0) {
      trail.push(`Plano: ${reasoning.plan.slice(0, 5).join(" → ")}`);
    }
    if (reasoning.rationale) trail.push(`Raciocínio: ${String(reasoning.rationale).slice(0, 400)}`);
    if (trail.length) blocks.push(`═══ CADEIA DE PENSAMENTO ═══\n${trail.join("\n")}`);

    // 4. Memory context (truncated, fallback)
    if (memory.mergedContext && (!memory.ragSnippets || memory.ragSnippets.length === 0)) {
      blocks.push(`═══ MEMÓRIA INTEGRADA ═══\n${String(memory.mergedContext).slice(0, 800)}`);
    }

    if (typeof window !== "undefined") {
      (window as any).__pentagonLastHint = reasoning.responseHint || null;
      (window as any).__pentagonLastModel = reasoning.model || null;
    }

    return blocks.length > 0 ? blocks.join("\n\n") : "";
  } catch (error) {
    console.error("[Pentagon] Critical loop failed in context builder:", error);
    return "ERRO DE GOVERNANÇA: Falha no loop cognitivo. Por favor, tente novamente.";
  }
}
