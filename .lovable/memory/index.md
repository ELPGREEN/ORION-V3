# Project Memory

## Core
Industrial robotics project (tire production). ROSBridge + WebRTC + MQTT stack.
ROS2 Humble/Jazzy. Docker-based robot-side infra. Portuguese UI.
Supabase backend with RLS. User is expert in industrial robotics integration.
ALL LLM calls use FREE Gemini APIs only (7-key rotation, zero cost).
Orion voice: 100% local formant synth (Iapetus DNA). NO external TTS APIs.
Orion só fala (TTS) em conversas diretas com ele. Fora do chat do Orion = mudo.
Orion responde CURTO (2-4 frases). Só detalha se pedido explicitamente.
Two domains: iasofthub.com = Orion IA site, elpgreen.com = ELP company (auth/legal).
Platform retains 10% of profits (except affiliates). Orion requires premium sub.
GCP VM (t2a-standard-1) as primary backend for Orion processing (proxy/cache/TTS/STT/vision).

## Memories
- [Domain separation](mem://features/domain-separation) — iasofthub.com for Orion platform, elpgreen.com for ELP company auth/legal
- [Platform business rules](mem://features/platform-business-rules) — 10% fee, affiliate exemption, Orion subscription tiers, Stripe per-user, auto-fit images
- [Robotic stack](mem://features/robotic-stack) — ROSBridge client, WebRTC camera, tire line services, Docker infra
- [Jarvis TTS](mem://features/jarvis-tts) — JARVIS voice via HF Piper model, edge function, DSP post-processing, Home Assistant compatible
- [Orion HUB Space](mem://features/orion-hub-space) — ZeroGPU Gradio Space with TTS, LLM, OCR, Vision, Embeddings, PDF endpoints
- [Site reorganization](mem://design/site-reorganization) — 6 main pages, orphan redirects, pricing tiers, Home sections order
- [RAG embeddings](mem://features/rag-embeddings) — Gemini embedding-001 (768d) + HuggingFace fallback (384d→768d)
- [Welcome splash](mem://features/welcome-splash) — 5s video + Three.js welcome, profile redirect, onboarding
- [Google Cloud - Orion](mem://reference/google-cloud-orion) — GCP project #183568688847, Gemini API key active, AI Studio, GDP premium credits
- [GCP VM Orion](mem://reference/gcp-vm-orion) — t2a-standard-1 VM with FastAPI (proxy/cache, TTS, STT, DETR, OCR, embeddings)
- [Free Gemini only](mem://preference/free-gemini-only) — All LLM uses free Gemini models, no paid providers, 7-key rotation
- [Free voice system](mem://preference/free-voice-system) — Orion 100% local formant synth, no external TTS APIs
- [No ElevenLabs](mem://constraint/no-elevenlabs) — ElevenLabs forbidden: too expensive, all references removed
- [Orion voice context](mem://preference/orion-voice-context) — Orion only speaks (TTS) in direct conversations with him, mute elsewhere
- [Orion concise responses](mem://preference/orion-concise-responses) — Orion responds short (2-4 sentences), only elaborates when explicitly asked
- [Vision token optimization](mem://features/vision-token-optimization) — HF Vision Gate pre-filter, Gemini Flash Lite, ≤3s response target
- [Vision cache Zilliz](mem://features/vision-cache-zilliz) — 3-layer pipeline (client diff + Zilliz memory + Gemini), `analyzeFrameSmart()`, 80%+ cost cut
- [Editor de Páginas de Vendas](mem://reference/editor-paginas-vendas) — Wix-style visual editor with 12 block types, drag-and-drop, auto-save, responsive preview
- [MFCC voice analysis](mem://features/mfcc-voice-analysis) — MFCC extraction from Iapetus reference, corrections for formant synth
- [IPA Tokenizer](mem://features/ipa-tokenizer) — Complete IPA/X-SAMPA tokenization with diphone F2 loci, affricates t͡ʃ/d͡ʒ, uvular χ
- [Spectrographic calibration](mem://reference/spectrographic-calibration) — Beber & Cielo 2012 normal male voice norms applied to formant synth v19
- [Formant TTS engine](mem://features/formant-tts) — Custom formant synth v19, LF glottal + 5 resonators + nasal anti-formant
- [Metacognitive Hearing](mem://features/metacognitive-hearing) — 5-layer auditory metacognition: perception, prosody, filter, reasoning integration, echoic memory
- [Groq Whisper STT](mem://features/groq-whisper-stt) — Edge function for Groq Whisper free tier STT
- [ZeroGPU Space](mem://features/hf-zerogpu-gemma4) — GPU→CPU fallback, quota tracker, Gemma 4/BLIP/Whisper
- [Centralized API Keys](mem://features/centralized-api-keys) — user_api_keys table + get-api-keys edge function + UI panel, AES-256, no token counting
