"""
ORION Neural Hub — CPU Free Tier
TTS + OCR + Embeddings + PDF
Optimized for HuggingFace Spaces free tier (2 vCPU, 16GB RAM)
No GPU required — all models run on CPU
"""

import io
import os
import json
import time
import wave
from typing import Optional

import gradio as gr
import numpy as np
from PIL import Image

# ============================================================
# Lazy model loaders (loaded on first use to save memory)
# ============================================================

_models = {}


def get_tts():
    """Load Piper TTS with Jarvis voice (ONNX CPU)"""
    if "tts" not in _models:
        from piper import PiperVoice
        from huggingface_hub import hf_hub_download
        model_path = hf_hub_download("jgkawell/jarvis", "en/en_GB/jarvis/medium/jarvis-medium.onnx")
        config_path = hf_hub_download("jgkawell/jarvis", "en/en_GB/jarvis/medium/jarvis-medium.onnx.json")
        _models["tts"] = PiperVoice.load(model_path, config_path)
    return _models["tts"]


def get_embedder():
    """Load sentence-transformers on CPU"""
    if "embedder" not in _models:
        from sentence_transformers import SentenceTransformer
        _models["embedder"] = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
    return _models["embedder"]


def get_ocr():
    """Load EasyOCR on CPU"""
    if "ocr" not in _models:
        import easyocr
        _models["ocr"] = easyocr.Reader(["pt", "en", "es"], gpu=False)
    return _models["ocr"]


# ============================================================
# TTS — JARVIS Voice (Piper ONNX, CPU)
# ============================================================

