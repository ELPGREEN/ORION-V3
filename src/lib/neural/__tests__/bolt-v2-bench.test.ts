
import { describe, it, expect } from 'vitest';
import { addMemoryFacts, getLocalMemory, discoverRelationships, type MemoryEntry } from '../orion-memory';
import { getLearnedCorrection, recordCorrection } from '../intent-feedback';
import { performance } from 'perf_hooks';

describe('BOLT V2.0 - Performance Benchmarks', () => {

  it('benchmarks orion-memory: addMemoryFacts and deduplication', () => {
    const facts = [
      "O usuário gosta de café forte",
      "O usuário está vestindo uma camisa azul",
      "O usuário prefere reuniões à tarde",
      "O usuário mora em São Paulo",
      "O usuário usa óculos de grau"
    ];

    // Establishing a larger base of memories
    for (let i = 0; i < 50; i++) {
      addMemoryFacts([`Fato aleatório número ${i} para preencher a memória do sistema`], "fact", "system");
    }

    const t0 = performance.now();
    for (let i = 0; i < 100; i++) {
      addMemoryFacts(facts, "fact", "chat");
    }
    const t1 = performance.now();

    const totalTime = t1 - t0;
    console.log(`[BENCHMARK] Memory addMemoryFacts (100 iterations): ${totalTime.toFixed(4)}ms`);
    console.log(`[BENCHMARK] Average per call: ${(totalTime / 100).toFixed(4)}ms`);
  });

  it('benchmarks orion-memory: discoverRelationships', () => {
    const mems = getLocalMemory();

    const t0 = performance.now();
    for (let i = 0; i < 50; i++) {
      discoverRelationships(mems);
    }
    const t1 = performance.now();

    const totalTime = t1 - t0;
    console.log(`[BENCHMARK] Memory discoverRelationships (50 iterations, N=${mems.length}): ${totalTime.toFixed(4)}ms`);
    console.log(`[BENCHMARK] Average per call: ${(totalTime / 50).toFixed(4)}ms`);
  });

  it('benchmarks intent-feedback: getLearnedCorrection', () => {
    // Fill feedback
    for (let i = 0; i < 100; i++) {
      recordCorrection(`comando de teste numero ${i}`, "old_intent", "new_intent");
    }

    const testCommand = "comando de teste numero 50";

    const t0 = performance.now();
    for (let i = 0; i < 500; i++) {
      getLearnedCorrection(testCommand);
    }
    const t1 = performance.now();

    const totalTime = t1 - t0;
    console.log(`[BENCHMARK] Intent Feedback getLearnedCorrection (500 iterations): ${totalTime.toFixed(4)}ms`);
    console.log(`[BENCHMARK] Average per call: ${(totalTime / 500).toFixed(4)}ms`);
  });
});
