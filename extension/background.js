/**
 * Orion Extension v4.0 — Background Service Worker
 * Full integration with neural-ops via Supabase Edge Functions.
 * Vision capture, voice commands, AI queries, web search, scraping,
 * external link navigation, anti-hallucination validation.
 * Auth verification for premium-only features.
 * Domain: iasofthub.com
 */

const APP_BASE = "https://www.iasofthub.com";
const SUPABASE_URL = "https://dlwafedtlvbvuoaopvsl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk";

const PREMIUM_PLANS = ["professional", "business", "enterprise"];
const OWNER_EMAIL = "info@elpgreen.com";

// ═══ External Link Registry ═══
const EXTERNAL_LINKS = {
  consulta: `${APP_BASE}/consulta`,
  dashboard: `${APP_BASE}/dashboard/rede-neural`,
  plano: `${APP_BASE}/dashboard/plano`,
  cadastro: `${APP_BASE}/cadastro`,
  documentos: `${APP_BASE}/dashboard/documentos`,
  processos: `${APP_BASE}/dashboard/processos`,
  chat: `${APP_BASE}/dashboard/chat-ia`,
  pesquisa: `${APP_BASE}/dashboard/pesquisa-juridica`,
  clientes: `${APP_BASE}/dashboard/clientes`,
  financeiro: `${APP_BASE}/dashboard/financeiro`,
  agenda: `${APP_BASE}/dashboard/agenda`,
  aml: `${APP_BASE}/aml`,
  loja: `${APP_BASE}/loja`,
  // External tools
  stf: "https://portal.stf.jus.br/jurisprudencia/",
  stj: "https://scon.stj.jus.br/SCON/",
  lexml: "https://www.lexml.gov.br/",
  cnj: "https://www.cnj.jus.br/",
  planalto: "https://www.planalto.gov.br/legislacao",
  datajud: "https://datajud-wiki.cnj.jus.br/",
  tjsp: "https://esaj.tjsp.jus.br/cjsg/consultaCompleta.do",
  camara: "https://www.camara.leg.br/busca-portal",
  senado: "https://www25.senado.leg.br/web/atividade/legislacao",
  courtlistener: "https://www.courtlistener.com/",
  google_scholar: "https://scholar.google.com.br/",
  huggingface: "https://huggingface.co/Ericsonv12",
  github: "https://github.com/elpgreen",
};

// State
let orionState = {
  active: false,
  wakeWordDetected: false,
  lastTranscript: "",
  connectedTabs: new Set(),
  pageContext: null,
  lastAnalysis: null,
  conversationHistory: [],
  visionActive: false,
  apiStatus: {
    vision: "offline",
    hearing: "unknown",
    speech: "unknown",
    reasoning: "online",
    face: "unknown",
    search: "online",
    scraping: "online",
  },
};

// ─── Auth cache ───
let authCache = { checked: false, authenticated: false, isPremium: false, checkedAt: 0 };
const AUTH_CACHE_TTL = 5 * 60 * 1000;

async function checkAuth() {
  if (authCache.checked && (Date.now() - authCache.checkedAt) < AUTH_CACHE_TTL) {
    return authCache;
  }
  try {
    const sessionRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${await getStoredAccessToken()}`,
      },
    });
    if (!sessionRes.ok) {
      authCache = { checked: true, authenticated: false, isPremium: false, checkedAt: Date.now() };
      return authCache;
    }
    const user = await sessionRes.json();
    if (user.email === OWNER_EMAIL) {
      authCache = { checked: true, authenticated: true, isPremium: true, checkedAt: Date.now() };
      return authCache;
    }
    const planRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_plans?user_id=eq.${user.id}&select=plan_type&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${await getStoredAccessToken()}` } }
    );
    let isPremium = false;
    if (planRes.ok) {
      const plans = await planRes.json();
      if (plans.length > 0 && PREMIUM_PLANS.includes(plans[0].plan_type)) isPremium = true;
    }
    authCache = { checked: true, authenticated: true, isPremium, checkedAt: Date.now() };
    return authCache;
  } catch (err) {
    console.warn("[Orion BG] Auth check failed:", err.message);
    authCache = { checked: true, authenticated: false, isPremium: false, checkedAt: Date.now() };
    return authCache;
  }
}

