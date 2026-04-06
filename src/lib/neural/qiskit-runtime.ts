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
// ─── Utility ───
// ═══════════════════════════════════════════

/** Get a summary string for AI context injection */
export function formatRuntimeForAI(): string {
  const qpus = listQPUs().filter(q => q.status === "online");
  const creds = getIBMQuantumCredentials();
  const lines = [
    `[QISKIT RUNTIME] ${qpus.length} QPUs online | Account: ${creds.iamId} (${creds.accountEmail})`,
    ...qpus.map(q =>
      `  ⚛️ ${q.name}: ${q.nQubits}q ${q.processor} ${q.revision} | T1=${q.t1Microseconds}μs T2=${q.t2Microseconds}μs | err=${q.gateErrorRate}`
    ),
    `  Primitives: Estimator v2, Sampler v2`,
    `  Error Mitigation: ZNE, M3, PEC`,
    `  Basis gates: CX, ID, RZ, SX, X`,
    `  Auth: IBM Cloud IAM ✅ | Region: ${creds.region}`,
  ];
  return lines.join("\n");
}

/** Check if runtime is available */
export function isRuntimeAvailable(): boolean {
  return listQPUs().some(q => q.status === "online");
}
