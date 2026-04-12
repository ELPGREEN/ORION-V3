/**
 * ─── TF.js Predictive Analytics & Anomaly Detection ───
 * LSTM/Dense time-series models for trend prediction and anomaly detection.
 * Monitors system metrics, security events, and usage patterns.
 * 
 * Ref: Hochreiter & Schmidhuber (1997) — Long Short-Term Memory
 */

import { ensureTF } from "./tf-runtime";

// ─── Types ───

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface PredictionResult {
  predictedValues: number[];
  confidence: number;
  trend: "rising" | "falling" | "stable" | "volatile";
  horizon: number;
  durationMs: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number; // 0-1, higher = more anomalous
  threshold: number;
  zScore: number;
  reconstructionError: number;
  severity: "low" | "medium" | "high" | "critical";
}

export interface AnomalyDetectorConfig {
  windowSize: number;
  thresholdMultiplier: number; // z-score multiplier for anomaly
  maxHistorySize: number;
  autoTrainInterval: number; // samples between auto-retrain
}

export interface PredictiveAnalyticsState {
  totalPredictions: number;
  totalAnomaliesDetected: number;
  avgPredictionAccuracy: number;
  historySize: number;
  modelTrained: boolean;
  lastPrediction: string | null;
}

// ─── Constants ───

const DEFAULT_ANOMALY_CONFIG: AnomalyDetectorConfig = {
  windowSize: 24,
  thresholdMultiplier: 2.5,
  maxHistorySize: 2048,
  autoTrainInterval: 100,
};

// ─── State ───

let _history: TimeSeriesPoint[] = [];
let _anomalyModel: any = null;
let _predictorModel: any = null;
let _config = { ...DEFAULT_ANOMALY_CONFIG };
let _state: PredictiveAnalyticsState = {
  totalPredictions: 0,
  totalAnomaliesDetected: 0,
  avgPredictionAccuracy: 0,
  historySize: 0,
  modelTrained: false,
  lastPrediction: null,
};
let _trainingSampleCount = 0;

/** Configure anomaly detector */
export function configureAnomalyDetector(config: Partial<AnomalyDetectorConfig>): void {
  _config = { ..._config, ...config };
}

/** Get current state */
export function getPredictiveAnalyticsState(): PredictiveAnalyticsState {
  return { ..._state, historySize: _history.length };
}

/** Add a time-series data point */
export function addTimeSeriesPoint(point: TimeSeriesPoint): void {
  _history.push(point);
  if (_history.length > _config.maxHistorySize) {
    _history = _history.slice(_history.length - _config.maxHistorySize);
  }
  _trainingSampleCount++;
}

/** Statistical anomaly detection (no TF.js needed) */
export function detectAnomalyStatistical(value: number): AnomalyResult {
  const values = _history.slice(-_config.windowSize).map(p => p.value);
  if (values.length < 3) {
    return { isAnomaly: false, score: 0, threshold: 0, zScore: 0, reconstructionError: 0, severity: "low" };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance) || 0.001;
  const zScore = Math.abs(value - mean) / stdDev;
  const threshold = _config.thresholdMultiplier;
  const isAnomaly = zScore > threshold;
  const score = Math.min(1, zScore / (threshold * 2));

  const severity: AnomalyResult["severity"] =
    zScore > threshold * 3 ? "critical" :
    zScore > threshold * 2 ? "high" :
    zScore > threshold ? "medium" : "low";

  if (isAnomaly) _state.totalAnomaliesDetected++;

  return { isAnomaly, score, threshold, zScore, reconstructionError: Math.abs(value - mean), severity };
}

/** Build LSTM-based anomaly detection autoencoder */
export async function buildAnomalyAutoencoder(seqLen: number = 24): Promise<any> {
  const tf = await ensureTF();
  if (!tf) return null;

  const model = tf.sequential();

  // Encoder
  model.add(tf.layers.dense({ units: 32, activation: "relu", inputShape: [seqLen] }));
  model.add(tf.layers.dense({ units: 16, activation: "relu" }));
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));

  // Bottleneck
  model.add(tf.layers.dense({ units: 4, activation: "relu" }));

  // Decoder
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));
  model.add(tf.layers.dense({ units: 16, activation: "relu" }));
  model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: seqLen, activation: "linear" }));

  model.compile({ optimizer: tf.train.adam(0.001), loss: "meanSquaredError" });
  _anomalyModel = model;
  console.log("[tf-predictive] Anomaly autoencoder built");
  return model;
}

/** Train anomaly model on historical data */
export async function trainAnomalyModel(): Promise<{ loss: number; epochs: number } | null> {
  const tf = await ensureTF();
  if (!tf || _history.length < _config.windowSize * 2) return null;

  if (!_anomalyModel) await buildAnomalyAutoencoder(_config.windowSize);
  if (!_anomalyModel) return null;

  // Create sliding windows
  const windows: number[][] = [];
  const values = _history.map(p => p.value);

  // Normalize
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const normalized = values.map(v => (v - min) / range);

  for (let i = 0; i <= normalized.length - _config.windowSize; i++) {
    windows.push(normalized.slice(i, i + _config.windowSize));
  }

  if (windows.length < 4) return null;

  const xs = tf.tensor2d(windows);

  const result = await _anomalyModel.fit(xs, xs, {
    epochs: 10,
    batchSize: Math.min(32, windows.length),
    shuffle: true,
    verbose: 0,
  });

  xs.dispose();
  _state.modelTrained = true;

  const finalLoss = result.history.loss[result.history.loss.length - 1] as number;
  console.log(`[tf-predictive] Anomaly model trained, loss: ${finalLoss.toFixed(6)}`);
  return { loss: finalLoss, epochs: 10 };
}

