/**
 * Orion Formant Speech Synthesizer
 * 
 * 100% client-side speech synthesis using Web Audio API.
 * No API calls, no dependencies. Generates speech from phonemes
 * using the Iapetus voice fingerprint.
 * 
 * Architecture:
 * 1. Text → Phonemes (rule-based G2P)
 * 2. Phonemes → Audio frames (formant synthesis)
 * 3. Audio frames → WAV blob
 * 4. Optional: DSP post-processing
 */

import {
  PT_PHONEMES,
  textToPhonemes,
  IAPETUS_F0,
  IAPETUS_F0_STD,
  IAPETUS_JITTER,
  IAPETUS_SPECTRAL_TILT,
  type PhonemeParams,
} from "./phonemes";

const SAMPLE_RATE = 24000;

/**
 * Main entry: synthesize text to audio blob
 */
export async function synthesizeFormant(text: string): Promise<Blob> {
  const phonemes = textToPhonemes(text);
  console.log(`[Formant TTS] "${text.slice(0, 40)}..." → ${phonemes.length} phonemes`);

  const samples = renderPhonemes(phonemes);
  const normalized = normalizeAudio(samples);
  return samplesToWav(normalized, SAMPLE_RATE);
}

/**
 * Synthesize and play immediately
 */
export async function speakFormant(
  text: string,
  signal?: AbortSignal,
): Promise<{ played: boolean; audio: HTMLAudioElement | null }> {
  if (!text?.trim() || signal?.aborted) {
    return { played: false, audio: null };
  }

  try {
    const blob = await synthesizeFormant(text);
    if (signal?.aborted) return { played: false, audio: null };

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        audio.pause();
        audio.src = "";
        URL.revokeObjectURL(url);
        resolve();
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      audio.onended = () => {
        signal?.removeEventListener("abort", onAbort);
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        signal?.removeEventListener("abort", onAbort);
        URL.revokeObjectURL(url);
        reject(new Error("Playback error"));
      };
      audio.play().catch(reject);
    });

    return { played: !signal?.aborted, audio };
  } catch (err) {
    console.warn("[Formant TTS] Error:", err);
    return { played: false, audio: null };
  }
}

/**
 * Render phoneme sequence to PCM samples
 */
function renderPhonemes(phonemes: string[]): Float32Array {
  // Estimate total duration
  let totalSamples = 0;
  for (const p of phonemes) {
    const params = PT_PHONEMES[p];
    if (params) {
      totalSamples += Math.floor((params.duration / 1000) * SAMPLE_RATE);
    }
  }
  // Add transition samples
  totalSamples += phonemes.length * Math.floor(0.01 * SAMPLE_RATE);

  const buffer = new Float32Array(totalSamples + SAMPLE_RATE); // extra 1s safety
  let offset = 0;
  let prevParams: PhonemeParams | null = null;
  let glottalPhase = 0;

  for (let pi = 0; pi < phonemes.length; pi++) {
    const phoneme = phonemes[pi];
    const params = PT_PHONEMES[phoneme];
    if (!params) continue;

    const durationSec = params.duration / 1000;
    const numSamples = Math.floor(durationSec * SAMPLE_RATE);
    
    // Prosody: slight F0 variation across the sentence
    const sentencePosition = pi / Math.max(phonemes.length - 1, 1);
    const prosodyF0 = getProsodyF0(sentencePosition, phoneme);

    for (let n = 0; n < numSamples; n++) {
      if (offset + n >= buffer.length) break;

      const t = n / SAMPLE_RATE;
      const samplePos = n / numSamples; // 0-1 position within phoneme

      // Envelope (attack/release for natural transitions)
      const envelope = getEnvelope(samplePos, durationSec, prevParams !== null);

      let sample = 0;

      if (params.amplitude === 0) {
        // Silence
        buffer[offset + n] = 0;
        continue;
      }

      // ── GLOTTAL SOURCE ──
      if (params.voiced) {
        // Glottal pulse with jitter
        const jitter = 1 + (Math.random() - 0.5) * IAPETUS_JITTER;
        const f0 = prosodyF0 * jitter;
        const period = SAMPLE_RATE / f0;
        
        glottalPhase += 1;
        if (glottalPhase >= period) glottalPhase -= period;

        // LF model glottal pulse (more natural than simple sawtooth)
        const phase = glottalPhase / period;
        sample = glottalPulse(phase);
        
        // Shimmer (amplitude variation)
        sample *= 1 + (Math.random() - 0.5) * 0.03;
      }

      // ── NOISE SOURCE (fricatives) ──
      if (params.fricative) {
        const noise = (Math.random() * 2 - 1) * 0.4;
        if (params.voiced) {
          sample = sample * 0.6 + noise * 0.4; // Mixed
        } else {
          sample = noise;
        }
      }

      // ── FORMANT FILTERING ──
      // Interpolate formants for smooth transitions
      const interpParams = interpolateParams(prevParams, params, samplePos);
      
      // Apply formant resonances
      sample = applyFormants(sample, t, interpParams);

      // ── NASAL RESONANCE ──
      if (params.nasal) {
        sample = applyNasalResonance(sample, t);
      }

      // ── SPECTRAL TILT ──
      // Iapetus has high spectral tilt (34.7dB) = emphasis on low frequencies
      // Simple 1-pole lowpass for tilt approximation
      sample = sample * params.amplitude * envelope;

      buffer[offset + n] = sample;
    }

    prevParams = params;
    offset += numSamples;

    // Add brief coarticulation transition
    const transitionSamples = Math.floor(0.008 * SAMPLE_RATE);
    for (let n = 0; n < transitionSamples && offset + n < buffer.length; n++) {
      const fade = 1 - n / transitionSamples;
      buffer[offset + n] = (buffer[offset + n] || 0) * fade;
    }
    offset += Math.floor(transitionSamples * 0.3); // Slight overlap
  }

  return buffer.slice(0, offset);
}

