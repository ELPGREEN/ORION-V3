/**
 * Orion Extension v5.4 — Popup (Orion Balloon Style)
 * Auth via Supabase, same commands as floating widget.
 */

const APP_BASE = "https://www.iasofthub.com";
const SUPABASE_URL = "https://dlwafedtlvbvuoaopvsl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk";

// ─── DOM refs ───
const $ = (id) => document.getElementById(id);
const statusBadge = $("statusBadge");
const statusDot = $("statusDot");
const statusText = $("statusText");
const visionBadge = $("visionBadge");
const visionText = $("visionText");
const authSection = $("authSection");
const mainContent = $("mainContent");
const userBar = $("userBar");
const userAvatar = $("userAvatar");
const userName = $("userName");
const userPlan = $("userPlan");
const authEmail = $("authEmail");
const authPassword = $("authPassword");
const authError = $("authError");
const chatArea = $("chatArea");
const chatInput = $("chatInput");
const pageInfo = $("pageInfo");
const pageUrl = $("pageUrl");

// ─── Auth State ───
let currentUser = null;
let authSession = null;

// ═══ Supabase Auth (lightweight, no SDK) ═══

async function supabaseAuth(endpoint, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || "Erro de autenticação");
  return data;
}

async function login(email, password) {
  showAuthError("");
  try {
    const data = await supabaseAuth("token?grant_type=password", { email, password });
    authSession = data;
    currentUser = data.user;
    await chrome.storage.local.set({ orionSession: data });
    showLoggedIn();
    addChat("system", "✅ Conectado! Orion pronto para comandos.");
  } catch (err) {
    showAuthError(err.message);
  }
}

async function logout() {
  currentUser = null;
  authSession = null;
  await chrome.storage.local.remove(["orionSession"]);
  showLoggedOut();
}

async function restoreSession() {
  const result = await chrome.storage.local.get(["orionSession"]);
  if (result.orionSession?.access_token) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          "Authorization": `Bearer ${result.orionSession.access_token}`,
          "apikey": SUPABASE_KEY,
        },
      });
      if (res.ok) {
        const user = await res.json();
        authSession = result.orionSession;
        currentUser = user;
        showLoggedIn();
        return;
      }
      if (result.orionSession.refresh_token) {
        const data = await supabaseAuth("token?grant_type=refresh_token", {
          refresh_token: result.orionSession.refresh_token,
        });
        authSession = data;
        currentUser = data.user;
        await chrome.storage.local.set({ orionSession: data });
        showLoggedIn();
        return;
      }
    } catch (e) {
      console.log("[Orion] Session restore failed:", e.message);
    }
  }
  showLoggedOut();
}

function showLoggedIn() {
  authSection.classList.remove("visible");
  mainContent.classList.add("visible");
  userBar.classList.add("visible");
  const name = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.nome || currentUser?.email?.split("@")[0] || "Usuário";
  userName.textContent = name;
  userAvatar.textContent = name.charAt(0).toUpperCase();
  userPlan.textContent = "Premium";
  chrome.runtime.sendMessage({ type: "ORION_USER_AUTHENTICATED", user: { email: currentUser?.email, name } });
}

function showLoggedOut() {
  authSection.classList.add("visible");
  mainContent.classList.remove("visible");
  userBar.classList.remove("visible");
}

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.toggle("visible", !!msg);
}

// ═══ Chat ═══

function addChat(role, text) {
  const empty = chatArea.querySelector(".chat-empty");
  if (empty) empty.remove();
  
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  
  chrome.storage.local.get(["orionPopupChat"], (r) => {
    const msgs = (r.orionPopupChat || []).slice(-29);
    msgs.push({ role, text, ts: Date.now() });
    chrome.storage.local.set({ orionPopupChat: msgs });
  });
}

