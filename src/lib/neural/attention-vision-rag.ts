/**
 * ─── Attention-Guided Vision RAG ───
 * 
 * Instead of treating all detected objects equally in RAG queries,
 * this module assigns attention weights based on:
 * 1. Spatial salience (center of frame = higher attention)
 * 2. Size/area (larger objects = more important)
 * 3. Semantic importance (documents > background objects)
 * 4. Novelty (new objects get attention boost)
 * 5. Gaze direction (objects near gaze point get boosted)
 * 
 * The weighted query produces far more relevant RAG results.
 */

import type { UnifiedDetection, RealTimeVisionResult } from "./realtime-vision-engine";

// ─── Types ───

export interface AttentionWeightedDetection {
  detection: UnifiedDetection;
  attentionScore: number; // 0-1 final attention weight
  components: {
    salience: number;
    size: number;
    semantic: number;
    novelty: number;
    gaze: number;
  };
}

export interface AttentionQuery {
  query: string;
  weightedLabels: Array<{ label: string; weight: number }>;
  focusObject: string | null;
  sceneContext: string;
}

// ─── Semantic Priority Map ───
// Objects that should get higher attention in context queries

const SEMANTIC_PRIORITY: Record<string, number> = {
  // Documents & text → highest (user likely wants to read/understand)
  "book": 0.95, "laptop": 0.9, "cell phone": 0.9, "tv": 0.85,
  "monitor": 0.85, "keyboard": 0.7, "document": 0.95,
  // People & interaction
  "person": 0.8, "face": 0.85,
  // Food & drink (common query subjects)
  "bottle": 0.6, "cup": 0.7, "bowl": 0.65, "wine glass": 0.6,
  // Vehicles
  "car": 0.75, "truck": 0.7, "bus": 0.7, "bicycle": 0.65,
  // Animals
  "dog": 0.8, "cat": 0.8, "bird": 0.6, "horse": 0.7,
  // Low priority background
  "chair": 0.2, "couch": 0.2, "potted plant": 0.25, "clock": 0.3,
  "vase": 0.2, "dining table": 0.15,
};

// ─── Novelty Tracking ───

const _recentObjects = new Map<string, number>(); // label → last seen timestamp
const NOVELTY_WINDOW_MS = 10_000; // Objects seen in last 10s are not novel

// ─── Core ───

/**
 * Compute attention weight for each detection.
 */
export function computeAttentionWeights(
  visionResult: RealTimeVisionResult,
  frameWidth: number = 640,
  frameHeight: number = 480,
  gazePoint?: { x: number; y: number } | null
): AttentionWeightedDetection[] {
  const detections = visionResult.allObjects;
  if (detections.length === 0) return [];

  const now = Date.now();
  const weighted: AttentionWeightedDetection[] = [];

  for (const det of detections) {
    const label = (det.namePt || det.name).toLowerCase();

    // 1. Spatial salience: distance from center (0=center, 1=corner)
    const cx = (det.bbox.x + det.bbox.width / 2) / frameWidth;
    const cy = (det.bbox.y + det.bbox.height / 2) / frameHeight;
    const distFromCenter = Math.sqrt((cx - 0.5) ** 2 + (cy - 0.5) ** 2) / 0.707; // normalize to 0-1
    const salience = 1 - distFromCenter;

    // 2. Size: relative area of bounding box
    const area = (det.bbox.width * det.bbox.height) / (frameWidth * frameHeight);
    const size = Math.min(area * 10, 1); // cap at 1, boost small objects

    // 3. Semantic importance
    const semantic = SEMANTIC_PRIORITY[det.name.toLowerCase()] ?? 0.4;

    // 4. Novelty: new objects get a boost
    const lastSeen = _recentObjects.get(label);
    const novelty = (!lastSeen || now - lastSeen > NOVELTY_WINDOW_MS) ? 1.0 : 0.3;
    _recentObjects.set(label, now);

    // 5. Gaze proximity
    let gaze = 0.5; // default neutral
    if (gazePoint) {
      const gazeDist = Math.sqrt(
        ((det.bbox.x + det.bbox.width / 2) / frameWidth - gazePoint.x) ** 2 +
        ((det.bbox.y + det.bbox.height / 2) / frameHeight - gazePoint.y) ** 2
      );
      gaze = Math.max(0, 1 - gazeDist * 2);
    }

    // Weighted combination
    const attentionScore =
      salience * 0.20 +
      size * 0.15 +
      semantic * 0.30 +
      novelty * 0.20 +
      gaze * 0.15;

    weighted.push({
      detection: det,
      attentionScore: Math.min(1, Math.max(0, attentionScore)),
      components: { salience, size, semantic, novelty, gaze },
    });
  }

  // Sort by attention score descending
  weighted.sort((a, b) => b.attentionScore - a.attentionScore);

  // Cleanup old novelty entries
  for (const [key, ts] of _recentObjects) {
    if (now - ts > NOVELTY_WINDOW_MS * 3) _recentObjects.delete(key);
  }

  return weighted;
}

