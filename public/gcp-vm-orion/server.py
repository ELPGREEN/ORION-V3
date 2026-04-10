"""
ORION GCP VM Server — FastAPI
Proxy/cache + TTS (Piper) + STT (Whisper) + Vision (DETR/SegFormer)
Designed for t2a-standard-1 (Arm64, 4GB RAM, CPU only)

Run: uvicorn server:app --host 0.0.0.0 --port 8080
"""

import io
import os
import wave
import json
import time
import base64
import hashlib
import asyncio
import traceback
from typing import Optional
from contextlib import asynccontextmanager

import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
import httpx
import diskcache

# ============================================================
# Config
# ============================================================

CACHE_DIR = "/tmp/orion-cache"
CACHE_TTL = 3600  # 1 hour default
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
HF_SPACE_URL = os.environ.get("HF_SPACE_URL", "https://ericsonv12-orion-gpu.hf.space")

# ============================================================
# Lazy model loaders (memory-conscious for 4GB)
# ============================================================

_models = {}
_cache = None


def get_cache():
    global _cache
    if _cache is None:
        _cache = diskcache.Cache(CACHE_DIR, size_limit=500 * 1024 * 1024)  # 500MB disk cache
    return _cache


def get_embedder():
    if "embedder" not in _models:
        from sentence_transformers import SentenceTransformer
        _models["embedder"] = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
        print("[Orion VM] Embedder loaded")
    return _models["embedder"]


def get_ocr():
    if "ocr" not in _models:
        import easyocr
        _models["ocr"] = easyocr.Reader(["pt", "en"], gpu=False)
        print("[Orion VM] OCR loaded")
    return _models["ocr"]


def get_whisper():
    if "whisper" not in _models:
        from faster_whisper import WhisperModel
        # tiny model for 4GB RAM constraint
        _models["whisper"] = WhisperModel("tiny", device="cpu", compute_type="int8")
        print("[Orion VM] Whisper-tiny loaded")
    return _models["whisper"]


def get_detr():
    if "detr" not in _models:
        from transformers import DetrImageProcessor, DetrForObjectDetection
        _models["detr_proc"] = DetrImageProcessor.from_pretrained("facebook/detr-resnet-50")
        _models["detr"] = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
        _models["detr"].eval()
        print("[Orion VM] DETR loaded")
    return _models["detr_proc"], _models["detr"]


def get_piper():
    if "piper" not in _models:
        try:
            import piper
            voice_path = os.environ.get("PIPER_VOICE", "/opt/piper-voices/pt_BR-faber-medium.onnx")
            _models["piper"] = piper.PiperVoice.load(voice_path)
            print(f"[Orion VM] Piper loaded: {voice_path}")
        except Exception as e:
            print(f"[Orion VM] Piper load failed: {e}")
            _models["piper"] = None
    return _models.get("piper")


# ============================================================
# Startup / Shutdown
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Orion VM] Starting warm-up...")
    t0 = time.time()
    # Pre-load lightweight models
    get_cache()
    get_embedder()
    print(f"[Orion VM] Warm-up done in {time.time()-t0:.1f}s")
    yield
    if _cache:
        _cache.close()
    print("[Orion VM] Shutdown complete")


app = FastAPI(title="Orion VM Server", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_http_client: Optional[httpx.AsyncClient] = None


async def get_http():
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=60.0)
    return _http_client


# ============================================================
# Health
# ============================================================

@app.get("/health")
async def health():
    import psutil
    mem = psutil.virtual_memory()
    return {
        "status": "online",
        "type": "gcp-vm",
        "models_loaded": list(_models.keys()),
        "memory_used_mb": round(mem.used / 1024 / 1024),
        "memory_total_mb": round(mem.total / 1024 / 1024),
        "cache_size": len(get_cache()) if _cache else 0,
    }


# ============================================================
# Proxy/Cache — Intelligent API cache
# ============================================================

