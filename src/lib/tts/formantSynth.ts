/**
 * Orion Formant Speech Synthesizer v2
 * 
 * Major improvements over v1:
 * - Proper 2nd-order IIR resonant filters for formants
 * - Accurate LF-model glottal pulse with OQ/SQ from voice DNA
 * - Per-harmonic amplitude control matching Iapetus decay curve
 * - Proper coarticulation with formant interpolation
 * - Aspiration noise for breathiness (H1-H2 = 3.3dB)
 * - Spectral tilt via 1-pole filter (29.9dB)
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

// ── IIR RESONATOR STATE ──
interface ResonatorState {
  y1: number;
  y2: number;
  a1: number;
  a2: number;
  b0: number;
}

function createResonator(freq: number, bw: number, sr: number): ResonatorState {
  const r = Math.exp(-Math.PI * bw / sr);
  const theta = 2 * Math.PI * freq / sr;
  return {
    y1: 0,
    y2: 0,
    a1: -2 * r * Math.cos(theta),
    a2: r * r,
    b0: 1 - r,
  };
}

function tickResonator(state: ResonatorState, input: number): number {
  const output = state.b0 * input - state.a1 * state.y1 - state.a2 * state.y2;
  state.y2 = state.y1;
  state.y1 = output;
  return output;
}

function resetResonator(state: ResonatorState) {
  state.y1 = 0;
  state.y2 = 0;
}

function updateResonator(state: ResonatorState, freq: number, bw: number, sr: number) {
  const r = Math.exp(-Math.PI * bw / sr);
  const theta = 2 * Math.PI * freq / sr;
  state.a1 = -2 * r * Math.cos(theta);
  state.a2 = r * r;
  state.b0 = 1 - r;
}

// ── GLOTTAL PULSE (Liljencrants-Fant model) ──
function glottalLF(phase: number, oq: number, sq: number): number {
  // OQ: open quotient (0-1), how much of the cycle is open
  // SQ: speed quotient, ratio of opening to closing time
  const openPhase = oq;
  const openingTime = openPhase * sq / (1 + sq);
  const closingTime = openPhase - openingTime;

  if (phase < openingTime) {
    // Opening phase — sinusoidal rise
    const t = phase / openingTime;
    return 0.5 * (1 - Math.cos(Math.PI * t));
  } else if (phase < openPhase) {
    // Closing phase — exponential fall (sharper)
    const t = (phase - openingTime) / closingTime;
    return Math.cos(Math.PI * 0.5 * t);
  } else {
    // Closed phase — near zero with slight return
    const t = (phase - openPhase) / (1 - openPhase);
    return -0.05 * Math.sin(Math.PI * t);
  }
}

// ── 1-POLE FILTER FOR SPECTRAL TILT ──
interface OnePoleState {
  y1: number;
  coeff: number;
}

function createTiltFilter(tiltDb: number, sr: number): OnePoleState {
  // Convert tilt in dB to lowpass coefficient
  // Higher tilt = more lowpass = warmer sound
  const freq = 500 * Math.pow(10, -tiltDb / 40); // Cutoff based on tilt
  const dt = 1 / sr;
  const rc = 1 / (2 * Math.PI * Math.max(freq, 50));
  const coeff = dt / (rc + dt);
  return { y1: 0, coeff: Math.min(0.99, Math.max(0.01, coeff)) };
}

function tickTilt(state: OnePoleState, input: number): number {
  state.y1 += state.coeff * (input - state.y1);
  return state.y1;
}

/**
 * Main: synthesize text to WAV blob
 */
export async function synthesizeFormant(text: string): Promise<Blob> {
  const phonemes = textToPhonemes(text);
  console.log(`[Formant TTS v2] "${text.slice(0, 50)}..." → ${phonemes.length} phonemes`);
  
  const samples = renderPhonemes(phonemes);
  const normalized = normalizeAudio(samples);
  return samplesToWav(normalized, SR);
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
    console.warn("[Formant TTS v2] Error:", err);
    return { played: false, audio: null };
  }
}

/**
 * Core synthesis: phonemes → PCM samples
 */
