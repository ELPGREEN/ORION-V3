/**
 * Orion Formant Speech Synthesizer v8 — ADDITIVE SOURCE-FILTER
 * 
 * Architecture (robust & proven):
 * 1. Generate harmonics of F0 (source) using voice DNA profile
 * 2. Shape each harmonic's amplitude by formant envelope (filter)
 * 3. Add fricative noise shaped by formant bandpass
 * 4. Smooth coarticulation between phonemes
 * 
 * This avoids IIR resonator instability entirely.
 * Each harmonic amplitude = Σ formant_gain(freq, Fi, BWi)
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
const NUM_HARMONICS = 40; // Up to ~5500 Hz at F0=137

// MFCC-derived corrections (computed once)
const MFCC_FIX = computeMFCCCorrections();

// ═══════════════════════════════════════════════════════════
// FORMANT ENVELOPE: compute amplitude at a given frequency
// based on formant positions F1-F4 with bandwidths
// ═══════════════════════════════════════════════════════════
function formantEnvelope(
  freq: number,
  f1: number, f2: number, f3: number, f4: number,
  bw1: number, bw2: number, bw3: number, bw4: number,
): number {
  // Each formant contributes a resonance peak (Lorentzian)
  // The overall envelope is the product of individual formant responses
  // This models the vocal tract transfer function
  
  const g1 = formantGain(freq, f1, bw1);
  const g2 = formantGain(freq, f2, bw2);
  const g3 = formantGain(freq, f3, bw3);
  const g4 = formantGain(freq, f4, bw4);
  
  // Sum (not product) for parallel formant model — more robust
  // Weight F1 and F2 higher (they carry vowel identity)
  return g1 * 1.0 + g2 * 0.8 + g3 * 0.3 + g4 * 0.15;
}

function formantGain(freq: number, formantFreq: number, bandwidth: number): number {
  if (formantFreq < 10) return 0;
  const delta = (freq - formantFreq) / (bandwidth * 0.5);
  // Lorentzian (resonance) shape
  return 1.0 / (1.0 + delta * delta);
}

// ═══════════════════════════════════════════════════════════
// NOISE GENERATOR with bandpass shaping
// ═══════════════════════════════════════════════════════════
// Simple 2-pole IIR for noise shaping (OK for fricatives)
interface BPFilter {
  y1: number;
  y2: number;
  a1: number;
  a2: number;
  b0: number;
}

function makeBP(freq: number, bw: number): BPFilter {
  if (freq < 20) return { y1: 0, y2: 0, a1: 0, a2: 0, b0: 1 };
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = TWO_PI * freq / SR;
  return {
    y1: 0, y2: 0,
    a1: -2 * r * Math.cos(theta),
    a2: r * r,
    b0: (1 - r) * 0.7, // conservative gain
  };
}

function tickBP(f: BPFilter, x: number): number {
  const y = f.b0 * x - f.a1 * f.y1 - f.a2 * f.y2;
  f.y2 = f.y1;
  f.y1 = y;
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
// DC BLOCKER
// ═══════════════════════════════════════════════════════════
let dcX1 = 0, dcY1 = 0;
function dcBlock(x: number): number {
  const y = x - dcX1 + 0.997 * dcY1;
  dcX1 = x; dcY1 = y;
  return y;
}

// ═══════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════

export async function synthesizeFormant(text: string): Promise<Blob> {
  const phonemes = textToPhonemes(text);
  console.log(`[Formant v8] "${text.slice(0, 50)}..." → ${phonemes.length} phonemes`);

  dcX1 = 0; dcY1 = 0;
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
    console.warn("[Formant v8] Error:", err);
    return { played: false, audio: null };
  }
}

// ═══════════════════════════════════════════════════════════
// CORE SYNTHESIS: Additive Source-Filter Model
// ═══════════════════════════════════════════════════════════

function renderPhonemes(phonemes: string[]): Float32Array {
  // Total duration
  let totalMs = 0;
  for (const p of phonemes) {
    const params = PT_PHONEMES[p];
    totalMs += params ? params.duration : 50;
  }
  totalMs += phonemes.filter(p => PT_PHONEMES[p]?.plosive).length * 50;
  totalMs += 400;

  const totalSamples = Math.ceil((totalMs / 1000) * SR) + SR;
  const buffer = new Float32Array(totalSamples);

  // Harmonic oscillator phases (persistent across phonemes for continuity)
  const harmonicPhases = new Float64Array(NUM_HARMONICS);

  // Noise filter for fricatives
  const noiseBP1 = makeBP(2500, 800);
  const noiseBP2 = makeBP(5000, 1200);

  const oq = VOICE_DNA.glottal.openQuotient;
  const harmonicProfile = VOICE_DNA.harmonicProfile;
  const jitterAmt = VOICE_DNA.dynamics.jitter * 0.15;
  const shimmerAmt = VOICE_DNA.dynamics.shimmer * 0.06;

  let offset = 0;

  // Interpolation state
  let curF1 = 500, curF2 = 1500, curF3 = 2500, curF4 = 3500;
  let curBw1 = 100, curBw2 = 120, curBw3 = 150, curBw4 = 200;
  let curAmp = 0;

  for (let pi = 0; pi < phonemes.length; pi++) {
    const phoneme = phonemes[pi];
    const params = PT_PHONEMES[phoneme];
    if (!params) continue;

    // Targets — apply MFCC formant corrections
    const tgtF1 = (params.f1 || curF1) * MFCC_FIX.formantScale[0];
    const tgtF2 = (params.f2 || curF2) * MFCC_FIX.formantScale[1];
    const tgtF3 = (params.f3 || curF3) * MFCC_FIX.formantScale[2];
    const tgtF4 = (params.f4 || curF4) * MFCC_FIX.formantScale[3];
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
      aspirationMs = params.voiced ? 20 : 35;
      phonemeDuration += aspirationMs;
    }

    const numSamples = Math.floor((phonemeDuration / 1000) * SR);
    const transitionSamples = Math.min(Math.floor(0.045 * SR), numSamples); // 45ms
    const sentPos = pi / Math.max(phonemes.length - 1, 1);

    // Pre-compute F0 for this phoneme segment
    const baseF0 = getProsodyF0(sentPos);

    for (let n = 0; n < numSamples; n++) {
      if (offset >= buffer.length) break;
      const pos = n / Math.max(numSamples - 1, 1);

      // ── SMOOTH INTERPOLATION ──
      const iT = n < transitionSamples ? n / transitionSamples : 1;
      const sT = iT * iT * (3 - 2 * iT); // smoothstep

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

      // Skip silence
      if (amp < 0.001 && !params.plosive) {
        buffer[offset++] = 0;
        continue;
      }

      let sample = 0;

      // ═════════════════════════════════════
      // VOICED: Additive harmonic synthesis
      // ═════════════════════════════════════
      if (params.voiced) {
        // F0 with jitter — use MFCC-corrected F0 target
        const f0 = baseF0 * (1 + (Math.random() - 0.5) * jitterAmt);

        // Pre-compute formant envelope values (cache per sample for speed)
        // Then sum harmonics weighted by envelope
        for (let h = 0; h < NUM_HARMONICS; h++) {
          const freq = f0 * (h + 1);
          if (freq > SR * 0.45) break; // Nyquist guard

          // Advance phase
          harmonicPhases[h] += TWO_PI * freq / SR;
          if (harmonicPhases[h] > TWO_PI) harmonicPhases[h] -= TWO_PI;

          // Source amplitude: voice DNA harmonic profile (natural decay)
          let sourceAmp = h < harmonicProfile.length
            ? harmonicProfile[h]
            : harmonicProfile[harmonicProfile.length - 1] * Math.exp(-0.3 * (h - harmonicProfile.length + 1));

          // MFCC correction: boost higher harmonics for brightness
          const hBoost = h < MFCC_FIX.harmonicBoost.length
            ? MFCC_FIX.harmonicBoost[h]
            : MFCC_FIX.harmonicBoost[MFCC_FIX.harmonicBoost.length - 1];
          sourceAmp *= hBoost;

          // Spectral tilt compensation: progressively boost high harmonics
          const tiltBoost = 1 + (h / NUM_HARMONICS) * MFCC_FIX.spectralTiltCompensation * 0.1;
          sourceAmp *= tiltBoost;

          // Filter: formant envelope at this frequency
          const filterGain = formantEnvelope(freq, f1, f2, f3, f4, bw1, bw2, bw3, bw4);

          // Shimmer (amplitude variation per cycle)
          const shimmer = 1 + (Math.random() - 0.5) * shimmerAmt;

          // Add this harmonic
          sample += Math.sin(harmonicPhases[h]) * sourceAmp * filterGain * shimmer;
        }

        // MFCC-corrected breathiness (more natural aspiration noise)
        sample += (Math.random() * 2 - 1) * MFCC_FIX.breathiness;

        // Nasal: MFCC-corrected coupling (reduced from analysis)
        if (params.nasal) {
          sample *= (1 - MFCC_FIX.nasalReduction); // reduce oral energy less
          const nasalFreq = 270;
          const nasalPhase = harmonicPhases[0] * (nasalFreq / (baseF0 || 130));
          sample += Math.sin(nasalPhase) * 0.12; // reduced nasal resonance
        }
      }

      // ═════════════════════════════════════
      // NOISE: Fricatives and plosives
      // ═════════════════════════════════════
      if (params.fricative || params.plosive) {
        let noise = Math.random() * 2 - 1;

        if (params.plosive) {
          const burstEnd = Math.floor(0.008 * SR);
          const aspEnd = Math.floor((0.008 + aspirationMs / 1000) * SR);

          if (n < burstEnd) {
            noise *= 0.9 * (1 - n / burstEnd);
          } else if (n < aspEnd) {
            const aspProg = (n - burstEnd) / (aspEnd - burstEnd);
            noise *= 0.5 * (1 - aspProg * 0.5);
          } else {
            noise *= 0.03;
          }
        } else {
          noise *= 0.35;
        }

        // Shape noise with bandpass near F2/F3
        updateBP(noiseBP1, f2, bw2 * 2);
        updateBP(noiseBP2, f3, bw3 * 2);
        const shaped = tickBP(noiseBP1, noise) * 0.5 + tickBP(noiseBP2, noise) * 0.5;

        if (params.voiced) {
          sample = sample * 0.6 + shaped * 0.4;
        } else {
          sample += shaped;
        }
      }

      // ── DC BLOCK + APPLY ENVELOPE ──
      sample = dcBlock(sample);
      buffer[offset++] = sample * env * amp;
    }

    // Update state
    curF1 = tgtF1; curF2 = tgtF2; curF3 = tgtF3; curF4 = tgtF4;
    curBw1 = tgtBw1; curBw2 = tgtBw2; curBw3 = tgtBw3; curBw4 = tgtBw4;
    curAmp = tgtAmp;
  }

  return buffer.slice(0, offset);
}

// ═══════════════════════════════════════════════════════════
// PROSODY
// ═══════════════════════════════════════════════════════════
function getProsodyF0(sentencePos: number): number {
  // Use MFCC-corrected F0 target instead of voice DNA mean
  const targetF0 = MFCC_FIX.f0Target; // 150 Hz from reference analysis
  const { p5, p95 } = VOICE_DNA.f0;

  let f0 = targetF0;
  if (sentencePos < 0.15) {
    // Slight rise at sentence start
    f0 = targetF0 * (1.0 + sentencePos * 0.12);
  } else if (sentencePos > 0.75) {
    // Declarative fall at end
    f0 = targetF0 * (1.01 - (sentencePos - 0.75) * 0.12);
  } else {
    // Mid-sentence: gentle variation
    f0 = targetF0 * (1.01 + Math.sin(sentencePos * Math.PI * 3) * 0.02);
  }

  // Micro-prosody: slight random variation for naturalness
  f0 += (Math.random() - 0.5) * 4;
  return Math.max(p5, Math.min(p95, f0));
}

// ═══════════════════════════════════════════════════════════
// ENVELOPE
// ═══════════════════════════════════════════════════════════
function getEnvelope(pos: number, durationMs: number, isPlosive: boolean): number {
  if (isPlosive) {
    if (pos < 0.03) return pos / 0.03;
    if (pos > 0.6) return Math.max(0, 1 - (pos - 0.6) / 0.4);
    return 1.0;
  }

  const attackMs = 10;
  const releaseMs = 15;
  const attack = Math.min(attackMs / durationMs, 0.25);
  const release = Math.min(releaseMs / durationMs, 0.25);

  if (pos < attack) return pos / attack;
  if (pos > 1 - release) return (1 - pos) / release;
  return 1.0;
}

// ═══════════════════════════════════════════════════════════
// POST-PROCESSING: Normalize only
// ═══════════════════════════════════════════════════════════
function postProcess(samples: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  if (peak === 0) return samples;

  const gain = 0.89 / peak;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] * gain;
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

  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); v.setUint32(4, 36 + dataLen, true);
  ws(8, "WAVE"); ws(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  ws(36, "data"); v.setUint32(40, dataLen, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buf], { type: "audio/wav" });
}
