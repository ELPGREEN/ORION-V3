/**
 * Orion Formant Speech Synthesizer v21 — Grok Ultra Natural
 * 
 * Base: Beber & Cielo (2012) normal male spectrographic norms
 * Overlay: Grok Ultra Natural — warmest, most human iteration
 * 
 * v21 changes from v22:
 * 1. BW3 × 2.85 (~428Hz) — widest yet, zero metallic
 * 2. Aspiration 8% + burst 3% — subtle elegant breathing
 * 3. Jitter ×1.04, Shimmer ×1.03 — barely perceptible, rhythmic
 * 4. Damping LP 4.5kHz + zero-pole 3.9kHz — smoothest clarity
 * 5. Spectral tilt ×1.06 (~24dB) — warmest, most present voice
 * 6. Pre-emphasis +9% in 0-2.4kHz — natural vowel brilliance
 * 7. Breathiness +13% — human breathing without excess
 * 8. Glottal OQ 0.74 — very relaxed natural voice
 * 9. Glottal tension 0.82 — smooth, never choked
 * 10. Sub-harmonic 8% (f0/2) — full warm body
 * 11. Pitch variance ×1.09 — sarcastic life
 * 12. Formant speed ×1.38 — fastest fluid transitions
 * 13. Spectral envelope smoothing 0.85 — eliminates all metallic
 * 14. Vibrato depth 0.6% — subtle emotional life
 * 
 * 100% client-side, zero API, zero dependencies.
 */

import {
  PT_PHONEMES,
  textToPhonemes,
  VOICE_DNA,
  type PhonemeParams,
} from "./phonemes";

const SR = 44100;
const FRAME_SIZE = 220; // 5ms at 44.1kHz
const N_FILTERS = 5; // F1-F5

// ═══════════════════════════════════════════════════════════
// GROK ULTRA NATURAL v21 CONFIG
// ═══════════════════════════════════════════════════════════

const GROK = {
  bw3Multiplier: 2.85,      // F3 BW multiplier (v22: 2.72) → ~428Hz, zero metallic
  aspirationRatio: 0.08,    // aspiration noise mix (v22: 0.07)
  noiseBurstRatio: 0.03,    // shaped 3.2kHz burst (same)
  jitterMult: 1.04,         // jitter — very subtle, rhythmic (v22: 1.06)
  shimmerMult: 1.03,        // shimmer — barely perceptible (v22: 1.05)
  dampingFreq: 4500,        // LP damping cutoff — smoother (v22: 4400)
  zeroPoleFreq: 3900,       // anti-resonance zero-pole pair (v22: 3700)
  zerPoleBw: 180,           // bandwidth of zero-pole pair
  spectralTiltMult: 1.06,   // tilt — warmest yet (v22: 1.09) → ~24dB
  breathiness: 0.13,        // breathiness gain — balanced (v22: 0.16)
  glottalOQ: 0.74,          // open quotient — very relaxed (v22: 0.71)
  glottalTension: 0.82,     // smooth, never choked (v22: 0.88)
  subHarmonicGain: 0.08,    // sub-harmonic at f0/2 — full body (v22: 0.07)
  pitchVariance: 1.09,      // pitch range — more life & sarcasm (v22: 1.08)
  formantSpeed: 1.38,       // coarticulation speed — fastest (v22: 1.32)
  preEmphasis0to2k: 0.09,   // +9% boost for 0-2.4kHz (v22: 0.08)
  dampingMix: 0.78,         // original vs LP mix
  spectralSmoothing: 0.85,  // envelope smoothing — strongest (v22: 0.89)
  vibratoDepth: 0.006,      // vibrato 0.6% of f0 (v22: 0.004)
  vibratoRate: 5.5,         // vibrato rate in Hz (natural male ~5-6 Hz)
};

// ═══════════════════════════════════════════════════════════
// IIR BIQUAD RESONATOR (formant pole)
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
// ANTI-RESONATOR (nasal zero + Grok zero-pole)
// ═══════════════════════════════════════════════════════════

