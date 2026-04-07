/**
 * ─── IPA Phoneme Tokenizer for Orion TTS ───
 * 
 * Complete International Phonetic Alphabet tokenization system.
 * Each phoneme gets a unique binary token with full articulatory features
 * derived from the IPA chart (2019 revision).
 * 
 * Flow: Text → G2P → IPA tokens → Articulatory features → Formant params
 * 
 * This is the "language" the synthesizer speaks.
 */

// ═══════════════════════════════════════════════════════════
// IPA ARTICULATORY FEATURE SYSTEM
// ═══════════════════════════════════════════════════════════

/** Place of articulation (from IPA consonant chart columns) */
export type Place =
  | 'bilabial' | 'labiodental' | 'dental' | 'alveolar'
  | 'postalveolar' | 'retroflex' | 'palatal' | 'velar'
  | 'uvular' | 'pharyngeal' | 'glottal';

/** Manner of articulation (from IPA consonant chart rows) */
export type Manner =
  | 'plosive' | 'nasal' | 'trill' | 'tap' | 'fricative'
  | 'lateral_fricative' | 'approximant' | 'lateral_approximant';

/** Vowel height (from IPA vowel quadrilateral) */
export type VowelHeight = 'close' | 'near_close' | 'close_mid' | 'mid' | 'open_mid' | 'near_open' | 'open';

/** Vowel backness */
export type VowelBackness = 'front' | 'central' | 'back';

export interface IPAToken {
  /** IPA symbol */
  ipa: string;
  /** Unique token ID (0-127) */
  id: number;
  /** Binary representation (7-bit) */
  binary: string;
  /** Articulatory features */
  features: ArticulatoryFeatures;
  /** Formant targets (Hz) */
  formants: FormantTarget;
  /** Default duration (ms) */
  duration: number;
  /** Amplitude (0-1) */
  amplitude: number;
}

export interface ArticulatoryFeatures {
  type: 'vowel' | 'consonant' | 'pause';
  voiced: boolean;
  nasal: boolean;
  // Consonant features
  place?: Place;
  manner?: Manner;
  // Vowel features
  height?: VowelHeight;
  backness?: VowelBackness;
  rounded?: boolean;
  // Modifiers
  aspirated?: boolean;
  palatalized?: boolean;
  long?: boolean;
}

export interface FormantTarget {
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  bw1: number;
  bw2: number;
  bw3: number;
  bw4: number;
}

// ═══════════════════════════════════════════════════════════
// COMPLETE PT-BR IPA TOKEN TABLE
// Based on IPA chart (2019) + male Brazilian Portuguese values
// ═══════════════════════════════════════════════════════════

const mkVowel = (
  ipa: string, id: number,
  height: VowelHeight, backness: VowelBackness, rounded: boolean, nasal: boolean,
  f1: number, f2: number, f3: number, f4: number,
  bw1: number, bw2: number, bw3: number, bw4: number,
  duration: number, amplitude: number,
): IPAToken => ({
  ipa, id,
  binary: id.toString(2).padStart(7, '0'),
  features: { type: 'vowel', voiced: true, nasal, height, backness, rounded },
  formants: { f1, f2, f3, f4, bw1, bw2, bw3, bw4 },
  duration, amplitude,
});

const mkConsonant = (
  ipa: string, id: number,
  place: Place, manner: Manner, voiced: boolean, nasal: boolean,
  f1: number, f2: number, f3: number, f4: number,
  bw1: number, bw2: number, bw3: number, bw4: number,
  duration: number, amplitude: number,
  extra?: Partial<ArticulatoryFeatures>,
): IPAToken => ({
  ipa, id,
  binary: id.toString(2).padStart(7, '0'),
  features: { type: 'consonant', voiced, nasal, place, manner, ...extra },
  formants: { f1, f2, f3, f4, bw1, bw2, bw3, bw4 },
  duration, amplitude,
});

/**
 * Master token table — each phoneme used in pt-BR mapped to
 * articulatory features + formant targets.
 * 
 * Token IDs:
 *   0-15:  Oral vowels
 *   16-31: Nasal vowels + semivowels
 *   32-63: Plosives + nasals
 *   64-95: Fricatives + liquids
 *   96-127: Special + prosody markers
 */
