import os
import json
import time
import logging
from fastapi import FastAPI, Request, BackgroundTasks, Form, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from PIL import Image
import numpy as np
import io

from brain import OrionAssistant
from vision.router import vision_router

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ORION Core V3 API", version="3.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializa o Assistente (Singleton)
orion = OrionAssistant()

# ─── Vision Router (detect, classify, status) ───
app.include_router(vision_router)

# ─── Legacy Logic (from app.py) ───

_models = {}

def get_embedder():
    if "embedder" not in _models:
        from sentence_transformers import SentenceTransformer
        _models["embedder"] = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
    return _models["embedder"]

def get_ocr():
    if "ocr" not in _models:
        import easyocr
        _models["ocr"] = easyocr.Reader(["pt", "en", "es"], gpu=False)
    return _models["ocr"]

class CommandRequest(BaseModel):
    query: str

@app.get("/health")
async def health():
    """Endpoint de health check compatível com o proxy e dashboard."""
    status = orion.get_status()
    return {
        "status": "online",
        "space": "ORION Neural Hub (CPU)",
        "version": status["version"],
        "uptime_seconds": status["uptime_seconds"],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

# ─── Brain Endpoints ───

@app.get("/brain/status")
async def get_brain_status():
    return orion.get_status()

@app.post("/brain/command")
async def process_command(req: CommandRequest):
    return orion.process_with_google_enhancement(req.query)

@app.get("/brain/memory")
async def get_memory():
    return {
        "entries": [
            {
                "query": m["user"],
                "response": m["assistant"],
                "intent": m["intent"],
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(m["timestamp"]))
            } for m in orion.memory.history
        ]
    }

@app.get("/brain/intents")
async def get_intents():
    return orion.intent_patterns

# ─── Integration Endpoints ───

@app.get("/integrations/status")
async def get_integrations_status():
    return {
        "mqtt": orion.iot.get_status(),
        "ble": orion.ble.get_status(),
        "ros2": orion.ros2.get_status(),
        "google_assistant": orion.google.get_status() if orion.google else {"available": False, "fallback_count": 0}
    }

@app.get("/integrations/iot")
async def get_iot_details():
    return orion.iot.get_status()

@app.get("/integrations/ble")
async def get_ble_details():
    return orion.ble.get_status()

@app.get("/integrations/ros2")
async def get_ros2_details():
    return orion.ros2.get_status()

# ─── Legacy Endpoints (OCR, Embeddings, PDF) ───

@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    reader = get_ocr()
    results = reader.readtext(np.array(image))

    extractions = []
    for bbox, text, confidence in results:
        extractions.append({
            "text": text,
            "confidence": round(float(confidence), 4),
            "bbox": [[int(p[0]), int(p[1])] for p in bbox],
        })

    return {
        "texts": [e["text"] for e in extractions],
        "full_text": " ".join(e["text"] for e in extractions),
        "details": extractions,
        "total_blocks": len(extractions),
    }

@app.post("/embeddings")
async def embeddings_endpoint(texts: str = Form(...)):
    text_list = [t.strip() for t in texts.strip().split("\n") if t.strip()]
    if not text_list:
        return JSONResponse(status_code=400, content={"error": "Empty text list"})

    embedder = get_embedder()
    embeddings = embedder.encode(text_list, normalize_embeddings=True)
    return {
        "embeddings": embeddings.tolist(),
        "dimensions": embeddings.shape[1],
        "count": len(text_list),
    }

@app.post("/pdf")
async def pdf_endpoint(file: UploadFile = File(...), format: str = Form("Markdown")):
    import fitz
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        doc = fitz.open(temp_path)
        if format == "HTML":
            html_parts = ['<div class="pdf-content">']
            for page_num in range(len(doc)):
                page = doc[page_num]
                html_parts.append(f'<section class="page" data-page="{page_num + 1}">')
                html_parts.append(page.get_text("html"))
                html_parts.append("</section>")
            doc.close()
            html_parts.append("</div>")
            return {"result": "\n".join(html_parts)}
        else:
            sections = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                blocks = page.get_text("dict")["blocks"]
                sections.append(f"\n---\n**Página {page_num + 1}**\n")
                for block in blocks:
                    if block["type"] == 0:
                        for line in block.get("lines", []):
                            text = "".join(span["text"] for span in line.get("spans", []))
                            if text.strip():
                                max_size = max((s.get("size", 12) for s in line.get("spans", [])), default=12)
                                if max_size >= 16:
                                    sections.append(f"## {text.strip()}")
                                elif max_size >= 13:
                                    sections.append(f"### {text.strip()}")
                                else:
                                    sections.append(text.strip())
            doc.close()
            return {"result": "\n\n".join(sections)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/tts")
async def tts_stub():
    return {
        "error": "TTS unavailable on CPU tier",
        "message": "Use orion-gpu space for JARVIS TTS: https://huggingface.co/spaces/Ericsonv12/orion-gpu",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
