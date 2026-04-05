/**
 * ═══ K-Means Color Segmentation + Image Quality Assessment ═══
 * 
 * Based on: ENEGEP/USP 2023 — "Visão Computacional na Indústria"
 * Reference: Golnabi & Asadpour (2007), Hemamalini et al. (2022)
 * 
 * Implements:
 * - K-Means color clustering for semantic region segmentation
 * - Laplacian variance for blur/focus detection
 * - Exposure quality assessment (over/under-exposed)
 * - Ensemble confidence combining multiple vision signals
 */

// ═══ K-Means Color Clustering (like cv2.kmeans / Hemamalini 2022) ═══
export interface ColorCluster {
  centroid: [number, number, number]; // RGB
  size: number;       // percentage of total pixels
  label: string;      // semantic color name
  dominance: number;  // 0-1 rank within clusters
}

export interface KMeansResult {
  clusters: ColorCluster[];
  segmentationQuality: number; // 0-1, how well-separated clusters are
}

export function kMeansColorSegmentation(
  px: Uint8ClampedArray, w: number, h: number,
  k: number = 5, maxIter: number = 10
): KMeansResult {
  const totalPixels = w * h;
  const step = Math.max(1, Math.floor(totalPixels / 2000)); // sample ~2000 pixels
  
  // Collect samples
  const samples: [number, number, number][] = [];
  for (let i = 0; i < totalPixels; i += step) {
    const idx = i * 4;
    samples.push([px[idx], px[idx + 1], px[idx + 2]]);
  }
  
  // Initialize centroids (K-Means++ simplified: evenly spaced samples)
  const centroids: [number, number, number][] = [];
  const spacing = Math.floor(samples.length / k);
  for (let i = 0; i < k; i++) {
    centroids.push([...samples[Math.min(i * spacing, samples.length - 1)]]);
  }
  
  // Iterate
  const assignments = new Uint8Array(samples.length);
  for (let iter = 0; iter < maxIter; iter++) {
    // Assign each sample to nearest centroid
    let changed = false;
    for (let i = 0; i < samples.length; i++) {
      let minDist = Infinity, bestC = 0;
      for (let c = 0; c < k; c++) {
        const dr = samples[i][0] - centroids[c][0];
        const dg = samples[i][1] - centroids[c][1];
        const db = samples[i][2] - centroids[c][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) { minDist = dist; bestC = c; }
      }
      if (assignments[i] !== bestC) { assignments[i] = bestC; changed = true; }
    }
    if (!changed) break;
    
    // Update centroids
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]); // [r, g, b, count]
    for (let i = 0; i < samples.length; i++) {
      const c = assignments[i];
      sums[c][0] += samples[i][0];
      sums[c][1] += samples[i][1];
      sums[c][2] += samples[i][2];
      sums[c][3]++;
    }
    for (let c = 0; c < k; c++) {
      if (sums[c][3] > 0) {
        centroids[c] = [
          sums[c][0] / sums[c][3],
          sums[c][1] / sums[c][3],
          sums[c][2] / sums[c][3],
        ];
      }
    }
  }
  
  // Build clusters with labels
  const counts = new Uint32Array(k);
  for (let i = 0; i < samples.length; i++) counts[assignments[i]]++;
  
  // Compute inter-cluster distance for segmentation quality
  let totalInterDist = 0, pairCount = 0;
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const dr = centroids[i][0] - centroids[j][0];
      const dg = centroids[i][1] - centroids[j][1];
      const db = centroids[i][2] - centroids[j][2];
      totalInterDist += Math.sqrt(dr * dr + dg * dg + db * db);
      pairCount++;
    }
  }
  const avgInterDist = pairCount > 0 ? totalInterDist / pairCount : 0;
  const segmentationQuality = Math.min(1, avgInterDist / 200); // normalized
  
  const clusters: ColorCluster[] = [];
  for (let c = 0; c < k; c++) {
    if (counts[c] === 0) continue;
    const size = Math.round((counts[c] / samples.length) * 100) / 100;
    const [r, g, b] = centroids[c].map(Math.round);
    clusters.push({
      centroid: [r, g, b],
      size,
      label: classifyColor(r, g, b),
      dominance: 0,
    });
  }
  
  clusters.sort((a, b) => b.size - a.size);
  clusters.forEach((c, i) => { c.dominance = Math.round((1 - i / Math.max(1, clusters.length - 1)) * 100) / 100; });
  
  return { clusters, segmentationQuality: Math.round(segmentationQuality * 100) / 100 };
}

