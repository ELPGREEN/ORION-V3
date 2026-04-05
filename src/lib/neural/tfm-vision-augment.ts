/**
 * ─── tfm.vision.augment — Image Augmentation Pipeline (Browser-Adapted) ───
 * 
 * Implements TensorFlow Model Garden vision augmentation ops for on-device
 * data augmentation. All ops work on raw pixel arrays (Uint8ClampedArray/Float32Array).
 * 
 * Ref: tfm.vision.augment (TensorFlow Model Garden)
 *      AutoAugment: Cubuk et al. (2019)
 *      RandAugment: Cubuk et al. (2020)
 *      CutOut: DeVries & Taylor (2017)
 *      Mixup: Zhang et al. (2018)
 *      CutMix: Yun et al. (2019)
 */

// ═══ CORE TYPES ═══

export interface AugmentedImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  appliedOps: string[];
}

export interface AugmentConfig {
  probability: number; // 0-1, chance of applying each op
}

// ═══ PIXEL-LEVEL AUGMENTATIONS ═══

/** Autocontrast: stretches histogram to full range (PIL-compatible) */
export function autocontrast(data: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let c = 0; c < 3; c++) {
    let lo = 255, hi = 0;
    for (let i = c; i < w * h * 4; i += 4) {
      if (data[i] < lo) lo = data[i];
      if (data[i] > hi) hi = data[i];
    }
    const scale = hi > lo ? 255 / (hi - lo) : 1;
    for (let i = c; i < w * h * 4; i += 4) {
      out[i] = Math.round((data[i] - lo) * scale);
    }
  }
  // Copy alpha
  for (let i = 3; i < w * h * 4; i += 4) out[i] = data[i];
  return out;
}

/** Brightness adjustment (factor: 0=black, 1=original, 2=2x bright) */
export function brightness(data: Uint8ClampedArray, w: number, h: number, factor: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < w * h * 4; i += 4) {
    out[i] = Math.min(255, Math.max(0, Math.round(data[i] * factor)));
    out[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] * factor)));
    out[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] * factor)));
    out[i + 3] = data[i + 3];
  }
  return out;
}

/** Contrast adjustment (factor: 0=gray, 1=original) */
export function contrast(data: Uint8ClampedArray, w: number, h: number, factor: number): Uint8ClampedArray {
  // Compute mean luminance
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

/** Color (saturation) adjustment */
export function color(data: Uint8ClampedArray, w: number, h: number, factor: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < w * h * 4; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    out[i] = Math.min(255, Math.max(0, Math.round(gray + factor * (data[i] - gray))));
    out[i + 1] = Math.min(255, Math.max(0, Math.round(gray + factor * (data[i + 1] - gray))));
    out[i + 2] = Math.min(255, Math.max(0, Math.round(gray + factor * (data[i + 2] - gray))));
    out[i + 3] = data[i + 3];
  }
  return out;
}

/** Sharpness enhancement via unsharp mask */
export function sharpness(data: Uint8ClampedArray, w: number, h: number, factor: number): Uint8ClampedArray {
  // Apply 3x3 blur then blend: sharp = orig + factor * (orig - blur)
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let blur = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              blur += data[(ny * w + nx) * 4 + c];
              count++;
            }
          }
        }
        blur /= count;
        out[idx + c] = Math.min(255, Math.max(0, Math.round(data[idx + c] + factor * (data[idx + c] - blur))));
      }
      out[idx + 3] = data[idx + 3];
    }
  }
  return out;
}

/** Posterize: reduce bits per channel */
export function posterize(data: Uint8ClampedArray, w: number, h: number, bits: number): Uint8ClampedArray {
  const shift = 8 - Math.min(8, Math.max(1, bits));
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < w * h * 4; i += 4) {
    out[i] = (data[i] >> shift) << shift;
    out[i + 1] = (data[i + 1] >> shift) << shift;
    out[i + 2] = (data[i + 2] >> shift) << shift;
    out[i + 3] = data[i + 3];
  }
  return out;
}

