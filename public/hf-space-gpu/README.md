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
hardware: zero-a10g
---

# ORION Neural Hub v2 — ZeroGPU

Unified AI backend for the ORION platform.  
Hardware: **ZeroGPU** (dynamic A100/H200) — Free tier ~300s GPU/day!

## GPU Capabilities (ZeroGPU)

| API Endpoint | Description | Model | GPU? |
|---|---|---|---|
| `/api/gemma_chat` | Gemma 4 LLM chat (bfloat16) | google/gemma-4-4b-it | ✅ |
| `/api/vision_caption` | Image captioning (float16) | Salesforce/blip-image-captioning-large | ✅ |
| `/api/whisper_stt` | Speech-to-text multi-language | openai/whisper-large-v3-turbo | ✅ |

## CPU Capabilities (Unlimited)

| API Endpoint | Description | Model |
|---|---|---|
| `/api/tts` | JARVIS voice synthesis (22050Hz WAV) | Piper ONNX (jgkawell/jarvis) |
| `/api/ocr` | Document text extraction (pt/en/es) | EasyOCR CPU |
| `/api/embeddings` | Sentence embeddings (384d) | all-MiniLM-L6-v2 |
| `/api/pdf` | PDF → Markdown/HTML | PyMuPDF |
| `/api/health` | System health check | — |

## Usage via Python

```python
from gradio_client import Client
client = Client("Ericsonv12/orion-gpu")

# Gemma 4 Chat (GPU)
response = client.predict("Explique habeas corpus", "Responda em português.", 512, 0.7, api_name="/gemma_chat")

# Vision Caption (GPU)
result = client.predict("image.png", api_name="/vision_caption")

# Whisper STT (GPU)
result = client.predict(("audio.wav",), "pt", api_name="/whisper_stt")

# TTS (CPU)
audio = client.predict("Hello, I am JARVIS.", 1.0, api_name="/tts")

# OCR (CPU)
result = client.predict("image.png", api_name="/ocr")

# Embeddings (CPU)
result = client.predict("direito penal\nhabeas corpus", api_name="/embeddings")
```

## Usage via JavaScript

```javascript
import { Client } from "@gradio/client";
const client = await Client.connect("Ericsonv12/orion-gpu");

// Gemma 4 Chat
const result = await client.predict("/gemma_chat", {
  message: "O que é mandado de segurança?",
  system_prompt: "Responda em português.",
  max_tokens: 512,
  temperature: 0.7,
});
```

## ZeroGPU Quota

- **Free tier**: ~300 seconds GPU/day
- **Pro ($9/mo)**: ~500 seconds GPU/day  
- CPU tasks (TTS, OCR, Embeddings, PDF) are **unlimited**
- GPU models load on first use, cached in memory for subsequent calls

## Deploy

1. Create a new Space on [huggingface.co/new-space](https://huggingface.co/new-space)
2. Name: `orion-gpu`, SDK: Gradio, Hardware: **ZeroGPU**
3. Upload `app.py` and `requirements.txt`
4. Space auto-builds and deploys
