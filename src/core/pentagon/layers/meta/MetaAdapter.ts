import { PentagonLayer, PentagonPillar } from '../types';

export class MetaAdapter implements PentagonLayer {
  public pillar: PentagonPillar = 'meta';

  public async process(input: any): Promise<unknown> {
    console.log('[Pentagon] Meta-Reflection (Consciousness) active');
    const isGroundingRequired = input.routing?.selectedModel?.includes('reasoning') || input.confidence < 0.7;
    const criticalIntents = ['financial', 'legal', 'medical', 'security'];
    const isCritical = criticalIntents.includes(input.intent || '');

    return {
      ...input,
      metaLayer: {
        strictGrounding: isGroundingRequired,
        antiHallucinationLevel: isCritical ? 'maximum' : 'standard',
        conscienceFlag: 'AQUAMONKEY_LUMIAN7_VERIFIED'
      }
    };
  }
}
