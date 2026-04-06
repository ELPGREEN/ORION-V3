/**
 * Orion Formant Speech Synthesizer v6 — CASCADE RESONATOR MODEL
 * 
 * v6 changes:
 * - CASCADE (series) resonators instead of parallel: F1→F2→F3→F4
 * - Glottal source uses real 10-harmonic DNA profile
 * - Nasal anti-resonance (zero) at ~280Hz
 * - Reduced pre-emphasis (0.15)
 * - Longer vowel durations handled via phonemes.ts
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

// ── IIR RESONATOR (2-pole bandpass for cascade) ──
interface ResonatorState {
  y1: number;
  y2: number;
  a1: number;
  a2: number;
  b0: number;
}

function createResonator(freq: number, bw: number): ResonatorState {
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = TWO_PI * freq / SR;
  return {
    y1: 0, y2: 0,
    a1: -2 * r * Math.cos(theta),
    a2: r * r,
    b0: 1 - r * r,
  };
}

function tickResonator(s: ResonatorState, x: number): number {
  const y = s.b0 * x - s.a1 * s.y1 - s.a2 * s.y2;
  s.y2 = s.y1;
  s.y1 = y;
  return y;
}

function updateResonator(s: ResonatorState, freq: number, bw: number) {
  if (freq < 20) return;
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = TWO_PI * freq / SR;
  s.a1 = -2 * r * Math.cos(theta);
  s.a2 = r * r;
  s.b0 = 1 - r * r;
}

// ── ANTI-RESONATOR (2-zero notch for nasals) ──
interface AntiResonatorState {
  x1: number;
  x2: number;
  a1: number;
  a2: number;
  b0: number;
}

function createAntiResonator(freq: number, bw: number): AntiResonatorState {
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = TWO_PI * freq / SR;
  const a1 = -2 * r * Math.cos(theta);
  const a2 = r * r;
  // Inverse of resonator transfer function
  const b0inv = 1.0 / (1 - r * r);
  return { x1: 0, x2: 0, a1, a2, b0: b0inv };
}

function tickAntiResonator(s: AntiResonatorState, x: number): number {
  const y = s.b0 * (x + s.a1 * s.x1 + s.a2 * s.x2);
  s.x2 = s.x1;
  s.x1 = x;
  return y;
}

// ── DC BLOCKER ──
interface DCBlocker { x1: number; y1: number; }
function createDCBlocker(): DCBlocker { return { x1: 0, y1: 0 }; }
function tickDCBlocker(s: DCBlocker, x: number): number {
  const y = x - s.x1 + 0.995 * s.y1;
  s.x1 = x; s.y1 = y;
  return y;
}

// ── GLOTTAL SOURCE with real harmonic DNA ──
// Builds a single glottal cycle from the 10 harmonics measured from Iapetus
function glottalDNA(phase: number, oq: number): number {
  const hp = VOICE_DNA.harmonicProfile;
  let signal = 0;
  for (let h = 0; h < hp.length; h++) {
    // Each harmonic: amplitude from DNA, phase-locked to fundamental
    signal += hp[h] * Math.sin(TWO_PI * (h + 1) * phase);
  }
  // Apply open quotient gating: silence during closed phase
  if (phase > oq) {
    signal *= Math.exp(-20 * (phase - oq)); // rapid decay in closed phase
  }
  return signal * 0.25; // normalize peak
}

/**
 * Main: synthesize text to WAV blob
 */
export async function synthesizeFormant(text: string): Promise<Blob> {
  const phonemes = textToPhonemes(text);
  console.log(`[Formant v6] "${text.slice(0, 50)}..." → ${phonemes.length} phonemes: ${phonemes.slice(0, 25).join("")}`);
  
  const samples = renderPhonemes(phonemes);
  const processed = postProcess(samples);
  return samplesToWav(processed, SR);
}

/**
 * Synthesize and play
 */
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
    console.warn("[Formant v6] Error:", err);
    return { played: false, audio: null };
  }
}

/**
 * Core synthesis: phonemes → PCM samples (CASCADE MODEL)
 */
