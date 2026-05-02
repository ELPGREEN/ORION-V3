/**
 * Orion-V3 Agent Registry
 * Defines the core sub-agents and their capabilities.
 * Each agent has a clear domain — the orchestrator routes to exactly one
 * (or sequences multiple) based on intent classification.
 */

export type AgentId = "bolt" | "palette" | "harvester" | "justice" | "sentinel" | "factory";

export interface AgentCapability {
  id: AgentId;
  emoji: string;
  name: string;
  domain: string;
  /** Keywords/intents that strongly route to this agent (PT-BR + EN). */
  triggers: string[];
  /** Things this agent must NOT do — used to block cross-domain leakage. */
  exclusions: string[];
  /** Preferred LLM tier for this agent's tasks. */
  preferredTier: "fast" | "balanced" | "reasoning" | "coding" | "heavy";
  /** Can run in parallel with other agents? */
  parallelSafe: boolean;
  /** Mutex group — agents in the same group cannot run simultaneously. */
  mutexGroup?: string;
}

export const AGENT_REGISTRY: Record<AgentId, AgentCapability> = {
  bolt: {
    id: "bolt",
    emoji: "⚡",
    name: "Bolt",
    domain: "Engenharia / Lógica / Performance / Código",
    triggers: [
      "código", "code", "bug", "erro", "performance", "otimizar", "refator",
      "function", "edge function", "supabase", "migration", "deploy",
      "build", "test", "typescript", "compile", "lógica", "algoritmo",
      "fix", "debug", "integração", "api", "endpoint",
    ],
    exclusions: ["design visual", "cor", "layout", "pesquisa web", "questões jurídicas"],
    preferredTier: "coding",
    parallelSafe: false, // muta arquivos
    mutexGroup: "code-mutation",
  },
  palette: {
    id: "palette",
    emoji: "🎨",
    name: "Palette",
    domain: "UX / Interface / Visão / Design",
    triggers: [
      "design", "interface", "ui", "ux", "cor", "color", "layout",
      "tipografia", "fonte", "spacing", "responsivo", "mobile", "tema",
      "tailwind", "css", "animação", "motion", "visual", "tela",
      "componente", "shadcn", "bonito", "estética", "redesign",
    ],
    exclusions: ["lógica de negócio", "edge function", "migration", "segurança"],
    preferredTier: "balanced",
    parallelSafe: false, // também muta arquivos
    mutexGroup: "code-mutation",
  },
  harvester: {
    id: "harvester",
    emoji: "🧠",
    name: "Harvester",
    domain: "Conhecimento / Pesquisa / Transcrição / RAG",
    triggers: [
      "pesquis", "search", "buscar", "encontrar", "estudar", "aprender",
      "transcri", "transcribe", "documento", "rag", "embedding",
      "conhecimento", "knowledge", "memória", "memory", "contexto",
      "resumir", "summarize", "analisar texto", "extrair", "gmail", "google drive",
      "docs", "sheets", "calendar", "planilha", "web", "internet",
    ],
    exclusions: ["modificar código", "alterar UI", "robótica", "industrial"],
    preferredTier: "reasoning",
    parallelSafe: true, // somente leitura/análise
  },
  justice: {
    id: "justice",
    emoji: "⚖️",
    name: "Justice",
    domain: "Jurídico / Jurisprudência / Contratos / Petições",
    triggers: [
      "jurídico", "legal", "petição", "recurso", "contrato", "processo",
      "advogado", "tribunal", "jurisprudência", "súmula", "lei", "artigo",
      "cláusula", "sentença", "stf", "stj", "cnj", "oab", "direito",
    ],
    exclusions: ["modificar código", "design de interface", "robótica"],
    preferredTier: "reasoning",
    parallelSafe: true,
  },
  sentinel: {
    id: "sentinel",
    emoji: "🛡️",
    name: "Sentinel",
    domain: "Segurança / Autenticação / Monitoramento / Saúde do Sistema",
    triggers: [
      "segurança", "security", "proteger", "ameaça", "vulnerabilidade",
      "scan", "ataque", "login", "senha", "autenticar", "biometria",
      "icp brasil", "gov.br", "status", "métrica", "saúde", "performance",
      "monitoramento", "dashboard", "anomalia", "alerta",
    ],
    exclusions: ["gerar código", "design visual", "jurisprudência"],
    preferredTier: "balanced",
    parallelSafe: true,
  },
  factory: {
    id: "factory",
    emoji: "🏭",
    name: "Factory",
    domain: "Robótica / Industrial / IoT / Manufatura",
    triggers: [
      "robô", "robot", "ros2", "plc", "industrial", "manufatura",
      "iot", "automação", "fábrica", "produção", "inspeção", "qualidade",
      "kinematics", "digital twin", "sensor", "atuador", "controlador",
    ],
    exclusions: ["questões jurídicas", "design de interface", "código web"],
    preferredTier: "coding",
    parallelSafe: false, // pode interagir com hardware
    mutexGroup: "hardware-io",
  },
};

export const ALL_AGENTS = Object.values(AGENT_REGISTRY);

export function getAgent(id: AgentId): AgentCapability {
  return AGENT_REGISTRY[id];
}
