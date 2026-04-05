/**
 * ═══ YOLO-Style Multi-Scale Object Classification with Anchor Priors ═══
 * 
 * Inspired by YOLO (You Only Look Once) architecture:
 * - Multi-scale grid detection (3 scales like YOLOv3)
 * - Anchor-based object classification with shape priors
 * - Confidence scoring using edge density + color + aspect ratio
 * - Cross-validation and contradiction penalties (v3)
 * 
 * IMPORTANT: These are LOW-LEVEL heuristic hints only.
 * The AI vision model must ALWAYS verify visually — never trust these blindly.
 * 
 * Reference: Redmon et al., "You Only Look Once" (CVPR 2016)
 */

// ═══ Object Class Priors (like YOLO anchor boxes + class definitions) ═══
export interface ObjectPrior {
  name: string;
  category: string;
  minAspect: number;
  maxAspect: number;
  minElongation: number;
  maxElongation: number;
  minCircularity: number;
  maxCircularity: number;
  edgeRange: [number, number];
  colorHint?: { hueRange?: [number, number]; satMin?: number; lumRange?: [number, number] };
  sizeRange: [number, number];
}

const OBJECT_PRIORS: ObjectPrior[] = [
  // Writing instruments — MUST be extremely thin and elongated (strict)
  { name: "pen/pencil", category: "instrument", minAspect: 0.03, maxAspect: 0.18, minElongation: 7, maxElongation: 25, minCircularity: 0.01, maxCircularity: 0.15, edgeRange: [0.1, 0.6], sizeRange: [0.05, 2] },
  // Phones/tablets — flat rectangular
  { name: "phone/device", category: "device", minAspect: 0.4, maxAspect: 0.75, minElongation: 1.3, maxElongation: 2.5, minCircularity: 0.3, maxCircularity: 0.8, edgeRange: [0.05, 0.35], sizeRange: [1, 25], colorHint: { satMin: 5, lumRange: [20, 80] } },
  // Caneca/xícara — short cylinder with handle, moderate circularity
  { name: "caneca/xícara", category: "container", minAspect: 0.5, maxAspect: 1.3, minElongation: 1, maxElongation: 2.2, minCircularity: 0.3, maxCircularity: 0.7, edgeRange: [0.05, 0.35], sizeRange: [1, 18], colorHint: { satMin: 5, lumRange: [30, 220] } },
  // Garrafa — tall thin cylinder
  { name: "garrafa", category: "container", minAspect: 0.2, maxAspect: 0.5, minElongation: 2.5, maxElongation: 6, minCircularity: 0.15, maxCircularity: 0.45, edgeRange: [0.06, 0.4], sizeRange: [1, 20] },
  // Books/notebooks
  { name: "book/notebook", category: "object", minAspect: 0.5, maxAspect: 1.5, minElongation: 1, maxElongation: 2, minCircularity: 0.5, maxCircularity: 0.9, edgeRange: [0.04, 0.25], sizeRange: [2, 35] },
  // Circular objects (balls, coins)
  { name: "circular object", category: "object", minAspect: 0.7, maxAspect: 1.4, minElongation: 1, maxElongation: 1.5, minCircularity: 0.65, maxCircularity: 1.0, edgeRange: [0.05, 0.4], sizeRange: [0.3, 20] },
  // Monitors/screens
  { name: "screen/monitor", category: "device", minAspect: 1.2, maxAspect: 2.2, minElongation: 1.2, maxElongation: 2.2, minCircularity: 0.4, maxCircularity: 0.85, edgeRange: [0.03, 0.2], sizeRange: [10, 70], colorHint: { lumRange: [60, 255] } },
  // Keyboards
  { name: "keyboard", category: "device", minAspect: 2, maxAspect: 5, minElongation: 2, maxElongation: 5, minCircularity: 0.1, maxCircularity: 0.6, edgeRange: [0.1, 0.5], sizeRange: [3, 25] },
  // Hands
  { name: "hand", category: "body", minAspect: 0.4, maxAspect: 1.8, minElongation: 1, maxElongation: 3, minCircularity: 0.1, maxCircularity: 0.5, edgeRange: [0.05, 0.35], sizeRange: [1, 15], colorHint: { hueRange: [5, 50], satMin: 10 } },
  // Prato/tigela — flat circular
  { name: "prato/tigela", category: "object", minAspect: 0.7, maxAspect: 1.5, minElongation: 1, maxElongation: 1.8, minCircularity: 0.55, maxCircularity: 0.95, edgeRange: [0.03, 0.25], sizeRange: [3, 30] },
  // Caixa/embalagem — rectangular block
  { name: "caixa/embalagem", category: "object", minAspect: 0.5, maxAspect: 2, minElongation: 1, maxElongation: 2.5, minCircularity: 0.35, maxCircularity: 0.8, edgeRange: [0.04, 0.3], sizeRange: [2, 30] },
  // Mouse
  { name: "mouse", category: "device", minAspect: 0.5, maxAspect: 0.9, minElongation: 1.1, maxElongation: 2, minCircularity: 0.4, maxCircularity: 0.75, edgeRange: [0.05, 0.3], sizeRange: [0.5, 8] },
  // Controle remoto
  { name: "controle remoto", category: "device", minAspect: 0.25, maxAspect: 0.55, minElongation: 2, maxElongation: 4.5, minCircularity: 0.15, maxCircularity: 0.5, edgeRange: [0.06, 0.4], sizeRange: [0.8, 10] },
  // Fone de ouvido
  { name: "fone de ouvido", category: "device", minAspect: 0.6, maxAspect: 1.6, minElongation: 1, maxElongation: 2.5, minCircularity: 0.2, maxCircularity: 0.6, edgeRange: [0.05, 0.35], sizeRange: [1, 12] },
];