@app.post("/proxy/gemini")
async def proxy_gemini(request: Request):
    """Proxy Gemini API calls with disk cache"""
    body = await request.json()
    cache_key = "gemini:" + hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
    
    cache = get_cache()
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    api_key = GEMINI_API_KEY
    if not api_key:
        raise HTTPException(400, "GEMINI_API_KEY not configured")

    model = body.pop("model", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    client = await get_http()
    resp = await client.post(url, json=body, timeout=30.0)
    
    if resp.status_code == 200:
        data = resp.json()
        cache.set(cache_key, json.dumps(data), expire=CACHE_TTL)
        return data
    else:
        raise HTTPException(resp.status_code, resp.text)


@app.post("/proxy/hf-space")
async def proxy_hf_space(request: Request):
    """Proxy HF Space calls with cache"""
    body = await request.json()
    endpoint = body.get("endpoint", "health")
    inputs = body.get("inputs", {})
    
    cache_key = f"hf:{endpoint}:{hashlib.sha256(json.dumps(inputs, sort_keys=True).encode()).hexdigest()}"
    cache = get_cache()
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    client = await get_http()
    resp = await client.post(
        f"{HF_SPACE_URL}/api/predict/{endpoint}",
        json={"data": [inputs]},
        timeout=60.0,
    )
    
    if resp.status_code == 200:
        data = resp.json()
        cache.set(cache_key, json.dumps(data), expire=CACHE_TTL)
        return data
    else:
        raise HTTPException(resp.status_code, resp.text)


# ============================================================
# TTS — Piper (CPU)
# ============================================================

@app.post("/tts")
async def tts_endpoint(text: str = Form(...), speed: float = Form(1.0)):
    """TTS using Piper — returns WAV audio"""
    piper_voice = get_piper()
    if piper_voice is None:
        raise HTTPException(503, "Piper TTS not available")

    try:
        normalized_speed = max(0.25, min(speed, 4.0))
        length_scale = 1.0 / normalized_speed

        audio_bytes = io.BytesIO()
        with wave.open(audio_bytes, "wb") as wav_file:
            piper_voice.synthesize(
                text,
                wav_file,
                length_scale=length_scale,
                sentence_silence=0.3,
            )

        audio_bytes.seek(0)
        return Response(
            content=audio_bytes.read(),
            media_type="audio/wav",
            headers={
                "X-Model": "piper-pt-br",
                "X-Source": "gcp-vm",
                "X-Sample-Rate": str(piper_voice.config.sample_rate),
            },
        )
    except Exception as e:
        raise HTTPException(500, f"TTS error: {str(e)}")


# ============================================================
# STT — Whisper tiny (CPU, int8)
# ============================================================

@app.post("/stt")
async def stt_endpoint(audio: UploadFile = File(...), language: str = Form("pt")):
    """STT using faster-whisper tiny"""
    try:
        model = get_whisper()
        audio_bytes = await audio.read()
        
        # Write to temp file (faster-whisper needs file path)
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        segments, info = model.transcribe(tmp_path, language=language, beam_size=1)
        text = " ".join(s.text for s in segments)
        
        os.unlink(tmp_path)
        
        return {
            "text": text.strip(),
            "language": info.language,
            "model": "whisper-tiny-int8",
            "source": "gcp-vm",
        }
    except Exception as e:
        raise HTTPException(500, f"STT error: {str(e)}")


# ============================================================
# Vision — DETR Object Detection (CPU)
# ============================================================

def _parse_image(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("RGB")


@app.post("/vision/detect")
async def vision_detect(image: UploadFile = File(...), threshold: float = Form(0.5)):
    """Object detection using DETR (CPU) — expect ~5-10s"""
    try:
        import torch
        proc, model = get_detr()
        img = _parse_image(await image.read())
        
        inputs = proc(images=img, return_tensors="pt")
        with torch.no_grad():
            outputs = model(**inputs)

        target_sizes = torch.tensor([img.size[::-1]])
        results = proc.post_process_object_detection(outputs, target_sizes=target_sizes, threshold=threshold)[0]

        detections = []
        for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
            detections.append({
                "label": model.config.id2label[label.item()],
                "score": round(score.item(), 3),
                "box": [round(v, 1) for v in box.tolist()],
            })

        return {
            "detections": detections,
            "count": len(detections),
            "model": "detr-resnet-50",
            "source": "gcp-vm",
        }
    except Exception as e:
        raise HTTPException(500, f"Detection error: {str(e)}")


@app.post("/vision/classify")
async def vision_classify(image: UploadFile = File(...)):
    """Image classification using ResNet features via embedder similarity"""
    try:
        img = _parse_image(await image.read())
        # Simple classification via DETR labels
        import torch
        proc, model = get_detr()
        inputs = proc(images=img, return_tensors="pt")
        with torch.no_grad():
            outputs = model(**inputs)

        target_sizes = torch.tensor([img.size[::-1]])
        results = proc.post_process_object_detection(outputs, target_sizes=target_sizes, threshold=0.3)[0]

        labels = {}
        for score, label in zip(results["scores"], results["labels"]):
            name = model.config.id2label[label.item()]
            if name not in labels or score.item() > labels[name]:
                labels[name] = round(score.item(), 3)

        return [{"label": k, "score": v} for k, v in sorted(labels.items(), key=lambda x: -x[1])[:10]]
    except Exception as e:
        raise HTTPException(500, f"Classification error: {str(e)}")


# ============================================================
# OCR (CPU)
# ============================================================

@app.post("/ocr")
async def ocr_endpoint(image: UploadFile = File(...)):
    """OCR using EasyOCR"""
    try:
        reader = get_ocr()
        img = _parse_image(await image.read())
        img_np = np.array(img)
        
        results = reader.readtext(img_np)
        texts = [r[1] for r in results]
        details = [{"text": r[1], "confidence": round(r[2], 3), "bbox": [[int(c) for c in p] for p in r[0]]} for r in results]
        
        return {
            "texts": texts,
            "full_text": " ".join(texts),
            "details": details,
            "total_blocks": len(results),
            "source": "gcp-vm",
        }
    except Exception as e:
        raise HTTPException(500, f"OCR error: {str(e)}")


# ============================================================
# Embeddings (CPU)
# ============================================================

@app.post("/embeddings")
async def embeddings_endpoint(texts: str = Form(...)):
    """Compute embeddings using all-MiniLM-L6-v2"""
    try:
        text_list = texts.split("\n")
        embedder = get_embedder()
        vectors = embedder.encode(text_list, normalize_embeddings=True)
        
        return {
            "embeddings": vectors.tolist(),
            "dimensions": vectors.shape[1],
            "count": len(text_list),
            "source": "gcp-vm",
        }
    except Exception as e:
        raise HTTPException(500, f"Embedding error: {str(e)}")


# ============================================================
# Cache Management
# ============================================================

@app.get("/cache/stats")
async def cache_stats():
    cache = get_cache()
    return {
        "size": len(cache),
        "volume_bytes": cache.volume(),
    }


@app.delete("/cache/clear")
async def cache_clear():
    cache = get_cache()
    cache.clear()
    return {"cleared": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
