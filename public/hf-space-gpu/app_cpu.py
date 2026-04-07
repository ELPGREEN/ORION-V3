"""
ORION Neural Hub v2 — CPU Free Tier
TTS + OCR + Embeddings + PDF + Vision (ViT) + Whisper Tiny STT
Optimized for HuggingFace Spaces free tier (2 vCPU, 16GB RAM)
"""

import io
import os
import json
import time
import wave
import base64
from typing import Optional

import gradio as gr
import numpy as np
from PIL import Image

_models = {}


def get_tts():
    if "tts" not in _models:
        from piper import PiperVoice
        from huggingface_hub import hf_hub_download
        model_path = hf_hub_download("jgkawell/jarvis", "en/en_GB/jarvis/medium/jarvis-medium.onnx")
        config_path = hf_hub_download("jgkawell/jarvis", "en/en_GB/jarvis/medium/jarvis-medium.onnx.json")
        _models["tts"] = PiperVoice.load(model_path, config_path)
    return _models["tts"]


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


def get_whisper():
    """Whisper tiny on CPU (~40MB, fast)"""
    if "whisper" not in _models:
        from transformers import pipeline
        _models["whisper"] = pipeline(
            "automatic-speech-recognition",
            model="openai/whisper-tiny",
            device=-1,  # CPU
        )
    return _models["whisper"]


def get_vit():
    """ViT image classifier on CPU (~85MB)"""
    if "vit" not in _models:
        from transformers import pipeline
        _models["vit"] = pipeline(
            "image-classification",
            model="google/vit-base-patch16-224",
            device=-1,
        )
    return _models["vit"]


def get_captioner():
    """BLIP image captioning on CPU (~1GB, slower but works)"""
    if "captioner" not in _models:
        from transformers import pipeline
        _models["captioner"] = pipeline(
            "image-to-text",
            model="Salesforce/blip-image-captioning-base",  # base instead of large for CPU
            device=-1,
        )
    return _models["captioner"]


# ============================================================
# TTS — JARVIS Voice (CPU)
# ============================================================

def tts_speak(text: str, speed: float = 1.0) -> tuple:
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
# Whisper STT (CPU — whisper-tiny, ~3-8s per audio)
# ============================================================

def whisper_stt(audio, language: str = "pt") -> str:
    if audio is None:
        return json.dumps({"error": "No audio"})
    
    pipe = get_whisper()
    
    if isinstance(audio, tuple):
        sr, audio_array = audio
        audio_array = audio_array.astype(np.float32)
        if audio_array.max() > 1.0:
            audio_array = audio_array / 32768.0
        # Resample to 16kHz if needed
        if sr != 16000:
            try:
                import librosa
                audio_array = librosa.resample(audio_array, orig_sr=sr, target_sr=16000)
            except ImportError:
                pass  # hope for the best
        result = pipe(audio_array, generate_kwargs={"language": language, "task": "transcribe"})
    else:
        result = pipe(audio, generate_kwargs={"language": language, "task": "transcribe"})
    
    return json.dumps({
        "text": result.get("text", "").strip(),
        "language": language,
        "model": "openai/whisper-tiny",
        "source": "whisper-cpu",
    }, ensure_ascii=False)


# ============================================================
# Vision — ViT Classification + BLIP Captioning (CPU)
# ============================================================

def vision_classify(image) -> str:
    if image is None:
        return json.dumps({"error": "No image"})
    
    classifier = get_vit()
    if isinstance(image, np.ndarray):
        img = Image.fromarray(image)
    else:
        img = image
    
    results = classifier(img, top_k=5)
    return json.dumps({
        "classifications": [{"label": r["label"], "score": round(r["score"], 4)} for r in results],
        "model": "google/vit-base-patch16-224",
        "source": "vit-cpu",
    }, ensure_ascii=False)


def vision_caption(image) -> str:
    if image is None:
        return json.dumps({"error": "No image"})
    
    captioner = get_captioner()
    if isinstance(image, np.ndarray):
        img = Image.fromarray(image)
    else:
        img = image
    
    results = captioner(img, max_new_tokens=100)
    caption = results[0]["generated_text"] if results else ""
    
    return json.dumps({
        "caption": caption,
        "model": "Salesforce/blip-image-captioning-base",
        "source": "blip-cpu",
    }, ensure_ascii=False)


# ============================================================
# OCR (CPU)
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
            "text": text, "confidence": round(confidence, 4),
            "bbox": [[int(p[0]), int(p[1])] for p in bbox],
        })
    return json.dumps({
        "texts": [e["text"] for e in extractions],
        "full_text": " ".join(e["text"] for e in extractions),
        "details": extractions, "total_blocks": len(extractions),
    }, ensure_ascii=False)


