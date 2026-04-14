/**
 * Orion Extension v5.0 — Background Service Worker
 * Full integration with neural-ops via Supabase Edge Functions.
 * NEW in v5: Side Panel, Alarms API, Clipboard, Downloads, Bookmarks,
 * History search, TTS API, Reading List, Notes system.
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
  extension: `${APP_BASE}/dashboard/extension`,
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
  notes: [],
  apiStatus: {
    vision: "offline",
    hearing: "unknown",
    speech: "unknown",
    reasoning: "online",
    face: "unknown",
    search: "online",
    scraping: "online",
    clipboard: "online",
    downloads: "online",
    bookmarks: "online",
    history: "online",
    tts: "online",
    notes: "online",
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

// ═══ Installation & Context Menu ═══
chrome.runtime.onInstalled.addListener(() => {
  // Context menus
  chrome.contextMenus.create({ id: "orion-analyze-selection", title: "Orion: Analisar seleção", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "orion-analyze-page", title: "Orion: Analisar esta página", contexts: ["page"] });
  chrome.contextMenus.create({ id: "orion-analyze-image", title: "Orion: Analisar imagem", contexts: ["image"] });
  chrome.contextMenus.create({ id: "orion-summarize", title: "Orion: Resumir página", contexts: ["page"] });
  chrome.contextMenus.create({ id: "orion-vision-activate", title: "Orion: Ativar Visão (15 min)", contexts: ["page"] });
  chrome.contextMenus.create({ id: "orion-web-search", title: "Orion: Pesquisar na Web", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "orion-scrape-link", title: "Orion: Extrair conteúdo do link", contexts: ["link"] });
  chrome.contextMenus.create({ id: "orion-open-in-app", title: "Orion: Abrir no IASoft Hub", contexts: ["page"] });
  chrome.contextMenus.create({ id: "orion-copy-clean", title: "Orion: Copiar texto limpo", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "orion-save-note", title: "Orion: Salvar como nota", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "orion-bookmark-analyze", title: "Orion: Bookmarkar + Analisar", contexts: ["page"] });
  chrome.contextMenus.create({ id: "orion-translate-selection", title: "Orion: Traduzir seleção", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "orion-read-selection", title: "Orion: Ler em voz alta", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "orion-open-side-panel", title: "Orion: Abrir Painel Lateral", contexts: ["page"] });

  // Side panel behavior
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

  // Welcome notification
  chrome.notifications.create("orion-installed", {
    type: "basic",
    iconUrl: "icon128.png",
    title: "Orion v5.0 Instalado!",
    message: "Assistente Neural ativo. Diga 'Orion' ou use Ctrl+Shift+O para começar.",
  });
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
    case "orion-copy-clean":
      if (info.selectionText && tab?.id) handleClipboardCopy(info.selectionText, tab.id);
      break;
    case "orion-save-note":
      if (info.selectionText) handleSaveNote(info.selectionText, tab?.url, tab?.title);
      break;
    case "orion-bookmark-analyze":
      if (tab) handleBookmarkAndAnalyze(tab);
      break;
    case "orion-translate-selection":
      if (info.selectionText && tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_TRANSLATE", text: info.selectionText, targetLang: "en" });
      break;
    case "orion-read-selection":
      if (info.selectionText) handleTTSRead(info.selectionText);
      break;
    case "orion-open-side-panel":
      if (tab?.windowId) chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
      break;
  }
});

// ═══ Keyboard Shortcuts ═══
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-listening") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { type: "ORION_TOGGLE_LISTENING" });
    });
  }
  if (command === "open-side-panel") {
    chrome.windows.getCurrent((win) => {
      chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
    });
  }
  if (command === "quick-screenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (dataUrl) {
        const blob = dataURLtoBlob(dataUrl);
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: dataUrl,
          filename: `orion-capture-${Date.now()}.png`,
          saveAs: false,
        });
      }
    });
  }
});

// ═══ Alarms — Vision Auto-timeout ═══
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "orion-vision-timeout") {
    orionState.visionActive = false;
    broadcastToTabs({ type: "ORION_DEACTIVATE_VISION", reason: "timeout" });
    orionState.apiStatus.vision = "offline";
    updateBadge();
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
        if (message.capability === "vision") {
          orionState.visionActive = message.status === "online";
          if (orionState.visionActive) {
            chrome.alarms.create("orion-vision-timeout", { delayInMinutes: 15 });
          } else {
            chrome.alarms.clear("orion-vision-timeout");
          }
        }
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
      const targetUrl = EXTERNAL_LINKS[linkKey] || message.url;
      if (targetUrl) {
        // Find if there's already a tab with this URL
        chrome.tabs.query({}, (tabs) => {
          const existingTab = tabs.find(t => t.url && t.url.includes(targetUrl.split('?')[0]));
          if (existingTab && existingTab.id) {
            chrome.tabs.update(existingTab.id, { active: true });
            chrome.windows.update(existingTab.windowId, { focused: true });
            sendResponse({ ok: true, url: targetUrl, switched: true });
          } else {
            chrome.tabs.create({ url: targetUrl });
            sendResponse({ ok: true, url: targetUrl, switched: false });
          }
        });
      } else {
        sendResponse({ error: `Link '${linkKey}' não encontrado` });
      }
      return true;

    case "OPEN_ORION_WITH_CONTEXT":
      const ctx = encodeURIComponent(JSON.stringify(message.context || {}));
      chrome.tabs.create({ url: `${APP_BASE}/consulta?context=${ctx}` });
      sendResponse({ ok: true });
      break;

    case "OPEN_SIDE_PANEL":
      chrome.windows.getCurrent((win) => {
        chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
      });
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

    // ═══ Web Search via Firecrawl ═══
    case "ORION_WEB_SEARCH_REQUEST":
      handleWebSearch(message.query)
        .then((r) => sendResponse({ ok: true, result: r }))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    // ═══ Scrape URL via Firecrawl ═══
    case "ORION_SCRAPE_REQUEST":
      handleScrapeUrl(message.url)
        .then((r) => sendResponse({ ok: true, result: r }))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    // ═══ v5: Clipboard ═══
    case "ORION_CLIPBOARD_READ":
      handleClipboardRead()
        .then((r) => sendResponse({ ok: true, text: r }))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    // ═══ v5: Downloads ═══
    case "ORION_DOWNLOAD_FILE":
      handleDownload(message.url, message.filename)
        .then((r) => sendResponse({ ok: true, downloadId: r }))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    // ═══ v5: Bookmarks ═══
    case "ORION_SEARCH_BOOKMARKS":
      handleSearchBookmarks(message.query)
        .then((r) => sendResponse({ ok: true, bookmarks: r }))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    case "ORION_ADD_BOOKMARK":
      handleAddBookmark(message.title, message.url)
        .then((r) => sendResponse({ ok: true, bookmark: r }))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    // ═══ v5: History Search ═══
    case "ORION_SEARCH_HISTORY":
      handleSearchHistory(message.query, message.maxResults)
        .then((r) => sendResponse({ ok: true, history: r }))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    // ═══ v5: TTS via Chrome API ═══
    case "ORION_TTS_SPEAK":
      handleTTSRead(message.text, message.lang);
      sendResponse({ ok: true });
      break;

    case "ORION_TTS_STOP":
      chrome.tts.stop();
      sendResponse({ ok: true });
      break;

    // ═══ v5: Notes ═══
    case "ORION_SAVE_NOTE":
      handleSaveNote(message.text, message.url, message.title)
        .then((r) => sendResponse({ ok: true, note: r }))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    case "ORION_GET_NOTES":
      chrome.storage.local.get(["orionNotes"], (result) => {
        sendResponse({ ok: true, notes: result.orionNotes || [] });
      });
      return true;

    case "ORION_DELETE_NOTE":
      chrome.storage.local.get(["orionNotes"], (result) => {
        const notes = (result.orionNotes || []).filter((n) => n.id !== message.noteId);
        chrome.storage.local.set({ orionNotes: notes });
        sendResponse({ ok: true });
      });
      return true;

    // ═══ Video Control (from content script) ═══
    case "ORION_VIDEO_CONTROL":
      if (message.tabId) {
        chrome.tabs.sendMessage(message.tabId, { type: "ORION_VIDEO_CONTROL_CMD", action: message.action });
      } else {
        // Broadcast to active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { type: "ORION_VIDEO_CONTROL_CMD", action: message.action });
        });
      }
      sendResponse({ ok: true });
      break;

    default:
      sendResponse({ error: "Unknown message type" });
  }
  return true;
});

// ═══ AI Query via Agent Hub (with neural-ops fallback) ═══

// Agent session state
let agentSessionId = null;
let agentSessionHistory = [];

// Initialize session from storage
chrome.storage.local.get(["orionAgentSessionId", "orionAgentSessionHistory"], (result) => {
  agentSessionId = result.orionAgentSessionId || null;
  agentSessionHistory = result.orionAgentSessionHistory || [];
});

function detectTaskType(query, context) {
  const q = (query || "").toLowerCase();
  if (context?.pdfContext) return "pdf_analysis";
  if (context?.task_type) return context.task_type;
  if (q.includes("outline") || q.includes("acadêmic") || q.includes("tcc") || q.includes("metodologia")) return "academic";
  if (q.includes("extrair dados") || q.includes("tabela") || q.includes("planilha")) return "data_extract";
  if (q.includes("pesquis") || q.includes("busca") || q.includes("search")) return "web_search";
  if (context?.pageContent || q.includes("resum") || q.includes("traduz") || (q.includes("analis") && q.includes("página"))) return "page_summary";
  return "general_chat";
}

async function handleAIQuery(query, context) {
  const taskType = detectTaskType(query, context);
  
  // Enrich query with page context for research and personality rules
  let enrichedQuery = query;
  const personalityRules = `
[REGRAS ORION]:
- Personalidade AquaMonkey: inteligente, descontraído, humor leve.
- Responda em primeira pessoa e rápido.
- REGRAS ANTI-ALUCINAÇÃO: Use apenas o contexto fornecido. Se não souber: "Não tenho informação suficiente sobre isso no momento."
- Resposta direta: 3-5 linhas no máximo. Sem repetir a pergunta.
- Se for pesquisa: Extraia informações em bullets claros e acionáveis.
`;

  if (context?.pageContent && context.pageContent.length > 50) {
    enrichedQuery = `${personalityRules}\n[Contexto da página "${context.title || ''}" (${context.url || ''})]:\n${context.pageContent.substring(0, 2500)}\n\n[Pergunta/Comando]: ${query}`;
  } else {
    enrichedQuery = `${personalityRules}\n[Pergunta/Comando]: ${query}`;
  }

  // Try agent-hub first
  try {
    const token = await getStoredAccessToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/orion-agent-hub`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: enrichedQuery,
        task_type: taskType,
        context: context || orionState.pageContext,
        session_id: agentSessionId,
        session_history: agentSessionHistory.slice(-10),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const responseText = data.response || "";
      const agent = data.agent || "Orion";

      // Update session
      agentSessionId = data.session_id || agentSessionId;
      agentSessionHistory = data.session_history || agentSessionHistory;
      chrome.storage.local.set({
        orionAgentSessionId: agentSessionId,
        orionAgentSessionHistory: agentSessionHistory.slice(-20),
      });

      orionState.conversationHistory.push(
        { role: "user", content: query },
        { role: "assistant", content: responseText }
      );

      return { response: responseText, success: true, agent, task_type: data.task_type };
    }

    // Agent hub failed, fall through to neural-ops
    console.warn("[Orion] Agent hub returned", res.status, "— falling back to neural-ops");
  } catch (err) {
    console.warn("[Orion] Agent hub error:", err.message, "— falling back to neural-ops");
  }

  // Fallback: neural-ops
  try {
    const token = await getStoredAccessToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/neural-ops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ question: enrichedQuery, stream: false, context: context || orionState.pageContext }),
    });

    if (!res.ok) return { fallback: true, message: "Processando na interface principal..." };

    const data = await res.json();
    const responseText = data.description || data.response || data.message || "";
    orionState.conversationHistory.push(
      { role: "user", content: query },
      { role: "assistant", content: responseText }
    );
    return { response: responseText, success: true, agent: "Orion", task_type: "general_chat" };
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
    // Reset vision timeout
    chrome.alarms.clear("orion-vision-timeout");
    chrome.alarms.create("orion-vision-timeout", { delayInMinutes: 15 });
    return { response: responseText, success: true };
  } catch (err) {
    return { response: `Erro na captura visual: ${err.message}. Tente novamente.`, success: false };
  }
}

// ═══ Web Search via Firecrawl Edge Function ═══
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

// ═══ Scrape URL via Firecrawl Edge Function ═══
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

// ═══ v5: Clipboard ═══
async function handleClipboardCopy(text, tabId) {
  try {
    // Clean text: remove extra whitespace, normalize
    const cleaned = text.replace(/\s+/g, " ").trim();
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (t) => navigator.clipboard.writeText(t),
      args: [cleaned],
    });
    chrome.tabs.sendMessage(tabId, { type: "ORION_NOTIFICATION", text: "✅ Texto limpo copiado!", notifType: "success" });
  } catch (e) {
    console.warn("[Orion] Clipboard copy failed:", e.message);
  }
}

async function handleClipboardRead() {
  // Reading clipboard requires user gesture, forwarded from content script
  return "";
}

// ═══ v5: Downloads ═══
async function handleDownload(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url, filename: filename || `orion-download-${Date.now()}`, saveAs: false }, (downloadId) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(downloadId);
    });
  });
}

// ═══ v5: Bookmarks ═══
async function handleSearchBookmarks(query) {
  return new Promise((resolve) => {
    chrome.bookmarks.search(query, (results) => {
      resolve(results.slice(0, 20).map((b) => ({ id: b.id, title: b.title, url: b.url, dateAdded: b.dateAdded })));
    });
  });
}

async function handleAddBookmark(title, url) {
  return new Promise((resolve, reject) => {
    // Find or create "Orion" folder
    chrome.bookmarks.search({ title: "Orion" }, (results) => {
      const folder = results.find((r) => !r.url);
      if (folder) {
        chrome.bookmarks.create({ parentId: folder.id, title, url }, resolve);
      } else {
        chrome.bookmarks.create({ title: "Orion" }, (newFolder) => {
          chrome.bookmarks.create({ parentId: newFolder.id, title, url }, resolve);
        });
      }
    });
  });
}

async function handleBookmarkAndAnalyze(tab) {
  await handleAddBookmark(tab.title || "Sem título", tab.url);
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: "ORION_NOTIFICATION", text: "🔖 Bookmarked na pasta Orion!", notifType: "success" });
    chrome.tabs.sendMessage(tab.id, { type: "ORION_SUMMARIZE_PAGE" });
  }
}

// ═══ v5: History Search ═══
async function handleSearchHistory(query, maxResults = 20) {
  return new Promise((resolve) => {
    chrome.history.search({ text: query || "", maxResults, startTime: Date.now() - 30 * 24 * 3600 * 1000 }, (results) => {
      resolve(results.map((h) => ({ id: h.id, title: h.title, url: h.url, lastVisitTime: h.lastVisitTime, visitCount: h.visitCount })));
    });
  });
}

// ═══ v5: TTS via Chrome TTS API ═══
function handleTTSRead(text, lang = "pt-BR") {
  chrome.tts.stop();
  chrome.tts.speak(text, {
    lang,
    rate: 1.0,
    pitch: 0.95,
    enqueue: false,
    onEvent: (event) => {
      if (event.type === "error") console.warn("[Orion TTS] Error:", event.errorMessage);
    },
  });
}

// ═══ v5: Notes ═══
async function handleSaveNote(text, url, title) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["orionNotes"], (result) => {
      const notes = result.orionNotes || [];
      const note = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: text.substring(0, 5000),
        url: url || "",
        pageTitle: title || "",
        createdAt: Date.now(),
      };
      notes.unshift(note);
      // Keep max 200 notes
      chrome.storage.local.set({ orionNotes: notes.slice(0, 200) });
      // Notify
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon128.png",
        title: "📝 Nota Salva",
        message: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
      });
      resolve(note);
    });
  });
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
    case "screenshot-download":
      if (tab?.id) {
        const dataUrl2 = await chrome.tabs.captureVisibleTab(null, { format: "png" });
        if (dataUrl2) {
          chrome.downloads.download({
            url: dataUrl2,
            filename: `orion-capture-${Date.now()}.png`,
            saveAs: false,
          });
        }
        return { ok: true };
      }
      return { error: "No active tab" };
    case "read-aloud":
      if (data?.text) handleTTSRead(data.text, data?.lang);
      else if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_READ_ALOUD", text: data?.text });
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
    case "search-bookmarks":
      return { ok: true, bookmarks: await handleSearchBookmarks(data?.query || "") };
    case "search-history":
      return { ok: true, history: await handleSearchHistory(data?.query || "") };
    case "save-note":
      return { ok: true, note: await handleSaveNote(data?.text || "", data?.url, data?.title) };
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
    notesCount: orionState.notes.length,
  };
}

chrome.tabs.onRemoved.addListener((tabId) => { orionState.connectedTabs.delete(tabId); });

function updateBadge() {
  const vBadge = orionState.visionActive ? "👁" : (orionState.active ? "ON" : "");
  chrome.action.setBadgeText({ text: vBadge });
  chrome.action.setBadgeBackgroundColor({ color: orionState.visionActive ? "#00ff88" : (orionState.active ? "#00B4D4" : "#666") });
}
setInterval(updateBadge, 2000);

function dataURLtoBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
  const raw = atob(parts[1]);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
