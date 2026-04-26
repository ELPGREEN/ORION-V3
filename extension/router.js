/**
 * Orion Quantum Inference Router — Extension Edition
 * Optimized for OpenRouter & OpenCode 2026.
 *
 * Decides which LLM provider to use based on task, complexity,
 * and current OpenRouter free tier availability.
 */

export const PROVIDERS = {
  AUTO: "openrouter/free",
  REASONING: "deepseek/deepseek-r1",
  CODE: "qwen/qwen3-coder-480b",
  GENERAL: "meta-llama/llama-3.3-70b-instruct",
  FAST: "mistralai/mistral-small-3.1-24b-instruct",
  VISION: "qwen/qwen2.5-vl-3b-instruct",
  ACADEMIC: "deepseek/deepseek-r1",
};

const TASK_ROUTING = {
  pdf_analysis: PROVIDERS.REASONING,
  page_summary: PROVIDERS.FAST,
  web_search: PROVIDERS.GENERAL,
  data_extract: PROVIDERS.REASONING,
  academic: PROVIDERS.ACADEMIC,
  auto_evolution: PROVIDERS.CODE,
  general_chat: PROVIDERS.AUTO,
};

/**
 * Routes a query to the optimal OpenRouter provider.
 */
export function routeQuery(taskType, query = "") {
  let provider = TASK_ROUTING[taskType] || PROVIDERS.AUTO;

  const queryLower = (query || "").toLowerCase();

  // ── Smart Contextual Overrides ──

  // Code detection
  if (queryLower.match(/\b(código|função|api|bug|implemente|script|py|js|ts|rust|go)\b/)) {
    provider = PROVIDERS.CODE;
  }

  // Complex reasoning detection
  if (queryLower.match(/\b(por que|explique|prove|calcule|lógica|raciocínio|complexo)\b/) && queryLower.length > 200) {
    provider = PROVIDERS.REASONING;
  }

  // Vision hint
  if (queryLower.match(/\b(imagem|foto|veja|olhe|câmera|visão)\b/)) {
    provider = PROVIDERS.VISION;
  }

  // Complexity Estimate
  const complexity = query.length > 800 ? "high" : (query.length > 200 ? "normal" : "simple");

  // Upgrade if complexity is high
  if (complexity === "high" && provider === PROVIDERS.FAST) {
    provider = PROVIDERS.GENERAL;
  }

  console.log(`[Orion Router] Task: ${taskType} -> Provider: ${provider} (Complexity: ${complexity})`);

  return {
    provider,
    complexity,
    isFree: provider.includes("free") || !provider.includes("/")
  };
}
