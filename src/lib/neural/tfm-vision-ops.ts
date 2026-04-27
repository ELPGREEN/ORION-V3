/**
 * tfm.vision.ops - Orion Core
 * Low-level tensor operations for vision models.
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Intersection over Union (IoU) calculation.
 */
export function calculateIoU(box1: tf.Tensor2D, box2: tf.Tensor2D): tf.Tensor1D {
  return tf.tidy(() => {
    // box format: [y1, x1, y2, x2]
    const ymin1 = box1.gather([0], 1);
    const xmin1 = box1.gather([1], 1);
    const ymax1 = box1.gather([2], 1);
    const xmax1 = box1.gather([3], 1);

    const ymin2 = box2.gather([0], 1);
    const xmin2 = box2.gather([1], 1);
    const ymax2 = box2.gather([2], 1);
    const xmax2 = box2.gather([3], 1);

    const area1 = ymax1.sub(ymin1).mul(xmax1.sub(xmin1));
    const area2 = ymax2.sub(ymin2).mul(xmax2.sub(xmin2));

    const intersectionYmin = tf.maximum(ymin1, ymin2);
    const intersectionXmin = tf.maximum(xmin1, xmin2);
    const intersectionYmax = tf.minimum(ymax1, ymax2);
    const intersectionXmax = tf.minimum(xmax1, xmax2);

    const intersectionArea = tf.maximum(0, intersectionYmax.sub(intersectionYmin))
      .mul(tf.maximum(0, intersectionXmax.sub(intersectionXmin)));

    const unionArea = area1.add(area2).sub(intersectionArea);
    return intersectionArea.div(unionArea).squeeze() as tf.Tensor1D;
  });
}

/**
 * ⚡ BOLT: Optimized Non-Max Suppression for deduplicating detections.
 */
export async function applyNMS(
  boxes: tf.Tensor2D,
  scores: tf.Tensor1D,
  maxOutputSize: number,
  iouThreshold = 0.5,
  scoreThreshold = 0.5
): Promise<number[]> {
  const selectedIndices = await tf.image.nonMaxSuppressionAsync(
    boxes,
    scores,
    maxOutputSize,
    iouThreshold,
    scoreThreshold
  );
  const indices = Array.from(await selectedIndices.data());
  selectedIndices.dispose();
  return indices;
}
