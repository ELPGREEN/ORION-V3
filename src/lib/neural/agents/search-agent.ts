/**
 * ─── Agentic Search Agent (Agentic RAG) ───
 * Um agente especializado em busca complexa e auto-correção.
 * Implementa o ciclo: Planejar -> Buscar -> Avaliar -> Criticar -> Refinar.
 *
 * Nível 3 da evolução RAG: O sistema é um tomador de decisão.
 */

import { executeCorrectiveRAG, type CRAGResult } from "../corrective-rag";
import { evaluateRAGResponse } from "../rag-evaluator";
import { supabase } from "@/integrations/supabase/client";

export interface SearchPlan {
  query: string;
  steps: string[];
  iterations: number;
  maxIterations: number;
  confidenceThreshold: number;
}

export interface AgenticSearchResponse {
  content: string;
  iterations: number;
  finalScore: number;
  sources: string[];
  webSearchUsed: boolean;
  reasoningChain: string[];
}

/**
 * Agente de Busca Agentica
 */
export class SearchAgent {
  private reasoningChain: string[] = [];
  private iterations = 0;
  private maxIterations = 3;
  private confidenceThreshold = 0.75;

  constructor(maxIterations = 3, threshold = 0.75) {
    this.maxIterations = maxIterations;
    this.confidenceThreshold = threshold;
  }

  /**
   * Executa uma busca agentica completa.
   */
  async search(query: string, initialContext: string): Promise<AgenticSearchResponse> {
    this.reasoningChain = [];
    this.iterations = 0;

    let currentContext = initialContext;
    let finalResponse = "";
    let finalScore = 0;
    let webSearchUsed = false;
    const sources = new Set<string>();

    this.reasoningChain.push(`[Início] Processando consulta complexa: "${query}"`);

    while (this.iterations < this.maxIterations) {
      this.iterations++;
      this.reasoningChain.push(`[Iteração ${this.iterations}] Planejando resposta com contexto atual...`);

      // 1. Executa Corrective RAG para garantir qualidade do contexto
      const cragResult = await executeCorrectiveRAG({
        query,
        context: currentContext,
        forceWebSearch: this.iterations > 1 // Força web search se a primeira iteração falhou no auto-critique
      });

      if (cragResult.webSearchUsed) webSearchUsed = true;
      currentContext = cragResult.finalContext;

      // 2. Gera resposta preliminar (via orquestrador ou modelo local se disponível)
      // Aqui usamos o ai-orchestrator via Edge Function para a "cabeça" do agente
      const response = await this.generateResponse(query, currentContext);

      // 3. Auto-Avaliação (Self-RAG)
      const evaluation = evaluateRAGResponse({
        response,
        question: query,
        context: currentContext
      });

      finalScore = evaluation.overallScore / 100;
      this.reasoningChain.push(`[Avaliação] Score: ${(finalScore * 100).toFixed(0)}%. Grau: ${evaluation.grade}`);

      if (finalScore >= this.confidenceThreshold) {
        this.reasoningChain.push(`[Sucesso] Limiar de confiança atingido. Finalizando.`);
        finalResponse = response;
        break;
      }

      // 4. Crítica e Refinamento
      this.reasoningChain.push(`[Crítica] Resposta insuficiente. Falhas detectadas: ${evaluation.groundedness.explanation}`);
      this.reasoningChain.push(`[Ação] Refinando busca e expandindo contexto para próxima iteração.`);

      // Se tivermos alucinações ou falta de cobertura, tentamos extrair novos termos de busca
      const newQuery = await this.refineQuery(query, response, evaluation);
      query = newQuery;

      finalResponse = response; // Mantém a última melhor resposta caso exceda iterações
    }

    return {
      content: finalResponse,
      iterations: this.iterations,
      finalScore,
      sources: Array.from(sources),
      webSearchUsed,
      reasoningChain: this.reasoningChain
    };
  }

  /**
   * Gera uma resposta usando o modelo de IA.
   */
  private async generateResponse(query: string, context: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
      body: {
        prompt: query,
        documentContext: context,
        modelType: "analysis",
        systemPrompt: "Você é um Agente de Busca Agentica. Use o contexto fornecido para responder com precisão. Se o contexto for insuficiente, admita."
      }
    });

    if (error) throw new Error(`Erro ao gerar resposta do agente: ${error.message}`);
    return data.content || "";
  }

  /**
   * Refina a query baseado nas falhas da resposta anterior.
   */
  private async refineQuery(originalQuery: string, lastResponse: string, evalResult: any): Promise<string> {
    // Lógica simplificada: adiciona termos de erro à busca
    // Em uma implementação real, pediríamos ao LLM para gerar uma nova query de busca
    return `${originalQuery} detalhes sobre ${evalResult.retrievalQuality.hallucinations.join(" ")}`;
  }
}