function renderPhonemes(phonemes: string[]): Float32Array {
  // Estimate total duration
  let totalMs = 0;
  for (const p of phonemes) {
    const params = PT_PHONEMES[p];
    if (params) totalMs += params.duration;
  }
  totalMs += phonemes.length * 10; // transitions
  const totalSamples = Math.ceil((totalMs / 1000) * SR) + SR;
  const buffer = new Float32Array(totalSamples);

  // State
  let offset = 0;
  let glottalPhase = 0;
  let prevParams: PhonemeParams | null = null;

  // IIR resonators (4 formants)
  const res = [
    createResonator(500, 100, SR),
    createResonator(1500, 120, SR),
    createResonator(2500, 160, SR),
    createResonator(3500, 230, SR),
  ];
  // Nasal resonator + anti-resonator
  const nasalRes = createResonator(280, 100, SR);
  const nasalAnti = createResonator(1500, 300, SR);

  // Spectral tilt filter
  const tiltFilter = createTiltFilter(VOICE_DNA.dynamics.spectralTilt * 0.3, SR);

  const { openQuotient: oq, speedQuotient: sq, harmonicDecay } = VOICE_DNA.glottal;
  const { jitter, shimmer } = VOICE_DNA.dynamics;

  for (let pi = 0; pi < phonemes.length; pi++) {
    const phoneme = phonemes[pi];
    const params = PT_PHONEMES[phoneme];
    if (!params) continue;

    const numSamples = Math.floor((params.duration / 1000) * SR);
    const sentPos = pi / Math.max(phonemes.length - 1, 1);

    // Update resonator frequencies (with smooth transition from prev)
    if (params.f1 > 0) {
      updateResonator(res[0], params.f1, params.bw1, SR);
      updateResonator(res[1], params.f2, params.bw2, SR);
      updateResonator(res[2], params.f3, params.bw3, SR);
      updateResonator(res[3], params.f4, params.bw4, SR);
    }

    for (let n = 0; n < numSamples; n++) {
      if (offset >= buffer.length) break;

      const pos = n / Math.max(numSamples - 1, 1); // 0-1

      // Envelope
      const env = getEnvelope(pos, params.duration, params.plosive);

      if (params.amplitude === 0) {
        buffer[offset++] = 0;
        continue;
      }

      let excitation = 0;

      // ── VOICED EXCITATION ──
      if (params.voiced) {
        // F0 with prosody + jitter
        const prosF0 = getProsodyF0(sentPos);
        const f0 = prosF0 * (1 + (Math.random() - 0.5) * jitter * 2);
        const period = SR / f0;

        glottalPhase += 1 / period;
        if (glottalPhase >= 1) glottalPhase -= 1;

        // LF model glottal pulse
        let pulse = glottalLF(glottalPhase, oq, sq);

        // Add harmonics with proper decay
        const nHarmonics = Math.min(Math.floor(SR / 2 / f0), 20);
        for (let h = 2; h <= nHarmonics; h++) {
          const harmonicAmp = Math.pow(10, -(harmonicDecay * h) / 20);
          if (harmonicAmp < 0.01) break;
          pulse += harmonicAmp * Math.sin(2 * Math.PI * h * glottalPhase);
        }

        // Shimmer
        pulse *= 1 + (Math.random() - 0.5) * shimmer * 0.5;

        excitation = pulse * 0.6;

        // Aspiration noise (breathiness from H1-H2)
        const breathiness = VOICE_DNA.glottal.h1H2Db / 30; // normalized
        excitation += (Math.random() * 2 - 1) * breathiness * 0.08;
      }

      // ── NOISE EXCITATION (fricatives) ──
      if (params.fricative) {
        const noise = (Math.random() * 2 - 1) * 0.5;
        if (params.voiced) {
          excitation = excitation * 0.55 + noise * 0.45;
        } else {
          excitation = noise;
        }
      }

      // ── PLOSIVE BURST ──
      if (params.plosive && pos < 0.3) {
        const burst = (Math.random() * 2 - 1) * (1 - pos / 0.3) * 0.6;
        excitation += burst;
      }

      // ── FORMANT FILTERING (IIR resonators in parallel) ──
      let formantOut = 0;
      if (params.f1 > 0) {
        // Smooth formant transition in first 30% of phoneme
        if (prevParams && prevParams.f1 > 0 && pos < 0.3) {
          const t = pos / 0.3;
          const lerp = (a: number, b: number) => a + (b - a) * t;
          updateResonator(res[0], lerp(prevParams.f1, params.f1), lerp(prevParams.bw1, params.bw1), SR);
          updateResonator(res[1], lerp(prevParams.f2, params.f2), lerp(prevParams.bw2, params.bw2), SR);
          updateResonator(res[2], lerp(prevParams.f3, params.f3), lerp(prevParams.bw3, params.bw3), SR);
          updateResonator(res[3], lerp(prevParams.f4, params.f4), lerp(prevParams.bw4, params.bw4), SR);
        }

        formantOut += tickResonator(res[0], excitation) * 1.0;
        formantOut += tickResonator(res[1], excitation) * 0.6;
        formantOut += tickResonator(res[2], excitation) * 0.3;
        formantOut += tickResonator(res[3], excitation) * 0.12;
      } else {
        formantOut = excitation;
      }

      // ── NASAL COUPLING ──
      if (params.nasal) {
        const nasalOut = tickResonator(nasalRes, excitation) * 0.35;
        const antiOut = tickResonator(nasalAnti, formantOut) * 0.2;
        formantOut = formantOut * 0.65 + nasalOut - antiOut;
      }

      // ── SPECTRAL TILT ──
      let output = tickTilt(tiltFilter, formantOut);

      // ── APPLY ENVELOPE & AMPLITUDE ──
      output *= env * params.amplitude;

      buffer[offset++] = output;
    }

    prevParams = params;
  }

  return buffer.slice(0, offset);
}

/**
 * F0 contour with natural prosody
 */
function getProsodyF0(sentencePos: number): number {
  const { mean, std, p5, p95 } = VOICE_DNA.f0;

  // Declarative: start slightly high, decline toward end
  let f0 = mean * (1.05 - sentencePos * 0.15);

  // Add micro-prosody variation
  f0 += (Math.random() - 0.5) * std * 0.25;

  return Math.max(p5, Math.min(p95, f0));
}

/**
 * Amplitude envelope
 */
function getEnvelope(pos: number, durationMs: number, isPlosive: boolean): number {
  if (isPlosive) {
    // Plosives: sharp attack, fast decay
    if (pos < 0.1) return pos / 0.1;
    return Math.pow(1 - (pos - 0.1) / 0.9, 0.5);
  }

  const attackMs = 8;
  const releaseMs = 12;
  const attack = attackMs / durationMs;
  const release = releaseMs / durationMs;

  if (pos < attack) return pos / attack;
  if (pos > 1 - release) return (1 - pos) / release;
  return 1.0;
}

/**
 * Normalize audio
 */
function normalizeAudio(samples: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > max) max = a;
  }
  if (max === 0) return samples;

  const gain = 0.88 / max;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] * gain;
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
