"""
ORION Neural Hub — ZeroGPU Enhanced
TTS + OCR + Embeddings + PDF + Gemma 4 LLM + Vision (BLIP) + Whisper STT + Phi-3.5 Vision
ZeroGPU: free GPU allocation on HuggingFace Spaces

Usage: Deploy to HF Space with "ZeroGPU" hardware
Fallback: All GPU endpoints degrade gracefully on CPU-only hardware
"""

import io
import os
import json
import time
import wave
import base64
import traceback
from typing import Optional

import gradio as gr
import numpy as np
from PIL import Image

# ZeroGPU decorator — graceful fallback if not available
try:
    import spaces
    HAS_ZEROGPU = True
except ImportError:
    HAS_ZEROGPU = False
    class _FakeSpaces:
        @staticmethod
        def GPU(duration=60):
            def decorator(fn):
                return fn
            return decorator
    spaces = _FakeSpaces()

# ============================================================
# Lazy model loaders
# ============================================================

_models = {}


def get_tts():
    """edge-tts is async, no model loading needed"""
    return None


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


def _check_gpu():
    """Check if CUDA GPU is actually available at runtime"""
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


# ============================================================
# TTS — Edge TTS (Microsoft, free, no API key, CPU)
# ============================================================

def tts_speak(text: str, speed: float = 1.0) -> tuple:
    if not text or not text.strip():
        return (24000, np.zeros(1, dtype=np.int16))
    try:
        import edge_tts
        import asyncio
        import tempfile

        voice = "en-GB-RyanNeural"  # Deep male voice (JARVIS-like)
        rate_str = f"+{int((speed - 1) * 100)}%" if speed >= 1 else f"{int((speed - 1) * 100)}%"

        async def _generate():
            comm = edge_tts.Communicate(text.strip(), voice, rate=rate_str)
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                tmp_path = tmp.name
            await comm.save(tmp_path)
            return tmp_path

        loop = asyncio.new_event_loop()
        tmp_path = loop.run_until_complete(_generate())
        loop.close()

        # Convert MP3 to WAV numpy array
        from pydub import AudioSegment
        audio_seg = AudioSegment.from_mp3(tmp_path)
        audio_seg = audio_seg.set_channels(1).set_frame_rate(24000).set_sample_width(2)
        audio_array = np.frombuffer(audio_seg.raw_data, dtype=np.int16)

        os.unlink(tmp_path)
        return (24000, audio_array)
    except Exception as e:
        print(f"[TTS] Error: {traceback.format_exc()}")
        raise gr.Error(f"TTS failed: {str(e)}")


# ============================================================
# Gemma 4 LLM Chat (GPU with CPU graceful error)
# ============================================================

@spaces.GPU(duration=120)
def gemma_chat(message: str, system_prompt: str = "", max_tokens: int = 1024, temperature: float = 0.7) -> str:
    """Chat with Gemma 4 on ZeroGPU"""
    if not message or not message.strip():
        return ""

    if not _check_gpu():
        return json.dumps({
            "error": "gpu_unavailable",
            "message": "Gemma 4 requires GPU (ZeroGPU). Currently running on CPU only. "
                       "Change Space hardware to ZeroGPU in Settings.",
            "fallback": True,
        })

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
    if system_prompt and system_prompt.strip():
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
# Vision — BLIP Captioning (GPU with CPU graceful error)
# ============================================================

@spaces.GPU(duration=30)
def vision_caption(image) -> str:
    """Generate image caption using BLIP on GPU"""
    if image is None:
        return json.dumps({"error": "No image"})

    if not _check_gpu():
        return json.dumps({
            "error": "gpu_unavailable",
            "message": "BLIP Vision requires GPU. Running on CPU only.",
            "fallback": True,
        })

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

    # Handle various image input types
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
# Vision Classification (CPU — lightweight ViT)
# ============================================================

def vision_classify(image) -> str:
    """Classify image using ViT on CPU"""
    if image is None:
        return json.dumps({"error": "No image"})

    from transformers import pipeline

    if "classifier" not in _models:
        _models["classifier"] = pipeline(
            "image-classification",
            model="google/vit-base-patch16-224",
            device=-1,  # CPU
        )

    # Handle various image input types
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
    results = _models["classifier"](img)

    return json.dumps([
        {"label": r["label"], "score": round(r["score"], 4)}
        for r in results[:5]
    ])


# ============================================================
# Whisper STT (GPU with CPU graceful error)
# ============================================================

@spaces.GPU(duration=60)
def whisper_stt(audio, language: str = "pt") -> str:
    """Transcribe audio using Whisper on GPU"""
    if audio is None:
        return json.dumps({"error": "No audio"})

    if not _check_gpu():
        return json.dumps({
            "error": "gpu_unavailable",
            "message": "Whisper STT requires GPU. Running on CPU only.",
            "fallback": True,
        })

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
# OCR — EasyOCR (CPU) — FIXED numpy array handling
# ============================================================

