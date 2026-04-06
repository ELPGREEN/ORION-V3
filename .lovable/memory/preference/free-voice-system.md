---
name: Orion independent voice system
description: Orion uses ONLY its own formant synthesizer. No HuggingFace, Gemini, Piper, or external TTS.
type: preference
---
## Orion Voice System — 100% Independent

Orion speaks with its OWN formant synthesis engine. No external APIs.

### Architecture (simplified)
1. Cache (IndexedDB) → instant
2. Formant Synthesis (Iapetus DNA) → ~50ms, offline

### NO external dependencies
- ❌ HuggingFace TTS
- ❌ Gemini TTS
- ❌ Piper WASM
- ❌ Any cloud API for voice

### Voice DNA (from 55s / 7 samples)
- F0: 125.7 Hz median (103-169 Hz range)
- Glottal: OQ=0.533, SQ=2.16, H1-H2=3.3dB
- Harmonic decay: 3.9 dB/harmonic
- Spectral tilt: 29.9 dB
- Jitter: 2.82%, Shimmer: 20.24%

### Files
- `src/lib/tts/formantSynth.ts` — IIR formant synth with LF glottal model
- `src/lib/tts/phonemes.ts` — 40+ BR-PT phonemes + G2P
- `src/lib/tts/orionVoiceEngine.ts` — Cache + Formant only
- `public/audio/voice-dna.json` — Extracted voice fingerprint
