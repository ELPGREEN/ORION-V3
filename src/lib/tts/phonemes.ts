/**
 * Portuguese Phoneme Table for Formant Synthesis
 * 
 * Each phoneme has formant frequencies (F1-F4), bandwidths, duration,
 * and voicing characteristics tuned to the Iapetus voice signature.
 * 
 * F0 base: 124.2 Hz (baritone)
 */

export interface PhonemeParams {
  f1: number;       // First formant Hz
  f2: number;       // Second formant Hz
  f3: number;       // Third formant Hz
  f4: number;       // Fourth formant Hz
  bw1: number;      // F1 bandwidth
  bw2: number;      // F2 bandwidth
  bw3: number;      // F3 bandwidth
  voiced: boolean;  // Uses glottal source
  nasal: boolean;   // Nasal resonance
  fricative: boolean;
  duration: number; // ms base duration
  amplitude: number; // 0-1 relative amplitude
}

// Iapetus voice characteristics
export const IAPETUS_F0 = 124.2;
export const IAPETUS_F0_STD = 16.8;
export const IAPETUS_F0_RANGE = { min: 99.7, max: 154.8 };
export const IAPETUS_JITTER = 0.059;
export const IAPETUS_SPECTRAL_TILT = 34.7;

/**
 * Brazilian Portuguese phoneme inventory
 * Formant values calibrated for Iapetus masculine baritone voice
 */
