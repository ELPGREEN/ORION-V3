import { describe, it, expect, vi } from 'vitest';
import { analyzeNeuralFlowGaps } from '../neural-flow-analyzer';
import { readProjectFile } from '../../orion-evolution/project-file-reader';

vi.mock('../../orion-evolution/project-file-reader', () => ({
  readProjectFile: vi.fn()
}));

describe('NeuralFlowAnalyzer', () => {
  it('should detect gaps when files are missing', async () => {
    vi.mocked(readProjectFile).mockResolvedValue(null);
    const gaps = await analyzeNeuralFlowGaps();
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.some(g => g.id === 'tf-explainability.ts')).toBe(true);
  });

  it('should not detect a gap for existing and registered files', async () => {
    vi.mocked(readProjectFile).mockImplementation(async (path) => {
      if (path === 'src/lib/neural/frame-tensor-preprocessing.ts') return 'exists';
      if (path === 'src/lib/neural/index.ts') return 'export * from "./frame-tensor-preprocessing";';
      if (path === 'src/components/dashboard/neural/index.ts') return '';
      return null;
    });

    const gaps = await analyzeNeuralFlowGaps();
    expect(gaps.find(g => g.id === 'frame-tensor-preprocessing.ts')).toBeUndefined();
  });
});
