/**
 * ─── SAM: Segment Anything Model ───
 * Image Encoder → Prompt Encoder → Mask Decoder → Segmentation Output
 * Adapted for document and scene segmentation in the neural vision pipeline.
 */

// ─── Types ───

export type PromptType = "point" | "box" | "text" | "auto";

export type SegmentLabel =
  | "header" | "body" | "footer" | "signature" | "stamp"
  | "table" | "image" | "caption" | "page_number"
  | "person" | "object" | "background" | "text_block"
  | "unknown";

export interface Point2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SegmentMask {
  id: string;
  label: SegmentLabel;
  confidence: number;
  bbox: BoundingBox;
  area: number;            // Relative area (0-1)
  centroid: Point2D;
  embedding: number[];     // Compact mask embedding
  contourPoints: Point2D[];
  iouPrediction: number;   // Intersection over Union quality score
}

export interface ImageEmbedding {
  features: number[];
  width: number;
  height: number;
  channels: number;
  patchSize: number;
  numPatches: number;
}

export interface PromptEmbedding {
  type: PromptType;
  embedding: number[];
  sparse: number[];    // Sparse prompt encoding (points/boxes)
  dense: number[];     // Dense prompt encoding (masks)
}

export interface SegmentationResult {
  masks: SegmentMask[];
  imageEmbedding: ImageEmbedding;
  totalSegments: number;
  coveragePercent: number;
  processingMs: number;
}

export interface SAMConfig {
  maxMasks: number;
  confidenceThreshold: number;
  nmsThreshold: number;       // Non-maximum suppression overlap threshold
  patchSize: number;
  embeddingDim: number;
  multiscale: boolean;
}

export const DEFAULT_SAM_CONFIG: SAMConfig = {
  maxMasks: 32,
  confidenceThreshold: 0.5,
  nmsThreshold: 0.7,
  patchSize: 16,
  embeddingDim: 64,
  multiscale: true,
};

// ─── Image Encoder ───

/**
 * Encode image features into a dense embedding using patch-based extraction.
 * Simulates ViT-based image encoding used in SAM.
 */
export function encodeImage(
  frameFeatures: number[],
  width: number = 640,
  height: number = 480,
  config: SAMConfig = DEFAULT_SAM_CONFIG
): ImageEmbedding {
  const { patchSize, embeddingDim } = config;
  const numPatchesX = Math.floor(width / patchSize);
  const numPatchesY = Math.floor(height / patchSize);
  const numPatches = numPatchesX * numPatchesY;

  // Generate patch embeddings via strided convolution simulation
  const features: number[] = [];
  for (let p = 0; p < Math.min(numPatches, embeddingDim * 4); p++) {
    const patchIdx = p % frameFeatures.length;
    const baseVal = frameFeatures[patchIdx] || 0;

    // Positional encoding for each patch
    const px = (p % numPatchesX) / numPatchesX;
    const py = Math.floor(p / numPatchesX) / numPatchesY;

    for (let d = 0; d < embeddingDim; d++) {
      const freq = (d + 1) * Math.PI;
      const posEnc = Math.sin(px * freq) * Math.cos(py * freq);
      const featureVal = baseVal * Math.cos(d * 0.1) + posEnc * 0.3;
      features.push(Math.tanh(featureVal));
    }
  }

  // Pad/truncate to fixed size
  while (features.length < embeddingDim * numPatches) features.push(0);
  features.length = embeddingDim * Math.min(numPatches, 256);

  return {
    features,
    width,
    height,
    channels: 3,
    patchSize,
    numPatches: Math.min(numPatches, 256),
  };
}

// ─── Prompt Encoder ───

/**
 * Encode a segmentation prompt (point, box, or text) into embeddings.
 */