export const IPA_TOKENS: IPAToken[] = [
  // ── ORAL VOWELS (IPA vowel quadrilateral) ──
  //                                  ipa  id   height      backness  round nasal  F1   F2    F3    F4    BW1  BW2  BW3  BW4  dur  amp
  mkVowel('a',   1,  'open',     'central', false, false, 699, 1329, 2515, 3403, 130, 80,  140, 550, 220, 1.0),
  mkVowel('e',   2,  'close_mid','front',   false, false, 375, 1636, 2529, 3692, 90,  130, 190, 230, 185, 0.92),
  mkVowel('ɛ',   3,  'open_mid', 'front',   false, false, 579, 1646, 2567, 3500, 250, 140, 260, 270, 195, 0.95),
  mkVowel('i',   4,  'close',    'front',   false, false, 267, 2134, 2688, 3686, 70,  150, 300, 160, 170, 0.85),
  mkVowel('o',   5,  'close_mid','back',    true,  false, 429, 1011, 2502, 3602, 180, 170, 230, 230, 195, 0.93),
  mkVowel('ɔ',   6,  'open_mid', 'back',    true,  false, 523, 1143, 2436, 3502, 230, 110, 130, 240, 195, 0.94),
  mkVowel('u',   7,  'close',    'back',    true,  false, 237, 1087, 2437, 3630, 170, 260, 200, 220, 175, 0.85),

  // ── NASAL VOWELS ──
  mkVowel('ã',  16,  'open',     'central', false, true,  650, 1280, 2500, 3400, 190, 130, 190, 570, 220, 0.88),
  mkVowel('ẽ',  17,  'close_mid','front',   false, true,  360, 1600, 2520, 3680, 150, 190, 240, 270, 195, 0.82),
  mkVowel('ĩ',  18,  'close',    'front',   false, true,  250, 2100, 2680, 3680, 130, 200, 350, 200, 170, 0.78),
  mkVowel('õ',  19,  'close_mid','back',    true,  true,  410, 990,  2490, 3590, 230, 230, 280, 270, 210, 0.83),
  mkVowel('ũ',  20,  'close',    'back',    true,  true,  225, 1060, 2430, 3620, 220, 310, 240, 260, 185, 0.78),

  // ── SEMIVOWELS (approximants) ──
  mkConsonant('w', 24, 'velar',     'approximant', true, false, 340, 700,  2400, 3300, 70,  90,  155, 225, 75,  0.73),
  mkConsonant('j', 25, 'palatal',   'approximant', true, false, 290, 2100, 2800, 3700, 60,  80,  145, 215, 75,  0.73),

  // ── PLOSIVES (IPA chart: bilabial → velar) ──
  mkConsonant('p', 32, 'bilabial',    'plosive', false, false, 300, 800,  2300, 3200, 200, 200, 200, 250, 50,  0.70),
  mkConsonant('b', 33, 'bilabial',    'plosive', true,  false, 300, 800,  2300, 3200, 150, 150, 180, 220, 45,  0.70),
  mkConsonant('t', 34, 'alveolar',    'plosive', false, false, 300, 1700, 2600, 3500, 200, 200, 200, 250, 50,  0.70),
  mkConsonant('d', 35, 'alveolar',    'plosive', true,  false, 300, 1700, 2600, 3500, 150, 150, 180, 220, 45,  0.70),
  mkConsonant('k', 36, 'velar',       'plosive', false, false, 300, 1400, 2500, 3400, 200, 200, 200, 250, 55,  0.70),
  mkConsonant('g', 37, 'velar',       'plosive', true,  false, 300, 1400, 2500, 3400, 150, 150, 180, 220, 50,  0.70),

  // ── NASALS (IPA chart row 2) ──
  mkConsonant('m', 40, 'bilabial',    'nasal', true, true, 280, 900,  2300, 3200, 100, 130, 170, 240, 110, 0.78),
  mkConsonant('n', 41, 'alveolar',    'nasal', true, true, 280, 1500, 2500, 3400, 100, 130, 170, 240, 100, 0.78),
  mkConsonant('ɲ', 42, 'palatal',     'nasal', true, true, 280, 1900, 2700, 3600, 100, 130, 170, 240, 115, 0.73),

  // ── FRICATIVES (IPA chart row 5) ──
  mkConsonant('f', 64, 'labiodental', 'fricative', false, false, 200, 1300, 2500, 3500, 350, 350, 350, 400, 140, 0.50),
  mkConsonant('v', 65, 'labiodental', 'fricative', true,  false, 220, 1300, 2500, 3500, 280, 280, 280, 350, 120, 0.60),
  mkConsonant('s', 66, 'alveolar',    'fricative', false, false, 200, 1800, 4500, 7000, 350, 350, 500, 600, 155, 0.60),
  mkConsonant('z', 67, 'alveolar',    'fricative', true,  false, 220, 1800, 4500, 7000, 300, 300, 450, 550, 125, 0.65),
  mkConsonant('ʃ', 68, 'postalveolar','fricative', false, false, 200, 1600, 3800, 6000, 350, 350, 450, 550, 155, 0.60),
  mkConsonant('ʒ', 69, 'postalveolar','fricative', true,  false, 220, 1600, 3800, 6000, 300, 300, 400, 500, 125, 0.65),
  mkConsonant('h', 70, 'glottal',     'fricative', false, false, 500, 1500, 2500, 3500, 500, 500, 500, 500, 90,  0.30),

  // ── TAP / TRILL / LATERAL ──
  mkConsonant('ɾ', 80, 'alveolar',    'tap',                true, false, 350, 1300, 2400, 3300, 80,  100, 160, 230, 45,  0.63),
  mkConsonant('R', 81, 'uvular',      'fricative',          true, false, 300, 1100, 2400, 3300, 110, 140, 190, 260, 110, 0.58),
  mkConsonant('l', 82, 'alveolar',    'lateral_approximant',true, false, 350, 1100, 2400, 3300, 80,  100, 160, 230, 90,  0.68),
  mkConsonant('ʎ', 83, 'palatal',     'lateral_approximant',true, false, 320, 1800, 2600, 3500, 80,  100, 160, 230, 95,  0.68),
];

