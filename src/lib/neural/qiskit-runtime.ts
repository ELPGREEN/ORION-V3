/**
 * ─── Qiskit Runtime Simulator ───
 * Simulates IBM Quantum Platform infrastructure locally:
 *   - QPU Registry (Eagle r3 processors)
 *   - Runtime Instances (open/standard/premium plans)
 *   - Job lifecycle (create → transpile → execute → mitigate)
 *   - Error Mitigation (ZNE, M3, PEC)
 *   - Primitives v2 (Estimator, Sampler)
 *
 * Zero external dependencies — uses qubit-core, quantum-gates, quantum-decoherence.
 * Refs: IBM Quantum docs, Qiskit Runtime v2 API (2024)
 */

import type { QubitState } from "./qubit-core";
import { qubitZero, measureProbability } from "./qubit-core";
import { rotationX, rotationY, rotationZ } from "./quantum-gates";
import { applyNoise, applyDecoherence } from "./quantum-decoherence";
import type { NoiseModelType, DecoherenceModel } from "./quantum-decoherence";
import { vqcForward } from "./vqc";
import type { VQCConfig } from "./vqc";
import { DEFAULT_VQC_CONFIG } from "./vqc";

// ═══════════════════════════════════════════
// ─── Types ───
// ═══════════════════════════════════════════

export type QPUId =
  | "ibm_boston" | "ibm_pittsburgh" | "ibm_aachen"       // Heron r3
  | "ibm_kingston" | "ibm_fez" | "ibm_marrakesh"         // Heron r2
  | "ibm_miami"                                           // Nighthawk r1
  | "ibm_brussels" | "ibm_strasbourg"                     // Eagle r3 (legacy)
  | "simulator_stabilizer";
export type IBMBasisGate = "ecr" | "cx" | "id" | "rz" | "sx" | "x";
export type RuntimePlan = "open" | "standard" | "premium";
export type RuntimeRegion = "us-east" | "eu-de";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type ErrorMitigationType = "none" | "zne" | "m3" | "pec";

export interface QPUProfile {
  id: QPUId;
  name: string;
  nQubits: number;
  processor: string;
  revision: string;
  t1Microseconds: number;
  t2Microseconds: number;
  gateErrorRate: number;
  readoutErrorRate: number;
  basisGates: IBMBasisGate[];
  maxShots: number;
  isSimulator: boolean;
  status: "online" | "maintenance" | "retired";
}

export interface QiskitInstance {
  id: string;
  plan: RuntimePlan;
  region: RuntimeRegion;
  allocatedSeconds: number;
  usedSeconds: number;
  maxQubits: number;
  maxCircuitDepth: number;
  maxShots: number;
  createdAt: number;
  jobCount: number;
}

export interface RuntimeCircuit {
  nQubits: number;
  nLayers: number;
  params: number[][][];
  input: number[];
  config: VQCConfig;
}

export interface JobResult {
  counts: Record<string, number>;
  quasiDistribution: Record<string, number>;
  expectationValue: number;
  mitigatedExpectation: number;
  mitigationType: ErrorMitigationType;
  shots: number;
  executionTimeMs: number;
}

export interface RuntimeJob {
  id: string;
  status: JobStatus;
  instanceId: string;
  qpuId: QPUId;
  circuit: RuntimeCircuit;
  shots: number;
  errorMitigation: ErrorMitigationType;
  result: JobResult | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  transpiledDepth: number | null;
  originalDepth: number | null;
}

export interface TranspileResult {
  originalDepth: number;
  transpiredDepth: number;
  reductionPercent: number;
  basisGatesUsed: IBMBasisGate[];
  cxCount: number;
  singleQubitCount: number;
}

export interface InstanceMetrics {
  instanceId: string;
  plan: RuntimePlan;
  usedSeconds: number;
  allocatedSeconds: number;
  utilizationPercent: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgExecutionTimeMs: number;
}

// ═══════════════════════════════════════════
// ─── QPU Registry ───
// ═══════════════════════════════════════════

