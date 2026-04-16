"""
ORION Neural Hub — CPU Free Tier
OCR + Embeddings + PDF (no TTS, no GPU models)
Hardware: CPU Basic (2 vCPU, 16GB RAM) — Free & unlimited

TTS and GPU models available at: Ericsonv12/orion-gpu
"""

import io
import json
import time
import base64

import gradio as gr
import numpy as np
from PIL import Image

# ============================================================
# Lazy model loaders
# ============================================================

_models = {}


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
# OCR — EasyOCR (CPU)
# ============================================================

def ocr_extract(image) -> str:
    t0 = time.perf_counter()
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
        "processing_ms": round((time.perf_counter() - t0) * 1000, 2)
    }, ensure_ascii=False)


# ============================================================
# Embeddings (CPU)
# ============================================================

def compute_embeddings(texts: str) -> str:
    t0 = time.perf_counter()
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
        "processing_ms": round((time.perf_counter() - t0) * 1000, 2)
    })


# ============================================================
# PDF (CPU)
# ============================================================

def pdf_to_markdown(pdf_file) -> str:
    t0 = time.perf_counter()
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
    result = "\n\n".join(sections)
    # We can't easily return processing_ms in the raw string for Markdown,
    # but we'll log it for monitoring.
    print(f"[PDF] Markdown conversion in {round((time.perf_counter() - t0) * 1000, 2)}ms")
    return result


def pdf_to_html(pdf_file) -> str:
    t0 = time.perf_counter()
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
    print(f"[PDF] HTML conversion in {round((time.perf_counter() - t0) * 1000, 2)}ms")
    return "\n".join(html_parts)


# ============================================================
# TTS Stub (unavailable on CPU tier)
# ============================================================

def tts_unavailable(text: str, speed: float = 1.0) -> str:
    return json.dumps({
        "error": "TTS unavailable on CPU tier",
        "message": "Use orion-gpu space for JARVIS TTS: https://huggingface.co/spaces/Ericsonv12/orion-gpu",
        "alternative": "Frontend Gemini TTS or WebSpeech API",
    })


# ============================================================
# Health Check
# ============================================================

def health_check() -> str:
    return json.dumps({
        "status": "online",
        "space": "ORION Neural Hub (CPU)",
        "version": "2.0.0-cpu",
        "hardware": "CPU Basic (2 vCPU, 16GB RAM)",
        "gpu": {"available": False},
        "models_loaded": list(_models.keys()),
        "capabilities": ["ocr", "embeddings", "pdf"],
        "unavailable": ["tts", "gemma4_llm", "blip_vision", "whisper_stt"],
        "gpu_space": "https://huggingface.co/spaces/Ericsonv12/orion-gpu",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2)


# ============================================================
# Gradio Interface
# ============================================================

with gr.Blocks(title="ORION Neural Hub (CPU)", theme=gr.themes.Soft()) as demo:
    gr.Markdown(
        "# 🧠 ORION Neural Hub — CPU Free Tier\n"
        "**OCR, Embeddings, PDF** — Unlimited & Free\n\n"
        "> GPU models (Gemma 4, BLIP Vision, Whisper STT, JARVIS TTS) available at "
        "[orion-gpu](https://huggingface.co/spaces/Ericsonv12/orion-gpu)"
    )

    with gr.Tab("📝 OCR"):
        ocr_image = gr.Image(label="Upload Image", type="numpy")
        ocr_output = gr.JSON(label="Extracted Text")
        ocr_btn = gr.Button("🔍 Extract Text", variant="primary")
        ocr_btn.click(fn=ocr_extract, inputs=ocr_image, outputs=ocr_output, api_name="ocr")

    with gr.Tab("🧬 Embeddings"):
        emb_input = gr.Textbox(label="Texts (one per line)", lines=5)
        emb_output = gr.JSON(label="Embeddings")
        emb_btn = gr.Button("🧮 Compute", variant="primary")
        emb_btn.click(fn=compute_embeddings, inputs=emb_input, outputs=emb_output, api_name="embeddings")

    with gr.Tab("📄 PDF"):
        pdf_file = gr.File(label="Upload PDF", file_types=[".pdf"])
        pdf_format = gr.Radio(["Markdown", "HTML"], value="Markdown", label="Format")
        pdf_output = gr.Textbox(label="Output", lines=15)
        pdf_btn = gr.Button("📄 Convert", variant="primary")
        def pdf_convert(file, fmt):
            return pdf_to_html(file) if fmt == "HTML" else pdf_to_markdown(file)
        pdf_btn.click(fn=pdf_convert, inputs=[pdf_file, pdf_format], outputs=pdf_output, api_name="pdf")

    with gr.Tab("🗣️ TTS (→ GPU)"):
        gr.Markdown("⚠️ TTS não disponível no tier CPU. Use o space **orion-gpu** para JARVIS TTS.")
        tts_input = gr.Textbox(label="Text", placeholder="Use orion-gpu for TTS", lines=2)
        tts_speed = gr.Slider(0.5, 2.0, value=1.0, step=0.1, label="Speed")
        tts_output = gr.JSON(label="Result")
        tts_btn = gr.Button("🔊 Speak (unavailable)", variant="secondary")
        tts_btn.click(fn=tts_unavailable, inputs=[tts_input, tts_speed], outputs=tts_output, api_name="tts")

    with gr.Tab("❤️ Health"):
        health_output = gr.JSON(label="Status")
        health_btn = gr.Button("🔄 Check", variant="primary")
        health_btn.click(fn=health_check, inputs=[], outputs=health_output, api_name="health")


if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