/**
 * Build an attention-weighted RAG query.
 * Higher-attention objects appear first and are emphasized.
 */
export function buildAttentionQuery(
  weighted: AttentionWeightedDetection[],
  visionResult: RealTimeVisionResult
): AttentionQuery {
  // Take top detections, weighted by attention
  const topN = weighted.slice(0, 8);
  const weightedLabels: Array<{ label: string; weight: number }> = [];
  const seen = new Set<string>();

  for (const w of topN) {
    const label = w.detection.namePt || w.detection.name;
    if (!seen.has(label)) {
      weightedLabels.push({ label, weight: w.attentionScore });
      seen.add(label);
    }
  }

  // Focus object: highest attention with score > 0.6
  const focus = topN.length > 0 && topN[0].attentionScore > 0.6
    ? (topN[0].detection.namePt || topN[0].detection.name)
    : null;

  // Build query string with attention-based repetition
  const queryParts: string[] = [];
  for (const { label, weight } of weightedLabels.slice(0, 6)) {
    queryParts.push(label);
    // Repeat high-attention labels for emphasis in text search
    if (weight > 0.7) queryParts.push(label);
  }

  // Scene context
  let sceneContext = "";
  if (visionResult.frameXResult?.scenario?.label) {
    sceneContext = visionResult.frameXResult.scenario.label;
    queryParts.push(`cena:${sceneContext}`);
  }

  // Face context
  if (visionResult.faces.length > 0) {
    queryParts.push(`${visionResult.faces.length} pessoa(s)`);
  }

  // OCR text (high semantic weight)
  const ocrTexts = visionResult.ocrResult?.texts;
  if (ocrTexts && ocrTexts.length > 0) {
    const ocrText = ocrTexts.join(" ").slice(0, 50);
    if (ocrText.length > 3) {
      queryParts.push(`texto:"${ocrText}"`);
    }
  }

  return {
    query: queryParts.slice(0, 10).join(" "),
    weightedLabels,
    focusObject: focus,
    sceneContext,
  };
}

/**
 * Format attention data for AI prompt.
 */
export function formatAttentionForPrompt(weighted: AttentionWeightedDetection[]): string {
  if (weighted.length === 0) return "";

  const top5 = weighted.slice(0, 5);
  const lines = ["FOCO DE ATENÇÃO VISUAL:"];
  for (const w of top5) {
    const label = w.detection.namePt || w.detection.name;
    const pct = Math.round(w.attentionScore * 100);
    lines.push(`• ${label} (atenção: ${pct}%) — ${describeAttention(w)}`);
  }
  return lines.join("\n");
}

function describeAttention(w: AttentionWeightedDetection): string {
  const parts: string[] = [];
  if (w.components.novelty > 0.8) parts.push("novo na cena");
  if (w.components.salience > 0.7) parts.push("centro do campo visual");
  if (w.components.size > 0.5) parts.push("objeto grande");
  if (w.components.gaze > 0.7) parts.push("no ponto de olhar");
  if (w.components.semantic > 0.8) parts.push("alta relevância semântica");
  return parts.length > 0 ? parts.join(", ") : "atenção moderada";
}
