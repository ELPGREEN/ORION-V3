/**
 * ─── Camada 10: Espelhamento Neural (Neural Mirroring) ───
 * Extends Theory of Mind with mirror neuron-inspired empathic simulation.
 *
 * - Mirrors user communication style (formal/casual/technical/emotional)
 * - Predicts user emotional reaction before responding
 * - Integrates facial-recognition + body-language for visual empathy input
 *
 * Ref: Rizzolatti & Craighero (2004) "The mirror-neuron system"
 *      Gallese (2003) "The manifold nature of interpersonal relations"
 *      Gazzola (2026) "Introdução à Cognição Incorporada"
 */

import type { UserMentalModel, ReactionPrediction } from "./theory-of-mind";
type BodyLanguageSignal = { type: string; confidence: number; description: string };
type BodyLanguageResult = { signals: BodyLanguageSignal[]; overallConfidence: number; dominantSignal: string };
type FacialEmotion = string;
import type { InteroceptiveState } from "./interoception-engine";

// ─── Types ───

export type CommunicationStyle = "formal" | "casual" | "technical" | "emotional" | "mixed";
export type EmpathyLevel = "high" | "moderate" | "low" | "uncertain";

export interface MirroringProfile {
  userId: string;
  /** Detected communication style */
  style: CommunicationStyle;
  /** Style confidence (0-1) */
  styleConfidence: number;
  /** Vocabulary complexity: 0 (simple) to 1 (complex) */
  vocabularyComplexity: number;
  /** Average message length (words) */
  avgMessageLength: number;
  /** Emoji/emoticon usage frequency (0-1) */
  emojiUsage: number;
  /** Preferred response length: short, medium, long */
  preferredResponseLength: "short" | "medium" | "long";
  /** Linguistic patterns (repeated phrases, keywords) */
  linguisticPatterns: string[];
  /** Cultural markers detected */
  culturalMarkers: string[];
  /** Interaction tempo: fast, moderate, slow */
  tempo: "fast" | "moderate" | "slow";
  /** Last updated */
  lastUpdated: number;
  /** Sample count */
  sampleCount: number;
}

export interface EmpathicSimulation {
  /** Predicted emotional reaction to a proposed response */
  predictedReaction: {
    valence: number;   // -1 to 1
    arousal: number;   // 0 to 1
    emotion: string;   // "satisfied", "confused", "frustrated", etc.
  };
  /** Empathy level assessment */
  empathyLevel: EmpathyLevel;
  /** Should the response be adjusted? */
  shouldAdjust: boolean;
  /** Suggested adjustments */
  adjustments: string[];
  /** Visual cues that informed the simulation */
  visualCues: VisualEmpathyCue[];
  /** Confidence in prediction */
  confidence: number;
}

export interface VisualEmpathyCue {
  source: "facial" | "body" | "behavioral";
  signal: string;
  emotionalHint: "positive" | "negative" | "neutral";
  weight: number;
}

export interface MirroringState {
  profiles: Map<string, MirroringProfile>;
  simulations: number;
  adjustmentsMade: number;
  accuracyFeedback: number[];
}

// ─── Constants ───

const MIRROR_CACHE_KEY = "orion_neural_mirroring";
const MAX_PROFILES = 50;
const MIN_SAMPLES_FOR_MIRRORING = 3;
const STYLE_LEARNING_RATE = 0.2;

// ─── State ───

let _state: MirroringState = loadState();

function loadState(): MirroringState {
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( MIRROR_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...parsed, profiles: new Map(Object.entries(parsed.profiles || {})) };
    }
  } catch { /* silent */ }
  return { profiles: new Map(), simulations: 0, adjustmentsMade: 0, accuracyFeedback: [] };
}

function persist(): void {
  try {
    const serializable = { ..._state, profiles: Object.fromEntries(_state.profiles) };
    if (typeof window !== "undefined") localStorage.setItem(MIRROR_CACHE_KEY, JSON.stringify(serializable));
  } catch { /* silent */ }
}

// ─── Communication Style Analysis ───

/**
 * Analyze a user message to update their mirroring profile.
 */
