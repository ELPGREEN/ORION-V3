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

// ── IAPETUS VOICE DNA (from 77s+11s / 10 samples, recalibrated) ──
export const VOICE_DNA = {
  f0: { mean: 147.7, median: 123.6, std: 81.2, p5: 87.9, p95: 222.2 },
  glottal: {
    openQuotient: 0.546,
    speedQuotient: 2.21,
    h1H2Db: 4.6,
    harmonicDecay: 2.0,
  },
  // Per-harmonic amplitude profile (H1=1.0 reference) — recalibrated from iapetus-11
  harmonicProfile: [1.0, 0.49, 0.68, 0.36, 0.22, 0.14, 0.18, 0.15, 0.13, 0.14],
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
/**
 * Formant values from Escudero & Boersma (2009):
 * "A cross-dialect acoustic description of vowels: Brazilian and European Portuguese"
 * 10 male BP speakers, geometric means of F1/F2.
 * F3/F4 from Stevens (2000) proportions + Iapetus spectral match.
 */
export const PT_PHONEMES: Record<string, PhonemeParams> = {
  // ── ORAL VOWELS — Escudero & Boersma 2009 BP Male (Table I) ──
  'a':  { f1: 683, f2: 1329, f3: 2550, f4: 3400, bw1: 130, bw2: 80,  bw3: 140, bw4: 550, voiced: true, nasal: false, fricative: false, plosive: false, duration: 220, amplitude: 1.0 },
  'e':  { f1: 357, f2: 2028, f3: 2700, f4: 3700, bw1: 90,  bw2: 110, bw3: 190, bw4: 230, voiced: true, nasal: false, fricative: false, plosive: false, duration: 185, amplitude: 0.92 },
  'ɛ':  { f1: 518, f2: 1831, f3: 2650, f4: 3550, bw1: 200, bw2: 130, bw3: 260, bw4: 270, voiced: true, nasal: false, fricative: false, plosive: false, duration: 195, amplitude: 0.95 },
  'i':  { f1: 285, f2: 2198, f3: 2800, f4: 3700, bw1: 70,  bw2: 120, bw3: 300, bw4: 160, voiced: true, nasal: false, fricative: false, plosive: false, duration: 170, amplitude: 0.85 },
  'o':  { f1: 372, f2: 804,  f3: 2500, f4: 3600, bw1: 180, bw2: 170, bw3: 230, bw4: 230, voiced: true, nasal: false, fricative: false, plosive: false, duration: 195, amplitude: 0.93 },
  'ɔ':  { f1: 532, f2: 927,  f3: 2480, f4: 3500, bw1: 230, bw2: 110, bw3: 130, bw4: 240, voiced: true, nasal: false, fricative: false, plosive: false, duration: 195, amplitude: 0.94 },
  'u':  { f1: 310, f2: 761,  f3: 2450, f4: 3600, bw1: 170, bw2: 260, bw3: 200, bw4: 220, voiced: true, nasal: false, fricative: false, plosive: false, duration: 175, amplitude: 0.85 },

  // ── NASAL VOWELS (oral values shifted: F1 lowered ~5%, extra BW for nasal pole) ──
  'ã':  { f1: 640, f2: 1280, f3: 2530, f4: 3400, bw1: 190, bw2: 130, bw3: 190, bw4: 570, voiced: true, nasal: true, fricative: false, plosive: false, duration: 220, amplitude: 0.88 },
  'ẽ':  { f1: 340, f2: 1950, f3: 2690, f4: 3690, bw1: 150, bw2: 170, bw3: 240, bw4: 270, voiced: true, nasal: true, fricative: false, plosive: false, duration: 195, amplitude: 0.82 },
  'ĩ':  { f1: 270, f2: 2120, f3: 2780, f4: 3690, bw1: 130, bw2: 180, bw3: 350, bw4: 200, voiced: true, nasal: true, fricative: false, plosive: false, duration: 170, amplitude: 0.78 },
  'õ':  { f1: 355, f2: 780,  f3: 2480, f4: 3590, bw1: 230, bw2: 230, bw3: 280, bw4: 270, voiced: true, nasal: true, fricative: false, plosive: false, duration: 210, amplitude: 0.83 },
  'ũ':  { f1: 295, f2: 740,  f3: 2440, f4: 3590, bw1: 220, bw2: 310, bw3: 240, bw4: 260, voiced: true, nasal: true, fricative: false, plosive: false, duration: 185, amplitude: 0.78 },

  // ── PLOSIVES — longer burst + aspiration for perception ──
  'p':  { f1: 300, f2: 800,  f3: 2300, f4: 3200, bw1: 200, bw2: 200, bw3: 200, bw4: 250, voiced: false, nasal: false, fricative: false, plosive: true, duration: 45,  amplitude: 0.7 },
  'b':  { f1: 300, f2: 800,  f3: 2300, f4: 3200, bw1: 150, bw2: 150, bw3: 180, bw4: 220, voiced: true,  nasal: false, fricative: false, plosive: true, duration: 40,  amplitude: 0.7 },
  't':  { f1: 300, f2: 1700, f3: 2600, f4: 3500, bw1: 200, bw2: 200, bw3: 200, bw4: 250, voiced: false, nasal: false, fricative: false, plosive: true, duration: 45,  amplitude: 0.7 },
  'd':  { f1: 300, f2: 1700, f3: 2600, f4: 3500, bw1: 150, bw2: 150, bw3: 180, bw4: 220, voiced: true,  nasal: false, fricative: false, plosive: true, duration: 40,  amplitude: 0.7 },
  'k':  { f1: 300, f2: 1400, f3: 2500, f4: 3400, bw1: 200, bw2: 200, bw3: 200, bw4: 250, voiced: false, nasal: false, fricative: false, plosive: true, duration: 50,  amplitude: 0.7 },
  'g':  { f1: 300, f2: 1400, f3: 2500, f4: 3400, bw1: 150, bw2: 150, bw3: 180, bw4: 220, voiced: true,  nasal: false, fricative: false, plosive: true, duration: 45,  amplitude: 0.7 },

  // ── FRICATIVES — louder + longer for clarity ──
  'f':  { f1: 200, f2: 1300, f3: 2500, f4: 3500, bw1: 350, bw2: 350, bw3: 350, bw4: 400, voiced: false, nasal: false, fricative: true, plosive: false, duration: 140, amplitude: 0.5 },
  'v':  { f1: 220, f2: 1300, f3: 2500, f4: 3500, bw1: 280, bw2: 280, bw3: 280, bw4: 350, voiced: true,  nasal: false, fricative: true, plosive: false, duration: 120, amplitude: 0.6 },
  's':  { f1: 200, f2: 1800, f3: 4500, f4: 7000, bw1: 350, bw2: 350, bw3: 500, bw4: 600, voiced: false, nasal: false, fricative: true, plosive: false, duration: 155, amplitude: 0.6 },
  'z':  { f1: 220, f2: 1800, f3: 4500, f4: 7000, bw1: 300, bw2: 300, bw3: 450, bw4: 550, voiced: true,  nasal: false, fricative: true, plosive: false, duration: 125, amplitude: 0.65 },
  'ʃ':  { f1: 200, f2: 1600, f3: 3800, f4: 6000, bw1: 350, bw2: 350, bw3: 450, bw4: 550, voiced: false, nasal: false, fricative: true, plosive: false, duration: 155, amplitude: 0.6 },
  'ʒ':  { f1: 220, f2: 1600, f3: 3800, f4: 6000, bw1: 300, bw2: 300, bw3: 400, bw4: 500, voiced: true,  nasal: false, fricative: true, plosive: false, duration: 125, amplitude: 0.65 },
  'h':  { f1: 500, f2: 1500, f3: 2500, f4: 3500, bw1: 500, bw2: 500, bw3: 500, bw4: 500, voiced: false, nasal: false, fricative: true, plosive: false, duration: 90,  amplitude: 0.3 },
  'χ':  { f1: 300, f2: 1100, f3: 2400, f4: 3300, bw1: 400, bw2: 400, bw3: 400, bw4: 450, voiced: false, nasal: false, fricative: true, plosive: false, duration: 110, amplitude: 0.5 },

  // ── AFFRICATES (pt-BR: noite → [ˈnojt͡ʃi], cidade → [siˈdad͡ʒi]) ──
  't͡ʃ': { f1: 200, f2: 1700, f3: 3800, f4: 6000, bw1: 300, bw2: 300, bw3: 400, bw4: 500, voiced: false, nasal: false, fricative: true, plosive: true, duration: 90, amplitude: 0.65 },
  'd͡ʒ': { f1: 220, f2: 1700, f3: 3800, f4: 6000, bw1: 250, bw2: 250, bw3: 350, bw4: 450, voiced: true,  nasal: false, fricative: true, plosive: true, duration: 80, amplitude: 0.65 },

  // ── NASALS — extended for resonance ──
  'm':  { f1: 280, f2: 900,  f3: 2300, f4: 3200, bw1: 110, bw2: 140, bw3: 180, bw4: 250, voiced: true, nasal: true, fricative: false, plosive: false, duration: 110, amplitude: 0.78 },
  'n':  { f1: 280, f2: 1500, f3: 2500, f4: 3400, bw1: 110, bw2: 140, bw3: 180, bw4: 250, voiced: true, nasal: true, fricative: false, plosive: false, duration: 100, amplitude: 0.78 },
  'ɲ':  { f1: 280, f2: 1900, f3: 2700, f4: 3600, bw1: 110, bw2: 140, bw3: 180, bw4: 250, voiced: true, nasal: true, fricative: false, plosive: false, duration: 115, amplitude: 0.73 },

  // ── LIQUIDS ──
  'l':  { f1: 350, f2: 1100, f3: 2400, f4: 3300, bw1: 80,  bw2: 100, bw3: 160, bw4: 230, voiced: true, nasal: false, fricative: false, plosive: false, duration: 90, amplitude: 0.68 },
  'ʎ':  { f1: 320, f2: 1800, f3: 2600, f4: 3500, bw1: 80,  bw2: 100, bw3: 160, bw4: 230, voiced: true, nasal: false, fricative: false, plosive: false, duration: 95, amplitude: 0.68 },
  'ɾ':  { f1: 350, f2: 1300, f3: 2400, f4: 3300, bw1: 80,  bw2: 100, bw3: 160, bw4: 230, voiced: true, nasal: false, fricative: false, plosive: false, duration: 45, amplitude: 0.63 },
  'R':  { f1: 300, f2: 1100, f3: 2400, f4: 3300, bw1: 110, bw2: 140, bw3: 190, bw4: 260, voiced: true, nasal: false, fricative: true, plosive: false, duration: 110, amplitude: 0.58 },

  // ── SEMIVOWELS ──
  'w':  { f1: 340, f2: 700,  f3: 2400, f4: 3300, bw1: 70,  bw2: 90,  bw3: 155, bw4: 225, voiced: true, nasal: false, fricative: false, plosive: false, duration: 75, amplitude: 0.73 },
  'j':  { f1: 290, f2: 2100, f3: 2800, f4: 3700, bw1: 60,  bw2: 80,  bw3: 145, bw4: 215, voiced: true, nasal: false, fricative: false, plosive: false, duration: 75, amplitude: 0.73 },

  // ── PAUSES ──
  '_':  { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, bw4: 0, voiced: false, nasal: false, fricative: false, plosive: false, duration: 80,  amplitude: 0.0 },
  '.':  { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, bw4: 0, voiced: false, nasal: false, fricative: false, plosive: false, duration: 280, amplitude: 0.0 },
  ',':  { f1: 0, f2: 0, f3: 0, f4: 0, bw1: 0, bw2: 0, bw3: 0, bw4: 0, voiced: false, nasal: false, fricative: false, plosive: false, duration: 160, amplitude: 0.0 },
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
    if (di === 'rr') { phonemes.push('χ'); i += 2; continue; }
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
      case 'd':
        // pt-BR palatalization: d before i/e → d͡ʒ
        if (next === 'i' || next === 'í' || (next === 'e' && (!next2 || ' .,'.includes(next2)))) {
          phonemes.push('d͡ʒ');
        } else {
          phonemes.push('d');
        }
        break;
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
          phonemes.push('χ'); // uvular fricative (carro, rato) — standard pt-BR
        else phonemes.push('ɾ'); // alveolar tap (caro, para)
        break;
      case 's':
        if (vowels.includes(next) && vowels.includes(prev)) phonemes.push('z');
        else phonemes.push('s');
        break;
      case 't':
        // pt-BR palatalization: t before i/e → t͡ʃ
        if (next === 'i' || next === 'í' || (next === 'e' && (!next2 || ' .,'.includes(next2)))) {
          phonemes.push('t͡ʃ');
        } else {
          phonemes.push('t');
        }
        break;
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
