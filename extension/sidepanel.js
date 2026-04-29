/**
 * Orion Extension v5.6 — Side Panel Logic
 * Accordion layout, voice commands, media, search, notes, bookmarks, history.
 * Credentials: Secure config via chrome.storage (no hardcoded keys)
 */

import { getSupabaseConfig, APP_BASE } from "./config.js";

let SUPABASE_URL, SUPABASE_ANON_KEY;

// Lazy init credentials
async function ensureConfig() {
  if (SUPABASE_URL) return;
  const cfg = await getSupabaseConfig();
  SUPABASE_URL = cfg.url;
  SUPABASE_ANON_KEY = cfg.key;
}

// ─── DOM ───
const messagesEl = document.getElementById("sp-messages");
const chatInput = document.getElementById("sp-chat-input");
const sendBtn = document.getElementById("sp-send-btn");
const micBtn = document.getElementById("sp-mic-btn");
const micBadge = document.getElementById("sp-mic-badge");
const statusBadge = document.getElementById("sp-status-badge");
const visionBadge = document.getElementById("sp-vision-badge");
const capsEl = document.getElementById("sp-caps");
const notesList = document.getElementById("sp-notes-list");
const webSearchInput = document.getElementById("sp-web-search");
const bookmarkSearchInput = document.getElementById("sp-bookmark-search");
const historySearchInput = document.getElementById("sp-history-search");
const mediaSearchInput = document.getElementById("sp-media-search");
const searchResultsEl = document.getElementById("sp-search-results");
const bookmarkResultsEl = document.getElementById("sp-bookmark-results");
const historyResultsEl = document.getElementById("sp-history-results");
const mediaResultsEl = document.getElementById("sp-media-results");
const loginPanel = document.getElementById("sp-login-panel");
const bodyEl = document.getElementById("sp-body");
const accountInfo = document.getElementById("sp-account-info");
const logoutBtn = document.getElementById("sp-logout-btn");

let authSession = null;
let voiceRecognition = null;
let isListening = false;

// ═══════════════════════════════════════════════════
// ─── Accordion Navigation ───
// ═══════════════════════════════════════════════════
document.querySelectorAll(".sp-accordion-header").forEach((header) => {
  header.addEventListener("click", () => {
    const acc = header.parentElement;
    acc.classList.toggle("open");
  });
});

// ═══════════════════════════════════════════════════
// ─── Auth ───
// ═══════════════════════════════════════════════════
async function supabaseAuth(endpoint, body) {
  await ensureConfig();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error_description || e.msg || "Erro de autenticação"); }
  return res.json();
}

async function checkSession() {
  const stored = await chrome.storage.local.get(["orionSession"]);
  if (stored.orionSession?.access_token) {
    authSession = stored.orionSession;
    showLoggedIn();
  } else {
    showLoginForm();
  }
}

function showLoginForm() {
  loginPanel.style.display = "block";
  bodyEl.style.display = "none";
}

function showLoggedIn() {
  loginPanel.style.display = "none";
  bodyEl.style.display = "block";
  accountInfo.textContent = authSession?.user?.email || "Autenticado";
  logoutBtn.style.display = "inline-block";
}

document.getElementById("sp-login-btn").addEventListener("click", async () => {
  const email = document.getElementById("sp-login-email").value.trim();
  const pass = document.getElementById("sp-login-pass").value;
  const msg = document.getElementById("sp-login-msg");
  if (!email || !pass) { msg.textContent = "Preencha email e senha"; return; }
  msg.textContent = "Entrando...";
  try {
    const data = await supabaseAuth("token?grant_type=password", { email, password: pass });
    authSession = data;
    await chrome.storage.local.set({ orionSession: data });
    showLoggedIn();
  } catch (e) { msg.textContent = e.message; }
});

logoutBtn.addEventListener("click", async () => {
  authSession = null;
  await chrome.storage.local.remove(["orionSession"]);
  showLoginForm();
});

// ═══════════════════════════════════════════════════
// ─── Chat ───
// ═══════════════════════════════════════════════════
function addMessage(text, role = "assistant") {
  const msg = document.createElement("div");
  msg.className = `sp-msg ${role}`;
  msg.textContent = text;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  // Auto-open chat accordion
  document.getElementById("acc-chat").classList.add("open");
}

