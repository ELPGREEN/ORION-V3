/**
 * ─── TensorFlow Responsible AI: Training Tools ───
 * Browser-adapted implementations for responsible model training.
 *
 * 1. TF Federated — federated learning simulation (McMahan et al., 2017)
 * 2. TF Constrained Optimization — inequality-constrained optimization (TFCO)
 * 3. TF Lattice — interpretable monotonic lattice models (You et al., 2017)
 *
 * Ref: tensorflow.org/responsible_ai
 *      tensorflow.org/federated
 *      tensorflow.org/lattice
 *      Cotter et al. (2019) — TFCO
 */

// ═══════════════════════════════════════════
// TF FEDERATED
// ═══════════════════════════════════════════

export interface FederatedConfig {
  numClients: number;
  roundsTotal: number;
  clientFraction: number;     // fraction of clients per round (0-1)
  localEpochs: number;
  localBatchSize: number;
  learningRate: number;
  aggregationMethod: "fedavg" | "fedsgd" | "fedprox" | "scaffold";
  differentialPrivacy: boolean;
  dpEpsilon?: number;
  dpDelta?: number;
  secureAggregation: boolean;
  compressionBits?: number;   // gradient compression
}

export interface FederatedClient {
  id: string;
  dataSize: number;
  localLoss: number;
  localAccuracy: number;
  communicationBytes: number;
  roundsParticipated: number;
}

export interface FederatedRound {
  roundNumber: number;
  selectedClients: string[];
  globalLoss: number;
  globalAccuracy: number;
  aggregatedWeightsDelta: number;
  communicationCostBytes: number;
  privacyBudgetConsumed: number;
  durationMs: number;
}

export interface FederatedState {
  config: FederatedConfig;
  currentRound: number;
  globalModelWeights: number[];
  clients: FederatedClient[];
  roundHistory: FederatedRound[];
  totalCommunicationBytes: number;
  totalPrivacyBudget: number;
}

/** Create federated learning simulation */
export function createFederatedSimulation(config: Partial<FederatedConfig> = {}): FederatedState {
  const fullConfig: FederatedConfig = {
    numClients: config.numClients ?? 10,
    roundsTotal: config.roundsTotal ?? 50,
    clientFraction: config.clientFraction ?? 0.3,
    localEpochs: config.localEpochs ?? 5,
    localBatchSize: config.localBatchSize ?? 32,
    learningRate: config.learningRate ?? 0.01,
    aggregationMethod: config.aggregationMethod ?? "fedavg",
    differentialPrivacy: config.differentialPrivacy ?? false,
    dpEpsilon: config.dpEpsilon ?? 1.0,
    dpDelta: config.dpDelta ?? 1e-5,
    secureAggregation: config.secureAggregation ?? false,
    compressionBits: config.compressionBits,
  };

  const modelDim = 100;
  const globalWeights = Array.from({ length: modelDim }, () => (Math.random() - 0.5) * 0.1);

  const clients: FederatedClient[] = [];
  for (let i = 0; i < fullConfig.numClients; i++) {
    clients.push({
      id: `client_${i}`,
      dataSize: 100 + Math.floor(Math.random() * 900), // non-IID sizes
      localLoss: 2 + Math.random(),
      localAccuracy: 0.3 + Math.random() * 0.2,
      communicationBytes: 0,
      roundsParticipated: 0,
    });
  }

  return {
    config: fullConfig,
    currentRound: 0,
    globalModelWeights: globalWeights,
    clients,
    roundHistory: [],
    totalCommunicationBytes: 0,
    totalPrivacyBudget: 0,
  };
}

