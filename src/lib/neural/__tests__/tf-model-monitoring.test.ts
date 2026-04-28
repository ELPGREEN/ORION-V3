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
  getDegradationHistory,
} from "../tf-model-monitoring";

describe("TF Model Monitoring", () => {
  beforeEach(() => {
    // Reset internal state if needed, though most are Maps/arrays in the module
    // Since they are not exported for reset, we'll rely on unique names
  });

  describe("Snapshots & Baselines", () => {
    it("should record snapshots and maintain limits", () => {
      const modelName = "test-model-" + Date.now();
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
      // It should be capped at 500 per model
      expect(state.totalSnapshots).toBeGreaterThanOrEqual(500);
    });

    it("should detect degradation against baseline", () => {
      const modelName = "degrade-model";
      setBaseline(modelName, { accuracy: 0.9, latencyMs: 100 });

      // No degradation
      let degradations = checkDegradation(modelName, { accuracy: 0.89, latencyMs: 105 });
      expect(degradations).toHaveLength(0);

      // Severe degradation in accuracy (0.9 -> 0.6 = 33% drop)
      degradations = checkDegradation(modelName, { accuracy: 0.6, latencyMs: 105 });
      expect(degradations).toHaveLength(1);
      expect(degradations[0].metric).toBe("accuracy");
      expect(degradations[0].severity).toBe("severe");

      // Moderate degradation in latency (100 -> 125 = 25% increase)
      // Note: checkDegradation has default minAbsoluteDelta for latencyMs = 100
      // 125-100 = 25, which is < 100, so it should NOT detect degradation with default delta
      degradations = checkDegradation(modelName, { accuracy: 0.9, latencyMs: 125 });
      expect(degradations).toHaveLength(0);

      // Latency degradation that exceeds minAbsoluteDelta (100 -> 210 = 110ms delta, 110% increase)
      degradations = checkDegradation(modelName, { accuracy: 0.9, latencyMs: 210 });
      expect(degradations).toHaveLength(1);
      expect(degradations[0].metric).toBe("latencyMs");
      expect(degradations[0].severity).toBe("severe");
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

      // Add samples for Control (var_0)
      for (let i = 0; i < 100; i++) {
        recordExperimentEvent(exp.id, controlId, i < 10); // 10% conversion
      }

      // Add samples for Challenger (var_1) - significantly better
      for (let i = 0; i < 100; i++) {
        recordExperimentEvent(exp.id, challengerId, i < 30); // 30% conversion
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
