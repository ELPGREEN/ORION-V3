/**
 * Orion Extension v2.0 — Content Script
 * Wake word, page extraction, floating panel with real AI via neural-ops,
 * TTS, structured data extraction. Domain: iasofthub.com
 */
(function () {
  "use strict";
  if (window.__orionContentInjected) return;
  window.__orionContentInjected = true;

  let recognition = null;
  let isListening = false;
  let panel = null;
  let miniOrb = null;
  let panelVisible = false;

  // Register with background
  chrome.runtime.sendMessage({ type: "TAB_CONNECTED" }, (response) => {
    if (response?.state?.active) createMiniOrb();
  });

  chrome.runtime.sendMessage({
    type: "PAGE_CONTEXT_UPDATE",
    url: location.href,
    title: document.title,
    domain: location.hostname,
  });

  // Wake Word Listener
  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || isListening) return;

    recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (transcript.includes("orion") || transcript.includes("órion")) {
          chrome.runtime.sendMessage({ type: "ORION_WAKE_WORD", transcript });
          createMiniOrb();
          pulseOrb();
          const cmd = extractCommand(transcript);
          if (cmd) handleVoiceCommand(cmd);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        isListening = false;
        return;
      }
      if (event.error !== "aborted") {
        setTimeout(() => { isListening = false; startListening(); }, 1200);
      }
    };

    recognition.onend = () => {
      isListening = false;
      setTimeout(() => startListening(), 500);
    };

    try {
      recognition.start();
      isListening = true;
    } catch (e) {}
  }

  function extractCommand(transcript) {
    const m = transcript.match(/(?:orion|órion)[,.]?\s+(.+)/i);
    return m ? m[1].trim() : null;
  }

  function handleVoiceCommand(cmd) {
    const lower = cmd.toLowerCase();
    if (lower.includes("resum")) extractAndAnalyze("summarize");
    else if (lower.includes("traduz")) extractAndAnalyze("translate");
    else if (lower.includes("analis")) extractAndAnalyze("analyze");
    else if (lower.includes("leia") || lower.includes("ler")) readPageAloud();
    else if (lower.includes("abrir")) chrome.runtime.sendMessage({ type: "OPEN_ORION_APP" });
    else sendAIQuery(cmd);
  }

  // Page Extraction
  function extractPageContent() {
    const main = document.querySelector("main, article, [role='main'], .content, #content");
    const target = main || document.body;

    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG"].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (parent.offsetHeight === 0) return NodeFilter.FILTER_REJECT;
        return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    const chunks = [];
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      if (text.length > 2) chunks.push(text);
    }

    const headings = Array.from(document.querySelectorAll("h1,h2,h3")).map((h) => ({
      level: parseInt(h.tagName[1]),
      text: h.textContent.trim(),
    }));

    const links = Array.from(document.querySelectorAll("a[href]")).slice(0, 30).map((a) => ({
      text: a.textContent.trim().substring(0, 80),
      href: a.href,
    }));

    const images = Array.from(document.querySelectorAll("img[src]")).slice(0, 15).map((img) => ({
      alt: img.alt || "",
      src: img.src,
    }));

    return {
      url: location.href,
      title: document.title,
      domain: location.hostname,
      content: chunks.join("\n").substring(0, 15000),
      headings,
      links,
      images,
      wordCount: chunks.join(" ").split(/\s+/).length,
      timestamp: Date.now(),
    };
  }

  function extractAndAnalyze(mode) {
    const data = extractPageContent();
    showNotification("Analisando página...", "info");
    chrome.runtime.sendMessage({ type: "PAGE_CONTEXT_UPDATE", ...data });

    const prompts = {
      summarize: `Resuma de forma concisa e estruturada o conteúdo desta página "${data.title}": ${data.content.substring(0, 4000)}`,
      translate: `Traduza para inglês o seguinte conteúdo: ${data.content.substring(0, 3000)}`,
      analyze: `Faça uma análise completa desta página "${data.title}" (${data.url}). Identifique: tema principal, pontos-chave, dados relevantes e conclusões. Conteúdo: ${data.content.substring(0, 4000)}`,
    };
    sendAIQuery(prompts[mode] || prompts.analyze);
  }

  // AI Query (calls neural-ops via background)
  function sendAIQuery(query) {
    showThinking();
    chrome.runtime.sendMessage(
      { type: "ORION_AI_QUERY", query, context: { url: location.href, title: document.title } },
      (response) => {
        hideThinking();
        if (response?.result?.fallback) {
          chrome.runtime.sendMessage({
            type: "OPEN_ORION_WITH_CONTEXT",
            context: { query, url: location.href, title: document.title },
          });
        } else if (response?.result?.response) {
          showResponsePanel(response.result.response);
        } else if (response?.error) {
          showNotification("Erro: " + response.error, "error");
        }
      }
    );
  }

  // TTS
  function readPageAloud(customText) {
    const text = customText || extractPageContent().content.substring(0, 2000);
    if (!text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    utter.rate = 1.0;
    utter.pitch = 0.95;
    window.speechSynthesis.speak(utter);
    showNotification("Lendo em voz alta...", "info");
  }

  // Mini Orb (floating button)
  function createMiniOrb() {
    if (miniOrb) return;
    miniOrb = document.createElement("div");
    miniOrb.id = "orion-mini-orb";
    // Use a simple SVG eye icon instead of emoji
    miniOrb.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00B4D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    document.body.appendChild(miniOrb);

    let isDragging = false, startX, startY, orbX, orbY;

    miniOrb.addEventListener("mousedown", (e) => {
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = miniOrb.getBoundingClientRect();
      orbX = rect.left;
      orbY = rect.top;

      const onMove = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) isDragging = true;
        if (isDragging) {
          miniOrb.style.left = (orbX + dx) + "px";
          miniOrb.style.top = (orbY + dy) + "px";
          miniOrb.style.right = "auto";
          miniOrb.style.bottom = "auto";
        }
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        if (!isDragging) togglePanel();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function pulseOrb() {
    if (!miniOrb) return;
    miniOrb.classList.add("orion-pulse");
    setTimeout(() => miniOrb.classList.remove("orion-pulse"), 2000);
  }

  // Floating Panel
  function togglePanel() {
    if (panelVisible) { hidePanel(); return; }
    showPanel();
  }

  function showPanel() {
    if (panel) panel.remove();
    panel = document.createElement("div");
    panel.id = "orion-panel";
    panel.innerHTML = `
      <div class="orion-panel-header">
        <span class="orion-panel-title">ORION</span>
        <button class="orion-panel-close" id="orion-close-panel">×</button>
      </div>
      <div class="orion-panel-body">
        <div class="orion-input-row">
          <input type="text" id="orion-query-input" placeholder="Pergunte ao Orion..." autocomplete="off"/>
          <button id="orion-send-btn">Enviar</button>
        </div>
        <div class="orion-quick-actions">
          <button data-action="summarize" title="Resumir página">Resumir</button>
          <button data-action="analyze" title="Analisar página">Analisar</button>
          <button data-action="read" title="Ler em voz alta">Ler</button>
          <button data-action="extract" title="Extrair dados">Extrair</button>
        </div>
        <div class="orion-response" id="orion-response"></div>
      </div>
    `;
    document.body.appendChild(panel);
    panelVisible = true;

    panel.querySelector("#orion-close-panel").addEventListener("click", hidePanel);
    const input = panel.querySelector("#orion-query-input");
    const sendBtn = panel.querySelector("#orion-send-btn");

    sendBtn.addEventListener("click", () => {
      const q = input.value.trim();
      if (q) { sendAIQuery(q); input.value = ""; }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { sendBtn.click(); e.preventDefault(); }
    });

    panel.querySelectorAll(".orion-quick-actions button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "summarize") extractAndAnalyze("summarize");
        else if (action === "analyze") extractAndAnalyze("analyze");
        else if (action === "read") readPageAloud();
        else if (action === "extract") {
          const pageData = extractPageContent();
          showResponsePanel(
            `Dados Extraídos\n\nTítulo: ${pageData.title}\nURL: ${pageData.url}\nPalavras: ${pageData.wordCount}\nTítulos: ${pageData.headings.length}\nLinks: ${pageData.links.length}\nImagens: ${pageData.images.length}\n\nTítulos encontrados:\n${pageData.headings.map(h => `${"  ".repeat(h.level - 1)}${h.text}`).join("\n")}`
          );
        }
      });
    });

    setTimeout(() => input.focus(), 100);
  }

  function hidePanel() {
    if (panel) { panel.remove(); panel = null; }
    panelVisible = false;
  }

  function showResponsePanel(text) {
    if (!panel) showPanel();
    const el = document.getElementById("orion-response");
    if (el) {
      el.innerHTML = `<div class="orion-response-text">${escapeHtml(text)}</div>`;
      el.scrollTop = el.scrollHeight;
    }
  }

  function showThinking() {
    if (!panel) showPanel();
    const el = document.getElementById("orion-response");
    if (el) el.innerHTML = `<div class="orion-thinking"><span class="orion-dot-pulse"></span> Processando...</div>`;
  }

  function hideThinking() {
    const el = document.getElementById("orion-response");
    if (el && el.querySelector(".orion-thinking")) el.innerHTML = "";
  }

  // Notifications
  function showNotification(text, type = "info") {
    const n = document.createElement("div");
    n.className = `orion-notification orion-notif-${type}`;
    n.textContent = text;
    document.body.appendChild(n);
    setTimeout(() => n.classList.add("orion-notif-show"), 10);
    setTimeout(() => { n.classList.remove("orion-notif-show"); setTimeout(() => n.remove(), 300); }, 3000);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  }

  // Message Listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case "ORION_ACTIVATED":
        createMiniOrb();
        pulseOrb();
        break;
      case "ORION_TOGGLE_LISTENING":
        if (isListening && recognition) {
          recognition.abort();
          isListening = false;
          showNotification("Escuta desativada", "info");
        } else {
          startListening();
          showNotification("Escuta ativada", "success");
        }
        break;
      case "ORION_EXTRACT_PAGE":
        const data = extractPageContent();
        chrome.runtime.sendMessage({ type: "PAGE_CONTEXT_UPDATE", ...data });
        sendAIQuery(`Analise detalhadamente esta página: ${data.title}. Conteúdo: ${data.content.substring(0, 5000)}`);
        break;
      case "ORION_SUMMARIZE_PAGE":
        extractAndAnalyze("summarize");
        break;
      case "ORION_ANALYZE_TEXT":
        sendAIQuery(`Analise o seguinte texto selecionado: "${message.text}"`);
        break;
      case "ORION_ANALYZE_IMAGE":
        showNotification("Analisando imagem...", "info");
        sendAIQuery(`Descreva e analise esta imagem: ${message.imageUrl}`);
        break;
      case "ORION_READ_ALOUD":
        readPageAloud(message.text);
        break;
      case "ORION_TRANSLATE":
        sendAIQuery(`Traduza para ${message.targetLang || "inglês"}: ${message.text || extractPageContent().content.substring(0, 3000)}`);
        break;
      case "ORION_EXTRACT_STRUCTURED":
        const pageData = extractPageContent();
        showResponsePanel(
          `Dados Extraídos\n\nTítulo: ${pageData.title}\nURL: ${pageData.url}\nPalavras: ${pageData.wordCount}\nTítulos: ${pageData.headings.length}\nLinks: ${pageData.links.length}\nImagens: ${pageData.images.length}`
        );
        break;
    }
    sendResponse({ ok: true });
    return true;
  });

  // Auto-start
  chrome.storage.local.get(["orionWakeWordEnabled"], (result) => {
    if (result.orionWakeWordEnabled !== false) startListening();
  });

  createMiniOrb();
})();
