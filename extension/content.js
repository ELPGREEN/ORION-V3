/**
 * Orion Extension v3.1 — Content Script
 * Wake word, page extraction, floating panel with real AI via neural-ops,
 * TTS, structured data extraction, VISION on-demand with 15min auto-timeout.
 * Auth verification: unregistered users get compliments + signup nudge.
 * Domain: iasofthub.com
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

  // ─── Vision State ───
  let visionActive = false;
  let visionTimer = null;
  const VISION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  let lastVisionResponseTime = 0;

  // ─── Auth State ───
  let userAuthenticated = false;
  let userIsPremium = false;
  let authChecked = false;
  let complimentIndex = 0;
  let observationIndex = 0;

  // ─── Random compliment/observation pools ───
  const FIRST_VISIT_PHRASES = [
    "Gostei do seu estilo! Nos vemos depois. 😎",
  ];

  const RETURN_COMPLIMENTS = [
    "Que bom te ver de novo! Você tem bom gosto navegando por aqui. 🌟",
    "Olha quem voltou! Seu interesse me impressiona. 💡",
    "Ei, prazer em revê-lo! Você parece alguém que valoriza tecnologia de ponta. 🚀",
    "De volta tão cedo? Isso mostra inteligência — gosto disso! 🧠",
    "Sabia que você voltaria! Pessoas curiosas sempre voltam. ✨",
  ];

  const RETURN_OBSERVATIONS = [
    "Percebi que você navega com foco — isso é raro hoje em dia.",
    "Você escolhe bem os sites que visita, hein? Bom critério!",
    "Sua forma de explorar a web mostra que você sabe o que quer.",
    "Notei que você tem um padrão eficiente de navegação. Impressionante!",
    "Você parece alguém que aproveita bem o tempo online. Respeito!",
  ];

  // ─── Auth Verification ───
  function checkUserAuth(callback) {
    if (authChecked) {
      callback(userAuthenticated, userIsPremium);
      return;
    }

    chrome.runtime.sendMessage({ type: "ORION_CHECK_AUTH" }, (response) => {
      authChecked = true;
      if (response && response.authenticated) {
        userAuthenticated = true;
        userIsPremium = response.isPremium || false;
      } else {
        userAuthenticated = false;
        userIsPremium = false;
      }
      callback(userAuthenticated, userIsPremium);
    });
  }

  function handleUnauthenticatedUser() {
    // Get visit count from storage
    chrome.storage.local.get(["orionVisitCount"], (result) => {
      const visitCount = (result.orionVisitCount || 0) + 1;
      chrome.storage.local.set({ orionVisitCount: visitCount });

      let phrase;
      if (visitCount <= 1) {
        // First visit — fixed phrase
        phrase = FIRST_VISIT_PHRASES[0];
      } else {
        // Subsequent visits — alternate between compliments and observations
        if (visitCount % 2 === 0) {
          phrase = RETURN_COMPLIMENTS[complimentIndex % RETURN_COMPLIMENTS.length];
          complimentIndex++;
        } else {
          phrase = RETURN_OBSERVATIONS[observationIndex % RETURN_OBSERVATIONS.length];
          observationIndex++;
        }
      }

      const fullMessage = `🔒 ${phrase}\n\nPara usar o Orion, você precisa se cadastrar! Acesse iasofthub.com/cadastro`;
      showNotification(phrase, "info");
      showResponsePanel(fullMessage);
      speakText(phrase + " Para usar o Orion, você precisa se cadastrar!");
    });
  }

  function handleNonPremiumUser() {
    const msg = "👑 Orion é exclusivo para assinantes Premium! Faça upgrade em iasofthub.com/dashboard/plano";
    showNotification(msg, "info");
    showResponsePanel(msg);
    speakText("Orion é exclusivo para assinantes Premium. Faça upgrade no seu painel.");
  }

  /** Guard: returns true if user can proceed, false otherwise */
  function requireAuth(callback) {
    checkUserAuth((authenticated, isPremium) => {
      if (!authenticated) {
        handleUnauthenticatedUser();
        return;
      }
      if (!isPremium) {
        handleNonPremiumUser();
        return;
      }
      callback();
    });
  }

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

  // ─── Wake Word Listener ───
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

    // ─── Vision Commands — require auth ───
    if (lower.includes("ativar visão") || lower.includes("ativar visao") || lower.includes("ativa visão") || lower.includes("ativa visao")) {
      requireAuth(() => activateVision());
      return;
    }
    if (lower.includes("desativar visão") || lower.includes("desativar visao") || lower.includes("desativa visão") || lower.includes("parar visão")) {
      deactivateVision("manual");
      return;
    }
    // Vision queries — only work if vision is active
    if (visionActive && (lower.includes("o que você vê") || lower.includes("o que voce ve") || lower.includes("o que está vendo") || lower.includes("descreve") || lower.includes("analise o que vê") || lower.includes("veja isso") || lower.includes("olhe") || lower.includes("veja"))) {
      requireAuth(() => captureAndAnalyzeVision(cmd));
      return;
    }

    // ─── All other commands require auth ───
    requireAuth(() => {
      if (lower.includes("resum")) extractAndAnalyze("summarize");
      else if (lower.includes("traduz")) extractAndAnalyze("translate");
      else if (lower.includes("analis")) extractAndAnalyze("analyze");
      else if (lower.includes("leia") || lower.includes("ler")) readPageAloud();
      else if (lower.includes("abrir")) chrome.runtime.sendMessage({ type: "OPEN_ORION_APP" });
      else sendAIQuery(cmd);
    });
  }

  // ─── Vision System ───

  function activateVision() {
    visionActive = true;
    lastVisionResponseTime = Date.now();
    showNotification("👁 Visão ativada — diga 'Orion, o que você vê?' para usar. Auto-desliga em 15 min sem uso.", "success");
    updateOrbVisionState(true);
    chrome.runtime.sendMessage({ type: "SET_API_STATUS", capability: "vision", status: "online" });

    // Start auto-timeout checker
    clearVisionTimer();
    visionTimer = setInterval(() => {
      if (!visionActive) { clearVisionTimer(); return; }
      const elapsed = Date.now() - lastVisionResponseTime;
      if (elapsed >= VISION_TIMEOUT_MS) {
        deactivateVision("timeout");
      }
    }, 30000);
  }

  function deactivateVision(reason) {
    visionActive = false;
    clearVisionTimer();
    updateOrbVisionState(false);
    chrome.runtime.sendMessage({ type: "SET_API_STATUS", capability: "vision", status: "offline" });

    if (reason === "timeout") {
      showNotification("👁 Visão desativada automaticamente (15 min sem uso)", "info");
    } else {
      showNotification("👁 Visão desativada", "info");
    }
  }

  function clearVisionTimer() {
    if (visionTimer) { clearInterval(visionTimer); visionTimer = null; }
  }

  function updateOrbVisionState(active) {
    if (!miniOrb) return;
    if (active) {
      miniOrb.style.borderColor = "#00ff88";
      miniOrb.style.boxShadow = "0 0 20px rgba(0, 255, 136, 0.4)";
      miniOrb.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    } else {
      miniOrb.style.borderColor = "#00E5FF";
      miniOrb.style.boxShadow = "0 0 20px rgba(0, 229, 255, 0.3)";
      miniOrb.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00B4D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  }

  function captureAndAnalyzeVision(userQuery) {
    if (!visionActive) {
      showNotification("Visão não está ativa. Diga 'Orion, ativar visão' primeiro.", "error");
      return;
    }

    showThinking();
    showNotification("📸 Capturando tela...", "info");

    chrome.runtime.sendMessage(
      { type: "ORION_VISION_CAPTURE", query: userQuery || "Descreva o que você vê nesta tela." },
      (response) => {
        hideThinking();
        if (response?.result?.response) {
          lastVisionResponseTime = Date.now();
          showResponsePanel("👁 " + response.result.response);
          speakText(response.result.response);
        } else if (response?.error) {
          showNotification("Erro na visão: " + response.error, "error");
        }
      }
    );
  }

  // ─── Page Extraction ───
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

  // ─── AI Query (calls neural-ops via background) ───
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

  // ─── TTS ───
  function speakText(text) {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    utter.rate = 1.0;
    utter.pitch = 0.95;
    window.speechSynthesis.speak(utter);
  }

  function readPageAloud(customText) {
    const text = customText || extractPageContent().content.substring(0, 2000);
    if (!text) return;
    speakText(text);
    showNotification("Lendo em voz alta...", "info");
  }

  // ─── Mini Orb (floating button) ───
  function createMiniOrb() {
    if (miniOrb) return;
    miniOrb = document.createElement("div");
    miniOrb.id = "orion-mini-orb";
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

    if (visionActive) updateOrbVisionState(true);
  }

  function pulseOrb() {
    if (!miniOrb) return;
    miniOrb.classList.add("orion-pulse");
    setTimeout(() => miniOrb.classList.remove("orion-pulse"), 2000);
  }

  // ─── Floating Panel ───
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
        <div style="display:flex;align-items:center;gap:8px;">
          <span id="orion-vision-badge" class="orion-vision-badge ${visionActive ? 'active' : ''}">${visionActive ? '👁 ON' : '👁 OFF'}</span>
          <button class="orion-panel-close" id="orion-close-panel">×</button>
        </div>
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
          <button data-action="vision-toggle" title="Ativar/desativar visão" id="orion-vision-toggle">${visionActive ? '👁 Desativar' : '👁 Ativar Visão'}</button>
          ${visionActive ? '<button data-action="vision-look" title="O que Orion vê">👁 O que vê?</button>' : ''}
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
      if (q) {
        requireAuth(() => { sendAIQuery(q); });
        input.value = "";
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { sendBtn.click(); e.preventDefault(); }
    });

    panel.querySelectorAll(".orion-quick-actions button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "vision-toggle") {
          if (visionActive) {
            deactivateVision("manual");
          } else {
            requireAuth(() => activateVision());
          }
          hidePanel();
          setTimeout(() => showPanel(), 100);
        } else if (action === "vision-look") {
          requireAuth(() => captureAndAnalyzeVision("Descreva detalhadamente o que você vê nesta tela."));
        } else {
          requireAuth(() => {
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

  // ─── Notifications ───
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

  // ─── Message Listener ───
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
        requireAuth(() => {
          const data = extractPageContent();
          chrome.runtime.sendMessage({ type: "PAGE_CONTEXT_UPDATE", ...data });
          sendAIQuery(`Analise detalhadamente esta página: ${data.title}. Conteúdo: ${data.content.substring(0, 5000)}`);
        });
        break;
      case "ORION_SUMMARIZE_PAGE":
        requireAuth(() => extractAndAnalyze("summarize"));
        break;
      case "ORION_ANALYZE_TEXT":
        requireAuth(() => sendAIQuery(`Analise o seguinte texto selecionado: "${message.text}"`));
        break;
      case "ORION_ANALYZE_IMAGE":
        requireAuth(() => {
          showNotification("Analisando imagem...", "info");
          sendAIQuery(`Descreva e analise esta imagem: ${message.imageUrl}`);
        });
        break;
      case "ORION_READ_ALOUD":
        requireAuth(() => readPageAloud(message.text));
        break;
      case "ORION_TRANSLATE":
        requireAuth(() => sendAIQuery(`Traduza para ${message.targetLang || "inglês"}: ${message.text || extractPageContent().content.substring(0, 3000)}`));
        break;
      case "ORION_EXTRACT_STRUCTURED":
        requireAuth(() => {
          const pageData = extractPageContent();
          showResponsePanel(
            `Dados Extraídos\n\nTítulo: ${pageData.title}\nURL: ${pageData.url}\nPalavras: ${pageData.wordCount}\nTítulos: ${pageData.headings.length}\nLinks: ${pageData.links.length}\nImagens: ${pageData.images.length}`
          );
        });
        break;
      case "ORION_ACTIVATE_VISION":
        requireAuth(() => activateVision());
        break;
      case "ORION_DEACTIVATE_VISION":
        deactivateVision("manual");
        break;
      case "ORION_VISION_LOOK":
        requireAuth(() => captureAndAnalyzeVision(message.query || "O que você vê?"));
        break;
    }
    sendResponse({ ok: true });
    return true;
  });

  // ─── Auto-start ───
  chrome.storage.local.get(["orionWakeWordEnabled"], (result) => {
    if (result.orionWakeWordEnabled !== false) startListening();
  });

  createMiniOrb();
})();
