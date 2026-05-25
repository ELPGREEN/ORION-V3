
import { describe, it } from 'vitest';
import { computeFreeEnergy } from '../active-inference-guard';
import { analyzeSemantics } from '../nlp-semantic-analyzer';
import { performance } from 'perf_hooks';

describe('BOLT V2.0 - Extended Performance Benchmarks', () => {
  const sampleQuery = "Quais são os requisitos para a aposentadoria por idade no INSS em 2024?";
  const sampleResponse = "Para se aposentar por idade no INSS em 2024, o segurado deve ter 65 anos (homem) ou 62 anos (mulher), com pelo menos 15 anos de contribuição. De acordo com o Art. 201 da Constituição Federal e a Lei 8.213/91, o benefício é calculado sobre a média das contribuições. É importante notar que existem regras de transição se você começou a trabalhar antes da reforma da previdência de 2019.";

  it('benchmarks active-inference-guard: computeFreeEnergy', () => {
    // Warmup
    for (let i = 0; i < 100; i++) computeFreeEnergy(sampleQuery, sampleResponse);

    const iterations = 1000;
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      computeFreeEnergy(sampleQuery, sampleResponse);
    }
    const t1 = performance.now();

    const totalTime = t1 - t0;
    console.log(`[BENCHMARK] active-inference-guard: computeFreeEnergy (${iterations} iterations): ${totalTime.toFixed(4)}ms`);
    console.log(`[BENCHMARK] Average per call: ${(totalTime / iterations).toFixed(4)}ms`);
  });

  it('benchmarks nlp-semantic-analyzer: analyzeSemantics', () => {
    // Warmup
    for (let i = 0; i < 100; i++) analyzeSemantics(sampleQuery);

    const iterations = 1000;
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      analyzeSemantics(sampleQuery);
    }
    const t1 = performance.now();

    const totalTime = t1 - t0;
    console.log(`[BENCHMARK] nlp-semantic-analyzer: analyzeSemantics (${iterations} iterations): ${totalTime.toFixed(4)}ms`);
    console.log(`[BENCHMARK] Average per call: ${(totalTime / iterations).toFixed(4)}ms`);
  });
});
