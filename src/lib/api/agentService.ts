import { supabase } from "@/integrations/supabase/client";
import { withCircuitBreaker } from "@/lib/circuit-breaker";
import { onAgentTaskComplete, getSmartRouting, getAgentMetrics } from "@/lib/neural/neural-agent-bridge";

// ─── Inline Multi-Agent Framework (formerly multi-agent-framework.ts) ───

type AgentRole = "leitura" | "construcao" | "pesquisa";

export interface AgentTrace {
  traceId: string;
  spans: Array<{
    id: string;
    role: AgentRole;
    operation: string;
    startedAt: string;
    endedAt?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  }>;
  startedAt: string;
}

export interface OrchestratorPlan {
  intent: string;
  steps: string[];
  status: "planning" | "executing" | "completed" | "failed";
  completedAt?: string;
}

interface IntentClassification {
  primaryAgent: AgentRole;
  confidence: number;
  strategy: "single" | "sequential" | "parallel";
}

function classifyIntent(query: string, hasDocument: boolean): IntentClassification {
  const lower = query.toLowerCase();
  if (lower.match(/gerar|criar|elaborar|redigir|componente|função|sql|migração/)) {
    return { primaryAgent: "construcao", confidence: 0.85, strategy: "single" };
  }
  if (hasDocument || lower.match(/analis|revis|ler|quantos|banco|dados|tabela|schema/)) {
    return { primaryAgent: "leitura", confidence: 0.8, strategy: "single" };
  }
  return { primaryAgent: "pesquisa", confidence: 0.75, strategy: "single" };
}

function createExecutionPlan(query: string, intent: IntentClassification): OrchestratorPlan {
  return {
    intent: intent.primaryAgent,
    steps: [`Execute ${intent.primaryAgent} agent`],
    status: "planning",
  };
}

function createTrace(traceId: string): AgentTrace {
  return { traceId, spans: [], startedAt: new Date().toISOString() };
}

function addSpan(trace: AgentTrace, role: AgentRole, operation: string): string {
  const id = `span_${trace.spans.length}`;
  trace.spans.push({ id, role, operation, startedAt: new Date().toISOString() });
  return id;
}

function endSpan(trace: AgentTrace, spanId: string, status: string, metadata?: Record<string, unknown>) {
  const span = trace.spans.find((s) => s.id === spanId);
  if (span) {
    span.endedAt = new Date().toISOString();
    span.status = status;
    span.metadata = metadata;
  }
}

// ─── Agent Types ───
export type AgentEndpoint = "agente-leitura" | "agente-construcao" | "agente-pesquisa";

export type LeituraAction = "analyze_code" | "read_file" | "parse_logs" | "read_document" | "query_database" | "analyze_schema";
export type ConstrucaoAction = "generate_component" | "generate_edge_function" | "generate_sql" | "generate_document" | "propose_changes" | "review_proposal";
export type PesquisaAction = "web_search" | "legal_search" | "doc_search" | "knowledge_search" | "research_plan" | "legislation_search" | "economic_data";

export interface AgentResponse {
  success: boolean;
  action: string;
  analysis?: string;
  proposal?: {
    id: string;
    type: string;
    description: string;
    code: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
  };
  message?: string;
  raw_results?: unknown[];
  results_count?: number;
  error?: string;
  // v20: Extended
  traceId?: string;
  latencyMs?: number;
  agentUsed?: string;
}

// ─── Invoke Helpers ───
async function invokeAgent(
  endpoint: AgentEndpoint,
  action: string,
  params: Record<string, unknown>,
  trace?: AgentTrace
): Promise<AgentResponse> {
  const startTime = Date.now();
  let spanId: string | undefined;

  const agentRole = endpoint === "agente-leitura" ? "leitura"
    : endpoint === "agente-pesquisa" ? "pesquisa"
    : "construcao";

  if (trace) {
    spanId = addSpan(trace, agentRole, `${endpoint}/${action}`);
  }

  try {
    const data = await withCircuitBreaker(
      endpoint,
      async () => {
        // Fallback for agente-construcao which is missing
        const targetEndpoint = endpoint === "agente-construcao" ? "ai-orchestrator" : endpoint;
        const body: Record<string, any> = { action, params };
        if (endpoint === "agente-construcao") {
          body.useCase = "documents";
        }

        const { data, error } = await supabase.functions.invoke(targetEndpoint as any, {
          body,
        });
        if (error) throw error;
        return data;
      },
      1, // 1 retry
      1000, // 1s backoff
    );

    const latencyMs = Date.now() - startTime;
    if (trace && spanId) endSpan(trace, spanId, "ok", { latencyMs });

    const response = data as AgentResponse;
    response.latencyMs = latencyMs;
    response.agentUsed = endpoint;

    // Neural Bridge: STDP learning + agent evaluation
    onAgentTaskComplete(agentRole, response.success !== false, latencyMs);

    return response;
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    if (trace && spanId) endSpan(trace, spanId, "error", { error: err?.message, latencyMs });
    console.warn(`[Agent] ${endpoint}/${action} failed after retries:`, err?.message);

    // Neural Bridge: record failure
    onAgentTaskComplete(agentRole, false, latencyMs);

    return { success: false, action, error: err?.message || "Agent unavailable", latencyMs, agentUsed: endpoint };
  }
}

