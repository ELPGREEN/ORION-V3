---
name: HF Transformers.js Vision & Audio
description: Browser-side free vision (ViT, DETR, CLIP, captioning, depth) and audio (Whisper STT, audio classification) via Transformers.js
type: feature
---
## Vision (browser, 100% free)
- classifyImage: Xenova/vit-base-patch16-224 (~85MB)
- detectObjects: Xenova/detr-resnet-50 (~160MB)
- classifyImageZeroShot: Xenova/clip-vit-base-patch32 (~340MB)
- captionImage: Xenova/vit-gpt2-image-captioning (~180MB)
- estimateDepth: Xenova/depth-anything-small-hf (~25MB)

## Audio (browser, 100% free)
- transcribeAudio: Xenova/whisper-tiny (~40MB) or whisper-small (~250MB)
- classifyAudio: Xenova/ast-finetuned-audioset (~85MB)
- recordMicrophoneAudio: captures mic → Float32Array 16kHz

## Orion Integration
- Vision fallback chain: MediaPipe → YOLO → Transformers.js
- Hearing fallback chain: Web Speech API → Whisper browser
- All models cached after first load, zero network cost after download
