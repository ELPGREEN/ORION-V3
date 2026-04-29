/**
 * Orion Quantum Inference Router — Extension v5.6
 */

const PROVIDERS = {
  REASONING: "deepseek/deepseek-r1:free",
  GENERAL: "google/gemini-2.0-flash-exp:free",
  FAST: "google/gemini-2.0-flash-lite-preview:free",
};

const TASK_ROUTING = {
  pdf_analysis: PROVIDERS.REASONING,
  page_summary: PROVIDERS.FAST,
  web_search: PROVIDERS.GENERAL,
  data_extract: PROVIDERS.REASONING,
  academic: PROVIDERS.REASONING,
  general_chat: PROVIDERS.GENERAL,
};

export function routeQuery(taskType, query = "") {
  let provider = TASK_ROUTING[taskType] || PROVIDERS.GENERAL;
  const complexity = query.length > 500 ? "high" : "normal";

  if (complexity === "high" && provider === PROVIDERS.FAST) {
    provider = PROVIDERS.GENERAL;
  }

  console.log(`[Orion Router] Routed ${taskType} to ${provider} (${complexity})`);
  return { provider, complexity };
}
