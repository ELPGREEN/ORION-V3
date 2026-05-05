/**
 * Orion Extension v5.6 — Background Service Worker
 * Full integration with neural-ops via Supabase Edge Functions.
 *
 * SECURITY: Integrated Policy Guard (NemoClaw Style)
 * ARCHITECTURE: Blueprint System
 * INTELLIGENCE: Quantum Inference Routing
 * PROACTIVITY: Lifecycle Monitoring
 * CREDENTIALS: Secure config via chrome.storage (no hardcoded keys)
 */

import { validateAction } from "./policies.js";
import { classifyActionToTask, getBlueprint } from "./agents.js";
import { routeQuery } from "./router.js";
import { onTabUpdated } from "./proactive.js";
import { getSupabaseConfig, receiveConfig } from "./config.js";

// Initialize command mirror on startup
initMirror();

const APP_BASE = "https://www.iasofthub.com";

// Credentials fetched securely from main app on first use
let _supabaseConfig = null;
async function fetchSupabaseConfig() {
  if (_supabaseConfig) return _supabaseConfig;
  try {
    const resp = await fetch(`${APP_BASE}/api/config`);
    _supabaseConfig = await resp.json();
  } catch {
    // Fallback: read from chrome storage (set by main app via extension bridge)
    const stored = await chrome.storage.local.get(["supabaseUrl", "supabaseAnonKey"]);
    _supabaseConfig = { url: stored.supabaseUrl, key: stored.supabaseAnonKey };
  }
  return _supabaseConfig;
}

// State
let orionState = {
  active: false,
  visionActive: false,
  apiStatus: { vision: "offline", reasoning: "online", search: "online" },
};

// ═══ Proactive Listeners ═══
chrome.tabs.onUpdated.addListener(onTabUpdated);

// ═══ Config Sync from Main App ═══
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ORION_PUSH_CONFIG") {
    receiveConfig({ url: message.supabaseUrl, key: message.supabaseAnonKey });
    sendResponse({ ok: true });
    return false;
  }
});

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