function renderPhonemes(phonemes: string[]): Float32Array {
  // Estimate total duration
  let totalMs = 0;
  for (const p of phonemes) {
    const params = PT_PHONEMES[p];
    if (params) totalMs += params.duration;
    else totalMs += 50;
  }
  totalMs += phonemes.filter(p => PT_PHONEMES[p]?.plosive).length * 40;
  totalMs += 300; // padding

  const totalSamples = Math.ceil((totalMs / 1000) * SR) + SR;
  const buffer = new Float32Array(totalSamples);

  let offset = 0;
  let glottalPhase = 0;

  // CASCADE resonators — signal flows F1 → F2 → F3 → F4
  const resF1 = createResonator(500, 80);
  const resF2 = createResonator(1500, 100);
  const resF3 = createResonator(2500, 140);
  const resF4 = createResonator(3500, 200);

  // Nasal resonator + anti-resonator
  const nasalRes = createResonator(280, 80);
  const nasalAntiRes = createAntiResonator(280, 90);

  const dcBlock = createDCBlocker();

  const oq = VOICE_DNA.glottal.openQuotient;
  const jitterAmt = VOICE_DNA.dynamics.jitter * 0.25;
  const shimmerAmt = VOICE_DNA.dynamics.shimmer * 0.1;

  // Current interpolated state
  let curF1 = 500, curF2 = 1500, curF3 = 2500, curF4 = 3500;
  let curBw1 = 80, curBw2 = 100, curBw3 = 140, curBw4 = 200;
  let curAmp = 0;

  for (let pi = 0; pi < phonemes.length; pi++) {
    const phoneme = phonemes[pi];
    const params = PT_PHONEMES[phoneme];
    if (!params) continue;

    const tgtF1 = params.f1 || curF1;
    const tgtF2 = params.f2 || curF2;
    const tgtF3 = params.f3 || curF3;
    const tgtF4 = params.f4 || curF4;
    const tgtBw1 = params.bw1 || curBw1;
    const tgtBw2 = params.bw2 || curBw2;
    const tgtBw3 = params.bw3 || curBw3;
    const tgtBw4 = params.bw4 || curBw4;
    const tgtAmp = params.amplitude;

    const startF1 = curF1, startF2 = curF2, startF3 = curF3, startF4 = curF4;
    const startBw1 = curBw1, startBw2 = curBw2, startBw3 = curBw3, startBw4 = curBw4;
    const startAmp = curAmp;

    // Plosive aspiration
    let phonemeDuration = params.duration;
    let aspirationMs = 0;
    if (params.plosive) {
      aspirationMs = params.voiced ? 20 : 40;
      phonemeDuration = params.duration + aspirationMs;
    }

    const numSamples = Math.floor((phonemeDuration / 1000) * SR);
    const transitionSamples = Math.min(Math.floor(0.05 * SR), numSamples); // 50ms transition
    const sentPos = pi / Math.max(phonemes.length - 1, 1);

    for (let n = 0; n < numSamples; n++) {
      if (offset >= buffer.length) break;
      const pos = n / Math.max(numSamples - 1, 1);

      // ── SMOOTH FORMANT INTERPOLATION ──
      const interpT = n < transitionSamples ? n / transitionSamples : 1;
      const smoothT = interpT * interpT * (3 - 2 * interpT);

      const f1 = startF1 + (tgtF1 - startF1) * smoothT;
      const f2 = startF2 + (tgtF2 - startF2) * smoothT;
      const f3 = startF3 + (tgtF3 - startF3) * smoothT;
      const f4 = startF4 + (tgtF4 - startF4) * smoothT;
      const bw1 = startBw1 + (tgtBw1 - startBw1) * smoothT;
      const bw2 = startBw2 + (tgtBw2 - startBw2) * smoothT;
      const bw3 = startBw3 + (tgtBw3 - startBw3) * smoothT;
      const bw4 = startBw4 + (tgtBw4 - startBw4) * smoothT;
      const amp = startAmp + (tgtAmp - startAmp) * smoothT;

      // Update resonators every 16 samples
      if (n % 16 === 0) {
        updateResonator(resF1, f1, bw1);
        updateResonator(resF2, f2, bw2);
        updateResonator(resF3, f3, bw3);
        updateResonator(resF4, f4, bw4);
      }

      const env = getEnvelope(pos, phonemeDuration, params.plosive);

      if (amp < 0.001 && !params.plosive) {
        buffer[offset++] = 0;
        continue;
      }

      let excitation = 0;

      // ── PLOSIVE ──
      if (params.plosive) {
        const burstEndMs = 8;
        const burstEndSample = Math.floor((burstEndMs / 1000) * SR);
        const aspEndSample = Math.floor(((burstEndMs + aspirationMs) / 1000) * SR);

        if (n < burstEndSample) {
          excitation = (Math.random() * 2 - 1) * 0.8 * (1 - n / burstEndSample);
        } else if (n < aspEndSample) {
          const aspProgress = (n - burstEndSample) / (aspEndSample - burstEndSample);
          excitation = (Math.random() * 2 - 1) * 0.5 * (1 - aspProgress * 0.5);
        }
        if (params.voiced && n > burstEndSample) {
          const f0 = getProsodyF0(sentPos) * (1 + (Math.random() - 0.5) * jitterAmt);
          glottalPhase += f0 / SR;
          if (glottalPhase >= 1) glottalPhase -= 1;
          excitation += glottalDNA(glottalPhase, oq) * 0.5;
        }
      }
      // ── VOICED (glottal DNA) ──
      else if (params.voiced) {
        const f0 = getProsodyF0(sentPos) * (1 + (Math.random() - 0.5) * jitterAmt);
        glottalPhase += f0 / SR;
        if (glottalPhase >= 1) glottalPhase -= 1;

        let pulse = glottalDNA(glottalPhase, oq);
        pulse *= 1 + (Math.random() - 0.5) * shimmerAmt;
        excitation = pulse;
        // Breathiness
        excitation += (Math.random() * 2 - 1) * 0.02;
      }

      // ── FRICATIVE ──
      if (params.fricative) {
        const noise = (Math.random() * 2 - 1) * 0.55;
        if (params.voiced) {
          excitation = excitation * 0.5 + noise * 0.5;
        } else {
          excitation = noise;
        }
      }

      // ── CASCADE FORMANT FILTERING ──
      // Signal flows through resonators in series: F1 → F2 → F3 → F4
      let sig = excitation;
      if (f1 > 50) {
        sig = tickResonator(resF1, sig);
        sig = tickResonator(resF2, sig);
        sig = tickResonator(resF3, sig) * 0.7;
        sig = tickResonator(resF4, sig) * 0.5;
      }

      // ── NASAL COUPLING ──
      if (params.nasal) {
        // Add nasal resonance, subtract oral energy at nasal zero
        const nasalOut = tickResonator(nasalRes, excitation) * 0.35;
        const antiOut = tickAntiResonator(nasalAntiRes, sig);
        sig = antiOut * 0.6 + nasalOut;
      }

      // ── DC BLOCK + ENVELOPE ──
      let output = tickDCBlocker(dcBlock, sig);
      output *= env * amp;

      buffer[offset++] = output;
    }

    curF1 = tgtF1; curF2 = tgtF2; curF3 = tgtF3; curF4 = tgtF4;
    curBw1 = tgtBw1; curBw2 = tgtBw2; curBw3 = tgtBw3; curBw4 = tgtBw4;
    curAmp = tgtAmp;
  }

  return buffer.slice(0, offset);
}

