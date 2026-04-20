import { describe, it, expect } from "vitest";
import { activateRAGConsciousness, detectSymbolicPattern, adaptFromEvaluation, getConsciousnessDiagnostics, getConsciousness, type RAGPattern } from "../rag-consciousness";
import { recordLearningOutcome, createMetaLearningState, evaluateStrategyEffectiveness, type MetaLearningState, type LearningStrategy } from "../meta-learning";
import { quantumRouteQuery } from "../quantum-llm-router";
import { createDefaultAgents } from "../multi-agent";

describe("ARC-AGI Integration Tests", () => {
  
  it("should activate RAG Consciousness", () => {
    const result = activateRAGConsciousness(
      "Art. 5 da Constituição",
      ["Artigo 5 - Garantias...", "Lei 9099/95"],
      { semantic: 0.4, keyword: 0.3, authority: 0.2, recency: 0.1 },
      { queryType: "legal", sessionHistory: [], recentEvals: [], timeOfDay: "morning" }
    );
    expect(result).toBeDefined();
    console.log("✅ RAG Consciousness activated:", result.consciousness.state);
  });

  it("should detect legal patterns in queries", () => {
    const query = "Art. 5 da Constituição";
    const chunks = ["Artigo 5 da Constituição garante...", "Lei 9099/95 CPC"];
    
    const pattern = detectSymbolicPattern(query, chunks);
    expect(pattern).toBeDefined();
    expect(pattern?.pattern).toBe("legal_reference");
    console.log("✅ Pattern detected:", pattern?.pattern);
  });

  it("should adapt from evaluation feedback", () => {
    adaptFromEvaluation({
      queryId: "test-123",
      overallScore: 85,
      relevance: { score: 4, details: "" },
      groundedness: { score: 4, details: "" },
      completeness: { score: 4, details: "" },
      coherence: { score: 4, details: "" },
      helpfulness: { score: 4, details: "" },
    });
    
    const consciousness = getConsciousness();
    expect(consciousness).toBeDefined();
    console.log("✅ Adaptation score:", consciousness.adaptationScore);
  });

  it("should get consciousness diagnostics", () => {
    const diag = getConsciousnessDiagnostics();
    expect(diag).toBeDefined();
    console.log("✅ Diagnostics:", diag.state, "- Patterns:", diag.patternCount);
  });

  it("should integrate with Quantum Router", () => {
    // Route a query through quantum router
    const routeResult = quantumRouteQuery("Qual o artigo 5?");
    expect(routeResult.selectedProvider).toBeDefined();
    console.log("✅ Quantum Router → Provider:", routeResult.selectedProvider.name);
  });

  it("should integrate RAG with agents", () => {
    const agents = createDefaultAgents();
    expect(agents.length).toBe(11);
    
    // Find the pesquisa agent (research)
    const pesquisaAgent = agents.find(a => a.role === "pesquisa");
    expect(pesquisaAgent).toBeDefined();
    console.log("✅ Agent:", pesquisaAgent?.role, "- Tools:", pesquisaAgent?.tools.length);
  });

  it("should record learning outcomes", () => {
    let state = createMetaLearningState();
    state = recordLearningOutcome(
      state,
      "strat_text_cot",
      "legal_query",
      "success",
      1200,
      "Melhorou com chain-of-thought"
    );
    
    expect(state.strategies[0].totalAttempts).toBe(1);
    console.log("✅ Learning outcome recorded");
  });

  it("should have meta-learning state", () => {
    const state = createMetaLearningState();
    expect(state).toBeDefined();
    console.log("✅ Meta-learning active - Strategies:", state.strategies.length);
  });

  it("should complete full ARC-AGI loop", async () => {
    // 1. Query
    const query = "Direito Penal - furto qualificado";
    
    // 2. Detect pattern
    const pattern = detectSymbolicPattern(query, ["Art. 155 do CP - furto...", "Código Penal"]);
    console.log("1. Pattern:", pattern?.pattern);
    
    // 3. Route with Quantum
    const route = quantumRouteQuery(query);
    console.log("2. Route to:", route.selectedProvider.name);
    
    // 4. Activate RAG
    const rag = activateRAGConsciousness(
      query,
      ["Art. 155 do CP..."],
      { semantic: 0.4, keyword: 0.3, authority: 0.2, recency: 0.1 },
      { queryType: "legal", sessionHistory: [], recentEvals: [], timeOfDay: "morning" }
    );
    console.log("3. RAG State:", rag.consciousness.state);
    
    // 5. Get agents
    const agents = createDefaultAgents();
    console.log("4. Agents:", agents.length);
    
    // 6. Meta-learning
    const state = createMetaLearningState();
    console.log("5. Meta-learning:", state.strategies.length, "strategies");
    
    console.log("✅ ARC-AGI Loop COMPLETO!");
  });
});