/** Solarize: invert pixels above threshold */
export function solarize(data: Uint8ClampedArray, w: number, h: number, threshold = 128): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < w * h * 4; i += 4) {
    out[i] = data[i] >= threshold ? 255 - data[i] : data[i];
    out[i + 1] = data[i + 1] >= threshold ? 255 - data[i + 1] : data[i + 1];
    out[i + 2] = data[i + 2] >= threshold ? 255 - data[i + 2] : data[i + 2];
    out[i + 3] = data[i + 3];
  }
  return out;
}

/** Equalize: histogram equalization per channel */
export function equalize(data: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  const totalPixels = w * h;

  for (let c = 0; c < 3; c++) {
    const hist = new Uint32Array(256);
    for (let i = c; i < totalPixels * 4; i += 4) hist[data[i]]++;
    const cdf = new Uint32Array(256);
    cdf[0] = hist[0];
    for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];
    const cdfMin = cdf.find(v => v > 0) ?? 0;
    const scale = totalPixels - cdfMin;
    for (let i = c; i < totalPixels * 4; i += 4) {
      out[i] = scale > 0 ? Math.round((cdf[data[i]] - cdfMin) / scale * 255) : data[i];
    }
  }
  for (let i = 3; i < totalPixels * 4; i += 4) out[i] = data[i];
  return out;
}

/** Invert colors */
export function invert(data: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < w * h * 4; i += 4) {
    out[i] = 255 - data[i];
    out[i + 1] = 255 - data[i + 1];
    out[i + 2] = 255 - data[i + 2];
    out[i + 3] = data[i + 3];
  }
  return out;
}

// ═══ GEOMETRIC AUGMENTATIONS ═══

/** Horizontal flip */
export function flipLeftRight(data: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * w + x) * 4;
      const dstIdx = (y * w + (w - 1 - x)) * 4;
      out[dstIdx] = data[srcIdx];
      out[dstIdx + 1] = data[srcIdx + 1];
      out[dstIdx + 2] = data[srcIdx + 2];
      out[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return out;
}

/** Vertical flip */
export function flipUpDown(data: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    const srcRow = y * w * 4;
    const dstRow = (h - 1 - y) * w * 4;
    out.set(data.subarray(srcRow, srcRow + w * 4), dstRow);
  }
  return out;
}

/** Rotate 90° clockwise */
export function rotate90(data: Uint8ClampedArray, w: number, h: number): { data: Uint8ClampedArray; width: number; height: number } {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * w + x) * 4;
      const dstIdx = (x * h + (h - 1 - y)) * 4;
      out[dstIdx] = data[srcIdx];
      out[dstIdx + 1] = data[srcIdx + 1];
      out[dstIdx + 2] = data[srcIdx + 2];
      out[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return { data: out, width: h, height: w };
}

/** Wrapped rotation by arbitrary angle with bilinear interpolation */
export function wrappedRotate(
  data: Uint8ClampedArray, w: number, h: number,
  angleDeg: number, replace = 128
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  const cx = w / 2, cy = h / 2;
  const rad = -angleDeg * Math.PI / 180;
  const cosA = Math.cos(rad), sinA = Math.sin(rad);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const srcX = cosA * dx - sinA * dy + cx;
      const srcY = sinA * dx + cosA * dy + cy;

      const dstIdx = (y * w + x) * 4;
      if (srcX >= 0 && srcX < w - 1 && srcY >= 0 && srcY < h - 1) {
        // Bilinear interpolation
        const x0 = Math.floor(srcX), y0 = Math.floor(srcY);
        const fx = srcX - x0, fy = srcY - y0;
        for (let c = 0; c < 3; c++) {
          const v00 = data[(y0 * w + x0) * 4 + c];
          const v10 = data[(y0 * w + x0 + 1) * 4 + c];
          const v01 = data[((y0 + 1) * w + x0) * 4 + c];
          const v11 = data[((y0 + 1) * w + x0 + 1) * 4 + c];
          out[dstIdx + c] = Math.round(v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy);
        }
        out[dstIdx + 3] = 255;
      } else {
        out[dstIdx] = out[dstIdx + 1] = out[dstIdx + 2] = replace;
        out[dstIdx + 3] = 255;
      }
    }
  }
  return out;
}