def ocr_extract(image) -> str:
    if image is None:
        return json.dumps({"error": "No image provided"})
    try:
        reader = get_ocr()
        # Handle input types safely (numpy arrays need special handling)
        if isinstance(image, np.ndarray):
            img_array = image
        elif isinstance(image, str):
            img = Image.open(image)
            img_array = np.array(img)
        elif isinstance(image, Image.Image):
            img_array = np.array(image)
        else:
            # Try treating as file-like
            img = Image.open(image)
            img_array = np.array(img)

        results = reader.readtext(img_array)
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
        }, ensure_ascii=False)
    except Exception as e:
        print(f"[OCR] Error: {traceback.format_exc()}")
        return json.dumps({"error": f"OCR failed: {str(e)}"})


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
        "dimensions": int(embeddings.shape[1]),
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
# Phi-3.5 Vision — Multimodal VQA (GPU) — UPGRADED from Phi-3
# Supports multi-image + video summarization + better benchmarks
# Install flash_attn at runtime (like ysharma's reference Space)
# ============================================================

_phi3v_flash_installed = False

def _ensure_flash_attn():
    """Install flash_attn at runtime with SKIP_CUDA_BUILD to avoid build errors"""
    global _phi3v_flash_installed
    if _phi3v_flash_installed:
        return
    try:
        import subprocess
        subprocess.run(
            'pip install flash-attn --no-build-isolation',
            env={**os.environ, 'FLASH_ATTENTION_SKIP_CUDA_BUILD': 'TRUE'},
            shell=True,
            timeout=120,
        )
        _phi3v_flash_installed = True
        print("[Phi3.5V] ✅ flash_attn installed at runtime")
    except Exception as e:
        print(f"[Phi3.5V] ⚠️ flash_attn install failed, using eager fallback: {e}")

@spaces.GPU(duration=120)
def phi3_vision(image, prompt: str = "Describe this image in detail.") -> str:
    """Analyze image with Phi-3.5-vision-instruct on GPU (upgraded from Phi-3)"""
    if image is None:
        return json.dumps({"error": "No image provided"})

    if not prompt or not prompt.strip():
        prompt = "Describe this image in detail."

    if not _check_gpu():
        return json.dumps({
            "error": "gpu_unavailable",
            "message": "Phi-3.5 Vision requires GPU (ZeroGPU).",
            "fallback": True,
        })

    import torch
    from transformers import AutoModelForCausalLM, AutoProcessor

    model_id = "microsoft/Phi-3.5-vision-instruct"
    if "phi3v" not in _models:
        # Try installing flash_attn for faster inference (~2x speedup)
        _ensure_flash_attn()

        # num_crops=16 for single-frame (best quality), 4 for multi-frame
        _models["phi3v_processor"] = AutoProcessor.from_pretrained(
            model_id, trust_remote_code=True, num_crops=16
        )

        # flash_attn if available, else eager fallback
        try:
            import flash_attn  # noqa: F401
            attn_impl = "flash_attention_2"
            print("[Phi3.5V] Using flash_attention_2")
        except ImportError:
            attn_impl = "eager"
            print("[Phi3.5V] Using eager attention (flash_attn not available)")

        _models["phi3v"] = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype="auto",
            trust_remote_code=True,
            device_map="cuda",
            _attn_implementation=attn_impl,
        )

    processor = _models["phi3v_processor"]
    model = _models["phi3v"]

    # Handle image input
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

    # Build chat template
    messages = [
        {"role": "user", "content": f"<|image_1|>\n{prompt.strip()}"},
    ]
    chat_prompt = processor.tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

    inputs = processor(chat_prompt, [img], return_tensors="pt").to("cuda:0")

    with torch.no_grad():
        ids = model.generate(
            **inputs,
            max_new_tokens=1024,
            do_sample=False,
            temperature=0.0,
            eos_token_id=processor.tokenizer.eos_token_id,
        )

    # Decode only new tokens
    generated = ids[:, inputs["input_ids"].shape[-1]:]
    text = processor.batch_decode(generated, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]

    return json.dumps({
        "response": text.strip(),
        "model": model_id,
        "source": "phi3.5-vision-gpu",
        "prompt": prompt.strip(),
    }, ensure_ascii=False)


# ============================================================
# Health Check
# ============================================================

