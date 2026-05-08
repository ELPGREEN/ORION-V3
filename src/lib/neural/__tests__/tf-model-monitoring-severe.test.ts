import { describe, it, expect, beforeEach } from "vitest";
import {
  checkDegradation,
  setBaseline,
} from "../tf-model-monitoring";

describe("TF Monitoring Severe Degradation Rebaseline", () => {
  it("should automatically rebaseline after 5 consecutive SEVERE degradations", () => {
    const uniqueModel = `model-severe-rebaseline-${Date.now()}`;
    const baseline = { accuracy: 1.0, latencyMs: 200 }; // Use larger baseline
    setBaseline(uniqueModel, baseline);

    // Severe degradation for latency (baseline 200, >100% degradation is >200ms)
    // 450ms is > 200 + 200 = 400ms.
    // Absolute delta is 450 - 200 = 250ms, which is > 50ms threshold.
    const severeMetrics = { accuracy: 1.0, latencyMs: 450 };

    // Fill moving average window (10)
    for (let i = 0; i < 11; i++) {
      checkDegradation(uniqueModel, severeMetrics, 10, true);
    }

    // Call it 4 more times
    for (let i = 0; i < 4; i++) {
      checkDegradation(uniqueModel, severeMetrics, 10, true);
    }

    // 5th check should trigger auto-rebaseline
    const degradations = checkDegradation(uniqueModel, severeMetrics, 10, true);

    // Expectation: It SHOULD have rebaselined, so degradations.length should be 0.
    expect(degradations.length).toBe(0);

    // Verify next check uses the new baseline (no degradation)
    const nextChecks = checkDegradation(uniqueModel, severeMetrics, 10, true);
    expect(nextChecks.length).toBe(0);
  });
});