// ═══ REGION AUGMENTATIONS ═══

/** CutOut: zero-out random rectangular regions — DeVries & Taylor (2017) */
export function cutout(
  data: Uint8ClampedArray, w: number, h: number,
  padSize: number, replace = 128
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  const cx = Math.floor(Math.random() * w);
  const cy = Math.floor(Math.random() * h);
  const x0 = Math.max(0, cx - padSize), y0 = Math.max(0, cy - padSize);
  const x1 = Math.min(w, cx + padSize), y1 = Math.min(h, cy + padSize);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * w + x) * 4;
      out[idx] = out[idx + 1] = out[idx + 2] = replace;
    }
  }
  return out;
}

/** Blend two images with factor: result = image1 * (1-factor) + image2 * factor */
export function blend(
  image1: Uint8ClampedArray, image2: Uint8ClampedArray,
  w: number, h: number, factor: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  const f1 = 1 - factor, f2 = factor;
  for (let i = 0; i < w * h * 4; i += 4) {
    out[i] = Math.min(255, Math.max(0, Math.round(image1[i] * f1 + image2[i] * f2)));
    out[i + 1] = Math.min(255, Math.max(0, Math.round(image1[i + 1] * f1 + image2[i + 1] * f2)));
    out[i + 2] = Math.min(255, Math.max(0, Math.round(image1[i + 2] * f1 + image2[i + 2] * f2)));
    out[i + 3] = 255;
  }
  return out;
}

/** Mixup: mix two images and labels — Zhang et al. (2018) */
export function mixup(
  img1: Uint8ClampedArray, label1: number,
  img2: Uint8ClampedArray, label2: number,
  w: number, h: number, alpha = 0.2
): { data: Uint8ClampedArray; label: number } {
  const lambda = betaSample(alpha, alpha);
  return {
    data: blend(img1, img2, w, h, 1 - lambda),
    label: lambda * label1 + (1 - lambda) * label2,
  };
}

/** CutMix: replace random region with patch from another image — Yun et al. (2019) */
export function cutmix(
  img1: Uint8ClampedArray, label1: number,
  img2: Uint8ClampedArray, label2: number,
  w: number, h: number, alpha = 1.0
): { data: Uint8ClampedArray; label: number } {
  const lambda = betaSample(alpha, alpha);
  const cutRatio = Math.sqrt(1 - lambda);
  const cutW = Math.floor(w * cutRatio);
  const cutH = Math.floor(h * cutRatio);
  const cx = Math.floor(Math.random() * w);
  const cy = Math.floor(Math.random() * h);
  const x0 = Math.max(0, cx - cutW / 2), y0 = Math.max(0, cy - cutH / 2);
  const x1 = Math.min(w, cx + cutW / 2), y1 = Math.min(h, cy + cutH / 2);

  const out = new Uint8ClampedArray(img1);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * w + x) * 4;
      out[idx] = img2[idx];
      out[idx + 1] = img2[idx + 1];
      out[idx + 2] = img2[idx + 2];
    }
  }
  const areaRatio = ((x1 - x0) * (y1 - y0)) / (w * h);
  return { data: out, label: (1 - areaRatio) * label1 + areaRatio * label2 };
}

