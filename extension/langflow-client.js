/**
 * Orion Langflow Client
 * Orchestrates multi-agent flows via Langflow API.
 */

const LANGFLOW_API_URL = "http://localhost:7860/api/v1/process"; // Default local
const LANGFLOW_TOKEN = ""; // Placeholder for hosted instances

/**
 * Executes a blueprint as a Langflow process.
 */
export async function runFlow(blueprintId, inputData, tweaks = {}) {
  console.log(`[Orion Langflow] Initiating flow for: ${blueprintId}`);

  try {
    const response = await fetch(`${LANGFLOW_API_URL}/${blueprintId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": LANGFLOW_TOKEN ? `Bearer ${LANGFLOW_TOKEN}` : ""
      },
      body: JSON.stringify({
        input_value: inputData,
        input_type: "chat",
        output_type: "chat",
        tweaks: tweaks
      })
    });

    if (!response.ok) {
      throw new Error(`Langflow API Error: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      response: result.outputs?.[0]?.outputs?.[0]?.results?.message?.text || result.result,
      source: "Langflow Engine"
    };
  } catch (err) {
    console.error("[Orion Langflow] Flow execution failed:", err);
    return { success: false, error: err.message };
  }
}
