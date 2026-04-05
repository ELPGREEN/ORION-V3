/**
 * Vision Local Learning — Progressive object recognition without API
 * 
 * PROGRESSIVE LEARNING PIPELINE:
 * 1. Gemini Flash identifies objects with high confidence
 * 2. Each identification creates/updates a "learned prior" in localStorage
 * 3. Priors accumulate shape + color signatures with exponential moving average
 * 4. After enough confirmations (≥5), the prior becomes "mature"
 * 5. Mature priors can bypass the API entirely — Orion recognizes locally
 * 
 * Goal: Over time, Orion stops needing API calls for frequently seen objects.
 */

export interface LearnedPrior {
  name: string;
  category: string;
  // Geometric signature from the shape descriptor at detection time
  aspectRatio: number;
  elongation: number;
  circularity: number;
  areaRange: [number, number]; // min/max area observed
  // Color signature (averaged across observations)
  avgHue?: number;
  avgSat?: number;
  avgLum?: number;
  // Visual embedding (compact feature vector from pixel analysis)
  colorHistogram?: number[]; // 16-bin normalized histogram
  edgeDensity?: number;
  // Stats
  confirmedCount: number;
  lastSeen: number;
  avgConfidence: number;
  // Maturity: once confirmedCount >= MATURITY_THRESHOLD, this prior can bypass API
  mature: boolean;
}

const STORAGE_KEY = "orion_vision_learned_priors";
const MAX_PRIORS = 200;
const MIN_CONFIDENCE_TO_LEARN = 0.60; // Learn from 60%+ API results (was 75%)
const MATURITY_THRESHOLD = 5; // After 5 confirmations, prior is "mature" and can bypass API
const MATURE_MATCH_THRESHOLD = 0.55; // Minimum score for a mature prior to be used without API
const IMMATURE_MATCH_THRESHOLD = 0.45; // Lower bar for immature priors (still need API confirmation)

let _cache: LearnedPrior[] | null = null;

export function loadLearnedPriors(): LearnedPrior[] {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { _cache = []; return []; }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) { _cache = []; return []; }
    _cache = parsed;
    return _cache;
  } catch {
    _cache = [];
    return [];
  }
}

function savePriors(priors: LearnedPrior[]) {
  _cache = priors;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(priors.slice(0, MAX_PRIORS)));
  } catch {}
}

/**
 * Learn from an API-confirmed detection (Gemini Flash response).
 * Called when neural-ops returns identifiedObjects with confidence.
 * Each call strengthens the prior until it becomes "mature" (API-free).
 */
