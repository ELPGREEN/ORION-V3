/**
 * ═══ Vision Preprocessing Module (LAPIX/UFSC OpenCV-inspired) ═══
 * 
 * Implements academic computer vision techniques:
 * - Gaussian blur (3x3 kernel) for noise reduction before edge detection
 * - Morphological operations (dilation, erosion, closing) on binary edge maps
 * - Gradient direction computation for orientation analysis
 * - Non-Maximum Suppression (NMS) for thin edges
 * 
 * Based on: LAPIX/UFSC "Métodos no Domínio do Espaço" curriculum
 * Reference: Prof. Aldo von Wangenheim - INE/UFSC
 */

// ═══ Gaussian Blur 3x3 (σ≈0.85) — reduces noise before Sobel ═══
// Kernel: [1 2 1; 2 4 2; 1 2 1] / 16
export function gaussianBlur3x3(gray: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      out[y * w + x] = (
        gray[(y - 1) * w + (x - 1)] + 2 * gray[(y - 1) * w + x] + gray[(y - 1) * w + (x + 1)] +
        2 * gray[y * w + (x - 1)] + 4 * gray[y * w + x] + 2 * gray[y * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)]
      ) / 16;
    }
  }
  // Copy border pixels
  for (let x = 0; x < w; x++) { out[x] = gray[x]; out[(h - 1) * w + x] = gray[(h - 1) * w + x]; }
  for (let y = 0; y < h; y++) { out[y * w] = gray[y * w]; out[y * w + w - 1] = gray[y * w + w - 1]; }
  return out;
}

// ═══ Sobel with gradient direction (LAPIX E3.2) ═══
export interface SobelResult {
  magnitude: Float32Array;
  direction: Float32Array; // angle in radians [0, 2π)
}

export function sobelWithDirection(gray: Float32Array, w: number, h: number): SobelResult {
  const magnitude = new Float32Array(w * h);
  const direction = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)]
        - 2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)]
        - gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];
      const gy =
        -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
        + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
      
      const idx = y * w + x;
      magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
      // atan2 gives angle of gradient direction (perpendicular to edge)
      direction[idx] = Math.atan2(gy, gx);
    }
  }
  return { magnitude, direction };
}

// ═══ Non-Maximum Suppression (Canny step 2) — thin edges ═══
export function nonMaxSuppression(mag: Float32Array, dir: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const m = mag[idx];
      if (m < 10) continue; // skip very weak edges
      
      // Quantize direction to 4 angles (0°, 45°, 90°, 135°)
      let angle = ((dir[idx] * 180 / Math.PI) + 180) % 180;
      let m1 = 0, m2 = 0;
      
      if (angle < 22.5 || angle >= 157.5) {
        // Horizontal edge — compare with left/right
        m1 = mag[y * w + (x - 1)];
        m2 = mag[y * w + (x + 1)];
      } else if (angle < 67.5) {
        // 45° diagonal
        m1 = mag[(y - 1) * w + (x + 1)];
        m2 = mag[(y + 1) * w + (x - 1)];
      } else if (angle < 112.5) {
        // Vertical edge — compare with above/below
        m1 = mag[(y - 1) * w + x];
        m2 = mag[(y + 1) * w + x];
      } else {
        // 135° diagonal
        m1 = mag[(y - 1) * w + (x - 1)];
        m2 = mag[(y + 1) * w + (x + 1)];
      }
      
      // Keep only local maxima
      out[idx] = (m >= m1 && m >= m2) ? m : 0;
    }
  }
  return out;
}

// ═══ Morphological Dilation (binary, 3x3 square kernel) — LAPIX E2.1 ═══
export function dilate3x3(binary: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      // If any neighbor is 1, output is 1
      if (binary[y * w + x] ||
          binary[(y - 1) * w + x] || binary[(y + 1) * w + x] ||
          binary[y * w + (x - 1)] || binary[y * w + (x + 1)] ||
          binary[(y - 1) * w + (x - 1)] || binary[(y - 1) * w + (x + 1)] ||
          binary[(y + 1) * w + (x - 1)] || binary[(y + 1) * w + (x + 1)]) {
        out[y * w + x] = 1;
      }
    }
  }
  return out;
}

