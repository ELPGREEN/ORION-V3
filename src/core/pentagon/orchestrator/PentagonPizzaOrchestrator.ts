import {
  PentagonPillar,
  CognitiveState,
  PentagonProposal,
  PentagonLayer
} from '../layers/types';

export class PentagonPizzaOrchestrator {
  private static instance: PentagonPizzaOrchestrator;
  private layers: Map<PentagonPillar, PentagonLayer> = new Map();
  private states: CognitiveState[] = [];
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): PentagonPizzaOrchestrator {
    if (!PentagonPizzaOrchestrator.instance) {
      PentagonPizzaOrchestrator.instance = new PentagonPizzaOrchestrator();
    }
    return PentagonPizzaOrchestrator.instance;
  }

  public async initialize(layers: PentagonLayer[]): Promise<void> {
    layers.forEach(l => this.layers.set(l.pillar, l));
    this.isInitialized = true;
    console.log('[Pentagon] Orchestrator initialized');
  }

  public async runCycle(initialInput: unknown): Promise<unknown> {
    if (!this.isInitialized) throw new Error('Not initialized');

    this.recordState('perception', 'Analyzing input', 0.9);
    const perception: any = await this.layers.get('perception')?.process(initialInput);

    this.recordState('memory', 'Retrieving context', 0.7);
    const memory: any = await this.layers.get('memory')?.process(perception);

    this.recordState('reasoning', 'Synthesizing strategy', 0.95);
    const reasoning = await this.layers.get('reasoning')?.process(memory);

    this.recordState('meta', 'Verifying grounding', 1.0);
    const validated = await this.layers.get('meta')?.process(reasoning);

    this.recordState('action', 'Executing intent', 0.8);
    return await this.layers.get('action')?.process(validated);
  }

  private recordState(pillar: PentagonPillar, activity: string, intensity: number): void {
    const state = { pillar, activity, intensity, timestamp: Date.now() };
    this.states.push(state);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pentagon_state_change', { detail: state }));
    }
  }
}
