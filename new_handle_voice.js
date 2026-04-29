  function handleVoiceCommand(cmd) {
    const lower = cmd.toLowerCase().trim();
    if (!lower) return;

    // ─── 1. Vision System Commands ───
    if (lower.includes("ativar visão") || lower.includes("ativar visao") || lower.includes("ativa visão") || lower.includes("ativa visao")) {
      requireAuth(() => activateVision()); return;
    }
    if (lower.includes("desativar visão") || lower.includes("desativar visao") || lower.includes("desativa visão") || lower.includes("parar visão")) {
      deactivateVision("manual"); return;
    }
    if (visionActive && (lower.includes("o que você vê") || lower.includes("o que voce ve") || lower.includes("o que está vendo") || lower.includes("descreve") || lower.includes("analise o que vê") || lower.includes("veja isso") || lower.includes("olhe") || lower.includes("veja"))) {
      requireAuth(() => captureAndAnalyzeVision(cmd)); return;
    }

    // ─── 2. Web & Research Commands ───
    if (lower.includes("pesquis") || lower.includes("busca") || lower.includes("procur")) {
      const searchQuery = lower.replace(/^(pesquis[ae]|busc[ae]|procur[ae])\s*/i, "").trim() || cmd;
      requireAuth(() => doWebSearch(searchQuery));
      return;
    }
    if (lower.includes("extrair página") || lower.includes("raspar") || lower.includes("scrape")) {
      requireAuth(() => doScrapeCurrentPage());
      return;
    }

    // ─── 3. Navigation Mirror (from Neurocore LAM) ───
    const navMap = {
      "dashboard": [/painel/i, /dashboard/i, /home/i],
      "documentos": [/documento/i, /editor/i, /petição/i],
      "processos": [/processo/i, /andamento/i],
      "clientes": [/cliente/i, /crm/i],
      "agenda": [/agenda/i, /calendário/i, /compromisso/i],
      "financeiro": [/financeiro/i, /fatura/i, /pagamento/i],
      "chat": [/chat/i, /convers/i, /falar/i],
      "rede neural": [/rede neural/i, /consciência/i, /grafo/i],
      "configurações": [/configuraç/i, /ajuste/i, /settings/i],
      "métricas": [/métrica/i, /estatística/i, /performance/i],
      "tarefas": [/tarefa/i, /task/i, /pendência/i]
    };

    if (lower.includes("abrir") || lower.includes("ir para") || lower.includes("navegar")) {
      for (const [key, patterns] of Object.entries(navMap)) {
        if (patterns.some(p => p.test(lower))) {
           addChatMessage("assistant", `🚀 Navegando para ${key}...`);
           chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", linkKey: key });
           showNotification(`🚀 Abrindo ${key}...`, "success");
           return;
        }
      }
    }

    // ─── 4. YouTube / Video logic ───
    const ytVideoMatch = cmd.match(/(?:(?:abre?|abrir?|tocar?|play|reproduz(?:ir)?|assistir?|ver?)\s+(?:o?\s*)?(?:v[ií]deo|video|youtube)\s*(?:de\s+|do\s+|da\s+|sobre\s+)?(.+)|(?:v[ií]deo|video)\s+(?:de|do|da|sobre)\s+(.+))/i);
    if (ytVideoMatch) {
      const q = (ytVideoMatch[1] || ytVideoMatch[2] || cmd).trim();
      playVideoFromQuery(q);
      return;
    }

    // ─── 5. Panel Control ───
    if (lower.includes("abrir side panel") || lower.includes("painel lateral")) {
      chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" }); return;
    }

    // ─── 6. Research fallback (auto-detect page context) ───
    requireAuth(() => {
      if (lower.includes("resum")) extractAndAnalyze("summarize");
      else if (lower.includes("traduz")) extractAndAnalyze("translate");
      else if (lower.includes("analis")) extractAndAnalyze("analyze");
      else if (lower.includes("leia") || lower.includes("ler")) readPageAloud();
      else sendAIQuery(cmd);
    });
  }
