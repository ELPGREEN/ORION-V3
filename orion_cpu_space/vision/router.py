"""
Vision API Router — Mounts under /vision/* in the main FastAPI app.
Keeps api.py clean with a single `app.include_router(vision_router)`.
"""

import io
import logging
from typing import Optional, List

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image

from vision.engine import detect_objects, classify_image, get_vision_status

logger = logging.getLogger(__name__)

vision_router = APIRouter(prefix="/vision", tags=["vision"])


@vision_router.get("/status")
async def vision_status():
    """Vision subsystem health and capabilities."""
    return get_vision_status()


@vision_router.post("/detect")
async def detect_endpoint(
    file: UploadFile = File(...),
    confidence: float = Form(0.5),
):
    """
    Object detection on an uploaded image.
    Uses DETR (CPU) with fallback info for GPU tier.
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        result = detect_objects(image, confidence_threshold=confidence)
        return result
    except Exception as e:
        logger.error(f"Vision detect error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "endpoint": "vision/detect"},
        )


@vision_router.post("/classify")
async def classify_endpoint(
    file: UploadFile = File(...),
    labels: Optional[str] = Form(None),
):
    """
    Zero-shot image classification.
    Optionally provide comma-separated candidate labels.
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        candidate_labels = None
        if labels:
            candidate_labels = [l.strip() for l in labels.split(",") if l.strip()]

        result = classify_image(image, candidate_labels=candidate_labels)
        return result
    except Exception as e:
        logger.error(f"Vision classify error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "endpoint": "vision/classify"},
        )
