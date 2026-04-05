/**
 * ─── tfm.vision — Classification, Detection, and Segmentation Models ───
 * 
 * Browser-adapted model architectures from TensorFlow Model Garden:
 * - Image Classification (ResNet/ViT-style feature extraction + classifier)
 * - Object Detection (RetinaNet/Faster R-CNN pipeline)
 * - Semantic Segmentation (DeepLabV3+ decoder)
 * - Instance Segmentation (Mask R-CNN head)
 * 
 * Ref: tfm.vision.classification_model, tfm.vision.retinanet_model,
 *      tfm.vision.maskrcnn_model, tfm.vision.segmentation_model
 *      (TensorFlow Model Garden, Apache 2.0)
 */

import type { BoxYXYX, Detection, AnchorConfig } from "./tfm-vision-ops";
import { boxIoU as computeBoxIoU } from "./tfm-vision-ops";

// ═══ BACKBONE TYPES ═══

export interface BackboneConfig {
  type: "resnet" | "efficientnet" | "mobilenet" | "vit";
  variant: string;  // e.g. "50", "b0", "v2", "base"
  inputSize: [number, number, number]; // [H, W, C]
  outputLevels: number[]; // FPN levels [3,4,5,6,7]
}

export interface FeaturePyramid {
  levels: Map<number, { features: Float32Array; height: number; width: number; channels: number }>;
}

export interface VisionTransformerConfig {
  patchSize: number;
  numLayers: number;
  hiddenDim: number;
  numHeads: number;
  mlpDim: number;
  dropout: number;
  attentionDropout: number;
}

// ═══ CLASSIFICATION MODEL ═══

export interface ClassificationConfig {
  backbone: BackboneConfig;
  numClasses: number;
  dropout: number;
  pooling: "avg" | "max" | "gem"; // GeM = Generalized Mean Pooling
  labelSmoothing: number;
}

export interface ClassificationResult {
  classId: number;
  confidence: number;
  topK: { classId: number; score: number }[];
  features: Float32Array; // backbone features
}

/** Build a classification model config (factory pattern from tfm.vision) */
export function buildClassificationModel(params: Partial<ClassificationConfig> = {}): ClassificationConfig {
  return {
    backbone: params.backbone ?? {
      type: "resnet",
      variant: "50",
      inputSize: [224, 224, 3],
      outputLevels: [5],
    },
    numClasses: params.numClasses ?? 1000,
    dropout: params.dropout ?? 0.2,
    pooling: params.pooling ?? "avg",
    labelSmoothing: params.labelSmoothing ?? 0.1,
  };
}

/** Simulate classification inference with feature extraction */
export function classifyImage(
  features: Float32Array,
  weights: Float32Array,
  biases: Float32Array,
  numClasses: number,
  topK = 5
): ClassificationResult {
  const featDim = features.length;
  const logits = new Float32Array(numClasses);

  for (let c = 0; c < numClasses; c++) {
    let sum = biases[c] ?? 0;
    for (let f = 0; f < featDim; f++) {
      sum += features[f] * (weights[c * featDim + f] ?? 0);
    }
    logits[c] = sum;
  }

  // Softmax
  const maxLogit = Math.max(...logits);
  const exps = logits.map(l => Math.exp(l - maxLogit));
  const sumExp = exps.reduce((s, e) => s + e, 0);
  const probs = exps.map(e => e / sumExp);

  // Top-K
  const indexed = Array.from(probs).map((score, classId) => ({ classId, score }));
  indexed.sort((a, b) => b.score - a.score);
  const topKResults = indexed.slice(0, topK);

  return {
    classId: topKResults[0].classId,
    confidence: topKResults[0].score,
    topK: topKResults,
    features,
  };
}

/** Label smoothing for classification loss — Szegedy et al. (2016) */
export function labelSmoothing(labels: number[], numClasses: number, alpha = 0.1): number[][] {
  return labels.map(label => {
    const smooth = new Array(numClasses).fill(alpha / numClasses);
    smooth[label] += 1 - alpha;
    return smooth;
  });
}