async function getStoredAccessToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["orionAccessToken"], (result) => {
      resolve(result.orionAccessToken || "");
    });
  });
}

// Listen for auth token from the app
chrome.runtime.onMessageExternal?.addListener?.((message, sender, sendResponse) => {
  if (message.type === "ORION_SET_AUTH_TOKEN" && message.token) {
    chrome.storage.local.set({ orionAccessToken: message.token });
    authCache = { checked: false, authenticated: false, isPremium: false, checkedAt: 0 };
    sendResponse({ ok: true });
  }
});

// ═══ Context Menu ═══
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "orion-analyze-selection", title: "Orion: Analisar seleção", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "orion-analyze-page", title: "Orion: Analisar esta página", contexts: ["page"] });
  chrome.contextMenus.create({ id: "orion-analyze-image", title: "Orion: Analisar imagem", contexts: ["image"] });
  chrome.contextMenus.create({ id: "orion-summarize", title: "Orion: Resumir página", contexts: ["page"] });
  chrome.contextMenus.create({ id: "orion-vision-activate", title: "Orion: Ativar Visão (15 min)", contexts: ["page"] });
  chrome.contextMenus.create({ id: "orion-web-search", title: "Orion: Pesquisar na Web", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "orion-scrape-link", title: "Orion: Extrair conteúdo do link", contexts: ["link"] });
  chrome.contextMenus.create({ id: "orion-open-in-app", title: "Orion: Abrir no IASoft Hub", contexts: ["page"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "orion-analyze-selection":
      if (info.selectionText && tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_ANALYZE_TEXT", text: info.selectionText });
      break;
    case "orion-analyze-page":
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_EXTRACT_PAGE" });
      break;
    case "orion-analyze-image":
      if (info.srcUrl && tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_ANALYZE_IMAGE", imageUrl: info.srcUrl });
      break;
    case "orion-summarize":
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_SUMMARIZE_PAGE" });
      break;
    case "orion-vision-activate":
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_ACTIVATE_VISION" });
      break;
    case "orion-web-search":
      if (info.selectionText && tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_WEB_SEARCH", query: info.selectionText });
      break;
    case "orion-scrape-link":
      if (info.linkUrl && tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_SCRAPE_URL", url: info.linkUrl });
      break;
    case "orion-open-in-app":
      chrome.tabs.create({ url: `${APP_BASE}/consulta` });
      break;
  }
});

// Keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-listening") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { type: "ORION_TOGGLE_LISTENING" });
    });
  }
});

