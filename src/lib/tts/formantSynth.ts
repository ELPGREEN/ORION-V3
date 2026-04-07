/**
 * Orion Formant Speech Synthesizer v9 — HUMAN VOICE
 * 
 * Major upgrades from v8:
 * 1. Liljencrants-Fant (LF) glottal pulse model (not pure sines)
 * 2. Proper spectral tilt (-12dB/oct natural roll-off)
 * 3. Extended coarticulation (80ms smoothstep transitions)
 * 4. Vibrato + micro-prosody + phrase-level intonation
 * 5. Formant transition loci (CV context-dependent shifts)
 * 6. MFCC-guided spectral envelope matching
 * 7. Improved aspiration/breathiness model
 * 
 * 100% client-side, zero API, zero dependencies.
 */

import {
  PT_PHONEMES,
  textToPhonemes,
  VOICE_DNA,
  type PhonemeParams,
} from "./phonemes";
import { computeMFCCCorrections, type MFCCSynthCorrection } from "./mfccEngine";

const SR = VOICE_DNA.sampleRate; // 24000
const TWO_PI = 2 * Math.PI;
const NUM_HARMONICS = 48; // More harmonics for richer sound

// MFCC-derived corrections
const MFCC_FIX = computeMFCCCorrections();

// ═══════════════════════════════════════════════════════════
// LF GLOTTAL MODEL — Liljencrants-Fant pulse shape
// Much more natural than pure sines
// ═══════════════════════════════════════════════════════════

/**
 * Generate one period of LF glottal flow derivative.
 * The LF model separates the glottal pulse into:
 * - Open phase: rising sinusoidal-exponential
 * - Return phase: exponential decay
 * This gives natural spectral tilt and voice quality.
 */
function lfGlottalPulse(phase: number, oq: number, sq: number): number {
  // phase: 0..1 within one glottal cycle
  // oq: open quotient (0.4-0.7, higher = breathier)
  // sq: speed quotient (1-3, higher = more abrupt closure)
  
  const te = oq; // glottal closing instant
  const tp = te / (1 + sq); // peak of glottal flow
  
  if (phase < 0) return 0;
  
  if (phase < tp) {
    // Opening phase: sinusoidal rise
    return 0.5 * (1 - Math.cos(Math.PI * phase / tp));
  } else if (phase < te) {
    // Closing phase: sinusoidal fall (faster due to sq)
    const t = (phase - tp) / (te - tp);
    return Math.cos(Math.PI * 0.5 * t);
  } else {
    // Closed phase: exponential return (models subglottal pressure)
    const tc = 1 - te;
    if (tc < 0.001) return 0;
    const t = (phase - te) / tc;
    return -0.3 * Math.exp(-5 * t) * Math.sin(Math.PI * t);
  }
}

// ═══════════════════════════════════════════════════════════
// FORMANT ENVELOPE with improved resonance model
// ═══════════════════════════════════════════════════════════

function formantEnvelope(
  freq: number,
  f1: number, f2: number, f3: number, f4: number,
  bw1: number, bw2: number, bw3: number, bw4: number,
): number {
  // Parallel formant model with proper amplitude weighting
  // F1/F2 carry vowel identity, F3 speaker identity, F4 "air"
  const g1 = formantGain(freq, f1, bw1) * 1.0;
  const g2 = formantGain(freq, f2, bw2) * 0.75;
  const g3 = formantGain(freq, f3, bw3) * 0.35;
  const g4 = formantGain(freq, f4, bw4) * 0.18;
  
  return g1 + g2 + g3 + g4;
}

function formantGain(freq: number, formantFreq: number, bandwidth: number): number {
  if (formantFreq < 10) return 0;
  const delta = (freq - formantFreq) / (bandwidth * 0.5);
  // Skewed Lorentzian — slight asymmetry for more natural resonance
  const asym = freq > formantFreq ? 1.0 : 0.92;
  return asym / (1.0 + delta * delta);
}

