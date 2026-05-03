
import { describe, it, expect, vi } from 'vitest';
import * as ToolExecutor from '../orion-tool-executor';
import { performance } from 'perf_hooks';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user', email: 'test@example.com' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user' } } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      single: vi.fn().mockResolvedValue({ data: {} }),
      insert: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      update: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true, result: "mocked" }, error: null }),
    }
  }
}));

// Mock browser globals
global.window = {
  location: { origin: 'http://localhost' },
  open: vi.fn(),
  dispatchEvent: vi.fn(),
} as any;

global.navigator = {
  clipboard: { writeText: vi.fn() }
} as any;

describe('Tool Executor Latency Benchmark', () => {
  const samples = [
    "Olá Orion, bom dia!",
    "Tocar Taylor Swift",
    "Agende reunião com João amanhã às 14h",
    "Qual a cotação do dólar?",
    "Gerar contrato de prestação de serviços",
    "Status da rede neural",
    "Ligar luz da sala",
    "Traduzir para inglês: O réu não compareceu",
    "Como vai o tempo em São Paulo?",
    "Me conte uma piada",
  ];

  it('measures baseline latency of matchAndExecuteTool matching logic', async () => {
    const iterations = 500;

    // Warm up
    for (let i = 0; i < 20; i++) {
      await ToolExecutor.matchAndExecuteTool(samples[i % samples.length], 'advogado', 'creator');
    }

    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      for (const sample of samples) {
        await ToolExecutor.matchAndExecuteTool(sample, 'advogado', 'creator');
      }
    }
    const t1 = performance.now();

    const totalTime = t1 - t0;
    const avgTime = totalTime / (iterations * samples.length);

    console.log(`[BENCHMARK] Total time for ${iterations * samples.length} calls: ${totalTime.toFixed(4)}ms`);
    console.log(`[BENCHMARK] Average time per call: ${avgTime.toFixed(4)}ms`);

    expect(avgTime).toBeLessThan(10); // Should be much faster now with mocks
  });
});