export function learnFromDetection(
  object: { name: string; category: string; confidence: number },
  shapeDescriptor?: { aspectRatio: number; elongation: number; circularity: number; area: number; avgHue?: number; avgSat?: number; avgLum?: number; colorHistogram?: number[]; edgeDensity?: number }
) {
  if (!shapeDescriptor) return;
  if (object.confidence < MIN_CONFIDENCE_TO_LEARN * 100) return; // confidence comes as 0-100

  const priors = loadLearnedPriors();
  const existing = priors.find(p => p.name === object.name && p.category === object.category);

  if (existing) {
    // Update existing prior with exponential moving average
    const alpha = 0.3;
    existing.aspectRatio = existing.aspectRatio * (1 - alpha) + shapeDescriptor.aspectRatio * alpha;
    existing.elongation = existing.elongation * (1 - alpha) + shapeDescriptor.elongation * alpha;
    existing.circularity = existing.circularity * (1 - alpha) + shapeDescriptor.circularity * alpha;
    existing.areaRange = [
      Math.min(existing.areaRange[0], shapeDescriptor.area),
      Math.max(existing.areaRange[1], shapeDescriptor.area),
    ];
    if (shapeDescriptor.avgHue !== undefined) {
      existing.avgHue = existing.avgHue !== undefined
        ? existing.avgHue * (1 - alpha) + shapeDescriptor.avgHue * alpha
        : shapeDescriptor.avgHue;
    }
    if (shapeDescriptor.avgSat !== undefined) {
      existing.avgSat = existing.avgSat !== undefined
        ? existing.avgSat * (1 - alpha) + shapeDescriptor.avgSat * alpha
        : shapeDescriptor.avgSat;
    }
    if (shapeDescriptor.avgLum !== undefined) {
      existing.avgLum = existing.avgLum !== undefined
        ? existing.avgLum * (1 - alpha) + shapeDescriptor.avgLum * alpha
        : shapeDescriptor.avgLum;
    }
    // Update visual embedding
    if (shapeDescriptor.colorHistogram) {
      if (existing.colorHistogram) {
        existing.colorHistogram = existing.colorHistogram.map((v, i) =>
          v * (1 - alpha) + (shapeDescriptor.colorHistogram![i] || 0) * alpha
        );
      } else {
        existing.colorHistogram = shapeDescriptor.colorHistogram;
      }
    }
    if (shapeDescriptor.edgeDensity !== undefined) {
      existing.edgeDensity = existing.edgeDensity !== undefined
        ? existing.edgeDensity * (1 - alpha) + shapeDescriptor.edgeDensity * alpha
        : shapeDescriptor.edgeDensity;
    }
    existing.confirmedCount++;
    existing.lastSeen = Date.now();
    existing.avgConfidence = (existing.avgConfidence * (existing.confirmedCount - 1) + object.confidence) / existing.confirmedCount;
    // Check maturity
    existing.mature = existing.confirmedCount >= MATURITY_THRESHOLD;

    if (existing.mature && !existing.mature) {
      console.log(`[VisionLearn] 🎓 Prior "${existing.name}" is now MATURE (${existing.confirmedCount} confirmations) — can bypass API!`);
    }
  } else {
    priors.push({
      name: object.name,
      category: object.category,
      aspectRatio: shapeDescriptor.aspectRatio,
      elongation: shapeDescriptor.elongation,
      circularity: shapeDescriptor.circularity,
      areaRange: [shapeDescriptor.area * 0.7, shapeDescriptor.area * 1.3],
      avgHue: shapeDescriptor.avgHue,
      avgSat: shapeDescriptor.avgSat,
      avgLum: shapeDescriptor.avgLum,
      colorHistogram: shapeDescriptor.colorHistogram,
      edgeDensity: shapeDescriptor.edgeDensity,
      confirmedCount: 1,
      lastSeen: Date.now(),
      avgConfidence: object.confidence,
      mature: false,
    });
    console.log(`[VisionLearn] 📝 New prior: "${object.name}" (${object.category}) — needs ${MATURITY_THRESHOLD - 1} more confirmations to mature`);
  }

  savePriors(priors);
}

/**
 * Try to match a shape descriptor against learned priors.
 * Returns matches sorted by score (best first).
 * 
 * If a MATURE prior matches with high confidence, it can be used WITHOUT calling the API.
 */