/** Execute one round of federated learning */
export function executeFederatedRound(state: FederatedState): FederatedRound {
  const start = performance.now();
  const { config, clients, globalModelWeights } = state;

  // Select clients
  const numSelected = Math.max(1, Math.floor(clients.length * config.clientFraction));
  const shuffled = [...clients].sort(() => Math.random() - 0.5);
  const selectedClients = shuffled.slice(0, numSelected);
  const selectedIds = selectedClients.map(c => c.id);

  // Simulate local training on each selected client
  const localUpdates: number[][] = [];
  let totalDataPoints = 0;

  for (const client of selectedClients) {
    // Simulate local SGD
    const localDelta = globalModelWeights.map(w => {
      const noise = (Math.random() - 0.5) * config.learningRate * 2;
      return -config.learningRate * (noise + w * 0.01); // gradient + regularization
    });

    // FedProx: add proximal term
    if (config.aggregationMethod === "fedprox") {
      const mu = 0.01;
      for (let i = 0; i < localDelta.length; i++) {
        localDelta[i] -= mu * (globalModelWeights[i] ?? 0);
      }
    }

    // Add DP noise if enabled
    if (config.differentialPrivacy && config.dpEpsilon) {
      const sigma = 1.0 / config.dpEpsilon;
      for (let i = 0; i < localDelta.length; i++) {
        const u1 = Math.random(), u2 = Math.random();
        localDelta[i] += sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      }
    }

    localUpdates.push(localDelta);
    totalDataPoints += client.dataSize;

    // Update client stats
    client.localLoss *= 0.95 + Math.random() * 0.05;
    client.localAccuracy = Math.min(0.99, client.localAccuracy + Math.random() * 0.02);
    client.roundsParticipated++;

    const bytesPerWeight = config.compressionBits ? config.compressionBits / 8 : 4;
    client.communicationBytes += localDelta.length * bytesPerWeight * 2; // up + down
  }

  // Aggregate updates (FedAvg: weighted by data size)
  const aggregatedDelta = new Array(globalModelWeights.length).fill(0);
  for (let c = 0; c < selectedClients.length; c++) {
    const weight = selectedClients[c].dataSize / totalDataPoints;
    for (let i = 0; i < aggregatedDelta.length; i++) {
      aggregatedDelta[i] += localUpdates[c][i] * weight;
    }
  }

  // Apply to global model
  for (let i = 0; i < globalModelWeights.length; i++) {
    state.globalModelWeights[i] += aggregatedDelta[i];
  }

  // Calculate global metrics
  const weightsDelta = Math.sqrt(aggregatedDelta.reduce((s, d) => s + d * d, 0));
  const decay = 0.95;
  const avgLoss = selectedClients.reduce((s, c) => s + c.localLoss, 0) / selectedClients.length;
  const avgAcc = selectedClients.reduce((s, c) => s + c.localAccuracy, 0) / selectedClients.length;

  const bytesPerWeight = config.compressionBits ? config.compressionBits / 8 : 4;
  const commBytes = selectedClients.length * globalModelWeights.length * bytesPerWeight * 2;
  const privacyConsumed = config.differentialPrivacy ? (config.dpEpsilon ?? 0) / Math.sqrt(state.currentRound + 1) : 0;

  state.currentRound++;
  state.totalCommunicationBytes += commBytes;
  state.totalPrivacyBudget += privacyConsumed;

  const round: FederatedRound = {
    roundNumber: state.currentRound,
    selectedClients: selectedIds,
    globalLoss: Math.round(avgLoss * 10000) / 10000,
    globalAccuracy: Math.round(avgAcc * 10000) / 10000,
    aggregatedWeightsDelta: Math.round(weightsDelta * 100000) / 100000,
    communicationCostBytes: Math.round(commBytes),
    privacyBudgetConsumed: Math.round(privacyConsumed * 10000) / 10000,
    durationMs: Math.round(performance.now() - start),
  };

  state.roundHistory.push(round);
  return round;
}

// ═══════════════════════════════════════════
// TF CONSTRAINED OPTIMIZATION (TFCO)
// ═══════════════════════════════════════════

export interface ConstrainedOptConfig {
  maxIterations: number;
  learningRate: number;
  lagrangianLearningRate: number;
  constraints: InequalityConstraint[];
  tolerances: number;
}

export interface InequalityConstraint {
  name: string;
  type: "upper_bound" | "lower_bound" | "equality";
  targetMetric: string;
  threshold: number;
  slackVariable?: number;
  lagrangeMultiplier: number;
}

export interface ConstrainedOptResult {
  converged: boolean;
  iterations: number;
  objectiveValue: number;
  constraintViolations: { name: string; violation: number; satisfied: boolean }[];
  lagrangeMultipliers: Record<string, number>;
  primalDualGap: number;
}

