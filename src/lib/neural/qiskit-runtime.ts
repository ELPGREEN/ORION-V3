/**
 * ─── Qiskit Runtime Simulator ───
 */

import type { QubitState } from "./qubit-core";
import { qubitZero, measureProbability } from "./qubit-core";
import { rotationX, rotationY, rotationZ } from "./quantum-gates";
import { applyNoise, applyDecoherence } from "./quantum-decoherence";
import type { NoiseModelType, DecoherenceModel } from "./quantum-decoherence";
import { VQCConfig } from "./vqc-types";
import { vqcForward } from "./vqc-core";
import { tensorVQCForward } from "./tensor-vqc";

/** Use tensor VQC when nQubits ≤ 12 for real entanglement */
function vqcForwardAuto(input: number[], params: number[][][], config: VQCConfig): number {
  return config.nQubits <= 12
    ? tensorVQCForward(input, params, config)
    : vqcForward(input, params, config);
}

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
  topology: "all-to-all" | "heavy-hex" | "square";
  basisGates: IBMBasisGate[];
  avgT1: number; // microseconds
  avgT2: number; // microseconds
  gateErrorRate: number;
  status: "online" | "offline";
  isSimulator: boolean;
}

export interface RuntimeInstance {
  id: string;
  plan: RuntimePlan;
  region: RuntimeRegion;
  crns: string;
}

export interface RuntimeCircuit {
  nQubits: number;
  nLayers: number;
  params: number[][][];
  input: number[];
  config: VQCConfig;
}

export interface RuntimeJob {
  id: string;
  instanceId: string;
  circuit: RuntimeCircuit;
  qpuId: QPUId;
  shots: number;
  status: JobStatus;
  createdAt: number;
  errorMitigation: ErrorMitigationType;
  transpiledDepth?: number;
  originalDepth?: number;
  result?: {
    expectationValue: number;
    mitigatedExpectation: number;
    variance: number;
    shots: number;
  };
}

export interface InstanceMetrics {
  totalJobs: number;
  totalShots: number;
  avgLatencyMs: number;
  errorRate: number;
}

// ═══════════════════════════════════════════
// ─── QPU Registry ───
// ═══════════════════════════════════════════

const QPU_REGISTRY: Record<QPUId, QPUProfile> = {
  ibm_boston: { id: "ibm_boston", name: "Boston", nQubits: 156, processor: "Heron r3", topology: "heavy-hex", basisGates: ["ecr", "id", "rz", "sx", "x"], avgT1: 280, avgT2: 150, gateErrorRate: 0.0001, status: "online", isSimulator: false },
  ibm_pittsburgh: { id: "ibm_pittsburgh", name: "Pittsburgh", nQubits: 156, processor: "Heron r3", topology: "heavy-hex", basisGates: ["ecr", "id", "rz", "sx", "x"], avgT1: 290, avgT2: 160, gateErrorRate: 0.00009, status: "online", isSimulator: false },
  ibm_aachen: { id: "ibm_aachen", name: "Aachen", nQubits: 156, processor: "Heron r3", topology: "heavy-hex", basisGates: ["ecr", "id", "rz", "sx", "x"], avgT1: 275, avgT2: 145, gateErrorRate: 0.00012, status: "online", isSimulator: false },
  ibm_kingston: { id: "ibm_kingston", name: "Kingston", nQubits: 133, processor: "Heron r2", topology: "heavy-hex", basisGates: ["cx", "id", "rz", "sx", "x"], avgT1: 240, avgT2: 120, gateErrorRate: 0.0004, status: "online", isSimulator: false },
  ibm_fez: { id: "ibm_fez", name: "Fez", nQubits: 133, processor: "Heron r2", topology: "heavy-hex", basisGates: ["cx", "id", "rz", "sx", "x"], avgT1: 245, avgT2: 125, gateErrorRate: 0.00038, status: "online", isSimulator: false },
  ibm_marrakesh: { id: "ibm_marrakesh", name: "Marrakesh", nQubits: 133, processor: "Heron r2", topology: "heavy-hex", basisGates: ["cx", "id", "rz", "sx", "x"], avgT1: 250, avgT2: 130, gateErrorRate: 0.00035, status: "online", isSimulator: false },
  ibm_miami: { id: "ibm_miami", name: "Miami", nQubits: 127, processor: "Nighthawk r1", topology: "heavy-hex", basisGates: ["cx", "id", "rz", "sx", "x"], avgT1: 180, avgT2: 90, gateErrorRate: 0.0008, status: "online", isSimulator: false },
  ibm_brussels: { id: "ibm_brussels", name: "Brussels", nQubits: 127, processor: "Eagle r3", topology: "heavy-hex", basisGates: ["cx", "id", "rz", "sx", "x"], avgT1: 200, avgT2: 100, gateErrorRate: 0.0007, status: "online", isSimulator: false },
  ibm_strasbourg: { id: "ibm_strasbourg", name: "Strasbourg", nQubits: 127, processor: "Eagle r3", topology: "heavy-hex", basisGates: ["cx", "id", "rz", "sx", "x"], avgT1: 195, avgT2: 95, gateErrorRate: 0.00075, status: "online", isSimulator: false },
  simulator_stabilizer: { id: "simulator_stabilizer", name: "Stabilizer Simulator", nQubits: 5000, processor: "Local CPU", topology: "all-to-all", basisGates: ["cx", "id", "rz", "sx", "x"], avgT1: Infinity, avgT2: Infinity, gateErrorRate: 0, status: "online", isSimulator: true },
};

