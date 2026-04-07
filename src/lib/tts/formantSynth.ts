/**
 * Orion Formant Speech Synthesizer v17 — Full Source-Filter with LF Glottal Model
 * 
 * Fixes from v16:
 * 1. SR raised to 44100 for proper high-frequency fricatives
 * 2. LF glottal waveform replaces sparse impulse train
 * 3. Plosive burst/VOT gains doubled for intelligibility
 * 4. Harmonic-rich source with spectral tilt from Voice DNA
 * 
 * Architecture: Source (LF glottal / noise / mixed) → 3x IIR Resonators → Post-process
 * 100% client-side, zero API, zero dependencies.
 */

import {
  PT_PHONEMES,
  textToPhonemes,
  VOICE_DNA,
  type PhonemeParams,
} from "./phonemes";

const SR = 44100; // ← FIX #1: raised from 24000 for proper high-freq fricatives
const FRAME_SIZE = 220; // 5ms frames at 44.1kHz (was 120 at 24kHz)
const N_FILTERS = 3;

// ═══════════════════════════════════════════════════════════
// IIR BIQUAD RESONATOR
// ═══════════════════════════════════════════════════════════

interface Resonator {
  a0: number;
  b1: number;
  b2: number;
  z1: number;
  z2: number;
}

function computeCoeffs(freq: number, bw: number): { a0: number; b1: number; b2: number } {
  if (freq < 20 || bw < 1 || freq >= SR / 2) return { a0: 1, b1: 0, b2: 0 };
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = 2 * Math.PI * freq / SR;
  const b1 = -2 * r * Math.cos(theta);
  const b2 = r * r;
  const a0 = 1 + b1 + b2;
  return { a0, b1, b2 };
}

function makeResonator(freq: number, bw: number): Resonator {
  const c = computeCoeffs(freq, bw);
  return { ...c, z1: 0, z2: 0 };
}

function setResonator(res: Resonator, freq: number, bw: number) {
  const c = computeCoeffs(freq, bw);
  res.a0 = c.a0; res.b1 = c.b1; res.b2 = c.b2;
}

function tickResonator(res: Resonator, x: number): number {
  const y = res.a0 * x - res.b1 * res.z1 - res.b2 * res.z2;
  res.z2 = res.z1;
  res.z1 = y;
  return y;
}

// ═══════════════════════════════════════════════════════════
// SOURCE GENERATORS — FIX #2 & #3: LF Glottal Model
// ═══════════════════════════════════════════════════════════

let glottalPhase = 0;

/**
 * LF (Liljencrants-Fant) glottal pulse — produces a rich harmonic source
 * instead of the sparse single-impulse approach.
 * 
 * The waveform has:
 * - Opening phase (0→Tp): rising sinusoidal
 * - Closing phase (Tp→Te): falling, with abrupt closure
 * - Return phase (Te→T0): exponential return
 * 
 * Parameters tuned from Iapetus Voice DNA:
 * OQ=0.546, SQ=2.21, H1-H2=4.6dB
 */
function generateGlottalSource(count: number, f0: number): Float32Array {
  const out = new Float32Array(count);
  const T0 = SR / f0; // period in samples
  
  // LF model parameters from Voice DNA
  const OQ = VOICE_DNA.glottal.openQuotient; // 0.546
  const SQ = VOICE_DNA.glottal.speedQuotient; // 2.21
  
  const Te = OQ * T0;           // end of open phase
  const Tp = Te / (1 + SQ);     // peak of glottal pulse
  const Ta = 0.08 * T0;         // return phase time constant
  
  // Jitter from Voice DNA
  const jitterAmount = VOICE_DNA.dynamics.jitter; // 0.0882
  
  for (let i = 0; i < count; i++) {
    const t = glottalPhase;
    let sample = 0;
    
    if (t < Tp) {
      // Opening phase — rising half-sine
      sample = 0.5 * (1 - Math.cos(Math.PI * t / Tp));
    } else if (t < Te) {
      // Closing phase — cosine fall with sharper closure
      const tc = (t - Tp) / (Te - Tp);
      sample = Math.cos(Math.PI * 0.5 * tc);
    } else {
      // Return phase — exponential recovery
      const tr = (t - Te) / Math.max(Ta, 1);
      sample = -0.2 * Math.exp(-tr);
    }
    
    out[i] = sample;
    
    // Advance phase with jitter
    const jitter = 1 + (Math.random() - 0.5) * 2 * jitterAmount;
    glottalPhase += jitter;
    
    if (glottalPhase >= T0) {
      glottalPhase -= T0;
    }
  }
  
  return out;
}

