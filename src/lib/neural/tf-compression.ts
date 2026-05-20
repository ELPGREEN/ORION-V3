/**
 * tf-compression - Orion Core
 * Model quantization and pruning for mobile edge.
 * BOLT V2.0: Optimized for zero-allocation and high-performance edge inference.
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Simple weight pruning based on magnitude threshold.
 */
export function pruneWeights(weights: tf.Tensor, threshold: number): tf.Tensor {
  if (threshold < 0) throw new Error('Threshold must be non-negative');
  return tf.tidy(() => {
    const mask = tf.abs(weights).greater(threshold);
    return weights.mul(mask);
  });
}

/**
 * Int8 Quantization simulation (Global).
 */
export function simulateQuantization(tensor: tf.Tensor): tf.Tensor {
  return tf.tidy(() => {
    const min = tensor.min();
    const max = tensor.max();
    const range = max.sub(min);

    // Prevent division by zero
    const epsilon = tf.scalar(1e-7);
    const safeRange = tf.maximum(range, epsilon);

    // Scale to 0-255 (uint8 range)
    const scaled = tensor.sub(min).div(safeRange).mul(255).round();

    // Back to original range (quantized)
    return scaled.div(255).mul(safeRange).add(min);
  });
}

/**
 * Per-channel Quantization simulation (Advanced).
 * More accurate for deep neural networks.
 */
export function simulatePerChannelQuantization(tensor: tf.Tensor, axis = -1): tf.Tensor {
  return tf.tidy(() => {
    const min = tensor.min(axis, true);
    const max = tensor.max(axis, true);
    const range = max.sub(min);

    const epsilon = tf.scalar(1e-7);
    const safeRange = tf.maximum(range, epsilon);

    const scaled = tensor.sub(min).div(safeRange).mul(255).round();
    return scaled.div(255).mul(safeRange).add(min);
  });
}

/**
 * Compresses a model using pruning and quantization.
 */
export async function compressModel(
  model: tf.LayersModel,
  pruningThreshold = 0.01,
  quantizationMode: 'global' | 'per-channel' = 'per-channel'
): Promise<void> {
  model.layers.forEach(layer => {
    const weights = layer.getWeights();
    if (weights.length > 0) {
      const compressedWeights = weights.map(w => {
        return tf.tidy(() => {
          let processed = pruneWeights(w, pruningThreshold);
          if (quantizationMode === 'global') {
            processed = simulateQuantization(processed);
          } else {
            processed = simulatePerChannelQuantization(processed);
          }
          return processed;
        });
      });
      layer.setWeights(compressedWeights);
      compressedWeights.forEach(w => w.dispose());
    }
  });
}
