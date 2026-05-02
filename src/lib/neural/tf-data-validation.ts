/**
 * tf-data-validation - Orion Core
 * Schema validation and anomaly detection for training data.
 */

import * as tf from '@tensorflow/tfjs';

export interface Schema {
  featureName: string;
  type: 'float32' | 'int32';
  min?: number;
  max?: number;
}

/**
 * Validates a tensor against a schema.
 */
export function validateTensor(tensor: tf.Tensor, schema: Schema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (tensor.dtype !== schema.type) {
    errors.push(`Invalid dtype: expected ${schema.type}, got ${tensor.dtype}`);
  }

  if (schema.min !== undefined) {
    const minVal = tensor.min().dataSync()[0];
    if (minVal < schema.min) errors.push(`Value below minimum: ${minVal} < ${schema.min}`);
  }

  if (schema.max !== undefined) {
    const maxVal = tensor.max().dataSync()[0];
    if (maxVal > schema.max) errors.push(`Value above maximum: ${maxVal} > ${schema.max}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Detects statistical anomalies in a batch of data.
 */
export function detectAnomalies(data: tf.Tensor, zScoreThreshold = 3): tf.Tensor {
  return tf.tidy(() => {
    const mean = data.mean();
    const std = tf.moments(data).variance.sqrt();
    const zScores = data.sub(mean).div(std).abs();
    return zScores.greater(zScoreThreshold);
  });
}
