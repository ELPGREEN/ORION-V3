import { describe, it, expect } from 'vitest';
import { PentagonPizzaOrchestrator } from '../orchestrator/PentagonPizzaOrchestrator';
import { PerceptionAdapter } from '../layers/perception/PerceptionAdapter';
import { MemoryAdapter } from '../layers/memory/MemoryAdapter';
import { ReasoningAdapter } from '../layers/reasoning/ReasoningAdapter';
import { MetaAdapter } from '../layers/meta/MetaAdapter';
import { ActionAdapter } from '../layers/action/ActionAdapter';

describe('PentagonPizzaOrchestrator', () => {
  it('should run a full cognitive cycle', async () => {
    const orchestrator = PentagonPizzaOrchestrator.getInstance();
    await orchestrator.initialize([
      new PerceptionAdapter(),
      new MemoryAdapter(),
      new ReasoningAdapter(),
      new MetaAdapter(),
      new ActionAdapter()
    ]);
    const result = await orchestrator.runCycle('test');
    expect(result).toBeDefined();
  });
});
