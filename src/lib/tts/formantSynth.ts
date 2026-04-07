/**
 * Orion Formant Speech Synthesizer v16 — IIR Resonator Source-Filter
 * 
 * Architecture rewrite based on classic Klatt/cascade formant synthesis:
 * 1. SOURCE: Impulse train (voiced) or white noise (fricatives) or mixed
 * 2. FILTER: Cascade of 3 IIR biquad resonators (F1, F2, F3)
 * 3. SEGMENTS: Proper plosive modeling (closure → burst → VOT)
 * 4. COARTICULATION: Last 30% of each segment interpolates toward next
 * 
 * 100% client-side, zero API, zero dependencies.
 */

import {
  PT_PHONEMES,
  textToPhonemes,
  VOICE_DNA,
  type PhonemeParams,
} from "./phonemes";

const SR = VOICE_DNA.sampleRate; // 24000
const FRAME_SIZE = 120; // 5ms frames at 24kHz

// ═══════════════════════════════════════════════════════════
// IIR BIQUAD RESONATOR — the core of formant synthesis
// Exactly like the Python reference: y = a0*x - b1*z1 - b2*z2
// ═══════════════════════════════════════════════════════════

interface Resonator {
  a0: number;
  b1: number;
  b2: number;
  z1: number;
  z2: number;
}

const N_FILTERS = 3;

function computeCoeffs(freq: number, bw: number): { a0: number; b1: number; b2: number } {
  if (freq < 20 || bw < 1) return { a0: 1, b1: 0, b2: 0 };
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
  res.a0 = c.a0;
  res.b1 = c.b1;
  res.b2 = c.b2;
}

function tickResonator(res: Resonator, x: number): number {
  const y = res.a0 * x - res.b1 * res.z1 - res.b2 * res.z2;
  res.z2 = res.z1;
  res.z1 = y;
  return y;
}

// ═══════════════════════════════════════════════════════════
// SOURCE GENERATORS
// ═══════════════════════════════════════════════════════════

let impulsePhase = 0;

function generateImpulseTrain(count: number, f0: number): Float32Array {
  const out = new Float32Array(count);
  const step = f0 / SR;
  for (let i = 0; i < count; i++) {
    const prev = impulsePhase;
    impulsePhase += step;
    if (impulsePhase >= 1) {
      impulsePhase -= 1;
      out[i] = 1.0;
    }
  }
  return out;
}

function generateNoise(count: number): Float32Array {
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = Math.random() * 2 - 1;
  }
  return out;
}

function generateMixed(count: number, f0: number, voiceRatio: number): Float32Array {
  const impulse = generateImpulseTrain(count, f0);
  const noise = generateNoise(count);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = voiceRatio * impulse[i] + (1 - voiceRatio) * noise[i];
  }
  return out;
}

// ═══════════════════════════════════════════════════════════
// SEGMENT BUILDER — Convert phonemes to (params, duration) segments
// Like KanaSegmentBuilder but for pt-BR
// ═══════════════════════════════════════════════════════════

interface SegmentParams {
  f1: number;
  f2: number;
  f3: number;
  bw1: number;
  bw2: number;
  bw3: number;
  gain: number;
  source: 'impulse' | 'noise' | 'mixed';
}

type Segment = [SegmentParams, number]; // [params, duration_in_samples]

function msToSamples(ms: number): number {
  return Math.round(SR * ms / 1000);
}

/** Convert PhonemeParams to SegmentParams */
function phonemeToSegment(p: PhonemeParams): SegmentParams {
  let source: 'impulse' | 'noise' | 'mixed' = 'impulse';
  if (p.fricative && !p.voiced) source = 'noise';
  else if (p.fricative && p.voiced) source = 'mixed';
  else if (p.plosive && !p.voiced) source = 'noise';

  return {
    f1: p.f1 || 300,
    f2: p.f2 || 1500,
    f3: p.f3 || 2500,
    bw1: p.bw1 || 100,
    bw2: p.bw2 || 120,
    bw3: p.bw3 || 150,
    gain: p.amplitude,
    source,
  };
}

