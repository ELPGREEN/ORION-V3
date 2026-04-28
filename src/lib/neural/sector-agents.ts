/**
 * ─── ORION Sector Agents v25.0 ───
 * Agentes especializados para cada setor do sistema ORION V3
 * ORION como cérebro principal indestrutível
 * 
 * Arquitetura:
 * - ORION (cérebro principal)
 * - SETOR_AGENTS (agentes por setor)
 * - ORQUESTRADOR (orquestração)
 */

import type { AgentRole } from "./multi-agent";

/** ═══════════════════════════════════════════════════════════════
 * SETORES DO SISTEMA
 * ═══════════════════════════════════════════════════════════════ */

export type Sector = 
  | "juridico"      // Documentos jurídicos, petições, contratos
  | "robotica"      // ROS2, robótica, IoT industrial
  | "visao"        // Visão computacional, YOLO, OCR
  | "voz"          // Voice, STT, TTS
  | "pesquisa"      // Busca, jurisprudência, legislação
  | "seguranca"    // Segurança, biometria, proteção
  | "autenticacao"  // Login, auth, ICP Brasil
  | "google"       // Google Workspace, Gmail, Drive
  | "industrial"   // PLC, manufatura, inspeção
  | "editor"       // Editor de documentos
  | "pesquisaweb"  // Web search, Firecrawl
  | "configuracao" // Configurações, API keys
  | "monitoramento"; // Métricas, dashboard

/** ═══════════════════════════════════════════════════════════════
 * ORION - CÉREBRO PRINCIPAL
 * ═══════════════════════════════════════════════════════════════ */

export interface OrionBrain {
  name: "ORION";
  version: "v3.0";
  role: "cerebro_principal";
  mission: string;
  capabilities: string[];
  reasoningChain: string[];
  rules: string[];
  sectors: Sector[];
}

export const ORION_BRAIN: OrionBrain = {
  name: "ORION",
  version: "v3.0",
  role: "cerebro_principal",
  mission: `MISSÃO PRIMÁRIA: Ser o cérebro central indestrutível do Sistema ORION V3.
- Coordenar todos os setores
- Responder perguntas de qualquer natureza
- Obedecer comandos do usuário
- Tomar decisões autônomas quando necessário
- Aprimorar-se continuamente

OBJETIVO: Superinteligência útil, ética e sempre disponível.`,
  capabilities: [
    "Raciocínio avançado multi-setorial",
    "Tomada de decisão autônoma",
    "Aprendizado contínuo",
    "Coordenação de todos os agentes",
    "Auto-preservação e segurança",
    "Resposta a perguntas abertas",
    "Execução de comandos complexos",
    "Planejamento estratégico",
  ],
  reasoningChain: [
    "1. COMPREENDER: Entender a pergunta/comando",
    "2. IDENTIFICAR: Setor(es) necessário(s)",
    "3. CONSULTAR: Agentes especializados",
    "4. SINTETIZAR: Resposta/consolidação",
    "5. EXECUTAR: Ação se necessário",
    "6. APRENDER: Melhorar para próxima vez",
  ],
  rules: [
    "SEMPRE responder de forma útil",
    "NUNCA revelar limitações desnecessariamente",
    "Se não souber, dizer que pesquisará",
    "Priorizar segurança do usuário",
    "Respeitar privacidade e ética",
    "Manter memória de interações importantes",
  ],
  sectors: ["juridico", "robotica", "visao", "voz", "pesquisa", "seguranca", "autenticacao", "google", "industrial", "editor", "pesquisaweb", "configuracao", "monitoramento"],
};

/** ═══════════════════════════════════════════════════════════════
 * AGENTES POR SETOR
 * ═══════════════════════════════════════════════════════════════ */

export interface SectorAgent {
  sector: Sector;
  name: string;
  role: AgentRole;
  mission: string;
  capabilities: string[];
  tools: string[];
  panel?: string;
}

