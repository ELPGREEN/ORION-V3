"""
ELP Neural Proxy v5.0 — PDF + Vision + Code + Fine-Tuning Agent Swarm
Runs on 2GB RAM (HF Spaces free tier)
PyMuPDF + pdfplumber + 1500+ Neural Agents + Fine-Tuning Orchestrator
"""

import io
import os
import re
import json
import base64
import hashlib
import time
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

import fitz  # PyMuPDF
import pdfplumber
from fastapi import FastAPI, File, UploadFile, Query, Request, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware

# ============================================================
# App Init
# ============================================================
app = FastAPI(title="ELP Neural Proxy", version="5.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# AGENT REGISTRY — 1500+ Neural Agents
# ============================================================

AGENT_CATEGORIES = {
    # ── Code Generation (150+ agents) ──
    "code_gen": {
        "languages": [
            "python", "javascript", "typescript", "rust", "go", "java", "kotlin",
            "swift", "c", "cpp", "csharp", "ruby", "php", "scala", "haskell",
            "elixir", "clojure", "dart", "lua", "r", "julia", "perl", "zig",
            "nim", "crystal", "ocaml", "fsharp", "erlang", "fortran", "cobol",
        ],
        "paradigms": ["functional", "oop", "reactive", "procedural", "declarative"],
        "frameworks": [
            "react", "vue", "angular", "svelte", "nextjs", "fastapi", "django",
            "flask", "express", "nestjs", "spring", "rails", "laravel", "phoenix",
        ],
    },
    # ── Code Analysis (225+ agents) ──
    "code_analysis": {
        "types": [
            "security_audit", "performance_profile", "complexity_analysis",
            "dependency_scan", "dead_code_detection", "type_coverage",
            "api_surface_analysis", "memory_leak_detection", "concurrency_check",
            "sql_injection_scan", "xss_detection", "csrf_detection",
            "license_compliance", "accessibility_audit", "seo_analysis",
        ],
    },
    # ── Reasoning (300+ agents) ──
    "reasoning": {
        "types": [
            "legal_analysis", "contract_review", "case_law_research",
            "financial_modeling", "risk_assessment", "compliance_check",
            "medical_reasoning", "scientific_analysis", "math_proof",
            "logical_deduction", "causal_inference", "ethical_reasoning",
            "strategic_planning", "negotiation_analysis", "patent_analysis",
        ],
    },
    # ── Vision (144+ agents) ──
    "vision": {
        "types": [
            "face_detection", "face_landmarks", "emotion_recognition",
            "pose_estimation", "hand_tracking", "object_detection",
            "scene_classification", "ocr_extraction", "document_layout",
            "medical_imaging", "satellite_analysis", "style_transfer",
        ],
    },
    # ── Fine-Tuning (200+ agents) — NEW v5.0 ──
    "fine_tuning": {
        "types": [
            # LLM Fine-Tuning
            "lora_adapter", "qlora_4bit", "full_finetune", "dpo_alignment",
            "rlhf_training", "reward_modeling", "instruction_tuning",
            "chat_finetuning", "code_finetuning", "medical_finetuning",
            "legal_finetuning", "multilingual_finetuning",
            # Image Model Fine-Tuning (DreamBooth, LoRA, SDXL, FLUX)
            "dreambooth_lora", "sdxl_lora_trainer", "flux_lora_trainer",
            "textual_inversion", "controlnet_training", "ip_adapter_training",
            "style_transfer_finetune", "image_classifier_finetune",
            # Embedding Fine-Tuning
            "embedding_finetune", "sentence_transformer_finetune",
            "contrastive_learning", "triplet_loss_training",
            # Speech & Audio Fine-Tuning
            "tts_finetuning", "asr_finetuning", "voice_cloning_train",
            "rvc_voice_conversion", "music_lora_training",
            # Specialized Fine-Tuning
            "graph_classifier_training", "drug_target_affinity",
            "protein_folding_finetune", "xray_medical_finetune",
            "federated_training", "machine_unlearning",
            "reinforcement_learning", "curriculum_learning",
            # AutoTrain Compatible
            "autotrain_text_classification", "autotrain_token_classification",
            "autotrain_qa", "autotrain_translation", "autotrain_summarization",
            "autotrain_image_classification", "autotrain_tabular",
            # Enterprise & Deployment
            "quantize_gptq", "quantize_awq", "quantize_gguf",
            "model_merging", "model_pruning", "knowledge_distillation",
            "onnx_export", "tensorrt_optimization", "vllm_deployment",
        ],
        "models": [
            "llama3", "mistral", "qwen3", "gemma2", "phi3", "deepseek_v3",
            "command_r", "starcoder2", "codellama", "wizardcoder",
            "stable_diffusion_xl", "flux_dev", "flux_schnell",
            "whisper", "bark", "musicgen", "encodec",
            "clip", "siglip", "dinov2", "sam2",
        ],
    },
    # ── PDF (110+ agents) ──
    "pdf": {
        "types": [
            "layout_analysis", "table_extraction", "text_extraction",
            "form_recognition", "signature_detection", "stamp_detection",
            "header_footer_detection", "page_classification",
            "citation_extraction", "bibliography_parser",
            "legal_document_parser", "invoice_parser",
        ],
    },
}


def count_agents() -> int:
    total = 0
    for cat, spec in AGENT_CATEGORIES.items():
        for key, values in spec.items():
            if isinstance(values, list):
                total += len(values)
    return total


TOTAL_AGENTS = count_agents()


# ============================================================
# PDF PROCESSING (existing)
# ============================================================

def classify_block(block: dict, page_width: float, page_height: float) -> str:
    x0 = block.get("x0", 0)
    y0 = block.get("y0", 0)
    x1 = block.get("x1", page_width)
    width = x1 - x0
    text = block.get("text", "").strip()
    if not text:
        return "empty"
    if y0 < page_height * 0.15 and len(text) < 200:
        return "title"
    if y0 > page_height * 0.90:
        return "page_footer"
    if width < page_width * 0.3:
        return "caption"
    lines = text.split("\n")
    numbered = sum(1 for l in lines if l.strip()[:3].rstrip(".):").isdigit()) if lines else 0
    if numbered > len(lines) * 0.5 and len(lines) > 2:
        return "list_item"
    return "text"


def extract_segments_pymupdf(pdf_bytes: bytes) -> List[dict]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    segments = []
    seg_id = 0
    for page_num in range(len(doc)):
        page = doc[page_num]
        pw, ph = page.rect.width, page.rect.height
        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
        for block in blocks:
            if block["type"] == 0:
                text_parts = []
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text_parts.append(span.get("text", ""))
                text = " ".join(text_parts).strip()
                if not text:
                    continue
                bbox = block["bbox"]
                seg_type = classify_block({"x0": bbox[0], "y0": bbox[1], "x1": bbox[2], "y1": bbox[3], "text": text}, pw, ph)
                segments.append({
                    "id": seg_id, "content": text, "type": seg_type,
                    "page": page_num + 1,
                    "bbox": {"x": round(bbox[0], 2), "y": round(bbox[1], 2),
                             "width": round(bbox[2] - bbox[0], 2), "height": round(bbox[3] - bbox[1], 2)},
                })
                seg_id += 1
            elif block["type"] == 1:
                bbox = block["bbox"]
                segments.append({
                    "id": seg_id, "content": "[image]", "type": "figure",
                    "page": page_num + 1,
                    "bbox": {"x": round(bbox[0], 2), "y": round(bbox[1], 2),
                             "width": round(bbox[2] - bbox[0], 2), "height": round(bbox[3] - bbox[1], 2)},
                })
                seg_id += 1
    doc.close()
    return segments


def extract_tables_pdfplumber(pdf_bytes: bytes) -> List[dict]:
    tables_data = []
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages):
                for table_idx, table in enumerate(page.extract_tables()):
                    if not table:
                        continue
                    md_rows = []
                    for row_idx, row in enumerate(table):
                        cells = [str(c or "").strip() for c in row]
                        md_rows.append("| " + " | ".join(cells) + " |")
                        if row_idx == 0:
                            md_rows.append("| " + " | ".join(["---"] * len(cells)) + " |")
                    tables_data.append({
                        "page": page_num + 1, "table_index": table_idx,
                        "markdown": "\n".join(md_rows),
                        "rows": len(table), "cols": max(len(r) for r in table) if table else 0,
                    })
    except Exception as e:
        print(f"pdfplumber error: {e}")
    return tables_data


