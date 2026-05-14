import {
  PentagonPillar,
  CognitiveState,
  PentagonLayer
} from '../layers/types';
import { updateConsciousnessState } from '@/lib/neural/rag-consciousness';

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

    // Wake up from dormant state
    updateConsciousnessState("observing");

    try {
      this.recordState('perception', 'Analyzing multi-modal input', 0.9);
      const perception = await this.layers.get('perception')?.process(initialInput);

      updateConsciousnessState("analyzing");
      this.recordState('memory', 'Querying cognitive patterns', 0.7);
      const memory = await this.layers.get('memory')?.process(perception);

      updateConsciousnessState("learning");
      this.recordState('reasoning', 'Synthesizing response strategy', 0.95);
      const reasoning = await this.layers.get('reasoning')?.process(memory);

      updateConsciousnessState("adapting");
      this.recordState('meta', 'Verifying grounding and ethics', 1.0);
      const validated = await this.layers.get('meta')?.process(reasoning);

      this.recordState('action', 'Executing planned intent', 0.8);
      const result = await this.layers.get('action')?.process(validated);

      return result;
    } catch (error) {
      console.error('[Pentagon] Cycle failure:', error);
      this.recordState('meta', 'Error recovery active', 1.0);
      updateConsciousnessState("dormant");
      throw error;
    }
  }

  private recordState(pillar: PentagonPillar, activity: string, intensity: number): void {
    const state: CognitiveState = {
      pillar,
      activity,
      intensity,
      timestamp: Date.now()
    };
    this.states.push(state);
    if (this.states.length > 50) this.states.shift();

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pentagon_state_change', { detail: state }));
    }
  }

  public getHistory(): CognitiveState[] {
    return [...this.states];
  }
}