export const PT_PHONEMES: Record<string, PhonemeParams> = {
  // ── VOWELS ──
  'a':  { f1: 750, f2: 1200, f3: 2600, f4: 3500, bw1: 80, bw2: 100, bw3: 150, voiced: true, nasal: false, fricative: false, duration: 100, amplitude: 1.0 },
  'e':  { f1: 450, f2: 1800, f3: 2700, f4: 3600, bw1: 70, bw2: 90, bw3: 140, voiced: true, nasal: false, fricative: false, duration: 90, amplitude: 0.95 },
  'ɛ':  { f1: 600, f2: 1750, f3: 2650, f4: 3500, bw1: 80, bw2: 100, bw3: 150, voiced: true, nasal: false, fricative: false, duration: 95, amplitude: 0.95 },
  'i':  { f1: 300, f2: 2200, f3: 2900, f4: 3800, bw1: 60, bw2: 80, bw3: 130, voiced: true, nasal: false, fricative: false, duration: 80, amplitude: 0.85 },
  'o':  { f1: 500, f2: 900,  f3: 2500, f4: 3400, bw1: 70, bw2: 90, bw3: 140, voiced: true, nasal: false, fricative: false, duration: 95, amplitude: 0.95 },
  'ɔ':  { f1: 600, f2: 1000, f3: 2550, f4: 3450, bw1: 80, bw2: 100, bw3: 150, voiced: true, nasal: false, fricative: false, duration: 95, amplitude: 0.95 },
  'u':  { f1: 350, f2: 700,  f3: 2400, f4: 3300, bw1: 60, bw2: 80, bw3: 130, voiced: true, nasal: false, fricative: false, duration: 85, amplitude: 0.85 },

  // ── NASAL VOWELS ──
  'ã':  { f1: 700, f2: 1200, f3: 2500, f4: 3400, bw1: 120, bw2: 140, bw3: 180, voiced: true, nasal: true, fricative: false, duration: 110, amplitude: 0.9 },
  'ẽ':  { f1: 420, f2: 1750, f3: 2650, f4: 3550, bw1: 110, bw2: 130, bw3: 170, voiced: true, nasal: true, fricative: false, duration: 100, amplitude: 0.85 },
  'ĩ':  { f1: 280, f2: 2150, f3: 2850, f4: 3750, bw1: 100, bw2: 120, bw3: 160, voiced: true, nasal: true, fricative: false, duration: 90, amplitude: 0.8 },
  'õ':  { f1: 480, f2: 880,  f3: 2450, f4: 3350, bw1: 110, bw2: 130, bw3: 170, voiced: true, nasal: true, fricative: false, duration: 105, amplitude: 0.85 },
  'ũ':  { f1: 330, f2: 680,  f3: 2350, f4: 3250, bw1: 100, bw2: 120, bw3: 160, voiced: true, nasal: true, fricative: false, duration: 95, amplitude: 0.8 },

  // ── PLOSIVES ──
  'p':  { f1: 200, f2: 800,  f3: 2300, f4: 3200, bw1: 200, bw2: 200, bw3: 200, voiced: false, nasal: false, fricative: false, duration: 15, amplitude: 0.0 },
  'b':  { f1: 200, f2: 800,  f3: 2300, f4: 3200, bw1: 200, bw2: 200, bw3: 200, voiced: true,  nasal: false, fricative: false, duration: 15, amplitude: 0.3 },
  't':  { f1: 200, f2: 1600, f3: 2600, f4: 3500, bw1: 200, bw2: 200, bw3: 200, voiced: false, nasal: false, fricative: false, duration: 15, amplitude: 0.0 },
  'd':  { f1: 200, f2: 1600, f3: 2600, f4: 3500, bw1: 200, bw2: 200, bw3: 200, voiced: true,  nasal: false, fricative: false, duration: 15, amplitude: 0.3 },
  'k':  { f1: 200, f2: 1400, f3: 2500, f4: 3400, bw1: 200, bw2: 200, bw3: 200, voiced: false, nasal: false, fricative: false, duration: 15, amplitude: 0.0 },
  'g':  { f1: 200, f2: 1400, f3: 2500, f4: 3400, bw1: 200, bw2: 200, bw3: 200, voiced: true,  nasal: false, fricative: false, duration: 15, amplitude: 0.3 },

  // ── FRICATIVES ──
  'f':  { f1: 200, f2: 1300, f3: 2500, f4: 3500, bw1: 300, bw2: 300, bw3: 300, voiced: false, nasal: false, fricative: true, duration: 80, amplitude: 0.4 },
  'v':  { f1: 220, f2: 1300, f3: 2500, f4: 3500, bw1: 250, bw2: 250, bw3: 250, voiced: true,  nasal: false, fricative: true, duration: 70, amplitude: 0.5 },
  's':  { f1: 200, f2: 1800, f3: 4000, f4: 6000, bw1: 300, bw2: 300, bw3: 400, voiced: false, nasal: false, fricative: true, duration: 90, amplitude: 0.5 },
  'z':  { f1: 220, f2: 1800, f3: 4000, f4: 6000, bw1: 250, bw2: 250, bw3: 350, voiced: true,  nasal: false, fricative: true, duration: 75, amplitude: 0.55 },
  'ʃ':  { f1: 200, f2: 1600, f3: 3500, f4: 5500, bw1: 300, bw2: 300, bw3: 400, voiced: false, nasal: false, fricative: true, duration: 90, amplitude: 0.5 },
  'ʒ':  { f1: 220, f2: 1600, f3: 3500, f4: 5500, bw1: 250, bw2: 250, bw3: 350, voiced: true,  nasal: false, fricative: true, duration: 75, amplitude: 0.55 },
  'h':  { f1: 500, f2: 1500, f3: 2500, f4: 3500, bw1: 400, bw2: 400, bw3: 400, voiced: false, nasal: false, fricative: true, duration: 60, amplitude: 0.25 },

  // ── NASALS ──
  'm':  { f1: 280, f2: 900,  f3: 2300, f4: 3200, bw1: 100, bw2: 120, bw3: 160, voiced: true, nasal: true, fricative: false, duration: 70, amplitude: 0.8 },
  'n':  { f1: 280, f2: 1500, f3: 2500, f4: 3400, bw1: 100, bw2: 120, bw3: 160, voiced: true, nasal: true, fricative: false, duration: 65, amplitude: 0.8 },
  'ɲ':  { f1: 280, f2: 1900, f3: 2700, f4: 3600, bw1: 100, bw2: 120, bw3: 160, voiced: true, nasal: true, fricative: false, duration: 75, amplitude: 0.75 },

  // ── LIQUIDS ──
  'l':  { f1: 350, f2: 1100, f3: 2400, f4: 3300, bw1: 80, bw2: 100, bw3: 140, voiced: true, nasal: false, fricative: false, duration: 60, amplitude: 0.7 },
  'ʎ':  { f1: 320, f2: 1800, f3: 2600, f4: 3500, bw1: 80, bw2: 100, bw3: 140, voiced: true, nasal: false, fricative: false, duration: 65, amplitude: 0.7 },
  'ɾ':  { f1: 350, f2: 1300, f3: 2400, f4: 3300, bw1: 80, bw2: 100, bw3: 140, voiced: true, nasal: false, fricative: false, duration: 30, amplitude: 0.65 },
  'R':  { f1: 300, f2: 1100, f3: 2400, f4: 3300, bw1: 100, bw2: 130, bw3: 170, voiced: true, nasal: false, fricative: true, duration: 70, amplitude: 0.6 },

  // ── SEMIVOWELS ──
  'w':  { f1: 350, f2: 700,  f3: 2400, f4: 3300, bw1: 70, bw2: 90, bw3: 130, voiced: true, nasal: false, fricative: false, duration: 50, amplitude: 0.75 },
  'j':  { f1: 300, f2: 2100, f3: 2800, f4: 3700, bw1: 60, bw2: 80, bw3: 120, voiced: true, nasal: false, fricative: false, duration: 50, amplitude: 0.75 },

  // ── SPECIAL ──
  '_':  { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, voiced: false, nasal: false, fricative: false, duration: 80, amplitude: 0.0 },  // silence/pause
  '.':  { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, voiced: false, nasal: false, fricative: false, duration: 200, amplitude: 0.0 }, // sentence pause
  ',':  { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, voiced: false, nasal: false, fricative: false, duration: 120, amplitude: 0.0 }, // comma pause
};

