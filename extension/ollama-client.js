/**
 * Orion Ollama Client — Local GPU Inference
 * Communication layer for local LLMs running on the user's PC.
 */

const OLLAMA_BASE = "http://localhost:11434/api";
const DEFAULT_MODEL = "llama3";

/**
 * Checks if Ollama is running and responsive.
 */
export async function checkOllamaStatus() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/tags`, { signal: AbortSignal.timeout(1000) });
    if (!res.ok) return { running: false };
    const data = await res.json();
    const hasModel = data.models?.some(m => m.name.includes(DEFAULT_MODEL));
    return { running: true, models: data.models, hasDefault: hasModel };
  } catch (e) {
    return { running: false };
  }
}

/**
 * Generates completion using local GPU via Ollama.
 */
export async function callOllama(prompt, options = {}) {
  try {
    const res = await fetch(`${OLLAMA_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model || DEFAULT_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 1024
        }
      })
    });

    if (!res.ok) throw new Error(`Ollama Error: ${res.status}`);
    const data = await res.json();
    return { success: true, response: data.response, model: data.model };
  } catch (err) {
    console.error("[Ollama Client] Request failed:", err);
    return { success: false, error: err.message };
  }
}