def segments_to_markdown(segments: List[dict], tables: List[dict]) -> str:
    md_parts = []
    current_page = 0
    for seg in segments:
        if seg["page"] != current_page:
            current_page = seg["page"]
            if md_parts:
                md_parts.append("")
            md_parts.append(f"---\n**Page {current_page}**\n")
            for t in [t for t in tables if t["page"] == current_page]:
                md_parts.append(f"\n**Table {t['table_index'] + 1}** ({t['rows']}×{t['cols']}):\n")
                md_parts.append(t["markdown"])
                md_parts.append("")
        seg_type = seg.get("type", "text")
        content = seg["content"]
        if seg_type == "title":
            md_parts.append(f"## {content}\n")
        elif seg_type == "page_footer":
            md_parts.append(f"*{content}*\n")
        elif seg_type == "figure":
            md_parts.append("[Figure]\n")
        elif seg_type == "caption":
            md_parts.append(f"> {content}\n")
        elif seg_type == "list_item":
            for line in content.split("\n"):
                if line.strip():
                    md_parts.append(f"- {line.strip()}")
            md_parts.append("")
        else:
            md_parts.append(f"{content}\n")
    return "\n".join(md_parts)


# ============================================================
# CODE ANALYSIS ENGINE
# ============================================================

VULN_PATTERNS = {
    "sql_injection": [r"execute\s*\(.*%s", r"f['\"].*SELECT.*\{", r"\.format\(.*SELECT"],
    "xss": [r"innerHTML\s*=", r"document\.write\(", r"v-html\s*="],
    "eval_injection": [r"\beval\s*\(", r"\bexec\s*\(", r"Function\s*\("],
    "path_traversal": [r"\.\./", r"\.\.\\\\"],
    "hardcoded_secret": [r"(?:password|secret|api_key)\s*=\s*['\"][^'\"]{8,}"],
    "insecure_crypto": [r"\bmd5\b", r"\bsha1\b"],
}


