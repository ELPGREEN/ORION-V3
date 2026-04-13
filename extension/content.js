/**
 * Orion Extension v5.2 — Content Script
 * Floating widget with persistent chat, YouTube PiP, PDF/image upload,
 * page analysis, academic tools, auto-minimize on navigation.
 * Voice/STT/TTS: UNTOUCHED from v5.1.
 * Domain: iasofthub.com
 */
(function () {
  "use strict";
  if (window.__orionContentInjected) return;
  window.__orionContentInjected = true;

  // ─── Voice State (DO NOT MODIFY) ───
  let recognition = null;
  let isListening = false;

  // ─── UI State ───
  let panel = null;
  let miniOrb = null;
  let panelVisible = false;
  let chatMessages = []; // In-memory chat history for this tab

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

  // ─── PDF/Image Context ───
  let pdfContext = null;
  let imageContext = null;

  // ─── Project Context (persisted via chrome.storage) ───
  let projectContext = { topic: "", notes: [], sources: [] };

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

  // ─── Load persisted state ───
  chrome.storage.local.get(["orionChatHistory", "orionProjectContext"], (result) => {
    if (result.orionChatHistory) chatMessages = result.orionChatHistory.slice(-50);
    if (result.orionProjectContext) projectContext = result.orionProjectContext;
  });

  function persistChat() {
    chrome.storage.local.set({ orionChatHistory: chatMessages.slice(-50) });
  }

  function persistProjectContext() {
    chrome.storage.local.set({ orionProjectContext: projectContext });
  }

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
      addChatMessage("system", `🔒 ${phrase}\n\nPara usar o Orion, cadastre-se! Acesse iasofthub.com/cadastro`);
      speakText(phrase + " Para usar o Orion, você precisa se cadastrar!");
    });
  }

  function handleNonPremiumUser() {
    const msg = "👑 Orion é exclusivo para assinantes Premium! Faça upgrade em iasofthub.com/dashboard/plano";
    showNotification(msg, "info");
    addChatMessage("system", msg);
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

  function handleYouTubeDetected(videoId) {
    if (currentYouTubeVideoId === videoId) return;
    currentYouTubeVideoId = videoId;

    if (panelVisible) {
      minimizePanel();
      addChatMessage("system", "🎬 YouTube detectado — minimizando para o canto...");
    }

    setTimeout(() => tryYouTubePiP(), 2500);
  }

  function tryYouTubePiP() {
    const video = document.querySelector("video.html5-main-video, video.video-stream, video");
    if (!video) return;

    if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
      video.requestPictureInPicture()
        .then((pipWin) => {
          pipWindow = pipWin;
          showNotification("🎬 Vídeo em Picture-in-Picture — Orion ativa ao lado!", "success");
          video.addEventListener("leavepictureinpicture", () => {
            pipWindow = null;
            showNotification("🎬 PiP encerrado", "info");
          }, { once: true });
        })
        .catch((err) => {
          console.log("[Orion] PiP needs user gesture:", err.message);
          showPiPButton(video);
        });
    }
  }

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
    setTimeout(() => { if (btn.parentNode) btn.remove(); }, 15000);
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ Floating Video Overlay (like site VideoOverlay) ═══
  // ═══════════════════════════════════════════════════════════

  let videoOverlay = null;
  let videoOverlayMinimized = false;
  let videoOverlayMuted = false;
  let videoOverlayPaused = false;

  // ─── YouTube iframe postMessage control (enablejsapi=1) ───
  function postVideoCommand(func, args) {
    if (!videoOverlay) return;
    const iframe = videoOverlay.querySelector("iframe");
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: args || "" }), "*");
  }

  function pauseVideo() {
    postVideoCommand("pauseVideo");
    videoOverlayPaused = true;
    // Show brief paused indicator
    if (videoOverlay) {
      const ind = document.createElement("div");
      ind.className = "orion-vo-paused-indicator";
      ind.textContent = "⏸";
      videoOverlay.querySelector(".orion-vo-body")?.appendChild(ind);
      setTimeout(() => ind.remove(), 1200);
    }
  }

  function resumeVideo() {
    postVideoCommand("playVideo");
    videoOverlayPaused = false;
  }

  function showVideoOverlay(embedUrl, title) {
    removeVideoOverlay();
    videoOverlayMinimized = false;
    videoOverlayMuted = false;
    videoOverlayPaused = false;

    // Ensure enablejsapi=1 for postMessage control
    const sep = embedUrl.includes("?") ? "&" : "?";
    const finalUrl = embedUrl + sep + "enablejsapi=1&origin=" + encodeURIComponent(location.origin);

    videoOverlay = document.createElement("div");
    videoOverlay.id = "orion-video-overlay";
    videoOverlay.innerHTML = `
      <div class="orion-vo-shimmer-top"></div>
      <div class="orion-vo-shimmer-left"></div>
      <div class="orion-vo-shimmer-right"></div>
      <div class="orion-vo-header">
        <div class="orion-vo-title">
          <span class="orion-vo-icon">🎬</span>
          <span class="orion-vo-label">ORION PROJECTOR</span>
          <span class="orion-vo-name">${escapeHtml(title || "Vídeo")}</span>
        </div>
        <div class="orion-vo-controls">
          <button class="orion-vo-btn" data-action="mute" title="Mudo">🔊</button>
          <button class="orion-vo-btn" data-action="playpause" title="Play/Pause">⏸</button>
          <button class="orion-vo-btn" data-action="minimize" title="Minimizar">➖</button>
          <button class="orion-vo-btn" data-action="close" title="Fechar">✕</button>
        </div>
      </div>
      <div class="orion-vo-body">
        <iframe src="${finalUrl}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
      </div>
      <div class="orion-vo-shimmer-bottom"></div>
      <div class="orion-vo-resize"></div>
    `;
    document.body.appendChild(videoOverlay);

    // Controls
    videoOverlay.querySelector('[data-action="close"]').addEventListener("click", removeVideoOverlay);
    videoOverlay.querySelector('[data-action="minimize"]').addEventListener("click", toggleVideoMinimize);
    videoOverlay.querySelector('[data-action="mute"]').addEventListener("click", toggleVideoMute);
    videoOverlay.querySelector('[data-action="playpause"]').addEventListener("click", toggleVideoPlayPause);

    // Click minimized overlay to expand
    videoOverlay.addEventListener("click", (e) => {
      if (videoOverlayMinimized && !e.target.closest(".orion-vo-btn")) toggleVideoMinimize();
    });

    // Drag-to-resize (top-left corner)
    const resizeHandle = videoOverlay.querySelector(".orion-vo-resize");
    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const startX = e.clientX, startY = e.clientY;
      const startW = videoOverlay.offsetWidth, startH = videoOverlay.offsetHeight;
      const onMove = (ev) => {
        const newW = Math.max(300, startW - (ev.clientX - startX));
        const newH = Math.max(200, startH - (ev.clientY - startY));
        videoOverlay.style.width = newW + "px";
        videoOverlay.style.height = newH + "px";
      };
      const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function toggleVideoMinimize() {
    if (!videoOverlay) return;
    videoOverlayMinimized = !videoOverlayMinimized;
    videoOverlay.classList.toggle("minimized", videoOverlayMinimized);
    const label = videoOverlay.querySelector(".orion-vo-label");
    const minBtn = videoOverlay.querySelector('[data-action="minimize"]');
    if (videoOverlayMinimized) {
      label.textContent = "ORION ▶";
      minBtn.textContent = "🔲";
    } else {
      label.textContent = "ORION PROJECTOR";
      minBtn.textContent = "➖";
    }
  }

  function toggleVideoMute() {
    if (!videoOverlay) return;
    videoOverlayMuted = !videoOverlayMuted;
    const muteBtn = videoOverlay.querySelector('[data-action="mute"]');
    if (videoOverlayMuted) {
      postVideoCommand("mute");
      muteBtn.textContent = "🔇";
      muteBtn.classList.add("active");
    } else {
      postVideoCommand("unMute");
      muteBtn.textContent = "🔊";
      muteBtn.classList.remove("active");
    }
  }

  function toggleVideoPlayPause() {
    if (!videoOverlay) return;
    if (videoOverlayPaused) { resumeVideo(); }
    else { pauseVideo(); }
    const ppBtn = videoOverlay.querySelector('[data-action="playpause"]');
    if (ppBtn) ppBtn.textContent = videoOverlayPaused ? "⏸" : "▶";
  }

  function removeVideoOverlay() {
    if (videoOverlay) { videoOverlay.remove(); videoOverlay = null; }
    videoOverlayPaused = false;
    videoOverlayMuted = false;
  }

  function playVideoFromQuery(query) {
    const videoId = extractYouTubeVideoId(query);
    if (videoId) {
      showVideoOverlay(`https://www.youtube.com/embed/${videoId}?autoplay=1`, query);
    } else {
      showVideoOverlay(`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`, query);
    }
    showNotification("🎬 Reproduzindo vídeo — Orion continua ativo!", "success");
  }



  function handleUrlChange() {
    const newUrl = location.href;
    if (newUrl === lastUrl) return;
    lastUrl = newUrl;

    if (panelVisible) {
      minimizePanel();
      addChatMessage("system", "📌 Minimizando para modo flutuante...");
    }

    const videoId = extractYouTubeVideoId(newUrl);
    if (videoId) {
      handleYouTubeDetected(videoId);
    } else {
      currentYouTubeVideoId = null;
    }

    setTimeout(() => {
      chrome.runtime.sendMessage({ type: "PAGE_CONTEXT_UPDATE", url: location.href, title: document.title, domain: location.hostname });
    }, 500);
  }

  const _pushState = history.pushState;
  const _replaceState = history.replaceState;
  history.pushState = function () { _pushState.apply(this, arguments); handleUrlChange(); };
  history.replaceState = function () { _replaceState.apply(this, arguments); handleUrlChange(); };
  window.addEventListener("popstate", handleUrlChange);
  setInterval(handleUrlChange, 2000);

  if (isYouTubePage(location.href)) {
    const vid = extractYouTubeVideoId(location.href);
    if (vid) setTimeout(() => handleYouTubeDetected(vid), 1500);
  }

  // ─── Wake Word Listener (DO NOT MODIFY) ───
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

    if (lower.includes("ativar visão") || lower.includes("ativar visao") || lower.includes("ativa visão") || lower.includes("ativa visao")) {
      requireAuth(() => activateVision()); return;
    }
    if (lower.includes("desativar visão") || lower.includes("desativar visao") || lower.includes("desativa visão") || lower.includes("parar visão")) {
      deactivateVision("manual"); return;
    }
    if (visionActive && (lower.includes("o que você vê") || lower.includes("o que voce ve") || lower.includes("o que está vendo") || lower.includes("descreve") || lower.includes("analise o que vê") || lower.includes("veja isso") || lower.includes("olhe") || lower.includes("veja"))) {
      requireAuth(() => captureAndAnalyzeVision(cmd)); return;
    }

    if (lower.includes("pesquis") || lower.includes("busca") || lower.includes("procur")) {
      const searchQuery = lower.replace(/^(pesquis[ae]|busc[ae]|procur[ae])\s*/i, "").trim() || cmd;
      requireAuth(() => doWebSearch(searchQuery));
      return;
    }

    if (lower.includes("extrair página") || lower.includes("raspar") || lower.includes("scrape")) {
      requireAuth(() => doScrapeCurrentPage());
      return;
    }

    // YouTube / Video commands
    const ytVideoMatch = cmd.match(/(?:(?:abre?|abrir?|tocar?|play|reproduz(?:ir)?|assistir?|ver?)\s+(?:o?\s*)?(?:v[ií]deo|video|youtube)\s*(?:de\s+|do\s+|da\s+|sobre\s+)?(.+)|(?:v[ií]deo|video)\s+(?:de|do|da|sobre)\s+(.+))/i);
    if (ytVideoMatch) {
      const q = (ytVideoMatch[1] || ytVideoMatch[2] || cmd).trim();
      playVideoFromQuery(q);
      return;
    }

    // ─── Panel navigation commands ───
    if (/\b(?:ir|voltar?|vai?|navegar?|abrir?)\s+(?:para?\s+)?(?:o\s+)?painel(?:\s+(?:de\s+)?controle)?\b/i.test(lower) || 
        /\bpainel\s+(?:de\s+)?controle\b/i.test(lower)) {
      chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "dashboard" });
      showNotification("🚀 Abrindo painel de controle...", "success");
      return;
    }

    if (lower.includes("abrir dashboard")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "dashboard" }); return; }
    if (lower.includes("abrir documento")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "documentos" }); return; }
    if (lower.includes("abrir processo")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "processos" }); return; }
    if (lower.includes("abrir chat")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "chat" }); return; }
    if (lower.includes("abrir pesquisa")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "pesquisa" }); return; }
    if (lower.includes("abrir stf")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "stf" }); return; }
    if (lower.includes("abrir stj")) { chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: "stj" }); return; }

    // ─── Research commands — auto-detect and use page context ───
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
    addChatMessage("user", userQuery || "O que você vê?");
    showThinkingInChat();
    chrome.runtime.sendMessage(
      { type: "ORION_VISION_CAPTURE", query: userQuery || "Descreva o que você vê nesta tela." },
      (response) => {
        removeThinkingFromChat();
        if (response?.result?.response) {
          lastVisionResponseTime = Date.now();
          addChatMessage("assistant", "👁 " + response.result.response);
          speakText(response.result.response);
        } else if (response?.error) {
          addChatMessage("system", "Erro na visão: " + response.error);
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
    addChatMessage("user", `[${mode === "summarize" ? "Resumir" : mode === "translate" ? "Traduzir" : "Analisar"}] ${data.title}`);
    chrome.runtime.sendMessage({ type: "PAGE_CONTEXT_UPDATE", ...data });
    const prompts = {
      summarize: `Resuma de forma concisa e estruturada o conteúdo desta página "${data.title}": ${data.content.substring(0, 4000)}`,
      translate: `Traduza para inglês o seguinte conteúdo: ${data.content.substring(0, 3000)}`,
      analyze: `Faça uma análise completa desta página "${data.title}" (${data.url}). Identifique: tema principal, pontos-chave, dados relevantes e conclusões. Conteúdo: ${data.content.substring(0, 4000)}`,
    };
    sendAIQuery(prompts[mode] || prompts.analyze);
  }

  // ═══ Agent Labels ═══
  const AGENT_BADGES = {
    pdf_analysis: "🔬 Research",
    page_summary: "📝 Content",
    web_search: "🔍 Search",
    data_extract: "📊 Data",
    academic: "📚 Academic",
    general_chat: "🤖 Orion",
  };

  function updateAgentBadge(taskType) {
    const badge = document.getElementById("orion-agent-badge");
    if (badge) {
      badge.textContent = AGENT_BADGES[taskType] || AGENT_BADGES.general_chat;
      badge.style.display = "inline-block";
    }
  }

  // ═══ AI Query (via Agent Hub) — Research Assistant Mode ═══
  function sendAIQuery(query, taskTypeOverride) {
    showThinkingInChat();
    
    // Auto-extract page context for research enrichment
    let pageSnippet = undefined;
    try {
      const sel = window.getSelection()?.toString()?.trim();
      if (sel && sel.length > 10) {
        pageSnippet = sel.substring(0, 3000);
      } else {
        const mainContent = document.querySelector("main, article, [role=main], .content, #content");
        if (mainContent) pageSnippet = mainContent.textContent?.substring(0, 2000)?.trim();
      }
    } catch (e) {}

    const ctx = {
      url: location.href,
      title: document.title,
      projectContext,
      task_type: taskTypeOverride || undefined,
      pdfContext: pdfContext ? { filename: pdfContext.filename, textPreview: pdfContext.text.substring(0, 200) } : undefined,
      pageContent: pageSnippet,
    };

    chrome.runtime.sendMessage(
      { type: "ORION_AI_QUERY", query, context: ctx },
      (response) => {
        removeThinkingFromChat();
        if (response?.result?.fallback) {
          chrome.runtime.sendMessage({ type: "OPEN_ORION_WITH_CONTEXT", context: { query, url: location.href, title: document.title } });
        } else if (response?.result?.response) {
          const agent = response.result.agent || "Orion";
          const taskType = response.result.task_type || "general_chat";
          const prefix = agent !== "Orion" ? `[${agent}] ` : "";
          addChatMessage("assistant", prefix + response.result.response);
          updateAgentBadge(taskType);
        } else if (response?.error) {
          addChatMessage("system", "Erro: " + response.error);
        }
      }
    );
  }

  // ═══ Web Search ═══
  function doWebSearch(query) {
    addChatMessage("user", "🔍 Pesquisar: " + query);
    showThinkingInChat();
    chrome.runtime.sendMessage(
      { type: "ORION_WEB_SEARCH_REQUEST", query },
      (response) => {
        removeThinkingFromChat();
        if (response?.result?.results && response.result.results.length > 0) {
          const results = response.result.results;
          let text = `🔍 Resultados para "${query}":\n\n`;
          results.forEach((r, i) => {
            text += `${i + 1}. ${r.title || "Sem título"}\n   ${(r.description || "").substring(0, 120)}\n   ${r.url}\n\n`;
          });
          addChatMessage("assistant", text);
        } else if (response?.error) {
          addChatMessage("system", "Erro na pesquisa: " + response.error);
        } else {
          addChatMessage("assistant", "🔍 Nenhum resultado encontrado para: " + query);
        }
      }
    );
  }

  // ═══ Scrape ═══
  function doScrapeCurrentPage() {
    addChatMessage("user", "🕸 Extrair conteúdo desta página");
    showThinkingInChat();
    chrome.runtime.sendMessage(
      { type: "ORION_SCRAPE_REQUEST", url: location.href },
      (response) => {
        removeThinkingFromChat();
        if (response?.result?.markdown) {
          addChatMessage("assistant", `🕸 Conteúdo Extraído\nTítulo: ${response.result.metadata?.title || document.title}\nLinks: ${response.result.links?.length || 0}\n\n${response.result.markdown.substring(0, 4000)}`);
        } else if (response?.error) {
          addChatMessage("system", "Erro no scraping: " + response.error);
        }
      }
    );
  }

  function doScrapeUrl(url) {
    addChatMessage("user", "🕸 Extrair: " + url.substring(0, 60));
    showThinkingInChat();
    chrome.runtime.sendMessage(
      { type: "ORION_SCRAPE_REQUEST", url },
      (response) => {
        removeThinkingFromChat();
        if (response?.result?.markdown) {
          addChatMessage("assistant", `🕸 ${url}\n\n${response.result.markdown.substring(0, 4000)}`);
        } else if (response?.error) {
          addChatMessage("system", "Erro: " + response.error);
        }
      }
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ PDF Upload & Processing ═══
  // ═══════════════════════════════════════════════════════════

  function handlePDFFile(file) {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      showNotification("Apenas arquivos PDF são suportados no modo PDF", "error");
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification("PDF muito grande (máx 10MB)", "error");
      return;
    }

    addChatMessage("system", `📄 Processando ${file.name}...`);
    showThinkingInChat();

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = extractTextFromPDFBuffer(new Uint8Array(e.target.result));
      const truncated = text.length > 12000;
      pdfContext = {
        filename: file.name,
        text: text.substring(0, 12000),
        fullLength: text.length,
        truncated,
      };

      removeThinkingFromChat();
      addChatMessage("assistant", `📄 PDF carregado: ${file.name}\nTamanho: ${(file.size / 1024).toFixed(1)} KB\nTexto: ~${pdfContext.text.split(/\s+/).length} palavras${truncated ? "\n⚠️ PDF longo — usando primeiras seções." : ""}\n\nO que deseja fazer?\n• Resumir PDF\n• Extrair dados/tabelas\n• Gerar outline acadêmico\n• Perguntar sobre o conteúdo`);
      updatePanelPDFBadge();
    };
    reader.onerror = () => {
      removeThinkingFromChat();
      addChatMessage("system", "Erro ao ler o PDF");
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImageFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showNotification("Arquivo de imagem inválido", "error");
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification("Imagem muito grande (máx 5MB)", "error");
      return;
    }

    addChatMessage("system", `🖼 Processando imagem ${file.name}...`);
    showThinkingInChat();

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(",")[1];
      imageContext = { filename: file.name, base64, type: file.type };
      removeThinkingFromChat();
      addChatMessage("assistant", `🖼 Imagem carregada: ${file.name}\nTipo: ${file.type}\n\nPosso analisar esta imagem. Pergunte algo como:\n• "O que há nesta imagem?"\n• "Extraia o texto desta imagem"\n• "Descreva esta imagem"`);
    };
    reader.onerror = () => {
      removeThinkingFromChat();
      addChatMessage("system", "Erro ao ler a imagem");
    };
    reader.readAsDataURL(file);
  }

  function extractTextFromPDFBuffer(uint8Array) {
    try {
      const decoder = new TextDecoder("latin1");
      const raw = decoder.decode(uint8Array);
      const textParts = [];

      const tjMatches = raw.matchAll(/\(([^)]{1,500})\)\s*Tj/g);
      for (const m of tjMatches) {
        const cleaned = m[1].replace(/\\[nrt]/g, " ").replace(/\\\\/g, "\\").trim();
        if (cleaned.length > 1) textParts.push(cleaned);
      }

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

  // ═══ TTS (DO NOT MODIFY) ═══
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

  // ═══════════════════════════════════════════════════════════
  // ═══ Chat Message System (persistent between tabs) ═══
  // ═══════════════════════════════════════════════════════════

  function addChatMessage(role, text) {
    const msg = { role, text, time: Date.now() };
    chatMessages.push(msg);
    if (chatMessages.length > 60) chatMessages = chatMessages.slice(-50);
    persistChat();
    renderChatInPanel();
  }

  function showThinkingInChat() {
    const container = document.getElementById("orion-chat-messages");
    if (!container) return;
    let thinking = container.querySelector(".orion-chat-thinking");
    if (!thinking) {
      thinking = document.createElement("div");
      thinking.className = "orion-chat-msg system orion-chat-thinking";
      thinking.innerHTML = `<span class="orion-dot-pulse"></span> Processando...`;
      container.appendChild(thinking);
      container.scrollTop = container.scrollHeight;
    }
  }

  function removeThinkingFromChat() {
    const el = document.querySelector(".orion-chat-thinking");
    if (el) el.remove();
  }

  function renderChatInPanel() {
    const container = document.getElementById("orion-chat-messages");
    if (!container) return;

    // Remove thinking before render
    const thinking = container.querySelector(".orion-chat-thinking");

    container.innerHTML = "";
    chatMessages.forEach((msg) => {
      const div = document.createElement("div");
      div.className = `orion-chat-msg ${msg.role}`;
      div.textContent = msg.text;
      container.appendChild(div);
    });

    // Re-add thinking if it was present
    if (thinking) container.appendChild(thinking);

    container.scrollTop = container.scrollHeight;
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ Mini Orb (floating button) ═══
  // ═══════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════
  // ═══ Floating Panel with Chat History ═══
  // ═══════════════════════════════════════════════════════════

  function togglePanel() { if (panelVisible) minimizePanel(); else showPanel(); }

  function minimizePanel() {
    if (panel) { panel.remove(); panel = null; }
    panelVisible = false;
  }

  function showPanel() {
    if (panel) panel.remove();
    panel = document.createElement("div");
    panel.id = "orion-panel";

    const contextLabel = pdfContext ? `📄 ${escapeHtml(pdfContext.filename)}` : (imageContext ? `🖼 ${escapeHtml(imageContext.filename)}` : "");

    panel.innerHTML = `
      <div class="orion-panel-header">
        <span class="orion-panel-title">ORION v5.3</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <span id="orion-agent-badge" class="orion-agent-badge" style="display:none;font-size:10px;padding:2px 6px;border-radius:8px;background:#1a2a3a;color:#00E5FF;">🤖 Orion</span>
          <span id="orion-vision-badge" class="orion-vision-badge ${visionActive ? 'active' : ''}">${visionActive ? '👁 ON' : '👁 OFF'}</span>
          ${pdfContext ? '<span class="orion-pdf-badge" id="orion-pdf-badge-el">📄 PDF</span>' : ''}
          <button class="orion-panel-close" id="orion-close-panel">×</button>
        </div>
      </div>

      <!-- Chat Messages -->
      <div class="orion-chat-container" id="orion-chat-messages"></div>

      <!-- Quick Actions Bar -->
      <div class="orion-quick-bar">
        <button data-action="analyze-page" title="Analisar página atual">🔎 Analisar Página</button>
        <button data-action="summarize" title="Resumir página">📝 Resumir</button>
        <button data-action="web-search" title="Pesquisa Web">🔍 Pesquisar</button>
        <button data-action="scrape" title="Scraping">🕸 Scrape</button>
        <button data-action="vision-toggle" id="orion-vision-toggle">${visionActive ? '👁 Desativar' : '👁 Visão'}</button>
        ${visionActive ? '<button data-action="vision-look">👁 O que vê?</button>' : ''}
        ${currentYouTubeVideoId ? '<button data-action="pip">🎬 PiP</button>' : ''}
        <button data-action="academic-outline" title="Gerar outline acadêmico">📚 Outline</button>
        <button data-action="extract-data" title="Extrair dados estruturados">📊 Extrair</button>
        <button data-action="read" title="Ler em voz alta">🔊 Ler</button>
      </div>

      <!-- File Upload Zone -->
      <div id="orion-upload-zone" class="orion-upload-zone">
        <span class="orion-upload-text">📄 Arraste PDF ou imagem aqui</span>
        <input type="file" id="orion-file-input" accept=".pdf,image/*" style="display:none" />
      </div>

      <!-- Input Bar -->
      <div class="orion-input-bar">
        <input type="text" id="orion-query-input" placeholder="${pdfContext ? '💬 Pergunte sobre ' + escapeHtml(pdfContext.filename) + '...' : 'Pergunte ao Orion...'}" autocomplete="off" />
        <button id="orion-send-btn">➤</button>
      </div>

      <!-- External Links -->
      <div class="orion-ext-links">
        <a data-extlink="dashboard" title="Dashboard">🧠</a>
        <a data-extlink="documentos" title="Docs">📄</a>
        <a data-extlink="pesquisa" title="Pesquisa">⚖️</a>
        <a data-extlink="chat" title="Chat IA">💬</a>
        <a data-extlink="stf" title="STF">🏛</a>
        <a data-extlink="stj" title="STJ">⚖️</a>
        <a data-extlink="lexml" title="LexML">📚</a>
        <a data-extlink="planalto" title="Planalto">🇧🇷</a>
      </div>
    `;
    document.body.appendChild(panel);
    panelVisible = true;

    // Render persisted chat
    renderChatInPanel();

    // ─── Event Bindings ───
    panel.querySelector("#orion-close-panel").addEventListener("click", minimizePanel);

    const input = panel.querySelector("#orion-query-input");
    const sendBtn = panel.querySelector("#orion-send-btn");

    function handleSend() {
      const q = input.value.trim();
      if (!q) return;
      addChatMessage("user", q);

      if (pdfContext) {
        const pdfQuery = `Sobre o PDF "${pdfContext.filename}": ${q}\n\nContexto do PDF:\n${pdfContext.text.substring(0, 4000)}`;
        requireAuth(() => sendAIQuery(pdfQuery));
      } else if (imageContext) {
        // Send image + query to vision
        requireAuth(() => {
          showThinkingInChat();
          chrome.runtime.sendMessage(
            { type: "ORION_VISION_CAPTURE", query: q, imageBase64: imageContext.base64 },
            (response) => {
              removeThinkingFromChat();
              if (response?.result?.response) addChatMessage("assistant", response.result.response);
              else if (response?.error) addChatMessage("system", "Erro: " + response.error);
            }
          );
        });
      } else {
        requireAuth(() => sendAIQuery(q));
      }
      input.value = "";
    }

    sendBtn.addEventListener("click", handleSend);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { handleSend(); e.preventDefault(); } });

    // ─── File Upload ───
    const uploadZone = panel.querySelector("#orion-upload-zone");
    const fileInput = panel.querySelector("#orion-file-input");

    uploadZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        requireAuth(() => {
          if (file.name.toLowerCase().endsWith(".pdf")) handlePDFFile(file);
          else if (file.type.startsWith("image/")) handleImageFile(file);
          else showNotification("Formato não suportado. Use PDF ou imagem.", "error");
        });
      }
    });

    uploadZone.addEventListener("dragover", (e) => { e.preventDefault(); e.stopPropagation(); uploadZone.classList.add("drag-over"); });
    uploadZone.addEventListener("dragleave", (e) => { e.preventDefault(); uploadZone.classList.remove("drag-over"); });
    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault(); e.stopPropagation();
      uploadZone.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file) {
        requireAuth(() => {
          if (file.name.toLowerCase().endsWith(".pdf")) handlePDFFile(file);
          else if (file.type.startsWith("image/")) handleImageFile(file);
          else showNotification("Formato não suportado", "error");
        });
      }
    });

    // ─── Quick Actions ───
    panel.querySelectorAll(".orion-quick-bar button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "vision-toggle") {
          if (visionActive) deactivateVision("manual"); else requireAuth(() => activateVision());
          minimizePanel(); setTimeout(() => showPanel(), 100);
        } else if (action === "vision-look") {
          requireAuth(() => captureAndAnalyzeVision("Descreva detalhadamente o que você vê nesta tela."));
        } else if (action === "analyze-page") {
          requireAuth(() => {
            const data = extractPageContent();
            addChatMessage("user", `🔎 Analisar: ${data.title}`);
            chrome.runtime.sendMessage({ type: "PAGE_CONTEXT_UPDATE", ...data });
            sendAIQuery(`Analise esta página "${data.title}" (${data.url}). Conteúdo completo:\n\nTítulos: ${data.headings.map(h => h.text).join(", ")}\n\n${data.content.substring(0, 5000)}`);
          });
        } else if (action === "web-search") {
          const q = input.value.trim();
          if (q) { requireAuth(() => doWebSearch(q)); input.value = ""; }
          else showNotification("Digite algo para pesquisar", "info");
        } else if (action === "scrape") {
          requireAuth(() => doScrapeCurrentPage());
        } else if (action === "pip") {
          tryYouTubePiP();
        } else if (action === "academic-outline") {
          requireAuth(() => {
            const data = extractPageContent();
            const ctx = pdfContext ? `\n\nPDF Context:\n${pdfContext.text.substring(0, 4000)}` : "";
            addChatMessage("user", "📚 Gerar outline acadêmico");
            sendAIQuery(`Gere um outline estruturado para um trabalho acadêmico/profissional baseado no conteúdo desta página "${data.title}":\n\n${data.content.substring(0, 3000)}${ctx}\n\nInclua: 1) Introdução com problema/hipótese, 2) Revisão da literatura (tópicos-chave), 3) Metodologia sugerida, 4) Resultados esperados, 5) Discussão, 6) Conclusão. Formate como outline com bullets.`);
          });
        } else if (action === "extract-data") {
          requireAuth(() => {
            const pageData = extractPageContent();
            addChatMessage("assistant", `📊 Dados Extraídos\n\nTítulo: ${pageData.title}\nURL: ${pageData.url}\nPalavras: ${pageData.wordCount}\nTítulos: ${pageData.headings.length}\nLinks: ${pageData.links.length}\nImagens: ${pageData.images.length}\n\nTítulos:\n${pageData.headings.map(h => "  ".repeat(h.level - 1) + h.text).join("\n")}`);
          });
        } else if (action === "summarize") {
          requireAuth(() => extractAndAnalyze("summarize"));
        } else if (action === "read") {
          requireAuth(() => readPageAloud());
        }
      });
    });

    // External links
    panel.querySelectorAll("[data-extlink]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: el.dataset.extlink });
      });
    });

    setTimeout(() => input.focus(), 100);
  }

  function updatePanelPDFBadge() {
    const badge = document.getElementById("orion-pdf-badge-el");
    if (!badge && pdfContext && panelVisible) {
      // Re-render panel to show badge
      minimizePanel();
      showPanel();
    }
  }

  // ═══ Notifications ═══
  function showNotification(text, type = "info") {
    const n = document.createElement("div");
    n.className = `orion-notification orion-notif-${type}`;
    n.textContent = text;
    document.body.appendChild(n);
    setTimeout(() => n.classList.add("orion-notif-show"), 10);
    setTimeout(() => { n.classList.remove("orion-notif-show"); setTimeout(() => n.remove(), 300); }, 3000);
  }

  function escapeHtml(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
          addChatMessage("user", `🔎 Analisar: ${data.title}`);
          sendAIQuery(`Analise detalhadamente esta página: ${data.title}. Conteúdo: ${data.content.substring(0, 5000)}`);
        }); break;
      case "ORION_SUMMARIZE_PAGE":
        requireAuth(() => extractAndAnalyze("summarize")); break;
      case "ORION_ANALYZE_TEXT":
        requireAuth(() => {
          addChatMessage("user", `Analisar: "${message.text.substring(0, 100)}..."`);
          sendAIQuery(`Analise o seguinte texto selecionado: "${message.text}"`);
        }); break;
      case "ORION_ANALYZE_IMAGE":
        requireAuth(() => {
          addChatMessage("user", "Analisar imagem");
          sendAIQuery(`Descreva e analise esta imagem: ${message.imageUrl}`);
        }); break;
      case "ORION_READ_ALOUD":
        requireAuth(() => readPageAloud(message.text)); break;
      case "ORION_TRANSLATE":
        requireAuth(() => sendAIQuery(`Traduza para ${message.targetLang || "inglês"}: ${message.text || extractPageContent().content.substring(0, 3000)}`)); break;
      case "ORION_EXTRACT_STRUCTURED":
        requireAuth(() => {
          const pageData = extractPageContent();
          addChatMessage("assistant", `📊 Dados: ${pageData.title}\nPalavras: ${pageData.wordCount} | Títulos: ${pageData.headings.length} | Links: ${pageData.links.length}`);
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
      case "ORION_PLAY_VIDEO":
        if (message.url || message.query) {
          playVideoFromQuery(message.url || message.query);
        }
        break;
      case "ORION_NOTIFICATION":
        showNotification(message.text, message.notifType || "info"); break;
    }
    sendResponse({ ok: true });
    return true;
  });

  // ─── Global drag-and-drop for PDFs and images ───
  document.addEventListener("dragover", (e) => {
    if (e.dataTransfer.types.includes("Files")) e.preventDefault();
  });
  document.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file && (file.name.toLowerCase().endsWith(".pdf") || file.type.startsWith("image/"))) {
      e.preventDefault();
      e.stopPropagation();
      createMiniOrb();
      if (!panelVisible) showPanel();
      requireAuth(() => {
        if (file.name.toLowerCase().endsWith(".pdf")) handlePDFFile(file);
        else handleImageFile(file);
      });
    }
  });

  // ─── Auto-start ───
  chrome.storage.local.get(["orionWakeWordEnabled"], (result) => {
    if (result.orionWakeWordEnabled !== false) startListening();
  });

  createMiniOrb();
})();