/** Generalized Mean Pooling (GeM) — Radenović et al. (2019) */
export function gemPooling(features: Float32Array, p = 3): number {
  let sum = 0;
  for (const f of features) sum += Math.pow(Math.max(f, 1e-6), p);
  return Math.pow(sum / features.length, 1 / p);
}

// ═══ OBJECT DETECTION MODEL (RetinaNet-style) ═══

export interface RetinaNetConfig {
  backbone: BackboneConfig;
  numClasses: number;
  anchorConfig: AnchorConfig;
  fpnChannels: number;
  numConvs: number; // classification/regression heads
  scoreThreshold: number;
  nmsIouThreshold: number;
  maxDetections: number;
}

export interface RetinaNetLosses {
  classificationLoss: number;
  boxRegressionLoss: number;
  totalLoss: number;
}

/** Build RetinaNet config — Lin et al. (2017) */
export function buildRetinaNet(params: Partial<RetinaNetConfig> = {}): RetinaNetConfig {
  return {
    backbone: params.backbone ?? {
      type: "resnet",
      variant: "50",
      inputSize: [640, 640, 3],
      outputLevels: [3, 4, 5, 6, 7],
    },
    numClasses: params.numClasses ?? 80,
    anchorConfig: params.anchorConfig ?? {
      minLevel: 3, maxLevel: 7, numScales: 3,
      aspectRatios: [0.5, 1.0, 2.0], anchorSize: 4,
    },
    fpnChannels: params.fpnChannels ?? 256,
    numConvs: params.numConvs ?? 4,
    scoreThreshold: params.scoreThreshold ?? 0.05,
    nmsIouThreshold: params.nmsIouThreshold ?? 0.5,
    maxDetections: params.maxDetections ?? 100,
  };
}

/** Focal Loss for RetinaNet — Lin et al. (2017) */
export function focalLoss(predictions: number[], targets: number[], alpha = 0.25, gamma = 2): number {
  let loss = 0;
  for (let i = 0; i < predictions.length; i++) {
    const p = Math.max(Math.min(predictions[i], 1 - 1e-7), 1e-7);
    const pt = targets[i] === 1 ? p : 1 - p;
    const at = targets[i] === 1 ? alpha : 1 - alpha;
    loss -= at * Math.pow(1 - pt, gamma) * Math.log(pt);
  }
  return loss / (predictions.length || 1);
}

/** Smooth L1 Loss (Huber) for box regression */
export function smoothL1Loss(predicted: number[], target: number[], delta = 1.0): number {
  let loss = 0;
  for (let i = 0; i < predicted.length; i++) {
    const diff = Math.abs(predicted[i] - target[i]);
    loss += diff < delta ? 0.5 * diff * diff / delta : diff - 0.5 * delta;
  }
  return loss / (predicted.length || 1);
}

/** Decode box predictions from anchors (delta regression) */
export function decodeBoxPredictions(
  anchors: BoxYXYX[],
  deltas: number[][], // [num_anchors][4]
  scaleFactors = [10, 10, 5, 5]
): BoxYXYX[] {
  return anchors.map((anchor, i) => {
    const [ay1, ax1, ay2, ax2] = anchor;
    const anchorH = ay2 - ay1, anchorW = ax2 - ax1;
    const anchorCY = (ay1 + ay2) / 2, anchorCX = (ax1 + ax2) / 2;

    const [dy, dx, dh, dw] = deltas[i] ?? [0, 0, 0, 0];
    const predCY = anchorCY + dy * anchorH / scaleFactors[0];
    const predCX = anchorCX + dx * anchorW / scaleFactors[1];
    const predH = anchorH * Math.exp(dh / scaleFactors[2]);
    const predW = anchorW * Math.exp(dw / scaleFactors[3]);

    return [
      predCY - predH / 2, predCX - predW / 2,
      predCY + predH / 2, predCX + predW / 2,
    ] as BoxYXYX;
  });
}

// ═══ SEMANTIC SEGMENTATION (DeepLabV3+) ═══

