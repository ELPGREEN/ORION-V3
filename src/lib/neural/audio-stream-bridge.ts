/**
 * ─── Audio Stream Bridge ───
 * Extracts proxy acoustic features from voice transcripts and vocal metrics,
 * then feeds them through the Mamba-Audio pipeline for neural embedding.
 * 
 * This bridges the gap between Web Speech API (text-only) and the
 * multimodal fusion system that expects raw audio feature vectors.
 */

import { processAudioStream, audioToEmbedding, fuseAudioText, type AudioStreamConfig, DEFAULT_AUDIO_CONFIG, type AudioPipelineResult, type AudioEmbedding } from "./multimodal-mamba-audio";

// ─── Types ───

export interface VocalMetrics {
  transcript: string;
  durationMs: number;         // How long the utterance lasted
  wordCount: number;
  wordsPerMinute: number;     // Speaking speed proxy
  energyLevel: number;        // 0-1, derived from caps/punctuation/length
  emotionalValence: number;   // -1 to 1
  confidence: number;         // 0-1, transcript confidence
}

export interface AudioBridgeResult {
  embedding: number[];           // 768d audio embedding
  vocalMetrics: VocalMetrics;
  pipelineResult: AudioPipelineResult;
  streamVector: number[];        // Raw feature vector for fuseStreams
}

// ─── Emotion Keywords (Portuguese) ───

const POSITIVE_KEYWORDS = /\b(obrigad[oa]|perfeito|[oó]timo|excelente|maravilh|incr[ií]vel|legal|bom|boa|gostei|amei|parab[eé]ns|feliz|alegr[ei]|satisf|graci|agrad)\b/i;
const NEGATIVE_KEYWORDS = /\b(merda|droga|p[oô]rra|erro|falha|bug|problem|ruim|horrível|horr[ií]vel|péssim|pessim|raiva|frustrad|irritad|bravo|odei[eo]|não\s+funciona|não\s+consigo|trava|lento|demora)\b/i;
const URGENCY_KEYWORDS = /\b(urgent[ei]|agora|já|rápido|r[aá]pido|imediato|socorro|ajuda|emergen|pressa)\b/i;

// ─── Extract Vocal Metrics from Transcript ───

export function extractVocalMetrics(
  transcript: string,
  durationMs: number = 3000,
  speechConfidence: number = 0.8,
): VocalMetrics {
  const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const wordsPerMinute = durationMs > 0 ? (wordCount / (durationMs / 60000)) : 120;

  // Energy from punctuation, caps, length
  const exclamations = (transcript.match(/!/g) || []).length;
  const questions = (transcript.match(/\?/g) || []).length;
  const capsRatio = transcript.replace(/[^a-zA-Z]/g, "").length > 0
    ? (transcript.replace(/[^A-Z]/g, "").length / transcript.replace(/[^a-zA-Z]/g, "").length)
    : 0;
  const lengthFactor = Math.min(1, wordCount / 30);
  const speedFactor = Math.min(1, wordsPerMinute / 200);
  const energyLevel = Math.min(1, (exclamations * 0.15 + questions * 0.05 + capsRatio * 0.3 + lengthFactor * 0.3 + speedFactor * 0.2));

  // Emotional valence
  const posMatches = (transcript.match(new RegExp(POSITIVE_KEYWORDS.source, "gi")) || []).length;
  const negMatches = (transcript.match(new RegExp(NEGATIVE_KEYWORDS.source, "gi")) || []).length;
  const urgencyMatches = (transcript.match(new RegExp(URGENCY_KEYWORDS.source, "gi")) || []).length;
  const total = posMatches + negMatches + urgencyMatches + 1;
  const emotionalValence = (posMatches - negMatches - urgencyMatches * 0.5) / total;

  return {
    transcript,
    durationMs,
    wordCount,
    wordsPerMinute,
    energyLevel,
    emotionalValence: Math.max(-1, Math.min(1, emotionalValence)),
    confidence: speechConfidence,
  };
}

// ─── Generate Audio Feature Vector from Vocal Metrics ───

function metricsToAudioFeatures(metrics: VocalMetrics, targetLength: number = 64): number[] {
  const features = new Array(targetLength).fill(0);
  const { wordsPerMinute, energyLevel, emotionalValence, confidence, wordCount } = metrics;

  // Encode prosodic features as pseudo-audio signal
  for (let i = 0; i < targetLength; i++) {
    const t = i / targetLength;
    // Base frequency modulated by speaking speed
    const speedMod = Math.sin(t * Math.PI * 2 * (wordsPerMinute / 60));
    // Energy envelope
    const energyEnv = energyLevel * Math.exp(-Math.pow(t - 0.5, 2) * 4);
    // Emotional coloring (positive = higher harmonics, negative = lower)
    const emotionMod = emotionalValence * Math.sin(t * Math.PI * 4) * 0.3;
    // Confidence as amplitude
    const confAmp = 0.5 + confidence * 0.5;

    features[i] = (speedMod * 0.4 + energyEnv * 0.3 + emotionMod + wordCount * 0.002) * confAmp;
  }

  return features;
}

// ─── Main Bridge: Transcript → Mamba-Audio → Embedding ───

let _lastAudioResult: AudioBridgeResult | null = null;

export function processVoiceTranscript(
  transcript: string,
  durationMs: number = 3000,
  speechConfidence: number = 0.8,
  textSpikeTimes: number[] = [],
): AudioBridgeResult {
  const metrics = extractVocalMetrics(transcript, durationMs, speechConfidence);
  const audioFeatures = metricsToAudioFeatures(metrics);

  // Split into chunks for the pipeline (simulate 300ms windows)
  const chunkSize = Math.max(8, Math.floor(audioFeatures.length / 4));
  const chunks: number[][] = [];
  for (let i = 0; i < audioFeatures.length; i += chunkSize) {
    chunks.push(audioFeatures.slice(i, i + chunkSize));
  }

  // Run through Mamba-Audio pipeline
  const pipelineResult = processAudioStream(chunks, textSpikeTimes, {
    ...DEFAULT_AUDIO_CONFIG,
    useSTDP: textSpikeTimes.length > 0,
    useSpeakerDiarization: true,
  });

  // Get primary embedding
  const primaryEmbedding = pipelineResult.embeddings.length > 0
    ? pipelineResult.embeddings[0]
    : audioToEmbedding(audioFeatures);

  _lastAudioResult = {
    embedding: primaryEmbedding.embedding,
    vocalMetrics: metrics,
    pipelineResult,
    streamVector: audioFeatures,
  };

  return _lastAudioResult;
}

// ─── Fuse with Text Embedding ───

export function fuseAudioWithText(
  audioEmbedding: number[],
  textEmbedding: number[],
): number[] {
  return fuseAudioText(audioEmbedding, textEmbedding);
}

// ─── Accessors ───

export function getLastAudioBridgeResult(): AudioBridgeResult | null {
  return _lastAudioResult;
}

export function getAudioStreamForFusion(): number[] | undefined {
  return _lastAudioResult?.streamVector;
}
