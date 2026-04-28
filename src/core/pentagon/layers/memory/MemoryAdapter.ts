import { PentagonLayer, PentagonPillar } from '../types';
import { buildCognitionContext } from '@/lib/neural/neural-cognition-engine';
import { executeCorrectiveRAG } from '@/lib/neural/corrective-rag';

export class MemoryAdapter implements PentagonLayer {
  public pillar: PentagonPillar = 'memory';

  public async process(input: any): Promise<unknown> {
    const { text, intent } = input;
    const [cognition, crag] = await Promise.all([
      buildCognitionContext(text, [], intent),
      executeCorrectiveRAG({
        query: text,
        context: '', // Fixed: passing empty string instead of empty object
        userId: 'system',
        forceWebSearch: intent === 'web_search'
      })
    ]);
    return { ...input, cognition, crag };
  }
}
