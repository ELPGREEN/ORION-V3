/**
 * ─── tfm.vision — Box Ops, Preprocess Ops, Spatial Transforms, NMS ───
 * 
 * Implements TensorFlow Model Garden vision utility operations for
 * bounding box manipulation, image preprocessing, and spatial transforms.
 * 
 * Ref: tfm.vision.box_ops, tfm.vision.preprocess_ops,
 *      tfm.vision.spatial_transform_ops, tfm.vision.nms
 *      (TensorFlow Model Garden, Apache 2.0)
 */

// ═══ BOUNDING BOX TYPES ═══

/** [y_min, x_min, y_max, x_max] — TF standard format */
export type BoxYXYX = [number, number, number, number];
/** [center_y, center_x, height, width] */
export type BoxCYCXHW = [number, number, number, number];
/** [x_min, y_min, width, height] — COCO format */
export type BoxXYWH = [number, number, number, number];

export interface Detection {
  box: BoxYXYX;
  score: number;
  classId: number;
  label?: string;
}

export interface AnchorConfig {
  minLevel: number;
  maxLevel: number;
  numScales: number;
  aspectRatios: number[];
  anchorSize: number;
}

// ═══ BOX FORMAT CONVERSIONS ═══

/** Convert [y1,x1,y2,x2] → [cy,cx,h,w] */
export function yxyxToCycxhw(box: BoxYXYX): BoxCYCXHW {
  const [y1, x1, y2, x2] = box;
  return [(y1 + y2) / 2, (x1 + x2) / 2, y2 - y1, x2 - x1];
}

/** Convert [cy,cx,h,w] → [y1,x1,y2,x2] */
export function cycxhwToYxyx(box: BoxCYCXHW): BoxYXYX {
  const [cy, cx, h, w] = box;
  return [cy - h / 2, cx - w / 2, cy + h / 2, cx + w / 2];
}

/** Convert [y1,x1,y2,x2] → [x,y,w,h] COCO format */
export function yxyxToXywh(box: BoxYXYX): BoxXYWH {
  return [box[1], box[0], box[3] - box[1], box[2] - box[0]];
}

/** Convert [x,y,w,h] COCO → [y1,x1,y2,x2] */
export function xywhToYxyx(box: BoxXYWH): BoxYXYX {
  return [box[1], box[0], box[1] + box[3], box[0] + box[2]];
}

// ═══ BOX OPERATIONS ═══

/** Compute IoU (Intersection over Union) between two boxes */
export function boxIoU(box1: BoxYXYX, box2: BoxYXYX): number {
  const interY1 = Math.max(box1[0], box2[0]);
  const interX1 = Math.max(box1[1], box2[1]);
  const interY2 = Math.min(box1[2], box2[2]);
  const interX2 = Math.min(box1[3], box2[3]);
  const interArea = Math.max(0, interY2 - interY1) * Math.max(0, interX2 - interX1);
  const area1 = (box1[2] - box1[0]) * (box1[3] - box1[1]);
  const area2 = (box2[2] - box2[0]) * (box2[3] - box2[1]);
  const unionArea = area1 + area2 - interArea;
  return unionArea > 0 ? interArea / unionArea : 0;
}

/** GIoU (Generalized IoU) — Rezatofighi et al. (2019) */
export function boxGIoU(box1: BoxYXYX, box2: BoxYXYX): number {
  const iou = boxIoU(box1, box2);
  const encY1 = Math.min(box1[0], box2[0]);
  const encX1 = Math.min(box1[1], box2[1]);
  const encY2 = Math.max(box1[2], box2[2]);
  const encX2 = Math.max(box1[3], box2[3]);
  const encArea = (encY2 - encY1) * (encX2 - encX1);
  const area1 = (box1[2] - box1[0]) * (box1[3] - box1[1]);
  const area2 = (box2[2] - box2[0]) * (box2[3] - box2[1]);
  const unionArea = area1 + area2 - boxIoU(box1, box2) * (area1 + area2 - Math.max(0, (Math.min(box1[2], box2[2]) - Math.max(box1[0], box2[0])) * (Math.min(box1[3], box2[3]) - Math.max(box1[1], box2[1]))));
  return encArea > 0 ? iou - (encArea - (area1 + area2 - (iou * (area1 + area2) / (1 + iou)))) / encArea : iou;
}

/** Compute pairwise IoU matrix */
export function bboxOverlap(boxes1: BoxYXYX[], boxes2: BoxYXYX[]): number[][] {
  return boxes1.map(b1 => boxes2.map(b2 => boxIoU(b1, b2)));
}

