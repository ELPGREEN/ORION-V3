/**
 * Orion Extension v5.8 — Background Service Worker
 * Full integration with OpenRouter, OpenCode, NemoClaw, and WebGPU.
 *
 * SECURITY: Policy Guard (NemoClaw Style)
 * ARCHITECTURE: Blueprint System (OpenCode Aligned)
 * INTELLIGENCE: Quantum Routing (OpenRouter optimized)
 * HARDWARE: Multi-Tier GPU Acceleration (Local Host + WebGPU)
 */

import { validateAction } from "./policies.js";
import { classifyActionToTask, getBlueprint } from "./agents.js";
import { routeQuery } from "./router.js";
import { onTabUpdated } from "./proactive.js";
import { checkWebGPUSupport } from "./gpu-detector.js";

const SUPABASE_URL = "https://dlwafedtlvbvuoaopvsl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk";
const LOCAL_HUB_URL = "http://localhost:7860"; // Default Gradio/FastAPI port for orion_cpu_space

// State
let orionState = {
  active: false,
  gpuAccelerated: false,
  localHubActive: false,
  apiStatus: { vision: "online", reasoning: "online", openrouter: "online" },
};

// ─── Startup & Hardware Detection ───
(async () => {
  orionState.gpuAccelerated = await checkWebGPUSupport();

  // Check if orion_cpu_space is running locally (utilizing PC GPU)
  try {
    const res = await fetch(`${LOCAL_HUB_URL}/config`, { signal: AbortSignal.timeout(1000) });
    orionState.localHubActive = res.ok;
  } catch (e) {
    orionState.localHubActive = false;
  }

  console.log(`[Orion] Core initialized. WebGPU: ${orionState.gpuAccelerated ? "ON" : "OFF"} | Local GPU Hub: ${orionState.localHubActive ? "ACTIVE" : "OFF"}`);
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
        const routing = routeQuery(taskType, message.data?.query || message.data?.text);

        if (await secureAction(message.action, sender.tab, message.data)) {
          let result;
          let mode = "Cloud";

          // ── Execution Priority: Local PC GPU -> Browser WebGPU -> Cloud ──
          if (orionState.localHubActive && (message.action === "extract-data" || message.action === "summarize")) {
            mode = "PC GPU (Local)";
            result = await callLocalHub(message.action, message.data);
          } else {
            result = await callOrionAI(message.action, message.data, routing.provider, orionState.gpuAccelerated);
          }

          console.log(`[Orion Dispatch] Agent: ${blueprint.label} | Model: ${routing.provider} | Mode: ${mode}`);
          sendResponse({ ...result, blueprint, routing, mode });
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

/**
 * Calls the local orion_cpu_space running on the user's machine (PC GPU).
 */
async function callLocalHub(action, data) {
  try {
    const endpoint = action === "extract-data" ? "ocr" : "embeddings";
    const res = await fetch(`${LOCAL_HUB_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [data.text || data.imageUrl] })
    });
    const json = await res.json();
    return { success: true, data: json.data[0] };
  } catch (err) {
    console.warn("[Orion Local] PC GPU Hub failed, falling back to cloud.", err);
    return await callOrionAI(action, data, "google/gemini-2.0-flash", false);
  }
}

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

async function callOrionAI(action, data, model, useWebGPU) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${await getAccessToken()}`
      },
      body: JSON.stringify({ action, data, model, hardware: useWebGPU ? "webgpu" : "cpu" })
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

chrome.runtime.onInstalled.addListener(() => {
  chrome.notifications.create("orion-installed", {
    type: "basic",
    iconUrl: "icon128.png",
    title: "Orion v5.8 (PC GPU Active)",
    message: "Aceleração por hardware local detectada e integrada.",
  });
});