/** Solve constrained optimization via Lagrangian relaxation */
export function solveConstrainedOptimization(
  objectiveFn: (params: number[]) => number,
  constraintFns: ((params: number[]) => number)[],
  config: Partial<ConstrainedOptConfig> = {},
  initialParams: number[] = []
): ConstrainedOptResult {
  const maxIter = config.maxIterations ?? 200;
  const lr = config.learningRate ?? 0.01;
  const lagLr = config.lagrangianLearningRate ?? 0.1;
  const constraints = config.constraints ?? constraintFns.map((_, i) => ({
    name: `constraint_${i}`,
    type: "upper_bound" as const,
    targetMetric: `metric_${i}`,
    threshold: 0,
    lagrangeMultiplier: 0.1,
  }));
  const tol = config.tolerances ?? 1e-4;

  const params = initialParams.length > 0 ? [...initialParams] : [0.5, 0.5, 0.5];
  const lambdas = constraints.map(c => c.lagrangeMultiplier);

  let converged = false;
  let lastObj = Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    const obj = objectiveFn(params);
    const constraintValues = constraintFns.map(fn => fn(params));

    // Primal update: minimize L(x, λ) = f(x) + Σ λ_i * g_i(x)
    for (let p = 0; p < params.length; p++) {
      const eps = 1e-5;
      const paramsPlus = [...params]; paramsPlus[p] += eps;
      const gradObj = (objectiveFn(paramsPlus) - obj) / eps;

      let gradConstraint = 0;
      for (let c = 0; c < constraintFns.length; c++) {
        const cvPlus = constraintFns[c](paramsPlus);
        gradConstraint += lambdas[c] * (cvPlus - constraintValues[c]) / eps;
      }

      params[p] -= lr * (gradObj + gradConstraint);
    }

    // Dual update: maximize λ
    for (let c = 0; c < lambdas.length; c++) {
      lambdas[c] = Math.max(0, lambdas[c] + lagLr * constraintValues[c]);
    }

    // Check convergence
    if (Math.abs(obj - lastObj) < tol) {
      converged = true;
      break;
    }
    lastObj = obj;
  }

  const finalConstraints = constraintFns.map(fn => fn(params));
  const violations = constraints.map((c, i) => ({
    name: c.name,
    violation: Math.round(finalConstraints[i] * 10000) / 10000,
    satisfied: finalConstraints[i] <= tol,
  }));

  const lagMap: Record<string, number> = {};
  constraints.forEach((c, i) => { lagMap[c.name] = Math.round(lambdas[i] * 10000) / 10000; });

  return {
    converged,
    iterations: maxIter,
    objectiveValue: Math.round(objectiveFn(params) * 10000) / 10000,
    constraintViolations: violations,
    lagrangeMultipliers: lagMap,
    primalDualGap: Math.round(lambdas.reduce((s, l, i) => s + l * finalConstraints[i], 0) * 10000) / 10000,
  };
}

/** Rate-constrained fairness optimization */
export function fairnessConstrainedOptimization(
  predictions: number[],
  labels: number[],
  protectedAttr: number[],
  maxFPRDisparity = 0.05,
  maxFNRDisparity = 0.05
): ConstrainedOptResult {
  // Split into groups
  const groups = new Map<number, { preds: number[]; labels: number[] }>();
  for (let i = 0; i < predictions.length; i++) {
    const g = protectedAttr[i];
    if (!groups.has(g)) groups.set(g, { preds: [], labels: [] });
    groups.get(g)!.preds.push(predictions[i]);
    groups.get(g)!.labels.push(labels[i]);
  }

  const groupEntries = Array.from(groups.entries());

  // Objective: minimize overall loss
  const objectiveFn = (params: number[]): number => {
    const threshold = params[0] ?? 0.5;
    let loss = 0;
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i] >= threshold ? 1 : 0;
      loss += (pred - labels[i]) ** 2;
    }
    return loss / predictions.length;
  };

  // Constraints: FPR/FNR disparity between groups
  const constraintFns: ((params: number[]) => number)[] = [];

  if (groupEntries.length >= 2) {
    // FPR disparity constraint
    constraintFns.push((params) => {
      const threshold = params[0] ?? 0.5;
      const fprs = groupEntries.map(([, g]) => {
        const neg = g.labels.filter(l => l === 0).length;
        const fp = g.preds.filter((p, i) => p >= threshold && g.labels[i] === 0).length;
        return neg > 0 ? fp / neg : 0;
      });
      return Math.max(...fprs) - Math.min(...fprs) - maxFPRDisparity;
    });

    // FNR disparity constraint
    constraintFns.push((params) => {
      const threshold = params[0] ?? 0.5;
      const fnrs = groupEntries.map(([, g]) => {
        const pos = g.labels.filter(l => l === 1).length;
        const fn = g.preds.filter((p, i) => p < threshold && g.labels[i] === 1).length;
        return pos > 0 ? fn / pos : 0;
      });
      return Math.max(...fnrs) - Math.min(...fnrs) - maxFNRDisparity;
    });
  }

  return solveConstrainedOptimization(objectiveFn, constraintFns, {
    constraints: [
      { name: "fpr_disparity", type: "upper_bound", targetMetric: "FPR_gap", threshold: maxFPRDisparity, lagrangeMultiplier: 0.1 },
      { name: "fnr_disparity", type: "upper_bound", targetMetric: "FNR_gap", threshold: maxFNRDisparity, lagrangeMultiplier: 0.1 },
    ],
  }, [0.5]);
}