/** Clip boxes to image boundaries */
export function clipBoxes(boxes: BoxYXYX[], height: number, width: number): BoxYXYX[] {
  return boxes.map(([y1, x1, y2, x2]) => [
    Math.max(0, Math.min(height, y1)),
    Math.max(0, Math.min(width, x1)),
    Math.max(0, Math.min(height, y2)),
    Math.max(0, Math.min(width, x2)),
  ] as BoxYXYX);
}

/** Scale boxes by a factor */
export function scaleBoxes(boxes: BoxYXYX[], scaleY: number, scaleX: number): BoxYXYX[] {
  return boxes.map(([y1, x1, y2, x2]) => [y1 * scaleY, x1 * scaleX, y2 * scaleY, x2 * scaleX] as BoxYXYX);
}

/** Compute area of boxes */
export function boxArea(box: BoxYXYX): number {
  return Math.max(0, box[2] - box[0]) * Math.max(0, box[3] - box[1]);
}

/** Resize boxes after image resize+crop */
export function resizeAndCropBoxes(
  boxes: BoxYXYX[],
  imageScale: [number, number],
  outputSize: [number, number],
  offset: [number, number]
): BoxYXYX[] {
  return boxes.map(([y1, x1, y2, x2]) => [
    (y1 * imageScale[0] - offset[0]),
    (x1 * imageScale[1] - offset[1]),
    (y2 * imageScale[0] - offset[0]),
    (x2 * imageScale[1] - offset[1]),
  ] as BoxYXYX);
}

// ═══ NON-MAXIMUM SUPPRESSION ═══

/** Standard NMS — Greedy IoU-based suppression */
export function nms(detections: Detection[], iouThreshold = 0.5, maxDetections = 100): Detection[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const selected: Detection[] = [];

  const suppressed = new Set<number>();
  for (let i = 0; i < sorted.length && selected.length < maxDetections; i++) {
    if (suppressed.has(i)) continue;
    selected.push(sorted[i]);
    for (let j = i + 1; j < sorted.length; j++) {
      if (!suppressed.has(j) && boxIoU(sorted[i].box, sorted[j].box) > iouThreshold) {
        suppressed.add(j);
      }
    }
  }
  return selected;
}

/** Soft-NMS — Bodla et al. (2017): decays scores instead of hard suppression */
export function softNms(
  detections: Detection[],
  iouThreshold = 0.3,
  sigma = 0.5,
  scoreThreshold = 0.01,
  method: "linear" | "gaussian" = "gaussian"
): Detection[] {
  const dets = detections.map(d => ({ ...d, score: d.score }));
  const result: Detection[] = [];

  while (dets.length > 0) {
    let bestIdx = 0;
    for (let i = 1; i < dets.length; i++) {
      if (dets[i].score > dets[bestIdx].score) bestIdx = i;
    }
    const best = dets.splice(bestIdx, 1)[0];
    result.push(best);

    for (const det of dets) {
      const iou = boxIoU(best.box, det.box);
      if (method === "linear") {
        det.score *= iou > iouThreshold ? 1 - iou : 1;
      } else {
        det.score *= Math.exp(-(iou * iou) / sigma);
      }
    }
    // Remove low-score detections
    for (let i = dets.length - 1; i >= 0; i--) {
      if (dets[i].score < scoreThreshold) dets.splice(i, 1);
    }
  }
  return result;
}

/** Class-aware NMS: apply NMS per class independently */
export function classAwareNms(detections: Detection[], iouThreshold = 0.5, maxPerClass = 50): Detection[] {
  const byClass = new Map<number, Detection[]>();
  for (const d of detections) {
    if (!byClass.has(d.classId)) byClass.set(d.classId, []);
    byClass.get(d.classId)!.push(d);
  }
  const results: Detection[] = [];
  for (const [, classDets] of byClass) {
    results.push(...nms(classDets, iouThreshold, maxPerClass));
  }
  return results.sort((a, b) => b.score - a.score);
}

// ═══ PREPROCESS OPS ═══