// ── PAUSE / PROSODY TOKENS ──
const PAUSE_TOKEN: IPAToken = {
  ipa: '_', id: 96,
  binary: '1100000',
  features: { type: 'pause', voiced: false, nasal: false },
  formants: { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, bw4: 0 },
  duration: 80, amplitude: 0,
};

const PERIOD_TOKEN: IPAToken = {
  ipa: '.', id: 97,
  binary: '1100001',
  features: { type: 'pause', voiced: false, nasal: false },
  formants: { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, bw4: 0 },
  duration: 280, amplitude: 0,
};

const COMMA_TOKEN: IPAToken = {
  ipa: ',', id: 98,
  binary: '1100010',
  features: { type: 'pause', voiced: false, nasal: false },
  formants: { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, bw4: 0 },
  duration: 160, amplitude: 0,
};

// ═══════════════════════════════════════════════════════════
// LOOKUP INDEXES
// ═══════════════════════════════════════════════════════════

const TOKEN_BY_IPA = new Map<string, IPAToken>();
for (const t of IPA_TOKENS) TOKEN_BY_IPA.set(t.ipa, t);
TOKEN_BY_IPA.set('_', PAUSE_TOKEN);
TOKEN_BY_IPA.set('.', PERIOD_TOKEN);
TOKEN_BY_IPA.set(',', COMMA_TOKEN);

const TOKEN_BY_ID = new Map<number, IPAToken>();
for (const t of [...IPA_TOKENS, PAUSE_TOKEN, PERIOD_TOKEN, COMMA_TOKEN]) {
  TOKEN_BY_ID.set(t.id, t);
}

/** Look up token by IPA symbol */
export function getToken(ipa: string): IPAToken | undefined {
  return TOKEN_BY_IPA.get(ipa);
}

/** Look up token by ID */
export function getTokenById(id: number): IPAToken | undefined {
  return TOKEN_BY_ID.get(id);
}

// ═══════════════════════════════════════════════════════════
// DIPHONE TRANSITION TABLE
// Defines how formants shift at consonant-vowel boundaries
// These "loci" are what make speech intelligible
// ═══════════════════════════════════════════════════════════

export interface DiphoneTransition {
  /** F2 locus frequency — where F2 starts/ends near consonant */
  f2Locus: number;
  /** Transition duration (ms) */
  transMs: number;
  /** How much the locus influences (0-1) */
  strength: number;
}

/**
 * F2 loci by place of articulation.
 * This is THE key to consonant perception:
 * - Bilabials: F2 locus ~800Hz (low)
 * - Alveolars: F2 locus ~1700Hz (mid)  
 * - Velars: F2 locus ~2000Hz but variable (follows vowel F2)
 * - Palatals: F2 locus ~2300Hz (high)
 */
