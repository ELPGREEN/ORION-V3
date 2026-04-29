/**
 * Orion Extension v5.6 — Popup
 */
let SUPABASE_URL = "https://dlwafedtlvbvuoaopvsl.supabase.co";
let SUPABASE_KEY = "";

chrome.storage.local.get(["supabaseUrl", "supabaseKey"], (res) => {
  if (res.supabaseUrl) SUPABASE_URL = res.supabaseUrl;
  if (res.supabaseKey) SUPABASE_KEY = res.supabaseKey;
  initApp();
});

function initApp() {
  console.log("[Orion] Popup initialized with secure storage.");
  // ... login and UI logic ...
}

async function login(email, password) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.access_token) {
      chrome.storage.local.set({ orionSession: data });
      chrome.runtime.sendMessage({ type: "UPDATE_CONFIG", supabaseKey: SUPABASE_KEY });
      return { ok: true };
    }
    return { ok: false, error: data.error_description || "Erro de login" };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