function addThinking() {
  const msg = document.createElement("div");
  msg.className = "sp-msg system";
  msg.id = "sp-thinking";
  msg.textContent = "⏳ Processando...";
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeThinking() {
  const el = document.getElementById("sp-thinking");
  if (el) el.remove();
}

// ═══════════════════════════════════════════════════
// ─── Smart Command Router ───
// ═══════════════════════════════════════════════════
function classifyCommand(text) {
  const t = text.toLowerCase().trim();

  // Media patterns
  if (/\b(m[uú]sica|tocar?|play|reproduz|ouvir|escutar|cantar?|playlist|álbum|album|spotify|som\s+d[oae])\b/i.test(t)) {
    return { intent: "media", type: "music", query: extractMediaQuery(t) };
  }
  if (/\b(v[ií]deo|youtube|assistir|filme|trailer|clip)\b/i.test(t)) {
    return { intent: "media", type: "video", query: extractMediaQuery(t) };
  }
  if (/\b(busc|procur|pesquis|encontr)\w*\s+(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o)/i.test(t)) {
    const isVideo = /v[ií]deo/i.test(t);
    return { intent: "media", type: isVideo ? "video" : "music", query: extractMediaQuery(t) };
  }

  // Web search
  if (/\b(pesquis|busc|procur|search|google)\w*\s+/i.test(t) && !/m[uú]sica|v[ií]deo/i.test(t)) {
    return { intent: "search", query: t.replace(/^(?:pesquis|busc|procur|search|google)\w*\s+/i, "").trim() || t };
  }

  // Navigation
  if (/\b(abr[aei]?r?|ir\s+para?|navegar?|acessar?)\s+(dashboard|painel|chat|documentos?|processos?|clientes?|agenda|financeiro|loja)\b/i.test(t)) {
    const m = t.match(/\b(dashboard|painel|chat|documentos?|processos?|clientes?|agenda|financeiro|loja)\b/i);
    return { intent: "navigate", target: m ? m[1] : "" };
  }

  // Tools
  if (/\b(resum|sumari)\w*/i.test(t)) return { intent: "tool", tool: "summarize" };
  if (/\b(analis|examin)\w*/i.test(t)) return { intent: "tool", tool: "analyze" };
  if (/\b(captur|screenshot|print)\w*/i.test(t)) return { intent: "tool", tool: "screenshot" };
  if (/\b(l[eê]r?|ler?\s+(?:em\s+voz|alto)|read\s+aloud)\b/i.test(t)) return { intent: "tool", tool: "read" };
  if (/\b(traduz|translat)\w*/i.test(t)) return { intent: "tool", tool: "translate" };
  if (/\b(extra[ií]r?|scrap)\w*/i.test(t)) return { intent: "tool", tool: "extract" };
  if (/\b(vis[aã]o|vision)\b/i.test(t)) return { intent: "tool", tool: "vision" };

  return { intent: "chat", query: t };
}

function extractMediaQuery(text) {
  let q = text
    .replace(/^(?:orion|órion)[,.]?\s*/i, "")
    .replace(/^(?:abr[aei]?r?|tocar?|play|reproduz\w*|ouvir?|escutar?|assistir?|colocar?|busc\w*|procur\w*|pesquis\w*|encontr\w*)\s+/i, "")
    .replace(/^(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o|playlist|álbum|album)\s+/i, "")
    .replace(/^(?:d[oae]\s+|d[oa]\s+banda\s+|d[oa]\s+cantor\w*\s+|d[oa]\s+artista\s+|d[oa]\s+grupo\s+)/i, "")
    .replace(/^(?:no\s+youtube|no\s+spotify)\s*/i, "")
    .trim();
  return q || text;
}

function processCommand(text) {
  if (!text.trim()) return;
  addMessage(text, "user");
  const cmd = classifyCommand(text);

  switch (cmd.intent) {
    case "media":
      handleMedia(cmd);
      break;
    case "search":
      handleWebSearch(cmd.query);
      break;
    case "navigate":
      handleNavigation(cmd.target);
      break;
    case "tool":
      handleTool(cmd.tool);
      break;
    default:
      handleChat(text);
  }
}

// ─── Media Handler ───
function handleMedia(cmd) {
  const query = cmd.query;
  addMessage(`🎵 Buscando: "${query}"...`, "system");

  if (cmd.type === "video") {
    // Open YouTube search
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url });
    addMessage(`▶️ Abrindo busca de vídeo: "${query}"`, "assistant");
  } else {
    // Try YouTube Music first, then YouTube
    const url = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url });
    addMessage(`🎶 Abrindo música: "${query}"`, "assistant");
  }
}