const F2_LOCI: Record<Place, DiphoneTransition> = {
  bilabial:     { f2Locus: 800,  transMs: 40, strength: 0.7 },
  labiodental:  { f2Locus: 1100, transMs: 35, strength: 0.5 },
  dental:       { f2Locus: 1600, transMs: 30, strength: 0.6 },
  alveolar:     { f2Locus: 1700, transMs: 25, strength: 0.65 },
  postalveolar: { f2Locus: 2000, transMs: 30, strength: 0.6 },
  retroflex:    { f2Locus: 1500, transMs: 35, strength: 0.55 },
  palatal:      { f2Locus: 2300, transMs: 30, strength: 0.7 },
  velar:        { f2Locus: 2000, transMs: 35, strength: 0.5 }, // variable
  uvular:       { f2Locus: 1200, transMs: 40, strength: 0.4 },
  pharyngeal:   { f2Locus: 1000, transMs: 45, strength: 0.3 },
  glottal:      { f2Locus: 1500, transMs: 50, strength: 0.2 },
};

/**
 * Get the diphone transition for a consonant-vowel pair.
 * Returns the F2 trajectory that the formant synth should follow.
 */
export function getDiphoneTransition(
  consonant: IPAToken,
  vowel: IPAToken,
): { f2Start: number; f2End: number; transMs: number } | null {
  if (consonant.features.type !== 'consonant' || !consonant.features.place) return null;
  if (vowel.features.type !== 'vowel') return null;

  const locus = F2_LOCI[consonant.features.place];
  const vowelF2 = vowel.formants.f2;

  // Velar locus is special — it moves toward the vowel F2
  let f2Start = locus.f2Locus;
  if (consonant.features.place === 'velar') {
    f2Start = vowelF2 > 1500 ? 2200 : 1800; // velar pinch effect
  }

  return {
    f2Start: f2Start * locus.strength + vowelF2 * (1 - locus.strength),
    f2End: vowelF2,
    transMs: locus.transMs,
  };
}

// ═══════════════════════════════════════════════════════════
// TOKENIZE: Convert IPA string array → token sequence
// ═══════════════════════════════════════════════════════════

export interface TokenSequence {
  tokens: IPAToken[];
  /** Binary encoding of the full sequence */
  binary: string;
  /** Diphone transitions between adjacent tokens */
  transitions: (DiphoneTransition | null)[];
}

/**
 * Convert an array of IPA symbols to a token sequence with
 * computed diphone transitions.
 */
export function tokenize(ipaSymbols: string[]): TokenSequence {
  const tokens: IPAToken[] = [];
  const transitions: (DiphoneTransition | null)[] = [];

  for (const sym of ipaSymbols) {
    const token = TOKEN_BY_IPA.get(sym);
    if (token) {
      tokens.push(token);
    } else {
      console.warn(`[IPATokenizer] Unknown symbol: "${sym}"`);
    }
  }

  // Compute diphone transitions
  for (let i = 0; i < tokens.length - 1; i++) {
    const curr = tokens[i];
    const next = tokens[i + 1];

    // C→V transition
    if (curr.features.type === 'consonant' && next.features.type === 'vowel') {
      const trans = getDiphoneTransition(curr, next);
      transitions.push(trans ? {
        f2Locus: trans.f2Start,
        transMs: trans.transMs,
        strength: 1,
      } : null);
    }
    // V→C transition (reverse locus approach)
    else if (curr.features.type === 'vowel' && next.features.type === 'consonant') {
      const trans = getDiphoneTransition(next, curr);
      transitions.push(trans ? {
        f2Locus: trans.f2Start,
        transMs: trans.transMs * 0.8, // Shorter VC transitions
        strength: 0.6,
      } : null);
    }
    else {
      transitions.push(null);
    }
  }

  // Build binary string
  const binary = tokens.map(t => t.binary).join(' ');

  return { tokens, binary, transitions };
}

/**
 * Pretty-print a token sequence for debugging.
 */
export function formatTokenSequence(seq: TokenSequence): string {
  const lines = seq.tokens.map((t, i) => {
    const feat = t.features;
    const type = feat.type === 'vowel'
      ? `${feat.height}/${feat.backness}${feat.rounded ? '/round' : ''}`
      : feat.type === 'consonant'
        ? `${feat.place}/${feat.manner}`
        : 'pause';
    const trans = seq.transitions[i];
    const transStr = trans ? ` →F2:${trans.f2Locus}Hz/${trans.transMs}ms` : '';
    return `  [${t.binary}] ${t.ipa.padEnd(3)} ${type.padEnd(28)} F1:${t.formants.f1} F2:${t.formants.f2}${transStr}`;
  });
  return `TokenSequence (${seq.tokens.length} tokens):\n${lines.join('\n')}\nBinary: ${seq.binary}`;
}