function generateNoise(count: number): Float32Array {
  const out = new Float32Array(count);
  // Slightly colored noise (low-pass at ~10kHz for more natural sound)
  let prev = 0;
  for (let i = 0; i < count; i++) {
    const white = Math.random() * 2 - 1;
    prev = 0.7 * prev + 0.3 * white; // simple LP filter
    out[i] = prev * 1.5; // compensate for energy loss
  }
  return out;
}

function generateMixed(count: number, f0: number, voiceRatio: number): Float32Array {
  const glottal = generateGlottalSource(count, f0);
  const noise = generateNoise(count);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = voiceRatio * glottal[i] + (1 - voiceRatio) * noise[i];
  }
  return out;
}

// ═══════════════════════════════════════════════════════════
// SPECTRAL TILT FILTER — shapes harmonics to match Voice DNA
// Applies the natural roll-off of the voice (26.3 dB spectral tilt)
// ═══════════════════════════════════════════════════════════

interface TiltFilter {
  alpha: number;
  z1: number;
}

function makeTiltFilter(): TiltFilter {
  // Spectral tilt of ~26dB means significant HF roll-off
  // alpha controls the amount of tilt (higher = more tilt)
  const tiltDb = VOICE_DNA.dynamics.spectralTilt; // 26.3
  const alpha = 1 - Math.pow(10, -tiltDb / 200); // ~0.72
  return { alpha: Math.min(alpha, 0.85), z1: 0 };
}

function tickTilt(f: TiltFilter, x: number): number {
  const y = x - f.alpha * f.z1;
  f.z1 = x;
  return y;
}

// ═══════════════════════════════════════════════════════════
// SEGMENT BUILDER
// ═══════════════════════════════════════════════════════════

interface SegmentParams {
  f1: number;
  f2: number;
  f3: number;
  bw1: number;
  bw2: number;
  bw3: number;
  gain: number;
  source: 'glottal' | 'noise' | 'mixed';
}

type Segment = [SegmentParams, number];

function msToSamples(ms: number): number {
  return Math.round(SR * ms / 1000);
}

// Fricative spectral peaks — noise resonators at actual spectral energy locations
const FRICATIVE_SPECTRAL: Record<string, SegmentParams> = {
  's':  { f1: 200, f2: 5500, f3: 7500, bw1: 500, bw2: 3000, bw3: 2000, gain: 0.50, source: 'noise' },
  'z':  { f1: 200, f2: 5500, f3: 7500, bw1: 500, bw2: 3000, bw3: 2000, gain: 0.40, source: 'mixed' },
  'ʃ':  { f1: 200, f2: 3800, f3: 6000, bw1: 500, bw2: 2500, bw3: 2000, gain: 0.50, source: 'noise' },
  'ʒ':  { f1: 200, f2: 3800, f3: 6000, bw1: 500, bw2: 2500, bw3: 2000, gain: 0.40, source: 'mixed' },
  'f':  { f1: 200, f2: 2500, f3: 4000, bw1: 500, bw2: 3000, bw3: 2000, gain: 0.25, source: 'noise' },
  'v':  { f1: 220, f2: 2500, f3: 4000, bw1: 500, bw2: 3000, bw3: 2000, gain: 0.30, source: 'mixed' },
  'h':  { f1: 500, f2: 1500, f3: 2500, bw1: 200, bw2: 300, bw3: 400, gain: 0.20, source: 'noise' },
  'χ':  { f1: 300, f2: 1100, f3: 2400, bw1: 400, bw2: 400, bw3: 400, gain: 0.50, source: 'noise' },
  'R':  { f1: 300, f2: 1100, f3: 2400, bw1: 110, bw2: 140, bw3: 190, gain: 0.55, source: 'mixed' },
};