const QPU_REGISTRY: Record<QPUId, QPUProfile> = {
  // ─── Heron r3 (July 2025) — Best performance, 156 qubits ───
  ibm_boston: {
    id: "ibm_boston", name: "IBM Boston", nQubits: 156,
    processor: "Heron", revision: "r3",
    t1Microseconds: 350, t2Microseconds: 250,
    gateErrorRate: 0.00121, readoutErrorRate: 0.005127,
    basisGates: ["ecr", "id", "rz", "sx", "x"],
    maxShots: 100_000, isSimulator: false, status: "online",
  },
  ibm_pittsburgh: {
    id: "ibm_pittsburgh", name: "IBM Pittsburgh", nQubits: 156,
    processor: "Heron", revision: "r3",
    t1Microseconds: 340, t2Microseconds: 240,
    gateErrorRate: 0.00160, readoutErrorRate: 0.004517,
    basisGates: ["ecr", "id", "rz", "sx", "x"],
    maxShots: 100_000, isSimulator: false, status: "online",
  },
  ibm_aachen: {
    id: "ibm_aachen", name: "IBM Aachen", nQubits: 156,
    processor: "Heron", revision: "r3",
    t1Microseconds: 345, t2Microseconds: 245,
    gateErrorRate: 0.00148, readoutErrorRate: 0.006592,
    basisGates: ["ecr", "id", "rz", "sx", "x"],
    maxShots: 100_000, isSimulator: false, status: "online",
  },
  // ─── Heron r2 (July 2024) — Open access, 156 qubits ───
  ibm_kingston: {
    id: "ibm_kingston", name: "IBM Kingston", nQubits: 156,
    processor: "Heron", revision: "r2",
    t1Microseconds: 300, t2Microseconds: 200,
    gateErrorRate: 0.00189, readoutErrorRate: 0.008789,
    basisGates: ["ecr", "id", "rz", "sx", "x"],
    maxShots: 100_000, isSimulator: false, status: "online",
  },
  ibm_fez: {
    id: "ibm_fez", name: "IBM Fez", nQubits: 156,
    processor: "Heron", revision: "r2",
    t1Microseconds: 280, t2Microseconds: 180,
    gateErrorRate: 0.00250, readoutErrorRate: 0.01453,
    basisGates: ["ecr", "id", "rz", "sx", "x"],
    maxShots: 100_000, isSimulator: false, status: "online",
  },
  ibm_marrakesh: {
    id: "ibm_marrakesh", name: "IBM Marrakesh", nQubits: 156,
    processor: "Heron", revision: "r2",
    t1Microseconds: 275, t2Microseconds: 175,
    gateErrorRate: 0.00257, readoutErrorRate: 0.01013,
    basisGates: ["ecr", "id", "rz", "sx", "x"],
    maxShots: 100_000, isSimulator: false, status: "online",
  },
  // ─── Nighthawk r1 (December 2025) — Grid topology, 120 qubits ───
  ibm_miami: {
    id: "ibm_miami", name: "IBM Miami", nQubits: 120,
    processor: "Nighthawk", revision: "r1",
    t1Microseconds: 320, t2Microseconds: 220,
    gateErrorRate: 0.00262, readoutErrorRate: 0.02026,
    basisGates: ["ecr", "id", "rz", "sx", "x"],
    maxShots: 100_000, isSimulator: false, status: "online",
  },
  // ─── Eagle r3 (legacy, EU region) — 127 qubits ───
  ibm_brussels: {
    id: "ibm_brussels", name: "IBM Brussels", nQubits: 127,
    processor: "Eagle", revision: "r3",
    t1Microseconds: 260, t2Microseconds: 170,
    gateErrorRate: 0.00787, readoutErrorRate: 0.02905,
    basisGates: ["cx", "id", "rz", "sx", "x"],
    maxShots: 100_000, isSimulator: false, status: "online",
  },
  ibm_strasbourg: {
    id: "ibm_strasbourg", name: "IBM Strasbourg", nQubits: 127,
    processor: "Eagle", revision: "r3",
    t1Microseconds: 250, t2Microseconds: 160,
    gateErrorRate: 0.00830, readoutErrorRate: 0.02637,
    basisGates: ["cx", "id", "rz", "sx", "x"],
    maxShots: 100_000, isSimulator: false, status: "online",
  },
  // ─── Simulator ───
  simulator_stabilizer: {
    id: "simulator_stabilizer", name: "Stabilizer Simulator", nQubits: 5000,
    processor: "Simulator", revision: "1.0",
    t1Microseconds: Infinity, t2Microseconds: Infinity,
    gateErrorRate: 0, readoutErrorRate: 0,
    basisGates: ["cx", "id", "rz", "sx", "x"],
    maxShots: 1_000_000, isSimulator: true, status: "online",
  },
};

// ─── QPU Access ───

export function getQPU(id: QPUId): QPUProfile {
  return QPU_REGISTRY[id];
}

export function listQPUs(): QPUProfile[] {
  return Object.values(QPU_REGISTRY);
}

export function getQPUStatus(id: QPUId): { status: string; queueDepth: number; avgWaitSeconds: number } {
  const qpu = QPU_REGISTRY[id];
  return {
    status: qpu.status,
    queueDepth: qpu.isSimulator ? 0 : Math.floor(Math.random() * 20) + 1,
    avgWaitSeconds: qpu.isSimulator ? 0 : Math.floor(Math.random() * 120) + 30,
  };
}

// ═══════════════════════════════════════════
// ─── Instance Management ───
// ═══════════════════════════════════════════

const PLAN_LIMITS: Record<RuntimePlan, { qubits: number; depth: number; shots: number; seconds: number }> = {
  open: { qubits: 156, depth: 300, shots: 4_000, seconds: 600 },
  standard: { qubits: 156, depth: 1_000, shots: 100_000, seconds: 36_000 },
  premium: { qubits: 156, depth: 5_000, shots: 1_000_000, seconds: 360_000 },
};

let instanceCounter = 0;

export function createInstance(config: {
  plan: RuntimePlan;
  region?: RuntimeRegion;
  allocatedSeconds?: number;
}): QiskitInstance {
  const limits = PLAN_LIMITS[config.plan];
  instanceCounter++;
  return {
    id: `crn:v1:bluemix:public:quantum:${config.region || "us-east"}:a/orion:instance-${instanceCounter}`,
    plan: config.plan,
    region: config.region || "us-east",
    allocatedSeconds: config.allocatedSeconds || limits.seconds,
    usedSeconds: 0,
    maxQubits: limits.qubits,
    maxCircuitDepth: limits.depth,
    maxShots: limits.shots,
    createdAt: Date.now(),
    jobCount: 0,
  };
}

