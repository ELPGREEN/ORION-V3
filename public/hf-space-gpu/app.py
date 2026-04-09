"""
ORION Neural Hub — ZeroGPU Enhanced v3.0
TTS + OCR + Embeddings + PDF + Gemma 4 LLM + Vision (BLIP) + Whisper STT
+ Phi-3.5 Vision + CNN Object Detection (DETR) + Feature Extraction + Depth

ZeroGPU: free GPU allocation on HuggingFace Spaces
CNN Knowledge: Convolutional layers, pooling, stride, feature maps applied
"""

import io
import os
import json
import time
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


def _handle_image_input(image) -> Image.Image:
    """Unified image input handler — accepts numpy, base64, path, PIL"""
    if isinstance(image, np.ndarray):
        return Image.fromarray(image).convert("RGB")
    elif isinstance(image, str):
        if image.startswith("data:"):
            img_data = base64.b64decode(image.split(",")[1])
            return Image.open(io.BytesIO(img_data)).convert("RGB")
        else:
            return Image.open(image).convert("RGB")
    elif isinstance(image, Image.Image):
        return image.convert("RGB")
    else:
        return Image.open(image).convert("RGB")


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

        voice = "en-GB-RyanNeural"
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

@spaces.GPU(duration=60)
def gemma_chat(message: str, system_prompt: str = "", max_tokens: int = 1024, temperature: float = 0.7) -> str:
    """Chat with Gemma 4 on ZeroGPU"""
    if not message or not message.strip():
        return ""

    if not _check_gpu():
        return json.dumps({
            "error": "gpu_unavailable",
            "message": "Gemma 4 requires GPU (ZeroGPU).",
            "fallback": True,
        })

    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM

    model_id = "google/gemma-4-4b-it"
    if "gemma" not in _models:
        _models["gemma_tokenizer"] = AutoTokenizer.from_pretrained(model_id)
        _models["gemma"] = AutoModelForCausalLM.from_pretrained(
            model_id, torch_dtype=torch.bfloat16, device_map="cuda"
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
            "message": "BLIP Vision requires GPU.",
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

    img = _handle_image_input(image)
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
            device=-1,
        )

    img = _handle_image_input(image)
    results = _models["classifier"](img)

    return json.dumps([
        {"label": r["label"], "score": round(r["score"], 4)}
        for r in results[:5]
    ])


# ============================================================
# CNN Object Detection — DETR (GPU)
# Uses CNN backbone (ResNet-50) + Transformer decoder
# Feature maps from Conv layers → position encodings → attention
# ============================================================

def _get_detr():
    """Load DETR once on CPU, shared between GPU and CPU paths"""
    if "detr" not in _models:
        from transformers import DetrImageProcessor, DetrForObjectDetection
        model_id = "facebook/detr-resnet-50"
        _models["detr_processor"] = DetrImageProcessor.from_pretrained(model_id)
        _models["detr"] = DetrForObjectDetection.from_pretrained(model_id)  # CPU
    return _models["detr_processor"], _models["detr"]


