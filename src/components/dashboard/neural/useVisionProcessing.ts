import { OrbState } from "./EnergyOrb";
import { VoiceState } from "@/hooks/useNeuralVoice";
// ═══ Inline stubs for removed vision modules ═══
// NOTE (Fase 3 audit): YOLOClassification, TextRegion, KMeansResult, ImageQuality were
// removed from the pipeline — their generators were always-empty stubs and no consumer
// ever read the values back from VS.*. Only SceneContext is still produced.
type SceneContext = { label: string; confidence: number; lighting: string };

function gaussianBlur3x3(data: Float32Array, w: number, h: number): Float32Array {
  // Simple box blur approximation
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          sum += data[(y + dy) * w + (x + dx)];
      out[y * w + x] = sum / 9;
    }
  }
  return out;
}

function sobelWithDirection(gray: Float32Array, w: number, h: number) {
  const magnitude = new Float32Array(w * h);
  const direction = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx = -gray[(y-1)*w+(x-1)] + gray[(y-1)*w+(x+1)] - 2*gray[y*w+(x-1)] + 2*gray[y*w+(x+1)] - gray[(y+1)*w+(x-1)] + gray[(y+1)*w+(x+1)];
      const gy = -gray[(y-1)*w+(x-1)] - 2*gray[(y-1)*w+x] - gray[(y-1)*w+(x+1)] + gray[(y+1)*w+(x-1)] + 2*gray[(y+1)*w+x] + gray[(y+1)*w+(x+1)];
      magnitude[y * w + x] = Math.sqrt(gx * gx + gy * gy);
      direction[y * w + x] = Math.atan2(gy, gx);
    }
  }
  return { magnitude, direction };
}

function nonMaxSuppression(mag: Float32Array, dir: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const angle = ((dir[idx] * 180 / Math.PI) + 180) % 180;
      let n1 = 0, n2 = 0;
      if (angle < 22.5 || angle >= 157.5) { n1 = mag[idx - 1]; n2 = mag[idx + 1]; }
      else if (angle < 67.5) { n1 = mag[(y-1)*w+(x+1)]; n2 = mag[(y+1)*w+(x-1)]; }
      else if (angle < 112.5) { n1 = mag[(y-1)*w+x]; n2 = mag[(y+1)*w+x]; }
      else { n1 = mag[(y-1)*w+(x-1)]; n2 = mag[(y+1)*w+(x+1)]; }
      out[idx] = (mag[idx] >= n1 && mag[idx] >= n2) ? mag[idx] : 0;
    }
  }
  return out;
}

function morphClose3x3(binary: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let max = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (binary[(y + dy) * w + (x + dx)]) max = 1;
      out[y * w + x] = max;
    }
  }
  return out;
}

function dominantOrientation(_mag: Float32Array, dir: Float32Array, w: number, _h: number, rx: number, ry: number, rw: number, rh: number) {
  let sumSin = 0, sumCos = 0;
  for (let y = ry; y < ry + rh; y++)
    for (let x = rx; x < rx + rw; x++) {
      const a = dir[y * w + x];
      sumSin += Math.sin(2 * a);
      sumCos += Math.cos(2 * a);
    }
  const angle = Math.round(((Math.atan2(sumSin, sumCos) / 2) * 180 / Math.PI + 360) % 180);
  const strength = Math.min(1, Math.sqrt(sumSin * sumSin + sumCos * sumCos) / (rw * rh) * 4);
  const orientationClass = angle < 30 || angle > 150 ? "horizontal" : angle > 60 && angle < 120 ? "vertical" : "diagonal";
  return { angle, strength: Math.round(strength * 100) / 100, orientationClass };
}

function classifyScene(px: Uint8ClampedArray, w: number, h: number, _sobel: Float32Array): SceneContext {
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  for (let i = 0; i < px.length; i += 16) { rSum += px[i]; gSum += px[i+1]; bSum += px[i+2]; count++; }
  const avg = (rSum + gSum + bSum) / count / 3;
  return { label: avg > 170 ? "bright" : avg < 60 ? "dark" : "normal", confidence: 0.7, lighting: avg > 170 ? "high" : avg < 60 ? "low" : "medium" };
}

function otsuThreshold(gray: Float32Array, _w: number, _h: number) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[Math.min(255, Math.max(0, Math.round(gray[i])))]++;
  let total = gray.length, sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (wB === 0) continue;
    const wF = total - wB; if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) { maxVar = v; threshold = t; }
  }
  return { threshold };
}