// ─── Agente Leitura ───
export const agenteLeitura = {
  analyzeCode: (code: string, language?: string, focus?: string, trace?: AgentTrace) =>
    invokeAgent("agente-leitura", "analyze_code", { code, language, focus }, trace),

  readFile: (content: string, filename?: string, purpose?: string, trace?: AgentTrace) =>
    invokeAgent("agente-leitura", "read_file", { content, filename, purpose }, trace),

  parseLogs: (logs: string, context?: string, trace?: AgentTrace) =>
    invokeAgent("agente-leitura", "parse_logs", { logs, context }, trace),

  readDocument: (documentId: string, trace?: AgentTrace) =>
    invokeAgent("agente-leitura", "read_document", { document_id: documentId }, trace),

  queryDatabase: (table: string, question?: string, filters?: Record<string, unknown>, trace?: AgentTrace) =>
    invokeAgent("agente-leitura", "query_database", { table, question, filters }, trace),

  analyzeSchema: (table?: string, trace?: AgentTrace) =>
    invokeAgent("agente-leitura", "analyze_schema", { table }, trace),
};

// ─── Agente Construção ───
export const agenteConstrucao = {
  generateComponent: (description: string, framework?: string, style?: string, trace?: AgentTrace) =>
    invokeAgent("agente-construcao", "generate_component", { description, framework, style }, trace),

  generateEdgeFunction: (name: string, description: string, endpoints?: string[], trace?: AgentTrace) =>
    invokeAgent("agente-construcao", "generate_edge_function", { name, description, endpoints }, trace),

  generateSQL: (description: string, operation?: "migration" | "query" | "function" | "policy", trace?: AgentTrace) =>
    invokeAgent("agente-construcao", "generate_sql", { description, operation }, trace),

  generateDocument: (documentType: string, title: string, context?: string, areaJuridica?: string, trace?: AgentTrace) =>
    invokeAgent("agente-construcao", "generate_document", { document_type: documentType, title, context, area_juridica: areaJuridica }, trace),

  proposeChanges: (fileContent: string, changesDescription: string, trace?: AgentTrace) =>
    invokeAgent("agente-construcao", "propose_changes", { file_content: fileContent, changes_description: changesDescription }, trace),

  reviewProposal: (proposalId: string, decision: "approved" | "rejected", notes?: string, trace?: AgentTrace) =>
    invokeAgent("agente-construcao", "review_proposal", { proposal_id: proposalId, decision, notes }, trace),
};

// ─── Agente Pesquisa ───
export const agentePesquisa = {
  webSearch: (query: string, lang?: string, domainFilter?: string[], trace?: AgentTrace) =>
    invokeAgent("agente-pesquisa", "web_search", { query, lang, domain_filter: domainFilter }, trace),

  legalSearch: (query: string, sources?: string[], courtFilter?: string, dateFrom?: string, trace?: AgentTrace) =>
    invokeAgent("agente-pesquisa", "legal_search", { query, sources, court_filter: courtFilter, date_from: dateFrom }, trace),

  docSearch: (query: string, documentType?: string, status?: string, trace?: AgentTrace) =>
    invokeAgent("agente-pesquisa", "doc_search", { query, document_type: documentType, status }, trace),

  knowledgeSearch: (query: string, sourceType?: string, trace?: AgentTrace) =>
    invokeAgent("agente-pesquisa", "knowledge_search", { query, source_type: sourceType }, trace),

  researchPlan: (topic: string, depth?: "quick" | "standard" | "deep", objectives?: string[], trace?: AgentTrace) =>
    invokeAgent("agente-pesquisa", "research_plan", { topic, depth, objectives }, trace),

  legislationSearch: (query: string, tipoProposicao?: string, tribunal?: string, trace?: AgentTrace) =>
    invokeAgent("agente-pesquisa", "legislation_search", { query, tipo_proposicao: tipoProposicao, tribunal }, trace),

  economicData: (query: string, trace?: AgentTrace) =>
    invokeAgent("agente-pesquisa", "economic_data", { query }, trace),
};

