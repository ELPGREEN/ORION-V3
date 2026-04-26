/**
 * Orion Extension v6.2 — Background Service Worker
 * Full integration with OpenRouter, OpenCode, NemoClaw, and Langflow.
 *
 * SECURITY: Policy Guard (NemoClaw Style)
 * ARCHITECTURE: Hybrid Intelligence Router (Local vs Cloud vs Flow)
 * ORCHESTRATION: Langflow Node Engine
 */

import { validateAction } from "./policies.js";
import { classifyActionToTask, getBlueprint } from "./agents.js";
import { routeQuery } from "./router.js";
import { onTabUpdated } from "./proactive.js";
import { checkWebGPUSupport } from "./gpu-detector.js";
import { decideRoute, ROUTE_TARGETS } from "./hybrid-router.js";
import { checkOllamaStatus, callOllama } from "./ollama-client.js";
import { runFlow } from "./langflow-client.js";

const SUPABASE_URL = "https://dlwafedtlvbvuoaopvsl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk";

// State
let orionState = {
  active: false,
  gpuAccelerated: false,
  ollamaActive: false,
  langflowActive: false,
  ramGB: navigator.deviceMemory || 8,
  apiStatus: { vision: "online", reasoning: "online", langflow: "offline" },
};

// ─── Startup & Service Detection ───
(async () => {
  orionState.gpuAccelerated = await checkWebGPUSupport();
  const ollama = await checkOllamaStatus();
  orionState.ollamaActive = ollama.running;

  // Detect Langflow
  try {
    const lfRes = await fetch("http://localhost:7860/api/v1/health", { signal: AbortSignal.timeout(1000) });
    orionState.langflowActive = lfRes.ok;
    orionState.apiStatus.langflow = lfRes.ok ? "online" : "offline";
  } catch (e) {
    orionState.langflowActive = false;
  }

  console.log(`[Orion] Ecosystem initialized.
    WebGPU: ${orionState.gpuAccelerated ? "ON" : "OFF"}
    Ollama: ${orionState.ollamaActive ? "ACTIVE" : "OFF"}
    Langflow: ${orionState.langflowActive ? "ACTIVE" : "OFF"}`);
})();

// ═══ Proactive Listeners ═══
chrome.tabs.onUpdated.addListener(onTabUpdated);

// ═══ Message Handling ═══
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "ORION_QUICK_ACTION":
        const taskType = classifyActionToTask(message.action, message.data || {});
        const blueprint = getBlueprint(taskType);

        if (await secureAction(message.action, sender.tab, message.data || {})) {
          const qRouting = routeQuery(taskType, message.data?.query || message.data?.text);

          // 3-Way Hybrid Routing
          const target = await decideRoute({
            type: taskType,
            text: message.data?.query || message.data?.text,
            complexity: qRouting.complexity,
            isSensitive: message.data?.isSensitive
          }, {
            hasGPU: orionState.gpuAccelerated || orionState.ollamaActive,
            ollamaRunning: orionState.ollamaActive,
            langflowActive: orionState.langflowActive
          });

          let result;
          let mode = "Cloud Intelligence";

          if (target === ROUTE_TARGETS.FLOW) {
            mode = "Langflow Orchestration";
            result = await runFlow(blueprint.id, message.data?.query || message.data?.text);
          } else if (target === ROUTE_TARGETS.LOCAL) {
            mode = "Local GPU (Ollama)";
            result = await callOllama(message.data?.query || message.data?.text);
          } else {
            result = await callOrionAI(message.action, message.data || {}, qRouting.provider, qRouting.complexity);
          }

          if (sender.tab?.id) {
             chrome.tabs.sendMessage(sender.tab.id, {
               type: "ORION_NOTIFICATION",
               text: `✅ Processado via ${mode}`,
               notifType: "success"
             });
          }
          sendResponse({ ...result, blueprint, mode });
        } else {
          sendResponse({ error: "Blocked" });
        }
        break;
      case "GET_STATE":
        sendResponse(orionState);
        break;
    }
  })();
  return true;
});

async function secureAction(action, tab, data = {}) {
  const domain = tab?.url ? new URL(tab.url).hostname : "unknown";
  const validation = validateAction(action, domain, data);
  if (!validation.allowed && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "ORION_NOTIFICATION", text: `🚫 Segurança: ${validation.reason}`, notifType: "error" });
    return false;
  }
  return true;
}

async function callOrionAI(action, data, provider, complexity) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-orchestrator`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${await getAccessToken()}` },
      body: JSON.stringify({ action: "chat", subAction: action, prompt: data.query || data.text, preferredProvider: provider, model_type: complexity === "high" ? "reasoning" : "balanced" })
    });
    return await res.json();
  } catch (err) { return { error: err.message, success: false }; }
}

async function getAccessToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["orionAccessToken"], (result) => { resolve(result.orionAccessToken || SUPABASE_ANON_KEY); });
  });
}
