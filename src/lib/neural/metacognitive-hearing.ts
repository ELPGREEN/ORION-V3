/**
 * ─── Metacognitive Hearing Engine v1 ───
 * 
 * 5-Layer Auditory Metacognition for Orion:
 * 
 * Layer 1 — Primary Perception:
 *   ASR stream transcription + intent spectrum analysis
 * 
 * Layer 2 — Prosody Monitoring:
 *   Inflection/emphasis detection + acoustic sentiment analysis
 * 
 * Layer 3 — Auditory Metacognitive Filter:
 *   Transcription confidence gating + speaker diarization/isolation
 * 
 * Layer 4 — Reasoning Integration:
 *   Predictive anticipation buffer + interrupt triggers
 * 
 * Layer 5 — Echoic Memory:
 *   Short-term audio snapshots for re-analysis on reasoning failure
 */

// ═══════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════

export type AudioSourceType = "human_speech" | "system_echo" | "ambient_noise" | "command" | "unknown";
export type SpeakerIdentity = "owner" | "third_party" | "system_echo" | "unknown";
export type ProsodySignal = "neutral" | "emphasis" | "question" | "urgency" | "irony" | "frustration" | "calm";
export type InterruptPriority = "none" | "low" | "high" | "immediate";

/** Layer 1: Primary Perception */
export interface PrimaryPerception {
  /** Raw transcript from ASR */
  transcript: string;
  /** Confidence of ASR transcription (0-1) */
  asrConfidence: number;
  /** Detected audio source type */
  sourceType: AudioSourceType;
  /** Language detected */
  detectedLanguage: string;
  /** Duration of utterance in ms */
  utteranceDurationMs: number;
  /** Words per minute (speaking rate) */
  wordsPerMinute: number;
  /** Is the user still speaking? */
  isOngoing: boolean;
}

/** Layer 2: Prosody Monitoring */
export interface ProsodyAnalysis {
  /** Dominant prosodic signal */
  dominantSignal: ProsodySignal;
  /** Words that received emphasis (higher energy / caps / repetition) */
  emphasizedWords: string[];
  /** Acoustic sentiment: -1 (stressed/angry) to 1 (calm/happy) */
  acousticSentiment: number;
  /** Urgency level derived from prosody (0-1) */
  urgencyLevel: number;
  /** Irony probability (0-1) */
  ironyProbability: number;
  /** Stress level derived from speech rate + energy (0-1) */
  stressLevel: number;
  /** Inflection score: how much tonal variation (0=monotone, 1=dramatic) */
  inflectionScore: number;
}

/** Layer 3: Auditory Metacognitive Filter */
export interface AuditoryMetaFilter {
  /** Should the system ask to repeat? */
  shouldRequestRepeat: boolean;
  /** Reason for requesting repeat */
  repeatReason: string;
  /** Noise-adjusted confidence (lower than ASR if degraded) */
  adjustedConfidence: number;
  /** Speaker identity classification */
  speakerIdentity: SpeakerIdentity;
  /** Number of speakers detected */
  speakerCount: number;
  /** Audio quality score (0=garbled, 1=crystal clear) */
  audioQuality: number;
  /** Confusion noise level (0=clear, 1=unintelligible) */
  confusionNoise: number;
}

/** Layer 4: Reasoning Integration */
export interface ReasoningIntegration {
  /** Anticipation buffer: predicted next words/intent while user still speaks */
  anticipatedIntent: string;
  /** Confidence of anticipation (0-1) */
  anticipationConfidence: number;
  /** Interrupt trigger detected? */
  interruptDetected: boolean;
  /** Interrupt priority level */
  interruptPriority: InterruptPriority;
  /** Stop words detected */
  stopWordsDetected: string[];
  /** Partial processing started? (predictive audition) */
  predictiveProcessingActive: boolean;
  /** Tokens already pre-processed while user speaks */
  preProcessedTokens: number;
}

/** Layer 5: Echoic Memory */
export interface EchoicMemoryState {
  /** Number of audio snapshots retained */
  snapshotCount: number;
  /** Total duration of retained audio in ms */
  retainedDurationMs: number;
  /** Was re-analysis triggered? */
  reAnalysisTriggered: boolean;
  /** Nuances found on re-analysis */
  discoveredNuances: string[];
  /** Oldest snapshot age in ms */
  oldestSnapshotAgeMs: number;
  /** Memory utilization (0-1) */
  bufferUtilization: number;
}

