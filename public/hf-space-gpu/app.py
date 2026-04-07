"""
ORION Neural Hub — ZeroGPU Enhanced
TTS + OCR + Embeddings + PDF + Gemma 4 LLM + Vision (BLIP2/CLIP) + Whisper STT
ZeroGPU: free GPU allocation on HuggingFace Spaces

Usage: Deploy to HF Space with "ZeroGPU" hardware
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
import spaces  # ZeroGPU decorator

# ============================================================
# Lazy model loaders
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
# GPU Models (ZeroGPU — loaded on demand)
# ============================================================

@spaces.GPU(duration=60)
def get_gemma():
    """Load Gemma 4 (smallest) for free GPU inference"""
    if "gemma" not in _models:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        import torch
        model_id = "google/gemma-4-4b-it"
        _models["gemma_tokenizer"] = AutoTokenizer.from_pretrained(model_id)
        _models["gemma"] = AutoModelForCausalLM.from_pretrained(
            model_id, torch_dtype=torch.bfloat16, device_map="auto"
        )
    return _models["gemma"], _models["gemma_tokenizer"]


@spaces.GPU(duration=30)
def get_blip2():
    """Load BLIP-2 for image captioning on GPU"""
    if "blip2" not in _models:
        from transformers import BlipProcessor, BlipForConditionalGeneration
        import torch
        model_id = "Salesforce/blip-image-captioning-large"
        _models["blip2_processor"] = BlipProcessor.from_pretrained(model_id)
        _models["blip2"] = BlipForConditionalGeneration.from_pretrained(
            model_id, torch_dtype=torch.float16
        ).to("cuda")
    return _models["blip2"], _models["blip2_processor"]


@spaces.GPU(duration=30)
def get_whisper():
    """Load Whisper for STT on GPU"""
    if "whisper" not in _models:
        from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
        import torch
        model_id = "openai/whisper-large-v3-turbo"
        _models["whisper_processor"] = AutoProcessor.from_pretrained(model_id)
        _models["whisper"] = AutoModelForSpeechSeq2Seq.from_pretrained(
            model_id, torch_dtype=torch.float16
        ).to("cuda")
    return _models["whisper"], _models["whisper_processor"]


# ============================================================
# TTS — JARVIS Voice (CPU, no GPU needed)
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
# Gemma 4 LLM Chat (GPU)
# ============================================================

@spaces.GPU(duration=120)
def gemma_chat(message: str, system_prompt: str = "", max_tokens: int = 1024, temperature: float = 0.7) -> str:
    """Chat with Gemma 4 on ZeroGPU"""
    if not message.strip():
        return ""
    
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    
    model_id = "google/gemma-4-4b-it"
    if "gemma" not in _models:
        _models["gemma_tokenizer"] = AutoTokenizer.from_pretrained(model_id)
        _models["gemma"] = AutoModelForCausalLM.from_pretrained(
            model_id, torch_dtype=torch.bfloat16, device_map="auto"
        )
    
    tokenizer = _models["gemma_tokenizer"]
    model = _models["gemma"]
    
    messages = []
    if system_prompt.strip():
        messages.append({"role": "user", "content": f"[System: {system_prompt}]"})
        messages.append({"role": "assistant", "content": "Entendido."})
    messages.append({"role": "user", "content": message})
    
    inputs = tokenizer.apply_chat_template(messages, return_tensors="pt", add_generation_prompt=True)
    inputs = inputs.to(model.device)
    
    with torch.no_grad():
        outputs = model.generate(
            inputs,
            max_new_tokens=max_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
            top_p=0.95,
        )
    
    response = tokenizer.decode(outputs[0][inputs.shape[-1]:], skip_special_tokens=True)
    return response.strip()


# ============================================================
# Vision — BLIP Captioning + Classification (GPU)
# ============================================================

@spaces.GPU(duration=30)
def vision_caption(image) -> str:
    """Generate image caption using BLIP on GPU"""
    if image is None:
        return json.dumps({"error": "No image"})
    
    import torch
    from transformers import BlipProcessor, BlipForConditionalGeneration
    
    model_id = "Salesforce/blip-image-captioning-large"
    if "blip2" not in _models:
        _models["blip2_processor"] = BlipProcessor.from_pretrained(model_id)
        _models["blip2"] = BlipForConditionalGeneration.from_pretrained(
            model_id, torch_dtype=torch.float16
        ).to("cuda")
    
    processor = _models["blip2_processor"]
    model = _models["blip2"]
    
    if isinstance(image, np.ndarray):
        img = Image.fromarray(image)
    elif isinstance(image, str):
        if image.startswith("data:"):
            img_data = base64.b64decode(image.split(",")[1])
            img = Image.open(io.BytesIO(img_data))
        else:
            img = Image.open(image)
    else:
        img = image
    
    img = img.convert("RGB")
    inputs = processor(img, return_tensors="pt").to("cuda", torch.float16)
    
    with torch.no_grad():
        ids = model.generate(**inputs, max_new_tokens=100)
    
    caption = processor.decode(ids[0], skip_special_tokens=True)
    
    return json.dumps({
        "caption": caption,
        "model": model_id,
        "source": "blip-gpu",
    }, ensure_ascii=False)


# ============================================================
# Whisper STT (GPU)
# ============================================================

@spaces.GPU(duration=60)
def whisper_stt(audio, language: str = "pt") -> str:
    """Transcribe audio using Whisper on GPU"""
    if audio is None:
        return json.dumps({"error": "No audio"})
    
    import torch
    from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
    
    model_id = "openai/whisper-large-v3-turbo"
    if "whisper" not in _models:
        _models["whisper_processor"] = AutoProcessor.from_pretrained(model_id)
        _models["whisper"] = AutoModelForSpeechSeq2Seq.from_pretrained(
            model_id, torch_dtype=torch.float16
        ).to("cuda")
    
    processor = _models["whisper_processor"]
    model = _models["whisper"]
    
    if isinstance(audio, tuple):
        sr, audio_array = audio
        audio_array = audio_array.astype(np.float32)
        if audio_array.max() > 1.0:
            audio_array = audio_array / 32768.0
        if sr != 16000:
            import librosa
            audio_array = librosa.resample(audio_array, orig_sr=sr, target_sr=16000)
    else:
        return json.dumps({"error": "Unsupported audio format"})
    
    inputs = processor(audio_array, sampling_rate=16000, return_tensors="pt")
    inputs = {k: v.to("cuda") for k, v in inputs.items()}
    
    forced_decoder_ids = processor.get_decoder_prompt_ids(language=language, task="transcribe")
    
    with torch.no_grad():
        predicted_ids = model.generate(
            **inputs,
            forced_decoder_ids=forced_decoder_ids,
            max_new_tokens=448,
        )
    
    text = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
    
    return json.dumps({
        "text": text.strip(),
        "language": language,
        "model": model_id,
        "source": "whisper-gpu",
    }, ensure_ascii=False)


# ============================================================
# OCR — EasyOCR (CPU)
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
    return json.dumps({
        "embeddings": embeddings.tolist(),
        "dimensions": embeddings.shape[1],
        "count": len(text_list),
    })


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
                        if max_size >= 16:
                            sections.append(f"## {text.strip()}")
                        elif max_size >= 13:
                            sections.append(f"### {text.strip()}")
                        else:
                            sections.append(text.strip())
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
# Health Check
# ============================================================

def health_check() -> str:
    import torch
    gpu_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if gpu_available else "N/A"
    gpu_vram = round(torch.cuda.get_device_properties(0).total_mem / 1e9, 1) if gpu_available else 0
    
    return json.dumps({
        "status": "online",
        "space": "ORION Neural Hub",
        "version": "2.0.0-zerogpu",
        "hardware": "ZeroGPU (dynamic A100/H200)",
        "gpu": {
            "available": gpu_available,
            "name": gpu_name,
            "vram_gb": gpu_vram,
        },
        "models_loaded": list(_models.keys()),
        "capabilities": ["tts", "ocr", "embeddings", "pdf", "gemma4_llm", "blip_vision", "whisper_stt"],
        "free_tier": {
            "zerogpu_quota": "~300s GPU/day (free), ~500s (Pro)",
            "cpu_tasks": "unlimited (tts, ocr, embeddings, pdf)",
            "gpu_tasks": "gemma4, blip_vision, whisper_stt",
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2)


# ============================================================
# Gradio Interface
# ============================================================

with gr.Blocks(title="ORION Neural Hub v2", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🧠 ORION Neural Hub v2\n**ZeroGPU** — Gemma 4, BLIP Vision, Whisper STT, JARVIS TTS, OCR, Embeddings, PDF")

    with gr.Tab("💬 Gemma 4 Chat"):
        gr.Markdown("Chat with Google Gemma 4 (4B) on free ZeroGPU")
        gemma_msg = gr.Textbox(label="Message", placeholder="Explique o que é habeas corpus...", lines=3)
        gemma_sys = gr.Textbox(label="System Prompt (optional)", value="Você é o ORION, assistente neural. Responda em português.", lines=2)
        gemma_tokens = gr.Slider(64, 2048, value=512, step=64, label="Max Tokens")
        gemma_temp = gr.Slider(0.0, 1.5, value=0.7, step=0.1, label="Temperature")
        gemma_output = gr.Textbox(label="Response", lines=10)
        gemma_btn = gr.Button("🧠 Chat", variant="primary")
        gemma_btn.click(fn=gemma_chat, inputs=[gemma_msg, gemma_sys, gemma_tokens, gemma_temp], outputs=gemma_output, api_name="gemma_chat")

    with gr.Tab("🔍 Vision (BLIP)"):
        gr.Markdown("Image captioning with BLIP on GPU")
        vis_image = gr.Image(label="Upload Image", type="numpy")
        vis_output = gr.JSON(label="Caption Result")
        vis_btn = gr.Button("🔍 Analyze", variant="primary")
        vis_btn.click(fn=vision_caption, inputs=vis_image, outputs=vis_output, api_name="vision_caption")

    with gr.Tab("🎤 Whisper STT"):
        gr.Markdown("Speech-to-text with Whisper Large v3 Turbo on GPU")
        stt_audio = gr.Audio(label="Record/Upload Audio", type="numpy")
        stt_lang = gr.Dropdown(["pt", "en", "es", "fr", "de", "it", "zh", "ja"], value="pt", label="Language")
        stt_output = gr.JSON(label="Transcription")
        stt_btn = gr.Button("🎤 Transcribe", variant="primary")
        stt_btn.click(fn=whisper_stt, inputs=[stt_audio, stt_lang], outputs=stt_output, api_name="whisper_stt")

    with gr.Tab("🗣️ JARVIS TTS"):
        gr.Markdown("Generate speech with JARVIS voice (Piper ONNX, CPU)")
        tts_input = gr.Textbox(label="Text", placeholder="System initialized. All modules operational.", lines=3)
        tts_speed = gr.Slider(0.5, 2.0, value=1.0, step=0.1, label="Speed")
        tts_output = gr.Audio(label="Audio Output", type="numpy")
        tts_btn = gr.Button("🔊 Speak", variant="primary")
        tts_btn.click(fn=tts_speak, inputs=[tts_input, tts_speed], outputs=tts_output, api_name="tts")

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

    with gr.Tab("❤️ Health"):
        health_output = gr.JSON(label="Status")
        health_btn = gr.Button("🔄 Check", variant="primary")
        health_btn.click(fn=health_check, inputs=[], outputs=health_output, api_name="health")


if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