// ─── Web Search Handler ───
function handleWebSearch(query) {
  addMessage(`🔍 Pesquisando: "${query}"...`, "system");

  // Open in a real search tab
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  chrome.tabs.create({ url });
  addMessage(`🌐 Pesquisa aberta: "${query}"`, "assistant");

  // Also try edge function for inline results
  if (authSession?.access_token) {
    ensureConfig().then(() =>
      fetch(`${SUPABASE_URL}/functions/v1/pesquisa-unificada`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ query, sources: ["web"], max_results: 3 }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.results?.length > 0) {
            const summary = data.results.slice(0, 3).map((r, i) => `${i + 1}. ${r.title}`).join("\n");
            addMessage(`📋 Resultados:\n${summary}`, "assistant");
          }
        })
        .catch(() => {})
    );
  }
}

// ─── Navigation Handler ───
function handleNavigation(target) {
  const routes = {
    dashboard: "/dashboard", painel: "/dashboard", chat: "/dashboard/chat-ia",
    documentos: "/dashboard/documentos", documento: "/dashboard/documentos",
    processos: "/dashboard/processos", processo: "/dashboard/processos",
    clientes: "/dashboard/clientes", cliente: "/dashboard/clientes",
    agenda: "/dashboard/agenda", financeiro: "/dashboard/financeiro",
    loja: "/loja",
  };
  const path = routes[target.toLowerCase()] || "/dashboard";
  chrome.tabs.create({ url: `https://www.iasofthub.com${path}` });
  addMessage(`🔗 Abrindo: ${target}`, "assistant");
}

// ─── Tool Handler ───
function handleTool(tool) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) { addMessage("Nenhuma aba ativa encontrada.", "system"); return; }
    const toolMessages = {
      summarize: { type: "ORION_SUMMARIZE_PAGE", label: "📝 Resumindo página..." },
      analyze: { type: "ORION_EXTRACT_PAGE", label: "🔎 Analisando página..." },
      vision: { type: "ORION_ACTIVATE_VISION", label: "👁 Ativando visão..." },
      screenshot: null,
      read: { type: "ORION_READ_ALOUD", label: "🔊 Lendo em voz alta..." },
      extract: { type: "ORION_EXTRACT_STRUCTURED", label: "📊 Extraindo dados..." },
      translate: { type: "ORION_TRANSLATE", label: "🌐 Traduzindo..." },
    };

    if (tool === "screenshot") {
      chrome.runtime.sendMessage({ type: "ORION_QUICK_ACTION", action: "screenshot-download" });
      addMessage("📸 Captura de tela salva!", "assistant");
      return;
    }

    const tm = toolMessages[tool];
    if (tm) {
      addMessage(tm.label, "system");
      chrome.tabs.sendMessage(tabId, { type: tm.type });
    }
  });
}

// ─── Chat Handler (AI) ───
function handleChat(text) {
  addThinking();
  chrome.runtime.sendMessage({ type: "ORION_AI_QUERY", query: text, context: {} }, (response) => {
    removeThinking();
    if (response?.result?.response) {
      addMessage(response.result.response, "assistant");
    } else if (response?.error) {
      addMessage("Erro: " + response.error, "system");
    } else {
      addMessage("Sem resposta do servidor.", "system");
    }
  });
}

// ═══════════════════════════════════════════════════
// ─── Send / Input ───
// ═══════════════════════════════════════════════════
sendBtn.addEventListener("click", () => {
  const q = chatInput.value.trim();
  if (q) { processCommand(q); chatInput.value = ""; }
});
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { sendBtn.click(); e.preventDefault(); }
});