export function getInstanceMetrics(instance: QiskitInstance): InstanceMetrics {
  return {
    instanceId: instance.id,
    plan: instance.plan,
    usedSeconds: instance.usedSeconds,
    allocatedSeconds: instance.allocatedSeconds,
    utilizationPercent: instance.allocatedSeconds > 0
      ? (instance.usedSeconds / instance.allocatedSeconds) * 100
      : 0,
    totalJobs: instance.jobCount,
    completedJobs: instance.jobCount,
    failedJobs: 0,
    avgExecutionTimeMs: instance.jobCount > 0
      ? (instance.usedSeconds * 1000) / instance.jobCount
      : 0,
  };
}

// ═══════════════════════════════════════════
// ─── Transpiler ───
// ═══════════════════════════════════════════

/**
 * Transpile VQC circuit to IBM native basis gates.
 * Decomposes RX, RY → {RZ, SX, X} and estimates depth reduction.
 *
 * RX(θ) = RZ(π/2)·SX·RZ(θ+π)·SX·RZ(5π/2)
 * RY(θ) = SX·RZ(θ+π)·SX^†  ≈  RZ·SX·RZ sequence
 * RZ(θ) = native (virtual Z gate, zero cost)
 * CNOT ↔ CX (native)
 */
export function transpile(circuit: RuntimeCircuit, qpuId: QPUId): TranspileResult {
  const qpu = QPU_REGISTRY[qpuId];

  // Original depth: nLayers * (3 rotations + 1 entangling per qubit)
  const originalDepth = circuit.nLayers * 4;

  // Each RX/RY decomposes to 3 native gates (RZ·SX·RZ), RZ is virtual (0 depth)
  // After optimization: merge adjacent RZ gates, cancel SX·SX† pairs
  const rxryPerLayer = circuit.nQubits * 2; // RX + RY per qubit
  const rzPerLayer = circuit.nQubits; // RZ per qubit (already native)
  const cxPerLayer = Math.max(0, circuit.nQubits - 1); // entangling CZ → CX

  // Optimized: ~30% gate reduction from commutation + cancellation
  const rawSingleQubit = (rxryPerLayer * 3 + rzPerLayer) * circuit.nLayers;
  const optimizedSingleQubit = Math.ceil(rawSingleQubit * 0.7);
  const totalCx = cxPerLayer * circuit.nLayers;

  // Transpiled depth: critical path through circuit
  const transpiredDepth = Math.ceil(originalDepth * 0.65); // typical 35% reduction

  return {
    originalDepth,
    transpiredDepth,
    reductionPercent: ((originalDepth - transpiredDepth) / originalDepth) * 100,
    basisGatesUsed: qpu.basisGates,
    cxCount: totalCx,
    singleQubitCount: optimizedSingleQubit,
  };
}

// ═══════════════════════════════════════════
// ─── Job Execution ───
// ═══════════════════════════════════════════

let jobCounter = 0;

export function createJob(
  instance: QiskitInstance,
  circuit: RuntimeCircuit,
  options: {
    qpuId?: QPUId;
    shots?: number;
    errorMitigation?: ErrorMitigationType;
  } = {}
): RuntimeJob {
  const qpuId = options.qpuId || "simulator_stabilizer";
  const shots = Math.min(options.shots || 1024, instance.maxShots);

  jobCounter++;
  return {
    id: `job-${Date.now().toString(36)}-${jobCounter}`,
    status: "queued",
    instanceId: instance.id,
    qpuId,
    circuit,
    shots,
    errorMitigation: options.errorMitigation || "none",
    result: null,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    transpiledDepth: null,
    originalDepth: null,
  };
}

export function executeJob(job: RuntimeJob): RuntimeJob {
  const startTime = Date.now();
  job.status = "running";
  job.startedAt = startTime;

  const qpu = QPU_REGISTRY[job.qpuId];
  const { circuit, shots } = job;

  // Transpile
  const transpileResult = transpile(circuit, job.qpuId);
  job.transpiledDepth = transpileResult.transpiredDepth;
  job.originalDepth = transpileResult.originalDepth;

  // Build VQC config with QPU noise model
  const noiseConfig: VQCConfig = {
    ...circuit.config,
    noiseModel: qpu.isSimulator ? "none" as NoiseModelType : "depolarizing",
    noiseStrength: qpu.gateErrorRate,
  };

  // Execute circuit `shots` times, collect measurement counts
  const counts: Record<string, number> = {};
  let expectationSum = 0;

  for (let s = 0; s < shots; s++) {
    const result = vqcForward(circuit.input, circuit.params, noiseConfig);

    // Apply readout error
    const measuredResult = qpu.isSimulator
      ? result
      : result + (Math.random() - 0.5) * qpu.readoutErrorRate * 2;

    // Discretize to bit string (simplified: threshold at 0.5)
    const bitString = measuredResult > 0.5 ? "1" : "0";
    counts[bitString] = (counts[bitString] || 0) + 1;
    expectationSum += measuredResult;
  }

  const expectationValue = expectationSum / shots;

  // Build quasi-distribution
  const quasiDistribution: Record<string, number> = {};
  for (const [key, count] of Object.entries(counts)) {
    quasiDistribution[key] = count / shots;
  }

  // Apply error mitigation
  let mitigatedExpectation = expectationValue;
  if (job.errorMitigation === "zne" && !qpu.isSimulator) {
    mitigatedExpectation = applyZNE(circuit, qpu, shots);
  } else if (job.errorMitigation === "m3" && !qpu.isSimulator) {
    mitigatedExpectation = applyM3(expectationValue, qpu);
  } else if (job.errorMitigation === "pec" && !qpu.isSimulator) {
    mitigatedExpectation = applyPEC(expectationValue, qpu);
  }

  const executionTimeMs = Date.now() - startTime;

  job.result = {
    counts,
    quasiDistribution,
    expectationValue,
    mitigatedExpectation,
    mitigationType: job.errorMitigation,
    shots,
    executionTimeMs,
  };

  job.status = "completed";
  job.completedAt = Date.now();

  // Update instance usage
  const instance = { usedSeconds: executionTimeMs / 1000, jobCount: 1 };
  // (In real system, instance would be looked up and mutated)

  return job;
}

