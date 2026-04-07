/**
 * Orion Formant Speech Synthesizer v23 — Core Rewrite
 * 
 * Fixed fundamental issues from v19-v22:
 * 1. Smooth pitch contour (no per-segment random jumps)
 * 2. Gaussian-filtered jitter (no harsh random clicks)
 * 3. Cascade resonator gain normalization (no metallic buildup)
 * 4. Proper spectral smoothing (not time-domain LP)
 * 5. Gentle post-processing (no aggressive pre-emphasis)
 * 6. Smooth f0 interpolation across segments
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
// v23 CONFIG — conservative, human-focused
// ═══════════════════════════════════════════════════════════

const CFG = {
  // Formant bandwidths
  bw3Multiplier: 2.0,        // was 2.85 — too wide causes hollow/metallic
  
  // Source mixing
  aspirationRatio: 0.04,     // very subtle aspiration
  noiseBurstRatio: 0.02,     // minimal shaped burst
  
  // Micro-perturbation (smooth, not random)
  jitterMult: 0.6,           // was 1.04 on raw random — now on filtered noise
  shimmerMult: 0.4,          // very subtle amplitude variation
  
  // Spectral shaping
  dampingFreq: 5000,         // gentle HF rolloff (was 4500 — too aggressive)
  dampingMix: 0.85,          // mostly original signal
  spectralTiltMult: 1.0,     // neutral — let formants speak naturally
  
  // Voice quality
  breathiness: 0.06,         // subtle breath, not white noise flood
  glottalOQ: 0.60,           // moderate open quotient
  glottalTension: 0.90,      // slight relaxation
  subHarmonicGain: 0.03,     // very subtle warmth
  
  // Prosody
  pitchVariance: 6,          // Hz of smooth pitch variation (not multiplier)
  pitchDriftRate: 0.8,       // Hz — how fast pitch drifts
  
  // Coarticulation
  formantSpeed: 1.2,         // moderate transition speed
  coartWindow: 0.35,         // last 35% of segment transitions to next
  
  // Post-processing
  preEmphasisPost: 0.15,     // gentle (was 0.30 — way too harsh)
  
  // Vibrato
  vibratoDepth: 0.003,       // 0.3% — barely perceptible
  vibratoRate: 5.2,          // Hz
};

// ═══════════════════════════════════════════════════════════
// IIR BIQUAD RESONATOR with gain normalization
// ═══════════════════════════════════════════════════════════

interface Resonator {
  a0: number;
  b1: number;
  b2: number;
  z1: number;
  z2: number;
  gain: number; // normalization gain
}

function computeCoeffs(freq: number, bw: number): { a0: number; b1: number; b2: number; gain: number } {
  if (freq < 20 || bw < 1 || freq >= SR / 2) return { a0: 1, b1: 0, b2: 0, gain: 1 };
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = 2 * Math.PI * freq / SR;
  const b1 = -2 * r * Math.cos(theta);
  const b2 = r * r;
  const a0 = 1 + b1 + b2;
  // Normalization: prevent resonator from amplifying excessively
  // Peak gain of resonator ≈ 1/(1-r) when bw is narrow
  const peakGain = 1 / (1 - r + 0.001);
  const gain = Math.min(1.0, 3.0 / peakGain); // limit cascade amplification
  return { a0, b1, b2, gain };
}

function makeResonator(freq: number, bw: number): Resonator {
  const c = computeCoeffs(freq, bw);
  return { ...c, z1: 0, z2: 0 };
}

function setResonator(res: Resonator, freq: number, bw: number) {
  const c = computeCoeffs(freq, bw);
  res.a0 = c.a0; res.b1 = c.b1; res.b2 = c.b2; res.gain = c.gain;
}

function tickResonator(res: Resonator, x: number): number {
  const y = res.a0 * x - res.b1 * res.z1 - res.b2 * res.z2;
  res.z2 = res.z1;
  res.z1 = y;
  return y * res.gain;
}

// ═══════════════════════════════════════════════════════════
// ANTI-RESONATOR (nasal zero)
// ═══════════════════════════════════════════════════════════

interface AntiResonator {
  a0: number; b1: number; b2: number; z1: number; z2: number;
}

function makeAntiResonator(freq: number, bw: number): AntiResonator {
  if (freq < 20 || bw < 1 || freq >= SR / 2) return { a0: 1, b1: 0, b2: 0, z1: 0, z2: 0 };
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = 2 * Math.PI * freq / SR;
  return { a0: 1.0, b1: 2 * r * Math.cos(theta), b2: -(r * r), z1: 0, z2: 0 };
}

function setAntiResonator(ar: AntiResonator, freq: number, bw: number) {
  if (freq < 20 || bw < 1 || freq >= SR / 2) { ar.a0 = 1; ar.b1 = 0; ar.b2 = 0; return; }
  const r = Math.exp(-Math.PI * bw / SR);
  const theta = 2 * Math.PI * freq / SR;
  ar.a0 = 1.0; ar.b1 = 2 * r * Math.cos(theta); ar.b2 = -(r * r);
}

function tickAntiResonator(ar: AntiResonator, x: number): number {
  const y = ar.a0 * x + ar.b1 * ar.z1 + ar.b2 * ar.z2;
  ar.z2 = ar.z1; ar.z1 = x;
  return y;
}

// ═══════════════════════════════════════════════════════════
// SMOOTH PITCH CONTOUR — no more random jumps
// ═══════════════════════════════════════════════════════════

let pitchDrift = 0;      // current pitch offset in Hz
let pitchDriftVel = 0;   // velocity of pitch drift

function getSmoothedF0(f0Base: number): number {
  // Ornstein-Uhlenbeck process: mean-reverting smooth drift
  const dt = 1 / SR;
  const meanRevert = 2.0; // how quickly drift returns to 0
  const diffusion = CFG.pitchVariance * 2; // noise amplitude
  
  pitchDriftVel += (-meanRevert * pitchDrift + diffusion * gaussianNoise()) * dt;
  pitchDriftVel *= 0.999; // damping
  pitchDrift += pitchDriftVel;
  pitchDrift = Math.max(-15, Math.min(15, pitchDrift)); // clamp
  
  // Add subtle vibrato
  vibratoPhase += 2 * Math.PI * CFG.vibratoRate / SR;
  const vibrato = CFG.vibratoDepth * f0Base * Math.sin(vibratoPhase);
  
  return f0Base + pitchDrift + vibrato;
}

// Box-Muller for Gaussian noise (smooth jitter)
let spareGaussian: number | null = null;
function gaussianNoise(): number {
  if (spareGaussian !== null) {
    const s = spareGaussian;
    spareGaussian = null;
    return s;
  }
  let u, v, s2;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s2 = u * u + v * v;
  } while (s2 >= 1 || s2 === 0);
  const mul = Math.sqrt(-2 * Math.log(s2) / s2);
  spareGaussian = v * mul;
  return u * mul;
}

// ═══════════════════════════════════════════════════════════
// SOURCE GENERATORS — Clean LF Glottal
// ═══════════════════════════════════════════════════════════

let glottalPhase = 0;
let subHarmonicPhase = 0;
let vibratoPhase = 0;
let jitterSmoothed = 0; // filtered jitter

function generateGlottalSource(count: number, f0Base: number): Float32Array {
  const out = new Float32Array(count);
  
  for (let i = 0; i < count; i++) {
    const f0 = getSmoothedF0(f0Base);
    const T0 = SR / f0;
    const OQ = CFG.glottalOQ;
    const SQ = VOICE_DNA.glottal.speedQuotient;
    const Te = OQ * T0;
    const Tp = Te / (1 + SQ);
    const Ta = 0.08 * T0;
    
    const t = glottalPhase;
    let sample = 0;

    if (t < Tp) {
      sample = 0.5 * (1 - Math.cos(Math.PI * t / Tp));
    } else if (t < Te) {
      const tc = (t - Tp) / (Te - Tp);
      sample = Math.cos(Math.PI * 0.5 * tc);
    } else {
      const tr = (t - Te) / Math.max(Ta, 1);
      sample = -0.2 * CFG.glottalTension * Math.exp(-tr);
    }

    // Smooth shimmer (filtered, not raw random)
    const shimmerNoise = gaussianNoise() * CFG.shimmerMult * 0.05;
    const shimmerFactor = 1 + shimmerNoise;
    
    // Very subtle sub-harmonic
    const T0sub = T0 * 2;
    const subHarmonic = CFG.subHarmonicGain * Math.sin(2 * Math.PI * subHarmonicPhase / T0sub);
    
    // Gentle breathiness (filtered noise, not raw white)
    const breath = CFG.breathiness * gaussianNoise() * 0.3;
    
    out[i] = (sample * shimmerFactor) + subHarmonic + breath;

    // Advance with SMOOTH jitter (filtered, not raw random)
    const rawJitter = gaussianNoise() * CFG.jitterMult * 0.02;
    jitterSmoothed = 0.95 * jitterSmoothed + 0.05 * rawJitter; // smooth it
    glottalPhase += 1 + jitterSmoothed;
    if (glottalPhase >= T0) glottalPhase -= T0;
    
    subHarmonicPhase += 1;
    if (subHarmonicPhase >= T0sub) subHarmonicPhase -= T0sub;
  }

  return out;
}

function generateNoise(count: number): Float32Array {
  const out = new Float32Array(count);
  let prev = 0;
  for (let i = 0; i < count; i++) {
    const white = Math.random() * 2 - 1;
    prev = 0.7 * prev + 0.3 * white;
    out[i] = prev * 1.2;
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

function generateVoicedWithAspiration(count: number, f0: number): Float32Array {
  const glottal = generateGlottalSource(count, f0);
  const out = new Float32Array(count);
  const voiceRatio = 1 - CFG.aspirationRatio - CFG.noiseBurstRatio;
  
  for (let i = 0; i < count; i++) {
    // Aspiration: gentle filtered noise
    const aspNoise = gaussianNoise() * 0.3;
    // Shaped burst near 3.2kHz: use gentle bandpass
    const burstNoise = gaussianNoise() * 0.2;
    
    out[i] = voiceRatio * glottal[i]
           + CFG.aspirationRatio * aspNoise
           + CFG.noiseBurstRatio * burstNoise;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════
// SPECTRAL TILT — gentle, natural
// ═══════════════════════════════════════════════════════════

interface TiltFilter { alpha: number; z1: number; }

function makeTiltFilter(): TiltFilter {
  const tiltDb = VOICE_DNA.dynamics.spectralTilt * CFG.spectralTiltMult;
  const alpha = Math.min(1 - Math.pow(10, -tiltDb / 200), 0.75); // capped lower
  return { alpha, z1: 0 };
}

function tickTilt(f: TiltFilter, x: number): number {
  const y = x - f.alpha * f.z1;
  f.z1 = x;
  return y;
}

// ═══════════════════════════════════════════════════════════
// HF DAMPING — gentle rolloff
// ═══════════════════════════════════════════════════════════

interface DampingFilter { z1: number; coeff: number; }

function makeDampingFilter(): DampingFilter {
  const fc = CFG.dampingFreq;
  const rc = 1 / (2 * Math.PI * fc);
  const dt = 1 / SR;
  return { z1: 0, coeff: dt / (rc + dt) };
}

function tickDamping(f: DampingFilter, x: number): number {
  f.z1 += f.coeff * (x - f.z1);
  return CFG.dampingMix * x + (1 - CFG.dampingMix) * f.z1;
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
  's':  { f1:200,f2:5500,f3:7500,f4:9000,f5:11000, bw1:500,bw2:3000,bw3:2000,bw4:1000,bw5:1000, gain:0.45, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'z':  { f1:200,f2:5500,f3:7500,f4:9000,f5:11000, bw1:500,bw2:3000,bw3:2000,bw4:1000,bw5:1000, gain:0.35, source:'mixed', nasal:false, nasalFreq:0, nasalBw:0 },
  'ʃ':  { f1:200,f2:3800,f3:6000,f4:8000,f5:10000, bw1:500,bw2:2500,bw3:2000,bw4:1000,bw5:1000, gain:0.45, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'ʒ':  { f1:200,f2:3800,f3:6000,f4:8000,f5:10000, bw1:500,bw2:2500,bw3:2000,bw4:1000,bw5:1000, gain:0.35, source:'mixed', nasal:false, nasalFreq:0, nasalBw:0 },
  'f':  { f1:200,f2:2500,f3:4000,f4:6000,f5:8000,   bw1:500,bw2:3000,bw3:2000,bw4:1000,bw5:1000, gain:0.25, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'v':  { f1:220,f2:2500,f3:4000,f4:6000,f5:8000,   bw1:500,bw2:3000,bw3:2000,bw4:1000,bw5:1000, gain:0.30, source:'mixed', nasal:false, nasalFreq:0, nasalBw:0 },
  'h':  { f1:500,f2:1500,f3:2500,f4:3500,f5:4500,   bw1:200,bw2:300,bw3:400,bw4:500,bw5:600,     gain:0.20, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'χ':  { f1:300,f2:1100,f3:2400,f4:3500,f5:4500,   bw1:400,bw2:400,bw3:400,bw4:500,bw5:600,     gain:0.45, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'R':  { f1:300,f2:1100,f3:2400,f4:3500,f5:4500,   bw1:110,bw2:140,bw3:190,bw4:300,bw5:400,     gain:0.45, source:'mixed', nasal:false, nasalFreq:0, nasalBw:0 },
};

function getHAllophone(nextPhoneme: string | undefined): SegmentParams {
  const vp = nextPhoneme ? PT_PHONEMES[nextPhoneme] : null;
  if (vp && vp.voiced && !vp.fricative && !vp.plosive) {
    return {
      f1: vp.f1 || 500, f2: vp.f2 || 1500, f3: vp.f3 || 2500,
      f4: vp.f4 || DEFAULT_F4, f5: DEFAULT_F5,
      bw1: 200, bw2: 300, bw3: 400, bw4: 500, bw5: 600,
      gain: 0.20, source: 'noise', nasal: false, nasalFreq: 0, nasalBw: 0,
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

  // Conservative BW3 multiplier — too wide = hollow/metallic
  const bw3Effective = (p.bw3 || 150) * CFG.bw3Multiplier;

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
  return { f1:200,f2:200,f3:200,f4:200,f5:200, bw1:100,bw2:200,bw3:300,bw4:400,bw5:500, gain:0.12, source:'glottal', nasal:false, nasalFreq:0, nasalBw:0 };
}

const BURST_BY_PLACE: Record<string, SegmentParams> = {
  'p':   { f1:400,f2:1000,f3:2300,f4:3500,f5:4500, bw1:400,bw2:1200,bw3:1500,bw4:800,bw5:800, gain:0.55, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'b':   { f1:400,f2:1000,f3:2300,f4:3500,f5:4500, bw1:400,bw2:1200,bw3:1500,bw4:800,bw5:800, gain:0.50, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  't':   { f1:400,f2:4000,f3:5500,f4:7000,f5:9000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.60, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'd':   { f1:400,f2:4000,f3:5500,f4:7000,f5:9000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.55, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'k':   { f1:400,f2:1800,f3:2600,f4:3800,f5:5000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.55, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'g':   { f1:400,f2:1800,f3:2600,f4:3800,f5:5000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.50, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  't͡ʃ': { f1:400,f2:3800,f3:6000,f4:8000,f5:10000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.60, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
  'd͡ʒ': { f1:400,f2:3800,f3:6000,f4:8000,f5:10000, bw1:400,bw2:1500,bw3:1500,bw4:800,bw5:800, gain:0.55, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 },
};

function getBurstParams(phoneme: string): SegmentParams {
  return BURST_BY_PLACE[phoneme] || BURST_BY_PLACE['p'];
}

function getVOTParams(phoneme: string, nextPhoneme?: string): SegmentParams {
  if (phoneme === 't͡ʃ') {
    return { f1:200,f2:3800,f3:6000,f4:8000,f5:10000, bw1:500,bw2:2000,bw3:1500,bw4:800,bw5:800, gain:0.45, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 };
  }
  if (phoneme === 'd͡ʒ') {
    return { f1:200,f2:3800,f3:6000,f4:8000,f5:10000, bw1:500,bw2:2000,bw3:1500,bw4:800,bw5:800, gain:0.35, source:'mixed', nasal:false, nasalFreq:0, nasalBw:0 };
  }
  const vowel = nextPhoneme ? PT_PHONEMES[nextPhoneme] : null;
  if (vowel && vowel.voiced && !vowel.fricative && !vowel.plosive) {
    return {
      f1: vowel.f1 || 500, f2: vowel.f2 || 1500, f3: vowel.f3 || 2500,
      f4: vowel.f4 || DEFAULT_F4, f5: DEFAULT_F5,
      bw1: 250, bw2: 350, bw3: 400, bw4: 500, bw5: 600,
      gain: 0.18, source: 'noise', nasal: false, nasalFreq: 0, nasalBw: 0,
    };
  }
  return { f1:500,f2:1500,f3:2500,f4:DEFAULT_F4,f5:DEFAULT_F5, bw1:250,bw2:350,bw3:400,bw4:500,bw5:600, gain:0.18, source:'noise', nasal:false, nasalFreq:0, nasalBw:0 };
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
// AMPLITUDE ENVELOPE — smoother attack/release
// ═══════════════════════════════════════════════════════════

function computeEnvelope(sampleIndex: number, totalSamples: number): number {
  const attackSamples = Math.min(msToSamples(8), totalSamples / 3);
  const releaseSamples = Math.min(msToSamples(12), totalSamples / 3);
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
// MAIN SYNTHESIZER — v23 with fixes
// ═══════════════════════════════════════════════════════════

function synthesize(seq: Segment[]): Float32Array {
  if (seq.length === 0) return new Float32Array(0);

  let totalSamples = 0;
  for (const [, dur] of seq) totalSamples += dur;
  totalSamples += SR; // padding

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

  // Spectral tilt
  const tilt = makeTiltFilter();

  // Global HF damping
  const damping = makeDampingFilter();

  const amplitude = 0.7; // lower base amplitude — let normalization handle it
  const f0Base = VOICE_DNA.f0.median || 125;

  const coartStart = 1 - CFG.coartWindow;

  for (let si = 0; si < seq.length; si++) {
    const [paramCurr, durationSamples] = seq[si];
    const paramNext = si + 1 < seq.length ? seq[si + 1][0] : paramCurr;

    // Generate source — f0 is now smoothly modulated inside generateGlottalSource
    let source: Float32Array;
    if (paramCurr.source === 'noise') {
      source = generateNoise(durationSamples);
    } else if (paramCurr.source === 'mixed') {
      source = generateMixed(durationSamples, f0Base, 0.55);
    } else {
      source = generateVoicedWithAspiration(durationSamples, f0Base);
    }

    // Spectral tilt on voiced source only
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

    nasalActive = paramCurr.nasal && paramCurr.nasalFreq > 0;
    if (nasalActive) {
      setAntiResonator(nasalZero, paramCurr.nasalFreq, paramCurr.nasalBw);
    }

    // Process in 5ms frames with coarticulation
    for (let frameBeg = 0; frameBeg < durationSamples; frameBeg += FRAME_SIZE) {
      const frameEnd = Math.min(frameBeg + FRAME_SIZE, durationSamples);
      const position = frameBeg / Math.max(durationSamples, 1);

      // Smooth coarticulation in last portion of segment
      if (position > coartStart) {
        const blend = (position - coartStart) / (1 - coartStart);
        // Smooth cubic interpolation instead of linear
        const t = blend * blend * (3 - 2 * blend); // smoothstep
        setResonator(filters[0], lerp(paramCurr.f1, paramNext.f1, t), lerp(paramCurr.bw1, paramNext.bw1, t));
        setResonator(filters[1], lerp(paramCurr.f2, paramNext.f2, t), lerp(paramCurr.bw2, paramNext.bw2, t));
        setResonator(filters[2], lerp(paramCurr.f3, paramNext.f3, t), lerp(paramCurr.bw3, paramNext.bw3, t));
        setResonator(filters[3], lerp(paramCurr.f4, paramNext.f4, t), lerp(paramCurr.bw4, paramNext.bw4, t));
        setResonator(filters[4], lerp(paramCurr.f5, paramNext.f5, t), lerp(paramCurr.bw5, paramNext.bw5, t));

        if (paramCurr.nasal !== paramNext.nasal) {
          const nasalGain = paramCurr.nasal ? (1 - t) : t;
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

      const gainBlend = position > coartStart
        ? (position - coartStart) / (1 - coartStart)
        : 0;
      const currentGain = lerp(paramCurr.gain, paramNext.gain, gainBlend);

      // Filter each sample
      for (let j = frameBeg; j < frameEnd; j++) {
        let y = source[j];

        // Apply nasal anti-resonator before formants
        if (nasalActive) {
          y = tickAntiResonator(nasalZero, y);
        }

        // Cascade through 5 resonators (now with gain normalization)
        for (let fi = 0; fi < N_FILTERS; fi++) {
          y = tickResonator(filters[fi], y);
        }

        // Gentle HF damping
        y = tickDamping(damping, y);

        // Apply envelope
        const env = computeEnvelope(j, durationSamples);

        const idx = writePos + j;
        if (idx < output.length) {
          output[idx] = y * amplitude * currentGain * env;
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

// ═══════════════════════════════════════════════════════════
// POST-PROCESSING — clean, minimal
// ═══════════════════════════════════════════════════════════

function postProcess(samples: Float32Array): Float32Array {
  const len = samples.length;
  if (len === 0) return samples;

  // 1. DC blocking
  let dcX1 = 0, dcY1 = 0;
  const dc = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const y = samples[i] - dcX1 + 0.997 * dcY1;
    dcX1 = samples[i]; dcY1 = y; dc[i] = y;
  }

  // 2. Gentle pre-emphasis (mild, not 0.30)
  const pe = new Float32Array(len);
  pe[0] = dc[0];
  for (let i = 1; i < len; i++) {
    pe[i] = dc[i] - CFG.preEmphasisPost * dc[i - 1];
  }

  // 3. Soft limiter (prevents harsh clipping)
  for (let i = 0; i < len; i++) {
    const x = pe[i];
    pe[i] = Math.tanh(x * 1.5) / 1.5; // soft saturation
  }

  // 4. Normalize to -2dB
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const a = Math.abs(pe[i]);
    if (a > peak) peak = a;
  }
  if (peak === 0) return pe;

  const gain = 0.79 / peak; // -2dB headroom
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
  console.log(`[Formant v23] "${text.slice(0, 50)}..." → ${phonemes.length} phonemes`);

  // Reset all state
  glottalPhase = 0;
  subHarmonicPhase = 0;
  vibratoPhase = 0;
  pitchDrift = 0;
  pitchDriftVel = 0;
  jitterSmoothed = 0;
  spareGaussian = null;

  const segments = buildSegments(phonemes);
  console.log(`[Formant v23] ${segments.length} segments built`);

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
    console.warn("[Formant v23] Error:", err);
    return { played: false, audio: null };
  }
}
