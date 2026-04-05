/**
 * ─── TF.js Continuous Learning & Incremental Adaptation ───
 * Implements federated-style incremental learning using TF.js.
 * Allows the model to learn from new interactions without full retraining.
 * 
 * Ref: McMahan et al. (2017) — Communication-Efficient Learning of Deep Networks
 */

import { ensureTF } from "./tf-runtime";

// ─── Types ───

export interface IncrementalSample {
  features: number[];
  label: number;
  weight?: number;
  timestamp: number;
}

export interface LearningConfig {
  learningRate: number;
  batchSize: number;
  maxBufferSize: number;
  adaptationThreshold: number; // min samples before adaptation
  decayFactor: number; // older sample decay
  federatedRounds: number;
}

export interface AdaptationResult {
  samplesUsed: number;
  lossBefor: number;
  lossAfter: number;
  improvement: number;
  durationMs: number;
  epochsTrained: number;
}

export interface ContinuousLearningState {
  totalSamplesProcessed: number;
  adaptationCount: number;
  currentBufferSize: number;
  avgLoss: number;
  lastAdaptation: string | null;
  isAdapting: boolean;
}

// ─── Constants ───

const DEFAULT_CONFIG: LearningConfig = {
  learningRate: 0.001,
  batchSize: 16,
  maxBufferSize: 512,
  adaptationThreshold: 32,
  decayFactor: 0.995,
  federatedRounds: 3,
};

// ─── State ───

let _buffer: IncrementalSample[] = [];
let _state: ContinuousLearningState = {
  totalSamplesProcessed: 0,
  adaptationCount: 0,
  currentBufferSize: 0,
  avgLoss: 1.0,
  lastAdaptation: null,
  isAdapting: false,
};
let _config = { ...DEFAULT_CONFIG };
let _model: any = null; // TF LayersModel

/** Configure continuous learning parameters */
export function configureContinuousLearning(config: Partial<LearningConfig>): void {
  _config = { ..._config, ...config };
}

/** Get current learning state */
export function getContinuousLearningState(): ContinuousLearningState {
  return { ..._state, currentBufferSize: _buffer.length };
}

/** Add a new training sample to the incremental buffer */
export function addIncrementalSample(sample: IncrementalSample): void {
  _buffer.push(sample);
  _state.totalSamplesProcessed++;

  // Evict oldest samples when buffer overflows
  if (_buffer.length > _config.maxBufferSize) {
    _buffer = _buffer.slice(_buffer.length - _config.maxBufferSize);
  }

  // Apply temporal decay
  const now = Date.now();
  for (const s of _buffer) {
    const ageMs = now - s.timestamp;
    const ageHours = ageMs / 3_600_000;
    s.weight = Math.pow(_config.decayFactor, ageHours);
  }
}

/** Build or get the incremental TF.js model */
export async function getOrCreateIncrementalModel(inputDim: number = 64, outputDim: number = 8): Promise<any> {
  if (_model) return _model;

  const tf = await ensureTF();
  if (!tf) return null;

  _model = tf.sequential();
  _model.add(tf.layers.dense({ units: 128, activation: "relu", inputShape: [inputDim] }));
  _model.add(tf.layers.dropout({ rate: 0.2 }));
  _model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  _model.add(tf.layers.dense({ units: outputDim, activation: "softmax" }));

  _model.compile({
    optimizer: tf.train.adam(_config.learningRate),
    loss: "sparseCategoricalCrossentropy",
    metrics: ["accuracy"],
  });

  console.log("[tf-continuous] Incremental model created");
  return _model;
}

/** Run incremental adaptation on buffered samples */
export async function runIncrementalAdaptation(
  inputDim: number = 64,
  outputDim: number = 8
): Promise<AdaptationResult | null> {
  if (_buffer.length < _config.adaptationThreshold) return null;
  if (_state.isAdapting) return null;

  _state.isAdapting = true;
  const start = performance.now();

  try {
    const tf = await ensureTF();
    if (!tf) { _state.isAdapting = false; return null; }

    const model = await getOrCreateIncrementalModel(inputDim, outputDim);
    if (!model) { _state.isAdapting = false; return null; }

    // Prepare weighted batch
    const samples = _buffer.slice(-_config.batchSize * 4);
    const xs = tf.tensor2d(samples.map(s => s.features.slice(0, inputDim)));
    const ys = tf.tensor1d(samples.map(s => s.label), "int32");
    const weights = tf.tensor1d(samples.map(s => s.weight ?? 1.0));

    // Evaluate before
    const lossBefore = model.evaluate(xs, ys)[0].dataSync()[0];

    // Federated-style: multiple rounds with subsampling
    let totalEpochs = 0;
    for (let round = 0; round < _config.federatedRounds; round++) {
      await model.fit(xs, ys, {
        epochs: 2,
        batchSize: _config.batchSize,
        sampleWeight: weights,
        shuffle: true,
        verbose: 0,
      });
      totalEpochs += 2;
    }

    // Evaluate after
    const lossAfter = model.evaluate(xs, ys)[0].dataSync()[0];

    // Cleanup tensors
    xs.dispose();
    ys.dispose();
    weights.dispose();

    // Clear processed samples
    _buffer = _buffer.slice(-_config.adaptationThreshold);

    const result: AdaptationResult = {
      samplesUsed: samples.length,
      lossBefor: lossBefore,
      lossAfter: lossAfter,
      improvement: lossBefore - lossAfter,
      durationMs: Math.round(performance.now() - start),
      epochsTrained: totalEpochs,
    };

    _state.adaptationCount++;
    _state.avgLoss = lossAfter;
    _state.lastAdaptation = new Date().toISOString();
    _state.isAdapting = false;

    console.log(`[tf-continuous] Adaptation #${_state.adaptationCount}: loss ${lossBefore.toFixed(4)} → ${lossAfter.toFixed(4)}`);
    return result;
  } catch (err) {
    console.warn("[tf-continuous] Adaptation failed:", err);
    _state.isAdapting = false;
    return null;
  }
}

/** Export model weights for federated aggregation */
export async function exportModelWeights(): Promise<number[][] | null> {
  if (!_model) return null;
  const weights = _model.getWeights();
  const data = await Promise.all(weights.map((w: any) => w.data()));
  return data.map((d: Float32Array) => Array.from(d));
}

/** Import aggregated weights from federated server */
export async function importModelWeights(weightData: number[][]): Promise<boolean> {
  if (!_model) return false;
  const tf = await ensureTF();
  if (!tf) return false;

  try {
    const currentWeights = _model.getWeights();
    const newWeights = weightData.map((data, i) => {
      const shape = currentWeights[i].shape;
      return tf.tensor(data, shape);
    });
    _model.setWeights(newWeights);
    // Dispose old
    currentWeights.forEach((w: any) => w.dispose());
    console.log("[tf-continuous] Weights imported successfully");
    return true;
  } catch {
    return false;
  }
}

/** Dispose continuous learning resources */
export function disposeContinuousLearning(): void {
  if (_model) {
    try { _model.dispose(); } catch {}
    _model = null;
  }
  _buffer = [];
  _state = {
    totalSamplesProcessed: 0,
    adaptationCount: 0,
    currentBufferSize: 0,
    avgLoss: 1.0,
    lastAdaptation: null,
    isAdapting: false,
  };
}