function classifyColor(r: number, g: number, b: number): string {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
  const sat = maxC - minC;
  
  if (lum > 220 && sat < 30) return "branco";
  if (lum < 30) return "preto";
  if (sat < 25) return lum > 128 ? "cinza-claro" : "cinza-escuro";
  
  let hue = 0;
  const delta = maxC - minC;
  if (delta > 0) {
    if (maxC === r) hue = ((g - b) / delta) % 6;
    else if (maxC === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = ((hue * 60) + 360) % 360;
  }
  
  if (lum < 80 && hue > 10 && hue < 40) return "marrom";
  if (hue < 15 || hue >= 345) return "vermelho";
  if (hue < 40) return "laranja";
  if (hue < 70) return "amarelo";
  if (hue < 165) return "verde";
  if (hue < 195) return "ciano";
  if (hue < 260) return "azul";
  if (hue < 300) return "roxo";
  return "rosa";
}

// ═══ Image Quality Assessment (IQA) ═══
// Inspired by Connolly (2009) and industrial vision systems requirements

export interface ImageQuality {
  sharpness: number;      // 0-1, Laplacian variance normalized
  exposure: "underexposed" | "normal" | "overexposed";
  noiseLevel: "low" | "moderate" | "high";
  overallScore: number;   // 0-1 composite quality
  recommendation: string; // human-readable advice
}

export function assessImageQuality(
  gray: Float32Array, w: number, h: number
): ImageQuality {
  // 1. Sharpness via Laplacian variance (blur detection)
  // Laplacian kernel: [0,1,0; 1,-4,1; 0,1,0]
  let lapSum = 0, lapSqSum = 0, lapSamples = 0;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 200));
  
  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const lap = gray[(y - 1) * w + x] + gray[(y + 1) * w + x] +
                  gray[y * w + (x - 1)] + gray[y * w + (x + 1)] -
                  4 * gray[y * w + x];
      lapSum += lap;
      lapSqSum += lap * lap;
      lapSamples++;
    }
  }
  
  const lapMean = lapSum / lapSamples;
  const lapVariance = (lapSqSum / lapSamples) - (lapMean * lapMean);
  // Normalize: typical sharp image has variance > 500, blurry < 100
  const sharpness = Math.min(1, Math.max(0, lapVariance / 800));
  
  // 2. Exposure analysis (histogram distribution)
  let darkPixels = 0, brightPixels = 0, totalSampled = 0;
  for (let i = 0; i < w * h; i += step) {
    const v = gray[i];
    if (v < 30) darkPixels++;
    if (v > 225) brightPixels++;
    totalSampled++;
  }
  
  const darkRatio = darkPixels / totalSampled;
  const brightRatio = brightPixels / totalSampled;
  let exposure: ImageQuality["exposure"] = "normal";
  if (darkRatio > 0.5) exposure = "underexposed";
  else if (brightRatio > 0.4) exposure = "overexposed";
  
  // 3. Noise estimation (high-frequency energy in flat regions)
  let noiseScore = 0, flatRegions = 0;
  for (let y = 2; y < h - 2; y += step * 3) {
    for (let x = 2; x < w - 2; x += step * 3) {
      // Check if region is flat (low gradient)
      const center = gray[y * w + x];
      const neighbors = [
        gray[(y - 1) * w + x], gray[(y + 1) * w + x],
        gray[y * w + (x - 1)], gray[y * w + (x + 1)],
      ];
      const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / 4;
      const localGrad = Math.abs(center - avgNeighbor);
      
      if (localGrad < 5) {
        // Flat region — measure noise as variance of neighbors
        const localVar = neighbors.reduce((sum, n) => sum + (n - avgNeighbor) ** 2, 0) / 4;
        noiseScore += localVar;
        flatRegions++;
      }
    }
  }
  
  const avgNoise = flatRegions > 0 ? noiseScore / flatRegions : 0;
  let noiseLevel: ImageQuality["noiseLevel"] = "low";
  if (avgNoise > 50) noiseLevel = "high";
  else if (avgNoise > 15) noiseLevel = "moderate";
  
  // 4. Overall score
  const exposureScore = exposure === "normal" ? 1 : 0.5;
  const noiseScoreNorm = noiseLevel === "low" ? 1 : noiseLevel === "moderate" ? 0.7 : 0.4;
  const overallScore = Math.round((sharpness * 0.4 + exposureScore * 0.35 + noiseScoreNorm * 0.25) * 100) / 100;
  
  // 5. Recommendation
  let recommendation = "Qualidade adequada para análise.";
  if (sharpness < 0.3) recommendation = "Imagem desfocada — aproxime o objeto ou estabilize a câmera.";
  else if (exposure === "underexposed") recommendation = "Imagem escura — aumente a iluminação.";
  else if (exposure === "overexposed") recommendation = "Imagem muito clara — reduza a iluminação direta.";
  else if (noiseLevel === "high") recommendation = "Alto ruído — melhore a iluminação.";
  
  return {
    sharpness: Math.round(sharpness * 100) / 100,
    exposure,
    noiseLevel,
    overallScore,
    recommendation,
  };
}

// ═══ Ensemble Confidence Score (multi-algorithm fusion) ═══
// Paper: "mesclar diferentes algoritmos para otimizar a solução" (ENEGEP 2023)
export function computeEnsembleConfidence(signals: {
  yoloConfidence?: number;
  shapeMatch?: number;
  colorMatch?: number;
  textureMatch?: number;
  sceneConsistency?: number;
}): { confidence: number; grade: "high" | "medium" | "low" | "uncertain" } {
  const weights = { yolo: 0.3, shape: 0.25, color: 0.2, texture: 0.15, scene: 0.1 };
  let totalWeight = 0, weightedSum = 0;
  
  if (signals.yoloConfidence !== undefined) { weightedSum += signals.yoloConfidence * weights.yolo; totalWeight += weights.yolo; }
  if (signals.shapeMatch !== undefined) { weightedSum += signals.shapeMatch * weights.shape; totalWeight += weights.shape; }
  if (signals.colorMatch !== undefined) { weightedSum += signals.colorMatch * weights.color; totalWeight += weights.color; }
  if (signals.textureMatch !== undefined) { weightedSum += signals.textureMatch * weights.texture; totalWeight += weights.texture; }
  if (signals.sceneConsistency !== undefined) { weightedSum += signals.sceneConsistency * weights.scene; totalWeight += weights.scene; }
  
  const confidence = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  
  let grade: "high" | "medium" | "low" | "uncertain" = "uncertain";
  if (confidence >= 0.75) grade = "high";
  else if (confidence >= 0.5) grade = "medium";
  else if (confidence >= 0.25) grade = "low";
  
  return { confidence, grade };
}
