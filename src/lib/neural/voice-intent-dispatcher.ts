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
};

// ─── Intent Dispatcher ───

/**
 * Dispatch a classified voice intent to the appropriate API endpoint.
 * Returns a structured result with the response text and any data.
 */
export async function dispatchVoiceIntent(intent: VoiceIntent): Promise<DispatchResult> {
  const t0 = performance.now();

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

      case "media": {
        // Dispatch to Spotify/YouTube Music via event
        window.dispatchEvent(new CustomEvent("orion-media", { detail: params }));
        return ok(intent.intent, params.action === "pause" ? "Pausando." : `Procurando "${params.query}"...`, params, t0);
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
 * Lightweight client-side classification (no API call needed).
 */
export function classifyVoiceCommand(text: string): VoiceIntent {
  const q = text.toLowerCase().trim();

  const patterns: Array<{ pattern: RegExp; intent: string; confidence: number }> = [
    { pattern: /^(?:abr[ae]|v[aá]\s+para|naveg)/i, intent: "navigation", confidence: 0.95 },
    { pattern: /^(?:que\s+hora|que\s+dia|data\s+de\s+hoje)/i, intent: "time_date", confidence: 0.98 },
    { pattern: /^(?:calcul|quanto\s+[eé]|some|multipliqu|divid)/i, intent: "calculation", confidence: 0.95 },
    { pattern: /^(?:traduz|tradu[çc][aã]o)/i, intent: "translation", confidence: 0.93 },
    { pattern: /^(?:tocar?|play|reproduz|m[uú]sica)/i, intent: "media", confidence: 0.92 },
    { pattern: /^(?:procur|busc|encontr|pesquis)/i, intent: "search", confidence: 0.90 },
    { pattern: /(?:lei|artigo|c[oó]digo|jurisprud|peti[çc][aã]o)/i, intent: "legal", confidence: 0.88 },
    { pattern: /(?:agendar|compromisso|reuni[aã]o|marcar)/i, intent: "calendar", confidence: 0.88 },
    { pattern: /(?:pipeline|lead|oportunidade|neg[oó]cio)/i, intent: "crm", confidence: 0.85 },
    { pattern: /(?:relat[oó]rio|m[eé]tricas|estat[ií]sticas)/i, intent: "reporting", confidence: 0.85 },
    { pattern: /(?:o\s+que\s+(?:voc[eê]|vc)\s+v[eê]|enxerga)/i, intent: "vision_describe", confidence: 0.95 },
    { pattern: /(?:quem\s+[eé]|reconhec)/i, intent: "identity", confidence: 0.90 },
    { pattern: /(?:seguran[çc]a|amea[çc]a|shield)/i, intent: "security", confidence: 0.88 },
  ];

  for (const { pattern, intent, confidence } of patterns) {
    if (pattern.test(q)) {
      return { intent, confidence, params: {}, rawText: text };
    }
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
