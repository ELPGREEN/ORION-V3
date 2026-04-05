/**
 * ─── v22.0: Multimodal Mamba Audio Stream ───
 * Auditory cortex analogy — audio processing via selective SSM.
 * 
 * Features:
 * - Mamba-Audio Block: SSM optimized for audio windows (200-500ms phonemes)
 * - Audio-to-embedding conversion (768d aligned with text embeddings)
 * - Gated audio-text fusion
 * - STDP temporal binding for audio-text synchronization
 * - Speaker diarization scoring
 * 
 * Ref: Gu & Dao (2023) Mamba, Baevski et al. (2020) wav2vec 2.0,
 *      Hsu et al. (2021) HuBERT, Radford et al. (2023) Whisper
 */

// ─── Types ───

export interface AudioStreamConfig {
  dState: number;         // SSM state dimension (default 16)
  windowMs: number;       // Audio window in ms (200-500 for phonemes)
  overlapMs: number;      // Overlap between windows
  embeddingDim: number;   // Output embedding dimension (768)
  sampleRate: number;     // Audio sample rate (16000 Hz)
  nMelBands: number;      // Mel spectrogram bands (80)
  useSTDP: boolean;       // Enable STDP temporal binding
  useSpeakerDiarization: boolean;
}

export const DEFAULT_AUDIO_CONFIG: AudioStreamConfig = {
  dState: 16,
  windowMs: 300,
  overlapMs: 50,
  embeddingDim: 768,
  sampleRate: 16000,
  nMelBands: 80,
  useSTDP: true,
  useSpeakerDiarization: true,
};

export interface AudioEmbedding {
  embedding: number[];     // 768d vector
  confidence: number;      // 0-1
  speakerScore: number;    // Speaker change probability
  phonemeWindow: number;   // Window index
  energyLevel: number;     // Audio energy (dB-like)
}

export interface AudioTextBinding {
  bindingStrength: number;  // 0-1, STDP-derived
  temporalOffset: number;   // ms offset between audio and text
  coherenceScore: number;   // Phase-locking value
  synapticWeight: number;   // STDP weight update
}

export interface SpeakerSegment {
  speakerId: number;
  startMs: number;
  endMs: number;
  confidence: number;
  embeddings: number[];
}

// ─── Helper Functions ───

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

function layerNorm(values: number[]): number[] {
  if (values.length === 0) return [];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance + 1e-5);
  return values.map(v => (v - mean) / std);
}

// ─── Mamba-Audio Block ───

/**
 * Selective scan SSM optimized for audio temporal patterns.
 * Uses shorter state transitions tuned for phoneme-level features (200-500ms).
 */
export function mambaAudioBlock(
  audioFeatures: number[],
  config: AudioStreamConfig = DEFAULT_AUDIO_CONFIG
): { output: number[]; state: number[]; energy: number } {
  const { dState } = config;
  const seqLen = audioFeatures.length;
  const output = new Array(seqLen).fill(0);
  const state = new Array(dState).fill(0);

  // Audio-specific A diagonal (faster decay for transient sounds)
  const A_diag = Array.from({ length: dState }, (_, i) => -(i + 1) * 1.5);

  let totalEnergy = 0;

  for (let t = 0; t < seqLen; t++) {
    const x = audioFeatures[t];
    totalEnergy += x * x;

    // Input-dependent dt (selective — louder = larger step)
    const dt = 0.005 + 0.05 * sigmoid(x * 2);

    // Selective scan with audio-tuned parameters
    for (let s = 0; s < dState; s++) {
      const a_disc = Math.exp(dt * A_diag[s]);
      const b_val = Math.tanh(x * (s + 1) / dState) * 0.8;
      const b_disc = Math.abs(A_diag[s]) > 1e-8
        ? (a_disc - 1) / A_diag[s] * b_val
        : dt * b_val;

      state[s] = a_disc * state[s] + b_disc * x;
    }

    // Output projection with C (input-dependent)
    let y = x * 0.1; // Skip connection (D)
    for (let s = 0; s < dState; s++) {
      const c_val = Math.tanh(x * (dState - s) / dState);
      y += c_val * state[s];
    }
    output[t] = y;
  }

  const energy = Math.sqrt(totalEnergy / Math.max(1, seqLen));
  return { output, state: [...state], energy };
}

// ─── Audio to Embedding ───