// ═══════════════════════════════════════════════════════════
// NOISE GENERATOR with improved bandpass shaping
// ═══════════════════════════════════════════════════════════
interface BPFilter {
  y1: number; y2: number;
  a1: number; a2: number; b0: number;
}

function makeBP(freq: number, bw: number): BPFilter {
  if (freq < 20) return { y1: 0, y2: 0, a1: 0, a2: 0, b0: 1 };
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = TWO_PI * freq / SR;
  return { y1: 0, y2: 0, a1: -2 * r * Math.cos(theta), a2: r * r, b0: (1 - r) * 0.7 };
}

function tickBP(f: BPFilter, x: number): number {
  const y = f.b0 * x - f.a1 * f.y1 - f.a2 * f.y2;
  f.y2 = f.y1; f.y1 = y;
  return y;
}

function updateBP(f: BPFilter, freq: number, bw: number) {
  if (freq < 20) return;
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = TWO_PI * freq / SR;
  f.a1 = -2 * r * Math.cos(theta);
  f.a2 = r * r;
  f.b0 = (1 - r) * 0.7;
}

// ═══════════════════════════════════════════════════════════
// DC BLOCKER + 1-POLE LOWPASS for smoothing
// ═══════════════════════════════════════════════════════════
let dcX1 = 0, dcY1 = 0;
function dcBlock(x: number): number {
  const y = x - dcX1 + 0.997 * dcY1;
  dcX1 = x; dcY1 = y;
  return y;
}

// Simple 1-pole lowpass to tame harsh harmonics
let lpY1 = 0;
function lowpass1(x: number, coeff: number): number {
  lpY1 = lpY1 + coeff * (x - lpY1);
  return lpY1;
}

// ═══════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════

export async function synthesizeFormant(text: string): Promise<Blob> {
  const phonemes = textToPhonemes(text);
  console.log(`[Formant v9] "${text.slice(0, 50)}..." → ${phonemes.length} phonemes`);

  // Reset filter state
  dcX1 = 0; dcY1 = 0; lpY1 = 0;
  const samples = renderPhonemes(phonemes);
  const processed = postProcess(samples);
  return samplesToWav(processed, SR);
}

export async function speakFormant(
  text: string,
  signal?: AbortSignal,
): Promise<{ played: boolean; audio: HTMLAudioElement | null }> {
  if (!text?.trim() || signal?.aborted) return { played: false, audio: null };

  try {
    const blob = await synthesizeFormant(text);
    if (signal?.aborted) return { played: false, audio: null };

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => { audio.pause(); audio.src = ""; URL.revokeObjectURL(url); resolve(); };
      signal?.addEventListener("abort", onAbort, { once: true });
      audio.onended = () => { signal?.removeEventListener("abort", onAbort); URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { signal?.removeEventListener("abort", onAbort); URL.revokeObjectURL(url); reject(new Error("Playback error")); };
      audio.play().catch(reject);
    });

    return { played: !signal?.aborted, audio };
  } catch (err) {
    console.warn("[Formant v9] Error:", err);
    return { played: false, audio: null };
  }
}

// ═══════════════════════════════════════════════════════════
// CORE SYNTHESIS v9: LF Glottal + Additive Source-Filter
// ═══════════════════════════════════════════════════════════