export interface SegmentationConfig {
  backbone: BackboneConfig;
  numClasses: number;
  outputStride: 8 | 16;
  atrousRates: number[]; // ASPP dilation rates
  decoderChannels: number;
}

export interface SegmentationResult {
  mask: Uint8Array;       // class per pixel
  confidence: Float32Array; // max probability per pixel
  width: number;
  height: number;
  numClasses: number;
}

/** Build DeepLabV3+ config — Chen et al. (2018) */
export function buildDeepLabV3Plus(params: Partial<SegmentationConfig> = {}): SegmentationConfig {
  return {
    backbone: params.backbone ?? {
      type: "resnet", variant: "50",
      inputSize: [512, 512, 3], outputLevels: [2, 5],
    },
    numClasses: params.numClasses ?? 21,
    outputStride: params.outputStride ?? 16,
    atrousRates: params.atrousRates ?? [6, 12, 18],
    decoderChannels: params.decoderChannels ?? 256,
  };
}

/** ASPP (Atrous Spatial Pyramid Pooling) — Chen et al. (2017) */
export function atrousSpatialPyramidPooling(
  features: Float32Array, w: number, h: number, channels: number,
  rates: number[]
): Float32Array[] {
  const results: Float32Array[] = [];

  // 1x1 conv (identity approximation)
  results.push(new Float32Array(features));

  // Atrous convolutions at different rates (simplified: sample at rate intervals)
  for (const rate of rates) {
    const out = new Float32Array(w * h * channels);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * channels;
        let count = 0;
        for (let dy = -rate; dy <= rate; dy += rate) {
          for (let dx = -rate; dx <= rate; dx += rate) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              const srcIdx = (ny * w + nx) * channels;
              for (let c = 0; c < channels; c++) out[idx + c] += features[srcIdx + c];
              count++;
            }
          }
        }
        if (count > 0) {
          for (let c = 0; c < channels; c++) out[idx + c] /= count;
        }
      }
    }
    results.push(out);
  }

  // Global average pooling branch
  const gap = new Float32Array(channels);
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < channels; c++) gap[c] += features[i * channels + c];
  }
  for (let c = 0; c < channels; c++) gap[c] /= (w * h);
  const gapExpanded = new Float32Array(w * h * channels);
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < channels; c++) gapExpanded[i * channels + c] = gap[c];
  }
  results.push(gapExpanded);

  return results;
}

/** Dice Loss for segmentation — Milletari et al. (2016) */
export function diceLoss(predicted: Float32Array, target: Uint8Array, numClasses: number): number {
  let totalDice = 0;
  for (let c = 0; c < numClasses; c++) {
    let intersection = 0, predSum = 0, targetSum = 0;
    for (let i = 0; i < target.length; i++) {
      const predVal = predicted[i * numClasses + c] ?? 0;
      const targetVal = target[i] === c ? 1 : 0;
      intersection += predVal * targetVal;
      predSum += predVal;
      targetSum += targetVal;
    }
    const dice = (2 * intersection + 1) / (predSum + targetSum + 1);
    totalDice += dice;
  }
  return 1 - totalDice / numClasses;
}

/** Mean IoU metric for segmentation evaluation */
export function meanIoU(predicted: Uint8Array, target: Uint8Array, numClasses: number): number {
  let totalIoU = 0, validClasses = 0;
  for (let c = 0; c < numClasses; c++) {
    let intersection = 0, union = 0;
    for (let i = 0; i < target.length; i++) {
      const predC = predicted[i] === c;
      const targetC = target[i] === c;
      if (predC && targetC) intersection++;
      if (predC || targetC) union++;
    }
    if (union > 0) {
      totalIoU += intersection / union;
      validClasses++;
    }
  }
  return validClasses > 0 ? totalIoU / validClasses : 0;
}

// ═══ INSTANCE SEGMENTATION (Mask R-CNN head) ═══

export interface MaskRCNNConfig extends RetinaNetConfig {
  maskHeadChannels: number;
  maskOutputSize: number; // typically 28x28
  maskThreshold: number;
}