/**
 * Convert audio features (mel spectrogram or raw features) to a fixed-dimension embedding.
 * Simulates HuBERT-style encoding: audio → contextualized representation → projection.
 */
export function audioToEmbedding(
  audioFeatures: number[],
  config: AudioStreamConfig = DEFAULT_AUDIO_CONFIG
): AudioEmbedding {
  const { embeddingDim, dState } = config;

  // Run through Mamba-Audio block
  const { output, state, energy } = mambaAudioBlock(audioFeatures, config);

  // Project to embedding dimension via learned projection (simulated)
  const embedding = new Array(embeddingDim).fill(0);
  const outputNorm = layerNorm(output);

  for (let d = 0; d < embeddingDim; d++) {
    let sum = 0;
    // Mix output features with state for rich representation
    for (let i = 0; i < Math.min(outputNorm.length, 32); i++) {
      sum += outputNorm[i] * Math.sin((d * (i + 1)) / embeddingDim * Math.PI);
    }
    for (let s = 0; s < dState; s++) {
      sum += state[s] * Math.cos((d * (s + 1)) / embeddingDim * Math.PI) * 0.5;
    }
    embedding[d] = Math.tanh(sum / (Math.min(outputNorm.length, 32) + dState));
  }

  // Speaker change score: high variance in state = likely speaker change
  const stateVar = state.reduce((s, v) => {
    const mean = state.reduce((a, b) => a + b, 0) / state.length;
    return s + (v - mean) ** 2;
  }, 0) / state.length;
  const speakerScore = sigmoid(stateVar - 0.5);

  // Confidence from output stability
  const outputVar = output.reduce((s, v, i) => {
    if (i === 0) return 0;
    return s + (v - output[i - 1]) ** 2;
  }, 0) / Math.max(1, output.length - 1);
  const confidence = 1 / (1 + outputVar);

  return {
    embedding: layerNorm(embedding),
    confidence,
    speakerScore,
    phonemeWindow: Math.floor(audioFeatures.length / (config.sampleRate * config.windowMs / 1000)),
    energyLevel: energy,
  };
}

// ─── Gated Audio-Text Fusion ───

/**
 * Fuse audio embedding with text embedding using gated mechanism.
 * Gate learns which modality to emphasize based on content.
 */
export function fuseAudioText(
  audioEmb: number[],
  textEmb: number[],
  config: AudioStreamConfig = DEFAULT_AUDIO_CONFIG
): number[] {
  const dim = Math.min(audioEmb.length, textEmb.length);
  const fused = new Array(dim).fill(0);

  for (let i = 0; i < dim; i++) {
    // Gating: sigmoid of combined signal determines audio vs text weight
    const gate = sigmoid(audioEmb[i] * 0.7 + textEmb[i] * 0.3);
    fused[i] = gate * audioEmb[i] + (1 - gate) * textEmb[i];
  }

  return layerNorm(fused);
}

// ─── STDP Audio-Text Temporal Binding ───

/**
 * Spike-Timing-Dependent Plasticity for audio-text synchronization.
 * Pre-synaptic: audio spike (phoneme onset)
 * Post-synaptic: text spike (word boundary / semantic activation)
 * 
 * Window: 200-500ms (phoneme-to-word binding)
 * 
 * Ref: Bi & Poo (1998), extended for multimodal binding
 */
export function stdpAudioBinding(
  preSpikeAudio: number[],   // Audio spike times (ms)
  postSpikeText: number[],   // Text spike times (ms)
  config: AudioStreamConfig = DEFAULT_AUDIO_CONFIG
): AudioTextBinding[] {
  const bindings: AudioTextBinding[] = [];
  const windowMs = config.windowMs;

  // STDP parameters (audio-tuned)
  const A_plus = 0.008;   // LTP amplitude
  const A_minus = 0.005;  // LTD amplitude
  const tau_plus = windowMs * 0.6;   // LTP time constant
  const tau_minus = windowMs * 0.8;  // LTD time constant

  for (const tPre of preSpikeAudio) {
    for (const tPost of postSpikeText) {
      const dt = tPost - tPre; // ms

      // Only consider pairs within window
      if (Math.abs(dt) > windowMs * 2) continue;

      let dw: number;
      if (dt > 0) {
        // Pre before post → LTP (strengthen binding)
        dw = A_plus * Math.exp(-dt / tau_plus);
      } else {
        // Post before pre → LTD (weaken binding)
        dw = -A_minus * Math.exp(dt / tau_minus);
      }

      // Coherence: phase-locking value (PLV) between audio and text
      const frequency = 40; // Hz (gamma band)
      const phase1 = (tPre / 1000) * 2 * Math.PI * frequency;
      const phase2 = (tPost / 1000) * 2 * Math.PI * frequency;
      const phaseDiff = phase1 - phase2;
      const coherenceScore = Math.abs(Math.cos(phaseDiff));

      bindings.push({
        bindingStrength: sigmoid(dw * 100),
        temporalOffset: dt,
        coherenceScore,
        synapticWeight: dw,
      });
    }
  }

  return bindings;
}