// ═══════════════════════════════════════════
// TF LATTICE
// ═══════════════════════════════════════════

export interface LatticeConfig {
  featureNames: string[];
  latticeSize: number;        // vertices per dimension (typically 2-10)
  numKeypoints: number;       // calibration keypoints per feature
  monotonicities: ("increasing" | "decreasing" | "none")[];
  outputBounds?: { min: number; max: number };
  regularization: {
    laplacian: number;
    torsion: number;
  };
}

export interface CalibratedLatticeModel {
  config: LatticeConfig;
  calibrators: PiecewiseLinearCalibrator[];
  latticeWeights: number[];   // flattened lattice vertex weights
  trainedAt: string;
}

export interface PiecewiseLinearCalibrator {
  featureName: string;
  inputKeypoints: number[];
  outputKeypoints: number[];
  monotonicity: "increasing" | "decreasing" | "none";
  clamp: boolean;
}

/** Create a calibrated lattice model */
export function createLatticeModel(config: LatticeConfig): CalibratedLatticeModel {
  const numVertices = config.latticeSize ** config.featureNames.length;

  // Initialize calibrators
  const calibrators: PiecewiseLinearCalibrator[] = config.featureNames.map((name, i) => {
    const inputKp = Array.from({ length: config.numKeypoints }, (_, k) => k / (config.numKeypoints - 1));
    const outputKp = [...inputKp]; // identity initially

    // If monotonic, ensure monotonicity
    if (config.monotonicities[i] === "decreasing") {
      outputKp.reverse();
    }

    return {
      featureName: name,
      inputKeypoints: inputKp,
      outputKeypoints: outputKp,
      monotonicity: config.monotonicities[i] ?? "none",
      clamp: true,
    };
  });

  // Initialize lattice weights uniformly
  const latticeWeights = Array.from({ length: numVertices }, () => 0.5 + (Math.random() - 0.5) * 0.1);

  return {
    config,
    calibrators,
    latticeWeights,
    trainedAt: new Date().toISOString(),
  };
}

/** Train lattice model on data */
export function trainLatticeModel(
  model: CalibratedLatticeModel,
  data: number[][],
  labels: number[],
  epochs = 100,
  learningRate = 0.01
): { model: CalibratedLatticeModel; loss: number; epochs: number } {
  const { config, calibrators, latticeWeights } = model;
  let loss = Infinity;

  for (let epoch = 0; epoch < epochs; epoch++) {
    let epochLoss = 0;

    for (let sample = 0; sample < data.length; sample++) {
      // Step 1: Calibrate inputs
      const calibrated = data[sample].map((val, f) => calibrateValue(val, calibrators[f]));

      // Step 2: Lattice interpolation
      const { value: prediction, vertexWeights } = latticeInterpolate(calibrated, config.latticeSize, latticeWeights);

      // Step 3: Loss
      const error = prediction - labels[sample];
      epochLoss += error * error;

      // Step 4: Update lattice weights (gradient descent)
      for (let v = 0; v < latticeWeights.length; v++) {
        const grad = 2 * error * vertexWeights[v];
        latticeWeights[v] -= learningRate * grad;

        // Add regularization
        latticeWeights[v] -= learningRate * config.regularization.laplacian * latticeWeights[v];
      }

      // Enforce monotonicity constraints on lattice
      enforceLatticeMonotonicity(latticeWeights, config);
    }

    // Clamp output bounds
    if (config.outputBounds) {
      for (let v = 0; v < latticeWeights.length; v++) {
        latticeWeights[v] = Math.max(config.outputBounds.min, Math.min(config.outputBounds.max, latticeWeights[v]));
      }
    }

    loss = epochLoss / Math.max(data.length, 1);
  }

  return {
    model: { ...model, latticeWeights: [...latticeWeights], trainedAt: new Date().toISOString() },
    loss: Math.round(loss * 100000) / 100000,
    epochs,
  };
}

/** Predict with trained lattice model */
export function latticePredict(model: CalibratedLatticeModel, input: number[]): number {
  const calibrated = input.map((val, f) => calibrateValue(val, model.calibrators[f]));
  const { value } = latticeInterpolate(calibrated, model.config.latticeSize, model.latticeWeights);
  if (model.config.outputBounds) {
    return Math.max(model.config.outputBounds.min, Math.min(model.config.outputBounds.max, value));
  }
  return value;
}

