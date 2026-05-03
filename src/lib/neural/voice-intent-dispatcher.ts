/**
 * ═══ Voice Intent Dispatcher ═══
 * 
 * Transforms voice-recognized text (STT output) into structured API calls.
 * Bridges the gap between the agentic loop's intent classification
 * and the actual tool execution.
 * 
 * Pipeline: STT text → intent classification → parameter extraction → API dispatch
 * 
 * Each intent maps to a concrete Orion tool/edge function invocation,
 * not a generic AI prompt.
 */

import { supabase } from "@/integrations/supabase/client";
import { wrapEdgeFunction } from "@/lib/errors";
import { smartClassify, smartClassifySync, type ClassifiedIntent } from "./smart-intent-classifier";
import { getLastIntent, setLastIntent } from "./orion-memory";
import { OrionEvents, dispatchOrionEvent, type OrionMusicAction } from "@/lib/events/orion-events";

// ─── Types ───

export interface VoiceIntent {
  intent: string;
  confidence: number;
  params: Record<string, string>;
  rawText: string;
  alternatives?: string[];
}

export interface DispatchResult {
  success: boolean;
  intent: string;
  response: string;
  data?: unknown;
  dispatchMs: number;
}

// ─── Parameter Extraction ───

const PARAM_EXTRACTORS: Record<string, (text: string) => Record<string, string>> = {
  navigation: (text) => {
    const match = text.match(/(?:abr[ae]|v[aá]\s+para|naveg\w*\s+(?:para|pra|at[eé]))\s+(.+)/i);
    return { target: match?.[1]?.trim() || "" };
  },
  search: (text) => {
    const match = text.match(/(?:procur|busc|encontr|pesquis)\w*\s+(.+)/i);
    return { query: match?.[1]?.trim() || text };
  },
  media: (text) => {
    const match = text.match(/(?:tocar?|play|reproduz\w*|abr[aei]?r?|busc\w*|procur\w*|pesquis\w*|ouvir?|escutar?|assistir?|colocar?|encontr\w*)\s+(.+)/i);
    let query = match?.[1]?.trim() || text;
    query = query
      .replace(/^(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o|playlist|álbum|album)\s+/i, "")
      .replace(/^(?:d[oae]\s+|d[oa]\s+banda\s+|d[oa]\s+cantor\w*\s+|d[oa]\s+artista\s+|d[oa]\s+grupo\s+)/i, "")
      .replace(/^(?:qualquer\s+(?:uma?\s+)?(?:d[oae]\s+)?)/i, "")
      .trim();
    return { query: query || text, action: /\b(par[ae]|stop|paus)\b/i.test(text) ? "pause" : "play" };
  },
  legal: (text) => {
    return { query: text, type: "legal_research" };
  },
  calendar: (text) => {
    const dateMatch = text.match(/(\d{1,2})\s*(?:de\s+)?(\w+)(?:\s+(?:às|as)\s+(\d{1,2}(?::\d{2})?))?/i);
    return {
      action: /\b(agendar|marcar|criar)\b/i.test(text) ? "create" : "list",
      date: dateMatch?.[0] || "",
      query: text,
    };
  },
  calculation: (text) => {
    const match = text.match(/(?:calcul\w*|quanto\s+[eé])\s+(.+)/i);
    return { expression: match?.[1]?.trim() || text };
  },
  translation: (text) => {
    const langMatch = text.match(/(?:em|para|pro?)\s+(ingl[eê]s|espanhol|italiano|franc[eê]s|alem[aã]o|chin[eê]s|japon[eê]s)/i);
    const textMatch = text.match(/(?:traduz\w*|tradu[çc][aã]o\s+(?:de|d[oe]))\s+"?([^"]+)"?/i);
    return {
      targetLang: langMatch?.[1] || "inglês",
      text: textMatch?.[1]?.trim() || text.replace(/traduz\w*\s*/i, ""),
    };
  },
  time_date: () => {
    return { query: "current_time" };
  },
  crm: (text) => {
    return {
      action: /\b(cadastr|registr|adicionar|novo)\b/i.test(text) ? "create" : "search",
      query: text,
    };
  },
  reporting: (text) => {
    return { query: text, type: "metrics" };
  },
  web_search: (text) => {
    const cleaned = text.replace(/\b(?:pesquis|busc|procur)\w*\s+(?:na\s+internet\s+|na\s+web\s+|online\s+)?/i, "").trim();
    return { query: cleaned || text };
  },
};

// ─── Intent Dispatcher ───

/**
 * Dispatch a classified voice intent to the appropriate API endpoint.
 * Returns a structured result with the response text and any data.
 */