export interface InstanceSegmentation {
  detection: Detection;
  mask: Uint8Array; // binary mask for instance
  maskSize: number;
}

/** Build MaskRCNN config — He et al. (2017) */
export function buildMaskRCNN(params: Partial<MaskRCNNConfig> = {}): MaskRCNNConfig {
  const retinaConfig = buildRetinaNet(params);
  return {
    ...retinaConfig,
    maskHeadChannels: params.maskHeadChannels ?? 256,
    maskOutputSize: params.maskOutputSize ?? 28,
    maskThreshold: params.maskThreshold ?? 0.5,
  };
}

/** Binary cross-entropy for mask prediction */
export function maskBCELoss(predicted: Float32Array, target: Uint8Array): number {
  let loss = 0;
  for (let i = 0; i < target.length; i++) {
    const p = Math.max(1e-7, Math.min(1 - 1e-7, predicted[i]));
    loss -= target[i] * Math.log(p) + (1 - target[i]) * Math.log(1 - p);
  }
  return loss / (target.length || 1);
}

// ═══ VIDEO CLASSIFICATION ═══

export interface VideoClassificationConfig {
  backbone: BackboneConfig;
  temporalSize: number;  // number of frames
  numClasses: number;
  temporalPooling: "avg" | "max" | "attention";
}

export function buildVideoClassification(params: Partial<VideoClassificationConfig> = {}): VideoClassificationConfig {
  return {
    backbone: params.backbone ?? {
      type: "resnet", variant: "50",
      inputSize: [224, 224, 3], outputLevels: [5],
    },
    temporalSize: params.temporalSize ?? 8,
    numClasses: params.numClasses ?? 400,
    temporalPooling: params.temporalPooling ?? "avg",
  };
}

// ═══ EVALUATION METRICS ═══

/** COCO-style mAP calculation */
export function computeAP(
  detections: Detection[],
  groundTruths: { box: BoxYXYX; classId: number }[],
  iouThreshold = 0.5
): number {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const matched = new Set<number>();
  let tp = 0, fp = 0;
  const precisions: number[] = [];
  const recalls: number[] = [];
  const totalPositives = groundTruths.length;

  for (const det of sorted) {
    let bestIoU = 0, bestGtIdx = -1;
    for (let g = 0; g < groundTruths.length; g++) {
      if (matched.has(g) || groundTruths[g].classId !== det.classId) continue;
      const iou = computeBoxIoU(det.box, groundTruths[g].box);
      if (iou > bestIoU) { bestIoU = iou; bestGtIdx = g; }
    }

    if (bestIoU >= iouThreshold && bestGtIdx >= 0) {
      tp++;
      matched.add(bestGtIdx);
    } else {
      fp++;
    }

    precisions.push(tp / (tp + fp));
    recalls.push(totalPositives > 0 ? tp / totalPositives : 0);
  }

  // 11-point interpolation
  let ap = 0;
  for (let t = 0; t <= 1; t += 0.1) {
    let maxPrec = 0;
    for (let i = 0; i < recalls.length; i++) {
      if (recalls[i] >= t && precisions[i] > maxPrec) maxPrec = precisions[i];
    }
    ap += maxPrec;
  }
  return ap / 11;
}

export function getVisionModelsState() {
  return {
    classification: ["ResNet", "EfficientNet", "MobileNet", "ViT", "GeM Pooling", "Label Smoothing"],
    detection: ["RetinaNet (Lin 2017)", "Faster R-CNN", "Focal Loss", "Smooth L1", "Anchor Generation", "Box Decoding"],
    segmentation: ["DeepLabV3+ (Chen 2018)", "ASPP", "Dice Loss", "Mean IoU"],
    instanceSeg: ["Mask R-CNN (He 2017)", "Mask BCE Loss"],
    video: ["Video Classification", "Temporal Pooling (avg/max/attention)"],
    evaluation: ["COCO mAP", "11-point AP Interpolation"],
  };
}