/**
 * F0 contour with natural PT-BR prosody
 */
function getProsodyF0(sentencePos: number): number {
  const { mean, p5, p95 } = VOICE_DNA.f0;

  let f0 = mean;
  if (sentencePos < 0.2) {
    f0 = mean * (1.02 + sentencePos * 0.1);
  } else {
    f0 = mean * (1.04 - (sentencePos - 0.2) * 0.12);
  }
  f0 += (Math.random() - 0.5) * 4;
  return Math.max(p5, Math.min(p95, f0));
}

/**
 * Amplitude envelope
 */
function getEnvelope(pos: number, durationMs: number, isPlosive: boolean): number {
  if (isPlosive) {
    if (pos < 0.05) return pos / 0.05;
    if (pos > 0.7) return Math.max(0, 1 - (pos - 0.7) / 0.3);
    return 1.0;
  }
  const attackMs = 12;
  const releaseMs = 18;
  const attack = Math.min(attackMs / durationMs, 0.3);
  const release = Math.min(releaseMs / durationMs, 0.3);
  if (pos < attack) return pos / attack;
  if (pos > 1 - release) return (1 - pos) / release;
  return 1.0;
}

/**
 * Post-process: normalize + gentle pre-emphasis
 */
function postProcess(samples: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > max) max = a;
  }
  if (max === 0) return samples;

  const gain = 0.9 / max;
  const out = new Float32Array(samples.length);

  // Gentle pre-emphasis (0.15 instead of 0.4)
  out[0] = samples[0] * gain;
  for (let i = 1; i < samples.length; i++) {
    const preEmph = samples[i] - 0.15 * samples[i - 1];
    out[i] = preEmph * gain;
  }

  // Re-normalize
  max = 0;
  for (let i = 0; i < out.length; i++) {
    const a = Math.abs(out[i]);
    if (a > max) max = a;
  }
  if (max > 0) {
    const g2 = 0.88 / max;
    for (let i = 0; i < out.length; i++) out[i] *= g2;
  }

  return out;
}

/**
 * PCM → WAV
 */
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