// ═══ Message Handler ═══
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "ORION_CHECK_AUTH":
      checkAuth().then((auth) => sendResponse(auth)).catch(() => sendResponse({ authenticated: false, isPremium: false }));
      return true;

    case "ORION_WAKE_WORD":
      orionState.wakeWordDetected = true;
      orionState.active = true;
      orionState.lastTranscript = message.transcript || "";
      broadcastToTabs({ type: "ORION_ACTIVATED", transcript: message.transcript });
      broadcastState();
      sendResponse({ ok: true });
      break;

    case "GET_STATE":
      sendResponse(getPublicState());
      break;

    case "GET_EXTERNAL_LINKS":
      sendResponse({ links: EXTERNAL_LINKS });
      break;

    case "SET_API_STATUS":
      if (message.capability && message.status) {
        orionState.apiStatus[message.capability] = message.status;
        if (message.capability === "vision") orionState.visionActive = message.status === "online";
      }
      sendResponse({ ok: true });
      break;

    case "ORION_DEACTIVATE":
      orionState.active = false;
      orionState.wakeWordDetected = false;
      broadcastState();
      sendResponse({ ok: true });
      break;

    case "OPEN_ORION_APP":
      chrome.tabs.create({ url: message.url || `${APP_BASE}/consulta` });
      sendResponse({ ok: true });
      break;

    case "OPEN_EXTERNAL_LINK":
      const linkKey = message.linkKey;
      const url = EXTERNAL_LINKS[linkKey] || message.url;
      if (url) {
        chrome.tabs.create({ url });
        sendResponse({ ok: true, url });
      } else {
        sendResponse({ error: `Link '${linkKey}' não encontrado` });
      }
      break;

    case "OPEN_ORION_WITH_CONTEXT":
      const ctx = encodeURIComponent(JSON.stringify(message.context || {}));
      chrome.tabs.create({ url: `${APP_BASE}/consulta?context=${ctx}` });
      sendResponse({ ok: true });
      break;

    case "TAB_CONNECTED":
      if (sender.tab?.id) orionState.connectedTabs.add(sender.tab.id);
      sendResponse({ ok: true, state: getPublicState() });
      break;

    case "PAGE_CONTEXT_UPDATE":
      orionState.pageContext = { url: message.url, title: message.title, domain: message.domain, timestamp: Date.now() };
      sendResponse({ ok: true });
      break;

    case "ORION_AI_QUERY":
      handleAIQuery(message.query, message.context)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((err) => sendResponse({ error: err.message }));
      return true;

    case "ORION_VISION_CAPTURE":
      handleVisionCapture(message.query, sender.tab)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((err) => sendResponse({ error: err.message }));
      return true;

    case "ORION_PAGE_ANALYSIS":
      orionState.lastAnalysis = { content: message.content, url: message.url, timestamp: Date.now() };
      sendResponse({ ok: true });
      break;

    case "GET_CONVERSATION_HISTORY":
      sendResponse({ history: orionState.conversationHistory.slice(-20) });
      break;

    case "ORION_QUICK_ACTION":
      handleQuickAction(message.action, message.data, sender.tab)
        .then((r) => sendResponse(r))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    // ═══ NEW: Web Search via Firecrawl ═══
    case "ORION_WEB_SEARCH_REQUEST":
      handleWebSearch(message.query)
        .then((r) => sendResponse({ ok: true, result: r }))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    // ═══ NEW: Scrape URL via Firecrawl ═══
    case "ORION_SCRAPE_REQUEST":
      handleScrapeUrl(message.url)
        .then((r) => sendResponse({ ok: true, result: r }))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    default:
      sendResponse({ error: "Unknown message type" });
  }
  return true;
});

// ═══ AI Query via neural-ops Edge Function ═══
async function handleAIQuery(query, context) {
  try {
    const token = await getStoredAccessToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/neural-ops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ question: query, stream: false, context: context || orionState.pageContext }),
    });

    if (!res.ok) return { fallback: true, message: "Processando na interface principal..." };

    const data = await res.json();
    const responseText = data.description || data.response || data.message || "";
    orionState.conversationHistory.push(
      { role: "user", content: query },
      { role: "assistant", content: responseText }
    );
    return { response: responseText, success: true };
  } catch (err) {
    return { fallback: true, message: "Conexão indisponível. Abrindo app..." };
  }
}

// ═══ Vision Capture & Analysis ═══
async function handleVisionCapture(query, tab) {
  if (!tab?.id) throw new Error("Nenhuma aba ativa");
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 75 });
    if (!dataUrl) throw new Error("Falha ao capturar tela");

    const base64Image = dataUrl.split(",")[1];
    const token = await getStoredAccessToken();

    const res = await fetch(`${SUPABASE_URL}/functions/v1/neural-ops`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        question: query || "Descreva detalhadamente o que você vê nesta imagem da tela do navegador do usuário.",
        stream: false,
        context: { url: tab.url || orionState.pageContext?.url, title: tab.title || orionState.pageContext?.title, source: "orion-extension-vision" },
        image: base64Image,
        image_type: "screenshot",
      }),
    });

    if (!res.ok) {
      const fallbackRes = await fetch(`${SUPABASE_URL}/functions/v1/neural-ops`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          question: `[VISÃO ATIVA] O usuário está na página "${tab.title || 'desconhecida'}" (${tab.url || ''}). Ele pediu: "${query}". Descreva o que provavelmente está visível com base no contexto da página.`,
          stream: false, context: orionState.pageContext,
        }),
      });
      if (!fallbackRes.ok) throw new Error("Neural-ops indisponível");
      const fallbackData = await fallbackRes.json();
      return { response: fallbackData.description || fallbackData.response || "Não foi possível analisar a tela.", success: true };
    }

    const data = await res.json();
    const responseText = data.description || data.response || data.message || "Análise visual concluída.";
    orionState.conversationHistory.push(
      { role: "user", content: `[VISÃO] ${query}` },
      { role: "assistant", content: responseText }
    );
    return { response: responseText, success: true };
  } catch (err) {
    return { response: `Erro na captura visual: ${err.message}. Tente novamente.`, success: false };
  }
}

