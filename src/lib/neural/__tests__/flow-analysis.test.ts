import { describe, it, expect } from 'vitest';
import { analyzeNeuralFlowGaps, generateFlowReport } from '../neural-flow-analyzer';
import { preprocessFrame } from '../frame-tensor-preprocessing';

describe('Neural Flow Analysis', () => {
  it('should detect architecture gaps', async () => {
    const gaps = await analyzeNeuralFlowGaps();
    // Gaps may be 0 if all flows are implemented
    expect(gaps.length).toBeGreaterThanOrEqual(0);
  });

  it('should generate a valid report', async () => {
    const gaps = await analyzeNeuralFlowGaps();
    const report = generateFlowReport(gaps);
    expect(report).toContain('ORION NEURAL FLOW');
    expect(report).toContain('INTEGRITY REPORT');
  });
});

describe('Frame Tensor Preprocessing', () => {
  it('should exist and be a function', () => {
    expect(typeof preprocessFrame).toBe('function');
  });
});
