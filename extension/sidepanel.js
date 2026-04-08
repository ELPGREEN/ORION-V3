/**
 * Orion Extension v5.0 — Side Panel Logic
 * Full-featured chat, tools, notes, bookmarks, history integration.
 */

const messagesEl = document.getElementById("sp-messages");
const chatInput = document.getElementById("sp-chat-input");
const sendBtn = document.getElementById("sp-send-btn");
const statusBadge = document.getElementById("sp-status-badge");
const visionBadge = document.getElementById("sp-vision-badge");
const capsEl = document.getElementById("sp-caps");
const notesList = document.getElementById("sp-notes-list");
const webSearchInput = document.getElementById("sp-web-search");
const bookmarkSearchInput = document.getElementById("sp-bookmark-search");
const historySearchInput = document.getElementById("sp-history-search");
const searchResultsEl = document.getElementById("sp-search-results");
const bookmarkResultsEl = document.getElementById("sp-bookmark-results");
const historyResultsEl = document.getElementById("sp-history-results");

// ─── Tab Navigation ───
document.querySelectorAll(".sp-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".sp-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".sp-tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    if (tab.dataset.tab === "notes") loadNotes();
  });
});

// ─── Chat ───
function addMessage(text, role = "assistant") {
  const msg = document.createElement("div");
  msg.className = `sp-msg ${role}`;
  msg.textContent = text;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
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

function sendQuery(query) {
  if (!query.trim()) return;
  addMessage(query, "user");
  addThinking();
  chrome.runtime.sendMessage(
    { type: "ORION_AI_QUERY", query, context: {} },
    (response) => {
      removeThinking();
      if (response?.result?.response) {
        addMessage(response.result.response, "assistant");
      } else if (response?.result?.fallback) {
        addMessage("Processando na interface principal...", "system");
        chrome.runtime.sendMessage({ type: "OPEN_ORION_APP" });
      } else if (response?.error) {
        addMessage("Erro: " + response.error, "system");
      }
    }
  );
}

sendBtn.addEventListener("click", () => {
  const q = chatInput.value.trim();
  if (q) { sendQuery(q); chatInput.value = ""; }
});
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { sendBtn.click(); e.preventDefault(); }
});

// ─── Tools ───
document.querySelectorAll(".sp-tool-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tool = btn.dataset.tool;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      switch (tool) {
        case "summarize": chrome.tabs.sendMessage(tabId, { type: "ORION_SUMMARIZE_PAGE" }); break;
        case "analyze": chrome.tabs.sendMessage(tabId, { type: "ORION_EXTRACT_PAGE" }); break;
        case "vision": chrome.tabs.sendMessage(tabId, { type: "ORION_ACTIVATE_VISION" }); break;
        case "screenshot":
          chrome.runtime.sendMessage({ type: "ORION_QUICK_ACTION", action: "screenshot-download" });
          break;
        case "read": chrome.tabs.sendMessage(tabId, { type: "ORION_READ_ALOUD" }); break;
        case "extract": chrome.tabs.sendMessage(tabId, { type: "ORION_EXTRACT_STRUCTURED" }); break;
        case "scrape": chrome.tabs.sendMessage(tabId, { type: "ORION_SCRAPE_URL", url: tabs[0]?.url }); break;
        case "translate": chrome.tabs.sendMessage(tabId, { type: "ORION_TRANSLATE", targetLang: "en" }); break;
      }
    });
  });
});

// ─── Web Search ───
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

// ─── Notes ───
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
          <span>${new Date(n.createdAt).toLocaleDateString("pt-BR")} ${new Date(n.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          <button class="sp-note-delete" data-note-id="${n.id}">✕ Excluir</button>
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

// ─── Links ───
document.querySelectorAll("[data-link]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: el.dataset.link });
  });
});

// ─── State Update ───
function refreshState() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (state) => {
    if (!state) return;
    statusBadge.className = `sp-badge ${state.active ? "on" : "off"}`;
    statusBadge.textContent = state.active ? `● Ativo — ${state.connectedTabs || 0} abas` : "● Inativo";
    visionBadge.className = `sp-badge ${state.visionActive ? "vision" : "off"}`;
    visionBadge.textContent = state.visionActive ? "👁 Visão ON" : "👁 Visão OFF";

    // Update capabilities
    const allCaps = [
      { key: "vision", icon: "👁", name: "Visão" },
      { key: "search", icon: "🔍", name: "Pesquisa Web" },
      { key: "scraping", icon: "🕸", name: "Scraping" },
      { key: "hearing", icon: "🎤", name: "Audição" },
      { key: "speech", icon: "🗣", name: "Fala" },
      { key: "reasoning", icon: "🧠", name: "Raciocínio" },
      { key: "clipboard", icon: "📋", name: "Clipboard" },
      { key: "downloads", icon: "📥", name: "Downloads" },
      { key: "bookmarks", icon: "🔖", name: "Bookmarks" },
      { key: "history", icon: "🕐", name: "Histórico" },
      { key: "tts", icon: "🔊", name: "TTS Chrome" },
      { key: "notes", icon: "📝", name: "Notas" },
    ];
    capsEl.innerHTML = allCaps.map((c) => {
      const s = state.apiStatus?.[c.key] || "online";
      return `<div class="sp-cap-row"><span class="sp-cap-name">${c.icon} ${c.name}</span><span class="sp-cap-status ${s}">${s === "online" ? "Online" : s === "offline" ? "Offline" : "—"}</span></div>`;
    }).join("");
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STATE_UPDATE") refreshState();
});

function escapeHtml(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escapeAttr(s) { return (s || "").replace(/'/g, "\\'").replace(/"/g, "&quot;"); }

// Init
refreshState();
setInterval(refreshState, 5000);
chatInput.focus();