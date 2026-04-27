import { describe, it, expect, vi } from 'vitest';
import { preprocessFrame } from '../frame-tensor-preprocessing';
import * as tf from '@tensorflow/tfjs';
import { getPipelineLatency } from '../pipeline-latency-tracker';

describe('FrameTensorPreprocessing', () => {
  it('should handle null source gracefully', () => {
    const tensor = preprocessFrame(null as any);
    expect(tensor).toBeDefined();
    expect(tensor.shape).toEqual([1, 224, 224, 3]);

    const latency = getPipelineLatency();
    expect(latency.visionMs).toBeGreaterThan(-1);
  });
});