@spaces.GPU(duration=45)
def cnn_detect_objects(image, threshold: float = 0.7) -> str:
    """Detect objects using DETR (CNN ResNet-50 backbone + Transformer)
    
    Single model instance: loads on CPU, moves to GPU only when ZeroGPU
    allocates one. Falls back to CPU transparently.
    """
    if image is None:
        return json.dumps({"error": "No image"})

    import torch
    processor, model = _get_detr()
    use_gpu = _check_gpu()
    device = "cuda" if use_gpu else "cpu"

    if use_gpu:
        model = model.to("cuda")

    img = _handle_image_input(image)
    inputs = processor(images=img, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    target_sizes = torch.tensor([img.size[::-1]]).to(device)
    results = processor.post_process_object_detection(outputs, target_sizes=target_sizes, threshold=threshold)[0]

    detections = []
    for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
        box = [round(b, 2) for b in box.tolist()]
        detections.append({
            "label": model.config.id2label[label.item()],
            "confidence": round(score.item(), 4),
            "bbox": {"x": box[0], "y": box[1], "w": box[2] - box[0], "h": box[3] - box[1]},
        })

    # Move back to CPU after GPU use to free VRAM
    if use_gpu:
        model = model.to("cpu")

    return json.dumps({
        "detections": detections,
        "count": len(detections),
        "model": "facebook/detr-resnet-50",
        "source": f"detr-{'gpu' if use_gpu else 'cpu'}",
        "architecture": "CNN(ResNet-50) + Transformer",
    }, ensure_ascii=False)

    import torch
    from transformers import DetrImageProcessor, DetrForObjectDetection

    model_id = "facebook/detr-resnet-50"
    if "detr" not in _models:
        _models["detr_processor"] = DetrImageProcessor.from_pretrained(model_id)
        _models["detr"] = DetrForObjectDetection.from_pretrained(model_id).to("cuda")

    processor = _models["detr_processor"]
    model = _models["detr"]

    img = _handle_image_input(image)
    inputs = processor(images=img, return_tensors="pt")
    inputs = {k: v.to("cuda") for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    target_sizes = torch.tensor([img.size[::-1]]).to("cuda")
    results = processor.post_process_object_detection(outputs, target_sizes=target_sizes, threshold=threshold)[0]

    detections = []
    for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
        box = [round(b, 2) for b in box.tolist()]
        detections.append({
            "label": model.config.id2label[label.item()],
            "confidence": round(score.item(), 4),
            "bbox": {"x": box[0], "y": box[1], "w": box[2] - box[0], "h": box[3] - box[1]},
        })

    return json.dumps({
        "detections": detections,
        "count": len(detections),
        "model": model_id,
        "source": "detr-gpu",
        "architecture": "CNN(ResNet-50) + Transformer",
    }, ensure_ascii=False)


def _cnn_detect_objects_cpu(image, threshold: float = 0.7) -> str:
    """CPU fallback for object detection using DETR"""
    from transformers import DetrImageProcessor, DetrForObjectDetection
    import torch

    model_id = "facebook/detr-resnet-50"
    if "detr_cpu" not in _models:
        _models["detr_cpu_processor"] = DetrImageProcessor.from_pretrained(model_id)
        _models["detr_cpu"] = DetrForObjectDetection.from_pretrained(model_id)

    processor = _models["detr_cpu_processor"]
    model = _models["detr_cpu"]

    img = _handle_image_input(image)
    inputs = processor(images=img, return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)

    target_sizes = torch.tensor([img.size[::-1]])
    results = processor.post_process_object_detection(outputs, target_sizes=target_sizes, threshold=threshold)[0]

    detections = []
    for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
        box = [round(b, 2) for b in box.tolist()]
        detections.append({
            "label": model.config.id2label[label.item()],
            "confidence": round(score.item(), 4),
            "bbox": {"x": box[0], "y": box[1], "w": box[2] - box[0], "h": box[3] - box[1]},
        })

    return json.dumps({
        "detections": detections,
        "count": len(detections),
        "model": model_id,
        "source": "detr-cpu",
        "architecture": "CNN(ResNet-50) + Transformer",
        "note": "Running on CPU — slower but functional",
    }, ensure_ascii=False)


# ============================================================
# CNN Feature Extraction — ResNet-50 intermediate layers (CPU)
# Extracts feature maps from different CNN depths
# ============================================================

def cnn_extract_features(image) -> str:
    """Extract CNN feature maps from ResNet-50 at different depths.
    
    Shows how convolutional layers build hierarchical representations:
    - Layer 1 (64 filters, 7×7 conv + maxpool): edges, gradients
    - Layer 2 (256 filters): textures, patterns  
    - Layer 3 (512 filters): object parts
    - Layer 4 (2048 filters): high-level semantics
    
    Returns per-layer statistics (mean activation, spatial dims)
    useful for transfer learning and feature similarity.
    """
    if image is None:
        return json.dumps({"error": "No image"})

    import torch
    from torchvision import models, transforms

    if "resnet_feat" not in _models:
        model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
        model.eval()
        _models["resnet_feat"] = model

    model = _models["resnet_feat"]
    img = _handle_image_input(image)

    preprocess = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    tensor = preprocess(img).unsqueeze(0)

    # Hook into intermediate CNN layers
    features = {}
    hooks = []

    def make_hook(name):
        def hook_fn(module, input, output):
            features[name] = output.detach()
        return hook_fn

    # Register hooks on each ResNet layer block
    layer_map = {
        "conv1_7x7": model.conv1,         # 64 filters, stride 2
        "maxpool": model.maxpool,           # 3×3 maxpool, stride 2
        "layer1_256ch": model.layer1,       # 256 channels
        "layer2_512ch": model.layer2,       # 512 channels
        "layer3_1024ch": model.layer3,      # 1024 channels
        "layer4_2048ch": model.layer4,      # 2048 channels
    }

    for name, layer in layer_map.items():
        hooks.append(layer.register_forward_hook(make_hook(name)))

    with torch.no_grad():
        output = model(tensor)
        probs = torch.nn.functional.softmax(output[0], dim=0)
        top5 = torch.topk(probs, 5)

    # Remove hooks
    for h in hooks:
        h.remove()

    # Build feature analysis
    feature_analysis = {}
    for name, feat in features.items():
        f = feat[0]  # batch dim
        feature_analysis[name] = {
            "channels": int(f.shape[0]),
            "spatial": f"{f.shape[1]}×{f.shape[2]}",
            "mean_activation": round(float(f.mean()), 4),
            "max_activation": round(float(f.max()), 4),
            "sparsity": round(float((f == 0).sum()) / float(f.numel()) * 100, 1),
        }

    # Top-5 ImageNet predictions
    weights = models.ResNet50_Weights.IMAGENET1K_V2
    categories = weights.meta["categories"]
    predictions = [
        {"label": categories[idx], "score": round(score.item(), 4)}
        for score, idx in zip(top5.values, top5.indices)
    ]

    # Compute 2048-d feature vector (global average pooling of layer4)
    if "layer4_2048ch" in features:
        feat_vec = features["layer4_2048ch"][0].mean(dim=[1, 2])  # GAP
        feat_norm = feat_vec / feat_vec.norm()
        embedding = feat_norm.tolist()
    else:
        embedding = []

    return json.dumps({
        "predictions": predictions,
        "feature_layers": feature_analysis,
        "embedding_dim": len(embedding),
        "embedding": embedding[:32],  # First 32 dims (full is 2048)
        "model": "resnet50",
        "source": "cnn-features-cpu",
        "architecture_notes": {
            "conv1": "7×7 conv, stride 2 → learns edge/gradient filters (like Sobel but optimized)",
            "maxpool": "3×3 maxpool, stride 2 → translation invariance, downsample 2x",
            "layer1-4": "Residual blocks with 3×3 convs, batch norm, ReLU → hierarchical features",
            "gap": "Global Average Pooling → spatial dims collapsed to 1×1 → 2048-d vector",
        },
    }, ensure_ascii=False)


# ============================================================
# CNN Depth Estimation — DPT/MiDaS (GPU with CPU fallback)
# Uses CNN encoder for monocular depth from single image
# ============================================================

@spaces.GPU(duration=30)
def cnn_depth_estimate(image) -> str:
    """Estimate depth map from single image using DPT (CNN-based).
    
    DPT uses a Vision Transformer with CNN-like convolution heads
    to produce dense per-pixel depth predictions.
    The feature pyramid (multi-scale CNN concept) fuses features
    from different transformer stages.
    """
    if image is None:
        return json.dumps({"error": "No image"})

    import torch
    from transformers import DPTForDepthEstimation, DPTImageProcessor

    model_id = "Intel/dpt-large"
    use_gpu = _check_gpu()
    device = "cuda" if use_gpu else "cpu"
    cache_key = f"dpt_{device}"

    if cache_key not in _models:
        _models[f"{cache_key}_processor"] = DPTImageProcessor.from_pretrained(model_id)
        dtype = torch.float16 if use_gpu else torch.float32
        _models[cache_key] = DPTForDepthEstimation.from_pretrained(
            model_id, torch_dtype=dtype
        ).to(device)

    processor = _models[f"{cache_key}_processor"]
    model = _models[cache_key]

    img = _handle_image_input(image)
    inputs = processor(images=img, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        depth = outputs.predicted_depth

    # Normalize depth to 0-255 for visualization
    depth_np = depth.squeeze().cpu().numpy()
    depth_min = depth_np.min()
    depth_max = depth_np.max()
    depth_norm = ((depth_np - depth_min) / (depth_max - depth_min + 1e-8) * 255).astype(np.uint8)

    # Resize to original image size
    depth_img = Image.fromarray(depth_norm)
    depth_img = depth_img.resize(img.size, Image.BILINEAR)

    # Encode depth map as base64
    buf = io.BytesIO()
    depth_img.save(buf, format="PNG")
    depth_b64 = base64.b64encode(buf.getvalue()).decode()

    # Compute depth statistics
    return json.dumps({
        "depth_map_b64": depth_b64,
        "stats": {
            "min_depth": round(float(depth_min), 2),
            "max_depth": round(float(depth_max), 2),
            "mean_depth": round(float(depth_np.mean()), 2),
            "std_depth": round(float(depth_np.std()), 2),
        },
        "resolution": f"{depth_norm.shape[1]}×{depth_norm.shape[0]}",
        "model": model_id,
        "source": f"dpt-{'gpu' if use_gpu else 'cpu'}",
    }, ensure_ascii=False)


# ============================================================
# CNN Image Segmentation — SegFormer (GPU with CPU fallback)
# Semantic segmentation: per-pixel classification via CNN decoder
# ============================================================

@spaces.GPU(duration=30)
def cnn_segment(image) -> str:
    """Semantic segmentation using SegFormer (CNN decoder head).
    
    SegFormer: Mix Transformer encoder + lightweight All-MLP decoder.
    The decoder uses 1×1 convolutions (pointwise conv) to fuse
    multi-scale features — a key CNN concept for dense prediction.
    Output: per-pixel class labels (150 ADE20K categories).
    """
    if image is None:
        return json.dumps({"error": "No image"})

    import torch
    from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation

    model_id = "nvidia/segformer-b0-finetuned-ade-512-512"
    use_gpu = _check_gpu()
    device = "cuda" if use_gpu else "cpu"
    cache_key = f"segformer_{device}"

    if cache_key not in _models:
        _models[f"{cache_key}_processor"] = SegformerImageProcessor.from_pretrained(model_id)
        _models[cache_key] = SegformerForSemanticSegmentation.from_pretrained(model_id).to(device)

    processor = _models[f"{cache_key}_processor"]
    model = _models[cache_key]

    img = _handle_image_input(image)
    inputs = processor(images=img, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits  # (1, num_classes, H, W)
    upsampled = torch.nn.functional.interpolate(
        logits, size=img.size[::-1], mode="bilinear", align_corners=False
    )
    seg_map = upsampled.argmax(dim=1)[0].cpu().numpy()

    # Count unique segments
    unique_ids, counts = np.unique(seg_map, return_counts=True)
    total_pixels = seg_map.size

    # ADE20K label names (top categories)
    ade20k_labels = {
        0: "wall", 1: "building", 2: "sky", 3: "floor", 4: "tree", 5: "ceiling",
        6: "road", 7: "bed", 8: "windowpane", 9: "grass", 10: "cabinet",
        11: "sidewalk", 12: "person", 13: "earth", 14: "door", 15: "table",
        16: "mountain", 17: "plant", 18: "curtain", 19: "chair", 20: "car",
        21: "water", 22: "painting", 23: "sofa", 24: "shelf", 25: "house",
        26: "sea", 27: "mirror", 28: "rug", 29: "field", 30: "armchair",
        31: "seat", 32: "fence", 33: "desk", 34: "rock", 35: "wardrobe",
        36: "lamp", 37: "bathtub", 38: "railing", 39: "cushion", 40: "base",
        41: "box", 42: "column", 43: "signboard", 44: "chest", 45: "counter",
        46: "sand", 47: "sink", 48: "skyscraper", 49: "fireplace", 50: "refrigerator",
    }

    segments = []
    for uid, count in sorted(zip(unique_ids, counts), key=lambda x: -x[1]):
        label = ade20k_labels.get(int(uid), f"class_{uid}")
        pct = round(count / total_pixels * 100, 1)
        if pct >= 0.5:  # Only report segments > 0.5% area
            segments.append({"id": int(uid), "label": label, "area_pct": pct})

    # Create colored segmentation mask
    np.random.seed(42)
    palette = np.random.randint(0, 255, (151, 3), dtype=np.uint8)
    palette[0] = [0, 0, 0]
    color_seg = palette[seg_map]
    seg_img = Image.fromarray(color_seg)

    buf = io.BytesIO()
    seg_img.save(buf, format="PNG")
    seg_b64 = base64.b64encode(buf.getvalue()).decode()

    return json.dumps({
        "segments": segments[:20],
        "total_classes": len(unique_ids),
        "segmentation_map_b64": seg_b64,
        "model": model_id,
        "source": f"segformer-{'gpu' if use_gpu else 'cpu'}",
    }, ensure_ascii=False)


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
            "message": "Whisper STT requires GPU.",
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
# OCR — EasyOCR (CPU)
# ============================================================

def ocr_extract(image) -> str:
    if image is None:
        return json.dumps({"error": "No image provided"})
    try:
        reader = get_ocr()
        if isinstance(image, np.ndarray):
            img_array = image
        else:
            img = _handle_image_input(image)
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
# Phi-3.5 Vision — Multimodal VQA (GPU)
# ============================================================

_phi3v_flash_installed = False

def _ensure_flash_attn():
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
    """Analyze image with Phi-3.5-vision-instruct on GPU"""
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
        _ensure_flash_attn()

        _models["phi3v_processor"] = AutoProcessor.from_pretrained(
            model_id, trust_remote_code=True, num_crops=16
        )

        try:
            import flash_attn  # noqa: F401
            attn_impl = "flash_attention_2"
        except ImportError:
            attn_impl = "eager"

        _models["phi3v"] = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype="auto",
            trust_remote_code=True,
            device_map="cuda",
            _attn_implementation=attn_impl,
        )

    processor = _models["phi3v_processor"]
    model = _models["phi3v"]

    img = _handle_image_input(image)

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
        "version": "3.0.0",
        "hardware": "ZeroGPU" if (HAS_ZEROGPU and gpu_available) else "CPU Free",
        "gpu": {
            "available": gpu_available,
            "name": gpu_name,
            "vram_gb": gpu_vram,
            "zerogpu_decorator": HAS_ZEROGPU,
        },
        "models_loaded": list(_models.keys()),
        "capabilities": {
            "gpu": ["gemma4_llm", "blip_vision", "whisper_stt", "phi3_vision", "detr_detection", "depth_estimation", "segmentation"],
            "cpu": ["tts", "ocr", "embeddings", "pdf", "vision_classify", "cnn_features", "detr_detection_cpu", "segmentation_cpu", "depth_cpu"],
            "always_available": ["health"],
        },
        "cnn_architecture_notes": {
            "detr": "ResNet-50 CNN backbone → Transformer encoder/decoder → bbox + class",
            "segformer": "Mix Transformer encoder → 1×1 conv (pointwise) MLP decoder → per-pixel labels",
            "dpt": "ViT encoder → CNN reassemble layers → dense depth prediction",
            "resnet50": "7×7 conv→maxpool→residual blocks(3×3 conv)→GAP→FC classification",
        },
        "endpoint_status": {
            "gemma_chat": "gpu_required" if not gpu_available else "ready",
            "vision_caption": "gpu_required" if not gpu_available else "ready",
            "whisper_stt": "gpu_required" if not gpu_available else "ready",
            "phi3_vision": "gpu_required" if not gpu_available else "ready",
            "cnn_detect": "ready (gpu+cpu)",
            "cnn_features": "ready (cpu)",
            "cnn_depth": "ready (gpu+cpu)",
            "cnn_segment": "ready (gpu+cpu)",
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

with gr.Blocks(title="ORION Neural Hub v3.0", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🧠 ORION Neural Hub v3.0\n**ZeroGPU** — Gemma 4, Phi-3.5 Vision, BLIP, Whisper STT, JARVIS TTS, OCR, Embeddings, PDF\n**NEW CNN:** DETR Detection, Segmentation, Depth, Feature Extraction")

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

    with gr.Tab("📦 CNN Detection (DETR)"):
        gr.Markdown("**Object detection** with DETR (CNN ResNet-50 backbone + Transformer decoder)\n\nGPU accelerated with CPU fallback. Detects 91 COCO categories.")
        det_image = gr.Image(label="Upload Image", type="numpy")
        det_thresh = gr.Slider(0.3, 0.95, value=0.7, step=0.05, label="Confidence Threshold")
        det_output = gr.JSON(label="Detections")
        det_btn = gr.Button("📦 Detect Objects", variant="primary")
        det_btn.click(fn=cnn_detect_objects, inputs=[det_image, det_thresh], outputs=det_output, api_name="cnn_detect")

    with gr.Tab("🧬 CNN Features"):
        gr.Markdown("**Feature extraction** from ResNet-50 CNN layers\n\nShows activation maps at different depths: edges → textures → parts → objects")
        feat_image = gr.Image(label="Upload Image", type="numpy")
        feat_output = gr.JSON(label="Feature Analysis")
        feat_btn = gr.Button("🧬 Extract Features", variant="primary")
        feat_btn.click(fn=cnn_extract_features, inputs=feat_image, outputs=feat_output, api_name="cnn_features")

    with gr.Tab("🗺️ CNN Segmentation"):
        gr.Markdown("**Semantic segmentation** with SegFormer (1×1 conv decoder)\n\nPer-pixel classification into 150 categories (ADE20K)")
        seg_image = gr.Image(label="Upload Image", type="numpy")
        seg_output = gr.JSON(label="Segmentation Result")
        seg_btn = gr.Button("🗺️ Segment", variant="primary")
        seg_btn.click(fn=cnn_segment, inputs=seg_image, outputs=seg_output, api_name="cnn_segment")

    with gr.Tab("🌊 CNN Depth"):
        gr.Markdown("**Monocular depth estimation** with DPT (CNN reassemble heads)\n\nEstimates relative depth from a single image")
        dep_image = gr.Image(label="Upload Image", type="numpy")
        dep_output = gr.JSON(label="Depth Result")
        dep_btn = gr.Button("🌊 Estimate Depth", variant="primary")
        dep_btn.click(fn=cnn_depth_estimate, inputs=dep_image, outputs=dep_output, api_name="cnn_depth")

    with gr.Tab("🎤 Whisper STT"):
        gr.Markdown("Speech-to-text with Whisper Large v3 Turbo on GPU")
        stt_audio = gr.Audio(label="Record/Upload Audio", type="numpy")
        stt_lang = gr.Dropdown(["pt", "en", "es", "fr", "de", "it"], value="pt", label="Language")
        stt_output = gr.JSON(label="Transcription")
        stt_btn = gr.Button("🎤 Transcribe", variant="primary")
        stt_btn.click(fn=whisper_stt, inputs=[stt_audio, stt_lang], outputs=stt_output, api_name="whisper_stt")

    with gr.Tab("🗣️ JARVIS TTS"):
        gr.Markdown("Generate speech with JARVIS voice (Edge TTS, CPU)")
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
        gr.Markdown("Multimodal image analysis with Phi-3.5-vision-instruct on GPU")
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
