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
hardware: zero-a100
---

# ORION Neural Hub — ZeroGPU Multi-Purpose Space

Unified AI backend for the ORION platform. Runs on ZeroGPU (H200/A100) for GPU-accelerated inference.

## Endpoints (via Gradio API)

| Function | Description | GPU |
|---|---|---|
| `/api/tts` | JARVIS + Piper TTS (22050Hz WAV) | ✅ |
| `/api/llm` | DeepSeek/Qwen3 local inference | ✅ |
| `/api/ocr` | LayoutLM + EasyOCR document analysis | ✅ |
| `/api/vision` | Image classification + object detection | ✅ |
| `/api/embeddings` | Sentence embeddings (all-MiniLM) | ✅ |
| `/api/pdf` | PDF → Markdown/HTML (CPU) | ❌ |
| `/api/health` | Health check | ❌ |

## Model Stack

- **TTS**: Piper ONNX (jgkawell/jarvis en_GB medium)
- **LLM**: Qwen/Qwen3-1.7B (ZeroGPU) + DeepSeek fallback
- **OCR**: EasyOCR + LayoutLMv3
- **Vision**: YOLO + ViT image classification
- **Embeddings**: all-MiniLM-L6-v2
