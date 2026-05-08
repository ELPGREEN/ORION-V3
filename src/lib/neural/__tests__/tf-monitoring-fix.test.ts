import { describe, it, expect, beforeEach } from "vitest";
import { setBaseline, checkDegradation, recordSnapshot, getDegradationHistory } from "../tf-model-monitoring";

describe("TF Monitoring Fixes", () => {
  it("should NOT trigger for latency delta < 100ms even if percentage is high", () => {
    const uniqueModel = `model-latency-100-${Date.now()}`;
    // Baseline 79.07, delta 42.35 (current 121.42)
    setBaseline(uniqueModel, { latencyMs: 79.07 });

    let degradations: any[] = [];
    for (let i = 0; i < 5; i++) {
        degradations = checkDegradation(uniqueModel, { latencyMs: 121.42 }, 10, true);
    }

    // Should be empty because delta (42.35) < 100
    expect(degradations).toHaveLength(0);
  });

  it("should trigger for latency delta >= 100ms", () => {
    const uniqueModel = `model-latency-trigger-${Date.now()}`;
    // Baseline 100, current 201 (delta 101, degradation 101%)
    setBaseline(uniqueModel, { latencyMs: 100 });

    // It should trigger on the first call since moving average of 1 sample is 201
    const degradations = checkDegradation(uniqueModel, { latencyMs: 201 }, 10, true);

    expect(degradations).toHaveLength(1);
    expect(degradations[0].metric).toBe("latencyMs");
    expect(degradations[0].severity).toBe("severe"); // > 100%
  });

  it("should clamp extreme latency spikes", () => {
    const uniqueModel = `model-clamp-${Date.now()}`;
    setBaseline(uniqueModel, { latencyMs: 100 });

    // Fill with 9 baseline samples
    for(let i=0; i<9; i++) checkDegradation(uniqueModel, { latencyMs: 100 });

    // Extreme spike 23000ms should be clamped to 200ms
    // New MA = (900 + 200) / 10 = 110ms
    // Delta = 10ms (< 100ms)
    const degradations = checkDegradation(uniqueModel, { latencyMs: 23000 });

    expect(degradations).toHaveLength(0);
  });
});
