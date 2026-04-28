import { PentagonLayer, PentagonPillar } from '../types';
import { quantumRouteQuery } from '@/lib/neural/quantum-llm-router';
import { summarizeLongContextMamba } from '@/lib/neural/mamba-orchestrator';

export class ReasoningAdapter implements PentagonLayer {
  public pillar: PentagonPillar = 'reasoning';

  public async process(input: any): Promise<unknown> {
    const routing = quantumRouteQuery(input.text);
    const compressedContext = summarizeLongContextMamba(input.crag?.finalContext || '');
    return { ...input, routing, compressedContext };
  }
}
