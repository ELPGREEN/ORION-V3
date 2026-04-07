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
  /** Mean MFCC coefficients (13) from reference audio */
  mfccMean: [
    -137.766, -4.189, 3.025, 1.982, 4.991,
    0.318, -1.955, -2.195, -2.256, -2.652,
    0.650, 0.187, 0.275,
  ],
  /** Standard deviation per coefficient */
  mfccStd: [
    95.697, 28.018, 14.120, 12.276, 10.454,
    8.397, 7.220, 7.055, 6.142, 5.736,
    6.197, 4.521, 3.510,
  ],
  /** Mel spectrogram mean energies (26 bands) */
  melMean: [
    -5.558, -5.316, -5.196, -5.118, -5.071, -6.223, -6.635, -5.917,
    -5.934, -5.480, -5.202, -4.876, -5.488, -5.305, -5.052, -4.892,
    -5.026, -5.340, -5.635, -5.275, -5.024, -5.107, -5.389, -4.988,
    -4.366, -4.852,
  ],
  /** LPC coefficients (order 12) from voiced segment */
  lpc: [
    1.00000, -1.53371, 0.46873, -0.22969, 0.66235,
    -0.67222, 0.60280, -0.67204, 0.46574, 0.02728,
    0.01574, -0.25101, 0.13198,
  ],
  /** Reference spectral characteristics */
  spectralCentroid: 4180.5,
  f0: 150.0,
  /** LPC-derived formant corrections */
  formantCorrections: {
    // These shift formant frequencies to better match the reference
    f1Scale: 1.02,   // Slightly wider F1
    f2Scale: 1.05,   // More spread F2 for clarity  
    f3Boost: 1.15,   // Boost F3 significantly for brightness
    f4Boost: 1.10,   // Boost F4 for air/presence
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
 * Compute synthesis corrections based on MFCC analysis diff.
 * 
 * The diff between reference and synthesized MFCCs tells us:
 * - c0 (+18.5): Synth has less energy → boost gain
 * - c1 (-2.4): Spectral tilt too steep → add more high-freq energy
 * - c3 (+10.6): Too much nasality → reduce nasal coupling
 * - c4 (+10.0): Not enough brightness → boost F3/F4
 * - Centroid 1431 vs 4180: WAY too dark → massive high-freq boost needed
 */
export function computeMFCCCorrections(): MFCCSynthCorrection {
  return {
    // F0 should target 150 Hz (not 183)
    f0Target: 150.0,

    // Boost higher harmonics to raise spectral centroid from 1431→4180
    // Harmonics 1-3 stay similar, 4+ get progressively boosted
    harmonicBoost: [
      1.0,    // H1 (fundamental)
      1.05,   // H2
      1.15,   // H3
      1.35,   // H4 — significant boost
      1.55,   // H5 — big boost for brightness
      1.70,   // H6
      1.80,   // H7
      1.85,   // H8
      1.80,   // H9
      1.70,   // H10
    ],

    // Formant shifts to match reference LPC
    // F3 and F4 need the most adjustment (brightness)
    formantScale: [1.02, 1.05, 1.15, 1.10],
    
    // Slightly wider bandwidths for more natural resonance
    bandwidthScale: [0.85, 0.90, 0.80, 0.85],

    // Add more breathiness for naturalness
    breathiness: 0.035,

    // Reduce nasal coupling (c3 diff was +10.6)
    nasalReduction: 0.45,

    // Compensate spectral tilt — boost high frequencies
    spectralTiltCompensation: 2.8,

    // Pre-emphasis for synthesis output
    preEmphasis: 0.97,
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
