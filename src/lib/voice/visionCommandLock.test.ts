import { describe, it, expect, beforeEach } from "vitest";
import {
  shouldSuppressVisionCommand,
  resetVisionCommandLock,
  VISION_LOCK_WINDOW_MS,
} from "./visionCommandLock";

describe("visionCommandLock — debounce de 'visão ativada'", () => {
  beforeEach(() => {
    resetVisionCommandLock();
  });

  it("permite o primeiro activate_vision", () => {
    expect(shouldSuppressVisionCommand("activate_vision", 1_000)).toBe(false);
  });

  it("suprime o segundo activate_vision dentro da janela de lock", () => {
    expect(shouldSuppressVisionCommand("activate_vision", 1_000)).toBe(false);
    // Segundo disparo 100ms depois (alternância rápida) deve ser suprimido
    expect(shouldSuppressVisionCommand("activate_vision", 1_100)).toBe(true);
  });

  it("suprime múltiplos disparos rápidos vindos de fontes diferentes", () => {
    // Simula: regex local + voice-intent-dispatcher + useOrionReasoning
    const t0 = 5_000;
    const results = [
      shouldSuppressVisionCommand("activate_vision", t0),       // regex local
      shouldSuppressVisionCommand("activate_vision", t0 + 50),  // dispatcher
      shouldSuppressVisionCommand("activate_vision", t0 + 200), // reasoning
      shouldSuppressVisionCommand("activate_vision", t0 + 800), // eco
    ];
    // Apenas o primeiro deve passar; todos os demais suprimidos.
    expect(results).toEqual([false, true, true, true]);
  });

  it("libera novamente após VISION_LOCK_WINDOW_MS", () => {
    expect(shouldSuppressVisionCommand("activate_vision", 0)).toBe(false);
    expect(
      shouldSuppressVisionCommand("activate_vision", VISION_LOCK_WINDOW_MS),
    ).toBe(false);
  });

  it("não bloqueia ação diferente (deactivate logo após activate)", () => {
    expect(shouldSuppressVisionCommand("activate_vision", 1_000)).toBe(false);
    // Alternância rápida para a ação oposta deve passar
    expect(shouldSuppressVisionCommand("deactivate_vision", 1_100)).toBe(false);
    // Mas um segundo deactivate em seguida é suprimido
    expect(shouldSuppressVisionCommand("deactivate_vision", 1_200)).toBe(true);
  });

  it("garante que alternância rápida da câmera fala 'visão ativada' uma única vez", () => {
    // Cenário real: usuário diz "ativa visão" e três módulos disparam o evento
    // em sequência rápida enquanto a câmera ainda está iniciando.
    const speakCalls: string[] = [];
    const fakeSpeak = (phrase: string) => speakCalls.push(phrase);

    const dispatch = (action: "activate_vision" | "deactivate_vision", t: number) => {
      if (shouldSuppressVisionCommand(action, t)) return;
      if (action === "activate_vision") fakeSpeak("Visão ativada.");
      else fakeSpeak("Desativando visão.");
    };

    dispatch("activate_vision", 100); // regex local
    dispatch("activate_vision", 180); // dispatcher
    dispatch("activate_vision", 350); // reasoning
    dispatch("activate_vision", 900); // re-trigger por mudança de estado

    expect(speakCalls).toEqual(["Visão ativada."]);
  });
});