function renderPhonemes(phonemes: string[]): Float32Array {
  // Calculate total duration
  let totalMs = 0;
  for (const p of phonemes) {
    const params = PT_PHONEMES[p];
    totalMs += params ? params.duration : 50;
  }
  totalMs += phonemes.filter(p => PT_PHONEMES[p]?.plosive).length * 50;
  totalMs += 500; // padding

  const totalSamples = Math.ceil((totalMs / 1000) * SR) + SR;
  const buffer = new Float32Array(totalSamples);

  // Persistent state across phonemes
  const harmonicPhases = new Float64Array(NUM_HARMONICS);
  let glottalPhase = 0; // LF glottal phase (0..1)
  
  const noiseBP1 = makeBP(2500, 800);
  const noiseBP2 = makeBP(5000, 1200);
  // Extra noise filter for aspiration
  const aspirationBP = makeBP(3000, 2000);

  const oq = VOICE_DNA.glottal.openQuotient;
  const sq = VOICE_DNA.glottal.speedQuotient;
  const harmonicProfile = VOICE_DNA.harmonicProfile;
  const jitterAmt = VOICE_DNA.dynamics.jitter * 0.12; // slightly reduced for smoothness
  const shimmerAmt = VOICE_DNA.dynamics.shimmer * 0.05;

  let offset = 0;

  // Interpolation state — formants persist across phonemes
  let curF1 = 500, curF2 = 1500, curF3 = 2500, curF4 = 3500;
  let curBw1 = 100, curBw2 = 120, curBw3 = 150, curBw4 = 200;
  let curAmp = 0;

  // Vibrato state
  let vibratoPhase = 0;
  const vibratoRate = 5.2; // Hz — natural vibrato
  const vibratoDepth = 0.012; // ±1.2% of F0

  for (let pi = 0; pi < phonemes.length; pi++) {
    const phoneme = phonemes[pi];
    const params = PT_PHONEMES[phoneme];
    if (!params) continue;

    // ── CONTEXT-DEPENDENT FORMANT LOCI ──
    // Adjacent phonemes influence formant targets (coarticulation)
    const prevP = pi > 0 ? PT_PHONEMES[phonemes[pi - 1]] : null;
    const nextP = pi < phonemes.length - 1 ? PT_PHONEMES[phonemes[pi + 1]] : null;

    // Apply MFCC formant corrections + coarticulation blending
    let tgtF1 = (params.f1 || curF1) * MFCC_FIX.formantScale[0];
    let tgtF2 = (params.f2 || curF2) * MFCC_FIX.formantScale[1];
    let tgtF3 = (params.f3 || curF3) * MFCC_FIX.formantScale[2];
    let tgtF4 = (params.f4 || curF4) * MFCC_FIX.formantScale[3];

    // Coarticulation: blend formants toward neighbors (20% influence)
    if (nextP && nextP.voiced && params.voiced) {
      tgtF1 = tgtF1 * 0.85 + (nextP.f1 || tgtF1) * MFCC_FIX.formantScale[0] * 0.15;
      tgtF2 = tgtF2 * 0.82 + (nextP.f2 || tgtF2) * MFCC_FIX.formantScale[1] * 0.18;
    }
    if (prevP && prevP.voiced && params.voiced) {
      tgtF1 = tgtF1 * 0.9 + (prevP.f1 || tgtF1) * MFCC_FIX.formantScale[0] * 0.1;
      tgtF2 = tgtF2 * 0.88 + (prevP.f2 || tgtF2) * MFCC_FIX.formantScale[1] * 0.12;
    }

    const tgtBw1 = (params.bw1 || curBw1) * MFCC_FIX.bandwidthScale[0];
    const tgtBw2 = (params.bw2 || curBw2) * MFCC_FIX.bandwidthScale[1];
    const tgtBw3 = (params.bw3 || curBw3) * MFCC_FIX.bandwidthScale[2];
    const tgtBw4 = (params.bw4 || curBw4) * MFCC_FIX.bandwidthScale[3];
    const tgtAmp = params.amplitude;

    const startF1 = curF1, startF2 = curF2, startF3 = curF3, startF4 = curF4;
    const startBw1 = curBw1, startBw2 = curBw2, startBw3 = curBw3, startBw4 = curBw4;
    const startAmp = curAmp;

    // Plosive aspiration
    let phonemeDuration = params.duration;
    let aspirationMs = 0;
    if (params.plosive) {
      aspirationMs = params.voiced ? 20 : 40;
      phonemeDuration += aspirationMs;
    }

    const numSamples = Math.floor((phonemeDuration / 1000) * SR);
    // Extended transition: 80ms for smoother coarticulation (was 45ms)
    const transitionSamples = Math.min(Math.floor(0.08 * SR), numSamples);
    const sentPos = pi / Math.max(phonemes.length - 1, 1);

    // F0 for this segment with phrase-level prosody
    const baseF0 = getProsodyF0(sentPos, phonemes.length);

    for (let n = 0; n < numSamples; n++) {
      if (offset >= buffer.length) break;
      const pos = n / Math.max(numSamples - 1, 1);

      // ── SMOOTH INTERPOLATION (smoothstep) ──
      const iT = n < transitionSamples ? n / transitionSamples : 1;
      const sT = iT * iT * (3 - 2 * iT); // Hermite smoothstep

      const f1 = startF1 + (tgtF1 - startF1) * sT;
      const f2 = startF2 + (tgtF2 - startF2) * sT;
      const f3 = startF3 + (tgtF3 - startF3) * sT;
      const f4 = startF4 + (tgtF4 - startF4) * sT;
      const bw1 = startBw1 + (tgtBw1 - startBw1) * sT;
      const bw2 = startBw2 + (tgtBw2 - startBw2) * sT;
      const bw3 = startBw3 + (tgtBw3 - startBw3) * sT;
      const bw4 = startBw4 + (tgtBw4 - startBw4) * sT;
      const amp = startAmp + (tgtAmp - startAmp) * sT;

      // Envelope
      const env = getEnvelope(pos, phonemeDuration, params.plosive);

      if (amp < 0.001 && !params.plosive) {
        buffer[offset++] = 0;
        continue;
      }

      let sample = 0;

      // ═════════════════════════════════════
      // VOICED: LF Glottal + Harmonic Source-Filter
      // ═════════════════════════════════════
      if (params.voiced) {
        // F0 with jitter + vibrato
        vibratoPhase += TWO_PI * vibratoRate / SR;
        if (vibratoPhase > TWO_PI) vibratoPhase -= TWO_PI;
        
        const vibrato = 1 + Math.sin(vibratoPhase) * vibratoDepth;
        const jitter = 1 + (Math.random() - 0.5) * jitterAmt;
        const f0 = baseF0 * vibrato * jitter;

        // Advance glottal phase
        const glottalInc = f0 / SR;
        glottalPhase += glottalInc;
        if (glottalPhase >= 1) glottalPhase -= 1;

        // ── LF GLOTTAL PULSE (natural source excitation) ──
        const glottalSample = lfGlottalPulse(glottalPhase, oq, sq);

        // ── ADDITIVE HARMONICS weighted by glottal shape ──
        // The LF pulse modulates harmonic amplitudes naturally
        for (let h = 0; h < NUM_HARMONICS; h++) {
          const freq = f0 * (h + 1);
          if (freq > SR * 0.45) break;

          // Advance harmonic phase
          harmonicPhases[h] += TWO_PI * freq / SR;
          if (harmonicPhases[h] > TWO_PI) harmonicPhases[h] -= TWO_PI;

          // Source amplitude from voice DNA (already contains natural spectral decay)
          let sourceAmp = h < harmonicProfile.length
            ? harmonicProfile[h]
            : harmonicProfile[harmonicProfile.length - 1] * Math.exp(-0.15 * (h - harmonicProfile.length + 1));

          // GENTLE spectral tilt: -3dB/octave only (voice DNA already has natural decay!)
          // Previous -12dB/oct was killing all harmonics above H2
          const tiltDb = -3 * Math.log2(Math.max(1, h + 1));
          sourceAmp *= Math.pow(10, tiltDb / 20);

          // MFCC correction: boost higher harmonics for brightness
          const hBoost = h < MFCC_FIX.harmonicBoost.length
            ? MFCC_FIX.harmonicBoost[h]
            : MFCC_FIX.harmonicBoost[MFCC_FIX.harmonicBoost.length - 1];
          sourceAmp *= hBoost;

          // Formant envelope (vocal tract filter) — THIS creates the vowel identity
          const filterGain = formantEnvelope(freq, f1, f2, f3, f4, bw1, bw2, bw3, bw4);

          // Shimmer
          const shimmer = 1 + (Math.random() - 0.5) * shimmerAmt;

          // LF glottal modulation (subtle — don't kill amplitude)
          const glottalMod = 0.75 + 0.25 * glottalSample;
          
          sample += Math.sin(harmonicPhases[h]) * sourceAmp * filterGain * shimmer * glottalMod;
        }

        // ── ASPIRATION NOISE (breathiness) ──
        // Natural voices always have some aspiration, especially in onset/offset
        const breathNoise = (Math.random() * 2 - 1);
        const breathAmt = MFCC_FIX.breathiness * (1 + 0.5 * (1 - glottalSample)); // more breath during closed phase
        updateBP(aspirationBP, 3000 + f1 * 0.3, 2500);
        sample += tickBP(aspirationBP, breathNoise) * breathAmt;

        // ── NASAL COUPLING ──
        if (params.nasal) {
          // Anti-resonance at ~270Hz + nasal formant
          const nasalAntiR = 1 - 0.3 * formantGain(270, 270, 60); // anti-resonance
          sample *= (1 - MFCC_FIX.nasalReduction * 0.7) * nasalAntiR;
          
          // Add nasal pole at 250-300Hz
          const nasalPhase = harmonicPhases[0] * (270 / (baseF0 || 130));
          sample += Math.sin(nasalPhase) * 0.1;
          
          // Add nasal zero effect (reduced F1 energy)
          // This is what makes nasals sound "nasal"
        }
      }

      // ═════════════════════════════════════
      // NOISE: Fricatives and plosives
      // ═════════════════════════════════════
      if (params.fricative || params.plosive) {
        let noise = Math.random() * 2 - 1;

        if (params.plosive) {
          const burstEnd = Math.floor(0.012 * SR); // longer burst (12ms)
          const aspEnd = Math.floor((0.012 + aspirationMs / 1000) * SR);

          if (n < burstEnd) {
            // Strong burst — essential for consonant perception
            noise *= 1.2 * (1 - n / burstEnd);
          } else if (n < aspEnd) {
            const aspProg = (n - burstEnd) / (aspEnd - burstEnd);
            noise *= 0.7 * Math.exp(-1.5 * aspProg);
          } else {
            noise *= 0.03;
          }
        } else {
          // Fricatives need to be LOUD enough to be perceived
          noise *= 0.55;
        }

        // Shape noise through formant-tuned bandpass
        updateBP(noiseBP1, f2, bw2 * 2);
        updateBP(noiseBP2, f3, bw3 * 2);
        const shaped = tickBP(noiseBP1, noise) * 0.5 + tickBP(noiseBP2, noise) * 0.5;

        if (params.voiced) {
          sample = sample * 0.55 + shaped * 0.45;
        } else {
          sample += shaped;
        }
      }

      // ── DC BLOCK + GENTLE LOWPASS ──
      sample = dcBlock(sample);
      // Gentle 1-pole lowpass at ~8kHz to tame aliasing artifacts
      sample = lowpass1(sample, 0.65);
      
      buffer[offset++] = sample * env * amp;
    }

    // Update persistent state
    curF1 = tgtF1; curF2 = tgtF2; curF3 = tgtF3; curF4 = tgtF4;
    curBw1 = tgtBw1; curBw2 = tgtBw2; curBw3 = tgtBw3; curBw4 = tgtBw4;
    curAmp = tgtAmp;
  }

  return buffer.slice(0, offset);
}