/** Context-dependent /h/ — takes formants of following vowel */
function getHAllophone(nextPhoneme: string | undefined): SegmentParams {
  const vp = nextPhoneme ? PT_PHONEMES[nextPhoneme] : null;
  if (vp && vp.voiced && !vp.fricative && !vp.plosive) {
    return {
      f1: vp.f1 || 500, f2: vp.f2 || 1500, f3: vp.f3 || 2500,
      bw1: 200, bw2: 300, bw3: 400, gain: 0.20, source: 'noise',
    };
  }
  return FRICATIVE_SPECTRAL['h'];
}

/** Convert PhonemeParams to SegmentParams */
function phonemeToSegment(p: PhonemeParams, phoneme: string): SegmentParams {
  const fricSpec = FRICATIVE_SPECTRAL[phoneme];
  if (fricSpec) return fricSpec;

  let source: 'glottal' | 'noise' | 'mixed' = 'glottal';
  if (p.fricative && !p.voiced) source = 'noise';
  else if (p.fricative && p.voiced) source = 'mixed';

  return {
    f1: p.f1 || 300, f2: p.f2 || 1500, f3: p.f3 || 2500,
    bw1: p.bw1 || 100, bw2: p.bw2 || 120, bw3: p.bw3 || 150,
    gain: p.amplitude,
    source,
  };
}

// ── FIX #3: Plosive gains DOUBLED for intelligibility ──
const PLOSIVE_RULES: Record<string, {
  closureMs: number; burstMs: number; votMs: number;
  closureType: 'silence' | 'voicebar';
}> = {
  'p':   { closureMs: 70, burstMs: 12, votMs: 20,  closureType: 'silence' },
  'b':   { closureMs: 50, burstMs: 8,  votMs: 5,   closureType: 'voicebar' },
  't':   { closureMs: 70, burstMs: 12, votMs: 25,  closureType: 'silence' },
  'd':   { closureMs: 50, burstMs: 8,  votMs: 5,   closureType: 'voicebar' },
  'k':   { closureMs: 80, burstMs: 15, votMs: 35,  closureType: 'silence' },
  'g':   { closureMs: 60, burstMs: 8,  votMs: 5,   closureType: 'voicebar' },
  't͡ʃ': { closureMs: 70, burstMs: 8,  votMs: 90,  closureType: 'silence' },
  'd͡ʒ': { closureMs: 40, burstMs: 8,  votMs: 70,  closureType: 'voicebar' },
};

const SILENCE_SEG: SegmentParams = { f1: 100, f2: 100, f3: 100, bw1: 100, bw2: 100, bw3: 100, gain: 0, source: 'noise' };
const VOICEBAR_SEG: SegmentParams = { f1: 200, f2: 200, f3: 200, bw1: 100, bw2: 200, bw3: 300, gain: 0.12, source: 'glottal' };

// Burst gains ~2x higher than v16
const BURST_BY_PLACE: Record<string, SegmentParams> = {
  'p':   { f1: 300, f2: 1000, f3: 2300, bw1: 500, bw2: 1500, bw3: 2000, gain: 0.60, source: 'noise' },
  'b':   { f1: 300, f2: 1000, f3: 2300, bw1: 500, bw2: 1500, bw3: 2000, gain: 0.55, source: 'noise' },
  't':   { f1: 300, f2: 4000, f3: 5500, bw1: 500, bw2: 2000, bw3: 2000, gain: 0.70, source: 'noise' },
  'd':   { f1: 300, f2: 4000, f3: 5500, bw1: 500, bw2: 2000, bw3: 2000, gain: 0.65, source: 'noise' },
  'k':   { f1: 300, f2: 1800, f3: 2600, bw1: 500, bw2: 2000, bw3: 2000, gain: 0.60, source: 'noise' },
  'g':   { f1: 300, f2: 1800, f3: 2600, bw1: 500, bw2: 2000, bw3: 2000, gain: 0.55, source: 'noise' },
  't͡ʃ': { f1: 300, f2: 3800, f3: 6000, bw1: 500, bw2: 2000, bw3: 2000, gain: 0.70, source: 'noise' },
  'd͡ʒ': { f1: 300, f2: 3800, f3: 6000, bw1: 500, bw2: 2000, bw3: 2000, gain: 0.65, source: 'noise' },
};