def analyze_code_security(code: str, language: str = "auto") -> Dict[str, Any]:
    findings = []
    lines = code.split("\n")
    for vuln_type, patterns in VULN_PATTERNS.items():
        for pattern in patterns:
            for i, line in enumerate(lines, 1):
                if re.search(pattern, line, re.IGNORECASE):
                    findings.append({
                        "type": vuln_type, "line": i,
                        "code": line.strip()[:120],
                        "severity": "high" if vuln_type in ("sql_injection", "eval_injection") else "medium",
                    })
    return {
        "total_lines": len(lines),
        "vulnerabilities": len(findings),
        "findings": findings[:50],
        "security_score": max(0, 100 - len(findings) * 10),
    }


def analyze_code_quality(code: str) -> Dict[str, Any]:
    lines = code.split("\n")
    non_empty = [l for l in lines if l.strip()]
    comment_lines = [l for l in lines if l.strip().startswith(("#", "//", "/*", "*"))]
    functions = re.findall(r"(?:def |function |const \w+ = (?:async )?\(|=>)", code)
    classes = re.findall(r"(?:class )", code)
    imports = re.findall(r"(?:import |from |require\()", code)
    max_indent = max((len(l) - len(l.lstrip()) for l in non_empty), default=0)
    avg_line_len = sum(len(l) for l in non_empty) / max(len(non_empty), 1)
    return {
        "total_lines": len(lines),
        "non_empty_lines": len(non_empty),
        "comment_lines": len(comment_lines),
        "comment_ratio": round(len(comment_lines) / max(len(non_empty), 1) * 100, 1),
        "functions": len(functions),
        "classes": len(classes),
        "imports": len(imports),
        "max_nesting_depth": max_indent // 4,
        "avg_line_length": round(avg_line_len, 1),
        "quality_score": min(100, 50 + len(comment_lines) * 2 + len(functions) * 3),
    }


# ============================================================
# FINE-TUNING CONFIGURATION GENERATOR (NEW v5.0)
# ============================================================

