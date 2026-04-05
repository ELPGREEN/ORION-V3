/**
 * Orion Extension v2.0 — Popup Logic
 * Connects to iasofthub.com and neural-ops for real AI queries.
 */

const APP_BASE = "https://www.iasofthub.com";

// Elements
const statusBadge = document.getElementById("statusBadge");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const wakeToggle = document.getElementById("wakeToggle");
const btnOpen = document.getElementById("btnOpen");
const btnDashboard = document.getElementById("btnDashboard");
const btnSummarize = document.getElementById("btnSummarize");
const btnScreenshot = document.getElementById("btnScreenshot");
const btnReadAloud = document.getElementById("btnReadAloud");
const btnExtract = document.getElementById("btnExtract");
const pageInfo = document.getElementById("pageInfo");
const pageUrl = document.getElementById("pageUrl");

// Load state
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

  if (state.pageContext) {
    pageInfo.style.display = "block";
    pageUrl.textContent = state.pageContext.url || "";
    pageUrl.title = state.pageContext.url || "";
  }

  const caps = ["vision", "hearing", "speech", "reasoning", "face"];
  caps.forEach((cap) => {
    const el = document.getElementById(`cap-${cap}`);
    if (!el) return;
    const s = state.apiStatus?.[cap] || "unknown";
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
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "ORION_TOGGLE_LISTENING" });
    }
  });
});

// Navigation
btnOpen.addEventListener("click", () => {
  chrome.tabs.create({ url: `${APP_BASE}/consulta` });
  window.close();
});

btnDashboard.addEventListener("click", () => {
  chrome.tabs.create({ url: `${APP_BASE}/dashboard/rede-neural` });
  window.close();
});

// Page Actions
function sendToActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
}

btnSummarize.addEventListener("click", () => {
  sendToActiveTab({ type: "ORION_SUMMARIZE_PAGE" });
  window.close();
});

btnScreenshot.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
        if (dataUrl) {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `orion-capture-${Date.now()}.png`;
          a.click();
        }
      });
    }
  });
});

btnReadAloud.addEventListener("click", () => {
  sendToActiveTab({ type: "ORION_READ_ALOUD" });
  window.close();
});

btnExtract.addEventListener("click", () => {
  sendToActiveTab({ type: "ORION_EXTRACT_STRUCTURED" });
  window.close();
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