interface AntiResonator {
  a0: number;
  b1: number;
  b2: number;
  z1: number;
  z2: number;
}

function makeAntiResonator(freq: number, bw: number): AntiResonator {
  if (freq < 20 || bw < 1 || freq >= SR / 2) return { a0: 1, b1: 0, b2: 0, z1: 0, z2: 0 };
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = 2 * Math.PI * freq / SR;
  const a0 = 1.0;
  const b1 = 2 * r * Math.cos(theta);
  const b2 = -(r * r);
  return { a0, b1, b2, z1: 0, z2: 0 };
}

function setAntiResonator(ar: AntiResonator, freq: number, bw: number) {
  if (freq < 20 || bw < 1 || freq >= SR / 2) { ar.a0 = 1; ar.b1 = 0; ar.b2 = 0; return; }
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = 2 * Math.PI * freq / SR;
  ar.a0 = 1.0;
  ar.b1 = 2 * r * Math.cos(theta);
  ar.b2 = -(r * r);
}

function tickAntiResonator(ar: AntiResonator, x: number): number {
  const y = ar.a0 * x + ar.b1 * ar.z1 + ar.b2 * ar.z2;
  ar.z2 = ar.z1;
  ar.z1 = x;
  return y;
}

// ═══════════════════════════════════════════════════════════
// SOURCE GENERATORS — LF Glottal + Sub-harmonic + Breathiness
// ═══════════════════════════════════════════════════════════

let glottalPhase = 0;
let subHarmonicPhase = 0;

let vibratoPhase = 0;

function generateGlottalSource(count: number, f0: number): Float32Array {
  const out = new Float32Array(count);
  const T0 = SR / f0;
  // v22: use GROK.glottalOQ (0.71) instead of DNA (0.546) — more relaxed
  const OQ = GROK.glottalOQ;
  const SQ = VOICE_DNA.glottal.speedQuotient;
  const Te = OQ * T0;
  const Tp = Te / (1 + SQ);
  const Ta = 0.08 * T0;
  // v22: minimal rhythmic irregularity
  const jitter = VOICE_DNA.dynamics.jitter * GROK.jitterMult;
  const shimmer = VOICE_DNA.dynamics.shimmer * GROK.shimmerMult;
  // v22: glottal tension controls the return phase amplitude
  const tensionAmp = -0.2 * GROK.glottalTension; // 0.88 → -0.176

  const T0sub = T0 * 2;

  for (let i = 0; i < count; i++) {
    const t = glottalPhase;
    let sample = 0;

    if (t < Tp) {
      sample = 0.5 * (1 - Math.cos(Math.PI * t / Tp));
    } else if (t < Te) {
      const tc = (t - Tp) / (Te - Tp);
      sample = Math.cos(Math.PI * 0.5 * tc);
    } else {
      const tr = (t - Te) / Math.max(Ta, 1);
      sample = tensionAmp * Math.exp(-tr);
    }

    // Shimmer (musical amplitude variation)
    const shimmerFactor = 1 + (Math.random() - 0.5) * shimmer * 0.5;
    
    // Sub-harmonic excitation at f0/2
    const subHarmonic = GROK.subHarmonicGain * Math.sin(2 * Math.PI * subHarmonicPhase / T0sub);
    
    // Breathiness: continuous gentle aspiration
    const breath = GROK.breathiness * (Math.random() * 2 - 1) * 0.5;
    
    // v22: subtle vibrato — life and emotion
    const vibratoMod = 1 + GROK.vibratoDepth * Math.sin(2 * Math.PI * GROK.vibratoRate * vibratoPhase / SR);
    
    out[i] = ((sample * shimmerFactor) + subHarmonic + breath) * vibratoMod;

    // Advance with jitter
    glottalPhase += 1 + (Math.random() - 0.5) * 2 * jitter;
    if (glottalPhase >= T0) glottalPhase -= T0;
    
    subHarmonicPhase += 1;
    if (subHarmonicPhase >= T0sub) subHarmonicPhase -= T0sub;
    
    vibratoPhase += 1;
  }

  return out;
}

