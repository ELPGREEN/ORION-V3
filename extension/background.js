/**
 * Orion Extension v5.6 — Background Service Worker
 * Mirror of Neurocore Orchestrator.
 */

import { validateAction } from "./policies.js";
import { classifyActionToTask, getBlueprint } from "./agents.js";
import { routeQuery } from "./router.js";
import { onTabUpdated } from "./proactive.js";

// Config (Protected)
let config = {
  supabaseUrl: "https://dlwafedtlvbvuoaopvsl.supabase.co",
  supabaseKey: ""
};

// State
let orionState = {
  active: false,
  visionActive: false,
  apiStatus: { vision: "offline", reasoning: "online", search: "online" },
};

// Initialize config from storage
chrome.storage.local.get(["supabaseUrl", "supabaseKey"], (res) => {
  if (res.supabaseUrl) config.supabaseUrl = res.supabaseUrl;
  if (res.supabaseKey) config.supabaseKey = res.supabaseKey;
  console.log("[Orion] Config loaded from storage.");
});

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
        if (!config.supabaseKey) {
          sendResponse({ error: "Supabase Key not configured. Please login via popup." });
          return;
        }
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
      case "UPDATE_CONFIG":
        if (message.supabaseKey) config.supabaseKey = message.supabaseKey;
        if (message.supabaseUrl) config.supabaseUrl = message.supabaseUrl;
        chrome.storage.local.set(message);
        sendResponse({ ok: true });
        break;
    }
  })();
  return true;
});

async function handleQuickAction(action, data, tab, provider) {
  // Mirror main app edge function logic here
  return { ok: true, provider };
}

// ═══ Installation ═══
chrome.runtime.onInstalled.addListener(() => {
  chrome.notifications.create("orion-installed", {
    type: "basic",
    iconUrl: "icon128.png",
    title: "Orion v5.6 Instalado!",
    message: "Habilidades Proativas & Mirror de Comandos ativos.",
  });
});
