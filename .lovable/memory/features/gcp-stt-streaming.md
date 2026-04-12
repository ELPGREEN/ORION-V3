---
name: Groq Whisper replaced by Google Cloud STT
description: Google Cloud Speech-to-Text streaming via edge function google-stt as primary STT, Web Speech API as fallback
type: feature
---
## Google Cloud STT Streaming

- Edge function: `google-stt` (uses GCP_SA_KEY service account)
- Client: `src/lib/voice/gcpSTT.ts` — captures mic → LINEAR16 chunks → sends every 2.5s
- Primary STT for Orion, Web Speech API as automatic fallback
- Model: `latest_long` with enhanced mode, auto punctuation
- Speech contexts: Orion, Iapetus, ELP, robótica, AGV, pneu, esteira
- Supports barge-in, echo guard, duplicate suppression
- Integrated in `useNeuralVoice.ts` — seamless fallback if GCP fails