function getBurstParams(phoneme: string): SegmentParams {
  return BURST_BY_PLACE[phoneme] || BURST_BY_PLACE['p'];
}

/** VOT adapts to following vowel */
function getVOTParams(phoneme: string, nextPhoneme?: string): SegmentParams {
  if (phoneme === 't͡ʃ') {
    return { f1: 200, f2: 3800, f3: 6000, bw1: 500, bw2: 2500, bw3: 2000, gain: 0.50, source: 'noise' };
  }
  if (phoneme === 'd͡ʒ') {
    return { f1: 200, f2: 3800, f3: 6000, bw1: 500, bw2: 2500, bw3: 2000, gain: 0.40, source: 'mixed' };
  }
  const vowel = nextPhoneme ? PT_PHONEMES[nextPhoneme] : null;
  if (vowel && vowel.voiced && !vowel.fricative && !vowel.plosive) {
    return {
      f1: vowel.f1 || 500, f2: vowel.f2 || 1500, f3: vowel.f3 || 2500,
      bw1: 300, bw2: 400, bw3: 500, gain: 0.18, source: 'noise',
    };
  }
  return { f1: 500, f2: 1500, f3: 2500, bw1: 300, bw2: 400, bw3: 500, gain: 0.18, source: 'noise' };
}

/** Build the segment sequence from phonemes */
function buildSegments(phonemes: string[]): Segment[] {
  const seq: Segment[] = [];

  for (let pi = 0; pi < phonemes.length; pi++) {
    const phoneme = phonemes[pi];
    const params = PT_PHONEMES[phoneme];
    if (!params) continue;

    const nextPhoneme = pi + 1 < phonemes.length ? phonemes[pi + 1] : undefined;

    // Plosives: closure → burst → VOT
    const plosiveRule = PLOSIVE_RULES[phoneme];
    if (plosiveRule) {
      const { closureMs, burstMs, votMs, closureType } = plosiveRule;
      if (closureMs > 0) {
        seq.push([closureType === 'silence' ? SILENCE_SEG : VOICEBAR_SEG, msToSamples(closureMs)]);
      }
      if (burstMs > 0) {
        seq.push([getBurstParams(phoneme), msToSamples(burstMs)]);
      }
      if (votMs > 0) {
        seq.push([getVOTParams(phoneme, nextPhoneme), msToSamples(votMs)]);
      }
      continue;
    }

    // Context-dependent /h/
    if (phoneme === 'h') {
      seq.push([getHAllophone(nextPhoneme), msToSamples(params.duration)]);
      continue;
    }

    // Regular phonemes
    const seg = phonemeToSegment(params, phoneme);
    seq.push([seg, msToSamples(params.duration)]);
  }

  return seq;
}

// ═══════════════════════════════════════════════════════════
// MAIN SYNTHESIZER
// ═══════════════════════════════════════════════════════════

