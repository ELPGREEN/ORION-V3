import { VQCConfig, DEFAULT_VQC_CONFIG } from "./vqc-types";
import {
  createInstance,
  createJob,
  executeJob,
} from "./qiskit-runtime";
import type {
  QPUId,
  ErrorMitigationType as QiskitMitigationType,
  RuntimeCircuit,
} from "./qiskit-runtime";

export interface RuntimeForwardResult {
  value: number;
  mitigatedValue: number;
  jobId: string;
  qpuId: string;
  transpiledDepth: number;
  originalDepth: number;
  shots: number;
}

export function vqcForwardWithRuntime(
  input: number[],
  params: number[][][],
  runtimeOptions: {
    qpuId?: QPUId;
    errorMitigation?: QiskitMitigationType;
    shots?: number;
  } = {},
  config: VQCConfig = DEFAULT_VQC_CONFIG
): RuntimeForwardResult {
  const instance = createInstance({ plan: "standard", region: "us-east" });

  const circuit: RuntimeCircuit = {
    nQubits: config.nQubits,
    nLayers: config.nLayers,
    params,
    input,
    config,
  };

  const qpuId = runtimeOptions.qpuId || "simulator_stabilizer";
  const job = createJob(instance, circuit, {
    qpuId,
    shots: runtimeOptions.shots || 1024,
    errorMitigation: runtimeOptions.errorMitigation || "zne",
  });

  const executed = executeJob(job);
  const result = executed.result!;

  return {
    value: result.expectationValue,
    mitigatedValue: result.mitigatedExpectation,
    jobId: executed.id,
    qpuId,
    transpiledDepth: executed.transpiledDepth || 0,
    originalDepth: executed.originalDepth || 0,
    shots: result.shots,
  };
}
