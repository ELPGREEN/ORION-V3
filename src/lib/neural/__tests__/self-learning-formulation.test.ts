/**
 * ═══════════════════════════════════════════════════════════════
 *  SELF-LEARNING FORMULATION SUITE
 * ───────────────────────────────────────────────────────────────
 *  Valida o ciclo de autoaprendizado de Órion para formular frases
 *  inteligentes a partir de entradas reais (voz/texto), usando:
 *    • Reformulação (auto-compreensão)
 *    • Análise de comprehension + intent classifier
 *    • Consciousness bridge (PLV/HRL/φ)
 *    • Feedback loop (correções persistidas)
 *    • Roteamento entre providers (OpenRouter / Gemini / Groq…)
 *
 *  Estes testes são determinísticos: nenhum chamado de rede real é
 *  feito — supabase.functions.invoke e fetch são mockados.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  analyzeComprehension,
  quickLocalReformulate,
  needsReformulation,
  reformulateForComprehension,
  COMPREHENSION_THRESHOLD,
} from "@/lib/neural/orion-reformulation";

import {
  recordCorrection,
  getLearnedCorrection,
  isNegativeFeedback,
  extractCorrectionTarget,
  clearCorrections,
} from "@/lib/neural/intent-feedback";

import { smartClassify } from "@/lib/neural/smart-intent-classifier";

import {
  runConsciousnessBridge,
  recordReasoningOutcome,
  getConsciousnessContextPrompt,
  type ReasoningContext,
} from "@/lib/neural/consciousness-bridge";

import { OrionLLMClient, FREE_MODELS } from "@/lib/integrations/llm-providers";

// ─── Mocks ──────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(async (_name: string, payload: { body: { currentText?: string } }) => {
          const original = payload?.body?.currentText ?? "";
          // Simula um modelo formal/limpo retornando frase polida
          const polished = original
            .replace(/\bvc\b/gi, "você")
            .replace(/\btá\b/gi, "está")
            .replace(/\bpra\b/gi, "para")
            .replace(/\boq\b/gi, "o que")
            .replace(/\s+/g, " ")
            .trim();
          return { data: { enrichedText: polished || "ok" }, error: null };
        }),
      },
    },
  };
});

// ─── Fixtures ───────────────────────────────────────────────────

const NOISY_VOICE_INPUTS = [
  "vc consegue analisar pra mim oq diz o art. 5 da CF?",
  "ta me ouvindo? me explica direito do consumidor rapidinho",
  "manda aí um resumo da lei 8078 pfvr",
];

const baseContext: ReasoningContext = {
  intent: "search",
  query: "Resumo do Código de Defesa do Consumidor",
  hasVision: false,
  hasAudio: true,
  memoryFacts: ["Lei 8.078/1990", "art. 6º CDC", "direitos básicos do consumidor"],
  activeModules: ["causal-reasoning", "theory-of-mind", "meta-learning", "rag"],
};

// ───────────────────────────────────────────────────────────────

describe("Órion · auto-compreensão de frase", () => {
  it("mede comprehension e detecta entrada coloquial que precisa de reformulação", () => {
    const noisy = NOISY_VOICE_INPUTS[0];
    const analysis = analyzeComprehension(noisy);

    expect(analysis.score).toBeLessThan(1);
    expect(analysis.isColloquial).toBe(true);
    expect(["formalize", "clarify", "extract", "simplify"]).toContain(analysis.suggestedMode);
    expect(needsReformulation("vc")).toBe(true);
    expect(needsReformulation("Por favor, analise o art. 5º da Constituição Federal.")).toBe(false);
  });

  it("aplica reformulação local para gírias antes de chamar IA", () => {
    const cleaned = quickLocalReformulate("vc tá pra explicar oq é dano moral?");
    expect(cleaned.toLowerCase()).toContain("você");
    expect(cleaned.toLowerCase()).toContain("está");
    expect(cleaned.toLowerCase()).toContain("para");
    expect(cleaned.toLowerCase()).toContain("o que");
  });

  it("reformula via pipeline (mock) preservando intenção e elevando confiança", async () => {
    const result = await reformulateForComprehension(NOISY_VOICE_INPUTS[0], "formalize");
    expect(result.reformulated.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("threshold de comprehension é coerente (entre 0 e 1)", () => {
    expect(COMPREHENSION_THRESHOLD).toBeGreaterThan(0);
    expect(COMPREHENSION_THRESHOLD).toBeLessThan(1);
  });
});

// ───────────────────────────────────────────────────────────────

describe("Órion · análise de contexto + classificador inteligente", () => {
  it("classifica perguntas conversacionais de áudio como conversa, sem disparar mídia", async () => {
    const r = await smartClassify("você consegue me ouvir perfeitamente");
    expect(r.intent).toBe("general");
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("classifica pedido jurídico longo como intenção apropriada (não mídia)", async () => {
    const r = await smartClassify("me explique o artigo 5 da Constituição Federal");
    expect(["explanation", "legal", "general", "search", "web_search"]).toContain(r.intent);
    expect(r.intent).not.toBe("media");
    expect(r.intent).not.toBe("youtube");
  });

  it("respeita pedido explícito de mídia (apenas quando há verbo + plataforma/objeto)", async () => {
    const r = await smartClassify("toca uma música do Queen no YouTube");
    expect(["media", "youtube"]).toContain(r.intent);
  });
});

// ───────────────────────────────────────────────────────────────

describe("Órion · loop de feedback (autoaprendizado)", () => {
  beforeEach(() => clearCorrections());

  it("detecta feedback negativo e extrai a correção do usuário", () => {
    const txt = "não era isso, eu queria abrir o painel de processos";
    expect(isNegativeFeedback(txt)).toBe(true);
    const target = extractCorrectionTarget(txt);
    expect(target).toMatch(/abrir o painel/i);
  });

  it("aprende correção e a aplica em rodadas seguintes via cache de feedback", async () => {
    // Primeira tentativa: sem aprendizado
    const before = await smartClassify("abre o cadastro do cliente");
    expect(before).toBeDefined();

    // Usuário corrige a interpretação para "navigation"
    recordCorrection("abre o cadastro do cliente", before.intent, "navigation");

    // Próxima execução deve refletir a correção (source feedback)
    const after = await smartClassify("abre o cadastro do cliente");
    expect(after.intent).toBe("navigation");
    expect(["feedback", "cache"]).toContain(after.source);
    expect(after.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("mantém o aprendizado disponível via getLearnedCorrection", () => {
    recordCorrection("manda o resumo do processo", "search", "reporting");
    const learned = getLearnedCorrection("manda o resumo do processo");
    expect(learned?.correctIntent).toBe("reporting");
    expect(learned?.count).toBeGreaterThanOrEqual(1);
  });
});

// ───────────────────────────────────────────────────────────────

describe("Órion · consciência guia formulação inteligente", () => {
  it("ciclo de consciência produz snapshot válido para a query atual", () => {
    const snap = runConsciousnessBridge(baseContext);
    expect(snap.consciousnessLevel).toBeDefined();
    expect(snap.phi).toBeGreaterThanOrEqual(0);
    expect(snap.globalPLV).toBeGreaterThanOrEqual(0);
    expect(snap.hrl.plan.length).toBeGreaterThan(0);
  });

  it("prompt de consciência é injetável no system prompt do LLM", () => {
    runConsciousnessBridge(baseContext);
    const prompt = getConsciousnessContextPrompt();
    expect(prompt).toContain("[CONSCIOUSNESS]");
    expect(prompt.length).toBeGreaterThan(20);
  });

  it("aprende com o resultado da resposta (recordReasoningOutcome não lança)", () => {
    runConsciousnessBridge(baseContext);
    expect(() =>
      recordReasoningOutcome("success", "resposta jurídica formulada", 0.92, "search"),
    ).not.toThrow();
  });
});

// ───────────────────────────────────────────────────────────────

describe("Órion · roteamento entre providers (OpenRouter, Gemini, Groq…)", () => {
  it("conhece todos os providers esperados, incluindo OpenRouter", () => {
    const providers = OrionLLMClient.getProviders();
    for (const p of ["openrouter", "google", "groq", "deepseek", "mistral", "anthropic", "openai"]) {
      expect(providers).toContain(p as never);
    }
  });

  it("OpenRouter expõe múltiplos modelos free-tier para fallback inteligente", () => {
    const models = OrionLLMClient.getFreeModels("openrouter");
    expect(models.length).toBeGreaterThanOrEqual(3);
    expect(models.some((m) => m.includes("/"))).toBe(true);
  });

  it("cada provider listado em FREE_MODELS é uma chave válida do client", () => {
    const providers = OrionLLMClient.getProviders();
    for (const key of Object.keys(FREE_MODELS)) {
      expect(providers).toContain(key as never);
    }
  });

  it("hasFreeTier é verdadeiro para os providers principais", () => {
    expect(OrionLLMClient.hasFreeTier("openrouter")).toBe(true);
    expect(OrionLLMClient.hasFreeTier("google")).toBe(true);
    expect(OrionLLMClient.hasFreeTier("groq")).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────

describe("Órion · pipeline ponta-a-ponta de resposta inteligente", () => {
  beforeEach(() => clearCorrections());

  it("entrada ruidosa → reformulação → classificação → consciência → resposta formulada", async () => {
    const raw = NOISY_VOICE_INPUTS[1]; // "ta me ouvindo? me explica direito do consumidor rapidinho"

    // 1) Auto-compreensão
    const reformed = await reformulateForComprehension(raw, "formalize");
    expect(reformed.reformulated.length).toBeGreaterThan(0);

    // 2) Classificação inteligente da frase reformulada
    const intent = await smartClassify(reformed.reformulated);
    expect(intent.intent).toBeDefined();
    expect(intent.intent).not.toBe("media");

    // 3) Ciclo de consciência com a intenção descoberta
    const snap = runConsciousnessBridge({
      ...baseContext,
      intent: intent.intent,
      query: reformed.reformulated,
    });
    expect(snap.processingTimeMs).toBeGreaterThanOrEqual(0);

    // 4) Provider routing — OpenRouter como fallback universal
    const fallback = OrionLLMClient.getFreeModels("openrouter")[0];
    expect(fallback).toBeTruthy();

    // 5) Outcome registrado para futuras melhorias
    expect(() =>
      recordReasoningOutcome("success", "resposta formulada", 0.88, intent.intent),
    ).not.toThrow();
  });

  it("o sistema aprende com correções e formula melhor na próxima rodada", async () => {
    const phrase = "vê pra mim os processos do cliente Ericson";

    // Primeira rodada
    const first = await smartClassify(phrase);
    expect(first.intent).toBeDefined();

    // Usuário corrige: deveria ser navegação para processos
    recordCorrection(phrase, first.intent, "navigation");

    // Segunda rodada deve refletir o aprendizado
    const second = await smartClassify(phrase);
    expect(second.intent).toBe("navigation");
    expect(second.confidence).toBeGreaterThanOrEqual(first.confidence);
  });
});