export async function dispatchVoiceIntent(intent: VoiceIntent, identityStatus?: string): Promise<DispatchResult> {
  if (intent.intent !== "general") setLastIntent(intent.intent);
  const t0 = performance.now();

  // ── Creator-only intents guard ──
  // Creator voice is auto-recognized by fingerprint/email and unlocks ALL commands
  const CREATOR_ONLY_INTENTS = ["self_evolve", "auto_construct", "orion_evolution"];
  if (CREATOR_ONLY_INTENTS.includes(intent.intent) && identityStatus !== "creator" && identityStatus !== "owner") {
    console.warn(`[VoiceDispatch] ❌ Blocked "${intent.intent}" — voice ID is "${identityStatus}", not "creator"`);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("orion:show-identity-gate"));
    return ok(intent.intent, "⛔ Apenas o criador pode solicitar auto-evolução do sistema. Verifique sua identidade no painel.", null, t0);
  }

  // Log creator access for transparency
  if (identityStatus === "creator") {
    console.log(`[VoiceDispatch] 👑 Creator access — all commands unlocked for "${intent.intent}"`);
  }

  try {
    const extractor = PARAM_EXTRACTORS[intent.intent];
    const params = extractor ? extractor(intent.rawText) : { query: intent.rawText };

    if (intent.intent === "general" && intent.confidence < 0.7) {
      return ok(intent.intent, generateFallbackResponse(intent), { fallback: true }, t0);
    }

    switch (intent.intent) {
      case "navigation": {
        const target = params.target || "";
        const routes: Record<string, string> = {
          "painel": "/dashboard",
          "dashboard": "/dashboard",
          "consulta": "/consulta",
          "documentos": "/dashboard/documentos",
          "processos": "/dashboard/processos",
          "clientes": "/dashboard/clientes",
          "rede neural": "/dashboard/rede-neural",
          "configurações": "/dashboard/configurar-ia",
          "loja": "/dashboard/escritorio",
          "crm": "/dashboard/crm",
          "analytics": "/dashboard/rede-neural",
        };
        const route = routes[target.toLowerCase()] || null;
        if (route) {
          // Dispatch navigation event
          if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("orion-navigate", { detail: { path: route } }));
          return ok(intent.intent, `Navegando para ${target}`, { route }, t0);
        }
        return ok(intent.intent, `Não encontrei a página "${target}". Tente: painel, consulta, documentos, processos, clientes.`, null, t0);
      }

      case "time_date": {
        const now = new Date();
        const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        return ok(intent.intent, `São ${timeStr} de ${dateStr}.`, { time: timeStr, date: dateStr }, t0);
      }

      case "calculation": {
        try {
          // Safe math evaluation (no eval)
          const expr = params.expression
            .replace(/x|×/g, "*")
            .replace(/÷/g, "/")
            .replace(/,/g, ".")
            .replace(/[^\d+\-*/().%\s]/g, "");
          const result = Function(`"use strict"; return (${expr})`)();
          return ok(intent.intent, `O resultado é ${result}.`, { expression: expr, result }, t0);
        } catch {
          return ok(intent.intent, `Não consegui calcular "${params.expression}". Tente uma expressão mais simples.`, null, t0);
        }
      }

      case "translation": {
        try {
          const data = await wrapEdgeFunction(
            supabase.functions.invoke("translate-text", {
              body: { text: params.text, target_lang: params.targetLang },
            }),
            "translate-text",
            { targetLang: params.targetLang }
          );
          return ok(intent.intent, data?.translation || data?.translated || "Tradução não disponível.", data, t0);
        } catch (err: any) {
          return fail(intent.intent, `Erro na tradução: ${err.message}`, t0);
        }
      }

      case "search": {
        try {
          const data = await wrapEdgeFunction(
            supabase.functions.invoke("neural-search", {
              body: { query: params.query, mode: "fast", max_results: 3 },
            }),
            "neural-search",
            { mode: "fast" }
          );
          const results = data?.results?.slice(0, 3) || [];
          const summary = results.length > 0
            ? results.map((r: any, i: number) => `${i + 1}. ${r.title || r.content?.slice(0, 80)}`).join(". ")
            : "Nenhum resultado encontrado.";
          return ok(intent.intent, summary, { results }, t0);
        } catch (err: any) {
          return fail(intent.intent, `Erro na busca: ${err.message}`, t0);
        }
      }

      case "web_search": {
        try {
          const data = await wrapEdgeFunction(
            supabase.functions.invoke("pesquisa-unificada", {
              body: { query: params.query, sources: ["web"], max_results: 3 },
            }),
            "pesquisa-unificada",
            { sources: ["web"] }
          );
          const results = data?.results?.slice(0, 3) || [];
          const summary = results.length > 0
            ? results.map((r: any, i: number) => `${i + 1}. ${r.title || r.description || ""}`).join(". ")
            : `Não encontrei resultados para "${params.query}".`;
          return ok(intent.intent, summary, { results }, t0);
        } catch (err: any) {
          return fail(intent.intent, `Erro na pesquisa web: ${err.message}`, t0);
        }
      }

      case "media":
      case "youtube":
      case "spotify": {
        // Use fallback resolver for music commands — NEVER passthrough, always play immediately
        const { playMusicWithFallback } = await import("./music-fallback-resolver");
        // Clean query: strip action verbs, "música/vídeo de/do", articles — extract just the artist/song
        let musicQuery = params.query || intent.rawText;
        musicQuery = musicQuery
          .replace(/^(?:abr[aei]?r?|tocar?|play|reproduz\w*|ouvir?|escutar?|assistir?|colocar?|busc\w*|procur\w*|pesquis\w*|encontr\w*)\s+/i, "")
          .replace(/^(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o|playlist|álbum|album)\s+/i, "")
          .replace(/^(?:d[oae]\s+|d[oa]\s+banda\s+|d[oa]\s+cantor\s+|d[oa]\s+cantora\s+|d[oa]\s+artista\s+|d[oa]\s+grupo\s+)/i, "")
          .replace(/^(?:qualquer\s+(?:uma?\s+)?(?:d[oae]\s+)?)/i, "")
          .trim() || "music";
        console.log(`[VoiceDispatch] Media query cleaned: "${musicQuery}" (raw: "${intent.rawText}")`);
        // Only YouTube is supported — platform hints are ignored.
        const result = await playMusicWithFallback(musicQuery);
        return ok(intent.intent, result.description, { ...params, resolvedPlatform: result.platform, fallback: result.fallback }, t0);
      }

      case "media_control": {
        const action = params.action || "play";
        dispatchOrionEvent(OrionEvents.MusicCommand, { action: action as OrionMusicAction });
        const actionLabels: Record<string, string> = {
          next: "próxima faixa",
          prev: "faixa anterior",
          pause: "pausando",
          play: "tocando"
        };
        return ok(intent.intent, actionLabels[action] || "executando", null, t0);
      }

      case "video_fullscreen": {
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("orion-video-command", {
          detail: { action: "aumentar_tela" }
        }));
        return ok(intent.intent, "Colocando vídeo em tela cheia.", null, t0);
      }

      case "video_reduce": {
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("orion-video-command", {
          detail: { action: "diminuir_tela" }
        }));
        return ok(intent.intent, "Reduzindo a tela do vídeo.", null, t0);
      }

      case "video_minimize": {
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("orion-video-command", {
          detail: { action: "minimize" }
        }));
        return ok(intent.intent, "Minimizando o vídeo.", null, t0);
      }

      case "vision_off": {
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("orion-vision-command", {
          detail: { action: "deactivate_vision", userInitiated: true, silent: true }
        }));
        // Empty response — NeuralVision owns the TTS for vision actions to avoid double-speak
        return ok(intent.intent, "", null, t0);
      }

      case "vision_on": {
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("orion-vision-command", {
          detail: { action: "activate_vision", userInitiated: true, silent: true }
        }));
        return ok(intent.intent, "", null, t0);
      }

