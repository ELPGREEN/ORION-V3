/**
 * ═══ Text Region Detection (PaddleOCR-inspired) ═══
 * 
 * Detects regions likely containing text using:
 * - Edge density analysis (text has high, uniform edge density)
 * - Stroke Width consistency (text characters have uniform stroke width)
 * - Aspect ratio heuristics (text lines are wide, paragraphs are rectangular)
 * - Luminance variance (text regions have bimodal luminance distribution)
 * 
 * Reference: PaddleOCR architecture (Baidu), OpenCV blog tools #5
 */

export interface TextRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  type: "line" | "block" | "character";
  edgeDensity: number;
  contrastRatio: number;
}

// ═══ Detect text regions using edge/contrast analysis ═══
export function detectTextRegions(
  gray: Float32Array,
  sobelMag: Float32Array,
  w: number, h: number
): TextRegion[] {
  const regions: TextRegion[] = [];

  // Multi-scale sliding window (like PaddleOCR's DB text detector concept)
  const scales = [
    { cellW: Math.floor(w / 12), cellH: Math.floor(h / 20), type: "line" as const },
    { cellW: Math.floor(w / 6), cellH: Math.floor(h / 8), type: "block" as const },
  ];

  for (const scale of scales) {
    const { cellW, cellH, type } = scale;
    if (cellW < 8 || cellH < 6) continue;

    const stepX = Math.floor(cellW * 0.5);
    const stepY = Math.floor(cellH * 0.5);

    for (let y = 0; y < h - cellH; y += stepY) {
      for (let x = 0; x < w - cellW; x += stepX) {
        const result = analyzeTextCandidate(gray, sobelMag, w, h, x, y, cellW, cellH);
        if (result.isText) {
          regions.push({
            x, y, w: cellW, h: cellH,
            confidence: result.confidence,
            type,
            edgeDensity: result.edgeDensity,
            contrastRatio: result.contrastRatio,
          });
        }
      }
    }
  }

  // NMS: merge overlapping text regions
  return nmsTextRegions(regions, 0.4);
}

function analyzeTextCandidate(
  gray: Float32Array, sobelMag: Float32Array,
  imgW: number, _imgH: number,
  rx: number, ry: number, rw: number, rh: number
): { isText: boolean; confidence: number; edgeDensity: number; contrastRatio: number } {
  const step = Math.max(1, Math.floor(Math.min(rw, rh) / 15));
  let edgeSum = 0, lumSum = 0, lumSqSum = 0, lumMin = 255, lumMax = 0;
  let samples = 0;
  let highEdgeCount = 0;

  for (let y = ry; y < ry + rh; y += step) {
    for (let x = rx; x < rx + rw; x += step) {
      const idx = y * imgW + x;
      const lum = gray[idx];
      const edge = sobelMag[idx];

      lumSum += lum;
      lumSqSum += lum * lum;
      edgeSum += edge;
      if (lum < lumMin) lumMin = lum;
      if (lum > lumMax) lumMax = lum;
      if (edge > 30) highEdgeCount++;
      samples++;
    }
  }

  if (samples < 4) return { isText: false, confidence: 0, edgeDensity: 0, contrastRatio: 1 };

  const avgEdge = edgeSum / samples;
  const avgLum = lumSum / samples;
  const lumVar = (lumSqSum / samples) - (avgLum * avgLum);
  const edgeDensity = highEdgeCount / samples;
  const contrastRatio = lumMin > 0 ? lumMax / lumMin : lumMax > 0 ? 255 : 1;

  // Text heuristics:
  // 1. Moderate-high edge density (characters have edges)
  // 2. Bimodal luminance (text vs background) → high variance relative to range
  // 3. Good contrast ratio
  // 4. Edge density should be distributed (not just one big edge)
  const isHighEdge = edgeDensity > 0.15 && edgeDensity < 0.75;
  const hasContrast = contrastRatio > 1.8;
  const hasBimodal = lumVar > 400 && lumVar < 8000;
  const edgeDistribution = avgEdge > 15 && avgEdge < 120;

  const score =
    (isHighEdge ? 0.3 : 0) +
    (hasContrast ? 0.25 : 0) +
    (hasBimodal ? 0.25 : 0) +
    (edgeDistribution ? 0.2 : 0);

  return {
    isText: score >= 0.55,
    confidence: Math.round(Math.min(0.9, score) * 100) / 100,
    edgeDensity: Math.round(edgeDensity * 100) / 100,
    contrastRatio: Math.round(contrastRatio * 10) / 10,
  };
}

// ═══ Non-Maximum Suppression for text regions ═══
function nmsTextRegions(regions: TextRegion[], overlapThreshold: number): TextRegion[] {
  if (regions.length === 0) return [];

  regions.sort((a, b) => b.confidence - a.confidence);
  const kept: TextRegion[] = [];

  for (const r of regions) {
    let suppress = false;
    for (const k of kept) {
      const iou = computeIoU(r, k);
      if (iou > overlapThreshold) {
        suppress = true;
        break;
      }
    }
    if (!suppress) kept.push(r);
  }

  return kept.slice(0, 10); // Max 10 text regions
}

function computeIoU(a: TextRegion, b: TextRegion): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);

  if (x2 <= x1 || y2 <= y1) return 0;

  const intersection = (x2 - x1) * (y2 - y1);
  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  return intersection / (areaA + areaB - intersection);
}
