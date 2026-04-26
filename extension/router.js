/**
 * Orion Quantum Inference Router — Extension Edition
 * Simplified version of the Neurocore Quantum Router.
 *
 * Decides which LLM provider to use based on task and complexity.
 */

const PROVIDERS = {
  REASONING: "deepseek/deepseek-r1",    // Heavy lifting, logic, code
  GENERAL: "google/gemini-2.0-flash", // Fast, multi-modal, general
  FAST: "meta-llama/llama-3.3-70b",   // Low latency, summaries
};

const TASK_ROUTING = {
  pdf_analysis: PROVIDERS.REASONING,
  page_summary: PROVIDERS.FAST,
  web_search: PROVIDERS.GENERAL,
  data_extract: PROVIDERS.REASONING,
  academic: PROVIDERS.REASONING,
  general_chat: PROVIDERS.GENERAL,
};

/**
 * Routes a query to the optimal provider.
 */
export function routeQuery(taskType, query = "") {
  let provider = TASK_ROUTING[taskType] || PROVIDERS.GENERAL;

  // Simple heuristic for coding tasks in general chat
  if (taskType === "general_chat") {
    const codePatterns = /\b(código|função|api|erro|implemente|script|py|js|ts)\b/i;
    if (codePatterns.test(query)) {
      provider = PROVIDERS.REASONING;
    }
  }

  // Measure Complexity (Simplified)
  const complexity = query.length > 500 ? "high" : "normal";
  if (complexity === "high" && provider === PROVIDERS.FAST) {
    provider = PROVIDERS.GENERAL;
  }

  console.log(`[Orion Router] Routed task ${taskType} to ${provider} (Complexity: ${complexity})`);
  return { provider, complexity };
}