function classifyWithPriors(_inputs: any[]): YOLOClassification[] { return []; }
function detectTextRegions(_gray: Float32Array, _sobel: Float32Array, _w: number, _h: number): TextRegion[] { return []; }
function kMeansColorSegmentation(_px: Uint8ClampedArray, _w: number, _h: number, _k: number, _iter: number): KMeansResult { return { clusters: [], k: 0 }; }
function assessImageQuality(_gray: Float32Array, _w: number, _h: number): ImageQuality { return { sharpness: 0, exposure: 0, overall: 0 }; }

// ═══ Types ═══
export interface Region {
  label: string; category: string; confidence: number;
  cx: number; cy: number; w: number; h: number;
  avgR: number; avgG: number; avgB: number; edgeDensity: number;
}
export interface MotionData {
  intensity: number; direction: string;
  zones: boolean[]; vectors: { x: number; y: number; magnitude: number }[];
}

// ═══ Global shared store ═══
export const VS = {
  regions: [] as Region[],
  motion: { intensity: 0, direction: "●", zones: Array(9).fill(false), vectors: [] } as MotionData,
  shapeDescriptors: [] as ShapeDescriptor[],
  sceneContext: null as SceneContext | null,
  yoloClassifications: [] as YOLOClassification[],
  textRegions: [] as TextRegion[],
  otsuThresholdValue: 0,
  kmeansResult: null as KMeansResult | null,
  imageQuality: null as ImageQuality | null,
  /** Real-time vision result (stub — ML engines removed) */
  realTimeVision: null as any,
  get active() { return OrbState.active; },
  set active(v: boolean) { OrbState.active = v; },
  get awareness() { return OrbState.awareness; },
  set awareness(v: number) { OrbState.awareness = v; },
  frames: 0,
  debugLog: [] as string[],
  supernetConnected: false,
  supernetLatency: 0,
  supernetAnalysis: "" as string,
  get aiResponding() { return VoiceState.aiResponding; },
  set aiResponding(v: boolean) { VoiceState.aiResponding = v; OrbState.aiResponding = v; },
  get regions_sync() { return OrbState.regions; },
  set regions_sync(v: any[]) { OrbState.regions = v; },
};

export function vsLog(msg: string) {
  VS.debugLog = [...VS.debugLog.slice(-29), `[${new Date().toLocaleTimeString("pt-BR")}] ${msg}`];
}

