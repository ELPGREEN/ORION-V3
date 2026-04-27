import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pentagonMiddleware } from '@/core/pentagon/orchestrator/PentagonEnforcementMiddleware';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

vi.mock('@/lib/neural/corrective-rag', () => ({
  executeCorrectiveRAG: vi.fn().mockResolvedValue({
    finalContext: 'Mocked context',
    externalData: []
  }),
  gradeRetrieval: vi.fn().mockReturnValue({ confidence: 0.9 })
}));

vi.mock('@/lib/neural/episodic-memory', () => ({
  searchEpisodes: vi.fn().mockResolvedValue([]),
  buildEpisodicContext: vi.fn().mockReturnValue('')
}));

describe('PentagonEnforcementMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run a complete cognitive cycle with mocked LLM', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { content: 'Resposta simulada do Orion sobre CPC.' },
      error: null
    } as any);

    const input = "Qual o prazo para contestação no CPC?";
    const result = await pentagonMiddleware.executeEnforcedCycle(input, { userId: 'test-user' });

    expect(result.success).toBe(true);
    expect(result.output).toContain('Resposta simulada');
    expect(result.roiImpact).toBeDefined();

    const status = pentagonMiddleware.getCognitiveStatus();
    expect(status.history).toContain('perceiving');
    expect(status.history).toContain('reasoning');
    expect(status.history).toContain('acting');
  });
});