case "self_evolve":
      case "auto_construct":
      case "orion_evolution": {
        const { getOrionEvolution } = await import("@/lib/orion-evolution/engine");
        const engine = getOrionEvolution();
        const command = params.command || "auto-evoluir";
        const args = params.args;
        const result = await engine.executeCommand(command, args);
        if (result.success) {
          return ok(intent.intent, `✅ Evolução executada: ${result.output}`, { ...params, files: result.filesCreated || result.filesModified }, t0);
        } else {
          return ok(intent.intent, `❌ Erro: ${result.error || result.output}`, { ...params, error: true }, t0);
        }
      }

      case "legal":
      case "financial":
      case "crm":
      case "reporting":
      case "analysis":
      case "explanation":
      case "philosophy":
      case "humor": {
        const { CHARADAS } = await import("./orion-charadas");
        const idx = Math.floor(Math.random() * CHARADAS.length);
        const joke = CHARADAS[idx];
        return ok("humor", `😄 ${joke.pergunta}\n\n💡 ${joke.resposta}`, params, t0);
      }

      case "security":
      case "identity": {
        const { getOrionSelfDescription } = await import("./orion-consciousness");
        return ok(intent.intent, getOrionSelfDescription("brief"), params, t0);
      }

      case "vision_describe":
      case "vision_object": {
        return ok(intent.intent, `📷 Visão: Processando comando visual '${intent.intent}'. Abra a câmera para usar.`, params, t0);
      }

      case "llm_provider": {
        const { getProviderName, FREE_MODELS, createLLMClient } = await import("@/lib/integrations/llm-providers");
        const provider = (params.provider as string) || "openai";
        const models = FREE_MODELS[provider as keyof typeof FREE_MODELS] || [];
        const modelName = models[0] || "default";
        
        return ok(intent.intent, `🔄 Proveedor ${getProviderName(provider as any)} selecionado. Modelo: ${modelName}`, { provider, model: modelName }, t0);
      }

      case "llm_status": {
        const { getProviderName } = await import("@/lib/integrations/llm-providers");
        return ok(intent.intent, "Modelo atual: Claude 3.5 Sonnet (via Supabase)", null, t0);
      }

      case "llm_list": {
        const { FREE_MODELS, getProviderName } = await import("@/lib/integrations/llm-providers");
        const list = Object.entries(FREE_MODELS).map(([p, models]) => 
          `${getProviderName(p as any)}: ${models.join(", ")}`
        ).join("\n");
        return ok(intent.intent, `Modelos disponíveis:\n${list}`, null, t0);
      }

      case "iot":
      case "calendar":
      default:
        // These intents require the full AI pipeline — return null to signal passthrough
        return {
          success: true,
          intent: intent.intent,
          response: "",
          data: { passthrough: true, params },
          dispatchMs: Math.round(performance.now() - t0),
        };
    }
  } catch (err: any) {
    return fail(intent.intent, `Erro ao processar comando: ${err.message}`, t0);
  }
}

