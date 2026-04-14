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
import { smartClassify, smartClassifySync, type ClassifiedIntent } from "./smart-intent-classifier";

// ─── Types ───

export interface VoiceIntent {
  intent: string;
  confidence: number;
  params: Record<string, string>;
  rawText: string;
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
    const match = text.match(/(?:tocar?|play|reproduz\w*)\s+(.+)/i);
    return { query: match?.[1]?.trim() || "", action: /\b(par[ae]|stop|paus)\b/i.test(text) ? "pause" : "play" };
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
  const t0 = performance.now();

  // ── Creator-only intents guard ──
  const CREATOR_ONLY_INTENTS = ["self_evolve", "auto_construct"];
  if (CREATOR_ONLY_INTENTS.includes(intent.intent) && identityStatus !== "creator") {
    console.warn(`[VoiceDispatch] ❌ Blocked "${intent.intent}" — voice ID is "${identityStatus}", not "creator"`);
    return ok(intent.intent, "⛔ Apenas o criador pode solicitar auto-evolução do sistema.", null, t0);
  }

  try {
    const extractor = PARAM_EXTRACTORS[intent.intent];
    const params = extractor ? extractor(intent.rawText) : { query: intent.rawText };

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
          window.dispatchEvent(new CustomEvent("orion-navigate", { detail: { path: route } }));
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
        const { data, error } = await supabase.functions.invoke("translate-text", {
          body: { text: params.text, target_lang: params.targetLang },
        });
        if (error) return fail(intent.intent, `Erro na tradução: ${error.message}`, t0);
        return ok(intent.intent, data?.translation || data?.translated || "Tradução não disponível.", data, t0);
      }

      case "search": {
        const { data, error } = await supabase.functions.invoke("neural-search", {
          body: { query: params.query, mode: "fast", max_results: 3 },
        });
        if (error) return fail(intent.intent, `Erro na busca: ${error.message}`, t0);
        const results = data?.results?.slice(0, 3) || [];
        const summary = results.length > 0
          ? results.map((r: any, i: number) => `${i + 1}. ${r.title || r.content?.slice(0, 80)}`).join(". ")
          : "Nenhum resultado encontrado.";
        return ok(intent.intent, summary, { results }, t0);
      }

      case "web_search": {
        const { data, error } = await supabase.functions.invoke("pesquisa-unificada", {
          body: { query: params.query, sources: ["web"], max_results: 3 },
        });
        if (error) return fail(intent.intent, `Erro na pesquisa web: ${error.message}`, t0);
        const results = data?.results?.slice(0, 3) || [];
        const summary = results.length > 0
          ? results.map((r: any, i: number) => `${i + 1}. ${r.title || r.description || ""}`).join(". ")
          : `Não encontrei resultados para "${params.query}".`;
        return ok(intent.intent, summary, { results }, t0);
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
        const platformHint = params.platform || (intent.intent === "youtube" ? "youtube" : intent.intent === "spotify" ? "spotify" : undefined);
        const preferred = platformHint === "amazon" ? "amazon_music" as const : platformHint === "youtube" ? "youtube" as const : platformHint === "spotify" ? "spotify" as const : undefined;
        const result = await playMusicWithFallback(musicQuery, preferred);
        return ok(intent.intent, result.description, { ...params, resolvedPlatform: result.platform, fallback: result.fallback }, t0);
      }

      case "legal":
      case "financial":
      case "crm":
      case "reporting":
      case "analysis":
      case "explanation":
      case "philosophy":
      case "humor":
      case "security":
      case "identity":
      case "self_evolve":
      case "auto_construct":
      case "vision_describe":
      case "vision_object":
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
  };
}

/**
 * Synchronous classification (regex-only, for hot paths).
 * Falls back to "general" if no regex matches.
 */
export function classifyVoiceCommand(text: string): VoiceIntent {
  const result = smartClassifySync(text);
  if (result) {
    return { intent: result.intent, confidence: result.confidence, params: result.params, rawText: text };
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
