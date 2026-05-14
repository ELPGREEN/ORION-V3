import { PentagonLayer, PentagonPillar } from '../types';
import { quantumRouteQuery } from '@/lib/neural/quantum-llm-router';
import { summarizeLongContextMamba } from '@/lib/neural/mamba-orchestrator';

export class ReasoningAdapter implements PentagonLayer {
  public pillar: PentagonPillar = 'reasoning';

  public async process(input: unknown): Promise<unknown> {
    const data = input as { text: string; crag?: { finalContext: string } };
    const routing = quantumRouteQuery(data.text);
    const compressedContext = summarizeLongContextMamba(data.crag?.finalContext || '');
    return { ...data, routing, compressedContext };
  }
}