/**
 * Classify raw speech text into a structured intent with parameters.
 * Uses smart classifier: regex first, LLM fallback for ambiguous phrases.
 */
export async function classifyVoiceCommandSmart(text: string): Promise<VoiceIntent> {
  const result = await smartClassify(text);
  return {
    intent: result.intent,
    confidence: result.confidence,
    params: result.params,
    rawText: text,
    alternatives: result.alternatives,
  };
}

/**
 * Synchronous classification (regex-only, for hot paths).
 * Falls back to "general" if no regex matches.
 */
export function classifyVoiceCommand(text: string): VoiceIntent {
  const result = smartClassifySync(text);
  if (result) {
    return {
      intent: result.intent,
      confidence: result.confidence,
      params: result.params,
      rawText: text,
      alternatives: result.alternatives
    };
  }
  return { intent: "general", confidence: 0.5, params: {}, rawText: text };
}

// ─── Helpers ───

function ok(intent: string, response: string, data: unknown, t0: number): DispatchResult {
  return { success: true, intent, response, data, dispatchMs: Math.round(performance.now() - t0) };
}

function fail(intent: string, response: string, t0: number): DispatchResult {
  return { success: false, intent, response, dispatchMs: Math.round(performance.now() - t0) };
}


/**
 * Generates a context-aware fallback response when intent confidence is low.
 */
export function generateFallbackResponse(intent: VoiceIntent): string {
    const lastIntent = getLastIntent();

  const labels: Record<string, string> = {
    navigation: "navegar para uma página",
    media: "ouvir música ou ver um vídeo",
    search: "pesquisar algo na base de conhecimento",
    web_search: "buscar informações na internet",
    legal: "fazer uma pesquisa jurídica",
    calendar: "agendar ou ver compromissos",
    translation: "traduzir um texto",
    calculation: "fazer um cálculo",
    image_generation: "gerar uma imagem",
    self_evolve: "iniciar meu ciclo de auto-evolução",
  };

  if (intent.alternatives && intent.alternatives.length > 0) {
    const suggested = intent.alternatives
      .map(alt => labels[alt] || alt)
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .slice(0, 2);

    if (suggested.length > 0) {
      const options = suggested.join(" ou ");
      return `Não tenho certeza se entendi. Você quer que eu tente ${options}, ou deseja algo diferente?`;
    }
  }

  // Very specific hints based on keywords
  if (/m[uú]sica|tocar|som/i.test(intent.rawText)) {
    return "Parece que você quer ouvir música. Quer que eu toque algo específico ou prefere uma sugestão?";
  }

  if (/v[aá]\s+para|ir\s+para|abre/i.test(intent.rawText)) {
    return "Você quer navegar para alguma página específica? Posso abrir o painel, documentos, processos ou clientes.";
  }

  if (lastIntent && lastIntent !== "general" && lastIntent !== "identity") {
    const labels: Record<string, string> = {
      navigation: "navegação",
      media: "música",
      search: "busca",
      web_search: "pesquisa na web",
      legal: "assuntos jurídicos",
      calendar: "agenda",
      translation: "tradução",
      calculation: "cálculos",
      image_generation: "geração de imagem",
    };
    const lastLabel = labels[lastIntent] || lastIntent;
    return `Não entendi bem. Você ainda quer continuar com ${lastLabel} ou deseja que eu faça algo diferente?`;
  }

  return "Não compreendi totalmente seu comando. Você quer que eu faça algo específico ou podemos apenas conversar?";
}
