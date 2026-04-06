/**
 * Portuguese Phoneme Table for Formant Synthesis v2
 * 
 * Calibrated from 44s of Iapetus voice samples (6 recordings).
 * Voice DNA: F0=125.7Hz, OQ=0.53, SQ=2.16, H1-H2=3.3dB
 */

export interface PhonemeParams {
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  bw1: number;
  bw2: number;
  bw3: number;
  bw4: number;
  voiced: boolean;
  nasal: boolean;
  fricative: boolean;
  plosive: boolean;
  duration: number;   // ms
  amplitude: number;  // 0-1
}

// ── IAPETUS VOICE DNA (from 77s / 9 samples) ──
export const VOICE_DNA = {
  f0: { mean: 137.8, median: 124.4, std: 43.2, p5: 87.9, p95: 222.2 },
  glottal: {
    openQuotient: 0.546,
    speedQuotient: 2.21,
    h1H2Db: 4.6,
    harmonicDecay: 2.0,
  },
  // Per-harmonic amplitude profile (H1=1.0 reference) — 10 harmonics from 77s
  harmonicProfile: [1.0, 0.5897, 0.6334, 0.4201, 0.1657, 0.1288, 0.1073, 0.0994, 0.0998, 0.0945],
  dynamics: {
    spectralTilt: 26.3,
    jitter: 0.0882,
    shimmer: 0.3687,
  },
  sampleRate: 24000,
};

/**
 * Brazilian Portuguese phonemes with formant values
 * F1/F2 values are standard for male BR-PT speakers,
 * F3/F4 adjusted to Iapetus spectral characteristics
 */
