import { describe, it, expect, beforeEach, vi } from "vitest";
import { addMemoryFacts, getMemoryFacts } from "../orion-memory";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("Orion Memory Deduplication", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should add a new memory fact", () => {
    addMemoryFacts(["Eu gosto de café"]);
    const facts = getMemoryFacts();
    expect(facts).toContain("Eu gosto de café");
  });

  it("should deduplicate exact matches", () => {
    addMemoryFacts(["Eu gosto de café"]);
    addMemoryFacts(["Eu gosto de café"]);
    const facts = getMemoryFacts();
    expect(facts.length).toBe(1);
  });

  it("should deduplicate similar matches using word overlap", () => {
    // "Eu gosto muito de café" and "Eu gosto de café" share 3 words of length > 2
    // setA: {gosto, muito, café}, setB: {gosto, café}
    // Intersection: {gosto, café} (2)
    // Overlap: 2 / 2 = 1.0 > 0.7
    addMemoryFacts(["Eu gosto de café"]);
    addMemoryFacts(["Eu gosto muito de café"]);
    const facts = getMemoryFacts();
    expect(facts.length).toBe(1);
    // Should keep the first one unless it's a correction, but addMemoryFacts updates confidence
  });

  it("should not deduplicate distinct facts", () => {
    addMemoryFacts(["Eu gosto de café"]);
    addMemoryFacts(["O céu é azul"]);
    const facts = getMemoryFacts();
    expect(facts.length).toBe(2);
  });

  it("should handle visual observations with lower threshold", () => {
    // "Ele está vestindo uma camisa azul"
    // "Ele usa camisa azul"
    // VISUAL_KEYWORDS contains 'camisa'
    addMemoryFacts(["Ele está vestindo uma camisa azul"]);
    addMemoryFacts(["Ele usa camisa azul"]);
    const facts = getMemoryFacts();
    expect(facts.length).toBe(1);
  });
});