export function encodePrompt(
  promptType: PromptType,
  coordinates?: { points?: Point2D[]; boxes?: BoundingBox[]; text?: string },
  config: SAMConfig = DEFAULT_SAM_CONFIG
): PromptEmbedding {
  const { embeddingDim } = config;
  const sparse: number[] = [];
  const dense: number[] = new Array(embeddingDim).fill(0);

  switch (promptType) {
    case "point": {
      const points = coordinates?.points || [{ x: 0.5, y: 0.5 }];
      for (const pt of points) {
        for (let d = 0; d < embeddingDim; d++) {
          sparse.push(Math.sin(pt.x * (d + 1) * Math.PI) + Math.cos(pt.y * (d + 1) * Math.PI));
        }
      }
      break;
    }
    case "box": {
      const boxes = coordinates?.boxes || [{ x: 0.1, y: 0.1, width: 0.8, height: 0.8 }];
      for (const box of boxes) {
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        for (let d = 0; d < embeddingDim; d++) {
          sparse.push(
            Math.sin(cx * (d + 1)) * box.width +
            Math.cos(cy * (d + 1)) * box.height
          );
        }
      }
      break;
    }
    case "text": {
      const text = coordinates?.text || "";
      for (let d = 0; d < embeddingDim; d++) {
        const charCode = text.charCodeAt(d % text.length) || 32;
        sparse.push(Math.sin(charCode * 0.01 * (d + 1)));
      }
      break;
    }
    case "auto": {
      // Auto mode: uniform grid prompts
      for (let d = 0; d < embeddingDim; d++) {
        sparse.push(Math.sin(d * 0.5) * 0.5);
      }
      break;
    }
  }

  // Dense prompt = learned mask embedding (simulated)
  for (let d = 0; d < embeddingDim; d++) {
    dense[d] = sparse[d % sparse.length] * 0.1 || 0;
  }

  // Combined embedding
  const embedding = sparse.slice(0, embeddingDim).map((s, i) => s + dense[i]);

  return { type: promptType, embedding, sparse, dense };
}

// ─── Mask Decoder ───

/**
 * Decode masks from image and prompt embeddings.
 * Uses cross-attention between prompt tokens and image features.
 */
export function generateMasks(
  imageEmb: ImageEmbedding,
  promptEmb: PromptEmbedding,
  config: SAMConfig = DEFAULT_SAM_CONFIG
): SegmentMask[] {
  const { maxMasks, confidenceThreshold, nmsThreshold, embeddingDim } = config;
  const masks: SegmentMask[] = [];

  // Cross-attention: prompt queries attend to image keys
  const numCandidates = Math.min(maxMasks * 2, 64);

  for (let c = 0; c < numCandidates; c++) {
    // Compute attention score between prompt and image patch
    let score = 0;
    for (let d = 0; d < Math.min(embeddingDim, promptEmb.embedding.length); d++) {
      const imgIdx = (c * embeddingDim + d) % imageEmb.features.length;
      score += promptEmb.embedding[d] * (imageEmb.features[imgIdx] || 0);
    }
    score = 1 / (1 + Math.exp(-score / embeddingDim)); // sigmoid

    if (score < confidenceThreshold) continue;

    // Generate bounding box from attention distribution
    const gridX = (c % 8) / 8;
    const gridY = Math.floor(c / 8) / 8;
    const bboxW = 0.1 + Math.random() * 0.3;
    const bboxH = 0.1 + Math.random() * 0.3;

    const bbox: BoundingBox = {
      x: Math.max(0, gridX - bboxW / 2),
      y: Math.max(0, gridY - bboxH / 2),
      width: Math.min(bboxW, 1 - gridX),
      height: Math.min(bboxH, 1 - gridY),
    };

    // Label prediction from embedding similarity
    const label = predictLabel(promptEmb, c, score);

    // IoU prediction head
    const iouPrediction = score * 0.8 + 0.15;

    // Generate contour points (simplified polygon)
    const contourPoints = generateContour(bbox, 8);

    // Compact mask embedding
    const maskEmb: number[] = [];
    for (let d = 0; d < 16; d++) {
      maskEmb.push(Math.tanh(score * promptEmb.embedding[d % promptEmb.embedding.length]));
    }

    masks.push({
      id: `mask_${c}_${Date.now()}`,
      label,
      confidence: score,
      bbox,
      area: bbox.width * bbox.height,
      centroid: { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 },
      embedding: maskEmb,
      contourPoints,
      iouPrediction,
    });
  }

  // Non-maximum suppression
  return nonMaxSuppression(masks, nmsThreshold).slice(0, maxMasks);
}

// ─── High-Level Segmentation Functions ───

/**
 * Segment a document image into structural regions (header, body, tables, signatures...)
 */
