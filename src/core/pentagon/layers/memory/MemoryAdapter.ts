import { PentagonLayer, PentagonPillar } from '../types';
import { buildCognitionContext } from '@/lib/neural/neural-cognition-engine';
import { executeCorrectiveRAG } from '@/lib/neural/corrective-rag';

export class MemoryAdapter implements PentagonLayer {
  public pillar: PentagonPillar = 'memory';

  public async process(input: unknown): Promise<unknown> {
    const data = input as { text: string; intent: string };
    const { text, intent } = data;
    const [cognition, crag] = await Promise.all([
      buildCognitionContext(text, [], intent),
      executeCorrectiveRAG({
        query: text,
        context: '',
        userId: 'system',
        forceWebSearch: intent === 'web_search'
      })
    ]);
    return { ...data, cognition, crag };
  }
}