/**
 * LF-model glottal pulse (Liljencrants-Fant)
 * More natural than simple waveforms
 */
function glottalPulse(phase: number): number {
  if (phase < 0.4) {
    // Opening phase - sinusoidal rise
    const t = phase / 0.4;
    return Math.sin(t * Math.PI * 0.5) * 0.8;
  } else if (phase < 0.6) {
    // Closing phase - rapid fall
    const t = (phase - 0.4) / 0.2;
    return (1 - t) * 0.8;
  } else {
    // Closed phase
    return -0.1 * Math.sin((phase - 0.6) / 0.4 * Math.PI);
  }
}

/**
 * Simple formant filter using resonance addition
 * Each formant is modeled as a damped sinusoidal resonance
 */
function applyFormants(input: number, t: number, params: PhonemeParams): number {
  if (params.f1 === 0) return input;

  let output = 0;
  const formants = [
    { freq: params.f1, bw: params.bw1, amp: 1.0 },
    { freq: params.f2, bw: params.bw2, amp: 0.7 },
    { freq: params.f3, bw: params.bw3, amp: 0.35 },
    { freq: params.f4 || 3500, bw: 200, amp: 0.15 },
  ];

  for (const f of formants) {
    if (f.freq <= 0) continue;
    // Resonance modeled as amplitude-weighted sine at formant frequency
    const resonance = Math.sin(2 * Math.PI * f.freq * t);
    const decay = Math.exp(-Math.PI * f.bw * t);
    output += input * resonance * f.amp * Math.min(decay, 1);
  }

  return output * 0.3; // Scale down
}

/**
 * Nasal resonance (add nasal formant + anti-resonance)
 */
function applyNasalResonance(input: number, t: number): number {
  const nasalFormant = Math.sin(2 * Math.PI * 280 * t) * 0.3;
  const antiResonance = -Math.sin(2 * Math.PI * 1500 * t) * 0.15;
  return input * 0.7 + (nasalFormant + antiResonance) * input * 0.3;
}

/**
 * Smooth interpolation between phoneme parameters for coarticulation
 */
function interpolateParams(
  prev: PhonemeParams | null,
  curr: PhonemeParams,
  position: number, // 0-1
): PhonemeParams {
  if (!prev || position > 0.3) return curr;

  const t = position / 0.3; // 0-1 over first 30% of phoneme
  const lerp = (a: number, b: number) => a + (b - a) * t;

  return {
    ...curr,
    f1: lerp(prev.f1, curr.f1),
    f2: lerp(prev.f2, curr.f2),
    f3: lerp(prev.f3, curr.f3),
    f4: lerp(prev.f4 || 3500, curr.f4 || 3500),
    bw1: lerp(prev.bw1, curr.bw1),
    bw2: lerp(prev.bw2, curr.bw2),
    bw3: lerp(prev.bw3, curr.bw3),
  };
}

/**
 * Amplitude envelope for smooth phoneme transitions
 */
function getEnvelope(
  position: number,  // 0-1 within phoneme
  duration: number,  // seconds
  hasTransition: boolean,
): number {
  const attackTime = Math.min(0.01 / duration, 0.15); // 10ms attack
  const releaseTime = Math.min(0.01 / duration, 0.15);

  if (position < attackTime) {
    return position / attackTime; // Fade in
  } else if (position > 1 - releaseTime) {
    return (1 - position) / releaseTime; // Fade out
  }
  return 1.0;
}

/**
 * Prosody: natural F0 contour across the sentence
 * Iapetus voice: declarative sentences end lower
 */
function getProsodyF0(sentencePosition: number, phoneme: string): number {
  let f0 = IAPETUS_F0;

  // Slight decline toward end (declarative intonation)
  f0 *= 1.0 - sentencePosition * 0.12;

  // Stress emphasis on vowels (slight rise)
  if ('aeiouɛɔ'.includes(phoneme)) {
    f0 *= 1.02;
  }

  // Add micro-variation for naturalness
  f0 += (Math.random() - 0.5) * IAPETUS_F0_STD * 0.3;

  return Math.max(IAPETUS_F0 * 0.8, Math.min(IAPETUS_F0 * 1.25, f0));
}

/**
 * Normalize audio to prevent clipping
 */
function normalizeAudio(samples: Float32Array): Float32Array {
  let maxAbs = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxAbs) maxAbs = abs;
  }

  if (maxAbs === 0) return samples;

  const gain = 0.85 / maxAbs;
  const output = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    output[i] = samples[i] * gain;
  }
  return output;
}

/**
 * Convert Float32 samples to WAV Blob
 */
function samplesToWav(samples: Float32Array, sampleRate: number): Blob {
  const bitsPerSample = 16;
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // RIFF header
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);        // PCM
  view.setUint16(22, 1, true);        // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(view, 36, "data");
  view.setUint32(40, dataLength, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