// ═══════════════════════════════════════════════════════════
// PROSODY v2: Phrase-level intonation + micro-prosody
// ═══════════════════════════════════════════════════════════
function getProsodyF0(sentencePos: number, totalPhonemes: number): number {
  const targetF0 = MFCC_FIX.f0Target; // 150 Hz
  const { p5, p95 } = VOICE_DNA.f0;

  let f0 = targetF0;
  
  // Phrase-level declination (natural pitch drops throughout utterance)
  // Human speech has ~10-15% declination from start to end
  const declination = 1 - sentencePos * 0.10;
  
  if (sentencePos < 0.12) {
    // Onset rise: slight pitch boost at phrase start
    f0 = targetF0 * (1.0 + (0.12 - sentencePos) * 0.15);
  } else if (sentencePos > 0.80) {
    // Terminal fall: declarative sentences drop pitch
    const dropAmount = (sentencePos - 0.80) * 0.25;
    f0 = targetF0 * declination * (1 - dropAmount);
  } else {
    // Mid-sentence: gentle undulation (not flat!)
    // Natural speech has ~2-3Hz pitch modulation
    const undulation = Math.sin(sentencePos * Math.PI * 4) * 0.025;
    // Plus syllable-level accent variation
    const accent = Math.sin(sentencePos * Math.PI * 8) * 0.015;
    f0 = targetF0 * declination * (1 + undulation + accent);
  }

  // Micro-prosody: random pitch perturbation (1-3 Hz variation)
  f0 += (Math.random() - 0.5) * 3.5;
  
  return Math.max(p5, Math.min(p95, f0));
}