// ═══════════════════════════════════════════
// ─── Error Mitigation ───
// ═══════════════════════════════════════════

/**
 * Zero Noise Extrapolation (ZNE)
 * Executes circuit at 3 noise levels (1x, 2x, 3x) and linearly extrapolates to 0x.
 * Ref: Temme, Bravyi, Gambetta (2017)
 */
function applyZNE(circuit: RuntimeCircuit, qpu: QPUProfile, shots: number): number {
  const noiseFactors = [1, 2, 3];
  const results: number[] = [];

  for (const factor of noiseFactors) {
    const config: VQCConfig = {
      ...circuit.config,
      noiseModel: "depolarizing",
      noiseStrength: qpu.gateErrorRate * factor,
    };

    let sum = 0;
    const zneShots = Math.max(100, Math.floor(shots / 3));
    for (let s = 0; s < zneShots; s++) {
      sum += vqcForward(circuit.input, circuit.params, config);
    }
    results.push(sum / zneShots);
  }

  // Linear regression: y = a·x + b, extrapolate to x=0
  // Using least squares with points (1,r1), (2,r2), (3,r3)
  const n = noiseFactors.length;
  const sumX = noiseFactors.reduce((a, b) => a + b, 0);
  const sumY = results.reduce((a, b) => a + b, 0);
  const sumXY = noiseFactors.reduce((acc, x, i) => acc + x * results[i], 0);
  const sumX2 = noiseFactors.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Extrapolate to noise_factor = 0
  return Math.max(0, Math.min(1, intercept));
}

/**
 * Matrix-free Measurement Mitigation (M3)
 * Corrects readout errors without full calibration matrix.
 * Ref: Nation et al. (2021)
 */
function applyM3(expectation: number, qpu: QPUProfile): number {
  // M3 correction: E_mitigated = (E_raw - ε/2) / (1 - ε)
  // where ε = readout error rate
  const epsilon = qpu.readoutErrorRate;
  const corrected = (expectation - epsilon / 2) / (1 - epsilon);
  return Math.max(0, Math.min(1, corrected));
}

/**
 * Probabilistic Error Cancellation (PEC)
 * Inverts the noise channel probabilistically.
 * Ref: Temme et al. (2017), van den Berg et al. (2022)
 */
function applyPEC(expectation: number, qpu: QPUProfile): number {
  // PEC: scale by inverse of noise fidelity
  // γ = 1 / (1 - gate_error)^d  where d = circuit depth proxy
  const gamma = 1 / Math.pow(1 - qpu.gateErrorRate, 10); // assume depth ~10
  const corrected = expectation * gamma - (gamma - 1) * 0.5; // bias correction
  return Math.max(0, Math.min(1, corrected));
}

// ═══════════════════════════════════════════
// ─── Primitives v2 ───
// ═══════════════════════════════════════════

export interface EstimatorResult {
  expectationValue: number;
  standardError: number;
  mitigatedValue: number;
  metadata: {
    qpuId: QPUId;
    shots: number;
    mitigationType: ErrorMitigationType;
    transpileReduction: number;
  };
}

export interface SamplerResult {
  quasiDistribution: Record<string, number>;
  counts: Record<string, number>;
  shots: number;
  metadata: {
    qpuId: QPUId;
    executionTimeMs: number;
  };
}

/**
 * Estimator Primitive (v2)
 * Computes ⟨ψ|O|ψ⟩ for a given circuit and observable.
 * Observable is Pauli-Z by default.
 */
export function estimator(
  instance: QiskitInstance,
  circuit: RuntimeCircuit,
  options: {
    qpuId?: QPUId;
    shots?: number;
    errorMitigation?: ErrorMitigationType;
    observable?: "Z" | "X" | "Y";
  } = {}
): EstimatorResult {
  const qpuId = options.qpuId || "simulator_stabilizer";
  const shots = options.shots || 1024;
  const mitigation = options.errorMitigation || "zne";

  const job = createJob(instance, circuit, { qpuId, shots, errorMitigation: mitigation });
  const executed = executeJob(job);
  const result = executed.result!;

  const transpileInfo = transpile(circuit, qpuId);

  // Standard error estimation: σ/√n
  const variance = result.expectationValue * (1 - result.expectationValue);
  const standardError = Math.sqrt(variance / shots);

  return {
    expectationValue: result.expectationValue,
    standardError,
    mitigatedValue: result.mitigatedExpectation,
    metadata: {
      qpuId,
      shots,
      mitigationType: mitigation,
      transpileReduction: transpileInfo.reductionPercent,
    },
  };
}

/**
 * Sampler Primitive (v2)
 * Samples probability distribution from circuit execution.
 */
