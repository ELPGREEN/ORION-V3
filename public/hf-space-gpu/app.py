"""
ORION Neural Hub — ZeroGPU Multi-Purpose Space
TTS + LLM + OCR + Vision + Embeddings + PDF
Uses @spaces.GPU for GPU-accelerated inference on H200/A100
"""

import io
import os
import json
import base64
import time
import tempfile
import wave
import struct
from typing import Optional

import gradio as gr
import spaces
import numpy as np
from PIL import Image

# ============================================================
# Lazy model loaders (loaded on first use to save cold-start)
# ============================================================

_models = {}


def get_tts():
    """Load Piper TTS with Jarvis voice"""
    if "tts" not in _models:
        from piper import PiperVoice
        from huggingface_hub import hf_hub_download
        model_path = hf_hub_download("jgkawell/jarvis", "en/en_GB/jarvis/medium/jarvis-medium.onnx")
        config_path = hf_hub_download("jgkawell/jarvis", "en/en_GB/jarvis/medium/jarvis-medium.onnx.json")
        _models["tts"] = PiperVoice.load(model_path, config_path)
    return _models["tts"]


def get_llm():
    """Load Qwen3-1.7B for local LLM inference"""
    if "llm" not in _models:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        model_id = "Qwen/Qwen3-1.7B"
        tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype="auto",
            device_map="auto",
            trust_remote_code=True,
        )
        _models["llm"] = (model, tokenizer)
    return _models["llm"]


def get_embedder():
    """Load sentence-transformers for embeddings"""
    if "embedder" not in _models:
        from sentence_transformers import SentenceTransformer
        _models["embedder"] = SentenceTransformer("all-MiniLM-L6-v2", device="cuda")
    return _models["embedder"]


def get_ocr():
    """Load EasyOCR"""
    if "ocr" not in _models:
        import easyocr
        _models["ocr"] = easyocr.Reader(["pt", "en", "es"], gpu=True)
    return _models["ocr"]


# ============================================================
# TTS — JARVIS Voice (Piper ONNX)
# ============================================================

@spaces.GPU(duration=30)
def tts_speak(text: str, speed: float = 1.0) -> tuple:
    """Generate speech with JARVIS voice. Returns (sample_rate, audio_array)."""
    if not text or not text.strip():
        return (22050, np.zeros(1, dtype=np.int16))

    voice = get_tts()
    audio_buffer = io.BytesIO()

    with wave.open(audio_buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(22050)
        voice.synthesize(text.strip(), wav, length_scale=1.0 / max(speed, 0.5))

    audio_buffer.seek(0)
    with wave.open(audio_buffer, "rb") as wav:
        frames = wav.readframes(wav.getnframes())
        audio_array = np.frombuffer(frames, dtype=np.int16)

    return (22050, audio_array)


# ============================================================
# LLM — Qwen3-1.7B Local Inference
# ============================================================

@spaces.GPU(duration=120)
def llm_chat(
    message: str,
    system_prompt: str = "Você é o ORION, assistente jurídico neural avançado. Responda em português.",
    max_tokens: int = 1024,
    temperature: float = 0.7,
) -> str:
    """Run local LLM inference with Qwen3-1.7B"""
    if not message or not message.strip():
        return ""

    model, tokenizer = get_llm()

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": message.strip()})

    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt").to(model.device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=max_tokens,
        temperature=temperature,
        do_sample=temperature > 0,
        top_p=0.9,
    )

    response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    return response.strip()


# ============================================================
# OCR — EasyOCR + Image Analysis
# ============================================================

@spaces.GPU(duration=60)
def ocr_extract(image) -> str:
    """Extract text from image using EasyOCR with GPU"""
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
# Vision — Image Classification
# ============================================================

@spaces.GPU(duration=30)
def vision_classify(image) -> str:
    """Classify image using ViT"""
    if image is None:
        return json.dumps({"error": "No image provided"})

    if "vision_pipe" not in _models:
        from transformers import pipeline
        _models["vision_pipe"] = pipeline(
            "image-classification",
            model="google/vit-base-patch16-224",
            device=0,
        )

    pipe = _models["vision_pipe"]

    if isinstance(image, np.ndarray):
        img = Image.fromarray(image)
    elif isinstance(image, str):
        img = Image.open(image)
    else:
        img = image

    results = pipe(img, top_k=5)
    return json.dumps([
        {"label": r["label"], "score": round(r["score"], 4)}
        for r in results
    ], ensure_ascii=False)


# ============================================================
# Embeddings — Sentence Transformers
# ============================================================

@spaces.GPU(duration=30)
def compute_embeddings(texts: str) -> str:
    """Compute embeddings for texts (newline-separated). Returns JSON array of vectors."""
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
# PDF Processing (CPU — no GPU needed)
# ============================================================

