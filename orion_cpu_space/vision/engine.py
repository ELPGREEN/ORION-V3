"""
Orion Vision Engine — CPU-tier object detection and classification.

Uses EasyOCR (already loaded) for text detection and a lightweight
classification approach via CLIP/MiniLM embeddings on CPU.
For heavy GPU models (YOLOv11, SAM2) → route to orion-gpu HF Space.
"""

import logging
import time
from typing import List, Dict, Any, Optional
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

# Lazy-loaded models (shared singleton pattern)
_vision_models: Dict[str, Any] = {}


def _get_classifier():
    """Lazy-load a lightweight zero-shot classifier (CLIP ViT-B/32 on CPU)."""
    if "classifier" not in _vision_models:
        try:
            from transformers import pipeline
            _vision_models["classifier"] = pipeline(
                "zero-shot-image-classification",
                model="openai/clip-vit-base-patch32",
                device=-1,  # CPU
            )
            logger.info("✅ CLIP classifier loaded (CPU)")
        except ImportError:
            logger.warning("⚠️ transformers not available — classifier disabled")
            _vision_models["classifier"] = None
        except Exception as e:
            logger.error(f"❌ Failed to load CLIP classifier: {e}")
            _vision_models["classifier"] = None
    return _vision_models["classifier"]


def _get_detector():
    """Lazy-load a lightweight object detector (DETR on CPU)."""
    if "detector" not in _vision_models:
        try:
            from transformers import pipeline
            _vision_models["detector"] = pipeline(
                "object-detection",
                model="facebook/detr-resnet-50",
                device=-1,  # CPU
            )
            logger.info("✅ DETR detector loaded (CPU)")
        except ImportError:
            logger.warning("⚠️ transformers not available — detector disabled")
            _vision_models["detector"] = None
        except Exception as e:
            logger.error(f"❌ Failed to load DETR detector: {e}")
            _vision_models["detector"] = None
    return _vision_models["detector"]


def detect_objects(image: Image.Image, confidence_threshold: float = 0.5) -> Dict[str, Any]:
    """
    Detect objects in an image using DETR (CPU).
    Falls back to OCR-based text detection if DETR is unavailable.
    """
    start = time.time()
    detector = _get_detector()

    if detector is None:
        # Fallback: return OCR-based "detection" for text regions
        return {
            "detections": [],
            "count": 0,
            "model": "unavailable",
            "fallback": True,
            "message": "GPU detector not loaded on CPU tier. Use /ocr for text detection or orion-gpu Space for full object detection.",
            "gpu_endpoint": "https://ericsonv12-orion-gpu.hf.space",
            "duration_ms": int((time.time() - start) * 1000),
        }

    results = detector(image, threshold=confidence_threshold)

    detections = []
    for r in results:
        box = r["box"]
        detections.append({
            "label": r["label"],
            "confidence": round(float(r["score"]), 4),
            "bbox": {
                "x_min": box["xmin"],
                "y_min": box["ymin"],
                "x_max": box["xmax"],
                "y_max": box["ymax"],
            },
        })

    return {
        "detections": detections,
        "count": len(detections),
        "model": "detr-resnet-50",
        "duration_ms": int((time.time() - start) * 1000),
    }


def classify_image(
    image: Image.Image,
    candidate_labels: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Zero-shot image classification using CLIP (CPU).
    """
    start = time.time()
    classifier = _get_classifier()

    if candidate_labels is None:
        candidate_labels = [
            "industrial equipment", "person", "vehicle", "robot",
            "recycling material", "tire", "conveyor belt", "warehouse",
            "office", "outdoor scene", "document", "food", "animal",
        ]

    if classifier is None:
        return {
            "classifications": [],
            "model": "unavailable",
            "fallback": True,
            "message": "CLIP classifier not loaded. Use orion-gpu Space for full classification.",
            "gpu_endpoint": "https://ericsonv12-orion-gpu.hf.space",
            "duration_ms": int((time.time() - start) * 1000),
        }

    results = classifier(image, candidate_labels=candidate_labels)

    classifications = [
        {"label": r["label"], "confidence": round(float(r["score"]), 4)}
        for r in results
    ]

    return {
        "classifications": classifications,
        "top_label": classifications[0]["label"] if classifications else None,
        "model": "clip-vit-base-patch32",
        "candidate_labels": candidate_labels,
        "duration_ms": int((time.time() - start) * 1000),
    }


def get_vision_status() -> Dict[str, Any]:
    """Return current vision capabilities status."""
    return {
        "detector": {
            "loaded": "detector" in _vision_models and _vision_models["detector"] is not None,
            "model": "detr-resnet-50",
            "tier": "cpu",
        },
        "classifier": {
            "loaded": "classifier" in _vision_models and _vision_models["classifier"] is not None,
            "model": "clip-vit-base-patch32",
            "tier": "cpu",
        },
        "gpu_fallback": "https://ericsonv12-orion-gpu.hf.space",
        "capabilities": ["object_detection", "zero_shot_classification", "ocr"],
    }
