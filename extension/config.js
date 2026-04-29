/**
 * Orion Extension — Secure Config
 * Credentials are injected by the main app via chrome.storage, not hardcoded.
 */

const APP_BASE = "https://www.iasofthub.com";
const CONFIG_STORAGE_KEY = "orion_supabase_config";

let _configCache = null;

/**
 * Get Supabase config — tries cache → storage → main app bridge → fallback
 */
export async function getSupabaseConfig() {
  if (_configCache) return _configCache;

  try {
    // 1. Try chrome.storage (injected by main app)
    const stored = await chrome.storage.local.get([CONFIG_STORAGE_KEY]);
    if (stored[CONFIG_STORAGE_KEY]) {
      _configCache = stored[CONFIG_STORAGE_KEY];
      return _configCache;
    }

    // 2. Try fetching from main app
    const resp = await fetch(`${APP_BASE}/api/config`, { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      _configCache = await resp.json();
      await chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: _configCache });
      return _configCache;
    }

    // 3. Try messaging main app's content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url?.includes("iasofthub.com")) {
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { type: "ORION_GET_CONFIG" }, (resp) => {
          if (resp?.supabaseUrl && resp?.supabaseAnonKey) {
            _configCache = { url: resp.supabaseUrl, key: resp.supabaseAnonKey };
            chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: _configCache });
            resolve(_configCache);
          } else {
            resolve(getFallbackConfig());
          }
        });
      });
    }
  } catch {
    // Silent fail → fallback
  }

  return getFallbackConfig();
}

/**
 * Fallback config — used only if all other methods fail.
 * This is the anon key (safe to embed, RLS-protected).
 */
function getFallbackConfig() {
  return {
    url: "https://dlwafedtlvbvuoaopvsl.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk",
  };
}

/**
 * Receive config pushed from main app
 */
export function receiveConfig(config) {
  _configCache = config;
  chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: config });
}

export { APP_BASE };
