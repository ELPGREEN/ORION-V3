/**
 * Orion Agent Dispatcher — Maps UI actions to specialized agents
 * Used by background.js and content.js to route tasks.
 */

const AGENT_HUB_PATH = "/functions/v1/orion-agent-hub";

const AGENT_LABELS = {
  pdf_analysis: "🔬 Research",
  page_summary: "📝 Content",
  web_search: "🔍 Search",
  data_extract: "📊 Data",
  academic: "📚 Academic",
  general_chat: "🤖 Orion",
};

const AGENT_COLORS = {
  pdf_analysis: "#4CAF50",
  page_summary: "#2196F3",
  web_search: "#FF9800",
  data_extract: "#9C27B0",
  academic: "#795548",
  general_chat: "#00E5FF",
};

/**
 * Classify a user action into a task_type for the agent hub.
 */
function classifyActionToTask(action, context = {}) {
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
 * Get the display label for an agent type.
 */
function getAgentLabel(taskType) {
  return AGENT_LABELS[taskType] || AGENT_LABELS.general_chat;
}

/**
 * Get the badge color for an agent type.
 */
function getAgentColor(taskType) {
  return AGENT_COLORS[taskType] || AGENT_COLORS.general_chat;
}

// Export for use in content.js and background.js (global scope in extension)
if (typeof globalThis !== "undefined") {
  globalThis.OrionAgents = {
    AGENT_HUB_PATH,
    AGENT_LABELS,
    AGENT_COLORS,
    classifyActionToTask,
    getAgentLabel,
    getAgentColor,
  };
}
