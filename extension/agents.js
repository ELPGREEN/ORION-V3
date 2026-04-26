/**
 * Orion Agent Dispatcher — Modular Blueprint System
 * Inspired by NVIDIA NemoClaw.
 *
 * Maps UI actions to specialized agents defined by blueprints.
 */

const BLUEPRINTS = {
  pdf_analysis: {
    id: "pdf_analysis",
    label: "🔬 Research",
    color: "#4CAF50",
    description: "Análise profunda de PDFs e documentos técnicos."
  },
  page_summary: {
    id: "page_summary",
    label: "📝 Content",
    color: "#2196F3",
    description: "Resumo e explicação de conteúdo web."
  },
  web_search: {
    id: "web_search",
    label: "🔍 Search",
    color: "#FF9800",
    description: "Busca em tempo real e verificação de fatos."
  },
  data_extract: {
    id: "data_extract",
    label: "📊 Data",
    color: "#9C27B0",
    description: "Extração estruturada de tabelas e dados."
  },
  academic: {
    id: "academic",
    label: "📚 Academic",
    color: "#795548",
    description: "Auxílio em escrita acadêmica e referências."
  },
  general_chat: {
    id: "general_chat",
    label: "🤖 Orion",
    color: "#00E5FF",
    description: "Assistente neural para tarefas gerais."
  },
};

/**
 * Classify a user action into a task_type for the agent hub.
 */
export function classifyActionToTask(action, context = {}) {
  const map = {
    "analyze-page": "page_summary",
    summarize: "page_summary",
    translate: "page_summary",
    "web-search": "web_search",
    scrape: "page_summary",
    "academic-outline": "academic",
    "extract-data": "data_extract",
    "pdf-summarize": "pdf_analysis",
    "pdf-extract": "pdf_analysis",
    "pdf-questions": "pdf_analysis",
  };

  if (map[action]) return map[action];
  if (context.pdfContext) return "pdf_analysis";
  if (context.pageContent) return "page_summary";
  return "general_chat";
}

/**
 * Get blueprint details for a task type.
 */
export function getBlueprint(taskType) {
  return BLUEPRINTS[taskType] || BLUEPRINTS.general_chat;
}

/**
 * Get the display label for an agent type.
 */
export function getAgentLabel(taskType) {
  return getBlueprint(taskType).label;
}

/**
 * Get the badge color for an agent type.
 */
export function getAgentColor(taskType) {
  return getBlueprint(taskType).color;
}
