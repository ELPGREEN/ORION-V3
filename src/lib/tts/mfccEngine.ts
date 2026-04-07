/**
 * MFCC Engine — Mel-Frequency Cepstral Coefficients
 * 
 * Implementação 100% client-side para análise e matching de voz.
 * Usado para guiar a síntese formante do Orion para soar mais humana.
 * 
 * Pipeline: Pré-ênfase → Framing → Hamming → FFT → Mel Filterbank → Log → DCT
 * 
 * Reference MFCC profile extracted from Chirp3 HD Iapetus samples.
 */

// ═══════════════════════════════════════════════════════════
// MFCC TARGET PROFILE — extracted from chirp3-hd-iapetus-14.wav
// These are the "gold standard" values the synth should match
// ═══════════════════════════════════════════════════════════

export const IAPETUS_MFCC_PROFILE = {
  /** Mean MFCC coefficients (13) — REAL analysis from chirp3-hd-iapetus-14.wav */
  mfccMean: [
    -119.877, -6.304, 3.593, 0.836, 8.455,
    2.574, -2.920, -4.467, -2.826, -1.668,
    -0.082, -0.081, 0.542,
  ],
  /** Mel spectrogram mean energies (26 bands) — REAL */
  melMean: [
    -4.919, -3.955, -4.526, -4.084, -4.610, -6.023, -6.499, -5.991,
    -5.527, -4.971, -4.241, -3.909, -4.378, -4.122, -4.519, -5.001,
    -4.793, -4.633, -5.170, -4.656, -4.185, -4.075, -4.417, -3.699,
    -3.303, -3.671,
  ],
  /** Reference spectral characteristics — REAL */
  spectralCentroid: 3155.4,
  f0: 125.7,
  /** Formant corrections from MFCC diff analysis */
  formantCorrections: {
    f1Scale: 1.0,    // F1 is OK
    f2Scale: 1.03,   // Slight F2 adjustment
    f3Boost: 1.08,   // Moderate F3 boost
    f4Boost: 1.05,   // Slight F4 boost
  },
};

// ═══════════════════════════════════════════════════════════
// MFCC CORRECTION FACTORS — derived from analysis diff
// Applied to synthesis parameters to close the gap
// ═══════════════════════════════════════════════════════════

export interface MFCCSynthCorrection {
  /** F0 base correction (Hz) */
  f0Target: number;
  /** Harmonic amplitude adjustments per harmonic */
  harmonicBoost: number[];
  /** Formant frequency multipliers [F1, F2, F3, F4] */
  formantScale: [number, number, number, number];
  /** Bandwidth multipliers [BW1, BW2, BW3, BW4] */
  bandwidthScale: [number, number, number, number];
  /** Breathiness level (0-1) */
  breathiness: number;
  /** Nasal coupling reduction factor */
  nasalReduction: number;
  /** High-frequency energy boost (spectral tilt compensation) */
  spectralTiltCompensation: number;
  /** Pre-emphasis coefficient for synthesis */
  preEmphasis: number;
}

/**
 * Compute synthesis corrections based on REAL MFCC analysis diff.
 * 
 * MFCC diff (v11 synth vs Iapetus reference):
 * - c0: -32 → synth has MUCH less energy → boost fundamental
 * - c1: +7.6 → spectral tilt too flat → boost low harmonics more
 * - c2: -14.4 → spectral shape wrong → fix formant balance
 * - c4: -17.3 → formant mismatch → adjust F1/F2 weights
 * - Mel bands 0-1: -8.7 vs -4.9 → 4dB gap at fundamental!
 * - Centroid: 3587 vs 3155 → synth slightly too bright
 */
export function computeMFCCCorrections(): MFCCSynthCorrection {
  return {
    // F0 target from real analysis
    f0Target: 125.7,

    // Boost LOW harmonics (H1-H3) to fix the 4dB low-freq energy gap
    // Reduce high harmonic boost (synth is already slightly too bright)
    harmonicBoost: [
      1.8,    // H1 — MAJOR boost (fundamental was way too weak)
      1.5,    // H2 — strong boost
      1.3,    // H3
      1.15,   // H4
      1.1,    // H5
      1.05,   // H6
      1.0,    // H7
      0.95,   // H8 — slight reduction (centroid too high)
      0.90,   // H9
      0.85,   // H10
    ],

    // Formant scale — reduced from before (was overcorrecting)
    formantScale: [1.0, 1.03, 1.08, 1.05],
    
    // Wider bandwidths for more natural resonance (less robotic)
    bandwidthScale: [1.0, 1.0, 0.95, 0.95],

    // Reduced breathiness (reference is cleaner than we thought)
    breathiness: 0.02,

    // Less nasal reduction
    nasalReduction: 0.3,

    // Minimal spectral tilt compensation (voice DNA handles it)
    spectralTiltCompensation: 0.5,

    // Gentle pre-emphasis
    preEmphasis: 0.25,
  };
}