export function segmentDocument(
  frameFeatures: number[],
  width: number = 640,
  height: number = 480,
  config: SAMConfig = DEFAULT_SAM_CONFIG
): SegmentationResult {
  const t0 = performance.now();

  const imageEmb = encodeImage(frameFeatures, width, height, config);

  // Multiple prompts for document regions
  const documentPrompts: Array<{ type: PromptType; coords: any }> = [
    { type: "box", coords: { boxes: [{ x: 0.05, y: 0.02, width: 0.9, height: 0.12 }] } },  // header
    { type: "box", coords: { boxes: [{ x: 0.05, y: 0.15, width: 0.9, height: 0.6 }] } },   // body
    { type: "box", coords: { boxes: [{ x: 0.05, y: 0.8, width: 0.9, height: 0.15 }] } },   // footer
    { type: "box", coords: { boxes: [{ x: 0.5, y: 0.85, width: 0.4, height: 0.1 }] } },    // signature
    { type: "text", coords: { text: "table" } },
  ];

  const allMasks: SegmentMask[] = [];
  const docLabels: SegmentLabel[] = ["header", "body", "footer", "signature", "table"];

  for (let i = 0; i < documentPrompts.length; i++) {
    const p = documentPrompts[i];
    const promptEmb = encodePrompt(p.type, p.coords, config);
    const masks = generateMasks(imageEmb, promptEmb, { ...config, maxMasks: 4 });

    // Override labels for document context
    for (const mask of masks) {
      mask.label = docLabels[i] || mask.label;
    }
    if (masks.length > 0) allMasks.push(masks[0]); // best per region
  }

  const totalArea = allMasks.reduce((sum, m) => sum + m.area, 0);

  return {
    masks: allMasks,
    imageEmbedding: imageEmb,
    totalSegments: allMasks.length,
    coveragePercent: Math.min(100, totalArea * 100),
    processingMs: performance.now() - t0,
  };
}

/**
 * Segment a scene for real-time vision (objects, people, background)
 */
export function segmentScene(
  frameFeatures: number[],
  width: number = 640,
  height: number = 480,
  config: SAMConfig = DEFAULT_SAM_CONFIG
): SegmentationResult {
  const t0 = performance.now();

  const imageEmb = encodeImage(frameFeatures, width, height, config);

  // Auto-segment with grid prompts
  const promptEmb = encodePrompt("auto", undefined, config);
  const masks = generateMasks(imageEmb, promptEmb, config);

  // Re-label for scene context
  for (const mask of masks) {
    if (mask.area > 0.3) mask.label = "background";
    else if (mask.centroid.y < 0.3 && mask.area < 0.15) mask.label = "object";
    else if (mask.confidence > 0.8) mask.label = "person";
    else mask.label = "object";
  }

  const totalArea = masks.reduce((sum, m) => sum + m.area, 0);

  return {
    masks,
    imageEmbedding: imageEmb,
    totalSegments: masks.length,
    coveragePercent: Math.min(100, totalArea * 100),
    processingMs: performance.now() - t0,
  };
}

// ─── Helper Functions ───

function predictLabel(promptEmb: PromptEmbedding, candidateIdx: number, score: number): SegmentLabel {
  const labels: SegmentLabel[] = ["text_block", "person", "object", "table", "image", "background"];
  // Simple hash-based selection weighted by embedding
  const hash = Math.abs(promptEmb.embedding[candidateIdx % promptEmb.embedding.length] || 0);
  const idx = Math.floor(hash * labels.length * score) % labels.length;
  return labels[idx];
}

function generateContour(bbox: BoundingBox, numPoints: number): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const rx = bbox.width / 2;
    const ry = bbox.height / 2;
    points.push({
      x: bbox.x + rx + Math.cos(angle) * rx * (0.8 + Math.random() * 0.2),
      y: bbox.y + ry + Math.sin(angle) * ry * (0.8 + Math.random() * 0.2),
    });
  }
  return points;
}

function nonMaxSuppression(masks: SegmentMask[], threshold: number): SegmentMask[] {
  const sorted = [...masks].sort((a, b) => b.confidence - a.confidence);
  const kept: SegmentMask[] = [];

  for (const mask of sorted) {
    let dominated = false;
    for (const existing of kept) {
      const iou = computeIoU(mask.bbox, existing.bbox);
      if (iou > threshold) {
        dominated = true;
        break;
      }
    }
    if (!dominated) kept.push(mask);
  }

  return kept;
}

function computeIoU(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  if (x2 <= x1 || y2 <= y1) return 0;

  const intersection = (x2 - x1) * (y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;
}
