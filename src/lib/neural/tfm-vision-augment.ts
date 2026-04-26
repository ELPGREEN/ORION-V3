/**
 * tfm.vision.augment - Orion Core
 * Image augmentation policies for robust computer vision.
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Applies random horizontal flip to a batch of images.
 */
export function randomFlipLeftRight(images: tf.Tensor4D): tf.Tensor4D {
  return tf.tidy(() => {
    const [batch, h, w, c] = images.shape;
    const mask = tf.randomUniform([batch, 1, 1, 1], 0, 1).greater(0.5);
    const flipped = tf.reverse(images, [2]);
    return tf.where(mask, flipped, images);
  });
}

/**
 * Basic color jitter implementation.
 */
export function colorJitter(images: tf.Tensor4D, brightness = 0.2): tf.Tensor4D {
  return tf.tidy(() => {
    const factor = tf.randomUniform([], 1 - brightness, 1 + brightness);
    return images.mul(factor).clipByValue(0, 1);
  });
}