// ═══════════════════════════════════════════════════════════
// MFCC COMPUTATION (for future real-time analysis)
// ═══════════════════════════════════════════════════════════

const MEL_FILTERS = 26;
const N_MFCC = 13;

/** Convert Hz to Mel scale */
export function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

/** Convert Mel to Hz */
export function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

/**
 * Compute MFCC from audio samples (simplified, for matching)
 * Returns mean MFCC vector across all frames
 */
export function computeMFCC(
  samples: Float32Array,
  sampleRate: number,
  frameMs = 25,
  hopMs = 10,
): number[] {
  const frameSize = Math.floor(frameMs * sampleRate / 1000);
  const hopSize = Math.floor(hopMs * sampleRate / 1000);
  const fftSize = nextPow2(frameSize);

  // Pre-emphasis
  const emphasized = new Float32Array(samples.length);
  emphasized[0] = samples[0];
  for (let i = 1; i < samples.length; i++) {
    emphasized[i] = samples[i] - 0.97 * samples[i - 1];
  }

  // Hamming window
  const window = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (frameSize - 1));
  }

  // Mel filterbank
  const filterbank = createMelFilterbank(MEL_FILTERS, fftSize, sampleRate);

  // Process frames
  const numFrames = Math.max(1, Math.floor((samples.length - frameSize) / hopSize) + 1);
  const mfccSum = new Float64Array(N_MFCC);
  let validFrames = 0;

  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSize;
    
    // Window the frame
    const frame = new Float32Array(fftSize);
    for (let i = 0; i < frameSize && start + i < emphasized.length; i++) {
      frame[i] = emphasized[start + i] * window[i];
    }

    // FFT (simplified DFT for small sizes)
    const spectrum = computePowerSpectrum(frame, fftSize);

    // Mel filterbank energies
    const melEnergies = new Float64Array(MEL_FILTERS);
    const specLen = fftSize / 2 + 1;
    for (let m = 0; m < MEL_FILTERS; m++) {
      let sum = 0;
      for (let k = 0; k < specLen; k++) {
        sum += spectrum[k] * filterbank[m * specLen + k];
      }
      melEnergies[m] = Math.max(sum, 1e-10);
    }

    // Log
    const logMel = new Float64Array(MEL_FILTERS);
    for (let m = 0; m < MEL_FILTERS; m++) {
      logMel[m] = Math.log(melEnergies[m]);
    }

    // DCT → MFCC
    for (let n = 0; n < N_MFCC; n++) {
      let sum = 0;
      for (let m = 0; m < MEL_FILTERS; m++) {
        sum += logMel[m] * Math.cos(Math.PI * n * (m + 0.5) / MEL_FILTERS);
      }
      mfccSum[n] += sum;
    }
    validFrames++;
  }

  // Average
  const result: number[] = [];
  for (let n = 0; n < N_MFCC; n++) {
    result.push(validFrames > 0 ? mfccSum[n] / validFrames : 0);
  }

  return result;
}

/**
 * Compare two MFCC vectors and return similarity (0-1)
 */
export function mfccSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dotProduct / denom : 0;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function createMelFilterbank(
  numFilters: number,
  fftSize: number,
  sr: number,
): Float64Array {
  const specLen = fftSize / 2 + 1;
  const filterbank = new Float64Array(numFilters * specLen);

  const lowMel = hzToMel(0);
  const highMel = hzToMel(sr / 2);
  const melPoints = new Float64Array(numFilters + 2);
  for (let i = 0; i < numFilters + 2; i++) {
    melPoints[i] = lowMel + (highMel - lowMel) * i / (numFilters + 1);
  }

  const binPoints = new Int32Array(numFilters + 2);
  for (let i = 0; i < numFilters + 2; i++) {
    binPoints[i] = Math.floor((fftSize + 1) * melToHz(melPoints[i]) / sr);
  }

  for (let i = 0; i < numFilters; i++) {
    const offset = i * specLen;
    for (let j = binPoints[i]; j < binPoints[i + 1] && j < specLen; j++) {
      const denom = binPoints[i + 1] - binPoints[i];
      filterbank[offset + j] = denom > 0 ? (j - binPoints[i]) / denom : 0;
    }
    for (let j = binPoints[i + 1]; j < binPoints[i + 2] && j < specLen; j++) {
      const denom = binPoints[i + 2] - binPoints[i + 1];
      filterbank[offset + j] = denom > 0 ? (binPoints[i + 2] - j) / denom : 0;
    }
  }

  return filterbank;
}

function computePowerSpectrum(frame: Float32Array, fftSize: number): Float64Array {
  const specLen = fftSize / 2 + 1;
  const spectrum = new Float64Array(specLen);

  // Simple DFT (for frames up to 1024, this is acceptable)
  for (let k = 0; k < specLen; k++) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < fftSize; n++) {
      const angle = (2 * Math.PI * k * n) / fftSize;
      real += frame[n] * Math.cos(angle);
      imag -= frame[n] * Math.sin(angle);
    }
    spectrum[k] = real * real + imag * imag;
  }

  return spectrum;
}
