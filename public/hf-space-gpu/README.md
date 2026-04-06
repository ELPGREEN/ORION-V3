---
title: ORION Neural Hub
emoji: 🧠
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: 5.33.0
app_file: app.py
pinned: true
license: mit
---

# ORION Neural Hub — CPU Free Tier

Unified AI backend for the ORION platform. Runs on HuggingFace Spaces free CPU (2 vCPU, 16GB RAM).

## Endpoints (via Gradio API)

| Function | Description |
|---|---|
| `/api/tts` | JARVIS Piper TTS (22050Hz WAV) |
| `/api/ocr` | EasyOCR document text extraction |
| `/api/embeddings` | Sentence embeddings (all-MiniLM-L6-v2, 384d) |
| `/api/pdf` | PDF → Markdown/HTML |
| `/api/health` | Health check |