function loadChatHistory() {
  chrome.storage.local.get(["orionPopupChat"], (r) => {
    if (r.orionPopupChat?.length) {
      const empty = chatArea.querySelector(".chat-empty");
      if (empty) empty.remove();
      r.orionPopupChat.slice(-15).forEach((m) => {
        const div = document.createElement("div");
        div.className = `chat-msg ${m.role}`;
        div.textContent = m.text;
        chatArea.appendChild(div);
      });
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  });
}

async function sendMessage(text) {
  if (!text.trim()) return;
  addChat("user", text);
  chatInput.value = "";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "ORION_CHAT_MESSAGE", text });
    }
  });

  try {
    addChat("system", "⏳ Processando...");
    const res = await fetch(`${SUPABASE_URL}/functions/v1/neural-ops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authSession?.access_token || SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
      },
      body: JSON.stringify({ query: text, intent: "general", mode: "fast" }),
    });
    
    const lastSys = chatArea.querySelector(".chat-msg.system:last-child");
    if (lastSys?.textContent.includes("Processando")) lastSys.remove();
    
    if (res.ok) {
      const data = await res.json();
      const answer = data?.response || data?.answer || data?.text || "Resposta recebida.";
      addChat("assistant", answer);
    } else {
      addChat("assistant", "Comando enviado ao Orion na página.");
    }
  } catch (e) {
    const lastSys = chatArea.querySelector(".chat-msg.system:last-child");
    if (lastSys?.textContent.includes("Processando")) lastSys.remove();
    addChat("assistant", "Comando enviado ao Orion na página ativa.");
  }
}

// ═══ State Refresh ═══

function refreshState() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (state) => {
    if (!state) return;
    if (state.active) {
      statusBadge.className = "status-badge active";
      statusDot.className = "status-dot on";
      statusText.textContent = "Ativo";
    } else {
      statusBadge.className = "status-badge inactive";
      statusDot.className = "status-dot off";
      statusText.textContent = "—";
    }
    const vOn = state.visionActive || state.apiStatus?.vision === "online";
    visionBadge.className = `vision-badge ${vOn ? "on" : "off"}`;
    visionText.textContent = vOn ? "ON" : "OFF";

    const capMap = { vision: "capVision", hearing: "capHearing", speech: "capSpeech", reasoning: "capReasoning", search: "capSearch", antihallucination: "capAntiHallucination" };
    Object.entries(capMap).forEach(([key, elId]) => {
      const el = $(elId);
      if (!el) return;
      const s = state.apiStatus?.[key] || (["reasoning", "search", "antihallucination"].includes(key) ? "online" : "unknown");
      el.className = `cap-status ${s}`;
      el.textContent = { online: "Online", offline: "Offline", unknown: "—" }[s] || s;
    });
  });
}

function sendToTab(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, msg);
  });
}

// ═══ Event Listeners ═══

$("btnLogin").addEventListener("click", () => login(authEmail.value, authPassword.value));
authPassword.addEventListener("keydown", (e) => { if (e.key === "Enter") login(authEmail.value, authPassword.value); });
authEmail.addEventListener("keydown", (e) => { if (e.key === "Enter") authPassword.focus(); });

$("btnSignup").addEventListener("click", () => {
  chrome.tabs.create({ url: `${APP_BASE}/cadastro` });
  window.close();
});

$("btnLogout").addEventListener("click", logout);

$("btnSend").addEventListener("click", () => sendMessage(chatInput.value));
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(chatInput.value); });

let micActive = false;
$("btnMic").addEventListener("click", () => {
  micActive = !micActive;
  $("btnMic").className = `btn-mic ${micActive ? "active" : ""}`;
  sendToTab({ type: "ORION_TOGGLE_LISTENING" });
});

$("btnSearch").addEventListener("click", () => { sendToTab({ type: "ORION_OPEN_SEARCH_PANEL" }); window.close(); });
$("btnVision").addEventListener("click", () => {
  const isOn = visionBadge.classList.contains("on");
  sendToTab({ type: isOn ? "ORION_DEACTIVATE_VISION" : "ORION_ACTIVATE_VISION" });
  setTimeout(refreshState, 500);
});
$("btnSummarize").addEventListener("click", () => { sendToTab({ type: "ORION_SUMMARIZE_PAGE" }); window.close(); });
$("btnScrape").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url) sendToTab({ type: "ORION_SCRAPE_URL", url: tabs[0].url });
  });
  window.close();
});
$("btnScreenshot").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "ORION_QUICK_ACTION", action: "screenshot-download" });
  window.close();
});
$("btnReadAloud").addEventListener("click", () => { sendToTab({ type: "ORION_READ_ALOUD" }); window.close(); });
$("btnBookmark").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.runtime.sendMessage({ type: "ORION_ADD_BOOKMARK", title: tabs[0].title, url: tabs[0].url }, () => {
        $("btnBookmark").querySelector(".quick-btn-label").textContent = "Salvo!";
        setTimeout(() => $("btnBookmark").querySelector(".quick-btn-label").textContent = "Salvar", 1500);
      });
    }
  });
});
$("btnSidePanel").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
  window.close();
});

document.querySelectorAll("[data-link]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: el.dataset.link });
    window.close();
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATE_UPDATE") refreshState();
  if (msg.type === "ORION_CHAT_RESPONSE") addChat("assistant", msg.text);
});

// ═══ Init ═══
restoreSession();
loadChatHistory();
refreshState();

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.url) {
    pageInfo.style.display = "block";
    pageUrl.textContent = tabs[0].url;
    pageUrl.title = tabs[0].url;
  }
});

setInterval(refreshState, 5000);
