/**
 * ─── Quantum Vision Enhancer ───
 * Applies quantum confidence calibration and multi-detector fusion
 * using VQC scoring to improve vision pipeline accuracy.
 * 
 * Problems solved:
 * 1. Confidence miscalibration between MediaPipe and YOLO detectors
 * 2. Ambiguous object classification (both detectors disagree)
 * 3. Temporal consistency via quantum state persistence
 * 4. Detection priority scoring using quantum Born rule
 * 
 * Architecture: Detection Features → VQC → Calibrated Confidence + Priority
 */

import { vqcForward, type VQCConfig } from "./vqc";
import { qubitZero, qubitFromProbability, measureProbability, fidelity, type QubitState } from "./qubit-core";
import { rotationY, rotationZ, hadamard } from "./quantum-gates";
import type { UnifiedDetection } from "./realtime-vision-engine";

// ─── Types ───

export interface QuantumEnhancedDetection extends UnifiedDetection {
  /** Original confidence before quantum calibration */
  rawConfidence: number;
  /** Quantum-calibrated confidence 0-1 */
  quantumConfidence: number;
  /** Priority score via Born rule (0-1) — higher = more important */
  quantumPriority: number;
  /** Temporal stability score — higher = more persistent across frames */
  temporalStability: number;
  /** Multi-detector agreement quantum fidelity */
  detectorAgreement: number;
}

export interface VisionEnhancementResult {
  /** Enhanced detections sorted by quantum priority */
  detections: QuantumEnhancedDetection[];
  /** Average calibration improvement */
  avgCalibrationDelta: number;
  /** Quantum temporal coherence 0-1 */
  temporalCoherence: number;
  /** Enhancement latency */
  enhancementMs: number;
}

// ─── VQC Configuration ───

const VISION_VQC_CONFIG: VQCConfig = {
  nQubits: 4,
  nLayers: 2,
  featureMap: "tanh",
  ansatz: "hardware_efficient",
  noiseModel: "depolarizing",
  noiseStrength: 0.008,
  naturalGradient: false,
  residualStrength: 0.1,
  gradientClip: 1.0,
};

// Pre-trained params for confidence calibration
const CALIBRATION_PARAMS: number[][][] = [
  [
    [0.6, -0.4, 1.0],
    [-0.3, 0.9, 0.5],
    [1.1, 0.2, -0.7],
    [-0.5, 0.8, 1.2],
  ],
  [
    [0.9, -0.6, 0.3],
    [0.3, 1.1, -0.4],
    [-0.8, 0.5, 0.9],
    [0.7, -0.3, 0.6],
  ],
];

// ─── Temporal Memory ───

interface TemporalEntry {
  name: string;
  qubitState: QubitState;
  lastSeen: number;
  seenCount: number;
}

const _temporalMemory: Map<string, TemporalEntry> = new Map();
const TEMPORAL_DECAY_MS = 3000;
const MAX_TEMPORAL_ENTRIES = 50;

function updateTemporalMemory(name: string, confidence: number): TemporalEntry {
  const existing = _temporalMemory.get(name);
  const now = Date.now();

  if (existing && (now - existing.lastSeen) < TEMPORAL_DECAY_MS) {
    // Blend quantum states: existing and new observation
    const newState = qubitFromProbability(confidence);
    const old = existing.qubitState;
    const blended: QubitState = [
      [old[0][0] * 0.7 + newState[0][0] * 0.3, old[0][1] * 0.7 + newState[0][1] * 0.3],
      [old[1][0] * 0.7 + newState[1][0] * 0.3, old[1][1] * 0.7 + newState[1][1] * 0.3],
    ];
    existing.qubitState = blended;
    existing.lastSeen = now;
    existing.seenCount++;
    return existing;
  }

  const entry: TemporalEntry = {
    name,
    qubitState: qubitFromProbability(confidence),
    lastSeen: now,
    seenCount: 1,
  };
  _temporalMemory.set(name, entry);

  // Prune old entries
  if (_temporalMemory.size > MAX_TEMPORAL_ENTRIES) {
    const sorted = [..._temporalMemory.entries()]
      .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    for (let i = 0; i < sorted.length - MAX_TEMPORAL_ENTRIES; i++) {
      _temporalMemory.delete(sorted[i][0]);
    }
  }

  return entry;
}

// ─── Core Enhancement ───

