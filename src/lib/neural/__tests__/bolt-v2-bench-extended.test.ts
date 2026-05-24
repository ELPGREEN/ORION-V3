
import { describe, it, expect } from 'vitest';
import { computeFreeEnergy } from '../active-inference-guard';
import { analyzeSemantics } from '../nlp-semantic-analyzer';
import { performance } from 'perf_hooks';

describe('BOLT V2.0 - Extended Performance Benchmarks', () => {
  const query = "Como faço uma petição inicial de habeas corpus contra ato de tribunal?";
  const response = "Para fazer uma petição inicial de habeas corpus, você deve primeiro identificar a autoridade coatora. De acordo com o Art. 5º da Constituição Federal, o habeas corpus é cabível sempre que alguém sofrer ou se achar ameaçado de sofrer violência ou coação em sua liberdade de locomoção. No caso de ato de tribunal, o recurso deve ser direcionado ao STJ ou STF.";

  it('benchmarks active-inference-guard: computeFreeEnergy', () => {
    // Warmup
    for (let i = 0; i < 100; i++) computeFreeEnergy(query, response);

    const t0 = performance.now();
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      computeFreeEnergy(query, response);
    }
    const t1 = performance.now();

    const totalTime = t1 - t0;
    console.log(`[BENCHMARK] computeFreeEnergy (${iterations} iterations): ${totalTime.toFixed(4)}ms`);
    console.log(`[BENCHMARK] Average per call: ${(totalTime / iterations).toFixed(4)}ms`);
  });

  it('benchmarks nlp-semantic-analyzer: analyzeSemantics', () => {
    // Warmup
    for (let i = 0; i < 100; i++) analyzeSemantics(query);

    const t0 = performance.now();
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      analyzeSemantics(query);
    }
    const t1 = performance.now();

    const totalTime = t1 - t0;
    console.log(`[BENCHMARK] analyzeSemantics (${iterations} iterations): ${totalTime.toFixed(4)}ms`);
    console.log(`[BENCHMARK] Average per call: ${(totalTime / iterations).toFixed(4)}ms`);
  });
});