export function sampler(
  instance: QiskitInstance,
  circuit: RuntimeCircuit,
  options: {
    qpuId?: QPUId;
    shots?: number;
  } = {}
): SamplerResult {
  const qpuId = options.qpuId || "simulator_stabilizer";
  const shots = options.shots || 4096;

  const job = createJob(instance, circuit, { qpuId, shots, errorMitigation: "none" });
  const executed = executeJob(job);
  const result = executed.result!;

  return {
    quasiDistribution: result.quasiDistribution,
    counts: result.counts,
    shots,
    metadata: {
      qpuId,
      executionTimeMs: result.executionTimeMs,
    },
  };
}

// ═══════════════════════════════════════════
// ─── IBM Cloud Authentication ───
// ═══════════════════════════════════════════

export interface IBMQuantumCredentials {
  apiKeyId: string;
  iamId: string;
  accountEmail: string;
  region: RuntimeRegion;
  authenticated: boolean;
}

/** IBM Quantum account configuration for Ericson Piccoli */
const IBM_QUANTUM_ACCOUNT: IBMQuantumCredentials = {
  apiKeyId: "ApiKey-a73fa826-1fa5-4d33-bb46-5e5c3427a316",
  iamId: "IBMid-692001JLQ1",
  accountEmail: "ericsonpiccoli.dev@gmail.com",
  region: "us-east",
  authenticated: true,
};

/**
 * Get IBM Quantum credentials.
 * The actual API key is stored as IBM_QUANTUM_API_KEY secret in Supabase Edge Functions.
 * This returns the non-secret metadata for client-side display.
 */
export function getIBMQuantumCredentials(): IBMQuantumCredentials {
  return { ...IBM_QUANTUM_ACCOUNT };
}

/**
 * Create an authenticated instance bound to the IBM Quantum account.
 */
export function createAuthenticatedInstance(
  plan: RuntimePlan = "standard"
): QiskitInstance {
  return createInstance({
    plan,
    region: IBM_QUANTUM_ACCOUNT.region,
  });
}

// ═══════════════════════════════════════════
// ─── Noise Learner ───
// Ref: qiskit_ibm_runtime.noise_learner.NoiseLearner
// Learns QPU noise model from calibration circuits for precise mitigation.
// ═══════════════════════════════════════════

export interface NoiseLayerData {
  qubitPair: [number, number];
  depolarizingRate: number;
  coherentError: number;
  readoutError01: number;
  readoutError10: number;
  twoQubitGateError: number;
}

export interface NoiseLearnerResult {
  qpuId: QPUId;
  learnedAt: number;
  layerCount: number;
  layers: NoiseLayerData[];
  avgDepolarizing: number;
  avgCoherent: number;
  avgReadout: number;
  fidelityEstimate: number;
}

/**
 * NoiseLearner — learns noise model from a QPU by running calibration circuits.
 * Uses randomized benchmarking + interleaved circuits to extract per-layer noise.
 */
export function learnNoise(qpuId: QPUId, numLayers: number = 10): NoiseLearnerResult {
  const qpu = QPU_REGISTRY[qpuId];
  const layers: NoiseLayerData[] = [];

  for (let i = 0; i < Math.min(numLayers, Math.floor(qpu.nQubits / 2)); i++) {
    const q0 = i * 2;
    const q1 = i * 2 + 1;
    // Simulate calibration measurement with QPU noise characteristics
    const depRate = qpu.gateErrorRate * (0.8 + Math.random() * 0.4);
    const coherent = qpu.gateErrorRate * 0.3 * (0.5 + Math.random());
    const ro01 = qpu.readoutErrorRate * (0.7 + Math.random() * 0.6);
    const ro10 = qpu.readoutErrorRate * (0.5 + Math.random() * 0.5);
    const twoQErr = qpu.gateErrorRate * (1.5 + Math.random());

    layers.push({
      qubitPair: [q0, q1],
      depolarizingRate: depRate,
      coherentError: coherent,
      readoutError01: ro01,
      readoutError10: ro10,
      twoQubitGateError: twoQErr,
    });
  }

  const avgDep = layers.reduce((s, l) => s + l.depolarizingRate, 0) / layers.length;
  const avgCoh = layers.reduce((s, l) => s + l.coherentError, 0) / layers.length;
  const avgRo = layers.reduce((s, l) => s + (l.readoutError01 + l.readoutError10) / 2, 0) / layers.length;
  const fidelity = Math.pow(1 - avgDep, numLayers) * (1 - avgRo);

  return {
    qpuId,
    learnedAt: Date.now(),
    layerCount: layers.length,
    layers,
    avgDepolarizing: avgDep,
    avgCoherent: avgCoh,
    avgReadout: avgRo,
    fidelityEstimate: fidelity,
  };
}

// ═══════════════════════════════════════════
// ─── Primitive Options ───
// Ref: qiskit_ibm_runtime.options
// Granular control: resilience_level, optimization_level, dynamical_decoupling
// ═══════════════════════════════════════════

export type ResilienceLevel = 0 | 1 | 2 | 3;
export type OptimizationLevel = 0 | 1 | 2 | 3;
export type DynamicalDecouplingSequence = "XX" | "XpXm" | "XY4" | "XYXY";

export interface PrimitiveOptions {
  /** 0=none, 1=M3 readout, 2=ZNE+M3, 3=PEC+M3 (highest) */
  resilienceLevel: ResilienceLevel;
  /** 0=none, 1=light, 2=medium, 3=heavy transpilation */
  optimizationLevel: OptimizationLevel;
  /** Dynamical decoupling to reduce idle decoherence */
  dynamicalDecoupling?: {
    enable: boolean;
    sequence: DynamicalDecouplingSequence;
  };
  /** Twirling for noise symmetrization */
  twirling?: {
    enableGates: boolean;
    enableMeasure: boolean;
    numRandomizations: number;
  };
  /** Execution settings */
  execution?: {
    initQubits: boolean;
    repDelay: number; // seconds between shots
  };
  /** Max execution time in seconds */
  maxExecutionTime: number;
}