/** Complete Metacognitive Hearing Result */
export interface MetacognitiveHearingResult {
  timestamp: number;
  perception: PrimaryPerception;
  prosody: ProsodyAnalysis;
  metaFilter: AuditoryMetaFilter;
  reasoning: ReasoningIntegration;
  echoicMemory: EchoicMemoryState;
  /** Overall hearing health score (0-1) */
  hearingHealth: number;
  /** Summary verdict for consciousness bridge */
  verdict: "clear" | "degraded" | "confused" | "interrupted";
}

// ═══════════════════════════════════════════════════════════════════
//  ECHOIC MEMORY BUFFER (ring buffer of audio snapshots)
// ═══════════════════════════════════════════════════════════════════

interface EchoicSnapshot {
  timestamp: number;
  transcript: string;
  confidence: number;
  durationMs: number;
  prosodySignal: ProsodySignal;
  energyLevel: number;
  speakerIdentity: SpeakerIdentity;
}

const _echoicBuffer: EchoicSnapshot[] = [];
const MAX_ECHOIC_SNAPSHOTS = 15; // ~30-45 seconds of audio
const ECHOIC_RETENTION_MS = 30_000; // 30 seconds

function pushEchoicSnapshot(snapshot: EchoicSnapshot): void {
  _echoicBuffer.push(snapshot);
  if (_echoicBuffer.length > MAX_ECHOIC_SNAPSHOTS) {
    _echoicBuffer.shift();
  }
}

function pruneExpiredSnapshots(): void {
  const cutoff = Date.now() - ECHOIC_RETENTION_MS;
  while (_echoicBuffer.length > 0 && _echoicBuffer[0].timestamp < cutoff) {
    _echoicBuffer.shift();
  }
}

