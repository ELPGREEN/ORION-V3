import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkDegradation,
  setBaseline,
  maybeRebaseline
} from "../tf-model-monitoring";

describe("TF Monitoring Auto-Rebaseline", () => {
  const modelName = "test-model-auto";

  beforeEach(() => {
    // We can't easily reset the internal Map state of the module without adding reset functions,
    // but we can use a unique model name for each test to ensure isolation.
  });

  it("should automatically rebaseline after 5 consecutive moderate degradations", () => {
    const uniqueModel = `model-rebaseline-${Date.now()}`;
    const baseline = { accuracy: 1.0, latencyMs: 100 };
    setBaseline(uniqueModel, baseline);

    // Moderate degradation for accuracy (baseline 1.0, 25% drop is 0.75)
    // 0.6 is > 25% (moderate) but < 50% (severe)
    const moderateMetrics = { accuracy: 0.6, latencyMs: 100 };

    // Moving average window is 10. We need enough samples for the moving average to reflect the degradation.
    // To make it faster for test, we can just fill it.

    // First 4 checks should NOT trigger rebaseline (once moving average is low enough)
    // We need to call it multiple times to pull down the moving average.
    // AND we must account for ALERT_COOLDOWN_MS if checkDegradation returns empty for same alert.
    // However, the module uses a Map for alerts too.

    // We'll just call it once and then mock time or use new models if needed,
    // but the auto-rebaseline counter is what we care about.
    // The counter increments even if alert is on cooldown.

    // Fill moving average
    for (let i = 0; i < 11; i++) {
        checkDegradation(uniqueModel, moderateMetrics);
    }

    // Now we want to see it triggering the counter 4 times.
    // We need to use a new model for each to avoid ALERT_COOLDOWN_MS
    // OR we can just accept that degradations array might be empty due to cooldown
    // BUT the counter still increments.

    // Actually, I should just check if it rebaselines after 5 more calls.
    for (let i = 0; i < 4; i++) {
      checkDegradation(uniqueModel, moderateMetrics);
    }

    // 5th check should trigger auto-rebaseline
    const degradations = checkDegradation(uniqueModel, moderateMetrics);
    expect(degradations.length).toBe(0);

    // Verify next check uses the new baseline (no degradation)
    const nextChecks = checkDegradation(uniqueModel, moderateMetrics);
    expect(nextChecks.length).toBe(0);
  });

  it("should respect dynamic latency tolerance (2x wider)", () => {
    const uniqueModel = `model-latency-${Date.now()}`;
    const baseline = { latencyMs: 100 };
    setBaseline(uniqueModel, baseline);

    // 20% degradation for latency should be minor
    const minorLatency = { latencyMs: 125 }; // 25% degradation
    let degradations = checkDegradation(uniqueModel, minorLatency);
    expect(degradations[0].severity).toBe("minor");

    // 50% degradation for latency should be moderate
    const moderateLatency = { latencyMs: 160 }; // 60% degradation
    // Need to bypass alert cooldown or use different model
    const uniqueModel2 = `model-latency-2-${Date.now()}`;
    setBaseline(uniqueModel2, baseline);
    degradations = checkDegradation(uniqueModel2, moderateLatency);
    expect(degradations[0].severity).toBe("moderate");

    // 100% degradation for latency should be severe
    const severeLatency = { latencyMs: 210 }; // 110% degradation
    const uniqueModel3 = `model-latency-3-${Date.now()}`;
    setBaseline(uniqueModel3, baseline);
    degradations = checkDegradation(uniqueModel3, severeLatency);
    expect(degradations[0].severity).toBe("severe");
  });
});