export function analyzeUserMessage(userId: string, message: string): MirroringProfile {
  const existing = _state.profiles.get(userId);
  const analysis = analyzeMessageStyle(message);

  if (existing) {
    const lr = STYLE_LEARNING_RATE;
    existing.style = analysis.style;
    existing.styleConfidence = existing.styleConfidence * (1 - lr) + analysis.confidence * lr;
    existing.vocabularyComplexity = existing.vocabularyComplexity * (1 - lr) + analysis.complexity * lr;
    existing.avgMessageLength = existing.avgMessageLength * (1 - lr) + analysis.wordCount * lr;
    existing.emojiUsage = existing.emojiUsage * (1 - lr) + analysis.emojiDensity * lr;
    existing.preferredResponseLength = inferResponseLength(existing.avgMessageLength);
    existing.tempo = analysis.tempo;
    existing.sampleCount++;
    existing.lastUpdated = Date.now();

    // Accumulate linguistic patterns
    for (const p of analysis.patterns) {
      if (!existing.linguisticPatterns.includes(p)) {
        existing.linguisticPatterns.push(p);
        if (existing.linguisticPatterns.length > 20) existing.linguisticPatterns.shift();
      }
    }

    _state.profiles.set(userId, existing);
    persist();
    return existing;
  }

  const profile: MirroringProfile = {
    userId,
    style: analysis.style,
    styleConfidence: analysis.confidence,
    vocabularyComplexity: analysis.complexity,
    avgMessageLength: analysis.wordCount,
    emojiUsage: analysis.emojiDensity,
    preferredResponseLength: inferResponseLength(analysis.wordCount),
    linguisticPatterns: analysis.patterns,
    culturalMarkers: analysis.culturalMarkers,
    tempo: analysis.tempo,
    lastUpdated: Date.now(),
    sampleCount: 1,
  };

  _state.profiles.set(userId, profile);
  if (_state.profiles.size > MAX_PROFILES) {
    // Remove oldest
    const entries = Array.from(_state.profiles.entries());
    entries.sort((a, b) => b[1].lastUpdated - a[1].lastUpdated);
    _state.profiles = new Map(entries.slice(0, MAX_PROFILES));
  }

  persist();
  return profile;
}

/**
 * Get mirroring recommendations for how to respond to a user.
 */
export function getMirroringRecommendations(userId: string): {
  style: CommunicationStyle;
  responseLength: "short" | "medium" | "long";
  useEmoji: boolean;
  formalityLevel: number;
  recommendations: string[];
} | null {
  const profile = _state.profiles.get(userId);
  if (!profile || profile.sampleCount < MIN_SAMPLES_FOR_MIRRORING) return null;

  return {
    style: profile.style,
    responseLength: profile.preferredResponseLength,
    useEmoji: profile.emojiUsage > 0.1,
    formalityLevel: profile.style === "formal" ? 0.9 : profile.style === "casual" ? 0.3 : 0.6,
    recommendations: generateMirroringRecommendations(profile),
  };
}

// ─── Empathic Simulation ───

/**
 * Simulate the user's emotional reaction to a proposed response.
 * Uses mirror neuron-inspired processing: "how would I feel if I received this?"
 */