/** Resize image with aspect ratio preservation (Faster R-CNN style) */
export function resizeAndCropImage(
  data: Uint8ClampedArray, srcW: number, srcH: number,
  targetW: number, targetH: number,
  padValue = 128
): { data: Uint8ClampedArray; scale: [number, number]; offset: [number, number] } {
  const scaleY = targetH / srcH;
  const scaleX = targetW / srcW;
  const scale = Math.min(scaleY, scaleX);
  const newW = Math.round(srcW * scale);
  const newH = Math.round(srcH * scale);
  const offsetX = Math.floor((targetW - newW) / 2);
  const offsetY = Math.floor((targetH - newH) / 2);

  const out = new Uint8ClampedArray(targetW * targetH * 4);
  out.fill(padValue);
  // Set alpha
  for (let i = 3; i < out.length; i += 4) out[i] = 255;

  // Bilinear resize
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const srcX = (x / scale);
      const srcY = (y / scale);
      const x0 = Math.floor(srcX), y0 = Math.floor(srcY);
      const fx = srcX - x0, fy = srcY - y0;
      const x1 = Math.min(x0 + 1, srcW - 1), y1 = Math.min(y0 + 1, srcH - 1);

      const dstIdx = ((y + offsetY) * targetW + (x + offsetX)) * 4;
      for (let c = 0; c < 3; c++) {
        const v00 = data[(y0 * srcW + x0) * 4 + c];
        const v10 = data[(y0 * srcW + x1) * 4 + c];
        const v01 = data[(y1 * srcW + x0) * 4 + c];
        const v11 = data[(y1 * srcW + x1) * 4 + c];
        out[dstIdx + c] = Math.round(v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy);
      }
      out[dstIdx + 3] = 255;
    }
  }

  return { data: out, scale: [scale, scale], offset: [offsetY, offsetX] };
}

/** Random crop with boxes filtering */
export function randomCrop(
  data: Uint8ClampedArray, w: number, h: number,
  boxes: BoxYXYX[], labels: number[],
  minOverlap = 0.5
): { data: Uint8ClampedArray; boxes: BoxYXYX[]; labels: number[]; cropW: number; cropH: number } {
  const cropW = Math.floor(w * (0.5 + Math.random() * 0.5));
  const cropH = Math.floor(h * (0.5 + Math.random() * 0.5));
  const x0 = Math.floor(Math.random() * (w - cropW));
  const y0 = Math.floor(Math.random() * (h - cropH));

  // Crop pixel data
  const cropped = new Uint8ClampedArray(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    const srcStart = ((y0 + y) * w + x0) * 4;
    const dstStart = y * cropW * 4;
    cropped.set(data.subarray(srcStart, srcStart + cropW * 4), dstStart);
  }

  // Filter and adjust boxes
  const newBoxes: BoxYXYX[] = [];
  const newLabels: number[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const [by1, bx1, by2, bx2] = boxes[i];
    const clippedBox: BoxYXYX = [
      Math.max(0, by1 - y0), Math.max(0, bx1 - x0),
      Math.min(cropH, by2 - y0), Math.min(cropW, bx2 - x0),
    ];
    const origArea = (by2 - by1) * (bx2 - bx1);
    const clippedArea = Math.max(0, clippedBox[2] - clippedBox[0]) * Math.max(0, clippedBox[3] - clippedBox[1]);
    if (origArea > 0 && clippedArea / origArea >= minOverlap) {
      newBoxes.push(clippedBox);
      newLabels.push(labels[i]);
    }
  }

  return { data: cropped, boxes: newBoxes, labels: newLabels, cropW, cropH };
}

/** Normalize image to [0,1] or [-1,1] */
export function normalizeImage(
  data: Uint8ClampedArray, w: number, h: number,
  mode: "zero_one" | "minus_one_one" | "imagenet" = "zero_one"
): Float32Array {
  const out = new Float32Array(w * h * 3);
  const imagenetMean = [0.485, 0.456, 0.406];
  const imagenetStd = [0.229, 0.224, 0.225];

  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;

    if (mode === "zero_one") {
      out[i * 3] = r; out[i * 3 + 1] = g; out[i * 3 + 2] = b;
    } else if (mode === "minus_one_one") {
      out[i * 3] = r * 2 - 1; out[i * 3 + 1] = g * 2 - 1; out[i * 3 + 2] = b * 2 - 1;
    } else {
      out[i * 3] = (r - imagenetMean[0]) / imagenetStd[0];
      out[i * 3 + 1] = (g - imagenetMean[1]) / imagenetStd[1];
      out[i * 3 + 2] = (b - imagenetMean[2]) / imagenetStd[2];
    }
  }
  return out;
}

// ═══ ANCHOR GENERATION (RetinaNet/FPN style) ═══

/** Generate multi-scale anchors for FPN-based detectors */
export function generateAnchors(
  imageSize: [number, number],
  config: AnchorConfig
): BoxYXYX[] {
  const [imgH, imgW] = imageSize;
  const anchors: BoxYXYX[] = [];

  for (let level = config.minLevel; level <= config.maxLevel; level++) {
    const stride = Math.pow(2, level);
    const gridH = Math.ceil(imgH / stride);
    const gridW = Math.ceil(imgW / stride);

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const cy = (y + 0.5) * stride;
        const cx = (x + 0.5) * stride;

        for (let s = 0; s < config.numScales; s++) {
          const scaleSize = config.anchorSize * stride * Math.pow(2, s / config.numScales);
          for (const ar of config.aspectRatios) {
            const anchorH = scaleSize / Math.sqrt(ar);
            const anchorW = scaleSize * Math.sqrt(ar);
            anchors.push([
              cy - anchorH / 2, cx - anchorW / 2,
              cy + anchorH / 2, cx + anchorW / 2,
            ]);
          }
        }
      }
    }
  }
  return anchors;
}