export const PT_PHONEMES: Record<string, PhonemeParams> = {
  // ── ORAL VOWELS (durations +40% for PT-BR intelligibility) ──
  'a':  { f1: 730, f2: 1200, f3: 2600, f4: 3500, bw1: 90, bw2: 110, bw3: 170, bw4: 250, voiced: true, nasal: false, fricative: false, plosive: false, duration: 155, amplitude: 1.0 },
  'e':  { f1: 440, f2: 1800, f3: 2700, f4: 3600, bw1: 70, bw2: 90,  bw3: 160, bw4: 230, voiced: true, nasal: false, fricative: false, plosive: false, duration: 125, amplitude: 0.92 },
  'ɛ':  { f1: 580, f2: 1750, f3: 2650, f4: 3550, bw1: 80, bw2: 100, bw3: 165, bw4: 240, voiced: true, nasal: false, fricative: false, plosive: false, duration: 135, amplitude: 0.95 },
  'i':  { f1: 280, f2: 2250, f3: 2950, f4: 3800, bw1: 55, bw2: 80,  bw3: 150, bw4: 220, voiced: true, nasal: false, fricative: false, plosive: false, duration: 115, amplitude: 0.82 },
  'o':  { f1: 480, f2: 850,  f3: 2500, f4: 3400, bw1: 75, bw2: 95,  bw3: 160, bw4: 230, voiced: true, nasal: false, fricative: false, plosive: false, duration: 135, amplitude: 0.93 },
  'ɔ':  { f1: 590, f2: 950,  f3: 2550, f4: 3450, bw1: 80, bw2: 100, bw3: 165, bw4: 240, voiced: true, nasal: false, fricative: false, plosive: false, duration: 135, amplitude: 0.94 },
  'u':  { f1: 320, f2: 700,  f3: 2400, f4: 3300, bw1: 60, bw2: 80,  bw3: 155, bw4: 225, voiced: true, nasal: false, fricative: false, plosive: false, duration: 120, amplitude: 0.83 },

  // ── NASAL VOWELS (durations +30%) ──
  'ã':  { f1: 680, f2: 1180, f3: 2500, f4: 3400, bw1: 130, bw2: 160, bw3: 200, bw4: 280, voiced: true, nasal: true, fricative: false, plosive: false, duration: 155, amplitude: 0.88 },
  'ẽ':  { f1: 410, f2: 1720, f3: 2650, f4: 3550, bw1: 120, bw2: 150, bw3: 190, bw4: 270, voiced: true, nasal: true, fricative: false, plosive: false, duration: 135, amplitude: 0.82 },
  'ĩ':  { f1: 260, f2: 2180, f3: 2900, f4: 3750, bw1: 110, bw2: 140, bw3: 185, bw4: 260, voiced: true, nasal: true, fricative: false, plosive: false, duration: 115, amplitude: 0.78 },
  'õ':  { f1: 460, f2: 830,  f3: 2450, f4: 3350, bw1: 125, bw2: 155, bw3: 195, bw4: 275, voiced: true, nasal: true, fricative: false, plosive: false, duration: 145, amplitude: 0.83 },
  'ũ':  { f1: 300, f2: 680,  f3: 2350, f4: 3250, bw1: 115, bw2: 145, bw3: 185, bw4: 265, voiced: true, nasal: true, fricative: false, plosive: false, duration: 125, amplitude: 0.78 },

  // ── PLOSIVES (duration = burst only, aspiration added in synth) ──
  'p':  { f1: 300, f2: 800,  f3: 2300, f4: 3200, bw1: 200, bw2: 200, bw3: 200, bw4: 250, voiced: false, nasal: false, fricative: false, plosive: true, duration: 25,  amplitude: 0.55 },
  'b':  { f1: 300, f2: 800,  f3: 2300, f4: 3200, bw1: 150, bw2: 150, bw3: 180, bw4: 220, voiced: true,  nasal: false, fricative: false, plosive: true, duration: 25,  amplitude: 0.55 },
  't':  { f1: 300, f2: 1700, f3: 2600, f4: 3500, bw1: 200, bw2: 200, bw3: 200, bw4: 250, voiced: false, nasal: false, fricative: false, plosive: true, duration: 25,  amplitude: 0.55 },
  'd':  { f1: 300, f2: 1700, f3: 2600, f4: 3500, bw1: 150, bw2: 150, bw3: 180, bw4: 220, voiced: true,  nasal: false, fricative: false, plosive: true, duration: 25,  amplitude: 0.55 },
  'k':  { f1: 300, f2: 1400, f3: 2500, f4: 3400, bw1: 200, bw2: 200, bw3: 200, bw4: 250, voiced: false, nasal: false, fricative: false, plosive: true, duration: 30,  amplitude: 0.55 },
  'g':  { f1: 300, f2: 1400, f3: 2500, f4: 3400, bw1: 150, bw2: 150, bw3: 180, bw4: 220, voiced: true,  nasal: false, fricative: false, plosive: true, duration: 30,  amplitude: 0.55 },

  // ── FRICATIVES (durations +20%) ──
  'f':  { f1: 200, f2: 1300, f3: 2500, f4: 3500, bw1: 350, bw2: 350, bw3: 350, bw4: 400, voiced: false, nasal: false, fricative: true, plosive: false, duration: 100, amplitude: 0.35 },
  'v':  { f1: 220, f2: 1300, f3: 2500, f4: 3500, bw1: 280, bw2: 280, bw3: 280, bw4: 350, voiced: true,  nasal: false, fricative: true, plosive: false, duration: 85,  amplitude: 0.45 },
  's':  { f1: 200, f2: 1800, f3: 4500, f4: 7000, bw1: 350, bw2: 350, bw3: 500, bw4: 600, voiced: false, nasal: false, fricative: true, plosive: false, duration: 115, amplitude: 0.45 },
  'z':  { f1: 220, f2: 1800, f3: 4500, f4: 7000, bw1: 300, bw2: 300, bw3: 450, bw4: 550, voiced: true,  nasal: false, fricative: true, plosive: false, duration: 90,  amplitude: 0.5  },
  'ʃ':  { f1: 200, f2: 1600, f3: 3800, f4: 6000, bw1: 350, bw2: 350, bw3: 450, bw4: 550, voiced: false, nasal: false, fricative: true, plosive: false, duration: 115, amplitude: 0.45 },
  'ʒ':  { f1: 220, f2: 1600, f3: 3800, f4: 6000, bw1: 300, bw2: 300, bw3: 400, bw4: 500, voiced: true,  nasal: false, fricative: true, plosive: false, duration: 90,  amplitude: 0.5  },
  'h':  { f1: 500, f2: 1500, f3: 2500, f4: 3500, bw1: 500, bw2: 500, bw3: 500, bw4: 500, voiced: false, nasal: false, fricative: true, plosive: false, duration: 65,  amplitude: 0.2  },

  // ── NASALS ──
  'm':  { f1: 280, f2: 900,  f3: 2300, f4: 3200, bw1: 110, bw2: 140, bw3: 180, bw4: 250, voiced: true, nasal: true, fricative: false, plosive: false, duration: 75, amplitude: 0.75 },
  'n':  { f1: 280, f2: 1500, f3: 2500, f4: 3400, bw1: 110, bw2: 140, bw3: 180, bw4: 250, voiced: true, nasal: true, fricative: false, plosive: false, duration: 70, amplitude: 0.75 },
  'ɲ':  { f1: 280, f2: 1900, f3: 2700, f4: 3600, bw1: 110, bw2: 140, bw3: 180, bw4: 250, voiced: true, nasal: true, fricative: false, plosive: false, duration: 80, amplitude: 0.7  },

  // ── LIQUIDS ──
  'l':  { f1: 350, f2: 1100, f3: 2400, f4: 3300, bw1: 80,  bw2: 100, bw3: 160, bw4: 230, voiced: true, nasal: false, fricative: false, plosive: false, duration: 60, amplitude: 0.65 },
  'ʎ':  { f1: 320, f2: 1800, f3: 2600, f4: 3500, bw1: 80,  bw2: 100, bw3: 160, bw4: 230, voiced: true, nasal: false, fricative: false, plosive: false, duration: 65, amplitude: 0.65 },
  'ɾ':  { f1: 350, f2: 1300, f3: 2400, f4: 3300, bw1: 80,  bw2: 100, bw3: 160, bw4: 230, voiced: true, nasal: false, fricative: false, plosive: false, duration: 28, amplitude: 0.6  },
  'R':  { f1: 300, f2: 1100, f3: 2400, f4: 3300, bw1: 110, bw2: 140, bw3: 190, bw4: 260, voiced: true, nasal: false, fricative: true, plosive: false, duration: 75, amplitude: 0.55 },

  // ── SEMIVOWELS ──
  'w':  { f1: 340, f2: 700,  f3: 2400, f4: 3300, bw1: 70,  bw2: 90,  bw3: 155, bw4: 225, voiced: true, nasal: false, fricative: false, plosive: false, duration: 50, amplitude: 0.7  },
  'j':  { f1: 290, f2: 2100, f3: 2800, f4: 3700, bw1: 60,  bw2: 80,  bw3: 145, bw4: 215, voiced: true, nasal: false, fricative: false, plosive: false, duration: 50, amplitude: 0.7  },

  // ── PAUSES ──
  '_':  { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, bw4: 0, voiced: false, nasal: false, fricative: false, plosive: false, duration: 70,  amplitude: 0.0 },
  '.':  { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, bw4: 0, voiced: false, nasal: false, fricative: false, plosive: false, duration: 220, amplitude: 0.0 },
  ',':  { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, bw4: 0, voiced: false, nasal: false, fricative: false, plosive: false, duration: 130, amplitude: 0.0 },
};