// ═══════════════════════════════════════════
// ─── Pipeline Core ───
// ═══════════════════════════════════════════

export function createInstance(options: { plan?: RuntimePlan; region?: RuntimeRegion } = {}): RuntimeInstance {
  const plan = options.plan || "open";
  const region = options.region || "us-east";
  const id = 'quantum_' + Math.random().toString(36).substring(7);
  return {
    id,
    plan,
    region,
    crns: `crn:v1:bluemix:public:quantum-computing:${region}:a/${id}:instance:${id}`,
  };
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

export function getInstanceMetrics(instance: RuntimeInstance): InstanceMetrics {
  return {
    totalJobs: 42,
    totalShots: 100000,
    avgLatencyMs: 250,
    errorRate: 0.001,
  };
}

export function getIBMQuantumCredentials() {
  return {
    apiKeyId: "ApiKey-a73fa826-1fa5-4d33-bb46-5e5c3427a316",
    iamId: "IBMid-692001JLQ1",
    accountEmail: "info@iasofthub.com",
  };
}

export function formatRuntimeForAI(): string {
  return "QISKIT RUNTIME: QPU simulator active.";
}

export function transpile(circuit: RuntimeCircuit, qpuId: QPUId): { depth: number; gateCount: number } {
  const qpu = QPU_REGISTRY[qpuId];
  if (!qpu) throw new Error(`QPU ${qpuId} not found`);

  const baseDepth = circuit.nLayers * circuit.nQubits;
  const overhead = qpu.topology === "heavy-hex" ? 0.5 : 1.0;
  return {
    depth: Math.round(baseDepth * overhead),
    gateCount: Math.round(baseDepth * 3 * overhead),
  };
}

export function createJob(
  instance: RuntimeInstance,
  circuit: RuntimeCircuit,
  options: { qpuId?: QPUId; shots?: number; errorMitigation?: ErrorMitigationType } = {}
): RuntimeJob {
  const { depth } = transpile(circuit, options.qpuId || "simulator_stabilizer");
  return {
    id: `job_${Math.random().toString(36).substring(7)}`,
    instanceId: instance.id,
    circuit,
    qpuId: options.qpuId || "simulator_stabilizer",
    shots: options.shots || 1024,
    status: "queued",
    createdAt: Date.now(),
    errorMitigation: options.errorMitigation || "none",
    transpiledDepth: depth,
    originalDepth: circuit.nLayers * circuit.nQubits,
  };
}

export function executeJob(job: RuntimeJob): RuntimeJob {
  const qpu = QPU_REGISTRY[job.qpuId];
  const config = job.circuit.config;

  const noiseModel: NoiseModelType = job.qpuId === "simulator_stabilizer" ? "none" : "depolarizing";
  const noiseStrength = qpu.gateErrorRate * (job.transpiledDepth || 1) * 10;

  const effectiveConfig: VQCConfig = {
    ...config,
    noiseModel,
    noiseStrength,
  };

  const rawValue = vqcForwardAuto(job.circuit.input, job.circuit.params, effectiveConfig);

  let mitigatedValue = rawValue;
  if (job.errorMitigation === "zne") {
    mitigatedValue = rawValue * (1 + noiseStrength * 0.5);
  } else if (job.errorMitigation === "m3") {
    mitigatedValue = rawValue + (Math.random() - 0.5) * 0.01;
  }

  mitigatedValue = Math.max(0, Math.min(1, mitigatedValue));

  return {
    ...job,
    status: "completed",
    result: {
      expectationValue: rawValue,
      mitigatedExpectation: mitigatedValue,
      variance: (rawValue * (1 - rawValue)) / job.shots,
      shots: job.shots,
    },
  };
}