// Plosive modeling: closure → burst → VOT (like the Python reference)
const PLOSIVE_RULES: Record<string, {
  closureMs: number;
  burstMs: number;
  votMs: number;
  closureType: 'silence' | 'voicebar';
}> = {
  'p': { closureMs: 70, burstMs: 10, votMs: 15, closureType: 'silence' },
  'b': { closureMs: 50, burstMs: 5,  votMs: 0,  closureType: 'voicebar' },
  't': { closureMs: 70, burstMs: 10, votMs: 20, closureType: 'silence' },
  'd': { closureMs: 50, burstMs: 5,  votMs: 0,  closureType: 'voicebar' },
  'k': { closureMs: 80, burstMs: 10, votMs: 30, closureType: 'silence' },
  'g': { closureMs: 60, burstMs: 5,  votMs: 0,  closureType: 'voicebar' },
  't͡ʃ': { closureMs: 70, burstMs: 5,  votMs: 80, closureType: 'silence' },
  'd͡ʒ': { closureMs: 40, burstMs: 5,  votMs: 60, closureType: 'voicebar' },
};

// Predefined segment params for plosive sub-segments
const SILENCE_SEG: SegmentParams = { f1: 100, f2: 100, f3: 100, bw1: 100, bw2: 100, bw3: 100, gain: 0, source: 'impulse' };
const VOICEBAR_SEG: SegmentParams = { f1: 200, f2: 200, f3: 200, bw1: 100, bw2: 200, bw3: 300, gain: 0.08, source: 'impulse' };

function getBurstParams(phoneme: string): SegmentParams {
  const p = PT_PHONEMES[phoneme];
  if (!p) return { f1: 300, f2: 1000, f3: 2300, bw1: 500, bw2: 1500, bw3: 2000, gain: 0.3, source: 'noise' };
  // Burst uses noise shaped through the consonant's formants, wider bandwidths
  return {
    f1: p.f1 || 300,
    f2: p.f2 || 1500,
    f3: p.f3 || 2500,
    bw1: 500,
    bw2: 1500,
    bw3: 2000,
    gain: 0.35,
    source: 'noise',
  };
}

function getVOTParams(phoneme: string): SegmentParams {
  // VOT is aspiration noise shaped by the following vowel's vicinity
  // For affricates, VOT is the fricative portion
  if (phoneme === 't͡ʃ') {
    return { f1: 200, f2: 3800, f3: 6000, bw1: 500, bw2: 2500, bw3: 2000, gain: 0.4, source: 'noise' };
  }
  if (phoneme === 'd͡ʒ') {
    return { f1: 200, f2: 3800, f3: 6000, bw1: 500, bw2: 2500, bw3: 2000, gain: 0.3, source: 'mixed' };
  }
  return {
    f1: 500, f2: 1500, f3: 2500,
    bw1: 300, bw2: 400, bw3: 500,
    gain: 0.10,
    source: 'noise',
  };
}

/** Build the segment sequence from phonemes — the key conversion step */
function buildSegments(phonemes: string[]): Segment[] {
  const seq: Segment[] = [];
  const vowelSamples = msToSamples(120);

  for (const phoneme of phonemes) {
    const params = PT_PHONEMES[phoneme];
    if (!params) continue;

    // Handle plosives with proper closure → burst → VOT
    const plosiveRule = PLOSIVE_RULES[phoneme];
    if (plosiveRule) {
      const { closureMs, burstMs, votMs, closureType } = plosiveRule;
      // 1. Closure
      if (closureMs > 0) {
        seq.push([closureType === 'silence' ? SILENCE_SEG : VOICEBAR_SEG, msToSamples(closureMs)]);
      }
      // 2. Burst
      if (burstMs > 0) {
        seq.push([getBurstParams(phoneme), msToSamples(burstMs)]);
      }
      // 3. VOT (aspiration or fricative portion)
      if (votMs > 0) {
        seq.push([getVOTParams(phoneme), msToSamples(votMs)]);
      }
      continue;
    }

    // Regular phonemes
    const seg = phonemeToSegment(params);
    const dur = msToSamples(params.duration);
    seq.push([seg, dur]);
  }

  return seq;
}