# ============================================================
# Embeddings (CPU)
# ============================================================

def compute_embeddings(texts: str) -> str:
    if not texts or not texts.strip():
        return json.dumps({"error": "No texts provided"})
    text_list = [t.strip() for t in texts.strip().split("\n") if t.strip()]
    if not text_list:
        return json.dumps({"error": "Empty text list"})
    embedder = get_embedder()
    embeddings = embedder.encode(text_list, normalize_embeddings=True)
    return json.dumps({"embeddings": embeddings.tolist(), "dimensions": embeddings.shape[1], "count": len(text_list)})


# ============================================================
# PDF (CPU)
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
        blocks = page.get_text("dict")["blocks"]
        sections.append(f"\n---\n**Página {page_num + 1}**\n")
        for block in blocks:
            if block["type"] == 0:
                for line in block.get("lines", []):
                    text = "".join(span["text"] for span in line.get("spans", []))
                    if text.strip():
                        max_size = max((s.get("size", 12) for s in line.get("spans", [])), default=12)
                        if max_size >= 16: sections.append(f"## {text.strip()}")
                        elif max_size >= 13: sections.append(f"### {text.strip()}")
                        else: sections.append(text.strip())
    doc.close()
    return "\n\n".join(sections)


def pdf_to_html(pdf_file) -> str:
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
# Health
# ============================================================

def health_check() -> str:
    return json.dumps({
        "status": "online",
        "space": "ORION Neural Hub",
        "version": "2.0.0-cpu",
        "hardware": "CPU Free Tier (2 vCPU, 16GB RAM)",
        "gpu": {"available": False},
        "models_loaded": list(_models.keys()),
        "capabilities": ["tts", "ocr", "embeddings", "pdf", "whisper_stt", "vit_vision", "blip_caption"],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2)


# ============================================================
# Gradio Interface
# ============================================================

with gr.Blocks(title="ORION Neural Hub v2", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🧠 ORION Neural Hub v2\n**CPU Free** — Vision, Whisper STT, JARVIS TTS, OCR, Embeddings, PDF")

    with gr.Tab("🔍 Vision"):
        gr.Markdown("Image classification (ViT) + captioning (BLIP) on CPU")
        vis_image = gr.Image(label="Upload Image", type="numpy")
        vis_classify_out = gr.JSON(label="Classification")
        vis_caption_out = gr.JSON(label="Caption")
        with gr.Row():
            vis_cls_btn = gr.Button("🏷️ Classify", variant="primary")
            vis_cap_btn = gr.Button("📝 Caption", variant="secondary")
        vis_cls_btn.click(fn=vision_classify, inputs=vis_image, outputs=vis_classify_out, api_name="vision_classify")
        vis_cap_btn.click(fn=vision_caption, inputs=vis_image, outputs=vis_caption_out, api_name="vision_caption")

    with gr.Tab("🎤 Whisper STT"):
        gr.Markdown("Speech-to-text with Whisper Tiny on CPU (~3-8s)")
        stt_audio = gr.Audio(label="Record/Upload Audio", type="numpy")
        stt_lang = gr.Dropdown(["pt", "en", "es", "fr", "de", "it"], value="pt", label="Language")
        stt_output = gr.JSON(label="Transcription")
        stt_btn = gr.Button("🎤 Transcribe", variant="primary")
        stt_btn.click(fn=whisper_stt, inputs=[stt_audio, stt_lang], outputs=stt_output, api_name="whisper_stt")

    with gr.Tab("🗣️ JARVIS TTS"):
        tts_input = gr.Textbox(label="Text", placeholder="System initialized.", lines=3)
        tts_speed = gr.Slider(0.5, 2.0, value=1.0, step=0.1, label="Speed")
        tts_output = gr.Audio(label="Audio Output", type="numpy")
        tts_btn = gr.Button("🔊 Speak", variant="primary")
        tts_btn.click(fn=tts_speak, inputs=[tts_input, tts_speed], outputs=tts_output, api_name="tts")

    with gr.Tab("📝 OCR"):
        ocr_image = gr.Image(label="Upload Image", type="numpy")
        ocr_output = gr.JSON(label="Extracted Text")
        ocr_btn = gr.Button("🔍 Extract", variant="primary")
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

    with gr.Tab("❤️ Health"):
        health_output = gr.JSON(label="Status")
        health_btn = gr.Button("🔄 Check", variant="primary")
        health_btn.click(fn=health_check, inputs=[], outputs=health_output, api_name="health")


if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