// ═══════════════════════════════════════════════════
// ─── Voice Commands ───
// ═══════════════════════════════════════════════════
function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { addMessage("Reconhecimento de voz não suportado.", "system"); return; }

  if (isListening && voiceRecognition) {
    voiceRecognition.stop();
    isListening = false;
    micBtn.classList.remove("active");
    micBadge.classList.remove("active");
    micBadge.textContent = "🎤 Voz OFF";
    return;
  }

  voiceRecognition = new SR();
  voiceRecognition.lang = "pt-BR";
  voiceRecognition.continuous = true;
  voiceRecognition.interimResults = false;

  voiceRecognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("active");
    micBadge.classList.add("active");
    micBadge.textContent = "🎤 Ouvindo...";
  };

  voiceRecognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    if (last.isFinal) {
      let transcript = last[0].transcript.trim();
      // Dedup concatenated phrases
      const half = Math.floor(transcript.length / 2);
      if (transcript.length > 10 && transcript.substring(0, half) === transcript.substring(half)) {
        transcript = transcript.substring(0, half);
      }
      // Check for wake word or direct command
      const wakeMatch = transcript.match(/(?:orion|órion)[,.]?\s+(.+)/i);
      const command = wakeMatch ? wakeMatch[1].trim() : transcript;
      if (command) processCommand(command);
    }
  };

  voiceRecognition.onerror = (e) => {
    if (e.error !== "no-speech" && e.error !== "aborted") {
      console.warn("[Orion SP] Voice error:", e.error);
    }
  };

  voiceRecognition.onend = () => {
    if (isListening) {
      try { voiceRecognition.start(); } catch (e) {}
    }
  };

  voiceRecognition.start();
}

micBtn.addEventListener("click", startVoice);
micBadge.addEventListener("click", startVoice);

// ═══════════════════════════════════════════════════
// ─── Tools Grid Handlers ───
// ═══════════════════════════════════════════════════
document.querySelectorAll(".sp-tool-btn[data-tool]").forEach((btn) => {
  btn.addEventListener("click", () => handleTool(btn.dataset.tool));
});

// ─── Media Buttons ───
document.querySelectorAll(".sp-tool-btn[data-action]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    switch (action) {
      case "music":
        chrome.tabs.create({ url: "https://music.youtube.com" });
        break;
      case "video":
        chrome.tabs.create({ url: "https://www.youtube.com" });
        break;
      case "youtube":
        chrome.tabs.create({ url: "https://www.youtube.com" });
        break;
      case "spotify":
        chrome.tabs.create({ url: "https://open.spotify.com" });
        break;
    }
  });
});

// ─── Media Search ───
let mediaTimeout;
mediaSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = mediaSearchInput.value.trim();
    if (q) {
      handleMedia({ type: "music", query: q });
      mediaSearchInput.value = "";
    }
  }
});

// ═══════════════════════════════════════════════════
// ─── Web Search ───
// ═══════════════════════════════════════════════════
let searchTimeout;
webSearchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const q = webSearchInput.value.trim();
    if (q.length < 3) { searchResultsEl.innerHTML = ""; return; }
    searchResultsEl.innerHTML = '<div class="sp-empty">Pesquisando...</div>';
    chrome.runtime.sendMessage({ type: "ORION_WEB_SEARCH_REQUEST", query: q }, (response) => {
      if (response?.result?.results?.length > 0) {
        searchResultsEl.innerHTML = response.result.results.map((r) =>
          `<div class="sp-result-item" onclick="window.open('${escapeAttr(r.url)}','_blank')">
            <div class="sp-result-title">${escapeHtml(r.title || "Sem título")}</div>
            <div class="sp-result-url">${escapeHtml(r.url || "")}</div>
          </div>`
        ).join("");
      } else {
        searchResultsEl.innerHTML = '<div class="sp-empty">Nenhum resultado</div>';
      }
    });
  }, 500);
});

// ─── Bookmark Search ───
bookmarkSearchInput.addEventListener("input", () => {
  const q = bookmarkSearchInput.value.trim();
  if (q.length < 2) { bookmarkResultsEl.innerHTML = ""; return; }
  chrome.runtime.sendMessage({ type: "ORION_SEARCH_BOOKMARKS", query: q }, (response) => {
    if (response?.bookmarks?.length > 0) {
      bookmarkResultsEl.innerHTML = response.bookmarks.map((b) =>
        `<div class="sp-result-item" onclick="window.open('${escapeAttr(b.url)}','_blank')">
          <div class="sp-result-title">${escapeHtml(b.title || "Sem título")}</div>
          <div class="sp-result-url">${escapeHtml(b.url || "")}</div>
        </div>`
      ).join("");
    } else {
      bookmarkResultsEl.innerHTML = '<div class="sp-empty">Nenhum favorito encontrado</div>';
    }
  });
});