// ═══ Morphological Erosion (binary, 3x3 square kernel) — LAPIX E2.2 ═══
export function erode3x3(binary: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      // All neighbors must be 1
      if (binary[y * w + x] &&
          binary[(y - 1) * w + x] && binary[(y + 1) * w + x] &&
          binary[y * w + (x - 1)] && binary[y * w + (x + 1)] &&
          binary[(y - 1) * w + (x - 1)] && binary[(y - 1) * w + (x + 1)] &&
          binary[(y + 1) * w + (x - 1)] && binary[(y + 1) * w + (x + 1)]) {
        out[y * w + x] = 1;
      }
    }
  }
  return out;
}

// ═══ Morphological Closing = Dilation → Erosion — LAPIX E2.7 ═══
// Fills small gaps in contours while preserving shape
export function morphClose3x3(binary: Uint8Array, w: number, h: number): Uint8Array {
  return erode3x3(dilate3x3(binary, w, h), w, h);
}

// ═══ Morphological Gradient = Dilation - Erosion — LAPIX E2.5 ═══
// Reveals clean contour boundaries
export function morphGradient3x3(binary: Uint8Array, w: number, h: number): Uint8Array {
  const dilated = dilate3x3(binary, w, h);
  const eroded = erode3x3(binary, w, h);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    out[i] = dilated[i] && !eroded[i] ? 1 : 0;
  }
  return out;
}

// ═══ Dominant Gradient Orientation for a region ═══
// Computes histogram of gradient directions (8 bins) weighted by magnitude
export function dominantOrientation(
  mag: Float32Array, dir: Float32Array,
  w: number, h: number,
  rx: number, ry: number, rw: number, rh: number
): { angle: number; strength: number; orientationClass: string } {
  const bins = new Float32Array(8); // 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
  const step = Math.max(1, Math.floor(Math.min(rw, rh) / 20));
  
  for (let y = ry; y < Math.min(ry + rh, h); y += step) {
    for (let x = rx; x < Math.min(rx + rw, w); x += step) {
      const idx = y * w + x;
      const m = mag[idx];
      if (m < 15) continue;
      // Normalize angle to [0, 360)
      let angle = ((dir[idx] * 180 / Math.PI) + 360) % 360;
      const bin = Math.floor(angle / 45) % 8;
      bins[bin] += m;
    }
  }
  
  // Find dominant bin
  let maxBin = 0;
  for (let i = 1; i < 8; i++) {
    if (bins[i] > bins[maxBin]) maxBin = i;
  }
  
  const totalStrength = bins.reduce((a, b) => a + b, 0);
  const strength = totalStrength > 0 ? bins[maxBin] / totalStrength : 0;
  const angle = maxBin * 45;
  
  // Classify orientation
  let orientationClass = "mixed";
  if (strength > 0.35) {
    if (angle === 0 || angle === 180) orientationClass = "horizontal";
    else if (angle === 90 || angle === 270) orientationClass = "vertical";
    else orientationClass = "diagonal";
  }
  
  return { angle, strength: Math.round(strength * 100) / 100, orientationClass };
}

// ═══ Scene Classification (ODSC: scene classification like DeepStack) ═══
// Analyzes global image statistics to classify environment type
export interface SceneContext {
  lighting: "bright" | "normal" | "dim" | "dark";
  colorTemperature: "warm" | "neutral" | "cool";
  environment: "indoor" | "outdoor" | "ambiguous";
  complexity: "simple" | "moderate" | "complex"; // based on edge density
  dominantColors: string[]; // top 3 color names
  textureVariance: number; // 0-1, how textured the scene is
}

