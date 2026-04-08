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
Hardware: **CPU Basic** (2 vCPU, 16GB RAM) — Free & unlimited!

## Capabilities

| API Endpoint | Description | Model |
|---|---|---|
| `/api/ocr` | Document text extraction (pt/en/es) | EasyOCR |
| `/api/embeddings` | Sentence embeddings (384d) | all-MiniLM-L6-v2 |
| `/api/pdf` | PDF → Markdown/HTML | PyMuPDF |
| `/api/health` | System health check | — |

> **TTS** and **GPU models** are available on [orion-gpu](https://huggingface.co/spaces/Ericsonv12/orion-gpu) (ZeroGPU).

## Usage via JavaScript

```javascript
import { Client } from "@gradio/client";
const client = await Client.connect("Ericsonv12/orion");

// OCR
const result = await client.predict("/ocr", { image: imageBlob });

// Embeddings
const emb = await client.predict("/embeddings", { texts: "direito penal\nhabeas corpus" });

// PDF
const pdf = await client.predict("/pdf", { pdf_file: pdfBlob, format: "Markdown" });
```

## Deploy

1. Create a new Space on [huggingface.co/new-space](https://huggingface.co/new-space)
2. Name: `orion`, SDK: Gradio, Hardware: **CPU Basic (Free)**
3. Upload `app.py`, `requirements.txt` and `README.md`
4. Space auto-builds (~3-5 min)