// ═══ SPATIAL TRANSFORMS ═══

/** Multilevel crop and resize for FPN ROI Align */
export function multilevelCropAndResize(
  features: Map<number, Float32Array>,  // level -> feature map
  boxes: BoxYXYX[],
  featureSizes: Map<number, [number, number]>,
  outputSize: [number, number],
  minLevel: number, maxLevel: number
): Float32Array[] {
  const results: Float32Array[] = [];
  const [outH, outW] = outputSize;

  for (const box of boxes) {
    const area = boxArea(box);
    const level = Math.min(maxLevel, Math.max(minLevel,
      Math.round(Math.log2(Math.sqrt(area) / 224) + 4)
    ));

    const feats = features.get(level);
    const size = featureSizes.get(level);
    if (!feats || !size) {
      results.push(new Float32Array(outH * outW));
      continue;
    }

    const [fH, fW] = size;
    const crop = new Float32Array(outH * outW);

    for (let y = 0; y < outH; y++) {
      for (let x = 0; x < outW; x++) {
        const srcY = box[0] + (box[2] - box[0]) * (y + 0.5) / outH;
        const srcX = box[1] + (box[3] - box[1]) * (x + 0.5) / outW;
        const fy = Math.min(fH - 1, Math.max(0, Math.round(srcY * fH)));
        const fx = Math.min(fW - 1, Math.max(0, Math.round(srcX * fW)));
        crop[y * outW + x] = feats[fy * fW + fx];
      }
    }
    results.push(crop);
  }
  return results;
}

// ═══ VIDEO PREPROCESS OPS ═══

/** Random temporal flip for video (flip all frames L-R with 50% probability) */
export function randomFlipLeftRightVideo(
  frames: Uint8ClampedArray[], w: number, h: number
): Uint8ClampedArray[] {
  if (Math.random() < 0.5) return frames;
  // Inline flip to avoid circular dependency
  return frames.map(frame => {
    const out = new Uint8ClampedArray(frame.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        const dstIdx = (y * w + (w - 1 - x)) * 4;
        out[dstIdx] = frame[srcIdx]; out[dstIdx + 1] = frame[srcIdx + 1];
        out[dstIdx + 2] = frame[srcIdx + 2]; out[dstIdx + 3] = frame[srcIdx + 3];
      }
    }
    return out;
  });
}

/** Decode and normalize video frame */
export function normalizeVideoFrame(
  data: Uint8ClampedArray, w: number, h: number
): Float32Array {
  return normalizeImage(data, w, h, "zero_one");
}

// ═══ RANDOM CONTRAST (torchvision-compatible) ═══

/** Random contrast jitter */
export function randomContrast(
  data: Uint8ClampedArray, w: number, h: number,
  lowerBound = 0.8, upperBound = 1.2
): Uint8ClampedArray {
  const factor = lowerBound + Math.random() * (upperBound - lowerBound);
  let meanLum = 0;
  for (let i = 0; i < w * h * 4; i += 4) {
    meanLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  meanLum /= (w * h);

  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < w * h * 4; i += 4) {
    out[i] = Math.min(255, Math.max(0, Math.round(meanLum + factor * (data[i] - meanLum))));
    out[i + 1] = Math.min(255, Math.max(0, Math.round(meanLum + factor * (data[i + 1] - meanLum))));
    out[i + 2] = Math.min(255, Math.max(0, Math.round(meanLum + factor * (data[i + 2] - meanLum))));
    out[i + 3] = data[i + 3];
  }
  return out;
}

export function getVisionOpsState() {
  return {
    boxOps: ["IoU", "GIoU (Rezatofighi 2019)", "Pairwise Overlap", "Clip/Scale/Resize", "Format Conversions (YXYX↔CYCXHW↔XYWH)"],
    nms: ["Standard NMS", "Soft-NMS (Bodla 2017)", "Class-Aware NMS"],
    preprocessOps: ["Resize+Crop (Faster R-CNN)", "Random Crop+Filter", "Normalize (ImageNet/ZeroOne)", "Random Contrast"],
    spatialOps: ["Multilevel Crop+Resize (ROI Align)", "Anchor Generation (FPN/RetinaNet)"],
    videoOps: ["Random Temporal Flip", "Video Frame Normalization"],
  };
}
