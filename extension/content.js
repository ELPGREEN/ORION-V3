/**
 * Orion Extension v5.1 — Content Script
 * Wake word, page extraction, floating panel with real AI via neural-ops,
 * TTS, structured data extraction, VISION on-demand with 15min auto-timeout,
 * Web Search (Firecrawl), URL Scraping, External link navigation,
 * Anti-hallucination validation display.
 * NEW v5.1: YouTube detection + PiP, PDF upload/drag-drop, auto-minimize on navigation.
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
  const VISION_TIMEOUT_MS = 15 * 60 * 1000;
  let lastVisionResponseTime = 0;

  // ─── Auth State ───
  let userAuthenticated = false;
  let userIsPremium = false;
  let authChecked = false;
  let complimentIndex = 0;
  let observationIndex = 0;

  // ─── YouTube / PiP State ───
  let currentYouTubeVideoId = null;
  let pipWindow = null;
  let lastUrl = location.href;

  // ─── PDF Context State ───
  let pdfContext = null; // { filename, text, pageCount }

  const FIRST_VISIT_PHRASES = ["Gostei do seu estilo! Nos vemos depois. 😎"];
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
    if (authChecked) { callback(userAuthenticated, userIsPremium); return; }
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
    chrome.storage.local.get(["orionVisitCount"], (result) => {
      const visitCount = (result.orionVisitCount || 0) + 1;
      chrome.storage.local.set({ orionVisitCount: visitCount });
      let phrase;
      if (visitCount <= 1) {
        phrase = FIRST_VISIT_PHRASES[0];
      } else {
        if (visitCount % 2 === 0) { phrase = RETURN_COMPLIMENTS[complimentIndex++ % RETURN_COMPLIMENTS.length]; }
        else { phrase = RETURN_OBSERVATIONS[observationIndex++ % RETURN_OBSERVATIONS.length]; }
      }
      showNotification(phrase, "info");
      showResponsePanel(`🔒 ${phrase}\n\nPara usar o Orion, cadastre-se! Acesse iasofthub.com/cadastro`);
      speakText(phrase + " Para usar o Orion, você precisa se cadastrar!");
    });
  }

  function handleNonPremiumUser() {
    const msg = "👑 Orion é exclusivo para assinantes Premium! Faça upgrade em iasofthub.com/dashboard/plano";
    showNotification(msg, "info");
    showResponsePanel(msg);
    speakText("Orion é exclusivo para assinantes Premium. Faça upgrade no seu painel.");
  }

  function requireAuth(callback) {
    checkUserAuth((authenticated, isPremium) => {
      if (!authenticated) { handleUnauthenticatedUser(); return; }
      if (!isPremium) { handleNonPremiumUser(); return; }
      callback();
    });
  }

  // Register with background
  chrome.runtime.sendMessage({ type: "TAB_CONNECTED" }, (response) => {
    if (response?.state?.active) createMiniOrb();
  });
  chrome.runtime.sendMessage({ type: "PAGE_CONTEXT_UPDATE", url: location.href, title: document.title, domain: location.hostname });

  // ═══════════════════════════════════════════════════════════
  // ═══ YouTube Detection & Auto-Minimize & PiP ═══
  // ═══════════════════════════════════════════════════════════

  function extractYouTubeVideoId(url) {
    const m = url.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function isYouTubePage(url) {
    return /^https?:\/\/(www\.)?youtube\.com\/watch/i.test(url);
  }

  /**
   * When user navigates to a YouTube video page:
   * 1. Auto-minimize Orion panel to the orb
   * 2. Show brief notification
   * 3. Try to open PiP for the video element on the page
   */
  function handleYouTubeDetected(videoId) {
    if (currentYouTubeVideoId === videoId) return;
    currentYouTubeVideoId = videoId;

    // Auto-minimize panel
    if (panelVisible) {
      hidePanel();
      showNotification("🎬 YouTube detectado — minimizando para o canto...", "info");
    }

    // Attempt PiP on the YouTube video element after a delay (page needs to load)
    setTimeout(() => tryYouTubePiP(), 2500);
  }

  /**
   * Try to enter Picture-in-Picture on the main YouTube <video> element.
   * Works on youtube.com pages where the video element is accessible.
   */
  function tryYouTubePiP() {
    const video = document.querySelector("video.html5-main-video, video.video-stream, video");
    if (!video) {
      console.log("[Orion] No video element found for PiP");
      return;
    }

    // Only request PiP if user has interacted (required by browsers)
    if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
      video.requestPictureInPicture()
        .then((pipWin) => {
          pipWindow = pipWin;
          showNotification("🎬 Vídeo em Picture-in-Picture — Orion ativa ao lado!", "success");
          pipWin.addEventListener("resize", () => {});
          video.addEventListener("leavepictureinpicture", () => {
            pipWindow = null;
            showNotification("🎬 PiP encerrado", "info");
          }, { once: true });
        })
        .catch((err) => {
          // PiP may require user gesture — that's OK, show a button instead
          console.log("[Orion] PiP request failed (may need user gesture):", err.message);
          showPiPButton(video);
        });
    }
  }

  /**
   * Show a floating PiP button near the orb if automatic PiP fails
   * (browsers require user gesture for PiP)
   */
  function showPiPButton(videoElement) {
    if (document.getElementById("orion-pip-btn")) return;
    const btn = document.createElement("button");
    btn.id = "orion-pip-btn";
    btn.textContent = "🎬 PiP";
    btn.title = "Abrir vídeo em Picture-in-Picture";
    document.body.appendChild(btn);
    btn.addEventListener("click", () => {
      videoElement.requestPictureInPicture()
        .then((pipWin) => {
          pipWindow = pipWin;
          showNotification("🎬 Vídeo em PiP!", "success");
          btn.remove();
          videoElement.addEventListener("leavepictureinpicture", () => { pipWindow = null; }, { once: true });
        })
        .catch(() => showNotification("PiP indisponível para este vídeo", "error"));
    });
    // Auto-remove after 15s
    setTimeout(() => { if (btn.parentNode) btn.remove(); }, 15000);
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ Navigation Detection & Auto-Minimize ═══
  // ═══════════════════════════════════════════════════════════

  function handleUrlChange() {
    const newUrl = location.href;
    if (newUrl === lastUrl) return;
    lastUrl = newUrl;

    // Auto-minimize on navigation
    if (panelVisible) {
      hidePanel();
      showNotification("📌 Minimizando para modo flutuante...", "info");
    }

    // Check if navigated to YouTube
    const videoId = extractYouTubeVideoId(newUrl);
    if (videoId) {
      handleYouTubeDetected(videoId);
    } else {
      currentYouTubeVideoId = null;
    }

    // Update page context
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: "PAGE_CONTEXT_UPDATE", url: location.href, title: document.title, domain: location.hostname });
    }, 500);
  }

  // Monitor URL changes (SPA + MPA)
  const _pushState = history.pushState;
  const _replaceState = history.replaceState;
  history.pushState = function () { _pushState.apply(this, arguments); handleUrlChange(); };
  history.replaceState = function () { _replaceState.apply(this, arguments); handleUrlChange(); };
  window.addEventListener("popstate", handleUrlChange);
  // Also check periodically for YouTube SPA navigation
  setInterval(handleUrlChange, 2000);

  // Initial check for YouTube
  if (isYouTubePage(location.href)) {
    const vid = extractYouTubeVideoId(location.href);
    if (vid) setTimeout(() => handleYouTubeDetected(vid), 1500);
  }

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
      if (event.error === "not-allowed" || event.error === "service-not-allowed") { isListening = false; return; }
      if (event.error !== "aborted") setTimeout(() => { isListening = false; startListening(); }, 1200);
    };
    recognition.onend = () => { isListening = false; setTimeout(() => startListening(), 500); };
    try { recognition.start(); isListening = true; } catch (e) {}
  }

  function extractCommand(transcript) {
    const m = transcript.match(/(?:orion|órion)[,.]?\s+(.+)/i);
    return m ? m[1].trim() : null;
  }

  function handleVoiceCommand(cmd) {
    const lower = cmd.toLowerCase();

    // Vision commands
    if (lower.includes("ativar visão") || lower.includes("ativar visao") || lower.includes("ativa visão") || lower.includes("ativa visao")) {
      requireAuth(() => activateVision()); return;
    }
    if (lower.includes("desativar visão") || lower.includes("desativar visao") || lower.includes("desativa visão") || lower.includes("parar visão")) {
      deactivateVision("manual"); return;
    }
    if (visionActive && (lower.includes("o que você vê") || lower.includes("o que voce ve") || lower.includes("o que está vendo") || lower.includes("descreve") || lower.includes("analise o que vê") || lower.includes("veja isso") || lower.includes("olhe") || lower.includes("veja"))) {
      requireAuth(() => captureAndAnalyzeVision(cmd)); return;
    }

    // ═══ Web search commands ═══
    if (lower.includes("pesquis") || lower.includes("busca") || lower.includes("procur")) {
      const searchQuery = lower.replace(/^(pesquis[ae]|busc[ae]|procur[ae])\s*/i, "").trim() || cmd;
      requireAuth(() => doWebSearch(searchQuery));
      return;
    }

    // ═══ Scrape commands ═══
    if (lower.includes("extrair página") || lower.includes("raspar") || lower.includes("scrape")) {
      requireAuth(() => doScrapeCurrentPage());
      return;
    }

    // ═══ External link commands ═══
    if (lower.includes("abrir dashboard")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "dashboard" }); return; }
    if (lower.includes("abrir documento")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "documentos" }); return; }
    if (lower.includes("abrir processo")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "processos" }); return; }
    if (lower.includes("abrir chat")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "chat" }); return; }
    if (lower.includes("abrir pesquisa")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "pesquisa" }); return; }
    if (lower.includes("abrir stf")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "stf" }); return; }
    if (lower.includes("abrir stj")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "stj" }); return; }

    // Standard commands
    requireAuth(() => {
      if (lower.includes("resum")) extractAndAnalyze("summarize");
      else if (lower.includes("traduz")) extractAndAnalyze("translate");
      else if (lower.includes("analis")) extractAndAnalyze("analyze");
      else if (lower.includes("leia") || lower.includes("ler")) readPageAloud();
      else if (lower.includes("abrir")) chrome.runtime.sendMessage({ type: "OPEN_ORION_APP" });
      else sendAIQuery(cmd);
    });
  }

  // ═══ Vision System ═══
  function activateVision() {
    visionActive = true;
    lastVisionResponseTime = Date.now();
    showNotification("👁 Visão ativada — diga 'Orion, o que você vê?' para usar. Auto-desliga em 15 min sem uso.", "success");
    updateOrbVisionState(true);
    chrome.runtime.sendMessage({ type: "SET_API_STATUS", capability: "vision", status: "online" });
    clearVisionTimer();
    visionTimer = setInterval(() => {
      if (!visionActive) { clearVisionTimer(); return; }
      if (Date.now() - lastVisionResponseTime >= VISION_TIMEOUT_MS) deactivateVision("timeout");
    }, 30000);
  }

  function deactivateVision(reason) {
    visionActive = false;
    clearVisionTimer();
    updateOrbVisionState(false);
    chrome.runtime.sendMessage({ type: "SET_API_STATUS", capability: "vision", status: "offline" });
    showNotification(reason === "timeout" ? "👁 Visão desativada automaticamente (15 min sem uso)" : "👁 Visão desativada", "info");
  }

  function clearVisionTimer() { if (visionTimer) { clearInterval(visionTimer); visionTimer = null; } }

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
    if (!visionActive) { showNotification("Visão não está ativa. Diga 'Orion, ativar visão' primeiro.", "error"); return; }
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

  // ═══ Page Extraction ═══
  function extractPageContent() {
    const main = document.querySelector("main, article, [role='main'], .content, #content");
    const target = main || document.body;
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.offsetHeight === 0) return NodeFilter.FILTER_REJECT;
        return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const chunks = [];
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      if (text.length > 2) chunks.push(text);
    }
    const headings = Array.from(document.querySelectorAll("h1,h2,h3")).map((h) => ({ level: parseInt(h.tagName[1]), text: h.textContent.trim() }));
    const links = Array.from(document.querySelectorAll("a[href]")).slice(0, 30).map((a) => ({ text: a.textContent.trim().substring(0, 80), href: a.href }));
    const images = Array.from(document.querySelectorAll("img[src]")).slice(0, 15).map((img) => ({ alt: img.alt || "", src: img.src }));
    return {
      url: location.href, title: document.title, domain: location.hostname,
      content: chunks.join("\n").substring(0, 15000),
      headings, links, images,
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

  // ═══ AI Query (neural-ops via background) ═══
  function sendAIQuery(query) {
    showThinking();
    chrome.runtime.sendMessage(
      { type: "ORION_AI_QUERY", query, context: { url: location.href, title: document.title } },
      (response) => {
        hideThinking();
        if (response?.result?.fallback) {
          chrome.runtime.sendMessage({ type: "OPEN_ORION_WITH_CONTEXT", context: { query, url: location.href, title: document.title } });
        } else if (response?.result?.response) {
          showResponsePanel(response.result.response);
        } else if (response?.error) {
          showNotification("Erro: " + response.error, "error");
        }
      }
    );
  }

  // ═══ Web Search via Firecrawl ═══
  function doWebSearch(query) {
    showThinking();
    showNotification("🔍 Pesquisando: " + query.substring(0, 50) + "...", "info");
    chrome.runtime.sendMessage(
      { type: "ORION_WEB_SEARCH_REQUEST", query },
      (response) => {
        hideThinking();
        if (response?.result?.results && response.result.results.length > 0) {
          const results = response.result.results;
          let html = `🔍 <strong>Resultados para "${escapeHtml(query)}"</strong>\n\n`;
          results.forEach((r, i) => {
            html += `${i + 1}. <strong>${escapeHtml(r.title || "Sem título")}</strong>\n`;
            html += `   ${escapeHtml((r.description || "").substring(0, 150))}\n`;
            html += `   🔗 <a href="${r.url}" target="_blank" style="color:#0097a7;text-decoration:underline;font-size:11px;">${r.url}</a>\n\n`;
          });
          showResponsePanelRaw(html);
        } else if (response?.error) {
          showNotification("Erro na pesquisa: " + response.error, "error");
        } else {
          showResponsePanel("🔍 Nenhum resultado encontrado para: " + query);
        }
      }
    );
  }

  // ═══ Scrape Current Page ═══
  function doScrapeCurrentPage() {
    showThinking();
    showNotification("🕸 Extraindo conteúdo da página...", "info");
    chrome.runtime.sendMessage(
      { type: "ORION_SCRAPE_REQUEST", url: location.href },
      (response) => {
        hideThinking();
        if (response?.result?.markdown) {
          const md = response.result.markdown;
          const linkCount = response.result.links?.length || 0;
          const meta = response.result.metadata || {};
          let text = `🕸 <strong>Conteúdo Extraído</strong>\n`;
          text += `Título: ${escapeHtml(meta.title || document.title)}\n`;
          text += `Links encontrados: ${linkCount}\n\n`;
          text += escapeHtml(md.substring(0, 8000));
          showResponsePanelRaw(text);
        } else if (response?.error) {
          showNotification("Erro no scraping: " + response.error, "error");
        } else {
          showResponsePanel("🕸 Não foi possível extrair o conteúdo desta página.");
        }
      }
    );
  }

  // ═══ Scrape a specific URL ═══
  function doScrapeUrl(url) {
    showThinking();
    showNotification("🕸 Extraindo: " + url.substring(0, 50) + "...", "info");
    chrome.runtime.sendMessage(
      { type: "ORION_SCRAPE_REQUEST", url },
      (response) => {
        hideThinking();
        if (response?.result?.markdown) {
          const md = response.result.markdown;
          showResponsePanelRaw(`🕸 <strong>Conteúdo de ${escapeHtml(url)}</strong>\n\n${escapeHtml(md.substring(0, 8000))}`);
        } else if (response?.error) {
          showNotification("Erro: " + response.error, "error");
        }
      }
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ PDF Upload & Processing ═══
  // ═══════════════════════════════════════════════════════════

  /**
   * Read a PDF file from File API, extract text via basic parsing,
   * and send to Orion AI for analysis.
   */
  function handlePDFFile(file) {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      showNotification("Apenas arquivos PDF são suportados", "error");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showNotification("PDF muito grande (máx 10MB). Envie partes menores.", "error");
      return;
    }

    showThinking();
    showNotification(`📄 Processando ${file.name}...`, "info");

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      // Extract text from PDF using basic text extraction
      const text = extractTextFromPDFBuffer(new Uint8Array(arrayBuffer));
      const truncated = text.length > 12000;
      const processedText = text.substring(0, 12000);

      pdfContext = {
        filename: file.name,
        text: processedText,
        fullLength: text.length,
        truncated,
      };

      hideThinking();

      // Show PDF offer panel
      let msg = `📄 <strong>PDF carregado: ${escapeHtml(file.name)}</strong>\n`;
      msg += `Tamanho: ${(file.size / 1024).toFixed(1)} KB\n`;
      msg += `Texto extraído: ~${processedText.split(/\s+/).length} palavras\n`;
      if (truncated) msg += `⚠️ PDF longo — processando as primeiras seções para manter velocidade.\n`;
      msg += `\n<div class="orion-pdf-actions">`;
      msg += `<button class="orion-pdf-action-btn" data-pdf-action="summarize">📝 Resumir PDF</button>`;
      msg += `<button class="orion-pdf-action-btn" data-pdf-action="extract">📊 Extrair Dados</button>`;
      msg += `<button class="orion-pdf-action-btn" data-pdf-action="ask">💬 Perguntar sobre o PDF</button>`;
      msg += `</div>`;

      showResponsePanelRaw(msg);

      // Bind PDF action buttons
      setTimeout(() => {
        document.querySelectorAll(".orion-pdf-action-btn").forEach((btn) => {
          btn.addEventListener("click", () => handlePDFAction(btn.dataset.pdfAction));
        });
      }, 100);
    };

    reader.onerror = () => {
      hideThinking();
      showNotification("Erro ao ler o PDF", "error");
    };

    reader.readAsArrayBuffer(file);
  }

  /**
   * Basic PDF text extraction from raw bytes.
   * Looks for text streams between BT/ET operators.
   * For complex PDFs, we send to the AI with raw content.
   */
  function extractTextFromPDFBuffer(uint8Array) {
    try {
      // Convert to string for basic parsing
      const decoder = new TextDecoder("latin1");
      const raw = decoder.decode(uint8Array);

      // Extract text between parentheses in text objects (basic approach)
      const textParts = [];

      // Method 1: Extract text from Tj and TJ operators
      const tjMatches = raw.matchAll(/\(([^)]{1,500})\)\s*Tj/g);
      for (const m of tjMatches) {
        const cleaned = m[1].replace(/\\[nrt]/g, " ").replace(/\\\\/g, "\\").trim();
        if (cleaned.length > 1) textParts.push(cleaned);
      }

      // Method 2: Extract from TJ arrays
      const tjArrayMatches = raw.matchAll(/\[((?:\([^)]*\)[^]]*?)+)\]\s*TJ/gi);
      for (const m of tjArrayMatches) {
        const innerMatches = m[1].matchAll(/\(([^)]{1,500})\)/g);
        const parts = [];
        for (const im of innerMatches) {
          const cleaned = im[1].replace(/\\[nrt]/g, " ").replace(/\\\\/g, "\\").trim();
          if (cleaned) parts.push(cleaned);
        }
        if (parts.length > 0) textParts.push(parts.join(""));
      }

      // Method 3: Look for stream content with readable text
      if (textParts.length < 5) {
        const streamMatches = raw.matchAll(/stream\r?\n([\s\S]{10,5000}?)\r?\nendstream/g);
        for (const m of streamMatches) {
          const readable = m[1].replace(/[^\x20-\x7E\xC0-\xFF]/g, " ").replace(/\s+/g, " ").trim();
          if (readable.length > 20 && /[a-zA-ZÀ-ÿ]{3,}/.test(readable)) {
            textParts.push(readable.substring(0, 2000));
          }
        }
      }

      const result = textParts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
      return result || "[Texto não pôde ser extraído — PDF pode ser escaneado/imagem. Envie ao Orion para OCR via visão.]";
    } catch (err) {
      return "[Erro na extração de texto do PDF]";
    }
  }

  function handlePDFAction(action) {
    if (!pdfContext) {
      showNotification("Nenhum PDF carregado", "error");
      return;
    }

    const { filename, text, truncated } = pdfContext;
    let prompt;

    switch (action) {
      case "summarize":
        prompt = `Resuma de forma estruturada o seguinte documento PDF "${filename}":\n\n${text.substring(0, 6000)}`;
        break;
      case "extract":
        prompt = `Extraia os dados principais, tabelas, valores e informações relevantes deste PDF "${filename}":\n\n${text.substring(0, 6000)}`;
        break;
      case "ask":
        // Switch panel input to PDF context mode
        const input = document.getElementById("orion-query-input");
        if (input) {
          input.placeholder = `💬 Pergunte sobre "${filename}"...`;
          input.dataset.pdfMode = "true";
          input.focus();
        }
        showNotification(`💬 Modo PDF ativo — pergunte sobre "${filename}"`, "info");
        return;
      default:
        prompt = `Analise o documento "${filename}":\n\n${text.substring(0, 6000)}`;
    }

    if (truncated) prompt += "\n\n[Nota: PDF truncado por tamanho. Estes são os primeiros 12.000 caracteres.]";

    requireAuth(() => sendAIQuery(prompt));
  }

  // ═══ TTS ═══
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

  // ═══ Mini Orb (floating button) ═══
  function createMiniOrb() {
    if (miniOrb) return;
    miniOrb = document.createElement("div");
    miniOrb.id = "orion-mini-orb";
    miniOrb.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00B4D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    document.body.appendChild(miniOrb);
    let isDragging = false, startX, startY, orbX, orbY;
    miniOrb.addEventListener("mousedown", (e) => {
      isDragging = false; startX = e.clientX; startY = e.clientY;
      const rect = miniOrb.getBoundingClientRect(); orbX = rect.left; orbY = rect.top;
      const onMove = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) isDragging = true;
        if (isDragging) { miniOrb.style.left = (orbX + dx) + "px"; miniOrb.style.top = (orbY + dy) + "px"; miniOrb.style.right = "auto"; miniOrb.style.bottom = "auto"; }
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

  // ═══ Floating Panel ═══
  function togglePanel() { if (panelVisible) hidePanel(); else showPanel(); }

  function showPanel() {
    if (panel) panel.remove();
    panel = document.createElement("div");
    panel.id = "orion-panel";
    panel.innerHTML = `
      <div class="orion-panel-header">
        <span class="orion-panel-title">ORION v5.1</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span id="orion-vision-badge" class="orion-vision-badge ${visionActive ? 'active' : ''}">${visionActive ? '👁 ON' : '👁 OFF'}</span>
          ${pdfContext ? `<span class="orion-pdf-badge">📄 PDF</span>` : ''}
          <button class="orion-panel-close" id="orion-close-panel">×</button>
        </div>
      </div>
      <div class="orion-panel-body">
        <div class="orion-input-row">
          <input type="text" id="orion-query-input" placeholder="${pdfContext ? '💬 Pergunte sobre ' + escapeHtml(pdfContext.filename) + '...' : 'Pergunte ao Orion...'}" autocomplete="off" ${pdfContext ? 'data-pdf-mode="true"' : ''}/>
          <button id="orion-send-btn">Enviar</button>
        </div>
        <div class="orion-quick-actions">
          <button data-action="summarize" title="Resumir página">📝 Resumir</button>
          <button data-action="analyze" title="Analisar página">🔎 Analisar</button>
          <button data-action="read" title="Ler em voz alta">🔊 Ler</button>
          <button data-action="extract" title="Extrair dados">📊 Extrair</button>
          <button data-action="web-search" title="Pesquisa Web">🔍 Pesquisar</button>
          <button data-action="scrape" title="Scraping desta página">🕸 Scrape</button>
          <button data-action="vision-toggle" id="orion-vision-toggle">${visionActive ? '👁 Desativar' : '👁 Visão'}</button>
          ${visionActive ? '<button data-action="vision-look" title="O que Orion vê">👁 O que vê?</button>' : ''}
          ${currentYouTubeVideoId ? '<button data-action="pip" title="Picture-in-Picture">🎬 PiP</button>' : ''}
        </div>

        <!-- PDF Drop Zone -->
        <div id="orion-pdf-dropzone" class="orion-pdf-dropzone">
          <span class="orion-pdf-dropzone-text">📄 Arraste um PDF aqui ou clique para enviar</span>
          <input type="file" id="orion-pdf-file-input" accept=".pdf" style="display:none" />
        </div>

        <div class="orion-external-links">
          <div class="orion-links-label">Links Externos</div>
          <div class="orion-links-row">
            <a data-extlink="dashboard" title="Dashboard">🧠</a>
            <a data-extlink="documentos" title="Documentos">📄</a>
            <a data-extlink="pesquisa" title="Pesquisa">⚖️</a>
            <a data-extlink="chat" title="Chat IA">💬</a>
            <a data-extlink="stf" title="STF">🏛</a>
            <a data-extlink="stj" title="STJ">⚖️</a>
            <a data-extlink="lexml" title="LexML">📚</a>
            <a data-extlink="planalto" title="Planalto">🇧🇷</a>
          </div>
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
      if (!q) return;
      // If in PDF mode, prepend context
      if (input.dataset.pdfMode === "true" && pdfContext) {
        const pdfQuery = `Sobre o PDF "${pdfContext.filename}": ${q}\n\nContexto do PDF:\n${pdfContext.text.substring(0, 4000)}`;
        requireAuth(() => sendAIQuery(pdfQuery));
      } else {
        requireAuth(() => sendAIQuery(q));
      }
      input.value = "";
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { sendBtn.click(); e.preventDefault(); } });

    // ─── PDF Drop Zone ───
    const dropzone = panel.querySelector("#orion-pdf-dropzone");
    const fileInput = panel.querySelector("#orion-pdf-file-input");

    dropzone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      if (e.target.files[0]) {
        requireAuth(() => handlePDFFile(e.target.files[0]));
      }
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("drag-over");
    });
    dropzone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file) {
        requireAuth(() => handlePDFFile(file));
      }
    });

    // Quick actions
    panel.querySelectorAll(".orion-quick-actions button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "vision-toggle") {
          if (visionActive) deactivateVision("manual"); else requireAuth(() => activateVision());
          hidePanel(); setTimeout(() => showPanel(), 100);
        } else if (action === "vision-look") {
          requireAuth(() => captureAndAnalyzeVision("Descreva detalhadamente o que você vê nesta tela."));
        } else if (action === "web-search") {
          const q = input.value.trim();
          if (q) { requireAuth(() => doWebSearch(q)); input.value = ""; }
          else { showNotification("Digite algo para pesquisar", "info"); }
        } else if (action === "scrape") {
          requireAuth(() => doScrapeCurrentPage());
        } else if (action === "pip") {
          tryYouTubePiP();
        } else {
          requireAuth(() => {
            if (action === "summarize") extractAndAnalyze("summarize");
            else if (action === "analyze") extractAndAnalyze("analyze");
            else if (action === "read") readPageAloud();
            else if (action === "extract") {
              const pageData = extractPageContent();
              showResponsePanel(
                `Dados Extraídos\n\nTítulo: ${pageData.title}\nURL: ${pageData.url}\nPalavras: ${pageData.wordCount}\nTítulos: ${pageData.headings.length}\nLinks: ${pageData.links.length}\nImagens: ${pageData.images.length}\n\nTítulos:\n${pageData.headings.map(h => `${"  ".repeat(h.level - 1)}${h.text}`).join("\n")}`
              );
            }
          });
        }
      });
    });

    // External links in panel
    panel.querySelectorAll("[data-extlink]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: el.dataset.extlink });
      });
    });

    setTimeout(() => input.focus(), 100);
  }

  function hidePanel() { if (panel) { panel.remove(); panel = null; } panelVisible = false; }

  function showResponsePanel(text) {
    if (!panel) showPanel();
    const el = document.getElementById("orion-response");
    if (el) { el.innerHTML = `<div class="orion-response-text">${escapeHtml(text)}</div>`; el.scrollTop = el.scrollHeight; }
  }

  function showResponsePanelRaw(html) {
    if (!panel) showPanel();
    const el = document.getElementById("orion-response");
    if (el) { el.innerHTML = `<div class="orion-response-text">${html}</div>`; el.scrollTop = el.scrollHeight; }
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
        createMiniOrb(); pulseOrb(); break;
      case "ORION_TOGGLE_LISTENING":
        if (isListening && recognition) { recognition.abort(); isListening = false; showNotification("Escuta desativada", "info"); }
        else { startListening(); showNotification("Escuta ativada", "success"); }
        break;
      case "ORION_EXTRACT_PAGE":
        requireAuth(() => {
          const data = extractPageContent();
          chrome.runtime.sendMessage({ type: "PAGE_CONTEXT_UPDATE", ...data });
          sendAIQuery(`Analise detalhadamente esta página: ${data.title}. Conteúdo: ${data.content.substring(0, 5000)}`);
        }); break;
      case "ORION_SUMMARIZE_PAGE":
        requireAuth(() => extractAndAnalyze("summarize")); break;
      case "ORION_ANALYZE_TEXT":
        requireAuth(() => sendAIQuery(`Analise o seguinte texto selecionado: "${message.text}"`)); break;
      case "ORION_ANALYZE_IMAGE":
        requireAuth(() => { showNotification("Analisando imagem...", "info"); sendAIQuery(`Descreva e analise esta imagem: ${message.imageUrl}`); }); break;
      case "ORION_READ_ALOUD":
        requireAuth(() => readPageAloud(message.text)); break;
      case "ORION_TRANSLATE":
        requireAuth(() => sendAIQuery(`Traduza para ${message.targetLang || "inglês"}: ${message.text || extractPageContent().content.substring(0, 3000)}`)); break;
      case "ORION_EXTRACT_STRUCTURED":
        requireAuth(() => {
          const pageData = extractPageContent();
          showResponsePanel(`Dados Extraídos\n\nTítulo: ${pageData.title}\nURL: ${pageData.url}\nPalavras: ${pageData.wordCount}\nTítulos: ${pageData.headings.length}\nLinks: ${pageData.links.length}\nImagens: ${pageData.images.length}`);
        }); break;
      case "ORION_ACTIVATE_VISION":
        requireAuth(() => activateVision()); break;
      case "ORION_DEACTIVATE_VISION":
        deactivateVision("manual"); break;
      case "ORION_VISION_LOOK":
        requireAuth(() => captureAndAnalyzeVision(message.query || "O que você vê?")); break;
      case "ORION_WEB_SEARCH":
        requireAuth(() => doWebSearch(message.query)); break;
      case "ORION_SCRAPE_URL":
        requireAuth(() => doScrapeUrl(message.url)); break;
      case "ORION_OPEN_SEARCH_PANEL":
        showPanel();
        setTimeout(() => {
          const input = document.getElementById("orion-query-input");
          if (input) { input.placeholder = "🔍 Pesquisar na Web..."; input.focus(); }
        }, 200);
        break;
    }
    sendResponse({ ok: true });
    return true;
  });

  // ─── Global drag-and-drop for PDFs (even outside panel) ───
  document.addEventListener("dragover", (e) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
    }
  });
  document.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".pdf")) {
      e.preventDefault();
      e.stopPropagation();
      createMiniOrb();
      if (!panelVisible) showPanel();
      requireAuth(() => handlePDFFile(file));
    }
  });

  // ─── Auto-start ───
  chrome.storage.local.get(["orionWakeWordEnabled"], (result) => {
    if (result.orionWakeWordEnabled !== false) startListening();
  });

  createMiniOrb();
})();
