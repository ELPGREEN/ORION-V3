# Project Memory

## Core
Industrial robotics project (tire production). ROSBridge + WebRTC + MQTT stack.
ROS2 Humble/Jazzy. Docker-based robot-side infra. Portuguese UI.
Supabase backend with RLS. User is expert in industrial robotics integration.
ALL LLM calls use FREE Gemini APIs only (7-key rotation, zero cost).
ALL voice/TTS uses FREE engines: Gemini TTS (Charon) → Fish Speech Clone → Piper WASM. NO ElevenLabs.

## Memories
- [Robotic stack](mem://features/robotic-stack) — ROSBridge client, WebRTC camera, tire line services, Docker infra
- [Jarvis TTS](mem://features/jarvis-tts) — JARVIS voice via HF Piper model, edge function, DSP post-processing, Home Assistant compatible
- [Orion HUB Space](mem://features/orion-hub-space) — ZeroGPU Gradio Space with TTS, LLM, OCR, Vision, Embeddings, PDF endpoints
- [Site reorganization](mem://design/site-reorganization) — 6 main pages, orphan redirects, pricing tiers, Home sections order
- [RAG embeddings](mem://features/rag-embeddings) — Gemini embedding-001 (768d) + HuggingFace fallback (384d→768d)
- [Welcome splash](mem://features/welcome-splash) — 5s video + Three.js welcome, profile redirect, onboarding
- [Google Cloud - Orion](mem://reference/google-cloud-orion) — GCP project #183568688847, Gemini API key active, AI Studio, GDP premium credits
- [Free Gemini only](mem://preference/free-gemini-only) — All LLM uses free Gemini models, no paid providers, 7-key rotation
- [Free voice system](mem://preference/free-voice-system) — Gemini TTS (Charon) primary, Fish Speech clone secondary, Piper WASM fallback
- [No ElevenLabs](mem://constraint/no-elevenlabs) — ElevenLabs forbidden: too expensive, all references removed
- [Formant TTS](mem://features/formant-tts) — Custom formant synth from scratch, Iapetus voice DNA (F0 124.2Hz), 40+ PT phonemes, 100% offline