function synthesize(seq: Segment[]): Float32Array {
  if (seq.length === 0) return new Float32Array(0);

  let totalSamples = 0;
  for (const [, dur] of seq) totalSamples += dur;
  totalSamples += SR; // padding

  const output = new Float32Array(totalSamples);
  let writePos = 0;

  // Persistent filter state
  const filters: Resonator[] = [
    makeResonator(500, 100),
    makeResonator(1500, 120),
    makeResonator(2500, 150),
  ];

  // Spectral tilt filter
  const tilt = makeTiltFilter();

  const amplitude = 0.9;
  const f0Base = VOICE_DNA.f0.median || 125;

  for (let si = 0; si < seq.length; si++) {
    const [paramCurr, durationSamples] = seq[si];
    const paramNext = si + 1 < seq.length ? seq[si + 1][0] : paramCurr;

    // F0 with natural micro-variation
    const f0 = f0Base + (Math.random() - 0.5) * 8;

    // Generate source — FIX #4: glottal model instead of impulse
    let source: Float32Array;
    if (paramCurr.source === 'noise') {
      source = generateNoise(durationSamples);
    } else if (paramCurr.source === 'mixed') {
      source = generateMixed(durationSamples, f0, 0.55);
    } else {
      source = generateGlottalSource(durationSamples, f0);
    }

    // Apply spectral tilt to voiced source only
    if (paramCurr.source === 'glottal') {
      for (let i = 0; i < source.length; i++) {
        source[i] = tickTilt(tilt, source[i]);
      }
    }

    // Set resonators
    setResonator(filters[0], paramCurr.f1, paramCurr.bw1);
    setResonator(filters[1], paramCurr.f2, paramCurr.bw2);
    setResonator(filters[2], paramCurr.f3, paramCurr.bw3);

    // Process in 5ms frames with coarticulation
    for (let frameBeg = 0; frameBeg < durationSamples; frameBeg += FRAME_SIZE) {
      const frameEnd = Math.min(frameBeg + FRAME_SIZE, durationSamples);
      const position = frameBeg / Math.max(durationSamples, 1);

      // Interpolation in last 30%
      if (position > 0.7) {
        const blend = (position - 0.7) / 0.3;
        setResonator(filters[0],
          paramCurr.f1 + (paramNext.f1 - paramCurr.f1) * blend,
          paramCurr.bw1 + (paramNext.bw1 - paramCurr.bw1) * blend);
        setResonator(filters[1],
          paramCurr.f2 + (paramNext.f2 - paramCurr.f2) * blend,
          paramCurr.bw2 + (paramNext.bw2 - paramCurr.bw2) * blend);
        setResonator(filters[2],
          paramCurr.f3 + (paramNext.f3 - paramCurr.f3) * blend,
          paramCurr.bw3 + (paramNext.bw3 - paramCurr.bw3) * blend);
      }

      // Interpolate gain
      const gainBlend = position > 0.7 ? (position - 0.7) / 0.3 : 0;
      const currentGain = paramCurr.gain + (paramNext.gain - paramCurr.gain) * gainBlend;

      // Filter through cascade
      for (let j = frameBeg; j < frameEnd; j++) {
        let y = source[j];
        for (let fi = 0; fi < N_FILTERS; fi++) {
          y = tickResonator(filters[fi], y);
        }
        const idx = writePos + j;
        if (idx < output.length) {
          output[idx] = clamp(y * amplitude * currentGain);
        }
      }
    }

    writePos += durationSamples;
  }

  return output.slice(0, writePos);
}

function clamp(x: number): number {
  return x > 1 ? 1 : x < -1 ? -1 : x;
}

// ═══════════════════════════════════════════════════════════
// POST-PROCESSING
// ═══════════════════════════════════════════════════════════

function postProcess(samples: Float32Array): Float32Array {
  const len = samples.length;
  if (len === 0) return samples;

  // DC blocking filter
  let dcX1 = 0, dcY1 = 0;
  const dc = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const y = samples[i] - dcX1 + 0.997 * dcY1;
    dcX1 = samples[i];
    dcY1 = y;
    dc[i] = y;
  }

  // Gentle pre-emphasis to brighten (compensate for LF model warmth)
  const preEmph = new Float32Array(len);
  preEmph[0] = dc[0];
  for (let i = 1; i < len; i++) {
    preEmph[i] = dc[i] - 0.35 * dc[i - 1];
  }

  // Normalize to -1dB
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const a = Math.abs(preEmph[i]);
    if (a > peak) peak = a;
  }
  if (peak === 0) return preEmph;

  const gain = 0.89 / peak;
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = preEmph[i] * gain;
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
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
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

// ═══════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════

export async function synthesizeFormant(text: string): Promise<Blob> {
  const phonemes = textToPhonemes(text);
  console.log(`[Formant v17] "${text.slice(0, 50)}..." → ${phonemes.length} phonemes`);

  // Reset glottal phase
  glottalPhase = 0;

  const segments = buildSegments(phonemes);
  console.log(`[Formant v17] ${segments.length} segments built`);

  const samples = synthesize(segments);
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
    console.warn("[Formant v17] Error:", err);
    return { played: false, audio: null };
  }
}
