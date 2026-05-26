
import { describe, it } from 'vitest';
import { computeFreeEnergy, computeQuantumFreeEnergy } from '../active-inference-guard';
import { performance } from 'perf_hooks';

describe('BOLT V2.0 - Active Inference Benchmarks', () => {
  const query = "Qual a base legal para o despejo por falta de pagamento?";
  const response = "O despejo por falta de pagamento tem base na Lei 8.245/91, especificamente no Artigo 9, inciso III. O locador pode pedir a desocupação do imóvel se o locatário não cumprir com suas obrigações financeiras. É importante notar que a Lei do Inquilinato rege essas relações. Não tenho acesso a informações em tempo real, mas esta é a base geral.";

  it('benchmarks computeFreeEnergy', () => {
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

  it('benchmarks computeQuantumFreeEnergy', () => {
    // Warmup
    for (let i = 0; i < 100; i++) computeQuantumFreeEnergy(query, response);

    const t0 = performance.now();
    const iterations = 500;
    for (let i = 0; i < iterations; i++) {
      computeQuantumFreeEnergy(query, response);
    }
    const t1 = performance.now();

    const totalTime = t1 - t0;
    console.log(`[BENCHMARK] computeQuantumFreeEnergy (${iterations} iterations): ${totalTime.toFixed(4)}ms`);
    console.log(`[BENCHMARK] Average per call: ${(totalTime / iterations).toFixed(4)}ms`);
  });
});