/** Random erasing: Zhong et al. (2020) */
export function randomErasing(
  data: Uint8ClampedArray, w: number, h: number,
  probability = 0.5, areaRange: [number, number] = [0.02, 0.33],
  aspectRange: [number, number] = [0.3, 3.3]
): Uint8ClampedArray {
  if (Math.random() > probability) return new Uint8ClampedArray(data);

  const area = w * h;
  const targetArea = area * (areaRange[0] + Math.random() * (areaRange[1] - areaRange[0]));
  const aspect = aspectRange[0] + Math.random() * (aspectRange[1] - aspectRange[0]);
  const eraseH = Math.min(h, Math.round(Math.sqrt(targetArea / aspect)));
  const eraseW = Math.min(w, Math.round(Math.sqrt(targetArea * aspect)));
  const x0 = Math.floor(Math.random() * (w - eraseW));
  const y0 = Math.floor(Math.random() * (h - eraseH));

  const out = new Uint8ClampedArray(data);
  for (let y = y0; y < y0 + eraseH; y++) {
    for (let x = x0; x < x0 + eraseW; x++) {
      const idx = (y * w + x) * 4;
      out[idx] = Math.floor(Math.random() * 256);
      out[idx + 1] = Math.floor(Math.random() * 256);
      out[idx + 2] = Math.floor(Math.random() * 256);
    }
  }
  return out;
}

// ═══ COLOR JITTER (torchvision-style) ═══

export interface ColorJitterConfig {
  brightness?: number;  // [0, inf)
  contrast?: number;
  saturation?: number;
  hue?: number;         // [0, 0.5]
}

/** Random color jitter combining brightness, contrast, saturation, hue */
export function colorJitter(
  data: Uint8ClampedArray, w: number, h: number,
  config: ColorJitterConfig
): Uint8ClampedArray {
  let result = data;
  const ops: (() => void)[] = [];

  if (config.brightness) {
    const factor = 1 + (Math.random() * 2 - 1) * config.brightness;
    ops.push(() => { result = brightness(result, w, h, factor); });
  }
  if (config.contrast) {
    const factor = 1 + (Math.random() * 2 - 1) * config.contrast;
    ops.push(() => { result = contrast(result, w, h, factor); });
  }
  if (config.saturation) {
    const factor = 1 + (Math.random() * 2 - 1) * config.saturation;
    ops.push(() => { result = color(result, w, h, factor); });
  }

  // Shuffle order
  for (let i = ops.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ops[i], ops[j]] = [ops[j], ops[i]];
  }
  for (const op of ops) op();
  return result;
}

// ═══ RANDAUGMENT — Cubuk et al. (2020) ═══

export type AugmentOp = "autocontrast" | "equalize" | "invert" | "posterize" | "solarize"
  | "brightness" | "contrast" | "color" | "sharpness" | "cutout" | "rotate" | "flipLR";

const RANDAUGMENT_OPS: AugmentOp[] = [
  "autocontrast", "equalize", "invert", "posterize", "solarize",
  "brightness", "contrast", "color", "sharpness", "cutout", "rotate", "flipLR",
];

/** RandAugment: uniformly sample N ops and apply with magnitude M */
export function randAugment(
  data: Uint8ClampedArray, w: number, h: number,
  numOps = 2, magnitude = 9, maxMagnitude = 10
): AugmentedImage {
  let result = data;
  const applied: string[] = [];
  const m = magnitude / maxMagnitude; // normalize to [0,1]

  const selected: AugmentOp[] = [];
  for (let i = 0; i < numOps; i++) {
    selected.push(RANDAUGMENT_OPS[Math.floor(Math.random() * RANDAUGMENT_OPS.length)]);
  }

  for (const op of selected) {
    switch (op) {
      case "autocontrast": result = autocontrast(result, w, h); break;
      case "equalize": result = equalize(result, w, h); break;
      case "invert": result = invert(result, w, h); break;
      case "posterize": result = posterize(result, w, h, Math.max(1, Math.round(4 + 4 * (1 - m)))); break;
      case "solarize": result = solarize(result, w, h, Math.round(256 * (1 - m))); break;
      case "brightness": result = brightness(result, w, h, 1 + (Math.random() * 2 - 1) * m * 0.9); break;
      case "contrast": result = contrast(result, w, h, 1 + (Math.random() * 2 - 1) * m * 0.9); break;
      case "color": result = color(result, w, h, 1 + (Math.random() * 2 - 1) * m * 0.9); break;
      case "sharpness": result = sharpness(result, w, h, m * 2); break;
      case "cutout": result = cutout(result, w, h, Math.round(Math.min(w, h) * m * 0.2)); break;
      case "rotate": result = wrappedRotate(result, w, h, (Math.random() * 2 - 1) * 30 * m); break;
      case "flipLR": result = flipLeftRight(result, w, h); break;
    }
    applied.push(op);
  }

  return { data: result, width: w, height: h, appliedOps: applied };
}

