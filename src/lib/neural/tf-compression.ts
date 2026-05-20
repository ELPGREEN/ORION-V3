/**
 * tf-compression - Orion Core
 * Model quantization and pruning for mobile edge.
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Simple weight pruning based on magnitude threshold.
 */
export function pruneWeightsByMagnitude(weights: tf.Tensor, threshold: number): tf.Tensor {
  return tf.tidy(() => {
    const mask = tf.abs(weights).greater(threshold);
    return weights.mul(mask);
  });
}

/**
 * Int8 Quantization simulation.
 */
export function simulateQuantization(tensor: tf.Tensor): tf.Tensor {
  return tf.tidy(() => {
    const min = tensor.min();
    const max = tensor.max();
    const range = max.sub(min);

    // Scale to 0-255 (uint8 range)
    const scaled = tensor.sub(min).div(range).mul(255).round();

    // Back to original range (quantized)
    return scaled.div(255).mul(range).add(min);
  });
}