def tts_speak(text: str, speed: float = 1.0) -> tuple:
    """Generate speech with JARVIS voice. Returns (sample_rate, audio_array)."""
    if not text or not text.strip():
        return (22050, np.zeros(1, dtype=np.int16))

    voice = get_tts()
    audio_buffer = io.BytesIO()

    with wave.open(audio_buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(22050)
        voice.synthesize(text.strip(), wav, length_scale=1.0 / max(speed, 0.5))

    audio_buffer.seek(0)
    with wave.open(audio_buffer, "rb") as wav:
        frames = wav.readframes(wav.getnframes())
        audio_array = np.frombuffer(frames, dtype=np.int16)

    return (22050, audio_array)


# ============================================================
# OCR — EasyOCR (CPU)
# ============================================================

def ocr_extract(image) -> str:
    """Extract text from image using EasyOCR (CPU)"""
    if image is None:
        return json.dumps({"error": "No image provided"})

    reader = get_ocr()

    if isinstance(image, np.ndarray):
        results = reader.readtext(image)
    else:
        img = Image.open(image) if isinstance(image, str) else image
        results = reader.readtext(np.array(img))

    extractions = []
    for bbox, text, confidence in results:
        extractions.append({
            "text": text,
            "confidence": round(confidence, 4),
            "bbox": [[int(p[0]), int(p[1])] for p in bbox],
        })

    return json.dumps({
        "texts": [e["text"] for e in extractions],
        "full_text": " ".join(e["text"] for e in extractions),
        "details": extractions,
        "total_blocks": len(extractions),
    }, ensure_ascii=False)


# ============================================================
# Embeddings — Sentence Transformers (CPU)
# ============================================================

def compute_embeddings(texts: str) -> str:
    """Compute embeddings for texts (newline-separated)."""
    if not texts or not texts.strip():
        return json.dumps({"error": "No texts provided"})

    text_list = [t.strip() for t in texts.strip().split("\n") if t.strip()]
    if not text_list:
        return json.dumps({"error": "Empty text list"})

    embedder = get_embedder()
    embeddings = embedder.encode(text_list, normalize_embeddings=True)

    return json.dumps({
        "embeddings": embeddings.tolist(),
        "dimensions": embeddings.shape[1],
        "count": len(text_list),
    })


# ============================================================
# PDF Processing (CPU)
# ============================================================

def pdf_to_markdown(pdf_file) -> str:
    """Convert PDF to structured Markdown"""
    if pdf_file is None:
        return "Error: No file provided"

    import fitz

    file_path = pdf_file.name if hasattr(pdf_file, "name") else pdf_file
    doc = fitz.open(file_path)
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
    return "\n\n".join(sections)


def pdf_to_html(pdf_file) -> str:
    """Convert PDF to HTML"""
    if pdf_file is None:
        return "<p>Error: No file provided</p>"

    import fitz
    file_path = pdf_file.name if hasattr(pdf_file, "name") else pdf_file
    doc = fitz.open(file_path)
    html_parts = ['<div class="pdf-content">']

    for page_num in range(len(doc)):
        page = doc[page_num]
        html_parts.append(f'<section class="page" data-page="{page_num + 1}">')
        html_parts.append(page.get_text("html"))
        html_parts.append("</section>")

    doc.close()
    html_parts.append("</div>")
    return "\n".join(html_parts)


# ============================================================
# Health Check
# ============================================================

def health_check() -> str:
    """System health check"""
    return json.dumps({
        "status": "online",
        "space": "ORION Neural Hub",
        "version": "1.0.0-cpu",
        "hardware": "CPU Free Tier (2 vCPU, 16GB RAM)",
        "gpu": {"available": False},
        "models_loaded": list(_models.keys()),
        "capabilities": ["tts", "ocr", "embeddings", "pdf"],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2)


# ============================================================
# Gradio Interface
# ============================================================

with gr.Blocks(title="ORION Neural Hub", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🧠 ORION Neural Hub\n**CPU Free Tier** — TTS, OCR, Embeddings, PDF")

    with gr.Tab("🗣️ JARVIS TTS"):
        gr.Markdown("Generate speech with JARVIS voice (Piper ONNX, CPU)")
        tts_input = gr.Textbox(label="Text", placeholder="System initialized. All modules operational.", lines=3)
        tts_speed = gr.Slider(0.5, 2.0, value=1.0, step=0.1, label="Speed")
        tts_output = gr.Audio(label="Audio Output", type="numpy")
        tts_btn = gr.Button("🔊 Speak", variant="primary")
        tts_btn.click(fn=tts_speak, inputs=[tts_input, tts_speed], outputs=tts_output, api_name="tts")

    with gr.Tab("📝 OCR"):
        gr.Markdown("Extract text from images using EasyOCR (CPU)")
        ocr_image = gr.Image(label="Upload Image", type="numpy")
        ocr_output = gr.JSON(label="Extracted Text")
        ocr_btn = gr.Button("🔍 Extract Text", variant="primary")
        ocr_btn.click(fn=ocr_extract, inputs=ocr_image, outputs=ocr_output, api_name="ocr")

    with gr.Tab("🧬 Embeddings"):
        gr.Markdown("Compute sentence embeddings (all-MiniLM-L6-v2, 384d)")
        emb_input = gr.Textbox(label="Texts (one per line)", lines=5, placeholder="direito penal\ncontrato de prestação\nhabeas corpus")
        emb_output = gr.JSON(label="Embeddings")
        emb_btn = gr.Button("🧮 Compute", variant="primary")
        emb_btn.click(fn=compute_embeddings, inputs=emb_input, outputs=emb_output, api_name="embeddings")

    with gr.Tab("📄 PDF"):
        gr.Markdown("Convert PDF to Markdown or HTML")
        pdf_file = gr.File(label="Upload PDF", file_types=[".pdf"])
        pdf_format = gr.Radio(["Markdown", "HTML"], value="Markdown", label="Output Format")
        pdf_output = gr.Textbox(label="Output", lines=15)
        pdf_btn = gr.Button("📄 Convert", variant="primary")

        def pdf_convert(file, fmt):
            if fmt == "HTML":
                return pdf_to_html(file)
            return pdf_to_markdown(file)

        pdf_btn.click(fn=pdf_convert, inputs=[pdf_file, pdf_format], outputs=pdf_output, api_name="pdf")

    with gr.Tab("❤️ Health"):
        gr.Markdown("System status")
        health_output = gr.JSON(label="Status")
        health_btn = gr.Button("🔄 Check", variant="primary")
        health_btn.click(fn=health_check, inputs=[], outputs=health_output, api_name="health")


if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