// ═══ NEW: Web Search via Firecrawl Edge Function ═══
async function handleWebSearch(query) {
  try {
    const token = await getStoredAccessToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/firecrawl-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ query, options: { limit: 8, lang: "pt", country: "BR" } }),
    });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json();
    return { results: data.data || [], success: true };
  } catch (err) {
    return { error: err.message, success: false };
  }
}

// ═══ NEW: Scrape URL via Firecrawl Edge Function ═══
async function handleScrapeUrl(url) {
  try {
    const token = await getStoredAccessToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/firecrawl-scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ url, options: { formats: ["markdown", "links"], onlyMainContent: true } }),
    });
    if (!res.ok) throw new Error(`Scrape failed: ${res.status}`);
    const data = await res.json();
    const markdown = data.data?.markdown || data.markdown || "";
    const links = data.data?.links || data.links || [];
    return { markdown, links, metadata: data.data?.metadata || data.metadata || {}, success: true };
  } catch (err) {
    return { error: err.message, success: false };
  }
}

// ═══ Quick Actions ═══
async function handleQuickAction(action, data, tab) {
  switch (action) {
    case "screenshot":
      if (tab?.id) {
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
        return { ok: true, screenshot: dataUrl };
      }
      return { error: "No active tab" };
    case "read-aloud":
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_READ_ALOUD", text: data?.text });
      return { ok: true };
    case "translate":
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_TRANSLATE", text: data?.text, targetLang: data?.lang || "en" });
      return { ok: true };
    case "extract-data":
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_EXTRACT_STRUCTURED" });
      return { ok: true };
    case "activate-vision":
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_ACTIVATE_VISION" });
      return { ok: true };
    case "deactivate-vision":
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_DEACTIVATE_VISION" });
      return { ok: true };
    case "vision-look":
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_VISION_LOOK", query: data?.query });
      return { ok: true };
    case "web-search":
      return await handleWebSearch(data?.query || "");
    case "scrape-url":
      return await handleScrapeUrl(data?.url || "");
    case "open-link":
      const linkUrl = EXTERNAL_LINKS[data?.linkKey] || data?.url;
      if (linkUrl) { chrome.tabs.create({ url: linkUrl }); return { ok: true }; }
      return { error: "Link not found" };
    default:
      return { error: "Unknown action" };
  }
}

// ═══ Helpers ═══
function broadcastToTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => { if (tab.id) chrome.tabs.sendMessage(tab.id, message).catch(() => {}); });
  });
}

function broadcastState() {
  chrome.runtime.sendMessage({ type: "STATE_UPDATE", state: getPublicState() }).catch(() => {});
}

function getPublicState() {
  return {
    active: orionState.active,
    wakeWordDetected: orionState.wakeWordDetected,
    lastTranscript: orionState.lastTranscript,
    connectedTabs: orionState.connectedTabs.size,
    pageContext: orionState.pageContext,
    visionActive: orionState.visionActive,
    lastAnalysis: orionState.lastAnalysis ? { url: orionState.lastAnalysis.url, timestamp: orionState.lastAnalysis.timestamp } : null,
    apiStatus: { ...orionState.apiStatus },
    externalLinks: EXTERNAL_LINKS,
  };
}

chrome.tabs.onRemoved.addListener((tabId) => { orionState.connectedTabs.delete(tabId); });

function updateBadge() {
  const vBadge = orionState.visionActive ? "👁" : (orionState.active ? "ON" : "");
  chrome.action.setBadgeText({ text: vBadge });
  chrome.action.setBadgeBackgroundColor({ color: orionState.visionActive ? "#00ff88" : (orionState.active ? "#00B4D4" : "#666") });
}
setInterval(updateBadge, 2000);
