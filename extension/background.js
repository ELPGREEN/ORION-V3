/**
 * Orion Extension v5.5 — Background Service Worker
 * Full integration with neural-ops via Supabase Edge Functions.
 *
 * SECURITY: Integrated Policy Guard (NemoClaw Style)
 * ARCHITECTURE: Blueprint System
 * INTELLIGENCE: Quantum Inference Routing
 * PROACTIVITY: Lifecycle Monitoring
 */

import { validateAction } from "./policies.js";
import { classifyActionToTask, getBlueprint } from "./agents.js";
import { routeQuery } from "./router.js";
import { onTabUpdated } from "./proactive.js";

const APP_BASE = "https://www.iasofthub.com";
const SUPABASE_URL = "https://dlwafedtlvbvuoaopvsl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk";

// State
let orionState = {
  active: false,
  visionActive: false,
  apiStatus: { vision: "offline", reasoning: "online", search: "online" },
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
          const result = await handleQuickAction(message.action, message.data, sender.tab, routing.provider);
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

async function handleQuickAction(action, data, tab, provider) {
  return { ok: true, provider };
}

// ═══ Installation ═══
chrome.runtime.onInstalled.addListener(() => {
  chrome.notifications.create("orion-installed", {
    type: "basic",
    iconUrl: "icon128.png",
    title: "Orion v5.5 Instalado!",
    message: "Habilidades Proativas & Policy Guard ativos.",
  });
});
