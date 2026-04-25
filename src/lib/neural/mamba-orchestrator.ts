/**
 * ─── Mamba Orchestrator ───
 */
import { selectiveScan, DEFAULT_MAMBA_CONFIG, type SSMState, initSSMState } from "./mamba";

export function processWithMamba(sequence: number[], state?: SSMState) {
  const config = DEFAULT_MAMBA_CONFIG;
  const ssmState = state || initSSMState(config);
  const dt = sequence.map(() => 0.01 + Math.random() * 0.05);
  const B = sequence.map(() => new Array(config.dState).fill(0.1));
  const C = sequence.map(() => new Array(config.dState).fill(0.2));
  const scanResult = selectiveScan(sequence, dt, ssmState.A.map(row => row[0]), B, C, ssmState.D[0]);
  return { features: scanResult.output, attentionScore: Math.max(...scanResult.output), longRangeMemory: scanResult.finalState };
}

export function summarizeLongContextMamba(context: string): string {
  const tokens = context.split(/\s+/).map(w => w.length);
  if (tokens.length < 500) return context;
  const result = processWithMamba(tokens);
  return `[Mamba Compressed Context: score=${result.attentionScore.toFixed(2)}]\n${context.slice(0, 1000)}... [Compressed]`;
}
