/**
 * ═══ Orion Protocol Registry ═══
 * Comprehensive protocol definitions for all question/command types.
 * Each protocol defines: validation rules, expected response shape, 
 * security level, and quality thresholds.
 */

export interface OrionProtocol {
  id: string;
  category: ProtocolCategory;
  description: string;
  securityLevel: "public" | "authenticated" | "owner_only";
  requiresVoiceAuth: boolean;
  expectedResponseShape: "text" | "data" | "navigation" | "action" | "multimedia";
  qualityThreshold: number; // minimum score to pass verification
  maxLatencyMs: number;
  hallucination_keywords?: string[];
  coherenceChecks: string[];
}

export type ProtocolCategory =
  | "identity" | "greeting" | "memory" | "navigation" | "search"
  | "voice" | "iot" | "media" | "legal" | "finance" | "calendar"
  | "document" | "analysis" | "education" | "health" | "utility"
  | "humor" | "philosophy" | "security" | "evolution" | "construction"
  | "multilingual" | "crm" | "reporting" | "accessibility";

export const PROTOCOL_REGISTRY: Record<string, OrionProtocol> = {
  // ── IDENTITY ──
  greeting: {
    id: "P-GREET-01",
    category: "greeting",
    description: "Saudações e frases de abertura",
    securityLevel: "public",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.5,
    maxLatencyMs: 200,
    coherenceChecks: ["response_not_empty", "no_hallucination"],
  },
  owner_identity: {
    id: "P-OWNER-01",
    category: "identity",
    description: "Perguntas sobre o criador/proprietário do Orion",
    securityLevel: "public",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.8,
    maxLatencyMs: 500,
    coherenceChecks: ["mentions_ericson", "mentions_elp"],
  },
  self_identity: {
    id: "P-SELF-01",
    category: "identity",
    description: "Perguntas sobre quem é o Orion",
    securityLevel: "public",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.8,
    maxLatencyMs: 500,
    coherenceChecks: ["mentions_orion", "mentions_aquario"],
  },
  who_am_i: {
    id: "P-WHOAMI-01",
    category: "identity",
    description: "Identificação do usuário atual",
    securityLevel: "authenticated",
    requiresVoiceAuth: true,
    expectedResponseShape: "text",
    qualityThreshold: 0.7,
    maxLatencyMs: 1000,
    coherenceChecks: ["user_identified_or_asked"],
  },
  voice_id: {
    id: "P-VOICE-01",
    category: "voice",
    description: "Verificação de identidade vocal",
    securityLevel: "authenticated",
    requiresVoiceAuth: true,
    expectedResponseShape: "text",
    qualityThreshold: 0.7,
    maxLatencyMs: 1000,
    coherenceChecks: ["enrollment_status_mentioned"],
  },

  // ── MEMÓRIA ──
  memory_store: {
    id: "P-MEM-01",
    category: "memory",
    description: "Armazenamento de fatos na memória",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.6,
    maxLatencyMs: 500,
    coherenceChecks: ["confirmation_given"],
  },
  memory_recall: {
    id: "P-MEM-02",
    category: "memory",
    description: "Recuperação de fatos memorizados",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.6,
    maxLatencyMs: 500,
    coherenceChecks: ["fact_retrieved_or_not_found"],
  },

  // ── NAVEGAÇÃO ──
  navigation: {
    id: "P-NAV-01",
    category: "navigation",
    description: "Navegação para páginas da plataforma",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "navigation",
    qualityThreshold: 0.6,
    maxLatencyMs: 800,
    coherenceChecks: ["valid_route_targeted"],
  },

  // ── BUSCA ──
  search: {
    id: "P-SEARCH-01",
    category: "search",
    description: "Busca de documentos, clientes, processos",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "data",
    qualityThreshold: 0.6,
    maxLatencyMs: 3000,
    coherenceChecks: ["results_count_mentioned"],
  },

  // ── JURÍDICO ──
  legal_consultation: {
    id: "P-LEGAL-01",
    category: "legal",
    description: "Consultas jurídicas, leis, jurisprudência",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.75,
    maxLatencyMs: 8000,
    hallucination_keywords: ["artigo fictício", "lei inventada"],
    coherenceChecks: ["sources_cited", "no_fabricated_law"],
  },
  legal_document: {
    id: "P-LEGAL-02",
    category: "document",
    description: "Geração e análise de documentos jurídicos",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.8,
    maxLatencyMs: 10000,
    coherenceChecks: ["proper_format", "legal_terminology"],
  },
  process_info: {
    id: "P-LEGAL-03",
    category: "legal",
    description: "Informações sobre processos judiciais",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "data",
    qualityThreshold: 0.7,
    maxLatencyMs: 5000,
    coherenceChecks: ["process_number_or_parties"],
  },

  // ── FINANÇAS ──
  financial_query: {
    id: "P-FIN-01",
    category: "finance",
    description: "Consultas financeiras, faturas, pagamentos",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "data",
    qualityThreshold: 0.7,
    maxLatencyMs: 3000,
    coherenceChecks: ["numbers_present"],
  },

  // ── AGENDA ──
  calendar_query: {
    id: "P-CAL-01",
    category: "calendar",
    description: "Consultas e agendamento de compromissos",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.6,
    maxLatencyMs: 3000,
    coherenceChecks: ["date_or_time_mentioned"],
  },

  // ── CRM ──
  crm_query: {
    id: "P-CRM-01",
    category: "crm",
    description: "Consultas sobre clientes, contatos, pipeline",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "data",
    qualityThreshold: 0.6,
    maxLatencyMs: 3000,
    coherenceChecks: ["entity_referenced"],
  },

  // ── UTILIDADES ──
  time_date: {
    id: "P-UTIL-01",
    category: "utility",
    description: "Perguntas sobre hora, data, clima",
    securityLevel: "public",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.5,
    maxLatencyMs: 500,
    coherenceChecks: ["factual_answer"],
  },
  calculation: {
    id: "P-UTIL-02",
    category: "utility",
    description: "Cálculos matemáticos e conversões",
    securityLevel: "public",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.7,
    maxLatencyMs: 1000,
    coherenceChecks: ["numeric_result"],
  },
  translation: {
    id: "P-UTIL-03",
    category: "multilingual",
    description: "Traduções entre idiomas",
    securityLevel: "public",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.7,
    maxLatencyMs: 3000,
    coherenceChecks: ["target_language_used"],
  },

  // ── ANÁLISE ──
  analysis: {
    id: "P-ANAL-01",
    category: "analysis",
    description: "Análise de dados, sentimento, resumo",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.7,
    maxLatencyMs: 8000,
    coherenceChecks: ["structured_analysis"],
  },

  // ── EDUCAÇÃO ──
  explanation: {
    id: "P-EDU-01",
    category: "education",
    description: "Explicações e tutoriais",
    securityLevel: "public",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.7,
    maxLatencyMs: 5000,
    coherenceChecks: ["clear_explanation"],
  },

  // ── HUMOR / FILOSOFIA ──
  humor: {
    id: "P-HUM-01",
    category: "humor",
    description: "Piadas e interações lúdicas",
    securityLevel: "public",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.4,
    maxLatencyMs: 2000,
    coherenceChecks: [],
  },
  philosophy: {
    id: "P-PHIL-01",
    category: "philosophy",
    description: "Reflexões filosóficas e existenciais",
    securityLevel: "public",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.6,
    maxLatencyMs: 5000,
    coherenceChecks: ["depth_of_reasoning"],
  },

  // ── IoT ──
  iot_control: {
    id: "P-IOT-01",
    category: "iot",
    description: "Controle de dispositivos IoT e smart home",
    securityLevel: "authenticated",
    requiresVoiceAuth: true,
    expectedResponseShape: "action",
    qualityThreshold: 0.6,
    maxLatencyMs: 3000,
    coherenceChecks: ["action_confirmed"],
  },

  // ── MÍDIA ──
  media_control: {
    id: "P-MEDIA-01",
    category: "media",
    description: "Controle de mídia e Spotify",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "action",
    qualityThreshold: 0.5,
    maxLatencyMs: 3000,
    coherenceChecks: ["media_action_confirmed"],
  },

  // ── SEGURANÇA ──
  security_query: {
    id: "P-SEC-01",
    category: "security",
    description: "Consultas sobre segurança, ameaças, defesas",
    securityLevel: "owner_only",
    requiresVoiceAuth: true,
    expectedResponseShape: "data",
    qualityThreshold: 0.7,
    maxLatencyMs: 3000,
    coherenceChecks: ["security_data_present"],
  },

  // ── EVOLUÇÃO ──
  self_evolve: {
    id: "P-EVO-01",
    category: "evolution",
    description: "Auto-evolução e aprendizagem",
    securityLevel: "owner_only",
    requiresVoiceAuth: true,
    expectedResponseShape: "text",
    qualityThreshold: 0.6,
    maxLatencyMs: 60000,
    coherenceChecks: ["evolution_phases_reported"],
  },
  auto_construct: {
    id: "P-BUILD-01",
    category: "construction",
    description: "Construção autônoma de código",
    securityLevel: "owner_only",
    requiresVoiceAuth: true,
    expectedResponseShape: "text",
    qualityThreshold: 0.7,
    maxLatencyMs: 30000,
    coherenceChecks: ["code_generated_or_planned"],
  },

  // ── RELATÓRIOS ──
  reporting: {
    id: "P-REP-01",
    category: "reporting",
    description: "Geração de relatórios e métricas",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "data",
    qualityThreshold: 0.7,
    maxLatencyMs: 8000,
    coherenceChecks: ["metrics_present"],
  },

  // ── ACESSIBILIDADE ──
  voice_config: {
    id: "P-ACC-01",
    category: "accessibility",
    description: "Configuração de voz (velocidade, pitch, tom)",
    securityLevel: "authenticated",
    requiresVoiceAuth: false,
    expectedResponseShape: "action",
    qualityThreshold: 0.5,
    maxLatencyMs: 1000,
    coherenceChecks: ["setting_confirmed"],
  },

  // ── FALLBACK ──
  general_llm: {
    id: "P-GEN-01",
    category: "education",
    description: "Consulta geral via LLM (fallback)",
    securityLevel: "public",
    requiresVoiceAuth: false,
    expectedResponseShape: "text",
    qualityThreshold: 0.5,
    maxLatencyMs: 10000,
    coherenceChecks: ["response_not_empty"],
  },
};

/**
 * Resolve the protocol for a given intent handler.
 */
export function getProtocolForIntent(handler: string): OrionProtocol {
  return PROTOCOL_REGISTRY[handler] || PROTOCOL_REGISTRY.general_llm;
}

/**
 * Check if a given intent requires authenticated user.
 */
export function requiresAuth(handler: string): boolean {
  const p = getProtocolForIntent(handler);
  return p.securityLevel !== "public";
}

/**
 * Check if a given intent requires voice authentication (enrolled user).
 */
export function requiresVoiceAuth(handler: string): boolean {
  const p = getProtocolForIntent(handler);
  return p.requiresVoiceAuth;
}

/**
 * Check if a given intent is restricted to owner only.
 */
export function isOwnerOnly(handler: string): boolean {
  const p = getProtocolForIntent(handler);
  return p.securityLevel === "owner_only";
}