// ═══ AUTOAUGMENT — Cubuk et al. (2019) ═══
// Pre-defined policy learned on ImageNet

export interface AutoAugmentPolicy {
  name: string;
  subPolicies: [AugmentOp, number, number, AugmentOp, number, number][];
}

const IMAGENET_POLICY: AutoAugmentPolicy = {
  name: "imagenet",
  subPolicies: [
    ["posterize", 0.4, 8, "rotate", 0.6, 9],
    ["solarize", 0.6, 5, "autocontrast", 0.6, 5],
    ["equalize", 0.8, 8, "equalize", 0.6, 3],
    ["posterize", 0.6, 7, "posterize", 0.6, 6],
    ["equalize", 0.4, 7, "solarize", 0.2, 4],
    ["equalize", 0.4, 4, "rotate", 0.8, 8],
    ["solarize", 0.6, 3, "equalize", 0.6, 7],
    ["posterize", 0.8, 5, "equalize", 1.0, 2],
    ["rotate", 0.2, 3, "solarize", 0.6, 8],
    ["equalize", 0.6, 8, "posterize", 0.4, 6],
  ],
};

export function autoAugment(
  data: Uint8ClampedArray, w: number, h: number,
  policy: AutoAugmentPolicy = IMAGENET_POLICY
): AugmentedImage {
  const sub = policy.subPolicies[Math.floor(Math.random() * policy.subPolicies.length)];
  let result = data;
  const applied: string[] = [];

  const applyOp = (op: AugmentOp, prob: number, mag: number) => {
    if (Math.random() < prob) {
      const m = mag / 10;
      switch (op) {
        case "posterize": result = posterize(result, w, h, Math.max(1, Math.round(4 + 4 * (1 - m)))); break;
        case "solarize": result = solarize(result, w, h, Math.round(256 * (1 - m))); break;
        case "autocontrast": result = autocontrast(result, w, h); break;
        case "equalize": result = equalize(result, w, h); break;
        case "rotate": result = wrappedRotate(result, w, h, (Math.random() * 2 - 1) * 30 * m); break;
        default: break;
      }
      applied.push(`${op}(m=${mag})`);
    }
  };

  applyOp(sub[0], sub[1], sub[2]);
  applyOp(sub[3], sub[4], sub[5]);

  return { data: result, width: w, height: h, appliedOps: applied };
}

// ═══ HELPERS ═══

function betaSample(a: number, b: number): number {
  const ga = gammaSample(a);
  const gb = gammaSample(b);
  return ga / (ga + gb);
}

function gammaSample(alpha: number): number {
  if (alpha < 1) return gammaSample(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
  const d = alpha - 1 / 3, c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x) || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

function normalSample(): number {
  const u1 = Math.random(), u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function getAugmentState() {
  return {
    pixelOps: ["autocontrast", "brightness", "contrast", "color", "sharpness", "posterize", "solarize", "equalize", "invert"],
    geometricOps: ["flipLeftRight", "flipUpDown", "rotate90", "wrappedRotate"],
    regionOps: ["cutout", "randomErasing", "mixup", "cutmix", "blend"],
    policies: ["RandAugment (Cubuk 2020)", "AutoAugment (Cubuk 2019)", "ColorJitter"],
  };
}
