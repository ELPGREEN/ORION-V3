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

# ORION Neural Hub v2 — CPU Free Tier

Unified AI backend for the ORION platform.  
Hardware: **CPU Basic** (2 vCPU, 16GB RAM) — Free & unlimited!

## Capabilities

| API Endpoint | Description | Model |
|---|---|---|
| `/api/vision_classify` | Image classification | google/vit-base-patch16-224 |
| `/api/vision_caption` | Image captioning | Salesforce/blip-image-captioning-base |
| `/api/whisper_stt` | Speech-to-text | openai/whisper-tiny |
| `/api/tts` | JARVIS voice synthesis | Piper ONNX (jgkawell/jarvis) |
| `/api/ocr` | Document text extraction (pt/en/es) | EasyOCR |
| `/api/embeddings` | Sentence embeddings (384d) | all-MiniLM-L6-v2 |
| `/api/pdf` | PDF → Markdown/HTML | PyMuPDF |
| `/api/health` | System health check | — |

## Usage via JavaScript

```javascript
import { Client } from "@gradio/client";
const client = await Client.connect("SEU_USUARIO/orion-gpu");

// Vision Caption
const result = await client.predict("/vision_caption", { image: imageBlob });

// TTS
const audio = await client.predict("/tts", { text: "Hello, I am JARVIS.", speed: 1.0 });

// Whisper STT
const stt = await client.predict("/whisper_stt", { audio: audioBlob, language: "pt" });
```

## Deploy

1. Create a new Space on [huggingface.co/new-space](https://huggingface.co/new-space)
2. Name: `orion-gpu`, SDK: Gradio, Hardware: **CPU Basic (Free)**
3. Upload `app.py`, `requirements.txt` e `README.md`
4. Space auto-builds (~5-8 min)
