import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  setBaseline,
  checkDegradation,
  maybeRebaseline,
} from "../tf-model-monitoring";

describe("TF Model Monitoring - Performance Enhancements", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  it("should smooth out jitter with moving average", () => {
    const modelName = "jitter-model-" + Math.random();
    setBaseline(modelName, { latencyMs: 100 });

    // Fill window with 9 samples of 100
    for (let i = 0; i < 9; i++) {
      checkDegradation(modelName, { latencyMs: 100 });
    }

    // 10th sample is a small spike (110)
    // Average: (9*100 + 110) / 10 = 101. 1% degradation.
    const degradations1 = checkDegradation(modelName, { latencyMs: 110 });
    expect(degradations1.length).toBe(0);

    // Large spike (300)
    // Average: (8*100 + 110 + 300) / 10 = 121. 21% degradation.
    // NOTE: Absolute delta must be >= 50ms for latency.
    // 121 - 100 = 21ms, which is < 50ms.
    const degradations2 = checkDegradation(modelName, { latencyMs: 300 });
    expect(degradations2.length).toBe(0); // Expected 0 now due to absolute delta threshold

    // Even larger spike (600)
    // Average: (7*100 + 110 + 300 + 500) / 10 = 161 (Clamped to 500)
    // Average: (7*100 + 110 + 300 + 500) / 10 = 161. 61% degradation.
    // Delta = 61ms, which is > 50ms.
    const degradations3 = checkDegradation(modelName, { latencyMs: 600 });
    expect(degradations3.length).toBe(1);
    expect(degradations3[0].degradationPercent).toBe(61);
  });

  it("should respect alert cooldowns", () => {
    const modelName = "cooldown-model-" + Math.random();
    setBaseline(modelName, { latencyMs: 100 });

    // Trigger first alert (must exceed 50ms delta)
    const first = checkDegradation(modelName, { latencyMs: 500 });
    expect(first.length).toBe(1);

    // Immediate subsequent check with same high value should NOT trigger (cooldown)
    const second = checkDegradation(modelName, { latencyMs: 500 });
    expect(second.length).toBe(0);

    // Advance time by 11 minutes (cooldown is 10)
    vi.advanceTimersByTime(11 * 60 * 1000);

    // Should trigger again
    const third = checkDegradation(modelName, { latencyMs: 500 });
    expect(third.length).toBe(1);
  });

  it("should handle re-baselining", () => {
    const modelName = "rebaseline-model-" + Math.random();
    setBaseline(modelName, { latencyMs: 100 });

    // Trigger degradation at 500
    const before = checkDegradation(modelName, { latencyMs: 500 });
    expect(before.length).toBe(1);

    // Re-baseline to 500
    maybeRebaseline(modelName, { latencyMs: 500 });

    // Should no longer be a degradation at 500
    const after = checkDegradation(modelName, { latencyMs: 500 });
    expect(after.length).toBe(0);
  });
});
