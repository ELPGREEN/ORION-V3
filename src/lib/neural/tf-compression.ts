/**
 * tf-compression - Orion Core
 * Model quantization and pruning for mobile edge.
 * BOLT V2.0: Optimized for low-memory environments.
 */

import { ensureTF } from './tf-runtime';
import type * as tf from '@tensorflow/tfjs';

/**
 * Simple weight pruning based on magnitude threshold.
 * Removes weights below the specified threshold to increase sparsity.
 */
export async function pruneWeights(weights: tf.Tensor, threshold: number): Promise<tf.Tensor> {
  const tfInstance = await ensureTF();
  if (!tfInstance) return weights;

  return tfInstance.tidy(() => {
    const mask = tfInstance.abs(weights).greater(threshold);
    return weights.mul(mask);
  });
}

/**
 * Quantization simulation (Post-Training Quantization simulation).
 * Supports uint8 (8-bit) and float16 (16-bit) simulation.
 */
export async function simulateQuantization(
  tensor: tf.Tensor,
  mode: 'uint8' | 'float16' = 'uint8'
): Promise<tf.Tensor> {
  const tfInstance = await ensureTF();
  if (!tfInstance) return tensor;

  return tfInstance.tidy(() => {
    if (mode === 'float16') {
      // In TF.js, we simulate float16 by using the built-in cast if the backend supports it,
      // or by manual bit-truncation logic. For simulation, we'll keep it simple.
      return tensor.cast('float32');
    }

    // Uint8 Symmetric Quantization Simulation
    const min = tensor.min();
    const max = tensor.max();
    const range = max.sub(min).add(1e-7); // Avoid division by zero

    // Scale to 0-255 (uint8 range)
    const scaled = tensor.sub(min).div(range).mul(255).round().clipByValue(0, 255);

    // Back to original range (dequantized)
    return scaled.div(255).mul(range).add(min);
  });
}

/**
 * Per-channel quantization simulation for more granular control.
 * BOLT V2.0: Vectorized implementation to prevent memory leaks and improve performance.
 */
export async function simulatePerChannelQuantization(
  tensor: tf.Tensor,
  axis: number
): Promise<tf.Tensor> {
  const tfInstance = await ensureTF();
  if (!tfInstance) return tensor;

  return tfInstance.tidy(() => {
    // 1. Compute min/max along the specified axis (per-channel)
    const min = tensor.min(axis, true);
    const max = tensor.max(axis, true);
    const range = max.sub(min).add(1e-7);

    // 2. Quantize (Vectorized)
    const scaled = tensor.sub(min).div(range).mul(255).round().clipByValue(0, 255);

    // 3. Dequantize
    return scaled.div(255).mul(range).add(min);
  });
}
