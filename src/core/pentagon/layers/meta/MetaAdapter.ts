import { PentagonLayer, PentagonPillar } from '../types';

export class MetaAdapter implements PentagonLayer {
  public pillar: PentagonPillar = 'meta';

  public async process(input: unknown): Promise<unknown> {
    const data = input as { routing?: { selectedModel?: string }; confidence: number; intent?: string };
    console.log('[Pentagon] Meta-Reflection (Consciousness) active');
    const isGroundingRequired = data.routing?.selectedModel?.includes('reasoning') || data.confidence < 0.7;
    const criticalIntents = ['financial', 'legal', 'medical', 'security'];
    const isCritical = criticalIntents.includes(data.intent || '');

    return {
      ...data,
      metaLayer: {
        strictGrounding: isGroundingRequired,
        antiHallucinationLevel: isCritical ? 'maximum' : 'standard',
        conscienceFlag: 'AQUAMONKEY_LUMIAN7_VERIFIED'
      }
    };
  }
}
