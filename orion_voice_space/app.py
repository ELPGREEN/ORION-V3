"""
Orion Voice RVC — Ultra-Light (2GB RAM)
Uses ONNX Runtime instead of PyTorch for minimal memory footprint.
"""

import os
import io
import time
import tempfile
import subprocess
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import Response, JSONResponse

app = FastAPI()

# ── Lazy-load ONNX model ──
_model_session = None

def get_rvc_session():
    """Load ONNX RVC model lazily (~200MB vs 2GB PyTorch)"""
    global _model_session
    if _model_session is None:
        import onnxruntime as ort
        model_path = os.environ.get("RVC_MODEL_PATH", "model.onnx")
        if os.path.exists(model_path):
            opts = ort.SessionOptions()
            opts.inter_op_num_threads = 2
            opts.intra_op_num_threads = 2
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            _model_session = ort.InferenceSession(model_path, opts, providers=["CPUExecutionProvider"])
            print(f"[RVC] ONNX model loaded: {model_path}")
        else:
            print(f"[RVC] No ONNX model found at {model_path}, using passthrough mode")
    return _model_session


def load_wav(path: str) -> tuple:
    """Load WAV using scipy (no librosa/torch needed)"""
    from scipy.io import wavfile
    sr, data = wavfile.read(path)
    if data.dtype == np.int16:
        data = data.astype(np.float32) / 32768.0
    elif data.dtype == np.int32:
        data = data.astype(np.float32) / 2147483648.0
    if len(data.shape) > 1:
        data = data.mean(axis=1)
    return sr, data


def save_wav(path: str, sr: int, data: np.ndarray):
    """Save WAV using scipy"""
    from scipy.io import wavfile
    if data.dtype == np.float32 or data.dtype == np.float64:
        data = np.clip(data, -1.0, 1.0)
        data = (data * 32767).astype(np.int16)
    wavfile.write(path, sr, data)


def resample_audio(data: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    """Resample using scipy (no librosa)"""
    if orig_sr == target_sr:
        return data
    from scipy.signal import resample
    num_samples = int(len(data) * target_sr / orig_sr)
    return resample(data, num_samples).astype(np.float32)


def apply_rvc_onnx(audio: np.ndarray, sr: int, pitch_shift: int = 0) -> np.ndarray:
    """Run audio through ONNX RVC model"""
    session = get_rvc_session()
    if session is None:
        # Passthrough with basic voice enhancement
        return apply_basic_voice_effect(audio, sr, pitch_shift)

    # Resample to model expected rate (16kHz typical for RVC)
    audio_16k = resample_audio(audio, sr, 16000)

    # Prepare input
    audio_input = audio_16k.reshape(1, -1).astype(np.float32)

    try:
        input_name = session.get_inputs()[0].name
        result = session.run(None, {input_name: audio_input})
        output = result[0].flatten().astype(np.float32)
        # Resample back
        output = resample_audio(output, 16000, sr)
        return output
    except Exception as e:
        print(f"[RVC] ONNX inference error: {e}")
        return apply_basic_voice_effect(audio, sr, pitch_shift)


def apply_basic_voice_effect(audio: np.ndarray, sr: int, pitch_shift: int = 0) -> np.ndarray:
    """Fallback: pitch shift + formant via ffmpeg (zero memory overhead)"""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_in:
        save_wav(tmp_in.name, sr, audio)
        tmp_out = tmp_in.name.replace(".wav", "_out.wav")

    try:
        # Use ffmpeg for pitch shifting (ultra-light)
        if pitch_shift != 0:
            # asetrate changes pitch, aresample restores sample rate
            factor = 2 ** (pitch_shift / 12.0)
            cmd = [
                "ffmpeg", "-y", "-i", tmp_in.name,
                "-af", f"asetrate={int(sr * factor)},aresample={sr},atempo={1/factor}",
                "-ar", str(sr), tmp_out
            ]
        else:
            # Just normalize
            cmd = ["ffmpeg", "-y", "-i", tmp_in.name, "-af", "loudnorm", "-ar", str(sr), tmp_out]

        subprocess.run(cmd, capture_output=True, timeout=30)

        if os.path.exists(tmp_out):
            _, result = load_wav(tmp_out)
            os.unlink(tmp_out)
            os.unlink(tmp_in.name)
            return result
    except Exception as e:
        print(f"[RVC] ffmpeg fallback error: {e}")

    os.unlink(tmp_in.name)
    return audio


@app.post("/rvc_convert")
async def rvc_convert(
    audio: UploadFile = File(...),
    pitch_shift: int = Form(0),
    index_rate: float = Form(0.75),
):
    start = time.time()

    try:
        # Save uploaded audio
        content = await audio.read()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # Convert to WAV if needed (via ffmpeg, handles any format)
        wav_path = tmp_path + "_converted.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_path, "-ar", "44100", "-ac", "1", wav_path],
            capture_output=True, timeout=30
        )

        if not os.path.exists(wav_path):
            wav_path = tmp_path

        # Load and process
        sr, audio_data = load_wav(wav_path)
        result = apply_rvc_onnx(audio_data, sr, pitch_shift)

        # Save result
        out_path = tmp_path + "_result.wav"
        save_wav(out_path, sr, result)

        with open(out_path, "rb") as f:
            wav_bytes = f.read()

        # Cleanup
        for p in [tmp_path, wav_path, out_path]:
            if os.path.exists(p):
                os.unlink(p)

        elapsed = time.time() - start
        print(f"[RVC] Converted in {elapsed:.2f}s ({len(wav_bytes)} bytes)")

        return Response(content=wav_bytes, media_type="audio/wav")

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/rvc_health")
async def health():
    import psutil
    mem = psutil.virtual_memory()
    return {
        "status": "ok",
        "model_loaded": _model_session is not None,
        "memory_used_mb": round(mem.used / 1024 / 1024),
        "memory_total_mb": round(mem.total / 1024 / 1024),
        "memory_percent": mem.percent,
    }


@app.get("/")
async def root():
    return {"service": "Orion Voice RVC", "version": "2.0-light", "max_ram": "2GB"}