/**
 * Text-to-Phoneme converter for Brazilian Portuguese
 * Simplified rule-based G2P (Grapheme-to-Phoneme)
 */
export function textToPhonemes(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[!?;:]/g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  const phonemes: string[] = [];
  let i = 0;

  while (i < normalized.length) {
    const c = normalized[i];
    const next = normalized[i + 1] || '';
    const prev = normalized[i - 1] || '';

    // Punctuation
    if (c === '.') { phonemes.push('.'); i++; continue; }
    if (c === ',') { phonemes.push(','); i++; continue; }
    if (c === ' ') { phonemes.push('_'); i++; continue; }

    // Digraphs first
    const digraph = c + next;

    if (digraph === 'ch') { phonemes.push('ʃ'); i += 2; continue; }
    if (digraph === 'lh') { phonemes.push('ʎ'); i += 2; continue; }
    if (digraph === 'nh') { phonemes.push('ɲ'); i += 2; continue; }
    if (digraph === 'rr') { phonemes.push('R'); i += 2; continue; }
    if (digraph === 'ss') { phonemes.push('s'); i += 2; continue; }
    if (digraph === 'qu') { phonemes.push('k'); i += 2; continue; }
    if (digraph === 'gu' && 'ei'.includes(normalized[i + 2] || '')) { phonemes.push('g'); i += 2; continue; }

    // Single characters
    switch (c) {
      case 'a': phonemes.push('a'); break;
      case 'á': phonemes.push('a'); break;
      case 'â': phonemes.push('ã'); break;
      case 'ã': phonemes.push('ã'); break;
      case 'b': phonemes.push('b'); break;
      case 'c':
        if ('ei'.includes(next)) phonemes.push('s');
        else phonemes.push('k');
        break;
      case 'ç': phonemes.push('s'); break;
      case 'd':
        if (next === 'i' || (next === 'e' && !normalized[i + 2])) {
          phonemes.push('d'); // Could be dʒ in some dialects
        } else {
          phonemes.push('d');
        }
        break;
      case 'e':
        if (!next || next === ' ' || next === '.' || next === ',') {
          phonemes.push('i'); // Final 'e' → /i/ in BR-PT
        } else {
          phonemes.push('e');
        }
        break;
      case 'é': phonemes.push('ɛ'); break;
      case 'ê': phonemes.push('e'); break;
      case 'f': phonemes.push('f'); break;
      case 'g':
        if ('ei'.includes(next)) phonemes.push('ʒ');
        else phonemes.push('g');
        break;
      case 'h': break; // Silent in Portuguese
      case 'i': phonemes.push('i'); break;
      case 'í': phonemes.push('i'); break;
      case 'j': phonemes.push('ʒ'); break;
      case 'k': phonemes.push('k'); break;
      case 'l':
        if (!next || next === ' ' || next === '.' || next === ',') {
          phonemes.push('w'); // Final 'l' → /w/ in BR-PT
        } else {
          phonemes.push('l');
        }
        break;
      case 'm':
        if (!next || next === ' ' || next === '.' || next === ',') {
          // Nasalizes previous vowel
          if (phonemes.length > 0) {
            const lastP = phonemes[phonemes.length - 1];
            const nasalMap: Record<string, string> = { 'a': 'ã', 'e': 'ẽ', 'i': 'ĩ', 'o': 'õ', 'u': 'ũ' };
            if (nasalMap[lastP]) phonemes[phonemes.length - 1] = nasalMap[lastP];
          }
        } else {
          phonemes.push('m');
        }
        break;
      case 'n':
        if (!next || next === ' ' || next === '.' || next === ',') {
          if (phonemes.length > 0) {
            const lastP = phonemes[phonemes.length - 1];
            const nasalMap: Record<string, string> = { 'a': 'ã', 'e': 'ẽ', 'i': 'ĩ', 'o': 'õ', 'u': 'ũ' };
            if (nasalMap[lastP]) phonemes[phonemes.length - 1] = nasalMap[lastP];
          }
        } else {
          phonemes.push('n');
        }
        break;
      case 'o':
        if (!next || next === ' ' || next === '.' || next === ',') {
          phonemes.push('u'); // Final 'o' → /u/ in BR-PT
        } else {
          phonemes.push('o');
        }
        break;
      case 'ó': phonemes.push('ɔ'); break;
      case 'ô': phonemes.push('o'); break;
      case 'õ': phonemes.push('õ'); break;
      case 'p': phonemes.push('p'); break;
      case 'r':
        if (i === 0 || prev === ' ' || prev === 'n' || prev === 'l') {
          phonemes.push('R'); // Initial/post-consonant R → uvular
        } else {
          phonemes.push('ɾ'); // Intervocalic → tap
        }
        break;
      case 's':
        if (next && 'aeiouáéíóúãõâê'.includes(next) && prev && 'aeiouáéíóúãõâê'.includes(prev)) {
          phonemes.push('z'); // Intervocalic s → /z/
        } else {
          phonemes.push('s');
        }
        break;
      case 't':
        if (next === 'i' || (next === 'e' && !normalized[i + 2])) {
          phonemes.push('t'); // Could be tʃ in some dialects
        } else {
          phonemes.push('t');
        }
        break;
      case 'u': phonemes.push('u'); break;
      case 'ú': phonemes.push('u'); break;
      case 'v': phonemes.push('v'); break;
      case 'w': phonemes.push('w'); break;
      case 'x':
        phonemes.push('ʃ'); // Simplified — x has multiple sounds in PT
        break;
      case 'y': phonemes.push('i'); break;
      case 'z':
        if (!next || next === ' ' || next === '.' || next === ',') {
          phonemes.push('s'); // Final z → /s/
        } else {
          phonemes.push('z');
        }
        break;
      default:
        break;
    }
    i++;
  }

  return phonemes;
}