function getEchoicState(): EchoicMemoryState {
  pruneExpiredSnapshots();
  const now = Date.now();
  const totalDuration = _echoicBuffer.reduce((sum, s) => sum + s.durationMs, 0);
  const oldest = _echoicBuffer.length > 0 ? now - _echoicBuffer[0].timestamp : 0;

  return {
    snapshotCount: _echoicBuffer.length,
    retainedDurationMs: totalDuration,
    reAnalysisTriggered: false,
    discoveredNuances: [],
    oldestSnapshotAgeMs: oldest,
    bufferUtilization: _echoicBuffer.length / MAX_ECHOIC_SNAPSHOTS,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  STOP WORDS / INTERRUPT DETECTION (Portuguese-focused)
// ═══════════════════════════════════════════════════════════════════

const STOP_WORDS = /\b(par[ae]|stop|não|cancela|silêncio|chega|espera|cala)\b/i;
const URGENCY_PATTERNS = /\b(urgent[ei]|agora|já|rápido|socorro|ajuda|emergen|pressa|imediato)\b/i;
const IRONY_PATTERNS = /\b(claro que sim|com certeza|tá bom|sei|aham)\b/i;
const EMPHASIS_MARKERS = /[!]{2,}|[A-ZÁÀÃÉÍÓÚÇ]{3,}/g;

// ═══════════════════════════════════════════════════════════════════
//  LAYER 1: PRIMARY PERCEPTION
// ═══════════════════════════════════════════════════════════════════

function analyzePerception(
  transcript: string,
  confidence: number,
  durationMs: number,
  isOngoing: boolean,
): PrimaryPerception {
  const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const wpm = durationMs > 0 ? (wordCount / (durationMs / 60000)) : 0;

  // Classify source type
  let sourceType: AudioSourceType = "human_speech";
  if (confidence < 0.2) sourceType = "ambient_noise";
  else if (transcript.startsWith("/") || transcript.startsWith("!")) sourceType = "command";

  // Rough language detection (PT vs EN)
  const ptMarkers = /\b(não|sim|obrigad|olá|como|fazer|pode|preciso|quero|está|isso|aqui)\b/i;
  const detectedLanguage = ptMarkers.test(transcript) ? "pt-BR" : "en";

  return {
    transcript,
    asrConfidence: confidence,
    sourceType,
    detectedLanguage,
    utteranceDurationMs: durationMs,
    wordsPerMinute: wpm,
    isOngoing,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 2: PROSODY MONITORING
// ═══════════════════════════════════════════════════════════════════

function analyzeProsody(
  transcript: string,
  wpm: number,
  energyLevel: number,
): ProsodyAnalysis {
  const exclamations = (transcript.match(/!/g) || []).length;
  const questions = (transcript.match(/\?/g) || []).length;
  const capsWords = transcript.match(/[A-ZÁÀÃÉÍÓÚÇ]{3,}/g) || [];
  const urgencyMatch = transcript.match(URGENCY_PATTERNS);
  const ironyMatch = transcript.match(IRONY_PATTERNS);

  // Emphasized words: caps, repeated, or surrounded by emphasis markers
  const emphasizedWords: string[] = [...capsWords];
  const repeated = transcript.match(/\b(\w+)\s+\1\b/gi);
  if (repeated) emphasizedWords.push(...repeated.map(r => r.split(/\s+/)[0]));

  // Urgency from speed + emphasis + keywords
  const speedFactor = Math.min(1, wpm / 200);
  const urgencyLevel = Math.min(1,
    (urgencyMatch ? 0.4 : 0) +
    exclamations * 0.15 +
    speedFactor * 0.2 +
    energyLevel * 0.25
  );

  // Acoustic sentiment: positive keywords vs negative
  const posWords = /\b(obrigad|perfeito|ótimo|excelente|legal|bom|gostei|amei|feliz)\b/i;
  const negWords = /\b(merda|droga|raiva|irritad|frustrad|péssim|horrível|odei)\b/i;
  const pos = (transcript.match(new RegExp(posWords.source, "gi")) || []).length;
  const neg = (transcript.match(new RegExp(negWords.source, "gi")) || []).length;
  const acousticSentiment = (pos - neg) / (pos + neg + 1);

  // Stress from speed variance and energy
  const stressLevel = Math.min(1, urgencyLevel * 0.6 + (neg > 0 ? 0.3 : 0) + (wpm > 180 ? 0.2 : 0));

  // Inflection: tonal variation proxy from punctuation diversity
  const punctTypes = new Set([exclamations > 0 ? "!" : "", questions > 0 ? "?" : "", transcript.includes("...") ? "..." : ""].filter(Boolean));
  const inflectionScore = Math.min(1, punctTypes.size * 0.3 + capsWords.length * 0.1 + energyLevel * 0.2);

  // Dominant signal
  let dominantSignal: ProsodySignal = "neutral";
  if (urgencyMatch && urgencyLevel > 0.5) dominantSignal = "urgency";
  else if (ironyMatch) dominantSignal = "irony";
  else if (questions > exclamations && questions > 0) dominantSignal = "question";
  else if (exclamations > 1 || capsWords.length > 1) dominantSignal = "emphasis";
  else if (stressLevel > 0.6) dominantSignal = "frustration";
  else if (acousticSentiment > 0.3 && stressLevel < 0.3) dominantSignal = "calm";

  return {
    dominantSignal,
    emphasizedWords: [...new Set(emphasizedWords)].slice(0, 5),
    acousticSentiment: Math.max(-1, Math.min(1, acousticSentiment)),
    urgencyLevel,
    ironyProbability: ironyMatch ? 0.6 + (acousticSentiment < -0.1 ? 0.2 : 0) : 0,
    stressLevel,
    inflectionScore,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 3: AUDITORY METACOGNITIVE FILTER
// ═══════════════════════════════════════════════════════════════════

function analyzeMetaFilter(
  transcript: string,
  asrConfidence: number,
  energyLevel: number,
  speakerHint?: SpeakerIdentity,
): AuditoryMetaFilter {
  // Noise-adjusted confidence
  const noiseFactor = energyLevel < 0.1 ? 0.7 : energyLevel > 0.9 ? 0.85 : 1.0;
  const shortUtterance = transcript.trim().split(/\s+/).length < 3;
  const adjustedConfidence = asrConfidence * noiseFactor * (shortUtterance ? 0.9 : 1.0);

  // Confusion noise: how garbled is the audio?
  const confusionNoise = Math.max(0, 1 - adjustedConfidence);

  // Should request repeat?
  const shouldRequestRepeat = adjustedConfidence < 0.45 && transcript.length > 3;
  const repeatReason = shouldRequestRepeat
    ? adjustedConfidence < 0.3
      ? "Áudio muito degradado — transcrição não confiável"
      : "Baixa confiança na transcrição — possível ruído"
    : "";

  // Audio quality
  const audioQuality = Math.min(1, adjustedConfidence * 0.7 + (1 - confusionNoise) * 0.3);

  // Speaker identity (simplified without real diarization)
  const speakerIdentity = speakerHint || "owner";

  return {
    shouldRequestRepeat,
    repeatReason,
    adjustedConfidence,
    speakerIdentity,
    speakerCount: 1,
    audioQuality,
    confusionNoise,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 4: REASONING INTEGRATION
// ═══════════════════════════════════════════════════════════════════

/** Intent anticipation patterns (Portuguese) */
const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: string; confidence: number }> = [
  { pattern: /\b(mostr[ae]|exib[ae]|abre?)\b/i, intent: "display_request", confidence: 0.7 },
  { pattern: /\b(cri[ae]|faz|gera|adiciona)\b/i, intent: "create_request", confidence: 0.7 },
  { pattern: /\b(busca|procura|encontra|pesquisa)\b/i, intent: "search_request", confidence: 0.75 },
  { pattern: /\b(explica|como|por\s*que|o\s*que)\b/i, intent: "explanation_request", confidence: 0.65 },
  { pattern: /\b(configura|ajusta|muda|altera)\b/i, intent: "config_request", confidence: 0.7 },
  { pattern: /\b(envia|manda|compartilha)\b/i, intent: "send_request", confidence: 0.7 },
  { pattern: /\b(delet[ae]|remov[ae]|apaga)\b/i, intent: "delete_request", confidence: 0.75 },
];

function analyzeReasoningIntegration(
  transcript: string,
  isOngoing: boolean,
): ReasoningIntegration {
  // Stop word detection
  const stopMatch = transcript.match(STOP_WORDS);
  const stopWordsDetected = stopMatch ? [stopMatch[0]] : [];

  // Interrupt detection
  const interruptDetected = stopWordsDetected.length > 0;
  let interruptPriority: InterruptPriority = "none";
  if (interruptDetected) {
    const word = stopWordsDetected[0].toLowerCase();
    if (["para", "pare", "stop", "cala"].includes(word)) interruptPriority = "immediate";
    else if (["não", "cancela"].includes(word)) interruptPriority = "high";
    else interruptPriority = "low";
  }

  // Intent anticipation (predictive audition)
  let anticipatedIntent = "unknown";
  let anticipationConfidence = 0;
  for (const { pattern, intent, confidence } of INTENT_PATTERNS) {
    if (pattern.test(transcript)) {
      anticipatedIntent = intent;
      anticipationConfidence = confidence;
      break;
    }
  }

  return {
    anticipatedIntent,
    anticipationConfidence,
    interruptDetected,
    interruptPriority,
    stopWordsDetected,
    predictiveProcessingActive: isOngoing && anticipationConfidence > 0.5,
    preProcessedTokens: isOngoing ? Math.floor(transcript.split(/\s+/).length * 0.6) : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 5: ECHOIC MEMORY RE-ANALYSIS
// ═══════════════════════════════════════════════════════════════════

function reAnalyzeEchoicMemory(currentConfidence: number): EchoicMemoryState {
  const state = getEchoicState();

  // Trigger re-analysis if current confidence is low but we have prior snapshots
  if (currentConfidence < 0.5 && _echoicBuffer.length >= 2) {
    state.reAnalysisTriggered = true;
    const nuances: string[] = [];

    // Look for patterns across recent snapshots
    const recentTranscripts = _echoicBuffer.slice(-3).map(s => s.transcript);
    const combined = recentTranscripts.join(" ");

    // Check if fragments form a coherent sentence
    if (combined.split(/\s+/).length > 5) {
      nuances.push("Fragmentos recentes formam frase coerente quando combinados");
    }

    // Check for prosody consistency
    const signals = _echoicBuffer.slice(-3).map(s => s.prosodySignal);
    if (signals.every(s => s === signals[0])) {
      nuances.push(`Prosódia consistente: ${signals[0]}`);
    }

    // Check for escalating energy
    const energies = _echoicBuffer.slice(-3).map(s => s.energyLevel);
    if (energies.length >= 2 && energies[energies.length - 1] > energies[0] + 0.2) {
      nuances.push("Energia crescente detectada — possível frustração");
    }

    state.discoveredNuances = nuances;
  }

  return state;
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN: Process Metacognitive Hearing
// ═══════════════════════════════════════════════════════════════════

let _lastHearingResult: MetacognitiveHearingResult | null = null;

export function processMetacognitiveHearing(
  transcript: string,
  confidence: number = 0.8,
  durationMs: number = 3000,
  energyLevel: number = 0.5,
  isOngoing: boolean = false,
  speakerHint?: SpeakerIdentity,
): MetacognitiveHearingResult {
  const now = Date.now();

  // Layer 1: Primary Perception
  const perception = analyzePerception(transcript, confidence, durationMs, isOngoing);

  // Layer 2: Prosody Monitoring
  const prosody = analyzeProsody(transcript, perception.wordsPerMinute, energyLevel);

  // Layer 3: Auditory Metacognitive Filter
  const metaFilter = analyzeMetaFilter(transcript, confidence, energyLevel, speakerHint);

  // Layer 4: Reasoning Integration
  const reasoning = analyzeReasoningIntegration(transcript, isOngoing);

  // Layer 5: Echoic Memory
  pushEchoicSnapshot({
    timestamp: now,
    transcript,
    confidence,
    durationMs,
    prosodySignal: prosody.dominantSignal,
    energyLevel,
    speakerIdentity: metaFilter.speakerIdentity,
  });
  const echoicMemory = reAnalyzeEchoicMemory(metaFilter.adjustedConfidence);

  // Overall hearing health
  const hearingHealth = Math.min(1,
    metaFilter.audioQuality * 0.3 +
    metaFilter.adjustedConfidence * 0.3 +
    (1 - prosody.stressLevel) * 0.1 +
    (reasoning.interruptDetected ? 0 : 0.15) +
    (echoicMemory.bufferUtilization > 0.2 ? 0.15 : 0.05)
  );

  // Verdict
  let verdict: MetacognitiveHearingResult["verdict"] = "clear";
  if (reasoning.interruptDetected) verdict = "interrupted";
  else if (metaFilter.adjustedConfidence < 0.4) verdict = "confused";
  else if (metaFilter.adjustedConfidence < 0.65 || prosody.stressLevel > 0.6) verdict = "degraded";

  _lastHearingResult = {
    timestamp: now,
    perception,
    prosody,
    metaFilter,
    reasoning,
    echoicMemory,
    hearingHealth,
    verdict,
  };

  return _lastHearingResult;
}

// ═══════════════════════════════════════════════════════════════════
//  ACCESSORS
// ═══════════════════════════════════════════════════════════════════

export function getLastHearingResult(): MetacognitiveHearingResult | null {
  return _lastHearingResult;
}

export function getEchoicBuffer(): ReadonlyArray<EchoicSnapshot> {
  pruneExpiredSnapshots();
  return _echoicBuffer;
}

/** Get a summary suitable for the consciousness bridge */
export function getHearingSummaryForBridge(): {
  verdict: string;
  confidence: number;
  prosody: string;
  interrupt: boolean;
  anticipatedIntent: string;
  echoicSnapshots: number;
} {
  const r = _lastHearingResult;
  if (!r) return {
    verdict: "idle",
    confidence: 0,
    prosody: "neutral",
    interrupt: false,
    anticipatedIntent: "none",
    echoicSnapshots: 0,
  };

  return {
    verdict: r.verdict,
    confidence: r.metaFilter.adjustedConfidence,
    prosody: r.prosody.dominantSignal,
    interrupt: r.reasoning.interruptDetected,
    anticipatedIntent: r.reasoning.anticipatedIntent,
    echoicSnapshots: r.echoicMemory.snapshotCount,
  };
}

/** Reset echoic memory (e.g., on session end) */
export function clearEchoicMemory(): void {
  _echoicBuffer.length = 0;
  _lastHearingResult = null;
}
