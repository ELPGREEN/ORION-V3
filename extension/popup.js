/**
 * Orion Extension v5.0 — Popup Logic
 * Web search, scraping, external links, side panel, bookmarks, downloads.
 */

const APP_BASE = "https://www.iasofthub.com";

const statusBadge = document.getElementById("statusBadge");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const wakeToggle = document.getElementById("wakeToggle");
const btnOpen = document.getElementById("btnOpen");
const btnSearch = document.getElementById("btnSearch");
const btnScrape = document.getElementById("btnScrape");
const btnSummarize = document.getElementById("btnSummarize");
const btnScreenshot = document.getElementById("btnScreenshot");
const btnReadAloud = document.getElementById("btnReadAloud");
const btnExtract = document.getElementById("btnExtract");
const btnVision = document.getElementById("btnVision");
const btnSidePanel = document.getElementById("btnSidePanel");
const btnBookmark = document.getElementById("btnBookmark");
const pageInfo = document.getElementById("pageInfo");
const pageUrl = document.getElementById("pageUrl");
const visionPill = document.getElementById("visionPill");
const visionPillText = document.getElementById("visionPillText");
const visionInfo = document.getElementById("visionInfo");
const capVisionIcon = document.getElementById("cap-vision-icon");

function refreshState() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (state) => {
    if (!state) return;
    updateUI(state);
  });
}

function updateUI(state) {
  if (state.active) {
    statusBadge.className = "status-pill active";
    statusDot.className = "dot on";
    statusText.textContent = "Ativo — " + (state.connectedTabs || 0) + " abas";
  } else {
    statusBadge.className = "status-pill inactive";
    statusDot.className = "dot off";
    statusText.textContent = "Inativo";
  }

  const isVisionOn = state.visionActive || state.apiStatus?.vision === "online";
  visionPill.className = `vision-pill ${isVisionOn ? "on" : "off"}`;
  visionPillText.textContent = isVisionOn ? "Visão ON" : "Visão OFF";
  visionInfo.className = `vision-info ${isVisionOn ? "active" : ""}`;
  capVisionIcon.className = `cap-icon ${isVisionOn ? "vision-active" : ""}`;
  btnVision.textContent = isVisionOn ? "👁 Desativar Visão" : "👁 Ativar Visão (15 min)";
  btnVision.className = `btn btn-vision ${isVisionOn ? "active" : ""}`;

  if (state.pageContext) {
    pageInfo.style.display = "block";
    pageUrl.textContent = state.pageContext.url || "";
    pageUrl.title = state.pageContext.url || "";
  }

  const caps = ["vision", "hearing", "speech", "reasoning", "search", "scraping", "antihallucination", "clipboard", "downloads", "bookmarks", "history", "tts", "notes", "readinglist"];
  caps.forEach((cap) => {
    const el = document.getElementById(`cap-${cap}`);
    if (!el) return;
    const s = state.apiStatus?.[cap] || (["antihallucination", "clipboard", "downloads", "bookmarks", "history", "tts", "notes", "readinglist"].includes(cap) ? "online" : "unknown");
    el.className = `cap-status ${s}`;
    const labels = { online: "Online", loading: "...", offline: "Offline", error: "Erro", unknown: "—" };
    el.textContent = labels[s] || s;
  });
}

// Wake Word Toggle
chrome.storage.local.get(["orionWakeWordEnabled"], (result) => {
  const enabled = result.orionWakeWordEnabled !== false;
  wakeToggle.className = enabled ? "toggle on" : "toggle";
});

wakeToggle.addEventListener("click", () => {
  const isOn = wakeToggle.classList.contains("on");
  const newState = !isOn;
  wakeToggle.className = newState ? "toggle on" : "toggle";
  chrome.storage.local.set({ orionWakeWordEnabled: newState });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { type: "ORION_TOGGLE_LISTENING" });
  });
});

// Navigation
btnOpen.addEventListener("click", () => {
  chrome.tabs.create({ url: `${APP_BASE}/consulta` });
  window.close();
});

// Side Panel
btnSidePanel.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
  window.close();
});

// Web Search
btnSearch.addEventListener("click", () => {
  sendToActiveTab({ type: "ORION_OPEN_SEARCH_PANEL" });
  window.close();
});

// Scrape
btnScrape.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url) sendToActiveTab({ type: "ORION_SCRAPE_URL", url: tabs[0].url });
  });
  window.close();
});

// Vision Toggle
btnVision.addEventListener("click", () => {
  const isOn = btnVision.classList.contains("active");
  sendToActiveTab({ type: isOn ? "ORION_DEACTIVATE_VISION" : "ORION_ACTIVATE_VISION" });
  setTimeout(refreshState, 300);
});

// Bookmark current page
btnBookmark.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.runtime.sendMessage({
        type: "ORION_ADD_BOOKMARK",
        title: tabs[0].title || "Sem título",
        url: tabs[0].url,
      }, () => {
        btnBookmark.textContent = "✅ Salvo!";
        setTimeout(() => { btnBookmark.textContent = "🔖 Bookmark"; }, 1500);
      });
    }
  });
});

function sendToActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, message);
  });
}

btnSummarize.addEventListener("click", () => { sendToActiveTab({ type: "ORION_SUMMARIZE_PAGE" }); window.close(); });

btnScreenshot.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "ORION_QUICK_ACTION", action: "screenshot-download" });
  window.close();
});

btnReadAloud.addEventListener("click", () => { sendToActiveTab({ type: "ORION_READ_ALOUD" }); window.close(); });
btnExtract.addEventListener("click", () => { sendToActiveTab({ type: "ORION_EXTRACT_STRUCTURED" }); window.close(); });

// Quick Links
document.querySelectorAll(".quick-link[data-link]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const linkKey = el.dataset.link;
    chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey }, () => {
      window.close();
    });
  });
});

// Listen for state updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STATE_UPDATE") updateUI(message.state);
});

// Init
refreshState();
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.url) {
    pageInfo.style.display = "block";
    pageUrl.textContent = tabs[0].url;
    pageUrl.title = tabs[0].url;
  }
});
setInterval(refreshState, 3000);