/** Detect anomaly using trained autoencoder */
export async function detectAnomalyNeural(window: number[]): Promise<AnomalyResult> {
  if (!_anomalyModel) return detectAnomalyStatistical(window[window.length - 1]);

  const tf = await ensureTF();
  if (!tf) return detectAnomalyStatistical(window[window.length - 1]);

  try {
    const input = tf.tensor2d([window]);
    const reconstructed = _anomalyModel.predict(input) as any;
    const inputData = await input.data();
    const outputData = await reconstructed.data();

    let mse = 0;
    for (let i = 0; i < inputData.length; i++) {
      mse += Math.pow(inputData[i] - outputData[i], 2);
    }
    mse /= inputData.length;

    input.dispose();
    reconstructed.dispose();

    const threshold = 0.05; // tunable
    const isAnomaly = mse > threshold;
    const score = Math.min(1, mse / (threshold * 3));
    const severity: AnomalyResult["severity"] =
      mse > threshold * 4 ? "critical" :
      mse > threshold * 2 ? "high" :
      mse > threshold ? "medium" : "low";

    if (isAnomaly) _state.totalAnomaliesDetected++;

    return { isAnomaly, score, threshold, zScore: mse / threshold, reconstructionError: mse, severity };
  } catch {
    return detectAnomalyStatistical(window[window.length - 1]);
  }
}

/** Build simple dense predictor for time series */
export async function buildPredictor(seqLen: number = 24, horizon: number = 6): Promise<any> {
  const tf = await ensureTF();
  if (!tf) return null;

  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 64, activation: "relu", inputShape: [seqLen] }));
  model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: horizon, activation: "linear" }));

  model.compile({ optimizer: tf.train.adam(0.001), loss: "meanSquaredError" });
  _predictorModel = model;
  console.log("[tf-predictive] Predictor model built");
  return model;
}

/** Predict future values */
export async function predictTimeSeries(
  horizon: number = 6
): Promise<PredictionResult | null> {
  if (_history.length < _config.windowSize + horizon) return null;

  const tf = await ensureTF();
  if (!tf) return null;

  const start = performance.now();

  if (!_predictorModel) await buildPredictor(_config.windowSize, horizon);
  if (!_predictorModel) return null;

  try {
    // Prepare training data from history
    const values = _history.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const normalized = values.map(v => (v - min) / range);

    const xData: number[][] = [];
    const yData: number[][] = [];
    for (let i = 0; i <= normalized.length - _config.windowSize - horizon; i++) {
      xData.push(normalized.slice(i, i + _config.windowSize));
      yData.push(normalized.slice(i + _config.windowSize, i + _config.windowSize + horizon));
    }

    if (xData.length < 4) return null;

    const xs = tf.tensor2d(xData);
    const ys = tf.tensor2d(yData);

    await _predictorModel.fit(xs, ys, { epochs: 5, batchSize: 16, shuffle: true, verbose: 0 });

    // Predict next values
    const lastWindow = tf.tensor2d([normalized.slice(-_config.windowSize)]);
    const prediction = _predictorModel.predict(lastWindow) as any;
    const predData = await prediction.data();

    // Denormalize
    const predictedValues = Array.from(predData as Float32Array).map((v: number) => v * range + min);

    xs.dispose(); ys.dispose(); lastWindow.dispose(); prediction.dispose();

    // Determine trend
    const avgPred = predictedValues.reduce((a, b) => a + b, 0) / predictedValues.length;
    const lastValue = values[values.length - 1];
    const diff = (avgPred - lastValue) / (Math.abs(lastValue) || 1);
    const trend: PredictionResult["trend"] =
      diff > 0.1 ? "rising" : diff < -0.1 ? "falling" :
      Math.abs(diff) < 0.03 ? "stable" : "volatile";

    _state.totalPredictions++;
    _state.lastPrediction = new Date().toISOString();

    return {
      predictedValues,
      confidence: Math.max(0.3, 1 - Math.abs(diff)),
      trend,
      horizon,
      durationMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    console.warn("[tf-predictive] Prediction failed:", err);
    return null;
  }
}

/** Dispose all predictive analytics resources */
export function disposePredictiveAnalytics(): void {
  if (_anomalyModel) { try { _anomalyModel.dispose(); } catch {} _anomalyModel = null; }
  if (_predictorModel) { try { _predictorModel.dispose(); } catch {} _predictorModel = null; }
  _history = [];
  _state = { totalPredictions: 0, totalAnomaliesDetected: 0, avgPredictionAccuracy: 0, historySize: 0, modelTrained: false, lastPrediction: null };
}