// ═══ Shape descriptor input ═══
export interface ShapeInput {
  aspectRatio: number;
  circularity: number;
  elongation: number;
  edgeDensity: number;
  area: number;
  centroidX: number;
  centroidY: number;
  shapeClass: string;
  avgHue?: number;
  avgSat?: number;
  avgLum?: number;
}

export interface YOLOClassification {
  name: string;
  category: string;
  confidence: number;
  matchedPrior: string;
  position: { x: number; y: number };
}

// ═══ Classify shapes against YOLO priors with contradiction penalties ═══
export function classifyWithPriors(shapes: ShapeInput[]): YOLOClassification[] {
  const results: YOLOClassification[] = [];

  for (const shape of shapes) {
    let bestMatch: { prior: ObjectPrior; score: number } | null = null;

    for (const prior of OBJECT_PRIORS) {
      let score = 0;

      // Aspect ratio match (with penalty for being far out of range)
      if (shape.aspectRatio >= prior.minAspect && shape.aspectRatio <= prior.maxAspect) {
        score += 0.25;
      } else {
        const dist = Math.min(
          Math.abs(shape.aspectRatio - prior.minAspect),
          Math.abs(shape.aspectRatio - prior.maxAspect)
        );
        if (dist < 0.15) score += 0.03;
        else score -= 0.08;
      }

      // Elongation match (with penalty)
      if (shape.elongation >= prior.minElongation && shape.elongation <= prior.maxElongation) {
        score += 0.2;
      } else {
        const dist = Math.min(
          Math.abs(shape.elongation - prior.minElongation),
          Math.abs(shape.elongation - prior.maxElongation)
        );
        if (dist > 1) score -= 0.15;
      }

      // Circularity match (with penalty)
      if (shape.circularity >= prior.minCircularity && shape.circularity <= prior.maxCircularity) {
        score += 0.2;
      } else {
        const dist = Math.min(
          Math.abs(shape.circularity - prior.minCircularity),
          Math.abs(shape.circularity - prior.maxCircularity)
        );
        if (dist > 0.15) score -= 0.12;
      }

      // Edge density match
      if (shape.edgeDensity >= prior.edgeRange[0] && shape.edgeDensity <= prior.edgeRange[1]) {
        score += 0.15;
      }

      // Size match
      if (shape.area >= prior.sizeRange[0] && shape.area <= prior.sizeRange[1]) {
        score += 0.1;
      }

      // Color hint (bonus)
      if (prior.colorHint && shape.avgHue !== undefined) {
        const ch = prior.colorHint;
        let colorScore = 0;
        if (ch.hueRange && shape.avgHue >= ch.hueRange[0] && shape.avgHue <= ch.hueRange[1]) colorScore += 0.5;
        if (ch.satMin && (shape.avgSat ?? 0) >= ch.satMin) colorScore += 0.25;
        if (ch.lumRange && shape.avgLum !== undefined && shape.avgLum >= ch.lumRange[0] && shape.avgLum <= ch.lumRange[1]) colorScore += 0.25;
        score += colorScore * 0.1;
      }

      // ═══ Strict contradiction penalties for pen/pencil ═══
      if (prior.name === "pen/pencil") {
        // Pens MUST be extremely thin and elongated — anything else is NOT a pen
        if (shape.circularity > 0.2) score -= 0.25;
        if (shape.area > 2) score -= 0.2;
        if (shape.elongation < 6) score -= 0.3;
        if (shape.aspectRatio > 0.25) score -= 0.2;
      }
      if (prior.name === "caneca/xícara") {
        if (shape.circularity > 0.25 && shape.elongation < 3) score += 0.05;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { prior, score };
      }
    }

    // Threshold raised to 0.55 to reduce false positives
    if (bestMatch && bestMatch.score >= 0.55) {
      // Cap confidence at 0.70 — these are heuristic hints, not real detections
      results.push({
        name: bestMatch.prior.name,
        category: bestMatch.prior.category,
        confidence: Math.round(Math.min(0.70, bestMatch.score) * 100) / 100,
        matchedPrior: bestMatch.prior.name,
        position: { x: shape.centroidX, y: shape.centroidY },
      });
    }
  }

  // Post-validation: reclassify contradictory pen detections
  for (const r of results) {
    if (r.name === "pen/pencil") {
      const shape = shapes.find(s =>
        Math.abs(s.centroidX - r.position.x) < 0.05 &&
        Math.abs(s.centroidY - r.position.y) < 0.05
      );
      if (shape && (shape.circularity > 0.2 || shape.area > 2 || shape.elongation < 6)) {
        r.confidence = 0;
        r.name = "objeto (forma detectada)";
        r.category = "unknown";
      }
    }
  }

  // Filter out demoted items below threshold
  const filtered = results.filter(r => r.confidence >= 0.40);

  return deduplicateByProximity(filtered, 0.15);
}

function deduplicateByProximity(results: YOLOClassification[], minDist: number): YOLOClassification[] {
  const kept: YOLOClassification[] = [];
  for (const r of results) {
    const duplicate = kept.find(k =>
      k.name === r.name &&
      Math.abs(k.position.x - r.position.x) < minDist &&
      Math.abs(k.position.y - r.position.y) < minDist
    );
    if (!duplicate) kept.push(r);
    else if (r.confidence > duplicate.confidence) {
      const idx = kept.indexOf(duplicate);
      kept[idx] = r;
    }
  }
  return kept;
}