export function matchLearnedPriors(
  shape: { aspectRatio: number; elongation: number; circularity: number; area: number; avgHue?: number; avgSat?: number; avgLum?: number; colorHistogram?: number[]; edgeDensity?: number }
): Array<{ name: string; category: string; confidence: number; confirmedCount: number; mature: boolean; canBypassAPI: boolean }> {
  const priors = loadLearnedPriors();
  if (priors.length === 0) return [];

  const matches: Array<{ name: string; category: string; score: number; confirmedCount: number; mature: boolean }> = [];

  for (const prior of priors) {
    let score = 0;
    const tolerance = Math.max(0.12, 1 / (prior.confirmedCount + 1)); // Tighter tolerance with more observations

    // Aspect ratio match (25%)
    const arDiff = Math.abs(shape.aspectRatio - prior.aspectRatio) / Math.max(prior.aspectRatio, 0.1);
    if (arDiff < tolerance * 2) score += 0.20 * (1 - arDiff);

    // Elongation match (20%)
    const elDiff = Math.abs(shape.elongation - prior.elongation) / Math.max(prior.elongation, 1);
    if (elDiff < tolerance * 2) score += 0.20 * (1 - elDiff);

    // Circularity match (15%)
    const circDiff = Math.abs(shape.circularity - prior.circularity);
    if (circDiff < tolerance * 2) score += 0.15 * (1 - circDiff);

    // Area range match (10%)
    if (shape.area >= prior.areaRange[0] * 0.5 && shape.area <= prior.areaRange[1] * 1.5) {
      score += 0.10;
    }

    // Color histogram match (15%) — strong discriminator
    if (prior.colorHistogram && shape.colorHistogram && prior.colorHistogram.length === shape.colorHistogram.length) {
      let histSim = 0;
      for (let i = 0; i < prior.colorHistogram.length; i++) {
        histSim += Math.min(prior.colorHistogram[i], shape.colorHistogram[i]);
      }
      score += 0.15 * Math.min(1, histSim);
    } else if (prior.avgHue !== undefined && shape.avgHue !== undefined) {
      // Fallback to simple hue match
      const hueDiff = Math.abs(shape.avgHue - prior.avgHue);
      if (hueDiff < 30) score += 0.08 * (1 - hueDiff / 30);
    }

    // Edge density match (5%)
    if (prior.edgeDensity !== undefined && shape.edgeDensity !== undefined) {
      const edgeDiff = Math.abs(shape.edgeDensity - prior.edgeDensity);
      if (edgeDiff < 0.3) score += 0.05 * (1 - edgeDiff / 0.3);
    }

    // Confidence boost for frequently confirmed priors (15%)
    const freqBoost = Math.min(0.15, prior.confirmedCount * 0.02);
    score += freqBoost;

    const threshold = prior.mature ? MATURE_MATCH_THRESHOLD : IMMATURE_MATCH_THRESHOLD;
    if (score >= threshold) {
      matches.push({
        name: prior.name,
        category: prior.category,
        score: Math.min(prior.mature ? 0.95 : 0.85, score), // Mature priors can go up to 95%
        confirmedCount: prior.confirmedCount,
        mature: prior.mature,
      });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(m => ({
      name: m.name,
      category: m.category,
      confidence: Math.round(m.score * 100) / 100,
      confirmedCount: m.confirmedCount,
      mature: m.mature,
      canBypassAPI: m.mature && m.score >= MATURE_MATCH_THRESHOLD,
    }));
}

/**
 * Check if ALL detected objects can be identified locally (no API needed).
 * Returns true only if every object has a mature learned prior match.
 */
export function canIdentifyLocally(
  shapes: Array<{ aspectRatio: number; elongation: number; circularity: number; area: number; avgHue?: number; avgSat?: number; avgLum?: number; colorHistogram?: number[]; edgeDensity?: number }>
): { allLocal: boolean; localMatches: Array<{ name: string; category: string; confidence: number }> } {
  if (shapes.length === 0) return { allLocal: false, localMatches: [] };

  const localMatches: Array<{ name: string; category: string; confidence: number }> = [];
  
  for (const shape of shapes) {
    const matches = matchLearnedPriors(shape);
    const matureMatch = matches.find(m => m.canBypassAPI);
    if (matureMatch) {
      localMatches.push({ name: matureMatch.name, category: matureMatch.category, confidence: matureMatch.confidence });
    } else {
      // At least one object can't be identified locally
      return { allLocal: false, localMatches };
    }
  }

  return { allLocal: true, localMatches };
}

/** Get learning stats */
export function getLearningStats() {
  const priors = loadLearnedPriors();
  const matureCount = priors.filter(p => p.mature).length;
  return {
    totalPriors: priors.length,
    maturePriors: matureCount,
    immaturePriors: priors.length - matureCount,
    totalObservations: priors.reduce((sum, p) => sum + p.confirmedCount, 0),
    apiBypassRate: priors.length > 0 ? Math.round((matureCount / priors.length) * 100) : 0,
    topObjects: priors
      .sort((a, b) => b.confirmedCount - a.confirmedCount)
      .slice(0, 10)
      .map(p => ({ name: p.name, count: p.confirmedCount, avgConf: p.avgConfidence, mature: p.mature })),
  };
}

/** Clear all learned priors */
export function clearLearnedPriors() {
  _cache = [];
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