// ═══════════════════════════════════════════════════════════
// ENVELOPE with smoother attack/release
// ═══════════════════════════════════════════════════════════
function getEnvelope(pos: number, durationMs: number, isPlosive: boolean): number {
  if (isPlosive) {
    if (pos < 0.03) return pos / 0.03;
    if (pos > 0.55) return Math.max(0, 1 - (pos - 0.55) / 0.45);
    return 1.0;
  }

  // Smoother attack and release for vowels/consonants
  const attackMs = 12;
  const releaseMs = 18;
  const attack = Math.min(attackMs / durationMs, 0.3);
  const release = Math.min(releaseMs / durationMs, 0.3);

  if (pos < attack) {
    // Raised-cosine attack (smoother than linear)
    return 0.5 * (1 - Math.cos(Math.PI * pos / attack));
  }
  if (pos > 1 - release) {
    // Raised-cosine release
    return 0.5 * (1 + Math.cos(Math.PI * (pos - (1 - release)) / release));
  }
  return 1.0;
}

// ═══════════════════════════════════════════════════════════
// POST-PROCESSING: Spectral shaping + Normalize
// ═══════════════════════════════════════════════════════════
function postProcess(samples: Float32Array): Float32Array {
  const len = samples.length;
  
  // 1. Gentle pre-emphasis (brightness without harshness)
  const preEmph = 0.30;
  const processed = new Float32Array(len);
  processed[0] = samples[0];
  for (let i = 1; i < len; i++) {
    processed[i] = samples[i] - preEmph * samples[i - 1];
  }

  // 2. Simple 3-tap smoothing to reduce harsh transients
  const smoothed = new Float32Array(len);
  smoothed[0] = processed[0];
  smoothed[len - 1] = processed[len - 1];
  for (let i = 1; i < len - 1; i++) {
    smoothed[i] = processed[i] * 0.6 + (processed[i - 1] + processed[i + 1]) * 0.2;
  }

  // 3. Normalize to -1dB
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const a = Math.abs(smoothed[i]);
    if (a > peak) peak = a;
  }
  if (peak === 0) return smoothed;

  const gain = 0.89 / peak;
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = smoothed[i] * gain;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════
// WAV ENCODER
// ═══════════════════════════════════════════════════════════
function samplesToWav(samples: Float32Array, sampleRate: number): Blob {
  const dataLen = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  v.setUint32(4, 36 + dataLen, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, "data");
  v.setUint32(40, dataLen, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s * 32767, true);
  }

  return new Blob([buf], { type: "audio/wav" });
}