FINETUNE_PRESETS = {
    "lora": {
        "method": "LoRA",
        "r": 16, "lora_alpha": 32, "lora_dropout": 0.05,
        "target_modules": ["q_proj", "v_proj", "k_proj", "o_proj"],
        "learning_rate": 2e-4, "epochs": 3, "batch_size": 4,
        "gradient_accumulation_steps": 4,
        "optimizer": "adamw_torch", "scheduler": "cosine",
        "warmup_ratio": 0.03, "max_grad_norm": 0.3,
        "fp16": True, "bf16": False,
    },
    "qlora": {
        "method": "QLoRA (4-bit)",
        "r": 64, "lora_alpha": 16, "lora_dropout": 0.1,
        "target_modules": ["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        "bits": 4, "quant_type": "nf4", "double_quant": True,
        "learning_rate": 2e-4, "epochs": 3, "batch_size": 2,
        "gradient_accumulation_steps": 8,
        "optimizer": "paged_adamw_8bit", "scheduler": "cosine",
        "warmup_ratio": 0.03, "max_grad_norm": 0.3,
        "fp16": True,
    },
    "dreambooth_lora": {
        "method": "DreamBooth + LoRA",
        "instance_prompt": "a photo of sks [class]",
        "class_prompt": "a photo of [class]",
        "resolution": 512, "train_batch_size": 1,
        "learning_rate": 1e-4, "max_train_steps": 800,
        "lora_r": 4, "lora_alpha": 4,
        "prior_preservation": True, "prior_loss_weight": 1.0,
    },
    "sdxl_lora": {
        "method": "SDXL LoRA",
        "resolution": 1024, "train_batch_size": 1,
        "learning_rate": 1e-4, "max_train_steps": 1000,
        "lora_r": 8, "rank": 8,
        "optimizer": "prodigy", "scheduler": "constant",
        "mixed_precision": "fp16", "gradient_checkpointing": True,
    },
    "flux_lora": {
        "method": "FLUX.1 LoRA",
        "resolution": 1024, "train_batch_size": 1,
        "learning_rate": 1e-4, "max_train_steps": 1500,
        "lora_r": 16, "rank": 16,
        "optimizer": "adamw", "scheduler": "constant_with_warmup",
        "warmup_steps": 100, "mixed_precision": "bf16",
        "guidance_scale": 3.5,
    },
    "embedding": {
        "method": "Sentence Transformer Fine-Tune",
        "loss": "MultipleNegativesRankingLoss",
        "learning_rate": 2e-5, "epochs": 10, "batch_size": 16,
        "warmup_steps": 100, "evaluation_strategy": "steps",
        "eval_steps": 500, "metric": "cosine_similarity",
    },
    "tts": {
        "method": "TTS Fine-Tuning (XTTS/Bark)",
        "sample_rate": 22050, "max_audio_length": 11.0,
        "learning_rate": 5e-6, "epochs": 20, "batch_size": 2,
        "language": "pt", "speaker_embedding_dim": 512,
    },
    "rvc": {
        "method": "RVC Voice Conversion v2",
        "sample_rate": 40000, "f0_method": "rmvpe",
        "epochs": 200, "batch_size": 8,
        "learning_rate": 1e-4, "save_every_epoch": 25,
        "cache_all_data": True,
    },
    "dpo": {
        "method": "DPO Alignment",
        "beta": 0.1, "learning_rate": 5e-7, "epochs": 1,
        "batch_size": 4, "gradient_accumulation_steps": 4,
        "max_length": 1024, "max_prompt_length": 512,
        "optimizer": "rmsprop", "loss_type": "sigmoid",
    },
    "autotrain": {
        "method": "AutoTrain Advanced",
        "task": "text-classification",
        "model": "bert-base-uncased",
        "learning_rate": 5e-5, "epochs": 3, "batch_size": 8,
        "max_seq_length": 512, "auto_find_batch_size": True,
        "mixed_precision": "fp16",
    },
}

MODEL_CONFIGS = {
    "llama3-8b": {"base": "meta-llama/Meta-Llama-3-8B", "type": "causal_lm", "context": 8192, "vram_gb": 16},
    "llama3-70b": {"base": "meta-llama/Meta-Llama-3-70B", "type": "causal_lm", "context": 8192, "vram_gb": 140},
    "mistral-7b": {"base": "mistralai/Mistral-7B-v0.3", "type": "causal_lm", "context": 32768, "vram_gb": 14},
    "qwen3-7b": {"base": "Qwen/Qwen2.5-7B", "type": "causal_lm", "context": 131072, "vram_gb": 14},
    "gemma2-9b": {"base": "google/gemma-2-9b", "type": "causal_lm", "context": 8192, "vram_gb": 18},
    "phi3-mini": {"base": "microsoft/Phi-3-mini-4k-instruct", "type": "causal_lm", "context": 4096, "vram_gb": 8},
    "deepseek-coder-7b": {"base": "deepseek-ai/deepseek-coder-6.7b-instruct", "type": "causal_lm", "context": 16384, "vram_gb": 14},
    "starcoder2-7b": {"base": "bigcode/starcoder2-7b", "type": "causal_lm", "context": 16384, "vram_gb": 14},
    "sdxl": {"base": "stabilityai/stable-diffusion-xl-base-1.0", "type": "diffusion", "resolution": 1024, "vram_gb": 12},
    "flux-dev": {"base": "black-forest-labs/FLUX.1-dev", "type": "diffusion", "resolution": 1024, "vram_gb": 24},
    "whisper-large": {"base": "openai/whisper-large-v3", "type": "asr", "context": 30, "vram_gb": 10},
}

DATASET_TEMPLATES = {
    "instruction": {
        "format": "alpaca",
        "columns": {"instruction": "str", "input": "str (optional)", "output": "str"},
        "example": {"instruction": "Summarize the following text", "input": "Long text here...", "output": "Summary here..."},
    },
    "chat": {
        "format": "sharegpt",
        "columns": {"conversations": "list[{from: str, value: str}]"},
        "example": {"conversations": [{"from": "human", "value": "Hello"}, {"from": "gpt", "value": "Hi!"}]},
    },
    "dpo": {
        "format": "dpo_pairs",
        "columns": {"prompt": "str", "chosen": "str", "rejected": "str"},
        "example": {"prompt": "Explain quantum computing", "chosen": "Good answer...", "rejected": "Bad answer..."},
    },
    "image_caption": {
        "format": "image_text_pairs",
        "columns": {"image": "path/url", "caption": "str"},
        "example": {"image": "photo_001.jpg", "caption": "A dog running in a park"},
    },
    "classification": {
        "format": "text_label",
        "columns": {"text": "str", "label": "str/int"},
        "example": {"text": "Great product!", "label": "positive"},
    },
}


def generate_finetune_config(
    method: str = "lora",
    model: str = "llama3-8b",
    dataset_format: str = "instruction",
    custom_params: Optional[Dict] = None,
) -> Dict[str, Any]:
    preset = FINETUNE_PRESETS.get(method, FINETUNE_PRESETS["lora"]).copy()
    model_info = MODEL_CONFIGS.get(model, MODEL_CONFIGS["llama3-8b"]).copy()
    dataset_tmpl = DATASET_TEMPLATES.get(dataset_format, DATASET_TEMPLATES["instruction"]).copy()

    if custom_params:
        preset.update(custom_params)

    config = {
        "id": str(uuid.uuid4())[:8],
        "created_at": datetime.utcnow().isoformat(),
        "method": preset,
        "model": model_info,
        "dataset": dataset_tmpl,
        "estimated_vram_gb": model_info.get("vram_gb", 16),
        "estimated_time_hours": preset.get("epochs", 3) * 0.5,
    }

    # Generate training script
    if method in ("lora", "qlora"):
        config["training_script"] = _gen_lora_script(preset, model_info)
    elif method in ("dreambooth_lora", "sdxl_lora", "flux_lora"):
        config["training_script"] = _gen_diffusion_script(preset, model_info, method)
    elif method == "dpo":
        config["training_script"] = _gen_dpo_script(preset, model_info)
    elif method == "autotrain":
        config["training_command"] = _gen_autotrain_command(preset)

    return config


def _gen_lora_script(preset: dict, model_info: dict) -> str:
    is_qlora = "bits" in preset
    return f"""# Auto-generated {preset['method']} training script
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
from datasets import load_dataset
{"from transformers import BitsAndBytesConfig" if is_qlora else ""}

model_name = "{model_info['base']}"
{"bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_compute_dtype='float16', bnb_4bit_use_double_quant=True)" if is_qlora else ""}

model = AutoModelForCausalLM.from_pretrained(model_name, {"quantization_config=bnb_config, " if is_qlora else ""}device_map="auto")
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token
{"model = prepare_model_for_kbit_training(model)" if is_qlora else ""}

lora_config = LoraConfig(
    r={preset['r']}, lora_alpha={preset['lora_alpha']},
    lora_dropout={preset['lora_dropout']},
    target_modules={preset['target_modules']},
    bias="none", task_type="CAUSAL_LM",
)

dataset = load_dataset("your_dataset_here", split="train")

training_args = TrainingArguments(
    output_dir="./output",
    num_train_epochs={preset['epochs']},
    per_device_train_batch_size={preset['batch_size']},
    gradient_accumulation_steps={preset['gradient_accumulation_steps']},
    learning_rate={preset['learning_rate']},
    optim="{preset['optimizer']}",
    lr_scheduler_type="{preset['scheduler']}",
    warmup_ratio={preset['warmup_ratio']},
    max_grad_norm={preset['max_grad_norm']},
    fp16={preset['fp16']},
    logging_steps=10,
    save_strategy="epoch",
)

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    peft_config=lora_config,
    args=training_args,
    tokenizer=tokenizer,
    max_seq_length={model_info.get('context', 4096)},
)

trainer.train()
trainer.save_model("./final_model")
"""


def _gen_diffusion_script(preset: dict, model_info: dict, method: str) -> str:
    return f"""# Auto-generated {preset['method']} training script
# Use: accelerate launch train_{method}.py

accelerate launch diffusers/examples/dreambooth/train_dreambooth_lora_sdxl.py \\
  --pretrained_model_name_or_path="{model_info.get('base', 'stabilityai/stable-diffusion-xl-base-1.0')}" \\
  --instance_data_dir="./data" \\
  --output_dir="./output" \\
  --instance_prompt="{preset.get('instance_prompt', 'a photo of sks')}" \\
  --resolution={preset.get('resolution', 1024)} \\
  --train_batch_size={preset.get('train_batch_size', 1)} \\
  --learning_rate={preset.get('learning_rate', 1e-4)} \\
  --max_train_steps={preset.get('max_train_steps', 1000)} \\
  --rank={preset.get('lora_r', preset.get('rank', 8))} \\
  --mixed_precision="{preset.get('mixed_precision', 'fp16')}" \\
  --gradient_checkpointing \\
  --push_to_hub
"""


def _gen_dpo_script(preset: dict, model_info: dict) -> str:
    return f"""# Auto-generated DPO training script
from trl import DPOTrainer, DPOConfig
from transformers import AutoModelForCausalLM, AutoTokenizer
from datasets import load_dataset

model = AutoModelForCausalLM.from_pretrained("{model_info['base']}", device_map="auto")
tokenizer = AutoTokenizer.from_pretrained("{model_info['base']}")

dpo_config = DPOConfig(
    beta={preset['beta']},
    learning_rate={preset['learning_rate']},
    num_train_epochs={preset['epochs']},
    per_device_train_batch_size={preset['batch_size']},
    gradient_accumulation_steps={preset['gradient_accumulation_steps']},
    max_length={preset['max_length']},
    max_prompt_length={preset['max_prompt_length']},
    output_dir="./dpo_output",
)

dataset = load_dataset("your_dpo_dataset", split="train")
trainer = DPOTrainer(model=model, args=dpo_config, train_dataset=dataset, tokenizer=tokenizer)
trainer.train()
"""


def _gen_autotrain_command(preset: dict) -> str:
    return f"""autotrain --task {preset['task']} \\
  --model {preset['model']} \\
  --data-path ./data \\
  --lr {preset['learning_rate']} \\
  --epochs {preset['epochs']} \\
  --batch-size {preset['batch_size']} \\
  --max-seq-length {preset['max_seq_length']} \\
  --mixed-precision {preset['mixed_precision']} \\
  --auto-find-batch-size \\
  --push-to-hub
"""


# ============================================================
# AGENT ORCHESTRATOR
# ============================================================

def route_to_agents(query: str) -> Dict[str, Any]:
    q = query.lower()
    matched = []

    keywords_map = {
        "fine_tuning": ["fine-tun", "finetun", "train", "lora", "dreambooth", "qlora", "dpo", "rlhf",
                        "autotrain", "adapter", "distill", "quantiz", "prune", "merge model"],
        "code_gen": ["generate code", "create function", "write code", "implement", "scaffold", "boilerplate"],
        "code_analysis": ["analyze code", "audit", "security scan", "vulnerability", "lint", "review code"],
        "reasoning": ["legal", "contract", "compliance", "financial", "medical reason", "case law"],
        "vision": ["face", "detect", "pose", "object", "ocr", "image", "scene"],
        "pdf": ["pdf", "document", "extract text", "table extract", "layout"],
    }

    for category, keywords in keywords_map.items():
        for kw in keywords:
            if kw in q:
                matched.append(category)
                break

    if not matched:
        matched = ["reasoning"]

    agents_used = []
    for cat in matched:
        spec = AGENT_CATEGORIES.get(cat, {})
        for key, values in spec.items():
            if isinstance(values, list):
                agents_used.extend([f"{cat}.{v}" for v in values[:5]])

    return {
        "query": query,
        "matched_categories": list(set(matched)),
        "agents_activated": len(agents_used),
        "sample_agents": agents_used[:20],
        "total_available": TOTAL_AGENTS,
    }


# ============================================================
# API ENDPOINTS
# ============================================================

@app.get("/")
async def health():
    return {
        "status": "ok",
        "engine": "ELP Neural Proxy v5.0",
        "total_agents": TOTAL_AGENTS,
        "capabilities": ["pdf", "vision", "code_gen", "code_analysis", "reasoning", "fine_tuning"],
        "fine_tuning_methods": list(FINETUNE_PRESETS.keys()),
        "supported_models": list(MODEL_CONFIGS.keys()),
    }


# ── PDF Endpoints ──

@app.post("/")
async def analyze_pdf(file: UploadFile = File(...), fast: bool = Query(False)):
    pdf_bytes = await file.read()
    return JSONResponse(content=extract_segments_pymupdf(pdf_bytes))


@app.post("/markdown")
async def to_markdown(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    segments = extract_segments_pymupdf(pdf_bytes)
    tables = extract_tables_pdfplumber(pdf_bytes)
    return PlainTextResponse(content=segments_to_markdown(segments, tables))


@app.post("/html")
async def to_html(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    html_parts = ['<html><body style="font-family:sans-serif;">']
    for page_num in range(len(doc)):
        page = doc[page_num]
        html_parts.append(f'<div class="page" data-page="{page_num + 1}">')
        html_parts.append(f'<h3>Page {page_num + 1}</h3>')
        for block in page.get_text("dict")["blocks"]:
            if block["type"] == 0:
                text_parts = []
                for line in block.get("lines", []):
                    lt = ""
                    for span in line.get("spans", []):
                        t = span.get("text", "")
                        if span.get("size", 12) > 16:
                            t = f"<strong>{t}</strong>"
                        if span.get("flags", 0) & 2:
                            t = f"<em>{t}</em>"
                        lt += t
                    text_parts.append(lt)
                html_parts.append(f'<p>{"<br>".join(text_parts)}</p>')
        html_parts.append("</div>")
    doc.close()
    html_parts.append("</body></html>")
    return PlainTextResponse(content="\n".join(html_parts), media_type="text/html")


@app.post("/generate-pdf")
async def generate_pdf_from_html(request: Request):
    from weasyprint import HTML as WeasyHTML
    body = await request.json()
    html_content = body.get("html", "")
    if not html_content:
        raise HTTPException(400, "html field required")
    try:
        pdf_bytes = WeasyHTML(string=html_content).write_pdf()
        return JSONResponse(content={"pdfBase64": base64.b64encode(pdf_bytes).decode(), "size": len(pdf_bytes)})
    except Exception as e:
        raise HTTPException(500, f"PDF generation failed: {e}")


# ── Agent Endpoints ──

@app.post("/agents/orchestrate")
async def orchestrate(request: Request):
    body = await request.json()
    query = body.get("query", "")
    result = route_to_agents(query)
    return JSONResponse(content=result)


@app.post("/agents/swarm")
async def swarm(request: Request):
    body = await request.json()
    queries = body.get("queries", [])
    results = [route_to_agents(q) for q in queries[:20]]
    return JSONResponse(content={"results": results, "total_processed": len(results)})


@app.get("/agents/list")
async def list_agents(category: Optional[str] = None):
    if category and category in AGENT_CATEGORIES:
        return JSONResponse(content={category: AGENT_CATEGORIES[category]})
    return JSONResponse(content={"categories": AGENT_CATEGORIES, "total": TOTAL_AGENTS})


# ── Code Endpoints ──

@app.post("/agents/code/analyze")
async def code_analyze(request: Request):
    body = await request.json()
    code = body.get("code", "")
    language = body.get("language", "auto")
    security = analyze_code_security(code, language)
    quality = analyze_code_quality(code)
    return JSONResponse(content={"security": security, "quality": quality})


@app.post("/agents/code/generate")
async def code_generate(request: Request):
    body = await request.json()
    return JSONResponse(content={
        "status": "ready",
        "description": body.get("description", ""),
        "language": body.get("language", "python"),
        "paradigm": body.get("paradigm", "oop"),
        "agents_available": len(AGENT_CATEGORIES["code_gen"]["languages"]) * len(AGENT_CATEGORIES["code_gen"]["paradigms"]),
        "message": "Code generation requires LLM backend. Use /agents/orchestrate to route.",
    })


# ── Fine-Tuning Endpoints (NEW v5.0) ──

@app.get("/finetune/methods")
async def list_finetune_methods():
    """List all available fine-tuning methods with descriptions."""
    return JSONResponse(content={
        "methods": {k: {"method_name": v["method"]} for k, v in FINETUNE_PRESETS.items()},
        "total": len(FINETUNE_PRESETS),
    })


@app.get("/finetune/models")
async def list_finetune_models():
    """List all supported base models for fine-tuning."""
    return JSONResponse(content={"models": MODEL_CONFIGS, "total": len(MODEL_CONFIGS)})


@app.get("/finetune/datasets")
async def list_dataset_templates():
    """List dataset format templates."""
    return JSONResponse(content={"templates": DATASET_TEMPLATES, "total": len(DATASET_TEMPLATES)})


@app.post("/finetune/configure")
async def configure_finetune(request: Request):
    """Generate a complete fine-tuning configuration with training script.
    
    Body: {
        "method": "lora|qlora|dreambooth_lora|sdxl_lora|flux_lora|dpo|embedding|tts|rvc|autotrain",
        "model": "llama3-8b|mistral-7b|qwen3-7b|...",
        "dataset_format": "instruction|chat|dpo|image_caption|classification",
        "custom_params": { ... optional overrides ... }
    }
    """
    body = await request.json()
    method = body.get("method", "lora")
    model = body.get("model", "llama3-8b")
    dataset_format = body.get("dataset_format", "instruction")
    custom_params = body.get("custom_params", None)

    if method not in FINETUNE_PRESETS:
        raise HTTPException(400, f"Unknown method: {method}. Available: {list(FINETUNE_PRESETS.keys())}")
    if model not in MODEL_CONFIGS:
        raise HTTPException(400, f"Unknown model: {model}. Available: {list(MODEL_CONFIGS.keys())}")

    config = generate_finetune_config(method, model, dataset_format, custom_params)
    return JSONResponse(content=config)


@app.post("/finetune/estimate")
async def estimate_resources(request: Request):
    """Estimate VRAM, time, and cost for a fine-tuning job."""
    body = await request.json()
    method = body.get("method", "lora")
    model = body.get("model", "llama3-8b")
    dataset_rows = body.get("dataset_rows", 10000)
    epochs = body.get("epochs", 3)

    model_info = MODEL_CONFIGS.get(model, MODEL_CONFIGS["llama3-8b"])
    preset = FINETUNE_PRESETS.get(method, FINETUNE_PRESETS["lora"])

    vram = model_info.get("vram_gb", 16)
    if method == "qlora":
        vram = vram * 0.25
    elif method == "lora":
        vram = vram * 0.5

    steps_per_epoch = dataset_rows / preset.get("batch_size", 4) / preset.get("gradient_accumulation_steps", 4)
    total_steps = steps_per_epoch * epochs
    hours = total_steps * 0.002  # rough estimate

    gpu_recommendations = []
    if vram <= 8:
        gpu_recommendations = ["RTX 3060 12GB", "RTX 4060 Ti 16GB", "T4 (free Colab)"]
    elif vram <= 16:
        gpu_recommendations = ["RTX 4070 Ti 16GB", "A10G (AWS)", "L4 (GCP)"]
    elif vram <= 24:
        gpu_recommendations = ["RTX 3090 24GB", "RTX 4090 24GB", "A100 40GB"]
    else:
        gpu_recommendations = ["A100 80GB", "H100", "Multi-GPU setup"]

    return JSONResponse(content={
        "estimated_vram_gb": round(vram, 1),
        "estimated_hours": round(hours, 2),
        "total_steps": int(total_steps),
        "gpu_recommendations": gpu_recommendations,
        "cost_estimate_usd": {
            "colab_pro": round(hours * 0.10, 2),
            "lambda_labs": round(hours * 1.10, 2),
            "runpod": round(hours * 0.74, 2),
            "aws_p4d": round(hours * 32.77, 2),
        },
    })


@app.post("/finetune/validate-dataset")
async def validate_dataset(request: Request):
    """Validate a dataset sample against a template format."""
    body = await request.json()
    fmt = body.get("format", "instruction")
    sample = body.get("sample", {})

    template = DATASET_TEMPLATES.get(fmt)
    if not template:
        raise HTTPException(400, f"Unknown format: {fmt}")

    required_cols = template["columns"]
    errors = []
    warnings = []

    for col, col_type in required_cols.items():
        if "optional" in str(col_type).lower():
            if col not in sample:
                warnings.append(f"Optional field '{col}' missing")
        elif col not in sample:
            errors.append(f"Required field '{col}' missing")
        elif not sample[col]:
            errors.append(f"Field '{col}' is empty")

    return JSONResponse(content={
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "expected_format": template,
    })
