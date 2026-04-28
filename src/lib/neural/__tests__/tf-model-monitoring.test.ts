import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordSnapshot,
  setBaseline,
  checkDegradation,
  assessDataQuality,
  createExperiment,
  startExperiment,
  recordExperimentEvent,
  evaluateExperiment,
  getMonitoringState,
} from "../tf-model-monitoring";

describe("TF Model Monitoring", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe("Snapshots & Baselines", () => {
    it("should record snapshots and maintain limits", () => {
      const modelName = "test-model-snaps-" + Math.random();
      for (let i = 0; i < 600; i++) {
        recordSnapshot({
          modelName,
          timestamp: Date.now(),
          accuracy: 0.9,
          latencyMs: 100,
          errorRate: 0,
          sampleCount: i,
          memoryMB: 50,
        });
      }
      const state = getMonitoringState();
      expect(state.totalSnapshots).toBeGreaterThanOrEqual(500);
    });

    it("should detect degradation against baseline", () => {
      const modelName = "degrade-model-" + Math.random();
      setBaseline(modelName, { accuracy: 0.9, latencyMs: 100 });

      // No degradation (below 15% threshold for accuracy, below 30% for latency)
      let degradations = checkDegradation(modelName, { accuracy: 0.89, latencyMs: 105 });
      expect(degradations).toHaveLength(0);

      // Moderate degradation in accuracy (0.9 -> 0.6 = 33% drop)
      // New moderate range is 25-50%
      degradations = checkDegradation(modelName, { accuracy: 0.6, latencyMs: 105 });
      expect(degradations).toHaveLength(1);
      expect(degradations[0].metric).toBe("accuracy");
      expect(degradations[0].severity).toBe("moderate");

      // Reset cooldown by advancing time
      vi.advanceTimersByTime(11 * 60 * 1000);

      // Severe degradation in accuracy (0.9 -> 0.4 = 55% drop)
      degradations = checkDegradation(modelName, { accuracy: 0.4, latencyMs: 105 });
      expect(degradations).toHaveLength(1);
      expect(degradations[0].severity).toBe("severe");

      vi.advanceTimersByTime(11 * 60 * 1000);

      // Moderate degradation in latency (100 -> 140 = 40% increase)
      // Latency uses dynamicThreshold = 15 * 2 = 30%
      degradations = checkDegradation(modelName, { accuracy: 0.9, latencyMs: 140 });
      expect(degradations).toHaveLength(1);
      expect(degradations[0].metric).toBe("latencyMs");
      expect(degradations[0].severity).toBe("moderate");
    });
  });

  describe("Data Quality", () => {
    it("should assess data quality and identify issues", () => {
      const data = [
        { id: "1", value: 10, timestamp: Date.now() },
        { id: "2", value: 20, timestamp: Date.now() },
        { id: "1", value: 30, timestamp: Date.now() }, // Duplicate ID
        { id: "3", value: "invalid", timestamp: Date.now() }, // Invalid type
        { id: "4", timestamp: Date.now() }, // Missing 'value'
      ];

      const schema = {
        required: ["id", "value"],
        types: { value: "number" }
      };

      const report = assessDataQuality(data, schema);
      expect(report.overallScore).toBeLessThan(1);
      expect(report.issues.some(i => i.type === "duplicate")).toBe(true);
      expect(report.issues.some(i => i.type === "missing")).toBe(true);
    });
  });

  describe("A/B Experiments", () => {
    it("should evaluate experiments correctly using Z-test", () => {
      const exp = createExperiment("test-exp", ["Control", "Challenger"]);
      const controlId = "var_0";
      const challengerId = "var_1";

      startExperiment(exp.id);

      for (let i = 0; i < 100; i++) {
        recordExperimentEvent(exp.id, controlId, i < 10); // 10%
      }

      for (let i = 0; i < 100; i++) {
        recordExperimentEvent(exp.id, challengerId, i < 30); // 30%
      }

      const results = evaluateExperiment(exp.id);
      expect(results?.winnerVariant).toBe(challengerId);
      expect(results?.confidenceLevel).toBeGreaterThanOrEqual(0.95);
    });

    it("should pick control if challenger is worse", () => {
      const exp = createExperiment("worse-challenger", ["Control", "Challenger"]);
      startExperiment(exp.id);

      for (let i = 0; i < 100; i++) {
        recordExperimentEvent(exp.id, "var_0", i < 20); // 20%
        recordExperimentEvent(exp.id, "var_1", i < 10); // 10%
      }

      const results = evaluateExperiment(exp.id);
      expect(results?.winnerVariant).toBe("var_0");
      expect(results?.confidenceLevel).toBe(0);
    });
  });
});