export function simulateEmpathicReaction(
  userId: string,
  proposedResponse: string,
  userMentalModel: Partial<UserMentalModel> | null,
  visualCues: { bodySignals?: BodyLanguageResult[]; facialEmotion?: FacialEmotion } = {},
  systemState?: InteroceptiveState,
): EmpathicSimulation {
  _state.simulations++;

  const profile = _state.profiles.get(userId);
  const cues: VisualEmpathyCue[] = [];

  // Process body language cues
  if (visualCues.bodySignals) {
    for (const bs of visualCues.bodySignals as any[]) {
      const hint = (bs.emotionalHint === "ambiguous" ? "neutral" : bs.emotionalHint) as "positive" | "negative" | "neutral";
      cues.push({
        source: "body",
        signal: bs.signal || bs.type || "unknown",
        emotionalHint: hint,
        weight: bs.confidence || 0.5,
      });
    }
  }

  // Process facial emotion
  if (visualCues.facialEmotion) {
    cues.push({
      source: "facial",
      signal: visualCues.facialEmotion,
      emotionalHint: mapFacialToHint(visualCues.facialEmotion),
      weight: 0.8,
    });
  }

  // Compute predicted reaction
  let predictedValence = 0.3; // Default mildly positive
  let predictedArousal = 0.3;

  // Adjust based on user's current emotional state
  if (userMentalModel?.emotionalState) {
    predictedValence = userMentalModel.emotionalState.valence * 0.3 + 0.3;
    predictedArousal = userMentalModel.emotionalState.arousal;
  }

  // Adjust based on visual cues
  for (const cue of cues) {
    const sign = cue.emotionalHint === "positive" ? 0.1 : cue.emotionalHint === "negative" ? -0.1 : 0;
    predictedValence += sign * cue.weight;
  }

  // Adjust based on style match
  if (profile) {
    const responseLenMatch = checkLengthMatch(proposedResponse, profile.preferredResponseLength);
    predictedValence += responseLenMatch ? 0.1 : -0.05;
  }

  // Adjust based on frustration level
  if (userMentalModel?.frustrationLevel && userMentalModel.frustrationLevel > 0.5) {
    predictedValence -= 0.15;
    predictedArousal += 0.1;
  }

  predictedValence = clamp(predictedValence, -1, 1);
  predictedArousal = clamp(predictedArousal, 0, 1);

  const emotion = inferEmotion(predictedValence, predictedArousal);
  const shouldAdjust = predictedValence < 0 || (userMentalModel?.frustrationLevel ?? 0) > 0.6;
  const adjustments = shouldAdjust ? generateAdjustments(predictedValence, predictedArousal, profile, userMentalModel) : [];

  if (shouldAdjust) _state.adjustmentsMade++;
  persist();

  return {
    predictedReaction: { valence: predictedValence, arousal: predictedArousal, emotion },
    empathyLevel: cues.length > 2 ? "high" : cues.length > 0 ? "moderate" : "low",
    shouldAdjust,
    adjustments,
    visualCues: cues,
    confidence: computeSimulationConfidence(profile, cues, userMentalModel),
  };
}

/**
 * Get mirroring statistics.
 */
export function getMirroringStats() {
  return {
    trackedUsers: _state.profiles.size,
    totalSimulations: _state.simulations,
    adjustmentsMade: _state.adjustmentsMade,
    adjustmentRate: _state.simulations > 0 ? _state.adjustmentsMade / _state.simulations : 0,
    avgAccuracy: _state.accuracyFeedback.length > 0
      ? _state.accuracyFeedback.reduce((s, v) => s + v, 0) / _state.accuracyFeedback.length
      : 0,
  };
}

// ─── Internal Helpers ───

interface MessageAnalysis {
  style: CommunicationStyle;
  confidence: number;
  complexity: number;
  wordCount: number;
  emojiDensity: number;
  patterns: string[];
  culturalMarkers: string[];
  tempo: "fast" | "moderate" | "slow";
}

function analyzeMessageStyle(message: string): MessageAnalysis {
  const words = message.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Vocabulary complexity
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / Math.max(1, wordCount);
  const complexity = clamp((avgWordLen - 3) / 6); // 3-9 chars → 0-1

  // Emoji detection
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/gu;
  const emojiCount = (message.match(emojiRegex) || []).length;
  const emojiDensity = wordCount > 0 ? emojiCount / wordCount : 0;

  // Style detection
  const hasFormality = /\b(prezado|senhor|senhora|cordialmente|atenciosamente)\b/i.test(message);
  const hasCasual = /\b(oi|eai|blz|vlw|tbm|kk|rs|haha)\b/i.test(message);
  const hasTechnical = /\b(api|function|query|endpoint|deploy|config|typescript|react|sql)\b/i.test(message);
  const hasEmotional = /[!]{2,}|❤|😭|😍|💔|\b(amo|odeio|incrível|horrível|maravilhoso)\b/i.test(message);

  let style: CommunicationStyle = "mixed";
  let confidence = 0.5;
  if (hasFormality) { style = "formal"; confidence = 0.8; }
  else if (hasTechnical) { style = "technical"; confidence = 0.75; }
  else if (hasCasual) { style = "casual"; confidence = 0.7; }
  else if (hasEmotional) { style = "emotional"; confidence = 0.7; }

  // Extract patterns (repeated words with 3+ chars)
  const wordFreq = new Map<string, number>();
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[^a-záàâãéèêíïóôõúüç]/g, "");
    if (lower.length >= 4) wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
  }
  const patterns = Array.from(wordFreq.entries())
    .filter(([, count]) => count >= 2)
    .map(([word]) => word)
    .slice(0, 5);

  // Cultural markers
  const culturalMarkers: string[] = [];
  if (/\b(por favor|obrigado|obrigada)\b/i.test(message)) culturalMarkers.push("pt-BR polite");
  if (/\b(please|thanks|thank you)\b/i.test(message)) culturalMarkers.push("en formal");

  // Tempo inference (based on message length — shorter = faster tempo)
  const tempo = wordCount < 10 ? "fast" : wordCount < 40 ? "moderate" : "slow";

  return { style, confidence, complexity, wordCount, emojiDensity, patterns, culturalMarkers, tempo };
}