// ─── History Search ───
historySearchInput.addEventListener("input", () => {
  const q = historySearchInput.value.trim();
  if (q.length < 2) { historyResultsEl.innerHTML = ""; return; }
  chrome.runtime.sendMessage({ type: "ORION_SEARCH_HISTORY", query: q }, (response) => {
    if (response?.history?.length > 0) {
      historyResultsEl.innerHTML = response.history.map((h) =>
        `<div class="sp-result-item" onclick="window.open('${escapeAttr(h.url)}','_blank')">
          <div class="sp-result-title">${escapeHtml(h.title || "Sem título")}</div>
          <div class="sp-result-url">${escapeHtml(h.url || "")}</div>
        </div>`
      ).join("");
    } else {
      historyResultsEl.innerHTML = '<div class="sp-empty">Nenhum resultado</div>';
    }
  });
});

// ═══════════════════════════════════════════════════
// ─── Notes ───
// ═══════════════════════════════════════════════════
function loadNotes() {
  chrome.runtime.sendMessage({ type: "ORION_GET_NOTES" }, (response) => {
    const notes = response?.notes || [];
    if (notes.length === 0) {
      notesList.innerHTML = '<div class="sp-empty">Nenhuma nota salva.<br>Selecione texto → botão direito → "Orion: Salvar como nota"</div>';
      return;
    }
    notesList.innerHTML = notes.map((n) =>
      `<div class="sp-note-item">
        <div class="sp-note-text">${escapeHtml(n.text.substring(0, 300))}${n.text.length > 300 ? "..." : ""}</div>
        <div class="sp-note-meta">
          <span>${n.pageTitle ? escapeHtml(n.pageTitle.substring(0, 40)) : "—"}</span>
          <span>${new Date(n.createdAt).toLocaleDateString("pt-BR")}</span>
          <button class="sp-note-delete" data-note-id="${n.id}">✕</button>
        </div>
      </div>`
    ).join("");
    notesList.querySelectorAll(".sp-note-delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "ORION_DELETE_NOTE", noteId: btn.dataset.noteId }, () => loadNotes());
      });
    });
  });
}

// ═══════════════════════════════════════════════════
// ─── Links ───
// ═══════════════════════════════════════════════════
document.querySelectorAll("[data-link]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: el.dataset.link });
  });
});

// ═══════════════════════════════════════════════════
// ─── State Update ───
// ═══════════════════════════════════════════════════
function refreshState() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (state) => {
    if (!state) return;
    statusBadge.className = `sp-badge ${state.active ? "on" : "off"}`;
    statusBadge.textContent = state.active ? `● Ativo — ${state.connectedTabs || 0} abas` : "● Inativo";
    visionBadge.className = `sp-badge ${state.visionActive ? "vision" : "off"}`;
    visionBadge.textContent = state.visionActive ? "👁 Visão ON" : "👁 Visão OFF";

    const allCaps = [
      { key: "vision", icon: "👁", name: "Visão" },
      { key: "search", icon: "🔍", name: "Pesquisa" },
      { key: "scraping", icon: "🕸", name: "Scraping" },
      { key: "hearing", icon: "🎤", name: "Audição" },
      { key: "speech", icon: "🗣", name: "Fala" },
      { key: "reasoning", icon: "🧠", name: "Raciocínio" },
      { key: "clipboard", icon: "📋", name: "Clipboard" },
      { key: "downloads", icon: "📥", name: "Downloads" },
      { key: "bookmarks", icon: "🔖", name: "Bookmarks" },
      { key: "history", icon: "🕐", name: "Histórico" },
      { key: "tts", icon: "🔊", name: "TTS" },
      { key: "notes", icon: "📝", name: "Notas" },
    ];
    capsEl.innerHTML = allCaps.map((c) => {
      const s = state.apiStatus?.[c.key] || "online";
      return `<div class="sp-cap-row"><span class="sp-cap-name"><span class="sp-cap-dot ${s}"></span>${c.icon} ${c.name}</span><span class="sp-cap-status ${s}">${s === "online" ? "Online" : "Offline"}</span></div>`;
    }).join("");
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STATE_UPDATE") refreshState();
});

// ═══════════════════════════════════════════════════
// ─── Utils ───
// ═══════════════════════════════════════════════════
function escapeHtml(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escapeAttr(s) { return (s || "").replace(/'/g, "\\'").replace(/"/g, "&quot;"); }

// ═══════════════════════════════════════════════════
// ─── Init ───
// ═══════════════════════════════════════════════════
checkSession();
refreshState();
setInterval(refreshState, 5000);
chatInput.focus();

// Auto-load notes when notes accordion opens
document.querySelector("#acc-notes .sp-accordion-header").addEventListener("click", loadNotes);
