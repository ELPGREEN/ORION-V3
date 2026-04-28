import { PentagonLayer, PentagonPillar } from '../types';
import { classifyIntent } from '@/lib/neural/orion-ai-client';

export class PerceptionAdapter implements PentagonLayer {
  public pillar: PentagonPillar = 'perception';

  public async process(input: unknown): Promise<unknown> {
    const text = typeof input === 'string' ? input : (input && typeof input === 'object' && 'text' in input ? (input as any).text : '');
    console.log('[Pentagon] Perception analyzing:', text);
    const classification = await classifyIntent(text);
    return {
      text,
      intent: classification.intent,
      confidence: classification.confidence,
      entities: classification.entities || [],
      raw: input
    };
  }
}