// ═══════════════════════════════════════════════════════════
// MAIN SYNTHESIZER — IIR cascade like the Python reference
// ═══════════════════════════════════════════════════════════

function synthesize(seq: Segment[]): Float32Array {
  if (seq.length === 0) return new Float32Array(0);

  // Calculate total samples
  let totalSamples = 0;
  for (const [, dur] of seq) totalSamples += dur;
  totalSamples += SR; // padding

  const output = new Float32Array(totalSamples);
  let writePos = 0;

  // Persistent filter state (carries across segments for smooth transitions)
  const filters: Resonator[] = [];
  for (let i = 0; i < N_FILTERS; i++) {
    filters.push(makeResonator(300 + i * 500, 100));
  }

  const amplitude = 0.9;
  const f0Base = VOICE_DNA.f0.median || 125;

  for (let si = 0; si < seq.length; si++) {
    const [paramCurr, durationSamples] = seq[si];
    const paramNext = si + 1 < seq.length ? seq[si + 1][0] : paramCurr;

    // Generate source signal for this segment
    let source: Float32Array;
    const f0 = f0Base + (Math.random() - 0.5) * 6; // slight jitter
    if (paramCurr.source === 'noise') {
      source = generateNoise(durationSamples);
    } else if (paramCurr.source === 'mixed') {
      source = generateMixed(durationSamples, f0, 0.6);
    } else {
      source = generateImpulseTrain(durationSamples, f0);
    }

    // Set resonators to current segment's formants
    setResonator(filters[0], paramCurr.f1, paramCurr.bw1);
    setResonator(filters[1], paramCurr.f2, paramCurr.bw2);
    setResonator(filters[2], paramCurr.f3, paramCurr.bw3);

    // Process in frames with coarticulation in last 30%
    for (let frameBeg = 0; frameBeg < durationSamples; frameBeg += FRAME_SIZE) {
      const frameEnd = Math.min(frameBeg + FRAME_SIZE, durationSamples);

      // Interpolation toward next segment in last 30%
      const position = frameBeg / Math.max(durationSamples, 1);
      if (position > 0.7) {
        const blend = (position - 0.7) / 0.3;
        const interpF1 = paramCurr.f1 + (paramNext.f1 - paramCurr.f1) * blend;
        const interpF2 = paramCurr.f2 + (paramNext.f2 - paramCurr.f2) * blend;
        const interpF3 = paramCurr.f3 + (paramNext.f3 - paramCurr.f3) * blend;
        const interpBw1 = paramCurr.bw1 + (paramNext.bw1 - paramCurr.bw1) * blend;
        const interpBw2 = paramCurr.bw2 + (paramNext.bw2 - paramCurr.bw2) * blend;
        const interpBw3 = paramCurr.bw3 + (paramNext.bw3 - paramCurr.bw3) * blend;
        setResonator(filters[0], interpF1, interpBw1);
        setResonator(filters[1], interpF2, interpBw2);
        setResonator(filters[2], interpF3, interpBw3);
      }

      // Interpolate gain
      const gainBlend = position > 0.7 ? (position - 0.7) / 0.3 : 0;
      const currentGain = paramCurr.gain + (paramNext.gain - paramCurr.gain) * gainBlend;

      // Filter each sample through cascade of resonators
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

  // DC blocking
  let dcX1 = 0, dcY1 = 0;
  const dc = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const y = samples[i] - dcX1 + 0.997 * dcY1;
    dcX1 = samples[i];
    dcY1 = y;
    dc[i] = y;
  }

  // Normalize to -1dB
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const a = Math.abs(dc[i]);
    if (a > peak) peak = a;
  }
  if (peak === 0) return dc;

  const gain = 0.89 / peak;
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = dc[i] * gain;
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
  console.log(`[Formant v16] "${text.slice(0, 50)}..." → ${phonemes.length} phonemes`);

  // Reset impulse phase
  impulsePhase = 0;

  const segments = buildSegments(phonemes);
  console.log(`[Formant v16] ${segments.length} segments built`);

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
    console.warn("[Formant v16] Error:", err);
    return { played: false, audio: null };
  }
}