/**
 * Enhance a single detection with quantum calibration.
 */
function enhanceDetection(det: UnifiedDetection): QuantumEnhancedDetection {
  // Feature vector for VQC
  const features = [
    det.confidence,                              // raw confidence
    det.source === "both" ? 1.0 : det.source === "yolo" ? 0.7 : 0.5, // detector reliability
    Math.min(1, (det.width * det.height) / 0.25), // relative size (larger = more reliable)
    det.source === "both" ? 1.0 : 0.5,           // multi-detector agreement
  ];

  // Quantum calibrated confidence via VQC
  const quantumConf = vqcForward(features, CALIBRATION_PARAMS, VISION_VQC_CONFIG);

  // Temporal state update
  const temporal = updateTemporalMemory(det.name, det.confidence);
  const temporalStability = Math.min(1, temporal.seenCount / 10) *
    (1 - Math.min(1, (Date.now() - temporal.lastSeen) / TEMPORAL_DECAY_MS));

  // Priority via Born rule: higher for stable, high-confidence, multi-detector objects
  const priorityState = qubitFromProbability(quantumConf);
  const priorityEnhanced = rotationY(temporalStability * Math.PI * 0.3, priorityState);
  const quantumPriority = measureProbability(priorityEnhanced);

  // Detector agreement: fidelity between raw and calibrated quantum states
  const rawState = qubitFromProbability(det.confidence);
  const calState = qubitFromProbability(quantumConf);
  const detectorAgreement = fidelity(rawState, calState);

  return {
    ...det,
    rawConfidence: det.confidence,
    confidence: quantumConf, // replace with calibrated
    quantumConfidence: quantumConf,
    quantumPriority,
    temporalStability,
    detectorAgreement,
  };
}

/**
 * Enhance all detections from the real-time vision pipeline.
 * Applies quantum confidence calibration, temporal coherence, and priority scoring.
 */
export function enhanceVisionDetections(
  detections: UnifiedDetection[]
): VisionEnhancementResult {
  const start = performance.now();

  if (detections.length === 0) {
    return {
      detections: [],
      avgCalibrationDelta: 0,
      temporalCoherence: 0,
      enhancementMs: 0,
    };
  }

  const enhanced = detections.map(enhanceDetection);

  // Sort by quantum priority (most important first)
  enhanced.sort((a, b) => b.quantumPriority - a.quantumPriority);

  // Metrics
  const avgDelta = enhanced.reduce(
    (sum, d) => sum + Math.abs(d.quantumConfidence - d.rawConfidence), 0
  ) / enhanced.length;

  const avgTemporal = enhanced.reduce(
    (sum, d) => sum + d.temporalStability, 0
  ) / enhanced.length;

  return {
    detections: enhanced,
    avgCalibrationDelta: Math.round(avgDelta * 1000) / 1000,
    temporalCoherence: Math.round(avgTemporal * 1000) / 1000,
    enhancementMs: Math.round(performance.now() - start),
  };
}

/**
 * Format quantum-enhanced vision data for AI prompt.
 */
export function formatQuantumVisionForAI(result: VisionEnhancementResult): string {
  if (result.detections.length === 0) return "";
  const top = result.detections.slice(0, 8);
  const lines = [
    `⚛️ QUANTUM VISION: ${top.length} detections calibrated | ΔConf: ${(result.avgCalibrationDelta * 100).toFixed(1)}% | Temporal: ${(result.temporalCoherence * 100).toFixed(0)}%`,
    top.map(d =>
      `${d.namePt}(q:${(d.quantumConfidence * 100).toFixed(0)}% p:${(d.quantumPriority * 100).toFixed(0)}% t:${(d.temporalStability * 100).toFixed(0)}%)`
    ).join(", "),
  ];
  return lines.join(" | ");
}

/**
 * Get temporal memory statistics.
 */
export function getTemporalMemoryStats(): {
  totalEntries: number;
  activeEntries: number;
  avgSeenCount: number;
} {
  const now = Date.now();
  const entries = [..._temporalMemory.values()];
  const active = entries.filter(e => (now - e.lastSeen) < TEMPORAL_DECAY_MS);
  return {
    totalEntries: entries.length,
    activeEntries: active.length,
    avgSeenCount: entries.length > 0
      ? Math.round(entries.reduce((s, e) => s + e.seenCount, 0) / entries.length)
      : 0,
  };
}