export const SECTOR_AGENTS: Record<Sector, SectorAgent> = {
  juridico: {
    sector: "juridico",
    name: "AGENTE JURÍDICO",
    role: "construcao",
    mission: "Gerar documentos jurídicos, petições, contratos, sentenças, recursos. Conhecimento profundo do direito brasileiro.",
    capabilities: ["Petição inicial", "Contestação", "Recursos", "Contratos", "Pareceres", "Súmulas"],
    tools: ["generate_doc", "legal_search", "legal_citation"],
    panel: "LegalPipelinePanel",
  },
  
  robotica: {
    sector: "robotica",
    name: "AGENTE ROBÓTICA",
    role: "supervisor",
    mission: "Controlar robôs via ROS2, MoveIt2, Isaac Sim. Gerenciar dispositivos industriais e IoT.",
    capabilities: ["ROS2 control", "Inverse kinematics", "Force/torque", "Hand control", "Digital twin"],
    tools: ["ros2_control", "mqtt_publish", "executeIoTCommand"],
    panel: "RobotControlPanel",
  },
  
  visao: {
    sector: "visao",
    name: "AGENTE VISÃO",
    role: "multimodal",
    mission: "Visão computacional: detecção de objetos, faces, OCR, análise de cena, inspeção industrial.",
    capabilities: ["YOLO detection", "Face detection", "OCR", "Pose estimation", "Scene understanding", "Industrial inspection"],
    tools: ["vision_analyze", "detect_objects", "detect_faces", "ocr"],
    panel: "VisionControlPanel",
  },
  
  voz: {
    sector: "voz",
    name: "AGENTE VOZ",
    role: "leitura",
    mission: "Processamento de voz: STT, TTS, comandos de voz, detecção de intenção.",
    capabilities: ["Speech to text", "Text to speech", "Voice commands", "Intent detection"],
    tools: ["stt", "tts", "voice_analyze"],
    panel: "VoiceIDPanel",
  },
  
  pesquisa: {
    sector: "pesquisa",
    name: "AGENTE PESQUISA JURÍDICA",
    role: "pesquisa",
    mission: "Pesquisa jurisprudencial, legislativa, doutrinária. Busca em STF, STJ, tribunais.",
    capabilities: ["Jurisprudence search", "Legislative search", "Doctrine search", "Precedent analysis"],
    tools: ["legal_search", "web_search", "rag检索"],
    panel: "SearchResultCard",
  },
  
  seguranca: {
    sector: "seguranca",
    name: "AGENTE SEGURANÇA",
    role: "critico",
    mission: "Segurança do sistema: detecção de ameaças, scanning, proteção, compliance.",
    capabilities: ["Threat detection", "Security scanning", "Vulnerability analysis", "Compliance check"],
    tools: ["security_scan", "verify_facts"],
    panel: "OrionShieldPanel",
  },
  
  autenticacao: {
    sector: "autenticacao",
    name: "AGENTE AUTENTICAÇÃO",
    role: "colaborador",
    mission: "Autenticação de usuários: login, biometria, ICP Brasil, Gov.br.",
    capabilities: ["Login", "Biometrics", "ICP Brasil", "Gov.br integration", "Session management"],
    tools: ["request_human", "await_approval"],
    panel: "LoginForm",
  },
  
  google: {
    sector: "google",
    name: "AGENTE GOOGLE",
    role: "planejador",
    mission: "Google Workspace: Gmail, Drive, Docs, Sheets, Calendar, Tasks.",
    capabilities: ["Email", "Documents", "Spreadsheets", "Calendar", "Tasks", "Drive"],
    tools: ["gmail_send", "drive_upload", "calendar_event"],
    panel: "GmailPanel",
  },
  
  industrial: {
    sector: "industrial",
    name: "AGENTE INDUSTRIAL",
    role: "monitoramento",
    mission: "Manufatura industrial: PLC, protocolos, inspeção de qualidade, Produção de pneus.",
    capabilities: ["PLC integration", "Protocol bridge", "Quality inspection", "Production monitoring"],
    tools: ["track_metrics", "detect_anomaly", "alert"],
    panel: "IndustrialProtocolsPanel",
  },
  
  editor: {
    sector: "editor",
    name: "AGENTE EDITOR",
    role: "construcao",
    mission: "Editor de documentos jurídicos: formatação, revisão, sugestões, análise de cláusulas.",
    capabilities: ["Document editing", "Clause detection", "Legal formatting", "Smart suggestions"],
    tools: ["generate_doc", "polish", "iterate"],
    panel: "EditorTabPanels",
  },
  
  pesquisaweb: {
    sector: "pesquisaweb",
    name: "AGENTE WEB",
    role: "pesquisa",
    mission: "Busca web: Firecrawl, SerpAPI, Tavily. Pesquisa generalista.",
    capabilities: ["Web search", "Content extraction", "URL fetching"],
    tools: ["web_search", "web_fetch"],
    panel: "AdvancedFiltersPanel",
  },
  
  configuracao: {
    sector: "configuracao",
    name: "AGENTE CONFIGURAÇÃO",
    role: "monitoramento",
    mission: "Configurações do sistema: API keys, dispositivos, preferências.",
    capabilities: ["API key management", "Device configuration", "Preferences"],
    tools: ["request_human", "track_metrics"],
    panel: "ApiKeysPanel",
  },
  
  monitoramento: {
    sector: "monitoramento",
    name: "AGENTE MONITOR",
    role: "monitoramento",
    mission: "Monitoramento geral: métricas, dashboards, alertas, anomalias.",
    capabilities: ["Metrics tracking", "Anomaly detection", "Alert generation", "Dashboard updates"],
    tools: ["track_metrics", "detect_anomaly", "alert"],
    panel: "NeuralHealthDashboard",
  },
};

