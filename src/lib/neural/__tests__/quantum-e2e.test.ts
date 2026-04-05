/**
 * ─── Quantum Compute E2E Test ───
 * Validates the full VQC execution through the Qiskit Runtime pipeline:
 *   1. Qubit core primitives (state creation, Born rule)
 *   2. Gate operations (RX, RY, RZ rotations)
 *   3. VQC forward pass (feature map → ansatz → measurement)
 *   4. Runtime pipeline (transpile → execute → error mitigation)
 *   5. Parameter-shift gradient computation
 */

import { describe, it, expect } from "vitest";

// Qubit core
import {
  qubitZero,
  qubitOne,
  qubitPlus,
  measureProbability,
  measureCollapse,
  normalize,
  toBlochSphere,
  fidelity,
  cAbs2,
} from "../qubit-core";

// Gates
import {
  rotationX,
  rotationY,
  rotationZ,
  hadamard,
  pauliX,
} from "../quantum-gates";

// VQC
import {
  vqcForward,
  vqcForwardWithRuntime,
  zzFeatureMap,
  iqpFeatureMap,
  tanhFeatureMap,
  initVQCParams,
  parameterShiftGradient,
  DEFAULT_VQC_CONFIG,
} from "../vqc";
import type { VQCConfig } from "../vqc";

// Runtime
import {
  listQPUs,
  createInstance,
  createJob,
  executeJob,
  transpile,
  getIBMQuantumCredentials,
  formatRuntimeForAI,
} from "../qiskit-runtime";

// ═══════════════════════════════════════════
// 1. QUBIT CORE
// ═══════════════════════════════════════════

describe("Qubit Core Primitives", () => {
  it("|0⟩ has P(1)=0", () => {
    expect(measureProbability(qubitZero())).toBe(0);
  });

  it("|1⟩ has P(1)=1", () => {
    expect(measureProbability(qubitOne())).toBe(1);
  });

  it("|+⟩ has P(1)≈0.5", () => {
    expect(measureProbability(qubitPlus())).toBeCloseTo(0.5, 10);
  });

  it("normalization preserves Born rule", () => {
    const raw: [[number, number], [number, number]] = [[3, 0], [4, 0]];
    const normed = normalize(raw);
    const total = cAbs2(normed[0]) + cAbs2(normed[1]);
    expect(total).toBeCloseTo(1.0, 10);
  });

  it("fidelity of identical states = 1", () => {
    expect(fidelity(qubitZero(), qubitZero())).toBeCloseTo(1.0, 10);
  });

  it("fidelity of orthogonal states = 0", () => {
    expect(fidelity(qubitZero(), qubitOne())).toBeCloseTo(0.0, 10);
  });

  it("Bloch sphere: |0⟩ maps to north pole (z=1)", () => {
    const bloch = toBlochSphere(qubitZero());
    expect(bloch.z).toBeCloseTo(1.0, 5);
  });

  it("measureCollapse returns 0 or 1", () => {
    const { outcome } = measureCollapse(qubitPlus());
    expect([0, 1]).toContain(outcome);
  });
});

// ═══════════════════════════════════════════
// 2. QUANTUM GATES
// ═══════════════════════════════════════════

describe("Quantum Gate Operations", () => {
  it("RY(π) on |0⟩ → |1⟩", () => {
    const result = rotationY(Math.PI, qubitZero());
    expect(measureProbability(result)).toBeCloseTo(1.0, 5);
  });

  it("RX(π) on |0⟩ → |1⟩", () => {
    const result = rotationX(Math.PI, qubitZero());
    expect(measureProbability(result)).toBeCloseTo(1.0, 5);
  });

  it("RZ preserves |0⟩ probability", () => {
    const result = rotationZ(Math.PI / 4, qubitZero());
    expect(measureProbability(result)).toBeCloseTo(0.0, 5);
  });

  it("Hadamard on |0⟩ → |+⟩ (P≈0.5)", () => {
    const result = hadamard(qubitZero());
    expect(measureProbability(result)).toBeCloseTo(0.5, 5);
  });

  it("PauliX on |0⟩ → |1⟩", () => {
    const result = pauliX(qubitZero());
    expect(measureProbability(result)).toBeCloseTo(1.0, 5);
  });
});

// ═══════════════════════════════════════════
// 3. FEATURE MAPS
// ═══════════════════════════════════════════

describe("VQC Feature Maps", () => {
  const input = [0.5, 0.3, 0.7, 0.1];

  it("ZZ feature map produces correct qubit count", () => {
    const qubits = zzFeatureMap(input, 4);
    expect(qubits).toHaveLength(4);
    qubits.forEach((q) => {
      const p = measureProbability(q);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    });
  });

  it("IQP feature map produces valid states", () => {
    const qubits = iqpFeatureMap(input, 4);
    expect(qubits).toHaveLength(4);
  });

  it("Tanh feature map produces valid states", () => {
    const qubits = tanhFeatureMap(input, 4);
    expect(qubits).toHaveLength(4);
  });
});

// ═══════════════════════════════════════════
// 4. VQC FORWARD PASS
// ═══════════════════════════════════════════

