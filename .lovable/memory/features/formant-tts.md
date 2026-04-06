---
name: Orion Formant TTS Engine
description: Custom formant synthesizer from scratch using Iapetus voice DNA (F0 124.2Hz, spectral tilt 34.7dB, jitter 5.9%)
type: feature
---
## Orion Formant Speech Synthesizer

100% client-side, zero API, zero dependencies. Uses Web Audio API.

### Architecture
1. `src/lib/tts/phonemes.ts` — Portuguese phoneme table (40+ phonemes) + rule-based G2P
2. `src/lib/tts/formantSynth.ts` — Formant synthesis engine with LF glottal model
3. Voice DNA from `public/audio/voice-dna.json`

### Voice Parameters (from 5 samples)
- F0: 124.2 Hz (baritone), std: 16.8 Hz, range: 99.7-154.8 Hz
- Jitter: 5.9% (natural variation)
- Spectral tilt: 34.7 dB (warm, low-emphasis)
- Formants: F1=1615, F2=3421, F3=5826, F4=8485 Hz

### Cascade Position
Cache → HuggingFace+DSP → Gemini+DSP → **Formant Iapetus** → Piper WASM