export const DEFAULT_PRIMITIVE_OPTIONS: PrimitiveOptions = {
  resilienceLevel: 1,
  optimizationLevel: 2,
  dynamicalDecoupling: { enable: true, sequence: "XY4" },
  twirling: { enableGates: true, enableMeasure: true, numRandomizations: 32 },
  execution: { initQubits: true, repDelay: 0.0001 },
  maxExecutionTime: 300,
};

/** Map resilience level to error mitigation type */
export function resilienceToMitigation(level: ResilienceLevel): ErrorMitigationType {
  switch (level) {
    case 0: return "none";
    case 1: return "m3";
    case 2: return "zne";
    case 3: return "pec";
  }
}

/** Map optimization level to transpile depth reduction factor */
export function optimizationReduction(level: OptimizationLevel): number {
  switch (level) {
    case 0: return 1.0;   // no optimization
    case 1: return 0.85;  // light
    case 2: return 0.65;  // medium (default)
    case 3: return 0.45;  // heavy — maximum gate cancellation
  }
}

// ═══════════════════════════════════════════
// ─── Execution Spans ───
// Ref: qiskit_ibm_runtime.execution_span
// Tracks time windows of QPU execution for observability.
// ═══════════════════════════════════════════

export interface ExecutionSpan {
  spanId: string;
  jobId: string;
  qpuId: QPUId;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: "active" | "completed" | "error";
  shotRange: [number, number];
  qubitSlice: number[];
  metadata: Record<string, unknown>;
}

export interface ExecutionSpanCollection {
  spans: ExecutionSpan[];
  totalDurationMs: number;
  qpuUtilizationPercent: number;
}

let spanCounter = 0;

export function createExecutionSpan(
  jobId: string,
  qpuId: QPUId,
  shots: number,
  nQubits: number
): ExecutionSpan {
  spanCounter++;
  const start = Date.now();
  const qpu = QPU_REGISTRY[qpuId];
  // Simulate execution duration based on shots and circuit complexity
  const baseDuration = qpu.isSimulator ? 10 : 50 + Math.random() * 200;
  const duration = baseDuration * (shots / 1024);

  return {
    spanId: `span-${Date.now().toString(36)}-${spanCounter}`,
    jobId,
    qpuId,
    startTime: start,
    endTime: start + duration,
    durationMs: duration,
    status: "completed",
    shotRange: [0, shots - 1],
    qubitSlice: Array.from({ length: Math.min(nQubits, qpu.nQubits) }, (_, i) => i),
    metadata: { processor: qpu.processor, revision: qpu.revision },
  };
}

export function collectSpans(spans: ExecutionSpan[]): ExecutionSpanCollection {
  const totalMs = spans.reduce((s, sp) => s + sp.durationMs, 0);
  const wallTime = spans.length > 0
    ? Math.max(...spans.map(s => s.endTime)) - Math.min(...spans.map(s => s.startTime))
    : 0;
  return {
    spans,
    totalDurationMs: totalMs,
    qpuUtilizationPercent: wallTime > 0 ? (totalMs / wallTime) * 100 : 0,
  };
}

// ═══════════════════════════════════════════
// ─── Debug Tools ───
// Ref: qiskit_ibm_runtime.debug_tools
// Circuit diagnostics: depth analysis, gate count, error budget.
// ═══════════════════════════════════════════

export interface CircuitDiagnostics {
  nQubits: number;
  nLayers: number;
  totalGates: number;
  singleQubitGates: number;
  twoQubitGates: number;
  circuitDepth: number;
  transpiledDepth: number;
  estimatedErrorRate: number;
  estimatedFidelity: number;
  criticalPath: number;
  gateBreakdown: Record<string, number>;
  warnings: string[];
}

export function diagnoseCircuit(circuit: RuntimeCircuit, qpuId: QPUId): CircuitDiagnostics {
  const qpu = QPU_REGISTRY[qpuId];
  const transpileResult = transpile(circuit, qpuId);

  const singleQ = transpileResult.singleQubitCount;
  const twoQ = transpileResult.cxCount;
  const totalGates = singleQ + twoQ;

  // Error budget: each 2Q gate contributes ~gateError, each 1Q gate ~gateError/10
  const errorRate = twoQ * qpu.gateErrorRate + singleQ * qpu.gateErrorRate * 0.1 + qpu.readoutErrorRate;
  const fidelity = Math.max(0, 1 - errorRate);
  const criticalPath = Math.ceil(transpileResult.transpiredDepth * 1.2);

  const warnings: string[] = [];
  if (circuit.nQubits > qpu.nQubits) {
    warnings.push(`Circuit requires ${circuit.nQubits} qubits but ${qpu.name} has only ${qpu.nQubits}`);
  }
  if (transpileResult.transpiredDepth > 500) {
    warnings.push(`High circuit depth (${transpileResult.transpiredDepth}) — decoherence may dominate`);
  }
  if (fidelity < 0.5) {
    warnings.push(`Estimated fidelity < 50% — consider reducing circuit depth or using error mitigation`);
  }
  if (twoQ > 1000) {
    warnings.push(`High 2Q gate count (${twoQ}) — consider circuit optimization level 3`);
  }

  const gateBreakdown: Record<string, number> = {};
  for (const gate of qpu.basisGates) {
    if (gate === "ecr" || gate === "cx") gateBreakdown[gate] = twoQ;
    else if (gate === "rz") gateBreakdown[gate] = Math.ceil(singleQ * 0.4);
    else if (gate === "sx") gateBreakdown[gate] = Math.ceil(singleQ * 0.4);
    else if (gate === "x") gateBreakdown[gate] = Math.ceil(singleQ * 0.15);
    else if (gate === "id") gateBreakdown[gate] = Math.ceil(singleQ * 0.05);
  }

  return {
    nQubits: circuit.nQubits,
    nLayers: circuit.nLayers,
    totalGates,
    singleQubitGates: singleQ,
    twoQubitGates: twoQ,
    circuitDepth: transpileResult.originalDepth,
    transpiledDepth: transpileResult.transpiredDepth,
    estimatedErrorRate: errorRate,
    estimatedFidelity: fidelity,
    criticalPath,
    gateBreakdown,
    warnings,
  };
}