def pdf_to_markdown(pdf_file) -> str:
    """Convert PDF to structured Markdown"""
    if pdf_file is None:
        return "Error: No file provided"

    import fitz  # PyMuPDF

    file_path = pdf_file.name if hasattr(pdf_file, "name") else pdf_file
    doc = fitz.open(file_path)
    sections = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("dict")["blocks"]
        sections.append(f"\n---\n**Página {page_num + 1}**\n")

        for block in blocks:
            if block["type"] == 0:  # text
                for line in block.get("lines", []):
                    text = "".join(span["text"] for span in line.get("spans", []))
                    if text.strip():
                        # Detect headings by font size
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
    import torch
    gpu_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if gpu_available else "N/A"

    return json.dumps({
        "status": "online",
        "space": "ORION Neural Hub",
        "version": "1.0.0",
        "gpu": {
            "available": gpu_available,
            "name": gpu_name,
            "vram_gb": round(torch.cuda.get_device_properties(0).total_mem / 1e9, 1) if gpu_available else 0,
        },
        "models_loaded": list(_models.keys()),
        "capabilities": ["tts", "llm", "ocr", "vision", "embeddings", "pdf"],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2)


# ============================================================
# Gradio Interface
# ============================================================

with gr.Blocks(title="ORION Neural Hub", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🧠 ORION Neural Hub\n**ZeroGPU Multi-Purpose AI Space** — TTS, LLM, OCR, Vision, Embeddings, PDF")

    with gr.Tab("🗣️ JARVIS TTS"):
        gr.Markdown("Generate speech with JARVIS voice (Piper ONNX, 22050Hz)")
        tts_input = gr.Textbox(label="Text", placeholder="System initialized. All modules operational.", lines=3)
        tts_speed = gr.Slider(0.5, 2.0, value=1.0, step=0.1, label="Speed")
        tts_output = gr.Audio(label="Audio Output", type="numpy")
        tts_btn = gr.Button("🔊 Speak", variant="primary")
        tts_btn.click(fn=tts_speak, inputs=[tts_input, tts_speed], outputs=tts_output, api_name="tts")

    with gr.Tab("🤖 LLM Chat"):
        gr.Markdown("Local LLM inference with Qwen3-1.7B on ZeroGPU")
        llm_system = gr.Textbox(
            label="System Prompt",
            value="Você é o ORION, assistente jurídico neural avançado. Responda em português.",
            lines=2,
        )
        llm_input = gr.Textbox(label="Message", placeholder="Explique o princípio da legalidade...", lines=4)
        llm_tokens = gr.Slider(128, 4096, value=1024, step=128, label="Max Tokens")
        llm_temp = gr.Slider(0.0, 1.5, value=0.7, step=0.1, label="Temperature")
        llm_output = gr.Textbox(label="Response", lines=10)
        llm_btn = gr.Button("💬 Generate", variant="primary")
        llm_btn.click(fn=llm_chat, inputs=[llm_input, llm_system, llm_tokens, llm_temp], outputs=llm_output, api_name="llm")

    with gr.Tab("📝 OCR"):
        gr.Markdown("Extract text from images using EasyOCR with GPU acceleration")
        ocr_image = gr.Image(label="Upload Image", type="numpy")
        ocr_output = gr.JSON(label="Extracted Text")
        ocr_btn = gr.Button("🔍 Extract Text", variant="primary")
        ocr_btn.click(fn=ocr_extract, inputs=ocr_image, outputs=ocr_output, api_name="ocr")

    with gr.Tab("👁️ Vision"):
        gr.Markdown("Image classification using ViT (GPU)")
        vis_image = gr.Image(label="Upload Image", type="numpy")
        vis_output = gr.JSON(label="Classification Results")
        vis_btn = gr.Button("🔎 Classify", variant="primary")
        vis_btn.click(fn=vision_classify, inputs=vis_image, outputs=vis_output, api_name="vision")

    with gr.Tab("🧬 Embeddings"):
        gr.Markdown("Compute sentence embeddings (all-MiniLM-L6-v2, 384d)")
        emb_input = gr.Textbox(label="Texts (one per line)", lines=5, placeholder="direito penal\ncontrato de prestação\nhabeas corpus")
        emb_output = gr.JSON(label="Embeddings")
        emb_btn = gr.Button("🧮 Compute", variant="primary")
        emb_btn.click(fn=compute_embeddings, inputs=emb_input, outputs=emb_output, api_name="embeddings")

    with gr.Tab("📄 PDF"):
        gr.Markdown("Convert PDF to Markdown or HTML (CPU)")
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
        gr.Markdown("System status and GPU info")
        health_output = gr.JSON(label="Status")
        health_btn = gr.Button("🔄 Check", variant="primary")
        health_btn.click(fn=health_check, inputs=[], outputs=health_output, api_name="health")


if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
