/**
 * Frame Tensor Preprocessing - Orion Core
 * High-performance pipeline for converting video frames to normalized tensors.
 */

import * as tf from '@tensorflow/tfjs';

export interface PreprocessingConfig {
  width: number;
  height: number;
  normalize: boolean;
  mean?: number[];
  std?: number[];
}

const DEFAULT_CONFIG: PreprocessingConfig = {
  width: 224,
  height: 224,
  normalize: true,
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225]
};

/**
 * Converts an image element, video element, or canvas to a normalized tensor.
 */
export function preprocessFrame(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  config: Partial<PreprocessingConfig> = {}
): tf.Tensor4D {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return tf.tidy(() => {
    // 1. Convert source to tensor
    let tensor = tf.browser.fromPixels(source);

    // 2. Resize to model input size
    tensor = tf.image.resizeBilinear(tensor, [finalConfig.height, finalConfig.width]);

    // 3. Expand dimensions to [1, H, W, C]
    let tensor4d = tensor.expandDims(0).toFloat();

    // 4. Normalize to [0, 1]
    if (finalConfig.normalize) {
      tensor4d = tensor4d.div(255.0);

      // 5. Apply ImageNet normalization (if mean/std provided)
      if (finalConfig.mean && finalConfig.std) {
        const mean = tf.tensor1d(finalConfig.mean).reshape([1, 1, 1, 3]);
        const std = tf.tensor1d(finalConfig.std).reshape([1, 1, 1, 3]);
        tensor4d = tensor4d.sub(mean).div(std);
      }
    }

    return tensor4d as tf.Tensor4D;
  });
}

/**
 * Optimized gray-scale conversion for faster motion detection flows.
 */
export function extractGrayscaleTensor(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): tf.Tensor2D {
  return tf.tidy(() => {
    const tensor = tf.browser.fromPixels(source);
    return tensor.mean(2).toFloat().div(255.0) as tf.Tensor2D;
  });
}
