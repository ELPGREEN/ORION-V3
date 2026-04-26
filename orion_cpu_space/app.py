"""
ORION Neural Hub — Hardware Accelerated Edition
OCR + Embeddings + PDF
Hardware: Auto-detects CUDA (NVIDIA), MPS (Apple Silicon), or CPU fallback.
"""

import io
import json
import time
import base64
import torch
import gradio as gr
import numpy as np
from PIL import Image

# ============================================================
# Hardware Detection
# ============================================================

def get_best_device():
    if torch.cuda.is_available():
        return "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"

DEVICE = get_best_device()
USE_GPU = DEVICE != "cpu"
print(f"🚀 Orion Hub initialized on: {DEVICE.upper()}")

# ============================================================
# Lazy model loaders
# ============================================================

_models = {}

def get_embedder():
    """Load sentence-transformers with hardware acceleration"""
    if "embedder" not in _models:
        from sentence_transformers import SentenceTransformer
        _models["embedder"] = SentenceTransformer("all-MiniLM-L6-v2", device=DEVICE)
    return _models["embedder"]

def get_ocr():
    """Load EasyOCR with hardware acceleration"""
    if "ocr" not in _models:
        import easyocr
        # EasyOCR uses 'gpu' boolean flag
        _models["ocr"] = easyocr.Reader(["pt", "en", "es"], gpu=USE_GPU)
    return _models["ocr"]

# ============================================================
# OCR — EasyOCR
# ============================================================

def ocr_extract(image) -> str:
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
            "confidence": round(float(confidence), 4),
            "bbox": [[int(p[0]), int(p[1])] for p in bbox],
        })

    return json.dumps({
        "texts": [e["text"] for e in extractions],
        "full_text": " ".join(e["text"] for e in extractions),
        "details": extractions,
        "total_blocks": len(extractions),
        "hardware": DEVICE
    }, ensure_ascii=False)

# ============================================================
# Embeddings
# ============================================================

def compute_embeddings(texts: str) -> str:
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
        "hardware": DEVICE
    })

# ============================================================
# PDF — PyMuPDF
# ============================================================

def pdf_to_markdown(pdf_file) -> str:
    if pdf_file is None:
        return "Error: No file provided"
    import fitz
    file_path = pdf_file.name if hasattr(pdf_file, "name") else pdf_file
    doc = fitz.open(file_path)
    sections = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        sections.append(f"## Page {page_num+1}\n\n" + page.get_text())

    return "\n\n".join(sections)

# ============================================================
# UI Setup
# ============================================================

with gr.Blocks(title="Orion Neural Hub") as demo:
    gr.Markdown(f"# 🧠 Orion Neural Hub\n**Running on: {DEVICE.upper()}**")

    with gr.Tab("OCR"):
        input_img = gr.Image(label="Upload Image")
        ocr_btn = gr.Button("Extract Text")
        ocr_out = gr.JSON(label="JSON Result")
        ocr_btn.click(ocr_extract, inputs=input_img, outputs=ocr_out)

    with gr.Tab("Embeddings"):
        input_text = gr.Textbox(label="Enter sentences (one per line)", lines=5)
        emb_btn = gr.Button("Compute Embeddings")
        emb_out = gr.JSON(label="JSON Result")
        emb_btn.click(compute_embeddings, inputs=input_text, outputs=emb_out)

    with gr.Tab("PDF"):
        input_pdf = gr.File(label="Upload PDF", file_types=[".pdf"])
        pdf_btn = gr.Button("Convert to Markdown")
        pdf_out = gr.Markdown(label="Markdown Content")
        pdf_btn.click(pdf_to_markdown, inputs=input_pdf, outputs=pdf_out)

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