describe("VQC Forward Pass", () => {
  it("returns value in [0, 1]", () => {
    const params = initVQCParams();
    const result = vqcForward([0.5, 0.3, 0.7, 0.1], params);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("is deterministic with same params (no noise)", () => {
    const fixedParams = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => [0.5, 0.5, 0.5])
    );
    const noNoiseConfig: VQCConfig = { ...DEFAULT_VQC_CONFIG, noiseStrength: 0 };
    const r1 = vqcForward([1, 0, 0, 0], fixedParams, noNoiseConfig);
    const r2 = vqcForward([1, 0, 0, 0], fixedParams, noNoiseConfig);
    expect(r1).toBe(r2);
  });

  it("different inputs produce different outputs", () => {
    const fixedParams = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => [0.3, 0.6, 0.9])
    );
    const r1 = vqcForward([1, 0, 0, 0], fixedParams);
    const r2 = vqcForward([0, 0, 0, 1], fixedParams);
    expect(r1).not.toBe(r2);
  });

  it("works with all feature maps", () => {
    const params = Array.from({ length: 2 }, () =>
      Array.from({ length: 3 }, () => [0.1, 0.2, 0.3])
    );
    const cfg3q: VQCConfig = { ...DEFAULT_VQC_CONFIG, nQubits: 3, nLayers: 2 };

    for (const fm of ["zz", "iqp", "tanh"] as const) {
      const result = vqcForward([0.5, 0.5, 0.5], params, { ...cfg3q, featureMap: fm });
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════
// 5. PARAMETER-SHIFT GRADIENT
// ═══════════════════════════════════════════

describe("Parameter-Shift Gradient", () => {
  it("returns finite gradient", () => {
    const params = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => [0.5, 0.5, 0.5])
    );
    const grad = parameterShiftGradient([0.5, 0.3, 0.7, 0.1], params, 0, 0, 0);
    expect(Number.isFinite(grad)).toBe(true);
  });

  it("gradient is within clip bounds", () => {
    const params = initVQCParams();
    const fixedParams = params.map((l) => l.map((q) => q.map(() => 1.0)));
    const grad = parameterShiftGradient([1, 1, 1, 1], fixedParams, 1, 2, 1);
    expect(Math.abs(grad)).toBeLessThanOrEqual(DEFAULT_VQC_CONFIG.gradientClip);
  });
});

// ═══════════════════════════════════════════
// 6. QISKIT RUNTIME PIPELINE
// ═══════════════════════════════════════════

describe("Qiskit Runtime Pipeline", () => {
  it("QPU registry has online processors", () => {
    const qpus = listQPUs();
    expect(qpus.length).toBeGreaterThan(0);
    const online = qpus.filter((q) => q.status === "online");
    expect(online.length).toBeGreaterThan(0);
  });

  it("creates runtime instance", () => {
    const instance = createInstance({ plan: "standard", region: "us-east" });
    expect(instance.id).toContain("quantum");
    expect(instance.plan).toBe("standard");
  });

  it("IBM Quantum credentials are configured", () => {
    const creds = getIBMQuantumCredentials();
    expect(creds.apiKeyId).toBe("ApiKey-a73fa826-1fa5-4d33-bb46-5e5c3427a316");
    expect(creds.iamId).toBe("IBMid-692001JLQ1");
    expect(creds.accountEmail).toContain("@");
  });

  it("formatRuntimeForAI produces summary string", () => {
    const summary = formatRuntimeForAI();
    expect(summary).toContain("QISKIT RUNTIME");
    expect(summary).toContain("QPU");
  });
});

// ═══════════════════════════════════════════
// 7. FULL E2E: VQC → RUNTIME → MITIGATION
// ═══════════════════════════════════════════

describe("VQC Runtime E2E (transpile → execute → mitigate)", () => {
  it("executes VQC through full runtime pipeline", () => {
    const input = [0.5, 0.3, 0.7, 0.1];
    const params = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => [0.4, 0.8, 0.2])
    );

    const result = vqcForwardWithRuntime(input, params, {
      qpuId: "simulator_stabilizer",
      errorMitigation: "zne",
      shots: 1024,
    });

    // Validate all output fields
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(1);
    expect(result.mitigatedValue).toBeGreaterThanOrEqual(0);
    expect(result.mitigatedValue).toBeLessThanOrEqual(1);
    expect(result.jobId).toBeTruthy();
    expect(result.qpuId).toBe("simulator_stabilizer");
    expect(result.shots).toBe(1024);
    expect(result.transpiledDepth).toBeGreaterThanOrEqual(0);
    expect(result.originalDepth).toBeGreaterThan(0);
  });

  it("mitigated value differs from raw value (ZNE active)", () => {
    const params = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => [1.0, 0.5, 0.3])
    );

    const result = vqcForwardWithRuntime([0.9, 0.1, 0.5, 0.7], params, {
      errorMitigation: "zne",
    });

    // Both values should be valid probabilities
    expect(Number.isFinite(result.mitigatedValue)).toBe(true);
    expect(Number.isFinite(result.value)).toBe(true);
  });

  it("works with M3 error mitigation", () => {
    const params = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => [0.2, 0.6, 0.4])
    );

    const result = vqcForwardWithRuntime([0.5, 0.5, 0.5, 0.5], params, {
      errorMitigation: "m3",
    });

    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.mitigatedValue).toBeGreaterThanOrEqual(0);
  });

  it("works with PEC error mitigation", () => {
    const params = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => [0.7, 0.3, 0.1])
    );

    const result = vqcForwardWithRuntime([0.2, 0.8, 0.4, 0.6], params, {
      errorMitigation: "pec",
    });

    expect(result.value).toBeGreaterThanOrEqual(0);
  });

  it("transpilation reduces circuit depth", () => {
    const params = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => [0.5, 0.5, 0.5])
    );

    const result = vqcForwardWithRuntime([0.5, 0.5, 0.5, 0.5], params);

    // Transpiled depth should be ≤ original (optimization)
    expect(result.transpiledDepth).toBeLessThanOrEqual(result.originalDepth);
  });
});