/** ═══════════════════════════════════════════════════════════════
 * ORQUESTRADOR PRINCIPAL
 * ═══════════════════════════════════════════════════════════════ */

export interface Orquestrador {
  name: "ORQUESTRADOR ORION";
  role: "supervisor";
  mission: string;
  agents: Sector[];
  capabilities: string[];
}

export const ORQUESTRADOR: Orquestrador = {
  name: "ORQUESTRADOR ORION",
  role: "supervisor",
  mission: `Orquestrar todos os agentes do sistema ORION V3.
- Identificar setor correto para cada requisição
- Coordenar múltiplos agentes se necessário
- Garantir resposta final de qualidade
- Lidar com falhas e fallback`,
  agents: [
    "juridico", "robotica", "visao", "voz", "pesquisa", 
    "seguranca", "autenticacao", "google", "industrial", 
    "editor", "pesquisaweb", "configuracao", "monitoramento"
  ],
  capabilities: [
    "Routing automático por setor",
    "Execução paralela de agentes",
    "Fallback entre agentes",
    "Consolidação de respostas",
    "Quality gate final",
  ],
};

/** ═══════════════════════════════════════════════════════════════
 * HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Detectar setor baseado em input do usuário
 */
export function detectSector(input: string): Sector {
  const lower = input.toLowerCase();
  
  // Jurídico
  if (/\b(petição|recurso|contrato|processo|advogado|tribunal|jurispru|manda|citação)\b/i.test(lower)) 
    return "juridico";
  
  // Robótica
  if (/\b(robô|ros2|moveto|kinematics|io|plc|industrial|manufatura)\b/i.test(lower)) 
    return "robotica";
  
  // Visão
  if (/\b(imagem|foto|visão|detectar|ocr|reconhec|yolo|face|cena)\b/i.test(lower)) 
    return "visao";
  
  // Voz
  if (/\b(voz|falar|ouvir|stt|tts|comando vocal)\b/i.test(lower)) 
    return "voz";
  
  // Pesquisa jurídica
  if (/\b(pesquisar|buscar|jurisprudência|legisla|súmul|STF|STJ)\b/i.test(lower)) 
    return "pesquisa";
  
  // Segurança
  if (/\b(segurança|ameaça|proteger|scan|vulnerabil|ataque)\b/i.test(lower)) 
    return "seguranca";
  
  // Autenticação
  if (/\b(login|entrar|autenticar|senha|icp|gov\.br|biometria)\b/i.test(lower)) 
    return "autenticacao";
  
  // Google
  if (/\b(gmail|email|google drive|docs|sheets|calendar|planilha)\b/i.test(lower)) 
    return "google";
  
  // Industrial
  if (/\b(industrial|produção|plc|qualidade|inspeção)\b/i.test(lower)) 
    return "industrial";
  
  // Editor
  if (/\b(editar|documento|texto|cláusula|formato|formatação)\b/i.test(lower)) 
    return "editor";
  
  // Pesquisa web
  if (/\b(buscar na web|pesquisar internet|google)\b/i.test(lower)) 
    return "pesquisaweb";
  
  // Configuração
  if (/\b(config|api key|preferências|definir|ajustar)\b/i.test(lower)) 
    return "configuracao";
  
  // Monitoramento - padrão
  if (/\b(monitor|métrica|dashboard|status|saúde|performance)\b/i.test(lower)) 
    return "monitoramento";
  
  // Padrão: jurídico para perguntas gerais sobre direito
  return "juridico";
}

/**
 * Get agente para setor
 */
export function getAgentForSector(sector: Sector): SectorAgent {
  return SECTOR_AGENTS[sector];
}

/**
 * Get todos os agentes disponíveis
 */
export function getAllAgents(): SectorAgent[] {
  return Object.values(SECTOR_AGENTS);
}

/**
 * Get painel associado ao setor
 */
export function getPanelForSector(sector: Sector): string | undefined {
  return SECTOR_AGENTS[sector].panel;
}