function inferResponseLength(avgUserLen: number): "short" | "medium" | "long" {
  if (avgUserLen < 15) return "short";
  if (avgUserLen < 50) return "medium";
  return "long";
}

function generateMirroringRecommendations(profile: MirroringProfile): string[] {
  const recs: string[] = [];
  if (profile.style === "formal") recs.push("Use linguagem formal e tratamento respeitoso");
  if (profile.style === "casual") recs.push("Seja informal e direto, use linguagem coloquial");
  if (profile.style === "technical") recs.push("Inclua detalhes técnicos e referências de código");
  if (profile.style === "emotional") recs.push("Mostre empatia e valide sentimentos do usuário");
  if (profile.emojiUsage > 0.15) recs.push("Inclua emojis na resposta");
  if (profile.preferredResponseLength === "short") recs.push("Mantenha a resposta concisa");
  if (profile.tempo === "fast") recs.push("Responda rapidamente, priorizando velocidade");
  return recs;
}

function mapFacialToHint(emotion: FacialEmotion): "positive" | "negative" | "neutral" {
  const positive: FacialEmotion[] = ["joy", "surprise"];
  const negative: FacialEmotion[] = ["sadness", "anger", "fear", "disgust", "contempt"];
  if (positive.includes(emotion)) return "positive";
  if (negative.includes(emotion)) return "negative";
  return "neutral";
}

function checkLengthMatch(response: string, preferred: "short" | "medium" | "long"): boolean {
  const words = response.split(/\s+/).length;
  if (preferred === "short" && words < 30) return true;
  if (preferred === "medium" && words >= 15 && words <= 80) return true;
  if (preferred === "long" && words > 40) return true;
  return false;
}

function inferEmotion(valence: number, arousal: number): string {
  if (valence > 0.5 && arousal > 0.5) return "entusiasmado";
  if (valence > 0.3 && arousal < 0.4) return "satisfeito";
  if (valence > 0) return "contente";
  if (valence < -0.5 && arousal > 0.5) return "frustrado";
  if (valence < -0.3) return "insatisfeito";
  if (arousal > 0.6) return "ansioso";
  return "neutro";
}

function generateAdjustments(
  valence: number,
  arousal: number,
  profile: MirroringProfile | undefined,
  mentalModel: Partial<UserMentalModel> | null,
): string[] {
  const adj: string[] = [];
  if (valence < -0.3) adj.push("Suavize o tom da resposta");
  if (arousal > 0.7) adj.push("Reduza a complexidade, use linguagem calmante");
  if (mentalModel?.frustrationLevel && mentalModel.frustrationLevel > 0.6) {
    adj.push("Reconheça a frustração do usuário antes de responder");
    adj.push("Ofereça alternativa direta sem explicações longas");
  }
  if (profile?.style === "casual" && valence < 0) adj.push("Use tom amigável e encorajador");
  return adj;
}

function computeSimulationConfidence(
  profile: MirroringProfile | undefined,
  cues: VisualEmpathyCue[],
  mentalModel: Partial<UserMentalModel> | null,
): number {
  let conf = 0.3;
  if (profile && profile.sampleCount >= MIN_SAMPLES_FOR_MIRRORING) conf += 0.2;
  if (cues.length > 0) conf += 0.2;
  if (mentalModel?.emotionalState) conf += 0.15;
  if (mentalModel?.frustrationLevel !== undefined) conf += 0.1;
  return Math.min(1, conf);
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}
