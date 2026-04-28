import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordSnapshot,
  checkDegradation,
  setBaseline
} from "../tf-model-monitoring";

describe("TF Model Monitoring v2", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("should use moving average to filter transient latency spikes", () => {
    const model = "test-model-spike";
    setBaseline(model, { latencyMs: 30 });

    // Record 9 normal snapshots
    for (let i = 0; i < 9; i++) {
      recordSnapshot({
        modelName: model,
        timestamp: Date.now(),
        accuracy: 0.9,
        latencyMs: 30,
        errorRate: 0,
        sampleCount: i,
        memoryMB: 100
      });
    }

    // Record 1 spike (100ms, >3x baseline)
    recordSnapshot({
      modelName: model,
      timestamp: Date.now(),
      accuracy: 0.9,
      latencyMs: 100,
      errorRate: 0,
      sampleCount: 10,
      memoryMB: 100
    });

    // Check degradation. Moving average should be (30*9 + 100)/10 = 37ms.
    // 37ms vs 30ms baseline is ~23% degradation.
    // Since dynamic threshold for latency is thresholdPercent * 2 (15 * 2 = 30%),
    // this spike should NOT trigger a degradation alert.
    const degradations = checkDegradation(model, { latencyMs: 100 }, 15);
    expect(degradations.length).toBe(0);
  });

  it("should trigger degradation on sustained high latency", () => {
    const model = "test-model-sustained";
    setBaseline(model, { latencyMs: 30 });

    // Record 20 snapshots at 50ms (sustained ~66% degradation)
    for (let i = 0; i < 20; i++) {
      recordSnapshot({
        modelName: model,
        timestamp: Date.now(),
        accuracy: 0.9,
        latencyMs: 50,
        errorRate: 0,
        sampleCount: i,
        memoryMB: 100
      });
    }

    const degradations = checkDegradation(model, { latencyMs: 50 }, 15);
    expect(degradations.length).toBeGreaterThan(0);
    expect(degradations[0].metric).toBe("latencyMs");
  });

  it("should respect alert cooldown for moderate issues", () => {
    const model = "test-model-cooldown";
    setBaseline(model, { latencyMs: 30 });

    // 40ms vs 30ms is 33.3% degradation -> Moderate (Severity bypasses cooldown only if "severe" > 50%)
    // Note: checkDegradation for latency uses dynamicThreshold = thresholdPercent * 2 = 30%
    // So 33.3% is just above the threshold.

    // Trigger first alert
    const deg1 = checkDegradation(model, { latencyMs: 40 }, 15);
    expect(deg1.length).toBe(1);

    // Immediate second check should be filtered by cooldown
    const deg2 = checkDegradation(model, { latencyMs: 40 }, 15);
    expect(deg2.length).toBe(0);

    // Fast forward 11 minutes (cooldown is 10)
    vi.advanceTimersByTime(11 * 60 * 1000);

    const deg3 = checkDegradation(model, { latencyMs: 40 }, 15);
    expect(deg3.length).toBe(1);
  });
});
