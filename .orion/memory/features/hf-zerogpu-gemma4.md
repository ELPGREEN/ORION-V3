---
name: HF ZeroGPU + Gemma 4 Integration
description: ZeroGPU Space upgraded with Gemma 4 LLM, BLIP vision captioning, Whisper STT on free GPU
type: feature
---
## Space: Ericsonv12/orion-gpu (v2.0.0-zerogpu)
- Files: public/hf-space-gpu/app.py + requirements.txt
- Hardware: ZeroGPU (dynamic A100/H200) — free tier ~300s GPU/day

## GPU Models (ZeroGPU, free)
- **Gemma 4 (4B-IT)**: google/gemma-4-4b-it — LLM chat, bfloat16
- **BLIP Large**: Salesforce/blip-image-captioning-large — image captioning, float16
- **Whisper Large v3 Turbo**: openai/whisper-large-v3-turbo — STT, float16, multi-language

## CPU Models (unlimited, free)
- Piper Jarvis TTS, EasyOCR, all-MiniLM-L6-v2, PyMuPDF PDF

## Client: src/lib/neural/orion-hub-client.ts
- gemma_chat, vision_caption, whisper_stt (new GPU endpoints)
- tts, ocr, embeddings, pdf (existing CPU endpoints)

## Quotas
- ZeroGPU free: ~300s GPU/day, Pro: ~500s/day
- CPU tasks: unlimited
- Gradio API: no rate limits beyond ZeroGPU quota