def health_check() -> str:
    gpu_available = False
    gpu_name = "N/A"
    gpu_vram = 0
    try:
        import torch
        gpu_available = torch.cuda.is_available()
        if gpu_available:
            gpu_name = torch.cuda.get_device_name(0)
            gpu_vram = round(torch.cuda.get_device_properties(0).total_mem / 1e9, 1)
    except Exception:
        pass

    return json.dumps({
        "status": "online",
        "space": "ORION Neural Hub",
        "version": "2.2.0",
        "hardware": "ZeroGPU" if (HAS_ZEROGPU and gpu_available) else "CPU Free",
        "gpu": {
            "available": gpu_available,
            "name": gpu_name,
            "vram_gb": gpu_vram,
            "zerogpu_decorator": HAS_ZEROGPU,
        },
        "models_loaded": list(_models.keys()),
        "capabilities": {
            "gpu": ["gemma4_llm", "blip_vision", "whisper_stt", "phi3_vision"],
            "cpu": ["tts", "ocr", "embeddings", "pdf", "vision_classify"],
            "always_available": ["health"],
        },
        "endpoint_status": {
            "gemma_chat": "gpu_required" if not gpu_available else "ready",
            "vision_caption": "gpu_required" if not gpu_available else "ready",
            "whisper_stt": "gpu_required" if not gpu_available else "ready",
            "phi3_vision": "gpu_required" if not gpu_available else "ready",
            "vision_classify": "ready",
            "tts": "ready",
            "ocr": "ready",
            "embeddings": "ready",
            "pdf": "ready",
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2)


# ============================================================
# Gradio Interface
# ============================================================

with gr.Blocks(title="ORION Neural Hub v2.1", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🧠 ORION Neural Hub v2.3\n**ZeroGPU** — Gemma 4, Phi-3.5 Vision, BLIP, Whisper STT, JARVIS TTS, OCR, Embeddings, PDF")

    with gr.Tab("💬 Gemma 4 Chat"):
        gr.Markdown("Chat with Google Gemma 4 (4B) on free ZeroGPU")
        gemma_msg = gr.Textbox(label="Message", placeholder="Explique o que é habeas corpus...", lines=3)
        gemma_sys = gr.Textbox(label="System Prompt (optional)", value="Você é o ORION, assistente neural. Responda em português.", lines=2)
        gemma_tokens = gr.Slider(64, 2048, value=512, step=64, label="Max Tokens")
        gemma_temp = gr.Slider(0.0, 1.5, value=0.7, step=0.1, label="Temperature")
        gemma_output = gr.Textbox(label="Response", lines=10)
        gemma_btn = gr.Button("🧠 Chat", variant="primary")
        gemma_btn.click(fn=gemma_chat, inputs=[gemma_msg, gemma_sys, gemma_tokens, gemma_temp], outputs=gemma_output, api_name="gemma_chat")

    with gr.Tab("🔍 Vision Caption (GPU)"):
        gr.Markdown("Image captioning with BLIP on GPU")
        vis_image = gr.Image(label="Upload Image", type="numpy")
        vis_output = gr.JSON(label="Caption Result")
        vis_btn = gr.Button("🔍 Caption", variant="primary")
        vis_btn.click(fn=vision_caption, inputs=vis_image, outputs=vis_output, api_name="vision_caption")

    with gr.Tab("🏷️ Vision Classify (CPU)"):
        gr.Markdown("Image classification with ViT on CPU (always available)")
        cls_image = gr.Image(label="Upload Image", type="numpy")
        cls_output = gr.JSON(label="Classification")
        cls_btn = gr.Button("🏷️ Classify", variant="primary")
        cls_btn.click(fn=vision_classify, inputs=cls_image, outputs=cls_output, api_name="vision_classify")

    with gr.Tab("🎤 Whisper STT"):
        gr.Markdown("Speech-to-text with Whisper Large v3 Turbo on GPU")
        stt_audio = gr.Audio(label="Record/Upload Audio", type="numpy")
        stt_lang = gr.Dropdown(["pt", "en", "es", "fr", "de", "it"], value="pt", label="Language")
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

    with gr.Tab("🧿 Phi-3.5 Vision"):
        gr.Markdown("Multimodal image analysis with Phi-3.5-vision-instruct on GPU (multi-image + video support)")
        phi3_image = gr.Image(label="Upload Image", type="numpy")
        phi3_prompt = gr.Textbox(label="Prompt", value="Describe this image in detail.", lines=2)
        phi3_output = gr.JSON(label="Analysis Result")
        phi3_btn = gr.Button("🧿 Analyze", variant="primary")
        phi3_btn.click(fn=phi3_vision, inputs=[phi3_image, phi3_prompt], outputs=phi3_output, api_name="phi3_vision")

    with gr.Tab("❤️ Health"):
        health_output = gr.JSON(label="Status")
        health_btn = gr.Button("🔄 Check", variant="primary")
        health_btn.click(fn=health_check, inputs=[], outputs=health_output, api_name="health")


if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860, show_error=True)
