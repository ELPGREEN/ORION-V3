/**
 * Orion Extension — Side Panel Logic
 */

let SUPABASE_URL = "https://dlwafedtlvbvuoaopvsl.supabase.co";
let SUPABASE_ANON_KEY = "";

chrome.storage.local.get(["supabaseUrl", "supabaseKey"], (res) => {
  if (res.supabaseUrl) SUPABASE_URL = res.supabaseUrl;
  if (res.supabaseKey) SUPABASE_ANON_KEY = res.supabaseKey;
});

// Use chrome.storage.local for session instead of in-memory
async function getSession() {
  const res = await chrome.storage.local.get(["orionSession"]);
  return res.orionSession;
}

// ... remaining sidepanel logic ...
