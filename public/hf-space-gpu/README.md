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

Unified AI backend for the ORION platform.  
Hardware: **CPU Basic** (2 vCPU, 16GB RAM, 50GB Disk) — Free!

## Capabilities

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
client = Client("Ericsonv12/orion")

# TTS
audio = client.predict("Hello, I am JARVIS.", 1.0, api_name="/tts")

# OCR
result = client.predict("image.png", api_name="/ocr")

# Embeddings
result = client.predict("direito penal\nhabeas corpus", api_name="/embeddings")

# PDF
result = client.predict("document.pdf", "Markdown", api_name="/pdf")
```

## Sleep Behavior

CPU Basic Spaces sleep after 48h of inactivity and wake automatically on new visits.