export function classifyScene(px: Uint8ClampedArray, w: number, h: number, sobelMag: Float32Array): SceneContext {
  const totalPixels = w * h;
  const step = Math.max(1, Math.floor(totalPixels / 5000)); // sample ~5000 pixels
  
  let lumSum = 0, lumSqSum = 0, rSum = 0, gSum = 0, bSum = 0;
  let edgeSum = 0, samples = 0;
  
  // Color histogram (6 bins: R, G, B, Y, C, M + neutrals)
  const colorBins = { red: 0, orange: 0, yellow: 0, green: 0, cyan: 0, blue: 0, purple: 0, pink: 0, white: 0, gray: 0, black: 0, brown: 0 };

  for (let i = 0; i < totalPixels; i += step) {
    const idx = i * 4;
    const r = px[idx], g = px[idx + 1], b = px[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lumSum += lum;
    lumSqSum += lum * lum;
    rSum += r; gSum += g; bSum += b;
    edgeSum += sobelMag[i] || 0;
    samples++;

    // Classify pixel color
    const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
    const sat = maxC - minC;
    if (lum > 220 && sat < 30) colorBins.white++;
    else if (lum < 30) colorBins.black++;
    else if (sat < 25) colorBins.gray++;
    else {
      let hue = 0;
      const delta = maxC - minC;
      if (delta > 0) {
        if (maxC === r) hue = ((g - b) / delta) % 6;
        else if (maxC === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        hue = ((hue * 60) + 360) % 360;
      }
      if (lum < 80 && sat > 15 && hue > 10 && hue < 40) colorBins.brown++;
      else if (hue < 15 || hue >= 345) colorBins.red++;
      else if (hue < 40) colorBins.orange++;
      else if (hue < 70) colorBins.yellow++;
      else if (hue < 165) colorBins.green++;
      else if (hue < 195) colorBins.cyan++;
      else if (hue < 260) colorBins.blue++;
      else if (hue < 300) colorBins.purple++;
      else colorBins.pink++;
    }
  }
  
  const avgLum = lumSum / samples;
  const lumVariance = (lumSqSum / samples) - (avgLum * avgLum);
  const avgR = rSum / samples, avgG = gSum / samples, avgB = bSum / samples;
  const avgEdge = edgeSum / samples;

  // Lighting
  let lighting: SceneContext["lighting"] = "normal";
  if (avgLum > 180) lighting = "bright";
  else if (avgLum < 60) lighting = "dark";
  else if (avgLum < 100) lighting = "dim";

  // Color temperature (warm = reddish, cool = bluish)
  let colorTemperature: SceneContext["colorTemperature"] = "neutral";
  if (avgR > avgB * 1.2 && avgR > 100) colorTemperature = "warm";
  else if (avgB > avgR * 1.15 && avgB > 80) colorTemperature = "cool";

  // Environment heuristic (outdoor = more blue sky/green, bright; indoor = warm, moderate light)
  let environment: SceneContext["environment"] = "ambiguous";
  const blueGreenRatio = (colorBins.blue + colorBins.cyan + colorBins.green) / Math.max(1, samples);
  const warmRatio = (colorBins.orange + colorBins.yellow + colorBins.brown) / Math.max(1, samples);
  if (lighting === "bright" && blueGreenRatio > 0.25) environment = "outdoor";
  else if (colorTemperature === "warm" && lighting !== "bright" && warmRatio > 0.05) environment = "indoor";

  // Complexity based on edge density
  let complexity: SceneContext["complexity"] = "moderate";
  if (avgEdge > 40) complexity = "complex";
  else if (avgEdge < 15) complexity = "simple";

  // Top 3 dominant colors
  const sortedColors = Object.entries(colorBins)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, count]) => count > samples * 0.03)
    .slice(0, 3)
    .map(([name]) => name);

  // Texture variance (normalized luminance variance)
  const textureVariance = Math.min(1, Math.sqrt(lumVariance) / 80);

  return {
    lighting,
    colorTemperature,
    environment,
    complexity,
    dominantColors: sortedColors.length > 0 ? sortedColors : ["neutral"],
    textureVariance: Math.round(textureVariance * 100) / 100,
  };
}

// ═══ Color Histogram Analysis (OpenCV feature extraction) ═══
// Returns normalized histogram for better color context
export interface ColorHistogram {
  bins: Record<string, number>; // normalized 0-1
  saturationAvg: number;
  contrastRatio: number; // max/min luminance ratio
}

export function computeColorHistogram(px: Uint8ClampedArray, w: number, h: number): ColorHistogram {
  const totalPixels = w * h;
  const step = Math.max(1, Math.floor(totalPixels / 3000));
  let samples = 0, satSum = 0, lumMin = 255, lumMax = 0;
  const bins: Record<string, number> = {};

  for (let i = 0; i < totalPixels; i += step) {
    const idx = i * 4;
    const r = px[idx], g = px[idx + 1], b = px[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < lumMin) lumMin = lum;
    if (lum > lumMax) lumMax = lum;
    
    const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
    satSum += maxC - minC;
    
    // Quantize to 8 luminance bins
    const lumBin = `L${Math.floor(lum / 32)}`;
    bins[lumBin] = (bins[lumBin] || 0) + 1;
    samples++;
  }

  // Normalize
  for (const key of Object.keys(bins)) bins[key] = Math.round((bins[key] / samples) * 100) / 100;

  return {
    bins,
    saturationAvg: Math.round(satSum / samples),
    contrastRatio: lumMin > 0 ? Math.round((lumMax / lumMin) * 10) / 10 : lumMax > 0 ? 255 : 1,
  };
}