// ═══ OpenCV-inspired processFrame — Sobel edge detection, histogram analysis, contour descriptors ═══
export function processFrame(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  prevFrame: Uint8ClampedArray | null,
): { regions: Region[]; motion: MotionData; pixels: Uint8ClampedArray; shapeDescriptors?: ShapeDescriptor[]; sceneContext?: SceneContext; yoloClassifications?: YOLOClassification[]; textRegions?: TextRegion[]; otsuThreshold?: number; kmeansResult?: KMeansResult; imageQuality?: ImageQuality } {
  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;

  // ═══ Phase 1: Grayscale → Gaussian Blur → Sobel (LAPIX pipeline) ═══
  const grayRaw = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    grayRaw[i] = 0.299 * px[idx] + 0.587 * px[idx + 1] + 0.114 * px[idx + 2];
  }

  // Gaussian blur 3x3 to reduce noise before edge detection (LAPIX: "ruídos não podem ser previstos")
  const gray = gaussianBlur3x3(grayRaw, w, h);

  // Sobel with gradient direction (LAPIX E3.2 — magnitude + angle)
  const sobel = sobelWithDirection(gray, w, h);
  
  // Non-Maximum Suppression for thin, precise edges (Canny-inspired)
  const sobelNMS = nonMaxSuppression(sobel.magnitude, sobel.direction, w, h);
  
  // Use NMS-thinned edges for shape analysis, raw magnitude for region classification
  const sobelMag = sobel.magnitude;

  // ═══ Phase 2: Region Classification (8x6 grid) with Sobel data ═══
  const regions: Region[] = [];
  const gridX = 8, gridY = 6;
  const cW = Math.floor(w / gridX), cH = Math.floor(h / gridY);
  for (let cy = 0; cy < gridY; cy++) {
    for (let cx = 0; cx < gridX; cx++) {
      let rS = 0, gS = 0, bS = 0, c = 0, sobelSum = 0;
      const sx = cx * cW, sy = cy * cH;
      for (let y = sy; y < Math.min(sy + cH, h); y += 2) {
        for (let x = sx; x < Math.min(sx + cW, w); x += 2) {
          const i = (y * w + x) * 4;
          if (i + 3 >= px.length) continue;
          rS += px[i]; gS += px[i + 1]; bS += px[i + 2]; c++;
          sobelSum += sobelMag[y * w + x] || 0;
        }
      }
      if (!c) continue;
      const aR = rS / c, aG = gS / c, aB = bS / c;
      const br = (aR + aG + aB) / 3;
      const sat = Math.max(aR, aG, aB) - Math.min(aR, aG, aB);
      const ed = sobelSum / c / 255; // Normalized Sobel edge density

      const maxC = Math.max(aR, aG, aB), minC = Math.min(aR, aG, aB);
      const delta = maxC - minC;
      let hue = 0;
      if (delta > 0) {
        if (maxC === aR) hue = ((aG - aB) / delta) % 6;
        else if (maxC === aG) hue = (aB - aR) / delta + 2;
        else hue = (aR - aG) / delta + 4;
        hue = ((hue * 60) + 360) % 360;
      }

      let label = "bg", cat = "bg";

      const isSkin = aR > 100 && aG > 60 && aB > 40
        && aR > aB * 1.1 && aR > aG * 0.95
        && sat > 10 && sat < 130
        && ed > 0.02 && ed < 0.5
        && br > 60 && br < 230
        && hue > 5 && hue < 50;

      const cellAspect = cW / cH;
      const isFaceLike = isSkin && ed > 0.04 && ed < 0.35 && cellAspect > 0.5 && cellAspect < 2.0;

      if (isFaceLike) {
        label = "Rosto"; cat = "face";
      } else if (isSkin) {
        label = "Pele"; cat = "skin";
      } else if (sat > 30) {
        if (hue < 15 || hue > 345) { label = "Vermelho"; cat = "color"; }
        else if (hue < 40) { label = "Laranja"; cat = "color"; }
        else if (hue < 70) { label = "Amarelo"; cat = "color"; }
        else if (hue < 165) { label = "Verde"; cat = "color"; }
        else if (hue < 195) { label = "Ciano"; cat = "color"; }
        else if (hue < 260) { label = "Azul"; cat = "color"; }
        else if (hue < 290) { label = "Roxo"; cat = "color"; }
        else if (hue < 330) { label = "Rosa"; cat = "color"; }
        else { label = "Magenta"; cat = "color"; }
      } else if (ed > 0.15 && br > 40 && br < 220) {
        label = "Estrutura"; cat = "structure";
      } else if (br > 200) {
        label = "Luz"; cat = "light";
      } else if (br < 30) {
        label = "Sombra"; cat = "shadow";
      } else if (ed > 0.08 && sat < 25 && br > 30 && br < 200) {
        label = "Texto"; cat = "text";
      } else if (sat < 15 && br > 80 && br < 180) {
        label = "Neutro"; cat = "neutral";
      }

      const conf = Math.min(0.98,
        ed * 0.25 + (sat / 255) * 0.35 + (br / 255) * 0.15 +
        (cat === "face" ? 0.25 : 0) +
        (cat === "color" ? (sat / 255) * 0.2 : 0)
      );
      if (cat !== "bg" && conf > 0.08) {
        regions.push({ label, category: cat, confidence: conf, cx: sx + cW / 2, cy: sy + cH / 2, w: cW, h: cH, avgR: aR, avgG: aG, avgB: aB, edgeDensity: Math.round(ed * 100) });
      }
    }
  }
  regions.sort((a, b) => b.confidence - a.confidence);

  // ═══ Phase 3: Contour-based Shape Descriptors (LAPIX pipeline) ═══
  // Use NMS-thinned edges + morphological closing for cleaner contours
  const shapeDescriptors = extractShapeDescriptors(sobelNMS, sobel.magnitude, sobel.direction, w, h);

  // Motion flow
  let motionIntensity = 0;
  const motionVectors: { x: number; y: number; magnitude: number }[] = [];
  const zones = Array(9).fill(false);
  if (prevFrame) {
    const blockSize = 12;
    let totalDiff = 0, blocks = 0;
    const zW = Math.max(1, Math.floor(w / 3)), zH = Math.max(1, Math.floor(h / 3));
    const zoneSums = Array(9).fill(0), zoneCounts = Array(9).fill(0);
    for (let by = 0; by < Math.floor(h / blockSize); by++) {
      for (let bx = 0; bx < Math.floor(w / blockSize); bx++) {
        let d = 0, s = 0;
        for (let y = by * blockSize; y < (by + 1) * blockSize && y < h; y += 3) {
          for (let x = bx * blockSize; x < (bx + 1) * blockSize && x < w; x += 3) {
            const i = (y * w + x) * 4;
            if (i + 2 >= px.length || i + 2 >= prevFrame.length) continue;
            d += Math.abs(px[i] - prevFrame[i]) + Math.abs(px[i + 1] - prevFrame[i + 1]) + Math.abs(px[i + 2] - prevFrame[i + 2]);
            s++;
          }
        }
        const avg = s > 0 ? d / s : 0;
        blocks++;
        const pxC = bx * blockSize + blockSize / 2;
        const pyC = by * blockSize + blockSize / 2;
        const zx = Math.min(Math.floor(pxC / zW), 2);
        const zy = Math.min(Math.floor(pyC / zH), 2);
        zoneSums[zy * 3 + zx] += avg > 25 ? 1 : 0;
        zoneCounts[zy * 3 + zx]++;
        if (avg > 25) {
          totalDiff++;
          motionVectors.push({ x: (pxC / w) * 2 - 1, y: -((pyC / h) * 2 - 1), magnitude: Math.min(1, avg / 120) });
        }
      }
    }
    motionIntensity = blocks > 0 ? Math.min(100, (totalDiff / blocks) * 300) : 0;
    for (let i = 0; i < 9; i++) zones[i] = (zoneSums[i] / Math.max(1, zoneCounts[i])) > 0.12;
  }
  let dir = "●";
  if (motionIntensity > 5) {
    const left = (zones[0] ? 1 : 0) + (zones[3] ? 1 : 0) + (zones[6] ? 1 : 0);
    const right = (zones[2] ? 1 : 0) + (zones[5] ? 1 : 0) + (zones[8] ? 1 : 0);
    const up = (zones[0] ? 1 : 0) + (zones[1] ? 1 : 0) + (zones[2] ? 1 : 0);
    const down = (zones[6] ? 1 : 0) + (zones[7] ? 1 : 0) + (zones[8] ? 1 : 0);
    const mx = Math.max(left, right, up, down);
    if (mx > 1) {
      if (mx === left) dir = "←"; else if (mx === right) dir = "→"; else if (mx === up) dir = "↑"; else dir = "↓";
    }
  }

  // ═══ Phase 5: Scene Classification (ODSC: scene context like DeepStack) ═══
  const sceneContext = classifyScene(px, w, h, sobelMag);

  // ═══ Phase 6: Otsu Adaptive Thresholding (OpenCV THRESH_OTSU) ═══
  const otsu = otsuThreshold(gray, w, h);

  // ═══ Phase 7: YOLO-Style Object Classification with Anchor Priors ═══
  const yoloInputs = shapeDescriptors.map(sd => ({
    ...sd,
    avgHue: undefined as number | undefined,
    avgSat: undefined as number | undefined,
    avgLum: undefined as number | undefined,
  }));
  // Enrich with color from nearest region
  for (const yi of yoloInputs) {
    const nearest = regions.find(r =>
      Math.abs(r.cx / w - yi.centroidX) < 0.15 &&
      Math.abs(r.cy / h - yi.centroidY) < 0.15
    );
    if (nearest) {
      const maxC = Math.max(nearest.avgR, nearest.avgG, nearest.avgB);
      const minC = Math.min(nearest.avgR, nearest.avgG, nearest.avgB);
      const delta = maxC - minC;
      let hue = 0;
      if (delta > 0) {
        if (maxC === nearest.avgR) hue = ((nearest.avgG - nearest.avgB) / delta) % 6;
        else if (maxC === nearest.avgG) hue = (nearest.avgB - nearest.avgR) / delta + 2;
        else hue = (nearest.avgR - nearest.avgG) / delta + 4;
        hue = ((hue * 60) + 360) % 360;
      }
      yi.avgHue = hue;
      yi.avgSat = maxC - minC;
      yi.avgLum = (nearest.avgR + nearest.avgG + nearest.avgB) / 3;
    }
  }
  const yoloClassifications = classifyWithPriors(yoloInputs);

  // ═══ Phase 8: Text Region Detection (PaddleOCR-inspired) ═══
  const textRegions = detectTextRegions(gray, sobelMag, w, h);

  // ═══ Phase 9: K-Means Color Segmentation (ENEGEP/USP: Hemamalini 2022) ═══
  const kmeansResult = kMeansColorSegmentation(px, w, h, 5, 8);

  // ═══ Phase 10: Image Quality Assessment (Laplacian variance + exposure) ═══
  const imageQuality = assessImageQuality(gray, w, h);

  return {
    regions: regions.slice(0, 12),
    motion: { intensity: motionIntensity, direction: dir, zones, vectors: motionVectors.slice(0, 60) },
    pixels: px,
    shapeDescriptors: shapeDescriptors.slice(0, 8),
    sceneContext,
    yoloClassifications: yoloClassifications.slice(0, 6),
    textRegions: textRegions.slice(0, 8),
    otsuThreshold: otsu.threshold,
    kmeansResult,
    imageQuality,
  };
}