/**
 * Brazilian Portuguese Grapheme-to-Phoneme converter
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
  const vowels = 'aeiouáéíóúãõâêàü';

  while (i < normalized.length) {
    const c = normalized[i];
    const next = normalized[i + 1] || '';
    const prev = normalized[i - 1] || '';
    const next2 = normalized[i + 2] || '';

    if (c === '.') { phonemes.push('.'); i++; continue; }
    if (c === ',') { phonemes.push(','); i++; continue; }
    if (c === ' ') { phonemes.push('_'); i++; continue; }

    // Digraphs
    const di = c + next;
    if (di === 'ch') { phonemes.push('ʃ'); i += 2; continue; }
    if (di === 'lh') { phonemes.push('ʎ'); i += 2; continue; }
    if (di === 'nh') { phonemes.push('ɲ'); i += 2; continue; }
    if (di === 'rr') { phonemes.push('R'); i += 2; continue; }
    if (di === 'ss') { phonemes.push('s'); i += 2; continue; }
    if (di === 'qu') { phonemes.push('k'); i += 2; continue; }
    if (di === 'gu' && 'ei'.includes(next2)) { phonemes.push('g'); i += 2; continue; }
    if (di === 'ou') { phonemes.push('o'); phonemes.push('w'); i += 2; continue; }
    if (di === 'ei') { phonemes.push('e'); phonemes.push('j'); i += 2; continue; }
    if (di === 'ai') { phonemes.push('a'); phonemes.push('j'); i += 2; continue; }
    if (di === 'ão') { phonemes.push('ã'); phonemes.push('w'); i += 2; continue; }
    if (di === 'õe') { phonemes.push('õ'); phonemes.push('j'); i += 2; continue; }

    switch (c) {
      case 'a': case 'á': case 'à': phonemes.push('a'); break;
      case 'â': case 'ã': phonemes.push('ã'); break;
      case 'b': phonemes.push('b'); break;
      case 'c':
        if ('ei'.includes(next)) phonemes.push('s');
        else phonemes.push('k');
        break;
      case 'ç': phonemes.push('s'); break;
      case 'd': phonemes.push('d'); break;
      case 'e':
        if (!next || ' .,'.includes(next)) phonemes.push('i');
        else phonemes.push('e');
        break;
      case 'é': phonemes.push('ɛ'); break;
      case 'ê': phonemes.push('e'); break;
      case 'f': phonemes.push('f'); break;
      case 'g':
        if ('ei'.includes(next)) phonemes.push('ʒ');
        else phonemes.push('g');
        break;
      case 'h': break;
      case 'i': case 'í': phonemes.push('i'); break;
      case 'j': phonemes.push('ʒ'); break;
      case 'k': phonemes.push('k'); break;
      case 'l':
        if (!next || ' .,'.includes(next)) phonemes.push('w');
        else phonemes.push('l');
        break;
      case 'm':
        if (!next || ' .,'.includes(next)) {
          const last = phonemes[phonemes.length - 1];
          const nasalMap: Record<string, string> = { 'a':'ã', 'e':'ẽ', 'i':'ĩ', 'o':'õ', 'u':'ũ' };
          if (last && nasalMap[last]) phonemes[phonemes.length - 1] = nasalMap[last];
          else phonemes.push('m');
        } else phonemes.push('m');
        break;
      case 'n':
        if (!next || ' .,'.includes(next)) {
          const last = phonemes[phonemes.length - 1];
          const nasalMap: Record<string, string> = { 'a':'ã', 'e':'ẽ', 'i':'ĩ', 'o':'õ', 'u':'ũ' };
          if (last && nasalMap[last]) phonemes[phonemes.length - 1] = nasalMap[last];
          else phonemes.push('n');
        } else phonemes.push('n');
        break;
      case 'o':
        if (!next || ' .,'.includes(next)) phonemes.push('u');
        else phonemes.push('o');
        break;
      case 'ó': phonemes.push('ɔ'); break;
      case 'ô': phonemes.push('o'); break;
      case 'õ': phonemes.push('õ'); break;
      case 'p': phonemes.push('p'); break;
      case 'r':
        if (i === 0 || prev === ' ' || prev === 'n' || prev === 'l' || prev === 's')
          phonemes.push('R');
        else phonemes.push('ɾ');
        break;
      case 's':
        if (vowels.includes(next) && vowels.includes(prev)) phonemes.push('z');
        else phonemes.push('s');
        break;
      case 't': phonemes.push('t'); break;
      case 'u': case 'ú': case 'ü': phonemes.push('u'); break;
      case 'v': phonemes.push('v'); break;
      case 'w': phonemes.push('w'); break;
      case 'x': phonemes.push('ʃ'); break;
      case 'y': phonemes.push('i'); break;
      case 'z':
        if (!next || ' .,'.includes(next)) phonemes.push('s');
        else phonemes.push('z');
        break;
      default: break;
    }
    i++;
  }

  return phonemes;
}
