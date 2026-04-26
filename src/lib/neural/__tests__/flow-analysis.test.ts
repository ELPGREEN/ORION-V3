import { describe, it, expect } from 'vitest';
import { analyzeNeuralFlowGaps, generateFlowReport } from '../neural-flow-analyzer';
import { preprocessFrame } from '../frame-tensor-preprocessing';

describe('Neural Flow Analysis', () => {
  it('should detect architecture gaps', async () => {
    const gaps = await analyzeNeuralFlowGaps();
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.some(g => g.id === 'tf-explainability.ts')).toBe(true);
  });

  it('should generate a valid report', async () => {
    const gaps = await analyzeNeuralFlowGaps();
    const report = generateFlowReport(gaps);
    expect(report).toContain('ORION NEURAL FLOW');
    expect(report).toContain('Missing Neural Modules');
  });
});

describe('Frame Tensor Preprocessing', () => {
  it('should exist and be a function', () => {
    expect(typeof preprocessFrame).toBe('function');
  });
});
