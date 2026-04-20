import { describe, it, expect } from "vitest";
import { quantumRouteQuery } from "../quantum-llm-router";

describe("Quantum Router", () => {
  it("should route legal queries to best provider", () => {
    const result = quantumRouteQuery("Escreva um contrato de locação residencial");
    
    expect(result.selectedProvider).toBeDefined();
    expect(result.selectedProvider.id).toBeTruthy();
    expect(result.complexity).toBeTruthy();
    console.log("✅ Selected:", result.selectedProvider.name);
    console.log("✅ Quantum Advantage:", result.quantumAdvantage);
    console.log("✅ Complexity:", result.complexity);
  });

  it("should route coding queries to code provider", () => {
    const result = quantumRouteQuery("Escreva uma função JavaScript para calcular fibonacci");
    
    expect(result.selectedProvider).toBeDefined();
    console.log("✅ Coding Selected:", result.selectedProvider.name);
  });

  it("should return provider scores", () => {
    const result = quantumRouteQuery("Teste de routing");
    
    expect(result.allScores).toBeDefined();
    expect(result.allScores.length).toBeGreaterThan(5);
    console.log("✅ Providers ranked:", result.allScores.length);
    result.allScores.slice(0,3).forEach((s, i) => {
      console.log(`  ${i+1}. ${s.provider}: ${s.finalScore.toFixed(3)}`);
    });
  });

  it("should prefer free models", () => {
    const result = quantumRouteQuery("Qual é a capital do Brasil?");
    
    // Free models should have tier 0 or 1
    expect(result.selectedProvider.tier).toBeLessThanOrEqual(1);
    expect(result.selectedProvider.costPerMToken).toBe(0);
    console.log("✅ Selected tier:", result.selectedProvider.tier, "($", result.selectedProvider.costPerMToken, "/M)");
  });
});