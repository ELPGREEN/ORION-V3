---
title: Orion Voice RVC
emoji: 🎤
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# Orion Voice RVC (2GB Light)

Ultra-light RVC voice conversion using ONNX Runtime.
Runs on HuggingFace Free Tier (2GB RAM).

## Memory Budget
- Python + FastAPI: ~80MB
- ONNX Runtime: ~50MB  
- RVC ONNX Model: ~200MB
- Audio processing buffer: ~100MB
- **Total: ~430MB** (well within 2GB)

## Endpoints
- `POST /rvc_convert` — Convert audio via RVC
- `GET /rvc_health` — Health check with memory stats