// ─── Smart Router v2 (Multi-Agent Aware) ───
export async function smartAgentRoute(
  query: string,
  documentContent?: string,
  documentType?: string,
  documentId?: string,
  forceAgent?: "leitura" | "construcao" | "pesquisa"
): Promise<AgentResponse & { plan?: OrchestratorPlan; trace?: AgentTrace }> {
  const trace = createTrace(crypto.randomUUID());
  const routeSpan = addSpan(trace, "pesquisa", "smart_route_v2");

  // v20: Use multi-agent intent classification
  const intent = classifyIntent(query, !!documentContent);
  
  // v22: If the user explicitly selected an agent, override the classification
  if (forceAgent) {
    intent.primaryAgent = forceAgent;
    intent.confidence = 1.0;
  }

  // v23: Enrich routing with STDP neural weights
  const partners = getSmartRouting(intent.primaryAgent);
  const primaryMetrics = getAgentMetrics(intent.primaryAgent);
  if (primaryMetrics) {
    // Boost confidence if STDP shows strong partner bindings
    const avgPartnerWeight = partners.reduce((s, p) => s + p.weight, 0) / Math.max(partners.length, 1);
    intent.confidence = Math.min(1, intent.confidence + avgPartnerWeight * 0.1);
  }
  
  const plan = createExecutionPlan(query, intent);
  plan.status = "executing";

  const lowerQuery = query.toLowerCase();

  let result: AgentResponse;

  // Route to primary agent based on classified intent
  switch (intent.primaryAgent) {
    case "pesquisa": {
      if (lowerQuery.match(/jurisprud|súmula|tribunal|stf|stj|artigo|lei /)) {
        result = await agentePesquisa.legalSearch(query, undefined, undefined, undefined, trace);
      } else if (lowerQuery.match(/web|internet|google|site/)) {
        result = await agentePesquisa.webSearch(query, undefined, undefined, trace);
      } else if (lowerQuery.match(/knowledge|base|conhecimento/)) {
        result = await agentePesquisa.knowledgeSearch(query, "legal", trace);
      } else if (lowerQuery.match(/plano|pesquisa detalhada|pesquisa profunda/)) {
        result = await agentePesquisa.researchPlan(query, "standard", undefined, trace);
      } else {
        // Default: legal search is the most useful for a legal platform
        result = await agentePesquisa.legalSearch(query, undefined, undefined, undefined, trace);
      }
      break;
    }

    case "leitura": {
      if (lowerQuery.match(/quantos|banco|dados|tabela|registros|processos ativos|clientes/)) {
        const tableMatch = lowerQuery.match(/processo|cliente|tarefa|documento|consulta|fatura/);
        const tableMap: Record<string, string> = {
          processo: "processos",
          cliente: "client_profiles",
          tarefa: "tarefas",
          documento: "documents",
          consulta: "consultas",
          fatura: "invoices",
        };
        const table = tableMatch ? tableMap[tableMatch[0]] || "processos" : "processos";
        result = await agenteLeitura.queryDatabase(table, query, undefined, trace);
      } else if (documentId) {
        result = await agenteLeitura.readDocument(documentId, trace);
      } else if (documentContent) {
        // Analyze the document content directly via readFile — pass user query as purpose
        result = await agenteLeitura.readFile(
          documentContent, 
          `${documentType || "documento"}.html`, 
          query, // Pass user's question as the analysis purpose
          trace
        );
      } else {
        // Fallback: try to analyze code/schema if query suggests it
        if (lowerQuery.match(/schema|estrutura|tipos|colunas/)) {
          result = await agenteLeitura.analyzeSchema(undefined, trace);
        } else {
          // Last resort: use pesquisa as knowledge source
          result = await agentePesquisa.knowledgeSearch(query, "legal", trace);
        }
      }
      break;
    }

    case "construcao": {
      if (lowerQuery.match(/componente|botão|interface|tela|formulário/)) {
        result = await agenteConstrucao.generateComponent(query, undefined, undefined, trace);
      } else if (lowerQuery.match(/função|edge|api|endpoint/)) {
        result = await agenteConstrucao.generateEdgeFunction("custom-function", query, undefined, trace);
      } else if (lowerQuery.match(/sql|migração|tabela|coluna|index/)) {
        result = await agenteConstrucao.generateSQL(query, undefined, trace);
      } else if (lowerQuery.match(/documento|petição|contrato|parecer|recurso|gerar|criar|elaborar|redigir/)) {
        // For document generation, pass document content as context for the AI to build upon
        result = await agenteConstrucao.generateDocument(
          documentType || "petição",
          query,
          documentContent?.replace(/<[^>]*>/g, "").substring(0, 3000),
          undefined,
          trace
        );
      } else {
        // Default: generate document (most common use case in legal platform)
        result = await agenteConstrucao.generateDocument(
          documentType || "documento", 
          query, 
          documentContent?.replace(/<[^>]*>/g, "").substring(0, 2000),
          undefined, 
          trace
        );
      }
      break;
    }

    default:
      result = await agentePesquisa.legalSearch(query, undefined, undefined, undefined, trace);
  }

  endSpan(trace, routeSpan, result.success ? "ok" : "error", {
    intent: intent.primaryAgent,
    confidence: intent.confidence,
    strategy: intent.strategy,
  });

  plan.status = result.success ? "completed" : "failed";
  plan.completedAt = new Date().toISOString();
  result.traceId = trace.traceId;

  return { ...result, plan, trace };
}