// ═══ Shape Descriptor Types ═══
export interface ShapeDescriptor {
  aspectRatio: number;
  circularity: number;
  elongation: number;
  edgeDensity: number;
  area: number;
  centroidX: number;
  centroidY: number;
  shapeClass: string;
  dominantAngle: number;      // dominant gradient direction in degrees
  orientationClass: string;   // "horizontal" | "vertical" | "diagonal" | "mixed"
  orientationStrength: number; // 0-1, how dominant the orientation is
}

// ═══ LAPIX-inspired contour analysis with morphological closing + gradient orientation ═══
function extractShapeDescriptors(
  sobelNMS: Float32Array, sobelMag: Float32Array, sobelDir: Float32Array,
  w: number, h: number
): ShapeDescriptor[] {
  // Threshold NMS-thinned edges to binary (LAPIX: limiarização)
  const EDGE_THRESHOLD = 30;
  const binaryRaw = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    binaryRaw[i] = sobelNMS[i] > EDGE_THRESHOLD ? 1 : 0;
  }

  // Morphological closing to connect fragmented contours (LAPIX E2.7)
  const binary = morphClose3x3(binaryRaw, w, h);

  // Connected components via flood-fill (like cv2.findContours)
  const visited = new Uint8Array(w * h);
  const shapes: ShapeDescriptor[] = [];
  const MIN_AREA = (w * h) * 0.002;
  const MAX_AREA = (w * h) * 0.5;

  for (let y = 2; y < h - 2; y += 3) {
    for (let x = 2; x < w - 2; x += 3) {
      const idx = y * w + x;
      if (binary[idx] === 0 || visited[idx]) continue;

      const queue: number[] = [idx];
      let minX = x, maxX = x, minY = y, maxY = y;
      let sumX = 0, sumY = 0, count = 0, perimeterCount = 0;
      let sobelAccum = 0;

      while (queue.length > 0 && count < 5000) {
        const ci = queue.pop()!;
        if (visited[ci]) continue;
        visited[ci] = 1;
        const cx = ci % w, cy = Math.floor(ci / w);
        sumX += cx; sumY += cy; count++;
        sobelAccum += sobelMag[ci];
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        let isPerimeter = false;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) { isPerimeter = true; continue; }
          const ni = ny * w + nx;
          if (binary[ni] === 0) { isPerimeter = true; continue; }
          if (!visited[ni]) queue.push(ni);
        }
        if (isPerimeter) perimeterCount++;
      }

      if (count < MIN_AREA || count > MAX_AREA) continue;

      const bboxW = maxX - minX + 1;
      const bboxH = maxY - minY + 1;
      const aspectRatio = bboxW / Math.max(1, bboxH);
      const perimeter = Math.max(1, perimeterCount);
      const circularity = (4 * Math.PI * count) / (perimeter * perimeter);
      const elongation = Math.max(aspectRatio, 1 / Math.max(0.01, aspectRatio));

      // Compute dominant gradient orientation for this region (LAPIX: gradient direction)
      const orient = dominantOrientation(sobelMag, sobelDir, w, h, minX, minY, bboxW, bboxH);

      let shapeClass = "irregular";
      if (elongation > 4) shapeClass = "elongated";
      else if (circularity > 0.7) shapeClass = "circular";
      else if (aspectRatio > 0.6 && aspectRatio < 1.8 && circularity > 0.4) shapeClass = "rectangular";

      shapes.push({
        aspectRatio: Math.round(aspectRatio * 100) / 100,
        circularity: Math.round(circularity * 100) / 100,
        elongation: Math.round(elongation * 100) / 100,
        edgeDensity: Math.round((sobelAccum / count) * 10) / 10,
        area: Math.round((count / (w * h)) * 10000) / 100,
        centroidX: Math.round((sumX / count / w) * 100) / 100,
        centroidY: Math.round((sumY / count / h) * 100) / 100,
        shapeClass,
        dominantAngle: orient.angle,
        orientationClass: orient.orientationClass,
        orientationStrength: orient.strength,
      });
    }
  }

  shapes.sort((a, b) => b.area - a.area);
  return shapes;
}