// ─── Speaker Diarization (simplified) ───

/**
 * Simple speaker diarization based on embedding clustering.
 * Groups consecutive audio segments by speaker similarity.
 */
export function diarizeSpeakers(
  audioSegments: AudioEmbedding[],
  threshold: number = 0.7
): SpeakerSegment[] {
  if (audioSegments.length === 0) return [];

  const segments: SpeakerSegment[] = [];
  let currentSpeaker = 0;
  let segStart = 0;

  for (let i = 0; i < audioSegments.length; i++) {
    if (i === 0) {
      continue;
    }

    // Cosine similarity between consecutive segments
    const prev = audioSegments[i - 1].embedding;
    const curr = audioSegments[i].embedding;
    let dot = 0, normA = 0, normB = 0;
    const dim = Math.min(prev.length, curr.length, 64); // Use first 64 dims for speed
    for (let d = 0; d < dim; d++) {
      dot += prev[d] * curr[d];
      normA += prev[d] * prev[d];
      normB += curr[d] * curr[d];
    }
    const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);

    // Speaker change detected
    if (similarity < threshold || audioSegments[i].speakerScore > 0.6) {
      segments.push({
        speakerId: currentSpeaker,
        startMs: segStart * 300, // Approximate
        endMs: i * 300,
        confidence: audioSegments.slice(segStart, i).reduce((s, e) => s + e.confidence, 0) / (i - segStart),
        embeddings: audioSegments[segStart].embedding.slice(0, 64),
      });
      currentSpeaker++;
      segStart = i;
    }
  }

  // Final segment
  segments.push({
    speakerId: currentSpeaker,
    startMs: segStart * 300,
    endMs: audioSegments.length * 300,
    confidence: audioSegments.slice(segStart).reduce((s, e) => s + e.confidence, 0) / Math.max(1, audioSegments.length - segStart),
    embeddings: audioSegments[segStart]?.embedding.slice(0, 64) || [],
  });

  return segments;
}

// ─── Full Audio Pipeline ───

export interface AudioPipelineResult {
  embeddings: AudioEmbedding[];
  speakers: SpeakerSegment[];
  bindings: AudioTextBinding[];
  overallEnergy: number;
  processingTimeMs: number;
}

/**
 * Full audio processing pipeline:
 * Raw features → Mamba-Audio → Embeddings → Diarization → STDP Binding
 */
export function processAudioStream(
  audioChunks: number[][],
  textSpikeTimes: number[] = [],
  config: AudioStreamConfig = DEFAULT_AUDIO_CONFIG
): AudioPipelineResult {
  const start = performance.now();

  // 1. Generate embeddings for each chunk
  const embeddings = audioChunks.map(chunk => audioToEmbedding(chunk, config));

  // 2. Speaker diarization
  const speakers = config.useSpeakerDiarization
    ? diarizeSpeakers(embeddings)
    : [];

  // 3. STDP bindings (audio peaks as spike times)
  let bindings: AudioTextBinding[] = [];
  if (config.useSTDP && textSpikeTimes.length > 0) {
    const audioSpikeTimes = embeddings
      .map((e, i) => e.energyLevel > 0.3 ? i * config.windowMs : -1)
      .filter(t => t >= 0);
    bindings = stdpAudioBinding(audioSpikeTimes, textSpikeTimes, config);
  }

  // 4. Overall energy
  const overallEnergy = embeddings.reduce((s, e) => s + e.energyLevel, 0) / Math.max(1, embeddings.length);

  return {
    embeddings,
    speakers,
    bindings,
    overallEnergy,
    processingTimeMs: performance.now() - start,
  };
}
