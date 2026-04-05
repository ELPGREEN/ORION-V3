/**
 * ═══ Otsu's Adaptive Thresholding (OpenCV cv2.threshold THRESH_OTSU) ═══
 * 
 * Automatically selects optimal binary threshold by maximizing inter-class variance.
 * Used before contour extraction for robust binarization regardless of lighting.
 * 
 * Reference: N. Otsu, "A Threshold Selection Method from Gray-Level Histograms" (1979)
 */

// ═══ Otsu's Method — automatic threshold selection ═══
export function otsuThreshold(gray: Float32Array, w: number, h: number): { threshold: number; binary: Uint8Array } {
  const totalPixels = w * h;
  
  // Build histogram (256 bins)
  const hist = new Uint32Array(256);
  for (let i = 0; i < totalPixels; i++) {
    hist[Math.min(255, Math.max(0, Math.round(gray[i])))]++;
  }
  
  // Compute total mean
  let sumTotal = 0;
  for (let i = 0; i < 256; i++) sumTotal += i * hist[i];
  
  let sumB = 0;      // sum of background class
  let wB = 0;        // weight of background class
  let maxVariance = 0;
  let bestThreshold = 0;
  
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    
    const wF = totalPixels - wB;
    if (wF === 0) break;
    
    sumB += t * hist[t];
    
    const meanB = sumB / wB;
    const meanF = (sumTotal - sumB) / wF;
    
    // Inter-class variance (σ²_between)
    const variance = wB * wF * (meanB - meanF) * (meanB - meanF);
    
    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = t;
    }
  }
  
  // Apply threshold
  const binary = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    binary[i] = gray[i] > bestThreshold ? 1 : 0;
  }
  
  return { threshold: bestThreshold, binary };
}

// ═══ Adaptive Threshold (like cv2.adaptiveThreshold MEAN_C) ═══
// Uses local mean in a blockSize x blockSize window minus constant C
export function adaptiveThresholdMean(
  gray: Float32Array, w: number, h: number,
  blockSize: number = 11, C: number = 5
): Uint8Array {
  const half = Math.floor(blockSize / 2);
  const binary = new Uint8Array(w * h);
  
  // Integral image for O(1) block mean computation
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half);
      const y1 = Math.max(0, y - half);
      const x2 = Math.min(w - 1, x + half);
      const y2 = Math.min(h - 1, y + half);
      
      const area = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum = integral[(y2 + 1) * (w + 1) + (x2 + 1)]
                - integral[y1 * (w + 1) + (x2 + 1)]
                - integral[(y2 + 1) * (w + 1) + x1]
                + integral[y1 * (w + 1) + x1];
      
      const localMean = sum / area;
      binary[y * w + x] = gray[y * w + x] > (localMean - C) ? 1 : 0;
    }
  }
  
  return binary;
}