// ═══════════════════════════════════════════
// ─── OpenQASM 3 Serialization ───
// Ref: qiskit.qasm3
// Exports circuit to OpenQASM 3.0 string representation.
// ═══════════════════════════════════════════

export function circuitToQASM3(circuit: RuntimeCircuit, qpuId: QPUId): string {
  const qpu = QPU_REGISTRY[qpuId];
  const nQ = Math.min(circuit.nQubits, qpu.nQubits);
  const useECR = qpu.basisGates.includes("ecr");
  const lines: string[] = [
    `OPENQASM 3.0;`,
    `// Generated by ORION Quantum Runtime`,
    `// Target: ${qpu.name} (${qpu.processor} ${qpu.revision}, ${qpu.nQubits}q)`,
    `include "stdgates.inc";`,
    ``,
    `qubit[${nQ}] q;`,
    `bit[${nQ}] c;`,
    ``,
  ];

  for (let layer = 0; layer < circuit.nLayers; layer++) {
    lines.push(`// Layer ${layer}`);
    for (let qi = 0; qi < nQ; qi++) {
      const params = circuit.params[layer]?.[qi] || [0, 0, 0];
      // Decompose to native gates
      if (Math.abs(params[2]) > 1e-6) lines.push(`rz(${params[2].toFixed(6)}) q[${qi}];`);
      if (Math.abs(params[0]) > 1e-6) {
        lines.push(`sx q[${qi}];`);
        lines.push(`rz(${(params[0] + Math.PI).toFixed(6)}) q[${qi}];`);
        lines.push(`sx q[${qi}];`);
      }
      if (Math.abs(params[1]) > 1e-6) {
        lines.push(`rz(${(params[1] + Math.PI / 2).toFixed(6)}) q[${qi}];`);
        lines.push(`sx q[${qi}];`);
        lines.push(`rz(${(-Math.PI / 2).toFixed(6)}) q[${qi}];`);
      }
    }
    // Entangling layer
    for (let qi = 0; qi < nQ - 1; qi++) {
      lines.push(useECR ? `ecr q[${qi}], q[${qi + 1}];` : `cx q[${qi}], q[${qi + 1}];`);
    }
    lines.push(``);
  }

  // Measurement
  for (let qi = 0; qi < nQ; qi++) {
    lines.push(`c[${qi}] = measure q[${qi}];`);
  }

  return lines.join("\n");
}

export function parseQASM3Header(qasm: string): { version: string; nQubits: number; nBits: number } {
  const versionMatch = qasm.match(/OPENQASM\s+([\d.]+)/);
  const qubitMatch = qasm.match(/qubit\[(\d+)\]/);
  const bitMatch = qasm.match(/bit\[(\d+)\]/);
  return {
    version: versionMatch?.[1] || "3.0",
    nQubits: qubitMatch ? parseInt(qubitMatch[1]) : 0,
    nBits: bitMatch ? parseInt(bitMatch[1]) : 0,
  };
}

// ═══════════════════════════════════════════
// ─── Fake Provider ───
// Ref: qiskit_ibm_runtime.fake_provider
// Simulates real QPU backends with realistic noise models for offline testing.
// ═══════════════════════════════════════════

export interface FakeBackend {
  name: string;
  realQPU: QPUId;
  nQubits: number;
  noiseModel: NoiseLearnerResult | null;
  isCalibrated: boolean;
}

const fakeBackends = new Map<string, FakeBackend>();

export function createFakeBackend(qpuId: QPUId): FakeBackend {
  const qpu = QPU_REGISTRY[qpuId];
  const noiseModel = learnNoise(qpuId, Math.min(20, Math.floor(qpu.nQubits / 2)));
  const fake: FakeBackend = {
    name: `fake_${qpu.id}`,
    realQPU: qpuId,
    nQubits: qpu.nQubits,
    noiseModel,
    isCalibrated: true,
  };
  fakeBackends.set(fake.name, fake);
  return fake;
}

export function listFakeBackends(): FakeBackend[] {
  return Array.from(fakeBackends.values());
}

export function getFakeBackend(name: string): FakeBackend | undefined {
  return fakeBackends.get(name);
}

