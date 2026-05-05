import { describe, it, expect } from 'vitest';
import { analyzeNeuralFlowGaps, generateFlowReport } from '../neural-flow-analyzer';
import { preprocessFrame } from '../frame-tensor-preprocessing';

describe('Neural Flow Analysis', () => {
  it('should verify architecture integrity (all modules present)', async () => {
    const gaps = await analyzeNeuralFlowGaps();
    // In a completed system, gaps should be 0.
    // We expect 0 gaps if all modules in EXPECTED_NEURAL_MODULES and EXPECTED_VISUAL_FLOWS exist.
    expect(gaps.length).toBe(0);
  });

  it('should generate a valid integrity report', async () => {
    const gaps = await analyzeNeuralFlowGaps();
    const report = generateFlowReport(gaps);
    expect(report).toContain('ORION NEURAL FLOW');
    // If gaps are 0, it should contain the success message
    if (gaps.length === 0) {
      expect(report).toContain('All critical neural flows are implemented and verified');
    } else {
      expect(report).toContain('Missing Neural Modules');
    }
  });
});

describe('Frame Tensor Preprocessing', () => {
  it('should exist and be a function', () => {
    expect(typeof preprocessFrame).toBe('function');
  });
});
