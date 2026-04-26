/**
 * Orion Extension v5.6 — Background Service Worker
 * Full integration with OpenRouter, OpenCode, and NemoClaw.
 *
 * SECURITY: Integrated Policy Guard (NemoClaw Style)
 * ARCHITECTURE: Blueprint System (OpenCode Aligned)
 * INTELLIGENCE: Quantum Inference Routing (OpenRouter optimized)
 * PROACTIVITY: Lifecycle Monitoring
 */

import { validateAction } from "./policies.js";
import { classifyActionToTask, getBlueprint } from "./agents.js";
import { routeQuery } from "./router.js";
import { onTabUpdated } from "./proactive.js";

const SUPABASE_URL = "https://dlwafedtlvbvuoaopvsl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk";

// State
let orionState = {
  active: false,
  visionActive: false,
  apiStatus: { vision: "online", reasoning: "online", search: "online", openrouter: "online" },
};

// ═══ Proactive Listeners ═══
chrome.tabs.onUpdated.addListener(onTabUpdated);

// ═══ Policy Enforcement Helper ═══
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

// ═══ Message Handling ═══
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "ORION_QUICK_ACTION":
        const taskType = classifyActionToTask(message.action, message.data);
        const blueprint = getBlueprint(taskType);
        const routing = routeQuery(taskType, message.data?.query || message.data?.text);

        if (await secureAction(message.action, sender.tab, message.data)) {
          console.log(`[Orion Dispatch] Agent: ${blueprint.label} | Model: ${routing.provider} | Complexity: ${routing.complexity}`);

          // Delegate to Supabase Edge Function for API calls to OpenRouter
          const result = await callOrionAI(message.action, message.data, routing.provider);
          sendResponse({ ...result, blueprint, routing });
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
 * Calls the Orion AI Orchestrator Edge Function.
 */
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

// ═══ Installation ═══
chrome.runtime.onInstalled.addListener(() => {
  chrome.notifications.create("orion-installed", {
    type: "basic",
    iconUrl: "icon128.png",
    title: "Orion v5.6 (OpenCode Edition)",
    message: "OpenRouter & NemoClaw integrados com sucesso.",
  });
});
