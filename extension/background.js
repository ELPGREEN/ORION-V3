/**
 * Orion Extension v5.9 — Background Service Worker
 * Full integration with OpenRouter, OpenCode, NemoClaw, and Local GPU (Ollama).
 *
 * SECURITY: Policy Guard (NemoClaw Style)
 * ARCHITECTURE: Hybrid Intelligence Router (Local vs Cloud)
 * HARDWARE: Multi-Tier GPU Acceleration
 */

import { validateAction } from "./policies.js";
import { classifyActionToTask, getBlueprint } from "./agents.js";
import { routeQuery } from "./router.js";
import { onTabUpdated } from "./proactive.js";
import { checkWebGPUSupport } from "./gpu-detector.js";
import { decideRoute, ROUTE_TARGETS } from "./hybrid-router.js";
import { checkOllamaStatus, callOllama } from "./ollama-client.js";

const SUPABASE_URL = "https://dlwafedtlvbvuoaopvsl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk";

// State
let orionState = {
  active: false,
  gpuAccelerated: false, // WebGPU
  ollamaActive: false,    // Local PC GPU (Ollama)
  ramGB: navigator.deviceMemory || 8,
  apiStatus: { vision: "online", reasoning: "online", openrouter: "online" },
};

// ─── Startup & Hardware Detection ───
(async () => {
  orionState.gpuAccelerated = await checkWebGPUSupport();
  const ollama = await checkOllamaStatus();
  orionState.ollamaActive = ollama.running;

  console.log(`[Orion] Core initialized.
    WebGPU: ${orionState.gpuAccelerated ? "ON" : "OFF"}
    Ollama (PC GPU): ${orionState.ollamaActive ? "ACTIVE" : "OFF"}
    RAM: ${orionState.ramGB}GB`);
})();

// ═══ Proactive Listeners ═══
chrome.tabs.onUpdated.addListener(onTabUpdated);

// ═══ Message Handling ═══
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "ORION_QUICK_ACTION":
        const taskType = classifyActionToTask(message.action, message.data);
        const blueprint = getBlueprint(taskType);

        if (await secureAction(message.action, sender.tab, message.data)) {
          // 1. Quantum Complexity Routing (Logical)
          const qRouting = routeQuery(taskType, message.data?.query || message.data?.text);

          // 2. Hybrid Hardware Routing (Physical)
          const target = await decideRoute({
            type: taskType,
            text: message.data?.query || message.data?.text,
            complexity: qRouting.complexity,
            isSensitive: message.data?.isSensitive
          }, {
            hasGPU: orionState.gpuAccelerated || orionState.ollamaActive,
            ramGB: orionState.ramGB,
            ollamaRunning: orionState.ollamaActive
          });

          let result;
          let finalMode = target === ROUTE_TARGETS.LOCAL ? "Local GPU (Ollama)" : "Cloud Intelligence";

          if (target === ROUTE_TARGETS.LOCAL) {
            result = await callOllama(message.data?.query || message.data?.text);
            if (!result.success) {
              console.warn("[Orion] Local failure, falling back to Cloud.");
              finalMode = "Cloud (Fallback)";
              result = await callOrionAI(message.action, message.data, qRouting.provider);
            }
          } else {
            result = await callOrionAI(message.action, message.data, qRouting.provider);
          }

          console.log(`[Orion Dispatch] Agent: ${blueprint.label} | Mode: ${finalMode}`);

          if (sender.tab?.id) {
             chrome.tabs.sendMessage(sender.tab.id, {
               type: "ORION_NOTIFICATION",
               text: `✅ Respondido via ${finalMode}`,
               notifType: "success"
             });
          }

          sendResponse({ ...result, blueprint, mode: finalMode });
        } else {
          sendResponse({ error: "Action blocked by security policy" });
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
    chrome.tabs.sendMessage(tab.id, {
      type: "ORION_NOTIFICATION",
      text: validation.requiresApproval ? `⚠️ Ação ${action} requer autorização.` : `🚫 Segurança: ${validation.reason}`,
      notifType: validation.requiresApproval ? "warning" : "error"
    });
    return false;
  }
  return true;
}

async function callOrionAI(action, data, model) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${await getAccessToken()}`
      },
      body: JSON.stringify({ action, data, model })
    });
    return await res.json();
  } catch (err) {
    return { error: err.message, success: false };
  }
}

async function getAccessToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["orionAccessToken"], (result) => {
      resolve(result.orionAccessToken || SUPABASE_ANON_KEY);
    });
  });
}
