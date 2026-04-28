export type PentagonPillar = 'perception' | 'memory' | 'reasoning' | 'action' | 'meta';

export interface CognitiveState {
  pillar: PentagonPillar;
  activity: string;
  intensity: number;
  timestamp: number;
}

export interface PentagonProposal {
  id: string;
  sourcePillar: PentagonPillar;
  targetPillar: PentagonPillar;
  action: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface PentagonLayer {
  pillar: PentagonPillar;
  process(input: unknown): Promise<unknown>;
}