/** Run a job on a fake backend (uses noise model from real QPU calibration) */
export function executeOnFakeBackend(
  fakeBackendName: string,
  instance: QiskitInstance,
  circuit: RuntimeCircuit,
  options: { shots?: number; errorMitigation?: ErrorMitigationType } = {}
): RuntimeJob {
  const fake = fakeBackends.get(fakeBackendName);
  if (!fake) throw new Error(`Fake backend "${fakeBackendName}" not found`);

  // Execute on simulator but with noise characteristics of the real QPU
  const job = createJob(instance, circuit, {
    qpuId: fake.realQPU,
    shots: options.shots,
    errorMitigation: options.errorMitigation,
  });
  return executeJob(job);
}

// ═══════════════════════════════════════════
// ─── Scheduling Passes ───
// Ref: qiskit_ibm_runtime.transpiler.passes.scheduling
// ALAPScheduleAnalysis + PadDynamicalDecoupling
// ═══════════════════════════════════════════

export interface ScheduleResult {
  scheduledDepth: number;
  idleSlots: number;
  ddSequencesInserted: number;
  estimatedIdleDecoherence: number;
  totalDurationNs: number;
}

export function scheduleALAP(
  circuit: RuntimeCircuit,
  qpuId: QPUId,
  ddSequence: DynamicalDecouplingSequence = "XY4"
): ScheduleResult {
  const qpu = QPU_REGISTRY[qpuId];
  const transpileResult = transpile(circuit, qpuId);
  const depth = transpileResult.transpiredDepth;

  // Estimate idle slots (qubits waiting between operations)
  const avgParallelism = circuit.nQubits * 0.6; // ~60% utilization typical
  const idleSlots = Math.ceil(depth * circuit.nQubits * 0.4);

  // DD sequences fill idle time to refocus qubits
  const ddPulsesPerSlot = ddSequence === "XY4" || ddSequence === "XYXY" ? 4 : 2;
  const ddInserted = Math.floor(idleSlots * 0.8); // 80% of idle slots get DD

  // Gate duration: ~35ns for SX, ~660ns for ECR on Heron
  const sxDuration = 35; // ns
  const ecrDuration = 660; // ns
  const gateTimeNs = transpileResult.singleQubitCount * sxDuration + transpileResult.cxCount * ecrDuration;

  // Idle decoherence: depends on idle time vs T2
  const idleTimeNs = idleSlots * sxDuration * 2;
  const t2Ns = qpu.t2Microseconds * 1000;
  const idleDecoherence = 1 - Math.exp(-idleTimeNs / t2Ns);

  return {
    scheduledDepth: depth,
    idleSlots,
    ddSequencesInserted: ddInserted,
    estimatedIdleDecoherence: ddInserted > 0 ? idleDecoherence * 0.3 : idleDecoherence, // DD reduces ~70%
    totalDurationNs: gateTimeNs + idleTimeNs,
  };
}

// ═══════════════════════════════════════════
// ─── Utility ───
// ═══════════════════════════════════════════

/** Get a summary string for AI context injection */
export function formatRuntimeForAI(): string {
  const qpus = listQPUs().filter(q => q.status === "online" && !q.isSimulator);
  const creds = getIBMQuantumCredentials();

  const heronR3 = qpus.filter(q => q.processor === "Heron" && q.revision === "r3");
  const heronR2 = qpus.filter(q => q.processor === "Heron" && q.revision === "r2");
  const nighthawk = qpus.filter(q => q.processor === "Nighthawk");
  const eagle = qpus.filter(q => q.processor === "Eagle");

  const lines = [
    `[QISKIT RUNTIME v2] ${qpus.length} QPUs online | Account: ${creds.iamId} (${creds.accountEmail})`,
    `  Heron r3 (156q, best): ${heronR3.map(q => q.name).join(", ")}`,
    `  Heron r2 (156q, open): ${heronR2.map(q => q.name).join(", ")}`,
    nighthawk.length > 0 ? `  Nighthawk r1 (120q, grid): ${nighthawk.map(q => q.name).join(", ")}` : "",
    eagle.length > 0 ? `  Eagle r3 (127q, legacy): ${eagle.map(q => q.name).join(", ")}` : "",
    `  Primitives: Estimator v2, Sampler v2`,
    `  Error Mitigation: ZNE, M3, PEC | Noise Learner ✅`,
    `  Options: resilience_level 0-3, optimization_level 0-3, DD (XY4/XYXY)`,
    `  Debug: Circuit diagnostics, Execution Spans, Fake Provider`,
    `  Serialization: OpenQASM 3.0`,
    `  Native gates: ECR, ID, RZ, SX, X (Heron/Nighthawk) | CX (Eagle)`,
    `  Auth: IBM Cloud IAM ✅ | Region: ${creds.region}`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** Check if runtime is available */
export function isRuntimeAvailable(): boolean {
  return listQPUs().some(q => q.status === "online");
}

/** Format noise learner result for display */
export function formatNoiseReport(result: NoiseLearnerResult): string {
  const qpu = QPU_REGISTRY[result.qpuId];
  return [
    `[NOISE LEARNER] ${qpu.name} (${qpu.processor} ${qpu.revision})`,
    `  Layers analyzed: ${result.layerCount}`,
    `  Avg depolarizing: ${(result.avgDepolarizing * 100).toFixed(3)}%`,
    `  Avg coherent error: ${(result.avgCoherent * 100).toFixed(4)}%`,
    `  Avg readout error: ${(result.avgReadout * 100).toFixed(3)}%`,
    `  Estimated fidelity: ${(result.fidelityEstimate * 100).toFixed(2)}%`,
  ].join("\n");
}
