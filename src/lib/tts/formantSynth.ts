/**
 * Orion Formant Speech Synthesizer v7 — KLATT-STYLE
 * 
 * Proper speech synthesis based on Klatt (1980) architecture:
 * - LF glottal model (differentiated flow) as source
 * - Cascade resonators for vowels with proper gain normalization
 * - Parallel resonators for fricatives/plosives
 * - Lip radiation filter (+6dB/oct first-order difference)
 * - Separate voicing and noise branches
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
const TWO_PI = 2 * Math.PI;

// ═══════════════════════════════════════════════════════════
// RESONATOR: 2-pole IIR bandpass (Klatt-style)
// Transfer: H(z) = 1 / (1 + a1*z^-1 + a2*z^-2)
// This is a UNITY GAIN AT CENTER FREQUENCY resonator.
// ═══════════════════════════════════════════════════════════
interface Resonator {
  y1: number;
  y2: number;
  a: number;   // coefficient a1
  b: number;   // coefficient a2
  c: number;   // input gain
}

function makeResonator(freq: number, bw: number): Resonator {
  if (freq < 10) return { y1: 0, y2: 0, a: 0, b: 0, c: 1 };
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = TWO_PI * freq / SR;
  const cosTheta = Math.cos(theta);
  const a = -2 * r * cosTheta;
  const b = r * r;
  // Normalize gain so peak response = 1
  const c = (1 - b) * Math.sqrt(1 - (2 * r * cosTheta * cosTheta) / (1 + b));
  return { y1: 0, y2: 0, a, b, c: isNaN(c) || c <= 0 ? (1 - b) * 0.5 : c };
}

function resonatorTick(r: Resonator, x: number): number {
  const y = r.c * x - r.a * r.y1 - r.b * r.y2;
  r.y2 = r.y1;
  r.y1 = y;
  return y;
}

function resonatorUpdate(r: Resonator, freq: number, bw: number) {
  if (freq < 10) { r.a = 0; r.b = 0; r.c = 1; return; }
  const exp = Math.exp(-Math.PI * bw / SR);
  const theta = TWO_PI * freq / SR;
  const cosTheta = Math.cos(theta);
  r.a = -2 * exp * cosTheta;
  r.b = exp * exp;
  const c = (1 - r.b) * Math.sqrt(1 - (2 * exp * cosTheta * cosTheta) / (1 + r.b));
  r.c = isNaN(c) || c <= 0 ? (1 - r.b) * 0.5 : c;
}

// ═══════════════════════════════════════════════════════════
// ANTI-RESONATOR (zero pair for nasal coupling)
// ═══════════════════════════════════════════════════════════
interface AntiRes {
  x1: number;
  x2: number;
  a: number;
  b: number;
  c: number;
}

function makeAntiResonator(freq: number, bw: number): AntiRes {
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = TWO_PI * freq / SR;
  const a = -2 * r * Math.cos(theta);
  const b = r * r;
  const c = 1.0 / (1.0 - b + 0.001);
  return { x1: 0, x2: 0, a, b, c };
}

function antiResTick(ar: AntiRes, x: number): number {
  const y = ar.c * x + ar.a * ar.x1 + ar.b * ar.x2;
  ar.x2 = ar.x1;
  ar.x1 = x;
  return y;
}

// ═══════════════════════════════════════════════════════════
// GLOTTAL SOURCE: LF (Liljencrants-Fant) differentiated flow
// This produces a natural-sounding excitation with spectral
// tilt of ~-12dB/octave, which is what vocal cords produce.
// ═══════════════════════════════════════════════════════════
function lfGlottalPulse(phase: number, oq: number): number {
  // Phase 0→oq: opening+closing (voiced), oq→1: closed
  if (phase >= oq) {
    // Return phase: exponential decay (models incomplete closure)
    const t = (phase - oq) / (1 - oq);
    return -0.15 * Math.exp(-8 * t);
  }
  
  // Open phase: sinusoidal rise, then rapid fall
  const tp = oq * 0.4;   // peak of glottal flow
  const te = oq;          // closure instant
  
  if (phase < tp) {
    // Rising: half-sine
    return 0.5 * (1 - Math.cos(Math.PI * phase / tp));
  } else {
    // Falling: cosine fall (steeper = more harmonics)
    const t = (phase - tp) / (te - tp);
    return Math.cos(Math.PI * 0.5 * t);
  }
}

// Use glottal flow directly (NOT derivative).
// The radiation filter (+6dB/oct) combined with flow (-12dB/oct)
// gives the natural speech spectrum of -6dB/oct.
function glottalSource(phase: number, oq: number): number {
  return lfGlottalPulse(phase, oq);
}

// ═══════════════════════════════════════════════════════════
// RADIATION: First-order difference (lip radiation)
// Adds +6dB/octave, simulating sound radiation from lips
// ═══════════════════════════════════════════════════════════
let radiationPrev = 0;
function radiationFilter(x: number): number {
  const y = x - radiationPrev;
  radiationPrev = x;
  return y;
}

// ═══════════════════════════════════════════════════════════
// DC BLOCKER
// ═══════════════════════════════════════════════════════════
interface DCBlock { x1: number; y1: number; }
function makeDCBlock(): DCBlock { return { x1: 0, y1: 0 }; }
function dcBlockTick(s: DCBlock, x: number): number {
  const y = x - s.x1 + 0.997 * s.y1;
  s.x1 = x; s.y1 = y;
  return y;
}

// ═══════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════

export async function synthesizeFormant(text: string): Promise<Blob> {
  const phonemes = textToPhonemes(text);
  console.log(`[Formant v7] "${text.slice(0, 50)}..." → ${phonemes.length} phonemes`);

  // Reset global state
  radiationPrev = 0;

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
    console.warn("[Formant v7] Error:", err);
    return { played: false, audio: null };
  }
}

// ═══════════════════════════════════════════════════════════
// CORE SYNTHESIS ENGINE
// ═══════════════════════════════════════════════════════════

function renderPhonemes(phonemes: string[]): Float32Array {
  // Estimate total samples
  let totalMs = 0;
  for (const p of phonemes) {
    const params = PT_PHONEMES[p];
    totalMs += params ? params.duration : 50;
  }
  totalMs += phonemes.filter(p => PT_PHONEMES[p]?.plosive).length * 50;
  totalMs += 400;

  const totalSamples = Math.ceil((totalMs / 1000) * SR) + SR;
  const buffer = new Float32Array(totalSamples);

  // ── KLATT ARCHITECTURE ──
  //
  // VOICED PATH:  GlottalSource → [CascadeF1 → F2 → F3 → F4] → RadiationFilter
  // NOISE PATH:   WhiteNoise → [ParallelF2 + F3 + F4 + F5]
  // OUTPUT:       VoicedPath + NoisePath → DCBlock → Output
  //

  // Cascade resonators (for voiced sounds)
  const cascF1 = makeResonator(500, 100);
  const cascF2 = makeResonator(1500, 120);
  const cascF3 = makeResonator(2500, 150);
  const cascF4 = makeResonator(3500, 200);

  // Parallel resonators (for noise/fricatives)
  const parF2 = makeResonator(1500, 200);
  const parF3 = makeResonator(2500, 250);
  const parF4 = makeResonator(3500, 300);

  // Nasal resonator + anti-resonator
  const nasalR = makeResonator(270, 100);
  const nasalAR = makeAntiResonator(270, 120);

  const dcBlock = makeDCBlock();

  const oq = VOICE_DNA.glottal.openQuotient;
  const jitterAmt = VOICE_DNA.dynamics.jitter * 0.2;
  const shimmerAmt = VOICE_DNA.dynamics.shimmer * 0.08;

  let offset = 0;
  let glottalPhase = 0;

  // Interpolation state
  let curF = [500, 1500, 2500, 3500];
  let curBW = [100, 120, 150, 200];
  let curAmp = 0;

  for (let pi = 0; pi < phonemes.length; pi++) {
    const phoneme = phonemes[pi];
    const params = PT_PHONEMES[phoneme];
    if (!params) continue;

    // Target formants
    const tgtF = [
      params.f1 || curF[0],
      params.f2 || curF[1],
      params.f3 || curF[2],
      params.f4 || curF[3],
    ];
    const tgtBW = [
      params.bw1 || curBW[0],
      params.bw2 || curBW[1],
      params.bw3 || curBW[2],
      params.bw4 || curBW[3],
    ];
    const tgtAmp = params.amplitude;

    const startF = [...curF];
    const startBW = [...curBW];
    const startAmp = curAmp;

    // Plosive aspiration
    let phonemeDuration = params.duration;
    let aspirationMs = 0;
    if (params.plosive) {
      aspirationMs = params.voiced ? 20 : 35;
      phonemeDuration += aspirationMs;
    }

    const numSamples = Math.floor((phonemeDuration / 1000) * SR);
    const transitionSamples = Math.min(Math.floor(0.04 * SR), numSamples); // 40ms
    const sentPos = pi / Math.max(phonemes.length - 1, 1);

    for (let n = 0; n < numSamples; n++) {
      if (offset >= buffer.length) break;
      const pos = n / Math.max(numSamples - 1, 1);

      // ── SMOOTH INTERPOLATION ──
      const iT = n < transitionSamples ? n / transitionSamples : 1;
      const sT = iT * iT * (3 - 2 * iT); // smoothstep

      const f1 = startF[0] + (tgtF[0] - startF[0]) * sT;
      const f2 = startF[1] + (tgtF[1] - startF[1]) * sT;
      const f3 = startF[2] + (tgtF[2] - startF[2]) * sT;
      const f4 = startF[3] + (tgtF[3] - startF[3]) * sT;
      const bw1 = startBW[0] + (tgtBW[0] - startBW[0]) * sT;
      const bw2 = startBW[1] + (tgtBW[1] - startBW[1]) * sT;
      const bw3 = startBW[2] + (tgtBW[2] - startBW[2]) * sT;
      const bw4 = startBW[3] + (tgtBW[3] - startBW[3]) * sT;
      const amp = startAmp + (tgtAmp - startAmp) * sT;

      // Update resonators every 32 samples
      if (n % 32 === 0) {
        resonatorUpdate(cascF1, f1, bw1);
        resonatorUpdate(cascF2, f2, bw2);
        resonatorUpdate(cascF3, f3, bw3);
        resonatorUpdate(cascF4, f4, bw4);
        resonatorUpdate(parF2, f2, bw2 * 1.5);
        resonatorUpdate(parF3, f3, bw3 * 1.5);
        resonatorUpdate(parF4, f4, bw4 * 1.5);
      }

      // Envelope
      const env = getEnvelope(pos, phonemeDuration, params.plosive);

      // Skip silence phonemes
      if (amp < 0.001 && !params.plosive) {
        buffer[offset++] = 0;
        continue;
      }

      // ══════════════════════════════════
      // VOICED PATH: Glottal → Cascade
      // ══════════════════════════════════
      let voicedOut = 0;

      if (params.voiced || (params.plosive && params.voiced)) {
        // F0 with prosody + jitter
        const f0 = getProsodyF0(sentPos) * (1 + (Math.random() - 0.5) * jitterAmt);
        glottalPhase += f0 / SR;
        if (glottalPhase >= 1) glottalPhase -= 1;

        // LF glottal flow (radiation filter adds the +6dB/oct)
        let source = glottalSource(glottalPhase, oq);

        // Shimmer
        source *= 1 + (Math.random() - 0.5) * shimmerAmt;

        // Add slight aspiration noise (breathiness)
        source += (Math.random() * 2 - 1) * 0.008;

        // CASCADE: source → F1 → F2 → F3 → F4
        if (f1 > 50) {
          let sig = resonatorTick(cascF1, source);

          // Nasal branch
          if (params.nasal) {
            sig = antiResTick(nasalAR, sig);       // Remove oral energy at nasal freq
            const nasalSig = resonatorTick(nasalR, source) * 0.25;
            sig += nasalSig;
          }

          sig = resonatorTick(cascF2, sig);
          sig = resonatorTick(cascF3, sig);
          sig = resonatorTick(cascF4, sig);

          voicedOut = sig;
        } else {
          voicedOut = source;
        }
      }

      // ══════════════════════════════════
      // NOISE PATH: Noise → Parallel
      // ══════════════════════════════════
      let noiseOut = 0;

      if (params.fricative || params.plosive) {
        let noise = (Math.random() * 2 - 1);

        if (params.plosive) {
          const burstEnd = Math.floor(0.008 * SR);
          const aspEnd = Math.floor((0.008 + aspirationMs / 1000) * SR);

          if (n < burstEnd) {
            noise *= 0.8 * (1 - n / burstEnd);
          } else if (n < aspEnd) {
            noise *= 0.4 * (1 - (n - burstEnd) / (aspEnd - burstEnd) * 0.5);
          } else {
            noise *= 0.05; // tail
          }
        } else {
          noise *= 0.4; // fricative level
        }

        // PARALLEL resonators for noise (each shaped independently)
        noiseOut += resonatorTick(parF2, noise) * 0.3;
        noiseOut += resonatorTick(parF3, noise) * 0.4;
        noiseOut += resonatorTick(parF4, noise) * 0.2;
      }

      // ══════════════════════════════════
      // COMBINE + RADIATION + DC BLOCK
      // ══════════════════════════════════
      let mixed = voicedOut + noiseOut;

      // Lip radiation: first-order highpass (+6dB/oct)
      // This is CRITICAL for intelligibility — transforms resonator
      // output into what actually comes out of a mouth
      mixed = radiationFilter(mixed);

      // DC block
      mixed = dcBlockTick(dcBlock, mixed);

      // Apply amplitude envelope
      buffer[offset++] = mixed * env * amp;
    }

    // Update current state
    curF = [...tgtF];
    curBW = [...tgtBW];
    curAmp = tgtAmp;
  }

  return buffer.slice(0, offset);
}

// ═══════════════════════════════════════════════════════════
// PROSODY: F0 contour
// ═══════════════════════════════════════════════════════════
function getProsodyF0(sentencePos: number): number {
  const { mean, p5, p95 } = VOICE_DNA.f0;

  // PT-BR declarative: slight rise at start, fall toward end
  let f0 = mean;
  if (sentencePos < 0.15) {
    f0 = mean * (1.0 + sentencePos * 0.2);
  } else if (sentencePos > 0.75) {
    f0 = mean * (1.03 - (sentencePos - 0.75) * 0.2);
  } else {
    f0 = mean * 1.03;
  }

  // Micro-prosody variation
  f0 += (Math.random() - 0.5) * 3;

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

  const attackMs = 8;
  const releaseMs = 12;
  const attack = Math.min(attackMs / durationMs, 0.25);
  const release = Math.min(releaseMs / durationMs, 0.25);

  if (pos < attack) return pos / attack;
  if (pos > 1 - release) return (1 - pos) / release;
  return 1.0;
}

// ═══════════════════════════════════════════════════════════
// POST-PROCESSING: Normalize only (no pre-emphasis — radiation
// filter already handles high-freq boost)
// ═══════════════════════════════════════════════════════════
function postProcess(samples: Float32Array): Float32Array {
  // Find peak
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  if (peak === 0) return samples;

  // Normalize to -1dB
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
