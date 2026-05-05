/**
 * tf-explainability - Orion Core
 * Interpretability layers for neural decisions.
 * BOLT V2.0: Unified SHAP-like analysis for TensorFlow.js models.
 */

import * as tf from '@tensorflow/tfjs';

export interface ExplainabilityReport {
  featureImportance: Array<{ name: string; value: number }>;
  shapValues: number[];
  baseline: number;
  prediction: number;
  timestamp: number;
}

/**
 * Integrated Gradients implementation for model interpretability.
 */
export async function integratedGradients(
  model: tf.LayersModel,
  input: tf.Tensor,
  baseline: tf.Tensor,
  steps = 50
): Promise<tf.Tensor> {
  const diff = input.sub(baseline);
  let totalGradients = tf.zerosLike(input);

  for (let i = 1; i <= steps; i++) {
    const alpha = i / steps;
    const stepInput = baseline.add(diff.mul(alpha));

    const grads = tf.variableGrads(() => {
      const pred = model.predict(stepInput) as tf.Tensor;
      return pred.sum();
    });

    const g = grads.grads[Object.keys(grads.grads)[0]];
    totalGradients = totalGradients.add(g);

    tf.dispose(grads.grads);
    tf.dispose(stepInput);
  }

  const avgGradients = totalGradients.div(steps);
  return avgGradients.mul(diff);
}

/**
 * Simplified SHAP value calculation for browser environment.
 */
export async function getSHAPValues(
  model: tf.LayersModel,
  input: tf.Tensor,
  featureNames: string[]
): Promise<ExplainabilityReport> {
  const prediction = (model.predict(input) as tf.Tensor).dataSync()[0];
  const baselineTensor = tf.zerosLike(input);
  const baseline = (model.predict(baselineTensor) as tf.Tensor).dataSync()[0];

  const igTensor = await integratedGradients(model, input, baselineTensor);
  const igValues = Array.from(igTensor.dataSync());

  const featureImportance = featureNames.map((name, i) => ({
    name,
    value: Math.abs(igValues[i] || 0)
  })).sort((a, b) => b.value - a.value);

  igTensor.dispose();
  baselineTensor.dispose();

  return {
    featureImportance,
    shapValues: igValues,
    baseline,
    prediction,
    timestamp: Date.now()
  };
}

/**
 * Saliency map generation for vision models.
 */
export function generateSaliencyMap(model: tf.LayersModel, input: tf.Tensor): tf.Tensor {
  return tf.tidy(() => {
    const grads = tf.variableGrads(() => {
      const pred = model.predict(input) as tf.Tensor;
      return pred.max();
    });

    const saliency = tf.abs(grads.grads[Object.keys(grads.grads)[0]]);
    return saliency.div(saliency.max());
  });
}

/**
 * Global Feature Importance based on weight magnitudes.
 */
export function getGlobalFeatureImportance(model: tf.LayersModel, featureNames: string[]): Array<{name: string, value: number}> {
  return tf.tidy(() => {
    const firstLayer = model.layers.find(l => l.getClassName() === 'Dense');
    if (!firstLayer) return [];

    const weights = firstLayer.getWeights()[0];
    const importance = tf.abs(weights).sum(1);
    const values = Array.from(importance.dataSync());

    return featureNames.map((name, i) => ({
      name,
      value: values[i] || 0
    })).sort((a, b) => b.value - a.value);
  });
}
