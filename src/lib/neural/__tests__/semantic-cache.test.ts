import { describe, it, expect } from "vitest";
import { tfidfWeightedJaccard, jaccardSimilarity, getWeightedTokens, calculateSetWeight, tfidfWeightedJaccardFromSets } from "../semantic-cache";

describe("Semantic Cache Similarity Engine", () => {
  describe("jaccardSimilarity", () => {
    it("should calculate correct similarity for identical strings", () => {
      const a = "o gato preto subiu no telhado";
      const b = "o gato preto subiu no telhado";
      expect(jaccardSimilarity(a, b)).toBe(1.0);
    });

    it("should calculate correct similarity for completely different strings", () => {
      const a = "banana maçã laranja";
      const b = "computador teclado mouse";
      expect(jaccardSimilarity(a, b)).toBe(0.0);
    });

    it("should calculate correct similarity for partial overlap", () => {
      const a = "gato cachorro";
      const b = "gato passarinho";
      // setA = {gato, cachorro}, setB = {gato, passarinho}
      // intersection = {gato} (size 1)
      // union = {gato, cachorro, passarinho} (size 3)
      // 1 / 3 = 0.333...
      expect(jaccardSimilarity(a, b)).toBeCloseTo(0.333, 3);
    });

    it("should handle empty strings", () => {
      expect(jaccardSimilarity("", "")).toBe(0.0);
      expect(jaccardSimilarity("abc", "")).toBe(0.0);
    });
  });

  describe("tfidfWeightedJaccard", () => {
    it("should prioritize rare legal terms", () => {
      const a = "o processo de jurisprudência";
      const b = "a jurisprudência no tribunal";

      // Stop words: o, de, a, no (weight 0)
      // Normal words: processo (1.0), tribunal (1.0)
      // Rare legal: jurisprudência (3.0)

      // setA: {processo: 1, jurisprudência: 3} -> total weight 4.0
      // setB: {jurisprudência: 3, tribunal: 1} -> total weight 4.0
      // intersection: {jurisprudência: 3} -> weight 3.0
      // union weight: 4.0 + 4.0 - 3.0 = 5.0
      // similarity: 3.0 / 5.0 = 0.6

      expect(tfidfWeightedJaccard(a, b)).toBeCloseTo(0.6, 2);
    });

    it("should give higher weight to long terms", () => {
      // "desenvolvimento" (15 chars) -> 1.5
      // "teste" (5 chars) -> 1.0
      const a = "desenvolvimento teste";
      const b = "desenvolvimento rapido";

      // setA: {desenvolvimento: 1.5, teste: 1.0} -> 2.5
      // setB: {desenvolvimento: 1.5, rapido: 1.0} -> 2.5
      // intersection: {desenvolvimento: 1.5}
      // union: 2.5 + 2.5 - 1.5 = 3.5
      // 1.5 / 3.5 = 0.42857...

      expect(tfidfWeightedJaccard(a, b)).toBeCloseTo(0.42857, 5);
    });
  });

  describe("tfidfWeightedJaccardFromSets", () => {
    it("matches tfidfWeightedJaccard result", () => {
      const a = "contrato de locação residencial";
      const b = "contrato residencial de imovel";

      const setA = getWeightedTokens(a);
      const setB = getWeightedTokens(b);
      const weightA = calculateSetWeight(setA);
      const weightB = calculateSetWeight(setB);

      const direct = tfidfWeightedJaccard(a, b);
      const fromSets = tfidfWeightedJaccardFromSets(setA, weightA, setB, weightB);

      expect(fromSets).toBe(direct);
    });
  });
});