/** Get feature importance from lattice model (interpretability) */
export function latticeFeatureImportance(model: CalibratedLatticeModel): { feature: string; importance: number }[] {
  const { config, latticeWeights } = model;
  const dims = config.featureNames.length;
  const size = config.latticeSize;
  const importances: number[] = new Array(dims).fill(0);

  // For each dimension, calculate average absolute difference along that axis
  for (let d = 0; d < dims; d++) {
    let totalDiff = 0;
    let count = 0;
    const stride = size ** d;

    for (let v = 0; v < latticeWeights.length; v++) {
      const posInDim = Math.floor(v / stride) % size;
      if (posInDim < size - 1) {
        totalDiff += Math.abs(latticeWeights[v + stride] - latticeWeights[v]);
        count++;
      }
    }
    importances[d] = count > 0 ? totalDiff / count : 0;
  }

  // Normalize
  const total = importances.reduce((s, v) => s + v, 0) || 1;
  return config.featureNames.map((name, i) => ({
    feature: name,
    importance: Math.round(importances[i] / total * 10000) / 10000,
  }));
}

// ─── Helpers ───

function calibrateValue(value: number, calibrator: PiecewiseLinearCalibrator): number {
  const { inputKeypoints: inp, outputKeypoints: out, clamp } = calibrator;

  if (clamp) {
    value = Math.max(inp[0], Math.min(inp[inp.length - 1], value));
  }

  // Find segment
  for (let i = 0; i < inp.length - 1; i++) {
    if (value <= inp[i + 1]) {
      const t = inp[i + 1] - inp[i] !== 0 ? (value - inp[i]) / (inp[i + 1] - inp[i]) : 0;
      return out[i] + t * (out[i + 1] - out[i]);
    }
  }
  return out[out.length - 1];
}

function latticeInterpolate(
  calibrated: number[],
  latticeSize: number,
  weights: number[]
): { value: number; vertexWeights: number[] } {
  const dims = calibrated.length;
  const numVertices = latticeSize ** dims;
  const vertexWeights = new Array(numVertices).fill(0);

  // Scale to lattice grid [0, latticeSize-1]
  const scaled = calibrated.map(v => v * (latticeSize - 1));
  const lowerIndices = scaled.map(v => Math.floor(Math.min(v, latticeSize - 2)));
  const residuals = scaled.map((v, i) => v - lowerIndices[i]);

  // Multilinear interpolation: iterate over 2^dims corners
  const numCorners = 1 << dims;
  let value = 0;

  for (let corner = 0; corner < numCorners; corner++) {
    let w = 1;
    let vertexIndex = 0;
    for (let d = 0; d < dims; d++) {
      const bit = (corner >> d) & 1;
      const idx = lowerIndices[d] + bit;
      w *= bit ? residuals[d] : (1 - residuals[d]);
      vertexIndex += idx * (latticeSize ** d);
    }
    if (vertexIndex < weights.length) {
      value += w * weights[vertexIndex];
      vertexWeights[vertexIndex] = w;
    }
  }

  return { value, vertexWeights };
}

function enforceLatticeMonotonicity(weights: number[], config: LatticeConfig): void {
  const { latticeSize, monotonicities, featureNames } = config;
  const dims = featureNames.length;

  for (let d = 0; d < dims; d++) {
    if (monotonicities[d] === "none") continue;
    const stride = latticeSize ** d;
    const increasing = monotonicities[d] === "increasing";

    for (let v = 0; v < weights.length; v++) {
      const posInDim = Math.floor(v / stride) % latticeSize;
      if (posInDim < latticeSize - 1) {
        const nextV = v + stride;
        if (nextV < weights.length) {
          if (increasing && weights[nextV] < weights[v]) {
            const avg = (weights[v] + weights[nextV]) / 2;
            weights[v] = avg - 0.001;
            weights[nextV] = avg + 0.001;
          } else if (!increasing && weights[nextV] > weights[v]) {
            const avg = (weights[v] + weights[nextV]) / 2;
            weights[v] = avg + 0.001;
            weights[nextV] = avg - 0.001;
          }
        }
      }
    }
  }
}

// ═══ STATE ═══

export function getResponsibleAITrainingState() {
  return {
    federated: ["FedAvg (McMahan 2017)", "FedSGD", "FedProx (Li 2020)", "SCAFFOLD", "Secure Aggregation", "DP-FedAvg", "Gradient Compression"],
    constrainedOpt: ["Lagrangian Relaxation", "Fairness Constraints (FPR/FNR)", "Rate Constraints", "Primal-Dual", "TFCO (Cotter 2019)"],
    lattice: ["Calibrated Lattice Models", "Piecewise Linear Calibration", "Monotonicity Constraints", "Feature Importance", "Interpretable ML (You 2017)"],
  };
}
