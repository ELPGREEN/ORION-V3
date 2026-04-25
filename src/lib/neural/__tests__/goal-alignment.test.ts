import { describe, it, expect, beforeEach } from "vitest";
import { setGoal, getPrimaryGoal, checkAlignment, clearGoals } from "../goal-alignment";

describe("Goal & Alignment Layer", () => {
  beforeEach(() => {
    clearGoals();
  });

  it("should set and retrieve a primary goal", () => {
    const goal = setGoal({ description: "Resolver problemas de código", priority: 0.9 });
    const primary = getPrimaryGoal();
    expect(primary?.id).toBe(goal.id);
    expect(primary?.description).toBe("Resolver problemas de código");
  });

  it("should detect alignment deviations", () => {
    setGoal({ description: "Falar sobre culinária", priority: 1.0 });

    const highAlignment = checkAlignment("Qual a melhor receita de bolo?", "A discussão é sobre comida.");
    expect(highAlignment.score).toBeGreaterThan(0.5);

    const lowAlignment = checkAlignment("Como instalar o Linux?", "O usuário mudou de assunto radicalmente.");
    expect(lowAlignment.score).toBeLessThan(0.5);
  });

  it("should promote high priority goals", () => {
    setGoal({ id: "low", description: "Bater papo", priority: 0.1 });
    setGoal({ id: "high", description: "Emergência de segurança", priority: 1.0 });

    expect(getPrimaryGoal()?.id).toBe("high");
  });
});
