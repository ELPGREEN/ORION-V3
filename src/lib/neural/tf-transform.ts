/**
 * tf-transform - Orion Core
 * Feature engineering and transformation pipeline.
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Standard Z-score normalization.
 */
export function standardize(data: tf.Tensor): tf.Tensor {
  return tf.tidy(() => {
    const mean = data.mean();
    const std = tf.moments(data).variance.sqrt().add(1e-7);
    return data.sub(mean).div(std);
  });
}

/**
 * Min-Max scaling to [0, 1].
 */
export function minMaxScale(data: tf.Tensor): tf.Tensor {
  return tf.tidy(() => {
    const min = data.min();
    const max = data.max();
    return data.sub(min).div(max.sub(min).add(1e-7));
  });
}

/**
 * One-hot encoding for categorical features.
 */
export function oneHotEncode(indices: tf.Tensor1D, depth: number): tf.Tensor2D {
  return tf.oneHot(indices, depth);
}