function generateNoise(count: number): Float32Array {
  const out = new Float32Array(count);
  let prev = 0;
  for (let i = 0; i < count; i++) {
    const white = Math.random() * 2 - 1;
    prev = 0.7 * prev + 0.3 * white;
    out[i] = prev * 1.5;
  }
  return out;
}

/**
 * Grok v20: shaped noise burst at 3.2kHz (narrower than v19 aspiration)
 * More controlled than broadband aspiration — sounds like natural breathing
 */
function generateShapedNoiseBurst(count: number): Float32Array {
  const out = new Float32Array(count);
  const fc = 3200;
  const bw = 1200; // narrower than v19's 2000Hz — more controlled
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = 2 * Math.PI * fc / SR;
  const b1 = -2 * r * Math.cos(theta);
  const b2 = r * r;
  const a0 = 1 + b1 + b2;
  let z1 = 0, z2 = 0;
  
  for (let i = 0; i < count; i++) {
    const white = Math.random() * 2 - 1;
    const y = a0 * white - b1 * z1 - b2 * z2;
    z2 = z1; z1 = y;
    out[i] = y * 0.4;
  }
  return out;
}

/**
 * Grok v20: broadband aspiration (gentler than v19)
 */
function generateAspirationNoise(count: number): Float32Array {
  const out = new Float32Array(count);
  const fc = 3200;
  const bw = 2000;
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = 2 * Math.PI * fc / SR;
  const b1 = -2 * r * Math.cos(theta);
  const b2 = r * r;
  const a0 = 1 + b1 + b2;
  let z1 = 0, z2 = 0;
  
  for (let i = 0; i < count; i++) {
    const white = Math.random() * 2 - 1;
    const y = a0 * white - b1 * z1 - b2 * z2;
    z2 = z1; z1 = y;
    out[i] = y * 0.5;
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

/**
 * Grok v20: voiced + split aspiration/burst noise
 * 12% gentle aspiration + 6% shaped 3.2kHz burst = natural AI breathing
 */
function generateVoicedGrok(count: number, f0: number): Float32Array {
  const glottal = generateGlottalSource(count, f0);
  const aspiration = generateAspirationNoise(count);
  const burst = generateShapedNoiseBurst(count);
  const voiceRatio = 1 - GROK.aspirationRatio - GROK.noiseBurstRatio;
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = voiceRatio * glottal[i] 
           + GROK.aspirationRatio * aspiration[i]
           + GROK.noiseBurstRatio * burst[i];
  }
  return out;
}

// ═══════════════════════════════════════════════════════════
// SPECTRAL TILT — Grok: warmer, more present (×1.18 not ×1.3)
// ═══════════════════════════════════════════════════════════

interface TiltFilter { alpha: number; z1: number; }

function makeTiltFilter(): TiltFilter {
  // Grok v20: softer tilt → warmer, more present voice
  const tiltDb = VOICE_DNA.dynamics.spectralTilt * GROK.spectralTiltMult; // ~29 dB
  const alpha = Math.min(1 - Math.pow(10, -tiltDb / 200), 0.85);
  return { alpha, z1: 0 };
}

function tickTilt(f: TiltFilter, x: number): number {
  const y = x - f.alpha * f.z1;
  f.z1 = x;
  return y;
}

// ═══════════════════════════════════════════════════════════
// HF DAMPING + ZERO-POLE PAIR — Grok: modern clarity at 3.8kHz
// ═══════════════════════════════════════════════════════════

interface DampingFilter { z1: number; coeff: number; }

function makeDampingFilter(): DampingFilter {
  const fc = GROK.dampingFreq; // 4200Hz (v19: 4000Hz)
  const rc = 1 / (2 * Math.PI * fc);
  const dt = 1 / SR;
  const coeff = dt / (rc + dt);
  return { z1: 0, coeff };
}

function tickDamping(f: DampingFilter, x: number): number {
  f.z1 += f.coeff * (x - f.z1);
  return GROK.dampingMix * x + (1 - GROK.dampingMix) * f.z1;
}

// ═══════════════════════════════════════════════════════════
// PRE-EMPHASIS FILTER — Grok: +5% boost in 0-2kHz for vowel brilliance
// ═══════════════════════════════════════════════════════════

interface PreEmphFilter { z1: number; }

function makePreEmph(): PreEmphFilter {
  return { z1: 0 };
}

function tickPreEmph(f: PreEmphFilter, x: number): number {
  // Gentle pre-emphasis: boosts frequencies proportional to frequency
  // The coefficient is kept small (0.25 + 5% boost) to only affect 0-2kHz region
  const coeff = 0.25 + GROK.preEmphasis0to2k;
  const y = x + coeff * (x - f.z1);
  f.z1 = x;
  return y;
}

// ═══════════════════════════════════════════════════════════
// SEGMENT PARAMS
// ═══════════════════════════════════════════════════════════

interface SegmentParams {
  f1: number; f2: number; f3: number; f4: number; f5: number;
  bw1: number; bw2: number; bw3: number; bw4: number; bw5: number;
  gain: number;
  source: 'glottal' | 'noise' | 'mixed';
  nasal: boolean;
  nasalFreq: number;
  nasalBw: number;
}

type Segment = [SegmentParams, number];

function msToSamples(ms: number): number {
  return Math.round(SR * ms / 1000);
}

const DEFAULT_F4 = 3500;
const DEFAULT_F5 = 4500;
const DEFAULT_BW4 = 350;
const DEFAULT_BW5 = 500;

const NASAL_ZERO_FREQ = 270;
const NASAL_ZERO_BW = 100;

// ── Fricative spectral peaks ──
const FRICATIVE_SPECTRAL: Record<string, SegmentParams> = {
  's':  { f1:200,f2:5500,f3:7500,f4:9000,f5:11000, bw1:500,bw2:3000,bw3:2000,bw4:1000,bw5:1000, gain:0.55, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'z':  { f1:200,f2:5500,f3:7500,f4:9000,f5:11000, bw1:500,bw2:3000,bw3:2000,bw4:1000,bw5:1000, gain:0.45, source:'mixed', nasal:false, nasalFreq:0, nasalBw:0 },
  'ʃ':  { f1:200,f2:3800,f3:6000,f4:8000,f5:10000, bw1:500,bw2:2500,bw3:2000,bw4:1000,bw5:1000, gain:0.55, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'ʒ':  { f1:200,f2:3800,f3:6000,f4:8000,f5:10000, bw1:500,bw2:2500,bw3:2000,bw4:1000,bw5:1000, gain:0.45, source:'mixed', nasal:false, nasalFreq:0, nasalBw:0 },
  'f':  { f1:200,f2:2500,f3:4000,f4:6000,f5:8000,   bw1:500,bw2:3000,bw3:2000,bw4:1000,bw5:1000, gain:0.30, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'v':  { f1:220,f2:2500,f3:4000,f4:6000,f5:8000,   bw1:500,bw2:3000,bw3:2000,bw4:1000,bw5:1000, gain:0.35, source:'mixed', nasal:false, nasalFreq:0, nasalBw:0 },
  'h':  { f1:500,f2:1500,f3:2500,f4:3500,f5:4500,   bw1:200,bw2:300,bw3:400,bw4:500,bw5:600,     gain:0.25, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'χ':  { f1:300,f2:1100,f3:2400,f4:3500,f5:4500,   bw1:400,bw2:400,bw3:400,bw4:500,bw5:600,     gain:0.55, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'R':  { f1:300,f2:1100,f3:2400,f4:3500,f5:4500,   bw1:110,bw2:140,bw3:190,bw4:300,bw5:400,     gain:0.55, source:'mixed', nasal:false, nasalFreq:0, nasalBw:0 },
};

function getHAllophone(nextPhoneme: string | undefined): SegmentParams {
  const vp = nextPhoneme ? PT_PHONEMES[nextPhoneme] : null;
  if (vp && vp.voiced && !vp.fricative && !vp.plosive) {
    return {
      f1: vp.f1 || 500, f2: vp.f2 || 1500, f3: vp.f3 || 2500,
      f4: vp.f4 || DEFAULT_F4, f5: DEFAULT_F5,
      bw1: 200, bw2: 300, bw3: 400, bw4: 500, bw5: 600,
      gain: 0.25, source: 'noise', nasal: false, nasalFreq: 0, nasalBw: 0,
    };
  }
  return FRICATIVE_SPECTRAL['h'];
}

function phonemeToSegment(p: PhonemeParams, phoneme: string): SegmentParams {
  const fricSpec = FRICATIVE_SPECTRAL[phoneme];
  if (fricSpec) return fricSpec;

  let source: 'glottal' | 'noise' | 'mixed' = 'glottal';
  if (p.fricative && !p.voiced) source = 'noise';
  else if (p.fricative && p.voiced) source = 'mixed';

  // Grok v20: BW3 × 2.4 (~360Hz) — more diffuse F3, rounder voice
  const bw3Effective = (p.bw3 || 150) * GROK.bw3Multiplier;

  return {
    f1: p.f1 || 300, f2: p.f2 || 1500, f3: p.f3 || 2500,
    f4: p.f4 || DEFAULT_F4, f5: DEFAULT_F5,
    bw1: p.bw1 || 100, bw2: p.bw2 || 120, bw3: bw3Effective,
    bw4: p.bw4 || DEFAULT_BW4, bw5: DEFAULT_BW5,
    gain: p.amplitude,
    source,
    nasal: p.nasal,
    nasalFreq: p.nasal ? NASAL_ZERO_FREQ : 0,
    nasalBw: p.nasal ? NASAL_ZERO_BW : 0,
  };
}

// ── Plosive rules ──
const PLOSIVE_RULES: Record<string, {
  closureMs: number; burstMs: number; votMs: number;
  closureType: 'silence' | 'voicebar';
}> = {
  'p':   { closureMs: 60, burstMs: 15, votMs: 25,  closureType: 'silence' },
  'b':   { closureMs: 40, burstMs: 10, votMs: 8,   closureType: 'voicebar' },
  't':   { closureMs: 60, burstMs: 15, votMs: 30,  closureType: 'silence' },
  'd':   { closureMs: 40, burstMs: 10, votMs: 8,   closureType: 'voicebar' },
  'k':   { closureMs: 70, burstMs: 18, votMs: 40,  closureType: 'silence' },
  'g':   { closureMs: 50, burstMs: 10, votMs: 8,   closureType: 'voicebar' },
  't͡ʃ': { closureMs: 60, burstMs: 10, votMs: 100, closureType: 'silence' },
  'd͡ʒ': { closureMs: 35, burstMs: 10, votMs: 80,  closureType: 'voicebar' },
};

function makeSilenceSeg(): SegmentParams {
  return { f1:100,f2:100,f3:100,f4:100,f5:100, bw1:100,bw2:100,bw3:100,bw4:100,bw5:100, gain:0, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 };
}
function makeVoicebarSeg(): SegmentParams {
  return { f1:200,f2:200,f3:200,f4:200,f5:200, bw1:100,bw2:200,bw3:300,bw4:400,bw5:500, gain:0.15, source:'glottal', nasal:false, nasalFreq:0, nasalBw:0 };
}

const BURST_BY_PLACE: Record<string, SegmentParams> = {
  'p':   { f1:400,f2:1000,f3:2300,f4:3500,f5:4500, bw1:400,bw2:1200,bw3:1500,bw4:800,bw5:800, gain:0.75, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'b':   { f1:400,f2:1000,f3:2300,f4:3500,f5:4500, bw1:400,bw2:1200,bw3:1500,bw4:800,bw5:800, gain:0.70, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  't':   { f1:400,f2:4000,f3:5500,f4:7000,f5:9000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.80, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'd':   { f1:400,f2:4000,f3:5500,f4:7000,f5:9000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.75, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'k':   { f1:400,f2:1800,f3:2600,f4:3800,f5:5000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.75, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'g':   { f1:400,f2:1800,f3:2600,f4:3800,f5:5000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.70, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  't͡ʃ': { f1:400,f2:3800,f3:6000,f4:8000,f5:10000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.80, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'd͡ʒ': { f1:400,f2:3800,f3:6000,f4:8000,f5:10000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.75, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
};

function getBurstParams(phoneme: string): SegmentParams {
  return BURST_BY_PLACE[phoneme] || BURST_BY_PLACE['p'];
}

function getVOTParams(phoneme: string, nextPhoneme?: string): SegmentParams {
  if (phoneme === 't͡ʃ') {
    return { f1:200,f2:3800,f3:6000,f4:8000,f5:10000, bw1:500,bw2:2000,bw3:1500,bw4:800,bw5:800, gain:0.55, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 };
  }
  if (phoneme === 'd͡ʒ') {
    return { f1:200,f2:3800,f3:6000,f4:8000,f5:10000, bw1:500,bw2:2000,bw3:1500,bw4:800,bw5:800, gain:0.45, source:'mixed', nasal:false, nasalFreq:0, nasalBw:0 };
  }
  const vowel = nextPhoneme ? PT_PHONEMES[nextPhoneme] : null;
  if (vowel && vowel.voiced && !vowel.fricative && !vowel.plosive) {
    return {
      f1: vowel.f1 || 500, f2: vowel.f2 || 1500, f3: vowel.f3 || 2500,
      f4: vowel.f4 || DEFAULT_F4, f5: DEFAULT_F5,
      bw1: 250, bw2: 350, bw3: 400, bw4: 500, bw5: 600,
      gain: 0.22, source: 'noise', nasal: false, nasalFreq: 0, nasalBw: 0,
    };
  }
  return { f1:500,f2:1500,f3:2500,f4:DEFAULT_F4,f5:DEFAULT_F5, bw1:250,bw2:350,bw3:400,bw4:500,bw5:600, gain:0.22, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 };
}

function buildSegments(phonemes: string[]): Segment[] {
  const seq: Segment[] = [];

  for (let pi = 0; pi < phonemes.length; pi++) {
    const phoneme = phonemes[pi];
    const params = PT_PHONEMES[phoneme];
    if (!params) continue;

    const nextPhoneme = pi + 1 < phonemes.length ? phonemes[pi + 1] : undefined;

    const plosiveRule = PLOSIVE_RULES[phoneme];
    if (plosiveRule) {
      const { closureMs, burstMs, votMs, closureType } = plosiveRule;
      if (closureMs > 0) {
        seq.push([closureType === 'silence' ? makeSilenceSeg() : makeVoicebarSeg(), msToSamples(closureMs)]);
      }
      if (burstMs > 0) {
        seq.push([getBurstParams(phoneme), msToSamples(burstMs)]);
      }
      if (votMs > 0) {
        seq.push([getVOTParams(phoneme, nextPhoneme), msToSamples(votMs)]);
      }
      continue;
    }

    if (phoneme === 'h') {
      seq.push([getHAllophone(nextPhoneme), msToSamples(params.duration)]);
      continue;
    }

    const seg = phonemeToSegment(params, phoneme);
    seq.push([seg, msToSamples(params.duration)]);
  }

  return seq;
}

// ═══════════════════════════════════════════════════════════
// AMPLITUDE ENVELOPE
// ═══════════════════════════════════════════════════════════

function computeEnvelope(sampleIndex: number, totalSamples: number): number {
  const attackSamples = Math.min(msToSamples(5), totalSamples / 4);
  const releaseSamples = Math.min(msToSamples(8), totalSamples / 4);
  const releaseStart = totalSamples - releaseSamples;

  if (sampleIndex < attackSamples) {
    return 0.5 * (1 - Math.cos(Math.PI * sampleIndex / attackSamples));
  } else if (sampleIndex >= releaseStart) {
    const releasePos = (sampleIndex - releaseStart) / releaseSamples;
    return 0.5 * (1 + Math.cos(Math.PI * releasePos));
  }
  return 1.0;
}

// ═══════════════════════════════════════════════════════════
// MAIN SYNTHESIZER — Grok v20
// ═══════════════════════════════════════════════════════════

function synthesize(seq: Segment[]): Float32Array {
  if (seq.length === 0) return new Float32Array(0);

  let totalSamples = 0;
  for (const [, dur] of seq) totalSamples += dur;
  totalSamples += SR;

  const output = new Float32Array(totalSamples);
  let writePos = 0;

  // 5 persistent resonators
  const filters: Resonator[] = [
    makeResonator(500, 100),
    makeResonator(1500, 120),
    makeResonator(2500, 150),
    makeResonator(3500, 350),
    makeResonator(4500, 500),
  ];

  // Nasal anti-resonator
  const nasalZero = makeAntiResonator(NASAL_ZERO_FREQ, NASAL_ZERO_BW);
  let nasalActive = false;

  // Grok v20: zero-pole pair at 3.8kHz for modern clarity
  const grokZeroPole = makeAntiResonator(GROK.zeroPoleFreq, GROK.zerPoleBw);

  // Spectral tilt
  const tilt = makeTiltFilter();

  // Global HF damping at 4.2kHz
  const damping = makeDampingFilter();

  // Pre-emphasis for vowel brilliance
  const preEmph = makePreEmph();

  const amplitude = 0.9;
  const f0Base = VOICE_DNA.f0.median || 125;

  // Grok v20: coarticulation window = 50% / formantSpeed = ~43%
  const coartStart = 1 - (0.5 / GROK.formantSpeed); // ~0.435

  for (let si = 0; si < seq.length; si++) {
    const [paramCurr, durationSamples] = seq[si];
    const paramNext = si + 1 < seq.length ? seq[si + 1][0] : paramCurr;

    // Grok v20: pitch variance ×1.04 — intelligent micro-intonation
    const pitchRange = 10 * GROK.pitchVariance;
    const f0 = f0Base + (Math.random() - 0.5) * pitchRange;

    // Generate source
    let source: Float32Array;
    if (paramCurr.source === 'noise') {
      source = generateNoise(durationSamples);
    } else if (paramCurr.source === 'mixed') {
      source = generateMixed(durationSamples, f0, 0.55);
    } else {
      // Grok v20: voiced + split aspiration + burst noise
      source = generateVoicedGrok(durationSamples, f0);
    }

    // Spectral tilt on voiced source
    if (paramCurr.source === 'glottal') {
      for (let i = 0; i < source.length; i++) {
        source[i] = tickTilt(tilt, source[i]);
      }
    }

    // Set all 5 resonators
    setResonator(filters[0], paramCurr.f1, paramCurr.bw1);
    setResonator(filters[1], paramCurr.f2, paramCurr.bw2);
    setResonator(filters[2], paramCurr.f3, paramCurr.bw3);
    setResonator(filters[3], paramCurr.f4, paramCurr.bw4);
    setResonator(filters[4], paramCurr.f5, paramCurr.bw5);

    // Set nasal anti-resonator
    nasalActive = paramCurr.nasal && paramCurr.nasalFreq > 0;
    if (nasalActive) {
      setAntiResonator(nasalZero, paramCurr.nasalFreq, paramCurr.nasalBw);
    }

    // Process in 5ms frames with faster coarticulation
    for (let frameBeg = 0; frameBeg < durationSamples; frameBeg += FRAME_SIZE) {
      const frameEnd = Math.min(frameBeg + FRAME_SIZE, durationSamples);
      const position = frameBeg / Math.max(durationSamples, 1);

      // Grok v20: faster coarticulation (starts at ~43% instead of 50%)
      if (position > coartStart) {
        const blend = (position - coartStart) / (1 - coartStart);
        setResonator(filters[0], lerp(paramCurr.f1, paramNext.f1, blend), lerp(paramCurr.bw1, paramNext.bw1, blend));
        setResonator(filters[1], lerp(paramCurr.f2, paramNext.f2, blend), lerp(paramCurr.bw2, paramNext.bw2, blend));
        setResonator(filters[2], lerp(paramCurr.f3, paramNext.f3, blend), lerp(paramCurr.bw3, paramNext.bw3, blend));
        setResonator(filters[3], lerp(paramCurr.f4, paramNext.f4, blend), lerp(paramCurr.bw4, paramNext.bw4, blend));
        setResonator(filters[4], lerp(paramCurr.f5, paramNext.f5, blend), lerp(paramCurr.bw5, paramNext.bw5, blend));

        // Transition nasal state
        if (paramCurr.nasal !== paramNext.nasal) {
          const nasalGain = paramCurr.nasal ? (1 - blend) : blend;
          if (nasalGain > 0.1) {
            nasalActive = true;
            const nf = paramCurr.nasal ? paramCurr.nasalFreq : paramNext.nasalFreq;
            const nb = paramCurr.nasal ? paramCurr.nasalBw : paramNext.nasalBw;
            if (nf > 0) setAntiResonator(nasalZero, nf, nb);
          } else {
            nasalActive = false;
          }
        }
      }

      const gainBlend = position > coartStart ? (position - coartStart) / (1 - coartStart) : 0;
      const currentGain = lerp(paramCurr.gain, paramNext.gain, gainBlend);

      // Filter each sample
      for (let j = frameBeg; j < frameEnd; j++) {
        let y = source[j];

        // Pre-emphasis for vowel brilliance (+5% in 0-2kHz)
        if (paramCurr.source === 'glottal') {
          y = tickPreEmph(preEmph, y);
        }

        // Apply nasal anti-resonator before formants
        if (nasalActive) {
          y = tickAntiResonator(nasalZero, y);
        }

        // Cascade through 5 resonators
        for (let fi = 0; fi < N_FILTERS; fi++) {
          y = tickResonator(filters[fi], y);
        }

        // Grok v20: zero-pole pair at 3.8kHz for modern clarity
        y = tickAntiResonator(grokZeroPole, y);

        // Global HF damping at 4.2kHz
        y = tickDamping(damping, y);

        // Apply envelope
        const env = computeEnvelope(j, durationSamples);

        const idx = writePos + j;
        if (idx < output.length) {
          output[idx] = clamp(y * amplitude * currentGain * env);
        }
      }
    }

    writePos += durationSamples;
  }

  return output.slice(0, writePos);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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
    dcX1 = samples[i]; dcY1 = y; dc[i] = y;
  }

  // v22: spectral envelope smoothing — removes metallic residue
  const sm = new Float32Array(len);
  const alpha = GROK.spectralSmoothing; // 0.89
  sm[0] = dc[0];
  for (let i = 1; i < len; i++) {
    sm[i] = alpha * sm[i - 1] + (1 - alpha) * dc[i];
  }

  // Gentle pre-emphasis (post-processing stage)
  const pe = new Float32Array(len);
  pe[0] = sm[0];
  for (let i = 1; i < len; i++) {
    pe[i] = sm[i] - 0.30 * sm[i - 1];
  }

  // Normalize to -1dB
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const a = Math.abs(pe[i]);
    if (a > peak) peak = a;
  }
  if (peak === 0) return pe;

  const gain = 0.89 / peak;
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = pe[i] * gain;
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
  console.log(`[Formant v22-GrokUltra] "${text.slice(0, 50)}..." → ${phonemes.length} phonemes`);

  glottalPhase = 0;
  subHarmonicPhase = 0;
  vibratoPhase = 0;

  const segments = buildSegments(phonemes);
  console.log(`[Formant v22-GrokUltra] ${segments.length} segments built`);

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
    console.warn("[Formant v22-GrokUltra] Error:", err);
    return { played: false, audio: null };
  }
}
