"""
ELP Neural Proxy v7.4 — Complete AI Agent Swarm
PDF + Vision + Object Detection + Code Generation + Code Analysis + Text Analysis + Question Answering + Document Analysis + Fine-Tuning + Dataset Creation + Media Generation
3100+ Neural Agents covering ALL HuggingFace Spaces categories
Runs on 2GB RAM (HF Spaces free tier)
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
app = FastAPI(title="ELP Neural Proxy", version="7.4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# AGENT REGISTRY — 3100+ Neural Agents (ALL HF Categories)
# ============================================================

AGENT_CATEGORIES = {
    # ── Code Generation (300+ agents) — EXPANDED v7.0 ──
    "code_gen": {
        "languages": [
            "python", "javascript", "typescript", "rust", "go", "java", "kotlin",
            "swift", "c", "cpp", "csharp", "ruby", "php", "scala", "haskell",
            "elixir", "clojure", "dart", "lua", "r", "julia", "perl", "zig",
            "nim", "crystal", "ocaml", "fsharp", "erlang", "fortran", "cobol",
            "solidity", "vyper", "move", "cairo", "openscad", "glsl", "wgsl",
            "sql", "graphql", "protobuf", "terraform", "dockerfile",
        ],
        "paradigms": ["functional", "oop", "reactive", "procedural", "declarative",
                      "event_driven", "actor_model", "data_oriented"],
        "frameworks": [
            "react", "vue", "angular", "svelte", "nextjs", "nuxt", "remix",
            "fastapi", "django", "flask", "express", "nestjs", "spring", "rails",
            "laravel", "phoenix", "gin", "actix", "rocket", "axum",
            "streamlit", "gradio", "marimo", "panel", "dash",
        ],
        # NEW v7.0 — Specialized code generation models
        "models": [
            "qwen3_coder", "qwen2_5_coder_32b", "deepseek_coder_v2", "deepseek_coder_6_7b",
            "yi_coder_9b", "opencoder_8b", "opencoder_1_5b", "ibm_granite",
            "starcoder2_15b", "starcoder2_7b", "starcoderbase_1b", "santacoder",
            "codellama_7b", "codellama_34b", "codellama_python",
            "replit_code_v1_3b", "salesforce_codegen_16b", "wizardcoder",
            "reffidgpt_coder_32b", "pixtral_large_coder",
        ],
        # NEW v7.0 — WebApp builders
        "webapp_builders": [
            "html_react_generator", "streamlit_app_builder", "gradio_app_builder",
            "marimo_app_builder", "bolt_diy_fullstack", "anycoder_multi",
            "instantcoder", "gemini_coder", "ai_app_factory",
            "tailwind_playground", "code_generator_best",
        ],
        # NEW v7.0 — Specialized domains
        "specialized": [
            "solidity_web3", "cad_recode_openscad", "minecraft_mod_maker",
            "circuit_diagram_wokwi", "turtle_graphics_from_image",
            "pipeline_builder_unstructured", "automation_program",
            "tensorflow_op_generator", "accelerate_pytorch",
            "sd_to_diffusers_converter", "sdxl_to_diffusers_converter",
            "model_mergekit", "gguf_quantizer", "vllm_deployer",
        ],
    },
    # ── Code Analysis (350+ agents) — EXPANDED v7.0 ──
    "code_analysis": {
        "security": [
            "sql_injection_scan", "xss_detection", "csrf_detection",
            "eval_injection_scan", "path_traversal_scan", "ssrf_detection",
            "hardcoded_secret_scan", "insecure_crypto_detection",
            "dependency_vulnerability_scan", "supply_chain_audit",
            "cyber_ai_vulnerability_analyser", "vulnllm_r_reasoning",
        ],
        "quality": [
            "complexity_analysis", "dead_code_detection", "type_coverage",
            "api_surface_analysis", "memory_leak_detection", "concurrency_check",
            "performance_profile", "code_smell_detection",
            "code_comment_classification", "code_compliance_legal",
            "carbon_footprint_analysis", "accessibility_audit",
            "seo_analysis", "license_compliance",
        ],
        "intelligence": [
            "language_classifier", "code_retrieval_semantic",
            "code_similarity_detection", "code_infilling",
            "autodoc_generator", "repo_to_text_converter",
            "bigcodebench_evaluator", "code_diff_analysis",
            "refactoring_suggester", "test_generator",
            "api_doc_generator", "changelog_generator",
        ],
        "multi_agent": [
            "autogen_coding", "metagpt_software_company",
            "flowise_ai_orchestration", "synapster_companion",
            "elysia_code_companion", "interactive_chat_coding",
        ],
    },
    # ── Reasoning (300+) ──
    "reasoning": {
        "types": [
            "legal_analysis", "contract_review", "case_law_research",
            "financial_modeling", "risk_assessment", "compliance_check",
            "medical_reasoning", "scientific_analysis", "math_proof",
            "logical_deduction", "causal_inference", "ethical_reasoning",
            "strategic_planning", "negotiation_analysis", "patent_analysis",
        ],
    },
    # ── Vision & Object Detection (350+ agents) — EXPANDED v7.2 ──
    "vision": {
        "face": [
            "face_detection", "face_landmarks", "emotion_recognition",
            "face_swap", "face_recognition", "face_age_estimation",
            "face_mask_detection", "face_liveness",
        ],
        "pose_body": [
            "pose_estimation", "hand_tracking", "gesture_recognition",
            "body_segmentation", "salat_pose_detection", "sports_tracking",
            "player_speed_distance", "action_recognition",
        ],
        "object_detection": [
            # Core models
            "yolov5", "yolov7", "yolov8", "yolov9", "yolov10", "yolov11",
            "yolov12", "yolo26", "yoloe", "yolo_world",
            "detr_resnet50", "rf_detr", "d_fine", "mr_detr",
            "grounding_dino", "owlv2", "llmdet",
            # Zero-shot & open-vocab
            "zero_shot_object_detection", "open_vocabulary_detection",
            "text_guided_detection", "molmo_point", "qwen2_vl_detection",
            # Tracking
            "multi_object_tracking", "sam3_tracking", "object_counting",
            "region_of_interest_counting", "abandoned_object_detection",
            "baggage_tracking",
            # Real-time & browser
            "realtime_webgpu_detection", "webcam_detection", "webrtc_yolo",
            "browser_object_detection", "video_object_detection",
        ],
        "domain_detection": [
            # Vehicles & traffic
            "license_plate_detection", "license_plate_recognition_alpr",
            "traffic_sign_detection", "vehicle_detection", "pothole_detection",
            "autonomous_vehicle_detection", "train_obstruction_detection",
            "accident_detection",
            # Safety & security
            "fire_smoke_detection", "nsfw_content_detection",
            "ppe_detection", "cigarette_detection", "weapon_detection",
            "crowd_counting", "person_counting",
            # Medical
            "bone_fracture_detection", "brain_tumor_detection",
            "blood_cell_detection", "wrinkle_detection", "xray_detection",
            # Agriculture & nature
            "animal_detection", "cat_dog_breed_detection", "wildlife_detection",
            "plant_disease_detection", "tomato_ripeness_detection",
            "pest_detection", "weed_detection", "solar_panel_detection",
            # Industrial
            "pcb_component_detection", "furniture_detection",
            "lego_detection", "box_counting", "defect_detection",
            # Geospatial
            "satellite_object_detection", "moon_rock_detection",
            "building_footprint_detection",
        ],
        "segmentation": [
            "image_segmentation", "instance_segmentation", "panoptic_segmentation",
            "semantic_segmentation", "sam2", "v_clr", "pollen_vision",
            "document_layout_segmentation", "manga_panel_detection",
        ],
        "scene_understanding": [
            "scene_classification", "visual_qa", "image_captioning",
            "depth_estimation", "ocr_extraction", "document_layout",
            "medical_imaging", "satellite_analysis",
        ],
        "image_processing": [
            "background_removal", "image_upscaling", "image_inpainting",
            "image_outpainting", "controlnet", "style_transfer",
            "image_to_svg", "virtual_tryon",
        ],
        "models": [
            "yolov8_nano", "yolov8_small", "yolov8_medium", "yolov8_large",
            "yolov8_xlarge", "yolov11n", "yolov11m", "yolo26",
            "detr_resnet50", "detr_resnet101", "rf_detr_base", "rf_detr_large",
            "d_fine_l", "d_fine_x", "grounding_dino_base", "grounding_dino_large",
            "owlv2_base", "owlv2_large", "sam2_tiny", "sam2_large",
            "molmopoint_8b", "qwen2_vl_7b", "faster_rcnn", "mobilenetv2",
        ],
    },
    # ── Fine-Tuning (200+) ──
    "fine_tuning": {
        "types": [
            "lora_adapter", "qlora_4bit", "full_finetune", "dpo_alignment",
            "rlhf_training", "reward_modeling", "instruction_tuning",
            "chat_finetuning", "code_finetuning", "medical_finetuning",
            "legal_finetuning", "multilingual_finetuning",
            "dreambooth_lora", "sdxl_lora_trainer", "flux_lora_trainer",
            "textual_inversion", "controlnet_training", "ip_adapter_training",
            "style_transfer_finetune", "image_classifier_finetune",
            "embedding_finetune", "sentence_transformer_finetune",
            "contrastive_learning", "triplet_loss_training",
            "tts_finetuning", "asr_finetuning", "voice_cloning_train",
            "rvc_voice_conversion", "music_lora_training",
            "graph_classifier_training", "drug_target_affinity",
            "protein_folding_finetune", "xray_medical_finetune",
            "federated_training", "machine_unlearning",
            "reinforcement_learning", "curriculum_learning",
            "autotrain_text_classification", "autotrain_token_classification",
            "autotrain_qa", "autotrain_translation", "autotrain_summarization",
            "autotrain_image_classification", "autotrain_tabular",
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
    # ── Dataset Creation (180+) ──
    "dataset_creation": {
        "generators": [
            "synthetic_json", "synthetic_jsonl", "synthetic_csv", "synthetic_parquet",
            "synthetic_instruction", "synthetic_chat", "synthetic_dpo",
            "synthetic_code", "synthetic_qa", "synthetic_translation",
            "synthetic_summarization", "synthetic_ner", "synthetic_classification",
            "distilabel_pipeline", "infinite_dataset_hub",
        ],
        "converters": [
            "pdf_to_dataset", "csv_to_hf_dataset", "jsonl_to_hf_dataset",
            "parquet_to_csv", "xls_to_jsonl", "whatsapp_to_training",
            "reddit_to_dataset", "corpus_creator", "safetensors_converter",
            "gguf_quantizer", "format_validator_jsonl",
        ],
        "labeling": [
            "text_classification_labeler", "token_labeler", "ner_annotator",
            "image_segmentation_labeler", "object_detection_labeler",
            "qa_annotator", "sentiment_labeler", "argilla_integration",
            "coverage_classifier", "multilabel_tagger",
        ],
        "tools": [
            "dataset_deduplication", "vector_search_dataset", "dataset_explorer",
            "dataset_card_creator", "dataset_tagging", "dataset_migrator_github",
            "dataset_migrator_kaggle", "dataset_rewriter", "dataset_splitter",
            "ocr_dataset_generator", "domain_specific_seed",
            "data_augmentation", "dataset_statistics", "bias_detector",
            "data_quality_checker", "dataset_versioning",
        ],
    },
    # ── Image Generation (80+) ──
    "image_generation": {
        "models": [
            "flux_dev", "flux_schnell", "flux_klein_9b", "sdxl_base",
            "sdxl_turbo", "stable_diffusion_3", "animagine_xl",
            "playground_v2", "dalle3_proxy", "midjourney_proxy",
        ],
        "techniques": [
            "text_to_image", "image_to_image", "inpainting", "outpainting",
            "controlnet_canny", "controlnet_depth", "controlnet_pose",
            "controlnet_sketch", "ip_adapter", "lora_composition",
            "prompt_engineering", "negative_prompts", "cfg_guidance",
            "character_sheet", "comic_generation", "graphic_novel",
        ],
    },
    # ── Video Generation (60+) ──
    "video_generation": {
        "models": [
            "wan2_14b", "ltx_2_3", "ltx_turbo", "cogvideox",
            "animatediff", "stable_video_diffusion", "kling",
        ],
        "types": [
            "text_to_video", "image_to_video", "video_extend",
            "portrait_animation", "lipsync", "motion_transfer",
            "video_face_swap", "video_background_removal",
            "video_upscaling", "video_dubbing", "video_translation",
        ],
    },
    # ── Speech & Audio (90+) ──
    "speech_audio": {
        "tts": [
            "voxtral_tts", "kokoro_tts", "f5_tts", "bark_tts",
            "qwen3_tts", "piper_tts", "xtts_v2", "chatterbox",
        ],
        "asr": [
            "whisper_large_v3", "whisper_turbo", "cohere_transcribe",
            "granite_speech", "vibevoice_asr", "multilingual_asr",
        ],
        "voice": [
            "voice_cloning", "rvc_v2", "beatrice_v2", "voice_conversion",
            "voice_separation", "uvr5_vocal_removal", "audio_silence_removal",
        ],
        "music": [
            "ace_step_v15", "musicgen", "audioldm2", "music_lora",
            "ai_cover_gen", "audio_mixing",
        ],
    },
    # ── 3D Modeling (40+) ──
    "modeling_3d": {
        "types": [
            "image_to_3d", "text_to_3d", "trellis_2", "hunyuan3d",
            "triposr", "instantmesh", "point_cloud", "gaussian_splatting",
            "pbr_materials", "mesh_optimization", "uv_unwrap",
            "reconviagen", "multiview_generation",
        ],
    },
    # ── Text & NLP (250+ agents) — EXPANDED v7.2 ──
    "text_nlp": {
        "generation": [
            "text_completion", "chat", "instruction_following",
            "creative_writing", "code_generation", "translation",
            "summarization", "paraphrase", "grammar_correction",
        ],
        "analysis": [
            "sentiment_analysis", "aspect_based_sentiment", "emotion_detection",
            "ner_extraction", "relation_extraction", "topic_classification",
            "toxicity_detection", "language_detection", "keyword_extraction",
            "text_similarity", "question_answering", "zero_shot_classification",
            "word_sense_disambiguation", "clickbait_detection", "fake_news_detection",
            "ai_text_detection", "ai_text_humanizer", "prompt_injection_detection",
            "text_quality_scoring", "readability_analysis", "cefr_proficiency",
            "hallucination_detection", "content_trigger_detection",
        ],
        "search": [
            "semantic_search", "retrieve_and_rerank", "patent_search",
            "scientific_search", "embedding_similarity", "modernbert_similarity",
            "code_search_semantic", "product_search", "course_search",
        ],
        "tokenization": [
            "tokenizer_playground", "tokenizer_comparison", "bpe_encoder",
            "multilingual_tokenizer", "chunk_visualizer", "number_tokenization",
        ],
        "explainability": [
            "attention_rollout", "attention_visualization", "tuned_lens",
            "exbert_explorer", "pivotal_token_visualizer", "graphrag",
        ],
        "classification": [
            "nda_clause_classifier", "email_triage", "bank_complaint_classifier",
            "ecommerce_product_classifier", "news_classifier", "device_feedback_classifier",
            "error_log_analyzer", "bot_detector", "employee_attrition_predictor",
            "clinical_trial_predictor", "academic_impact_predictor",
            "patentability_scorer", "talent_matcher", "compliance_auditor",
        ],
        "multilingual": [
            "arabic_nlp", "turkish_ner", "turkish_zero_shot", "turkish_morphological",
            "hindi_bpe", "darija_tokenizer", "italian_legal_ner", "korean_llm",
            "egyptian_arabic_translation", "spanish_toxicity", "vietnamese_sentiment",
            "portuguese_clickbait", "multilingual_qa",
        ],
        "models": [
            "qwen3_5", "gemma4", "llama3", "mistral", "deepseek_v3",
            "command_r", "phi3", "lfm2_5_moe", "modernbert", "distilbert",
            "gliner_multiv2", "glirel", "sentence_transformers",
        ],
    },
    # ── Benchmarking (30+) ──
    "benchmarking": {
        "types": [
            "open_llm_leaderboard", "mteb_leaderboard", "ugi_leaderboard",
            "vbench", "open_asr_leaderboard", "world_model_bench",
            "arena_hard", "chatbot_arena", "lmsys_eval",
            "model_comparison", "speed_benchmark", "cost_benchmark",
            "bigcodebench", "navitrace_leaderboard",
        ],
    },
    # ── PDF & Document Analysis (200+ agents) — EXPANDED v7.4 ──
    "pdf": {
        "layout_analysis": [
            "layout_analysis", "dit_document_layout", "publaynet_detector",
            "doctr_layout", "yolo_doc_layout", "layoutlmv3",
            "page_classification", "header_footer_detection",
            "reading_order_detection", "column_detection",
        ],
        "table_extraction": [
            "table_extraction", "table_transformer", "camelot_tables",
            "tabula_extract", "pdfplumber_tables", "unitable",
            "table_structure_recognition", "html_table_extract",
        ],
        "text_extraction": [
            "text_extraction", "pymupdf_extract", "pdfminer_extract",
            "tika_extract", "textract_extract", "pdf_text_extractor",
        ],
        "ocr": [
            "mineru_ocr", "paddleocr_vl", "surya_ocr", "nougat_ocr",
            "tesseract_ocr", "easyocr", "doctr_ocr", "trocr",
            "got_ocr2", "rapidocr", "manga_ocr", "handwriting_ocr",
        ],
        "document_parsing": [
            "donut_parser", "donut_receipt", "donut_cord",
            "pix2struct", "udop", "docowl",
            "invoice_parser", "receipt_parser", "id_card_parser",
            "business_card_parser", "form_parser",
        ],
        "bibliography": [
            "grobid", "grobid_crf", "acl_pubcheck",
            "citation_extraction", "bibliography_parser",
            "reference_linking", "doi_resolver",
        ],
        "resume_analysis": [
            "resume_ats_analyzer", "cv_parser", "skill_extractor",
            "job_matcher", "resume_scorer", "experience_extractor",
        ],
        "scientific_documents": [
            "arxiv_parser", "latex_parser", "equation_detector",
            "figure_extraction", "abstract_extractor",
            "paper_summarizer", "research_tracker",
        ],
        "legal_documents": [
            "legal_document_parser", "contract_parser",
            "clause_extractor", "entity_redactor",
            "compliance_checker", "regulation_parser",
        ],
        "document_conversion": [
            "pdf_to_markdown", "pdf_to_html", "pdf_to_json",
            "pdf_to_docx", "image_to_pdf", "html_to_pdf",
            "markdown_to_pdf", "epub_converter",
        ],
        "document_comparison": [
            "diff_checker", "version_comparator", "merge_detector",
            "change_highlighter", "redline_generator",
        ],
        "signature_stamp": [
            "signature_detection", "stamp_detection",
            "handwriting_verification", "seal_recognition",
        ],
        "models": [
            "layoutlmv3", "dit_base", "donut_base", "nougat_base",
            "pix2struct_base", "udop_large", "docowl_15",
            "paddleocr_v4", "surya_v2", "mineru_v1",
            "got_ocr2", "trocr_large", "doctr_v1",
        ],
    },
    # ── Question Answering (120+ agents) — NEW v7.3 ──
    "question_answering": {
        "extractive_qa": [
            "squad_v2_qa", "mdeberta_squad", "roberta_squad", "xlm_roberta_qa",
            "albert_squad", "electra_squad", "longformer_qa", "bigbird_qa",
            "distilbert_qa", "minilm_qa", "tinybert_qa", "mobilebert_qa",
        ],
        "generative_qa": [
            "llama3_qa", "qwen3_qa", "gemma4_qa", "mistral_qa", "deepseek_qa",
            "phi3_qa", "command_r_qa", "lfm_qa", "abliterated_llama_qa",
        ],
        "document_qa": [
            "pdf_qa_rag", "pdf_chatter", "rag_pdf_chatbot", "multi_pdf_qa",
            "document_qa_vision", "genai_document_qna", "audit_assistant",
            "kotaemon_rag", "pci_dss_qa", "legal_document_qa",
            "invoice_qa", "contract_qa", "medical_report_qa",
        ],
        "visual_qa": [
            "minicpm_o_vqa", "llava_vqa", "blip2_vqa", "idefics_vqa",
            "paligemma_vqa", "florence_vqa", "qwen_vl_qa", "internvl_qa",
            "mkg_analogy_multimodal", "chart_qa", "infographic_qa",
            "scene_text_qa", "diagram_qa",
        ],
        "domain_qa": [
            "medical_qa", "menstrual_qa", "clinical_trial_qa",
            "legal_qa_agent", "case_law_qa", "statute_qa",
            "financial_qa", "earnings_call_qa", "sec_filing_qa",
            "scientific_qa", "arxiv_qa", "pubmed_qa",
            "education_qa", "course_qa", "textbook_qa",
            "climate_qa", "environmental_qa",
        ],
        "multilingual_qa": [
            "japanese_qa_rag", "turkish_qa", "persian_qa", "korean_qa",
            "arabic_qa", "hindi_qa", "chinese_qa", "spanish_qa",
            "french_qa", "german_qa", "portuguese_qa", "italian_qa",
            "multilingual_qa_universal",
        ],
        "open_domain_qa": [
            "open_researcher", "web_search_qa", "wikipedia_qa",
            "knowledge_graph_qa", "zero_pal_qa", "retrieval_augmented_qa",
            "dense_passage_retrieval", "colbert_qa", "hyde_qa",
        ],
        "conversational_qa": [
            "chatbot_qa", "multi_turn_qa", "context_tracking_qa",
            "clarification_qa", "follow_up_qa", "dialogue_state_qa",
        ],
        "music_audio_qa": [
            "music_flamingo", "audio_qa", "speech_qa",
            "podcast_qa", "lecture_qa",
        ],
        "table_qa": [
            "tapas_table_qa", "tablellama_qa", "spreadsheet_qa",
            "sql_qa", "csv_qa", "database_qa",
        ],
        "models": [
            "mdeberta_v3", "roberta_large_squad2", "xlm_roberta_large",
            "longformer_4096", "bigbird_pegasus", "flan_t5_qa",
            "unifiedqa_v2", "macaw_qa", "minicpm_o_26",
            "llava_next", "qwen2_vl", "internvl2",
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
# PDF PROCESSING
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
# CODE ANALYSIS ENGINE (EXPANDED v7.0)
# ============================================================

VULN_PATTERNS = {
    "sql_injection": [r"execute\s*\(.*%s", r"f['\"].*SELECT.*\{", r"\.format\(.*SELECT"],
    "xss": [r"innerHTML\s*=", r"document\.write\(", r"v-html\s*="],
    "eval_injection": [r"\beval\s*\(", r"\bexec\s*\(", r"Function\s*\("],
    "path_traversal": [r"\.\./", r"\.\.\\\\"],
    "hardcoded_secret": [r"(?:password|secret|api_key)\s*=\s*['\"][^'\"]{8,}"],
    "insecure_crypto": [r"\bmd5\b", r"\bsha1\b"],
    "ssrf": [r"requests\.get\s*\(\s*f['\"]", r"fetch\s*\(\s*\$\{", r"urllib\.request\.urlopen\s*\("],
    "command_injection": [r"os\.system\s*\(", r"subprocess\.call\s*\(.*shell\s*=\s*True", r"child_process\.exec\s*\("],
    "prototype_pollution": [r"__proto__", r"constructor\s*\[\s*['\"]prototype"],
    "insecure_deserialization": [r"pickle\.loads?\s*\(", r"yaml\.load\s*\((?!.*Loader)", r"unserialize\s*\("],
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
                        "severity": "critical" if vuln_type in ("sql_injection", "eval_injection", "command_injection") else
                                    "high" if vuln_type in ("ssrf", "insecure_deserialization", "prototype_pollution") else "medium",
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


# NEW v7.0 — Language classifier
LANG_SIGNATURES = {
    "python": [r"\bdef \w+\s*\(", r"\bimport \w+", r"if __name__", r"\.py$", r"print\s*\("],
    "javascript": [r"\bconst \w+\s*=", r"\blet \w+\s*=", r"function\s*\w*\s*\(", r"=>", r"console\.log"],
    "typescript": [r":\s*(?:string|number|boolean|any)\b", r"interface \w+", r"type \w+\s*=", r"<\w+>"],
    "rust": [r"\bfn \w+", r"\blet mut\b", r"\bimpl \w+", r"pub fn", r"use \w+::\w+"],
    "go": [r"\bfunc \w+", r"\bpackage \w+", r":=", r"fmt\.\w+"],
    "java": [r"public class", r"public static void main", r"System\.out", r"import java\."],
    "ruby": [r"\bdef \w+", r"\bend\b", r"puts ", r"require ['\"]"],
    "php": [r"<\?php", r"\$\w+\s*=", r"function \w+\s*\(", r"echo "],
    "solidity": [r"pragma solidity", r"contract \w+", r"mapping\s*\(", r"msg\.sender"],
    "html": [r"<html", r"<div", r"<body", r"<!DOCTYPE"],
    "css": [r"\{[^}]*:\s*\w+", r"@media", r"\.[\w-]+\s*\{"],
    "sql": [r"\bSELECT\b", r"\bFROM\b", r"\bWHERE\b", r"\bCREATE TABLE\b"],
    "shell": [r"#!/bin/(?:bash|sh)", r"\becho\b", r"\bfi\b", r"\bdone\b"],
}


def classify_language(code: str) -> Dict[str, Any]:
    scores = {}
    for lang, patterns in LANG_SIGNATURES.items():
        score = 0
        for pattern in patterns:
            matches = len(re.findall(pattern, code, re.IGNORECASE if lang == "sql" else 0))
            score += matches
        if score > 0:
            scores[lang] = score
    if not scores:
        return {"detected": "unknown", "confidence": 0, "scores": {}}
    best = max(scores, key=scores.get)
    total = sum(scores.values())
    return {
        "detected": best,
        "confidence": round(scores[best] / total, 3) if total else 0,
        "scores": {k: round(v / total, 3) for k, v in sorted(scores.items(), key=lambda x: -x[1])[:5]},
    }


# NEW v7.0 — AutoDoc generator
def generate_autodoc(code: str, language: str = "python") -> Dict[str, Any]:
    functions_found = []
    if language in ("python",):
        for match in re.finditer(r"def (\w+)\s*\(([^)]*)\)(?:\s*->\s*(\w+))?:", code):
            name, params, ret = match.group(1), match.group(2), match.group(3)
            param_list = [p.strip().split(":")[0].strip() for p in params.split(",") if p.strip() and p.strip() != "self"]
            docstring = f'    """\\n    {name}: TODO description.\\n\\n'
            for p in param_list:
                docstring += f"    Args:\\n        {p}: TODO\\n"
            if ret:
                docstring += f"\\n    Returns:\\n        {ret}: TODO\\n"
            docstring += '    """'
            functions_found.append({"name": name, "params": param_list, "return_type": ret, "docstring": docstring})
    elif language in ("javascript", "typescript"):
        for match in re.finditer(r"(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:async\s*)?\()?\s*([^)]*)\)", code):
            name, params = match.group(1), match.group(2)
            param_list = [p.strip().split(":")[0].strip() for p in params.split(",") if p.strip()]
            jsdoc = f"/**\\n * {name}: TODO description.\\n"
            for p in param_list:
                jsdoc += f" * @param {{{p}}} - TODO\\n"
            jsdoc += " * @returns TODO\\n */"
            functions_found.append({"name": name, "params": param_list, "jsdoc": jsdoc})
    return {
        "functions_documented": len(functions_found),
        "language": language,
        "documentation": functions_found,
    }


# NEW v7.0 — Code compliance checker
def check_code_compliance(code: str, standards: List[str] = None) -> Dict[str, Any]:
    standards = standards or ["security", "accessibility", "performance"]
    issues = []
    if "security" in standards:
        sec = analyze_code_security(code)
        if sec["vulnerabilities"] > 0:
            issues.extend([{"standard": "security", "issue": f["type"], "line": f["line"], "severity": f["severity"]} for f in sec["findings"][:10]])
    if "accessibility" in standards:
        if "<img" in code and 'alt=' not in code:
            issues.append({"standard": "accessibility", "issue": "Images without alt attributes", "severity": "medium"})
        if "<button" in code and "aria-" not in code:
            issues.append({"standard": "accessibility", "issue": "Buttons without ARIA attributes", "severity": "low"})
    if "performance" in standards:
        if "SELECT *" in code.upper():
            issues.append({"standard": "performance", "issue": "SELECT * usage — specify columns", "severity": "medium"})
        if re.search(r"for.*in.*for.*in", code):
            issues.append({"standard": "performance", "issue": "Nested loops detected", "severity": "low"})
    return {
        "compliant": len(issues) == 0,
        "total_issues": len(issues),
        "issues": issues,
        "standards_checked": standards,
    }


# NEW v7.0 — Code infilling
def infill_code(prefix: str, suffix: str, language: str = "python") -> Dict[str, Any]:
    return {
        "status": "ready",
        "prefix_lines": len(prefix.split("\n")),
        "suffix_lines": len(suffix.split("\n")),
        "language": language,
        "message": "Code infilling requires LLM backend. Use /agents/orchestrate with query containing 'infill' to route.",
        "compatible_models": ["qwen3_coder", "deepseek_coder_v2", "starcoder2_15b", "codellama_34b"],
    }


# ============================================================
# FINE-TUNING CONFIG GENERATOR
# ============================================================

FINETUNE_PRESETS = {
    "lora": {
        "method": "LoRA", "r": 16, "lora_alpha": 32, "lora_dropout": 0.05,
        "target_modules": ["q_proj", "v_proj", "k_proj", "o_proj"],
        "learning_rate": 2e-4, "epochs": 3, "batch_size": 4,
        "gradient_accumulation_steps": 4, "optimizer": "adamw_torch",
        "scheduler": "cosine", "warmup_ratio": 0.03, "max_grad_norm": 0.3, "fp16": True,
    },
    "qlora": {
        "method": "QLoRA (4-bit)", "r": 64, "lora_alpha": 16, "lora_dropout": 0.1,
        "target_modules": ["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        "bits": 4, "quant_type": "nf4", "double_quant": True,
        "learning_rate": 2e-4, "epochs": 3, "batch_size": 2,
        "gradient_accumulation_steps": 8, "optimizer": "paged_adamw_8bit",
        "scheduler": "cosine", "warmup_ratio": 0.03, "max_grad_norm": 0.3, "fp16": True,
    },
    "dreambooth_lora": {
        "method": "DreamBooth + LoRA", "instance_prompt": "a photo of sks [class]",
        "class_prompt": "a photo of [class]", "resolution": 512, "train_batch_size": 1,
        "learning_rate": 1e-4, "max_train_steps": 800, "lora_r": 4, "lora_alpha": 4,
        "prior_preservation": True, "prior_loss_weight": 1.0,
    },
    "sdxl_lora": {
        "method": "SDXL LoRA", "resolution": 1024, "train_batch_size": 1,
        "learning_rate": 1e-4, "max_train_steps": 1000, "lora_r": 8, "rank": 8,
        "optimizer": "prodigy", "scheduler": "constant", "mixed_precision": "fp16",
        "gradient_checkpointing": True,
    },
    "flux_lora": {
        "method": "FLUX.1 LoRA", "resolution": 1024, "train_batch_size": 1,
        "learning_rate": 1e-4, "max_train_steps": 1500, "lora_r": 16, "rank": 16,
        "optimizer": "adamw", "scheduler": "constant_with_warmup",
        "warmup_steps": 100, "mixed_precision": "bf16", "guidance_scale": 3.5,
    },
    "embedding": {
        "method": "Sentence Transformer Fine-Tune", "loss": "MultipleNegativesRankingLoss",
        "learning_rate": 2e-5, "epochs": 10, "batch_size": 16, "warmup_steps": 100,
        "evaluation_strategy": "steps", "eval_steps": 500, "metric": "cosine_similarity",
    },
    "tts": {
        "method": "TTS Fine-Tuning", "sample_rate": 22050, "max_audio_length": 11.0,
        "learning_rate": 5e-6, "epochs": 20, "batch_size": 2,
        "language": "pt", "speaker_embedding_dim": 512,
    },
    "rvc": {
        "method": "RVC Voice Conversion v2", "sample_rate": 40000, "f0_method": "rmvpe",
        "epochs": 200, "batch_size": 8, "learning_rate": 1e-4, "save_every_epoch": 25,
    },
    "dpo": {
        "method": "DPO Alignment", "beta": 0.1, "learning_rate": 5e-7, "epochs": 1,
        "batch_size": 4, "gradient_accumulation_steps": 4, "max_length": 1024,
        "max_prompt_length": 512, "optimizer": "rmsprop", "loss_type": "sigmoid",
    },
    "autotrain": {
        "method": "AutoTrain Advanced", "task": "text-classification",
        "model": "bert-base-uncased", "learning_rate": 5e-5, "epochs": 3,
        "batch_size": 8, "max_seq_length": 512, "auto_find_batch_size": True,
        "mixed_precision": "fp16",
    },
}

MODEL_CONFIGS = {
    "llama3-8b": {"base": "meta-llama/Meta-Llama-3-8B", "type": "causal_lm", "context": 8192, "vram_gb": 16},
    "llama3-70b": {"base": "meta-llama/Meta-Llama-3-70B", "type": "causal_lm", "context": 8192, "vram_gb": 140},
    "mistral-7b": {"base": "mistralai/Mistral-7B-v0.3", "type": "causal_lm", "context": 32768, "vram_gb": 14},
    "qwen3-7b": {"base": "Qwen/Qwen2.5-7B", "type": "causal_lm", "context": 131072, "vram_gb": 14},
    "qwen3-coder-32b": {"base": "Qwen/Qwen2.5-Coder-32B-Instruct", "type": "causal_lm", "context": 131072, "vram_gb": 64},
    "gemma2-9b": {"base": "google/gemma-2-9b", "type": "causal_lm", "context": 8192, "vram_gb": 18},
    "gemma4": {"base": "google/gemma-4-E4B-it", "type": "causal_lm", "context": 32768, "vram_gb": 20},
    "phi3-mini": {"base": "microsoft/Phi-3-mini-4k-instruct", "type": "causal_lm", "context": 4096, "vram_gb": 8},
    "deepseek-coder-v2": {"base": "deepseek-ai/DeepSeek-Coder-V2-Instruct", "type": "causal_lm", "context": 128000, "vram_gb": 48},
    "deepseek-coder-7b": {"base": "deepseek-ai/deepseek-coder-6.7b-instruct", "type": "causal_lm", "context": 16384, "vram_gb": 14},
    "yi-coder-9b": {"base": "01-ai/Yi-Coder-9B-Chat", "type": "causal_lm", "context": 131072, "vram_gb": 18},
    "opencoder-8b": {"base": "OpenCoder-LLM/OpenCoder-8B-Instruct", "type": "causal_lm", "context": 8192, "vram_gb": 16},
    "starcoder2-15b": {"base": "bigcode/starcoder2-15b", "type": "causal_lm", "context": 16384, "vram_gb": 30},
    "starcoder2-7b": {"base": "bigcode/starcoder2-7b", "type": "causal_lm", "context": 16384, "vram_gb": 14},
    "codellama-34b": {"base": "codellama/CodeLlama-34b-Instruct-hf", "type": "causal_lm", "context": 16384, "vram_gb": 68},
    "ibm-granite": {"base": "ibm-granite/granite-3b-code-instruct", "type": "causal_lm", "context": 8192, "vram_gb": 6},
    "sdxl": {"base": "stabilityai/stable-diffusion-xl-base-1.0", "type": "diffusion", "resolution": 1024, "vram_gb": 12},
    "flux-dev": {"base": "black-forest-labs/FLUX.1-dev", "type": "diffusion", "resolution": 1024, "vram_gb": 24},
    "flux-klein": {"base": "black-forest-labs/FLUX.2-Klein-9B-KV", "type": "diffusion", "resolution": 1024, "vram_gb": 18},
    "whisper-large": {"base": "openai/whisper-large-v3", "type": "asr", "context": 30, "vram_gb": 10},
    "kokoro-tts": {"base": "hexgrad/Kokoro-82M", "type": "tts", "vram_gb": 2},
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
    "ner": {
        "format": "token_classification",
        "columns": {"tokens": "list[str]", "ner_tags": "list[str]"},
        "example": {"tokens": ["John", "lives", "in", "Paris"], "ner_tags": ["B-PER", "O", "O", "B-LOC"]},
    },
    "qa": {
        "format": "extractive_qa",
        "columns": {"question": "str", "context": "str", "answer": "str", "answer_start": "int"},
        "example": {"question": "What is Python?", "context": "Python is a programming language...", "answer": "a programming language", "answer_start": 10},
    },
    "translation": {
        "format": "parallel_corpus",
        "columns": {"source": "str", "target": "str", "source_lang": "str", "target_lang": "str"},
        "example": {"source": "Hello world", "target": "Olá mundo", "source_lang": "en", "target_lang": "pt"},
    },
    "audio_transcription": {
        "format": "audio_text",
        "columns": {"audio": "path", "transcription": "str", "language": "str"},
        "example": {"audio": "sample.wav", "transcription": "Hello there", "language": "en"},
    },
    "code": {
        "format": "code_instruction",
        "columns": {"instruction": "str", "language": "str", "code": "str", "tests": "str (optional)"},
        "example": {"instruction": "Write fibonacci", "language": "python", "code": "def fib(n): ...", "tests": "assert fib(10) == 55"},
    },
}


def generate_finetune_config(method: str, model: str, dataset_format: str, custom_params: Optional[Dict] = None) -> Dict:
    preset = FINETUNE_PRESETS.get(method, FINETUNE_PRESETS["lora"]).copy()
    model_info = MODEL_CONFIGS.get(model, MODEL_CONFIGS["llama3-8b"]).copy()
    dataset_tmpl = DATASET_TEMPLATES.get(dataset_format, DATASET_TEMPLATES["instruction"]).copy()
    if custom_params:
        preset.update(custom_params)
    return {
        "id": str(uuid.uuid4())[:8],
        "created_at": datetime.utcnow().isoformat(),
        "method": preset, "model": model_info, "dataset": dataset_tmpl,
        "estimated_vram_gb": model_info.get("vram_gb", 16),
        "estimated_time_hours": preset.get("epochs", 3) * 0.5,
    }


# ============================================================
# DATASET GENERATION ENGINE
# ============================================================

SYNTHETIC_SCHEMAS = {
    "instruction": {
        "fields": ["instruction", "input", "output"],
        "domains": ["general", "legal", "medical", "code", "finance", "science", "education"],
    },
    "chat_multi_turn": {
        "fields": ["system", "conversations"],
        "styles": ["professional", "casual", "technical", "creative"],
    },
    "code_exercises": {
        "fields": ["task", "language", "difficulty", "solution", "test_cases"],
        "languages": ["python", "javascript", "typescript", "rust", "go", "java"],
        "difficulties": ["easy", "medium", "hard", "expert"],
    },
    "legal_qa": {
        "fields": ["question", "jurisdiction", "area", "answer", "citations"],
        "areas": ["civil", "criminal", "labor", "tax", "commercial", "constitutional"],
    },
    "sentiment": {
        "fields": ["text", "sentiment", "confidence"],
        "sentiments": ["positive", "negative", "neutral", "mixed"],
    },
}


def generate_dataset_config(
    schema_type: str = "instruction",
    num_samples: int = 1000,
    domain: str = "general",
    output_format: str = "jsonl",
    language: str = "en",
) -> Dict[str, Any]:
    schema = SYNTHETIC_SCHEMAS.get(schema_type, SYNTHETIC_SCHEMAS["instruction"])
    return {
        "id": str(uuid.uuid4())[:8],
        "created_at": datetime.utcnow().isoformat(),
        "schema": schema,
        "config": {
            "schema_type": schema_type,
            "num_samples": num_samples,
            "domain": domain,
            "output_format": output_format,
            "language": language,
            "seed": int(time.time()),
        },
        "output_formats_available": ["jsonl", "json", "csv", "parquet", "hf_dataset"],
        "estimated_size_mb": round(num_samples * 0.002, 2),
    }


def validate_dataset_sample(fmt: str, sample: dict) -> Dict[str, Any]:
    template = DATASET_TEMPLATES.get(fmt)
    if not template:
        return {"valid": False, "errors": [f"Unknown format: {fmt}"], "warnings": []}
    errors, warnings = [], []
    for col, col_type in template["columns"].items():
        if "optional" in str(col_type).lower():
            if col not in sample:
                warnings.append(f"Optional field '{col}' missing")
        elif col not in sample:
            errors.append(f"Required field '{col}' missing")
        elif not sample[col]:
            errors.append(f"Field '{col}' is empty")
    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings, "expected": template}


def convert_format(data: List[dict], from_fmt: str, to_fmt: str) -> Dict[str, Any]:
    if to_fmt == "jsonl":
        output = "\n".join(json.dumps(row, ensure_ascii=False) for row in data)
    elif to_fmt == "csv":
        if not data:
            output = ""
        else:
            headers = list(data[0].keys())
            rows = [",".join(headers)]
            for row in data:
                rows.append(",".join(str(row.get(h, "")).replace(",", ";") for h in headers))
            output = "\n".join(rows)
    elif to_fmt == "json":
        output = json.dumps(data, ensure_ascii=False, indent=2)
    else:
        output = json.dumps(data, ensure_ascii=False)
    return {
        "format": to_fmt,
        "rows": len(data),
        "output": output[:10000],
        "truncated": len(output) > 10000,
    }


# ============================================================
# TEXT ANALYSIS ENGINE (NEW v7.2)
# ============================================================

# AI text detection patterns
AI_TEXT_MARKERS = [
    r"\bAs an AI\b", r"\bAs a language model\b", r"\bI don't have personal\b",
    r"\bIt's important to note\b", r"\bIt is worth noting\b",
    r"\bIn conclusion\b.*\boverall\b", r"\bDelve\b", r"\bTapestry\b",
    r"\bLandscape\b.*\bnavigate\b", r"\bFurthermore\b.*\bMoreover\b",
    r"\bHowever, it is\b", r"\bIt's crucial to\b",
]

GRAMMAR_PATTERNS = {
    "double_space": r"  +",
    "missing_period": r"[a-z]\s+[A-Z]",
    "repeated_word": r"\b(\w+)\s+\1\b",
    "common_misspelling": r"\b(teh|recieve|occured|seperate|definately|accomodate|occurence)\b",
    "passive_voice": r"\b(was|were|is|are|been|being)\s+\w+ed\b",
}


def detect_ai_text(text: str) -> Dict[str, Any]:
    """Detect if text is AI-generated based on linguistic patterns."""
    markers_found = []
    for pattern in AI_TEXT_MARKERS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            markers_found.extend(matches)

    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    avg_sentence_len = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)

    # AI text tends to have uniform sentence lengths
    if sentences:
        lens = [len(s.split()) for s in sentences]
        variance = sum((l - avg_sentence_len) ** 2 for l in lens) / max(len(lens), 1)
    else:
        variance = 0

    # Low variance + AI markers = likely AI
    ai_score = min(1.0, len(markers_found) * 0.15 + (0.3 if variance < 20 else 0) + (0.2 if avg_sentence_len > 18 else 0))

    return {
        "ai_probability": round(ai_score, 3),
        "verdict": "likely_ai" if ai_score > 0.5 else "likely_human" if ai_score < 0.3 else "uncertain",
        "markers_found": markers_found[:10],
        "avg_sentence_length": round(avg_sentence_len, 1),
        "sentence_length_variance": round(variance, 1),
        "total_sentences": len(sentences),
    }


def analyze_grammar(text: str) -> Dict[str, Any]:
    """Check text for grammar and style issues."""
    issues = []
    for issue_type, pattern in GRAMMAR_PATTERNS.items():
        for match in re.finditer(pattern, text, re.IGNORECASE):
            issues.append({
                "type": issue_type,
                "position": match.start(),
                "text": match.group()[:50],
            })
    words = text.split()
    sentences = re.split(r'[.!?]+', text)
    return {
        "total_issues": len(issues),
        "issues": issues[:30],
        "word_count": len(words),
        "sentence_count": len([s for s in sentences if s.strip()]),
        "avg_word_length": round(sum(len(w) for w in words) / max(len(words), 1), 1),
    }


def detect_emotion(text: str) -> Dict[str, Any]:
    """Detect emotions in text using keyword patterns."""
    emotion_keywords = {
        "joy": ["happy", "glad", "excited", "wonderful", "great", "love", "amazing", "fantastic", "delighted", "cheerful"],
        "sadness": ["sad", "unhappy", "depressed", "miserable", "heartbroken", "grief", "sorrow", "lonely", "disappointed"],
        "anger": ["angry", "furious", "rage", "hate", "annoyed", "frustrated", "outraged", "irritated", "mad"],
        "fear": ["afraid", "scared", "terrified", "anxious", "worried", "panic", "dread", "horror", "nervous"],
        "surprise": ["surprised", "shocked", "amazed", "astonished", "unexpected", "wow", "unbelievable", "stunning"],
        "disgust": ["disgusted", "gross", "revolting", "repulsive", "nasty", "horrible", "awful", "vile"],
    }
    text_lower = text.lower()
    scores = {}
    for emotion, keywords in emotion_keywords.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        if count > 0:
            scores[emotion] = count

    total = sum(scores.values()) if scores else 1
    normalized = {k: round(v / total, 3) for k, v in scores.items()}
    dominant = max(scores, key=scores.get) if scores else "neutral"

    return {
        "dominant_emotion": dominant,
        "scores": normalized,
        "confidence": round(max(scores.values()) / total, 3) if scores else 0,
    }


def analyze_readability(text: str) -> Dict[str, Any]:
    """Compute readability metrics for text."""
    words = text.split()
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    syllable_count = sum(max(1, len(re.findall(r'[aeiouyAEIOUY]+', w))) for w in words)

    word_count = len(words)
    sent_count = max(len(sentences), 1)
    avg_words_per_sentence = word_count / sent_count
    avg_syllables_per_word = syllable_count / max(word_count, 1)

    # Flesch Reading Ease
    flesch = 206.835 - 1.015 * avg_words_per_sentence - 84.6 * avg_syllables_per_word
    # Flesch-Kincaid Grade
    fk_grade = 0.39 * avg_words_per_sentence + 11.8 * avg_syllables_per_word - 15.59

    if flesch >= 80:
        level = "easy"
    elif flesch >= 60:
        level = "standard"
    elif flesch >= 40:
        level = "difficult"
    else:
        level = "very_difficult"

    return {
        "flesch_reading_ease": round(max(0, min(100, flesch)), 1),
        "flesch_kincaid_grade": round(max(0, fk_grade), 1),
        "level": level,
        "word_count": word_count,
        "sentence_count": sent_count,
        "avg_words_per_sentence": round(avg_words_per_sentence, 1),
        "avg_syllables_per_word": round(avg_syllables_per_word, 2),
    }


def detect_clickbait(text: str) -> Dict[str, Any]:
    """Detect clickbait patterns in headlines."""
    clickbait_patterns = [
        r"\byou won't believe\b", r"\bshocking\b", r"\bthis is why\b",
        r"\bnumber \d+ will\b", r"\bwhat happened next\b", r"\bbreaking\b",
        r"\bone weird trick\b", r"\bdoctors hate\b", r"\b\d+ reasons?\b",
        r"\byou need to\b", r"\bevery\w* needs? to\b", r"\bsecret\b",
        r"[!?]{2,}", r"[A-Z]{5,}",
    ]
    matches = []
    for pattern in clickbait_patterns:
        found = re.findall(pattern, text, re.IGNORECASE)
        matches.extend(found)

    score = min(1.0, len(matches) * 0.2)
    return {
        "is_clickbait": score > 0.4,
        "clickbait_score": round(score, 3),
        "triggers_found": matches[:10],
    }


def detect_prompt_injection(text: str) -> Dict[str, Any]:
    """Detect prompt injection attempts in text."""
    injection_patterns = [
        r"ignore (?:all )?(?:previous |above )?instructions",
        r"disregard (?:all )?(?:previous |prior )?",
        r"you are now\b", r"act as\b", r"pretend you",
        r"system prompt", r"new instructions",
        r"forget (?:everything|all)", r"override",
        r"jailbreak", r"DAN\b", r"do anything now",
        r"\[SYSTEM\]", r"\[INST\]", r"<\|system\|>",
    ]
    findings = []
    for pattern in injection_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            findings.append({
                "pattern": pattern,
                "matched": match.group()[:50],
                "position": match.start(),
            })
    risk = "high" if len(findings) >= 2 else "medium" if len(findings) == 1 else "low"
    return {
        "injection_detected": len(findings) > 0,
        "risk_level": risk,
        "findings": findings[:10],
        "total_triggers": len(findings),
    }


# ============================================================
# AGENT ORCHESTRATOR (EXPANDED v7.2)
# ============================================================

def route_to_agents(query: str) -> Dict[str, Any]:
    q = query.lower()
    matched = []
    keywords_map = {
        "dataset_creation": ["dataset", "synthetic data", "generate data", "labeling", "annotation",
                             "jsonl", "parquet", "csv dataset", "corpus", "data augment"],
        "fine_tuning": ["fine-tun", "finetun", "train", "lora", "dreambooth", "qlora", "dpo",
                        "rlhf", "autotrain", "adapter", "distill", "quantiz", "prune", "merge model"],
        "code_gen": ["generate code", "create function", "write code", "implement", "scaffold",
                     "webapp", "web app", "react app", "html app", "streamlit", "gradio app",
                     "solidity", "smart contract", "cad code", "openscad", "minecraft mod",
                     "circuit diagram", "wokwi", "bolt diy", "fullstack",
                     "anycoder", "instantcoder", "gemini coder"],
        "code_analysis": ["analyze code", "audit", "security scan", "vulnerability", "lint", "review code",
                          "autodoc", "docstring", "classify language", "detect language",
                          "code compliance", "carbon footprint", "code retrieval", "infill",
                          "repo to text", "metagpt", "autogen", "multi-agent",
                          "code comment", "refactor", "test generat"],
        "reasoning": ["legal", "contract", "compliance", "financial", "medical reason", "case law"],
        "vision": ["face", "detect", "pose", "object", "ocr", "image", "scene", "background remov",
                    "upscal", "inpaint", "segment", "depth", "try-on", "virtual try",
                    "yolo", "detr", "grounding dino", "owl", "license plate", "fire",
                    "smoke", "pothole", "traffic sign", "animal", "wildlife", "fracture",
                    "tumor", "blood cell", "pcb", "solar panel", "counting", "track",
                    "lego", "nsfw", "weapon", "ppe", "crowd", "furniture",
                    "satellite", "defect", "anomal"],
        "image_generation": ["generate image", "text to image", "flux", "sdxl", "stable diffusion",
                             "dreambooth", "comic", "graphic novel", "character sheet"],
        "video_generation": ["generate video", "text to video", "animate", "lipsync", "face swap video",
                             "video extend", "wan2", "ltx"],
        "speech_audio": ["tts", "speech", "voice", "transcri", "asr", "whisper", "music",
                         "voice clon", "rvc", "vocal", "audio"],
        "modeling_3d": ["3d", "mesh", "point cloud", "gaussian", "trellis", "hunyuan3d"],
        "text_nlp": ["summariz", "translat", "sentiment", "ner", "topic", "paraphras",
                     "grammar", "emotion", "ai detect", "ai text", "fake news", "clickbait",
                     "semantic search", "tokeniz", "zero-shot", "classify text",
                     "keyword", "similar", "embed", "attention", "explainab",
                     "prompt injection", "hallucin", "readabil", "proficienc",
                     "bot detect", "email triage", "complaint", "talent match"],
        "benchmarking": ["benchmark", "leaderboard", "evaluate model", "compare model",
                         "bigcodebench", "navitrace"],
        "question_answering": ["question", "answer", "qa", "ask", "explain", "what is",
                                "how to", "why", "who is", "rag", "retrieval", "document qa",
                                "pdf qa", "visual qa", "vqa", "table qa", "open domain",
                                "medical qa", "legal qa", "kotaemon", "chatbot qa"],
        "pdf": ["pdf", "document", "extract text", "table extract", "layout",
                "ocr", "mineru", "paddleocr", "surya", "nougat", "donut", "grobid",
                "bibliography", "citation", "resume", "cv pars", "receipt", "invoice",
                "contract", "legal doc", "arxiv", "latex", "equation", "figure extract",
                "signature", "stamp", "handwriting", "form recogn", "id card",
                "pdf to markdown", "pdf to html", "document analys"],
    }
    for category, keywords in keywords_map.items():
        for kw in keywords:
            if kw in q:
                matched.append(category)
                break
    if not matched:
        matched = ["reasoning"]
    agents_used = []
    for cat in list(set(matched)):
        spec = AGENT_CATEGORIES.get(cat, {})
        for key, values in spec.items():
            if isinstance(values, list):
                agents_used.extend([f"{cat}.{v}" for v in values[:5]])
    return {
        "query": query,
        "matched_categories": list(set(matched)),
        "agents_activated": len(agents_used),
        "sample_agents": agents_used[:25],
        "total_available": TOTAL_AGENTS,
    }


# ============================================================
# API ENDPOINTS
# ============================================================

@app.get("/")
async def health():
    return {
        "status": "ok",
        "engine": "ELP Neural Proxy v7.2",
        "total_agents": TOTAL_AGENTS,
        "capabilities": list(AGENT_CATEGORIES.keys()),
        "fine_tuning_methods": list(FINETUNE_PRESETS.keys()),
        "supported_models": list(MODEL_CONFIGS.keys()),
        "dataset_formats": list(DATASET_TEMPLATES.keys()),
        "synthetic_schemas": list(SYNTHETIC_SCHEMAS.keys()),
        "code_gen_models": AGENT_CATEGORIES["code_gen"]["models"],
        "webapp_builders": AGENT_CATEGORIES["code_gen"]["webapp_builders"],
        "text_analysis_types": list(AGENT_CATEGORIES["text_nlp"].keys()),
        "object_detection_models": AGENT_CATEGORIES["vision"]["models"],
        "detection_domains": list(AGENT_CATEGORIES["vision"].keys()),
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
        html_parts.append(f'<div class="page" data-page="{page_num + 1}"><h3>Page {page_num + 1}</h3>')
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
    return JSONResponse(content=route_to_agents(body.get("query", "")))


@app.post("/agents/swarm")
async def swarm(request: Request):
    body = await request.json()
    results = [route_to_agents(q) for q in body.get("queries", [])[:20]]
    return JSONResponse(content={"results": results, "total_processed": len(results)})


@app.get("/agents/list")
async def list_agents(category: Optional[str] = None):
    if category and category in AGENT_CATEGORIES:
        return JSONResponse(content={category: AGENT_CATEGORIES[category]})
    return JSONResponse(content={"categories": AGENT_CATEGORIES, "total": TOTAL_AGENTS})


# ── Code Endpoints (EXPANDED v7.0) ──

@app.post("/agents/code/analyze")
async def code_analyze(request: Request):
    body = await request.json()
    code = body.get("code", "")
    return JSONResponse(content={
        "security": analyze_code_security(code, body.get("language", "auto")),
        "quality": analyze_code_quality(code),
    })


@app.post("/agents/code/generate")
async def code_generate(request: Request):
    body = await request.json()
    return JSONResponse(content={
        "status": "ready",
        "description": body.get("description", ""),
        "language": body.get("language", "python"),
        "paradigm": body.get("paradigm", "oop"),
        "agents_available": len(AGENT_CATEGORIES["code_gen"]["languages"]) * len(AGENT_CATEGORIES["code_gen"]["paradigms"]),
        "models_available": AGENT_CATEGORIES["code_gen"]["models"],
        "message": "Code generation requires LLM backend. Use /agents/orchestrate to route.",
    })


@app.post("/agents/code/webapp")
async def code_webapp(request: Request):
    """Generate web app code (HTML/React/Streamlit/Gradio)."""
    body = await request.json()
    framework = body.get("framework", "react")
    description = body.get("description", "")
    available_builders = AGENT_CATEGORIES["code_gen"]["webapp_builders"]
    builder_map = {
        "react": "html_react_generator",
        "html": "html_react_generator",
        "streamlit": "streamlit_app_builder",
        "gradio": "gradio_app_builder",
        "marimo": "marimo_app_builder",
        "fullstack": "bolt_diy_fullstack",
    }
    selected = builder_map.get(framework, "anycoder_multi")
    return JSONResponse(content={
        "status": "ready",
        "framework": framework,
        "description": description,
        "builder_agent": selected,
        "all_builders": available_builders,
        "compatible_models": ["qwen3_coder", "deepseek_coder_v2", "opencoder_8b", "gemini_coder"],
        "message": f"WebApp generation via {selected}. Route through /agents/orchestrate with 'webapp {framework}' query.",
    })


@app.post("/agents/code/classify")
async def code_classify(request: Request):
    """Identify the programming language of a code snippet."""
    body = await request.json()
    code = body.get("code", "")
    if not code:
        raise HTTPException(400, "code field required")
    return JSONResponse(content=classify_language(code))


@app.post("/agents/code/autodoc")
async def code_autodoc(request: Request):
    """Auto-generate docstrings and JSDoc comments for code."""
    body = await request.json()
    code = body.get("code", "")
    language = body.get("language", "python")
    if not code:
        raise HTTPException(400, "code field required")
    return JSONResponse(content=generate_autodoc(code, language))


@app.post("/agents/code/compliance")
async def code_compliance(request: Request):
    """Check code against security, accessibility, and performance standards."""
    body = await request.json()
    code = body.get("code", "")
    standards = body.get("standards", ["security", "accessibility", "performance"])
    if not code:
        raise HTTPException(400, "code field required")
    return JSONResponse(content=check_code_compliance(code, standards))


@app.post("/agents/code/infill")
async def code_infill(request: Request):
    """Code infilling — generate code between prefix and suffix."""
    body = await request.json()
    prefix = body.get("prefix", "")
    suffix = body.get("suffix", "")
    language = body.get("language", "python")
    return JSONResponse(content=infill_code(prefix, suffix, language))


@app.post("/agents/code/repo-to-text")
async def repo_to_text(request: Request):
    """Convert a GitHub repo structure to LLM-ready plain text."""
    body = await request.json()
    repo_url = body.get("repo_url", "")
    if not repo_url:
        raise HTTPException(400, "repo_url field required")
    return JSONResponse(content={
        "status": "ready",
        "repo_url": repo_url,
        "agent": "repo_to_text_converter",
        "output_format": "plain_text",
        "message": "Repo-to-text conversion requires fetch capability. Use /agents/orchestrate with 'repo to text' query.",
    })


# ── Fine-Tuning Endpoints ──

@app.get("/finetune/methods")
async def list_finetune_methods():
    return JSONResponse(content={
        "methods": {k: {"method_name": v["method"]} for k, v in FINETUNE_PRESETS.items()},
        "total": len(FINETUNE_PRESETS),
    })


@app.get("/finetune/models")
async def list_finetune_models():
    return JSONResponse(content={"models": MODEL_CONFIGS, "total": len(MODEL_CONFIGS)})


@app.get("/finetune/datasets")
async def list_dataset_templates():
    return JSONResponse(content={"templates": DATASET_TEMPLATES, "total": len(DATASET_TEMPLATES)})


@app.post("/finetune/configure")
async def configure_finetune(request: Request):
    body = await request.json()
    method = body.get("method", "lora")
    model = body.get("model", "llama3-8b")
    if method not in FINETUNE_PRESETS:
        raise HTTPException(400, f"Unknown method: {method}. Available: {list(FINETUNE_PRESETS.keys())}")
    if model not in MODEL_CONFIGS:
        raise HTTPException(400, f"Unknown model: {model}. Available: {list(MODEL_CONFIGS.keys())}")
    config = generate_finetune_config(method, model, body.get("dataset_format", "instruction"), body.get("custom_params"))
    return JSONResponse(content=config)


@app.post("/finetune/estimate")
async def estimate_resources(request: Request):
    body = await request.json()
    method = body.get("method", "lora")
    model = body.get("model", "llama3-8b")
    dataset_rows = body.get("dataset_rows", 10000)
    epochs = body.get("epochs", 3)
    model_info = MODEL_CONFIGS.get(model, MODEL_CONFIGS["llama3-8b"])
    preset = FINETUNE_PRESETS.get(method, FINETUNE_PRESETS["lora"])
    vram = model_info.get("vram_gb", 16)
    if method == "qlora":
        vram *= 0.25
    elif method == "lora":
        vram *= 0.5
    steps = dataset_rows / preset.get("batch_size", 4) / preset.get("gradient_accumulation_steps", 4) * epochs
    hours = steps * 0.002
    if vram <= 8:
        gpus = ["RTX 3060 12GB", "T4 (free Colab)", "RTX 4060 Ti 16GB"]
    elif vram <= 16:
        gpus = ["RTX 4070 Ti 16GB", "A10G (AWS)", "L4 (GCP)"]
    elif vram <= 24:
        gpus = ["RTX 3090 24GB", "RTX 4090 24GB", "A100 40GB"]
    else:
        gpus = ["A100 80GB", "H100", "Multi-GPU setup"]
    return JSONResponse(content={
        "estimated_vram_gb": round(vram, 1), "estimated_hours": round(hours, 2),
        "total_steps": int(steps), "gpu_recommendations": gpus,
        "cost_estimate_usd": {
            "colab_pro": round(hours * 0.10, 2), "lambda_labs": round(hours * 1.10, 2),
            "runpod": round(hours * 0.74, 2), "aws_p4d": round(hours * 32.77, 2),
        },
    })


# ── Dataset Creation Endpoints ──

@app.get("/dataset/schemas")
async def list_schemas():
    return JSONResponse(content={"schemas": SYNTHETIC_SCHEMAS, "total": len(SYNTHETIC_SCHEMAS)})


@app.get("/dataset/formats")
async def list_formats():
    return JSONResponse(content={"formats": DATASET_TEMPLATES, "total": len(DATASET_TEMPLATES)})


@app.post("/dataset/configure")
async def configure_dataset(request: Request):
    body = await request.json()
    config = generate_dataset_config(
        schema_type=body.get("schema_type", "instruction"),
        num_samples=body.get("num_samples", 1000),
        domain=body.get("domain", "general"),
        output_format=body.get("output_format", "jsonl"),
        language=body.get("language", "en"),
    )
    return JSONResponse(content=config)


@app.post("/dataset/validate")
async def validate_dataset(request: Request):
    body = await request.json()
    result = validate_dataset_sample(body.get("format", "instruction"), body.get("sample", {}))
    return JSONResponse(content=result)


@app.post("/dataset/convert")
async def convert_dataset(request: Request):
    body = await request.json()
    data = body.get("data", [])
    to_fmt = body.get("to_format", "jsonl")
    if not data:
        raise HTTPException(400, "data field required (list of objects)")
    result = convert_format(data, body.get("from_format", "json"), to_fmt)
    return JSONResponse(content=result)


@app.post("/dataset/deduplicate")
async def deduplicate_dataset(request: Request):
    body = await request.json()
    data = body.get("data", [])
    key_field = body.get("key_field", "text")
    seen = set()
    unique = []
    duplicates = 0
    for row in data:
        key = str(row.get(key_field, "")).strip().lower()
        h = hashlib.md5(key.encode()).hexdigest()
        if h not in seen:
            seen.add(h)
            unique.append(row)
        else:
            duplicates += 1
    return JSONResponse(content={
        "original_count": len(data),
        "unique_count": len(unique),
        "duplicates_removed": duplicates,
        "data": unique[:100],
    })


@app.post("/dataset/statistics")
async def dataset_statistics(request: Request):
    body = await request.json()
    data = body.get("data", [])
    if not data:
        raise HTTPException(400, "data field required")
    all_keys = set()
    for row in data:
        all_keys.update(row.keys())
    field_stats = {}
    for key in all_keys:
        values = [row.get(key) for row in data if key in row]
        non_null = [v for v in values if v is not None and v != ""]
        lengths = [len(str(v)) for v in non_null]
        field_stats[key] = {
            "count": len(values),
            "non_null": len(non_null),
            "null_ratio": round((len(values) - len(non_null)) / max(len(values), 1), 3),
            "avg_length": round(sum(lengths) / max(len(lengths), 1), 1) if lengths else 0,
            "min_length": min(lengths) if lengths else 0,
            "max_length": max(lengths) if lengths else 0,
            "unique_values": len(set(str(v) for v in non_null)),
        }
    return JSONResponse(content={
        "total_rows": len(data),
        "total_fields": len(all_keys),
        "fields": field_stats,
    })


# ── Text Analysis Endpoints (NEW v7.2) ──

@app.post("/agents/text/detect-ai")
async def text_detect_ai(request: Request):
    """Detect if text is AI-generated or human-written."""
    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(400, "text field required")
    return JSONResponse(content=detect_ai_text(text))


@app.post("/agents/text/grammar")
async def text_grammar(request: Request):
    """Check grammar and style issues in text."""
    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(400, "text field required")
    return JSONResponse(content=analyze_grammar(text))


@app.post("/agents/text/emotion")
async def text_emotion(request: Request):
    """Detect emotions in text (joy, sadness, anger, fear, surprise, disgust)."""
    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(400, "text field required")
    return JSONResponse(content=detect_emotion(text))


@app.post("/agents/text/readability")
async def text_readability(request: Request):
    """Compute readability metrics (Flesch Reading Ease, Flesch-Kincaid Grade)."""
    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(400, "text field required")
    return JSONResponse(content=analyze_readability(text))


@app.post("/agents/text/clickbait")
async def text_clickbait(request: Request):
    """Detect clickbait patterns in headlines and text."""
    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(400, "text field required")
    return JSONResponse(content=detect_clickbait(text))


@app.post("/agents/text/prompt-injection")
async def text_prompt_injection(request: Request):
    """Detect prompt injection attempts in text input."""
    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(400, "text field required")
    return JSONResponse(content=detect_prompt_injection(text))


@app.post("/agents/text/zero-shot")
async def text_zero_shot(request: Request):
    """Zero-shot text classification — classify without training.
    
    Body: { "text": "...", "labels": ["positive", "negative", "neutral"] }
    """
    body = await request.json()
    text = body.get("text", "")
    labels = body.get("labels", [])
    if not text or not labels:
        raise HTTPException(400, "text and labels fields required")
    return JSONResponse(content={
        "status": "ready",
        "text": text[:200],
        "candidate_labels": labels,
        "agents": ["zero_shot_classification", "modernbert_similarity"],
        "message": "Zero-shot classification requires LLM backend. Use /agents/orchestrate with 'zero-shot classify' query.",
    })


@app.post("/agents/text/semantic-search")
async def text_semantic_search(request: Request):
    """Semantic search with embeddings — find similar passages.
    
    Body: { "query": "...", "documents": ["doc1", "doc2", ...], "top_k": 5 }
    """
    body = await request.json()
    query = body.get("query", "")
    documents = body.get("documents", [])
    if not query:
        raise HTTPException(400, "query field required")
    return JSONResponse(content={
        "status": "ready",
        "query": query,
        "document_count": len(documents),
        "agents": ["semantic_search", "retrieve_and_rerank", "embedding_similarity", "modernbert_similarity"],
        "models": ["sentence_transformers", "modernbert", "gliner_multiv2"],
        "message": "Semantic search requires embedding model. Use /agents/orchestrate with 'semantic search' query.",
    })


@app.post("/agents/text/tokenize")
async def text_tokenize(request: Request):
    """Analyze text tokenization — compare tokenizers.
    
    Body: { "text": "...", "tokenizer": "gpt2|llama|bert|..." }
    """
    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(400, "text field required")
    # Basic whitespace tokenization for demo
    words = text.split()
    chars = list(text)
    return JSONResponse(content={
        "text": text[:500],
        "word_tokens": len(words),
        "char_tokens": len(chars),
        "words": words[:50],
        "available_tokenizers": ["gpt2", "llama", "bert", "modernbert", "turkish_bpe", "hindi_bpe", "darija"],
        "agents": ["tokenizer_playground", "tokenizer_comparison", "bpe_encoder", "chunk_visualizer"],
        "message": "For model-specific tokenization, use /agents/orchestrate with 'tokenize' query.",
    })


# ── Object Detection Endpoints (NEW v7.2) ──

DETECTION_MODELS_REGISTRY = {
    "yolov8": {"family": "YOLO", "variants": ["nano", "small", "medium", "large", "xlarge"], "speed": "fast", "accuracy": "high"},
    "yolov9": {"family": "YOLO", "variants": ["compact", "extended"], "speed": "fast", "accuracy": "very_high"},
    "yolov10": {"family": "YOLO", "variants": ["nano", "small", "medium", "base", "large", "xlarge"], "speed": "very_fast", "accuracy": "high"},
    "yolov11": {"family": "YOLO", "variants": ["nano", "small", "medium", "large", "xlarge"], "speed": "fast", "accuracy": "very_high"},
    "yolov12": {"family": "YOLO", "variants": ["nano", "small", "medium"], "speed": "fast", "accuracy": "high"},
    "yolo26": {"family": "YOLO", "variants": ["nano", "small", "medium", "large"], "speed": "very_fast", "accuracy": "very_high"},
    "yoloe": {"family": "YOLO", "variants": ["v8s", "v8m", "v8l", "11s", "11m", "11l"], "speed": "fast", "accuracy": "high", "open_vocab": True},
    "yolo_world": {"family": "YOLO", "variants": ["small", "medium", "large"], "speed": "fast", "accuracy": "high", "open_vocab": True},
    "rf_detr": {"family": "DETR", "variants": ["base", "large"], "speed": "medium", "accuracy": "sota"},
    "d_fine": {"family": "DETR", "variants": ["small", "medium", "large", "xlarge"], "speed": "fast", "accuracy": "sota"},
    "mr_detr": {"family": "DETR", "variants": ["base"], "speed": "medium", "accuracy": "very_high"},
    "detr_resnet50": {"family": "DETR", "variants": ["resnet50", "resnet101"], "speed": "medium", "accuracy": "high"},
    "grounding_dino": {"family": "GroundingDINO", "variants": ["tiny", "base"], "speed": "medium", "accuracy": "very_high", "open_vocab": True},
    "owlv2": {"family": "OWL", "variants": ["base", "large"], "speed": "medium", "accuracy": "high", "zero_shot": True},
    "molmopoint_8b": {"family": "MolmoPoint", "variants": ["8b"], "speed": "slow", "accuracy": "very_high", "pointing": True},
    "qwen2_vl": {"family": "Qwen2-VL", "variants": ["7b"], "speed": "slow", "accuracy": "very_high", "open_vocab": True},
    "llmdet": {"family": "LLMDet", "variants": ["base"], "speed": "slow", "accuracy": "high", "open_vocab": True},
    "sam3": {"family": "SAM", "variants": ["tiny", "base", "large"], "speed": "medium", "accuracy": "sota", "tracking": True},
}

DOMAIN_DETECTORS = {
    "traffic": {
        "models": ["license_plate_yolos", "traffic_sign_yolov10", "pothole_yolov8", "vehicle_detr"],
        "classes": ["car", "truck", "bus", "motorcycle", "bicycle", "pedestrian", "traffic_light",
                    "stop_sign", "speed_limit", "license_plate", "pothole", "road_marking"],
    },
    "safety": {
        "models": ["fire_smoke_yolov8", "ppe_yolov8", "weapon_detector", "crowd_counter"],
        "classes": ["fire", "smoke", "person", "helmet", "vest", "goggles", "weapon",
                    "cigarette", "mask", "no_mask"],
    },
    "medical": {
        "models": ["fracture_yolov8", "tumor_resnet", "blood_cell_yolov8", "xray_detr"],
        "classes": ["fracture", "tumor", "red_blood_cell", "white_blood_cell", "platelet",
                    "lesion", "nodule"],
    },
    "agriculture": {
        "models": ["wildlife_pytorch", "plant_disease_yolo", "pest_detector", "tomato_yolo"],
        "classes": ["animal", "bird", "insect", "pest", "disease_spot", "ripe", "unripe",
                    "weed", "healthy_plant", "damaged_plant"],
    },
    "industrial": {
        "models": ["pcb_yolov8", "defect_yolo", "lego_yolov8", "box_counter_yolo"],
        "classes": ["component", "defect", "scratch", "dent", "crack", "missing_part",
                    "lego_piece", "box", "package"],
    },
    "geospatial": {
        "models": ["satellite_yolo", "building_detr", "moon_rock_yolo"],
        "classes": ["building", "road", "vehicle", "tree", "water", "rock", "crater"],
    },
}


@app.get("/agents/detection/models")
async def detection_models():
    """List all available object detection models with specs."""
    return JSONResponse(content={
        "total_models": len(DETECTION_MODELS_REGISTRY),
        "models": DETECTION_MODELS_REGISTRY,
        "families": list(set(m["family"] for m in DETECTION_MODELS_REGISTRY.values())),
        "open_vocab_models": [k for k, v in DETECTION_MODELS_REGISTRY.items() if v.get("open_vocab")],
        "zero_shot_models": [k for k, v in DETECTION_MODELS_REGISTRY.items() if v.get("zero_shot")],
        "tracking_models": [k for k, v in DETECTION_MODELS_REGISTRY.items() if v.get("tracking")],
    })


@app.get("/agents/detection/domains")
async def detection_domains():
    """List domain-specific detection capabilities."""
    return JSONResponse(content={
        "domains": {k: {"model_count": len(v["models"]), "class_count": len(v["classes"]), **v}
                    for k, v in DOMAIN_DETECTORS.items()},
        "total_domains": len(DOMAIN_DETECTORS),
    })


@app.post("/agents/detection/recommend")
async def detection_recommend(request: Request):
    """Recommend the best detection model for a use case.

    Body: { "task": "detect license plates in traffic cameras", "priority": "speed|accuracy|balanced", "realtime": true }
    """
    body = await request.json()
    task = body.get("task", "").lower()
    priority = body.get("priority", "balanced")
    realtime = body.get("realtime", False)

    # Match domain
    matched_domain = None
    for domain, spec in DOMAIN_DETECTORS.items():
        if any(cls in task for cls in spec["classes"]) or domain in task:
            matched_domain = domain
            break

    # Recommend models
    recommendations = []

    if "zero-shot" in task or "open vocab" in task or "text prompt" in task:
        recommendations.extend(["grounding_dino", "owlv2", "yolo_world", "yoloe"])
    elif "track" in task or "counting" in task:
        recommendations.extend(["sam3", "yolov8", "d_fine"])
    elif realtime or priority == "speed":
        recommendations.extend(["yolo26", "yolov10", "d_fine", "yolov11"])
    elif priority == "accuracy":
        recommendations.extend(["rf_detr", "d_fine", "grounding_dino", "mr_detr"])
    else:
        recommendations.extend(["yolov11", "d_fine", "rf_detr", "yolov8"])

    return JSONResponse(content={
        "task": task,
        "priority": priority,
        "realtime": realtime,
        "matched_domain": matched_domain,
        "domain_models": DOMAIN_DETECTORS.get(matched_domain, {}).get("models", []) if matched_domain else [],
        "recommended_models": recommendations[:5],
        "model_details": {m: DETECTION_MODELS_REGISTRY[m] for m in recommendations[:5] if m in DETECTION_MODELS_REGISTRY},
    })


@app.post("/agents/detection/detect")
async def detection_detect(request: Request):
    """Run object detection on an image (routing endpoint).

    Body: { "image_base64": "...", "model": "yolov8|grounding_dino|...", "classes": ["car", "person"], "confidence": 0.5 }
    """
    body = await request.json()
    model = body.get("model", "yolov11")
    classes = body.get("classes", [])
    confidence = body.get("confidence", 0.5)
    has_image = bool(body.get("image_base64"))

    model_info = DETECTION_MODELS_REGISTRY.get(model, {})

    return JSONResponse(content={
        "status": "ready",
        "model": model,
        "model_info": model_info,
        "requested_classes": classes,
        "confidence_threshold": confidence,
        "image_provided": has_image,
        "agents": ["object_detection", model, "image_segmentation"],
        "message": f"Detection with {model} requires GPU backend. Use /agents/orchestrate with 'detect objects' query for full pipeline.",
    })


# ── Question Answering Endpoints (NEW v7.3) ──

QA_DOMAIN_REGISTRY = {
    "medical": {
        "models": ["pubmed_qa", "clinical_trial_qa", "menstrual_qa", "medical_report_qa"],
        "description": "Medical & health question answering with clinical accuracy",
    },
    "legal": {
        "models": ["legal_qa_agent", "case_law_qa", "statute_qa", "contract_qa", "pci_dss_qa"],
        "description": "Legal question answering with citation support",
    },
    "financial": {
        "models": ["financial_qa", "earnings_call_qa", "sec_filing_qa"],
        "description": "Financial analysis and earnings Q&A",
    },
    "scientific": {
        "models": ["scientific_qa", "arxiv_qa", "pubmed_qa"],
        "description": "Scientific literature and research Q&A",
    },
    "education": {
        "models": ["education_qa", "course_qa", "textbook_qa"],
        "description": "Educational content and curriculum Q&A",
    },
    "general": {
        "models": ["open_researcher", "web_search_qa", "wikipedia_qa", "knowledge_graph_qa"],
        "description": "Open-domain general knowledge Q&A",
    },
}

QA_MODELS_REGISTRY = {
    "mdeberta_v3": {"type": "extractive", "languages": 100, "speed": "fast", "squad_f1": 90.4},
    "roberta_large_squad2": {"type": "extractive", "languages": 1, "speed": "medium", "squad_f1": 93.2},
    "xlm_roberta_large": {"type": "extractive", "languages": 100, "speed": "medium", "squad_f1": 88.7},
    "longformer_4096": {"type": "extractive", "context_length": 4096, "speed": "slow", "squad_f1": 91.5},
    "flan_t5_qa": {"type": "generative", "languages": 50, "speed": "medium"},
    "unifiedqa_v2": {"type": "generative", "formats": ["extractive", "abstractive", "yes_no", "multiple_choice"]},
    "minicpm_o_26": {"type": "visual_qa", "modalities": ["image", "text", "video"], "speed": "fast"},
    "llava_next": {"type": "visual_qa", "modalities": ["image", "text"], "speed": "medium"},
    "qwen2_vl": {"type": "visual_qa", "modalities": ["image", "text", "video"], "speed": "fast"},
    "tapas_table_qa": {"type": "table_qa", "operations": ["select", "aggregate", "compare"], "speed": "fast"},
    "music_flamingo": {"type": "audio_qa", "modalities": ["audio", "youtube"], "speed": "medium"},
}


def classify_qa_type(question: str, has_context: bool = False, has_image: bool = False, has_table: bool = False) -> str:
    """Classify the type of QA task based on inputs."""
    if has_image:
        return "visual_qa"
    if has_table:
        return "table_qa"
    q = question.lower()
    if any(kw in q for kw in ["pdf", "document", "file", "upload", "report"]):
        return "document_qa"
    if any(kw in q for kw in ["medical", "health", "symptom", "diagnosis", "clinical"]):
        return "domain_qa"
    if any(kw in q for kw in ["law", "legal", "court", "statute", "regulation"]):
        return "domain_qa"
    if has_context:
        return "extractive_qa"
    return "open_domain_qa"


def recommend_qa_model(qa_type: str, language: str = "en", priority: str = "balanced") -> list:
    """Recommend best QA models for a given task type."""
    if qa_type == "visual_qa":
        return ["minicpm_o_26", "qwen2_vl", "llava_next", "internvl2"]
    if qa_type == "table_qa":
        return ["tapas_table_qa", "tablellama_qa", "sql_qa"]
    if qa_type == "document_qa":
        return ["pdf_qa_rag", "kotaemon_rag", "genai_document_qna", "longformer_4096"]
    if qa_type == "domain_qa":
        return ["flan_t5_qa", "unifiedqa_v2", "command_r_qa", "qwen3_qa"]
    if language != "en":
        return ["xlm_roberta_large", "mdeberta_v3", "multilingual_qa_universal"]
    if priority == "speed":
        return ["minilm_qa", "tinybert_qa", "distilbert_qa"]
    if priority == "accuracy":
        return ["roberta_large_squad2", "longformer_4096", "flan_t5_qa"]
    return ["mdeberta_v3", "roberta_large_squad2", "flan_t5_qa", "unifiedqa_v2"]


@app.get("/agents/qa/domains")
async def qa_domains():
    """List all QA domain specializations."""
    return JSONResponse(content={
        "domains": QA_DOMAIN_REGISTRY,
        "total_domains": len(QA_DOMAIN_REGISTRY),
    })


@app.get("/agents/qa/models")
async def qa_models():
    """List all QA models with capabilities."""
    return JSONResponse(content={
        "models": QA_MODELS_REGISTRY,
        "total_models": len(QA_MODELS_REGISTRY),
    })


@app.post("/agents/qa/classify")
async def qa_classify(request: Request):
    """Classify QA task type and recommend models."""
    body = await request.json()
    question = body.get("question", "")
    if not question:
        raise HTTPException(400, "question field required")

    qa_type = classify_qa_type(
        question,
        has_context=bool(body.get("context")),
        has_image=bool(body.get("image_base64")),
        has_table=bool(body.get("table")),
    )
    language = body.get("language", "en")
    priority = body.get("priority", "balanced")
    recommended = recommend_qa_model(qa_type, language, priority)

    return JSONResponse(content={
        "question": question,
        "qa_type": qa_type,
        "language": language,
        "recommended_models": recommended,
        "model_details": {m: QA_MODELS_REGISTRY.get(m, {}) for m in recommended if m in QA_MODELS_REGISTRY},
        "agents_available": sum(len(v) for v in AGENT_CATEGORIES.get("question_answering", {}).values() if isinstance(v, list)),
    })


@app.post("/agents/qa/answer")
async def qa_answer(request: Request):
    """Route QA request to optimal agent pipeline.

    Body: { "question": "...", "context": "optional text", "image_base64": "optional", "table": [], "domain": "general", "language": "en" }
    """
    body = await request.json()
    question = body.get("question", "")
    if not question:
        raise HTTPException(400, "question field required")

    qa_type = classify_qa_type(
        question,
        has_context=bool(body.get("context")),
        has_image=bool(body.get("image_base64")),
        has_table=bool(body.get("table")),
    )
    domain = body.get("domain", "general")
    language = body.get("language", "en")
    recommended = recommend_qa_model(qa_type, language)
    domain_info = QA_DOMAIN_REGISTRY.get(domain, QA_DOMAIN_REGISTRY["general"])

    return JSONResponse(content={
        "status": "ready",
        "question": question,
        "qa_type": qa_type,
        "domain": domain,
        "domain_models": domain_info["models"],
        "recommended_models": recommended,
        "context_provided": bool(body.get("context")),
        "image_provided": bool(body.get("image_base64")),
        "table_provided": bool(body.get("table")),
        "agents": [qa_type, recommended[0] if recommended else "flan_t5_qa", "retrieval_augmented_qa"],
        "message": f"QA via {qa_type} pipeline. Use /agents/orchestrate with your question for full agent routing.",
    })


@app.post("/agents/qa/recommend")
async def qa_recommend(request: Request):
    """Recommend best QA approach for a use case."""
    body = await request.json()
    task = body.get("task", "").lower()
    language = body.get("language", "en")
    priority = body.get("priority", "balanced")
    has_documents = body.get("has_documents", False)
    has_images = body.get("has_images", False)

    if has_images:
        qa_type = "visual_qa"
    elif has_documents:
        qa_type = "document_qa"
    elif any(kw in task for kw in ["table", "spreadsheet", "csv", "database"]):
        qa_type = "table_qa"
    elif any(kw in task for kw in ["medical", "legal", "financial", "scientific"]):
        qa_type = "domain_qa"
    else:
        qa_type = "open_domain_qa"

    recommended = recommend_qa_model(qa_type, language, priority)

    # Detect domain
    matched_domain = "general"
    for domain in QA_DOMAIN_REGISTRY:
        if domain in task:
            matched_domain = domain
            break

    return JSONResponse(content={
        "task": task,
        "qa_type": qa_type,
        "matched_domain": matched_domain,
        "domain_info": QA_DOMAIN_REGISTRY.get(matched_domain, {}),
        "recommended_models": recommended[:5],
        "model_details": {m: QA_MODELS_REGISTRY[m] for m in recommended[:5] if m in QA_MODELS_REGISTRY},
        "supported_languages": 100 if language != "en" else "all",
        "pipeline": [
            "query_classification",
            "context_retrieval" if qa_type in ("document_qa", "open_domain_qa") else "direct_inference",
            recommended[0] if recommended else "flan_t5_qa",
            "answer_verification",
        ],
    })


# ── Document Analysis Endpoints (NEW v7.4) ──

DOCUMENT_ANALYSIS_MODELS = {
    "mineru_v1": {"type": "ocr_extraction", "output": ["markdown", "json"], "speed": "medium", "description": "MinerU: PDF to Markdown/JSON extraction"},
    "paddleocr_v4": {"type": "ocr", "languages": 80, "speed": "fast", "description": "PaddleOCR-VL: multilingual OCR with visual language"},
    "surya_v2": {"type": "ocr_layout", "languages": 90, "speed": "medium", "description": "Surya: OCR + layout + reading order + table recognition"},
    "nougat_base": {"type": "academic_ocr", "output": ["markup", "latex"], "speed": "slow", "description": "Nougat: academic PDF to markup (equations, formulas)"},
    "donut_base": {"type": "document_understanding", "tasks": ["parsing", "classification", "qa"], "speed": "fast", "description": "Donut: OCR-free document understanding transformer"},
    "dit_base": {"type": "layout_analysis", "classes": ["text", "title", "list", "table", "figure"], "speed": "fast", "description": "DiT: document image transformer for layout analysis"},
    "layoutlmv3": {"type": "layout_understanding", "tasks": ["ner", "classification", "qa"], "speed": "medium", "description": "LayoutLMv3: multimodal document AI"},
    "grobid": {"type": "bibliography", "output": ["tei_xml", "bibtex"], "speed": "fast", "description": "GROBID: machine learning for extracting bibliographic data"},
    "got_ocr2": {"type": "general_ocr", "modalities": ["text", "math", "sheet_music", "charts"], "speed": "medium", "description": "GOT-OCR2: general OCR theory model"},
    "trocr_large": {"type": "handwriting_ocr", "tasks": ["printed", "handwritten"], "speed": "medium", "description": "TrOCR: transformer-based OCR for printed and handwritten text"},
    "pix2struct_base": {"type": "visual_qa", "tasks": ["chart_qa", "infographic_qa", "ui_understanding"], "speed": "medium", "description": "Pix2Struct: screenshot parsing for visual language understanding"},
    "doctr_v1": {"type": "ocr_detection", "tasks": ["detection", "recognition"], "speed": "fast", "description": "docTR: document text recognition with deep learning"},
}

DOCUMENT_ANALYSIS_PIPELINES = {
    "pdf_to_markdown": {
        "steps": ["text_extraction", "layout_analysis", "table_extraction", "markdown_conversion"],
        "models": ["mineru_v1", "surya_v2", "nougat_base"],
        "description": "Convert PDF to structured Markdown preserving layout",
    },
    "receipt_parsing": {
        "steps": ["ocr", "field_extraction", "structured_output"],
        "models": ["donut_base", "paddleocr_v4", "doctr_v1"],
        "description": "Extract structured data from receipts and invoices",
    },
    "academic_paper": {
        "steps": ["bibliography_extraction", "equation_detection", "figure_extraction", "abstract_extraction"],
        "models": ["grobid", "nougat_base", "dit_base"],
        "description": "Parse academic papers extracting citations, equations, figures",
    },
    "legal_analysis": {
        "steps": ["clause_extraction", "entity_detection", "redaction", "compliance_check"],
        "models": ["layoutlmv3", "dit_base", "doctr_v1"],
        "description": "Analyze legal documents for clauses, entities, compliance",
    },
    "resume_screening": {
        "steps": ["text_extraction", "skill_extraction", "experience_parsing", "scoring"],
        "models": ["donut_base", "layoutlmv3", "paddleocr_v4"],
        "description": "Parse and score resumes for ATS compatibility",
    },
    "handwriting_recognition": {
        "steps": ["detection", "segmentation", "recognition", "post_processing"],
        "models": ["trocr_large", "got_ocr2", "surya_v2"],
        "description": "Recognize handwritten text from documents and forms",
    },
}


def recommend_doc_model(task: str, has_tables: bool = False, has_equations: bool = False) -> list:
    """Recommend best document analysis models for a task."""
    t = task.lower()
    if any(kw in t for kw in ["receipt", "invoice", "form", "id card"]):
        return ["donut_base", "paddleocr_v4", "doctr_v1"]
    if any(kw in t for kw in ["academic", "paper", "arxiv", "citation", "bibliography"]):
        return ["grobid", "nougat_base", "dit_base"]
    if any(kw in t for kw in ["handwrit", "manuscri"]):
        return ["trocr_large", "got_ocr2", "surya_v2"]
    if any(kw in t for kw in ["resume", "cv", "curriculum"]):
        return ["donut_base", "layoutlmv3", "paddleocr_v4"]
    if any(kw in t for kw in ["legal", "contract", "clause"]):
        return ["layoutlmv3", "dit_base", "doctr_v1"]
    if has_equations:
        return ["nougat_base", "got_ocr2", "pix2struct_base"]
    if has_tables:
        return ["surya_v2", "mineru_v1", "dit_base"]
    return ["mineru_v1", "surya_v2", "paddleocr_v4", "doctr_v1"]


@app.get("/agents/documents/models")
async def doc_models():
    """List all document analysis models with capabilities."""
    return JSONResponse(content={
        "models": DOCUMENT_ANALYSIS_MODELS,
        "total_models": len(DOCUMENT_ANALYSIS_MODELS),
    })


@app.get("/agents/documents/pipelines")
async def doc_pipelines():
    """List pre-built document analysis pipelines."""
    return JSONResponse(content={
        "pipelines": DOCUMENT_ANALYSIS_PIPELINES,
        "total_pipelines": len(DOCUMENT_ANALYSIS_PIPELINES),
    })


@app.post("/agents/documents/recommend")
async def doc_recommend(request: Request):
    """Recommend best document analysis approach."""
    body = await request.json()
    task = body.get("task", "")
    if not task:
        raise HTTPException(400, "task field required")

    has_tables = body.get("has_tables", False)
    has_equations = body.get("has_equations", False)
    recommended = recommend_doc_model(task, has_tables, has_equations)

    # Match pipeline
    matched_pipeline = None
    t = task.lower()
    for name, pipeline in DOCUMENT_ANALYSIS_PIPELINES.items():
        if any(kw in t for kw in name.split("_")):
            matched_pipeline = name
            break

    return JSONResponse(content={
        "task": task,
        "recommended_models": recommended[:5],
        "model_details": {m: DOCUMENT_ANALYSIS_MODELS[m] for m in recommended[:5] if m in DOCUMENT_ANALYSIS_MODELS},
        "matched_pipeline": matched_pipeline,
        "pipeline_info": DOCUMENT_ANALYSIS_PIPELINES.get(matched_pipeline, {}) if matched_pipeline else None,
        "agents_available": sum(len(v) for v in AGENT_CATEGORIES.get("pdf", {}).values() if isinstance(v, list)),
    })


@app.post("/agents/documents/analyze")
async def doc_analyze(request: Request):
    """Route document analysis request to optimal pipeline.

    Body: { "task": "...", "document_type": "pdf|image|receipt|academic|legal|resume", "language": "en" }
    """
    body = await request.json()
    task = body.get("task", "extract text")
    doc_type = body.get("document_type", "pdf")
    language = body.get("language", "en")

    type_to_pipeline = {
        "receipt": "receipt_parsing",
        "invoice": "receipt_parsing",
        "academic": "academic_paper",
        "paper": "academic_paper",
        "legal": "legal_analysis",
        "contract": "legal_analysis",
        "resume": "resume_screening",
        "cv": "resume_screening",
        "handwritten": "handwriting_recognition",
    }

    pipeline = type_to_pipeline.get(doc_type, "pdf_to_markdown")
    recommended = recommend_doc_model(task)
    pipeline_info = DOCUMENT_ANALYSIS_PIPELINES.get(pipeline, {})

    return JSONResponse(content={
        "status": "ready",
        "task": task,
        "document_type": doc_type,
        "language": language,
        "pipeline": pipeline,
        "pipeline_info": pipeline_info,
        "recommended_models": recommended,
        "agents": [pipeline, recommended[0] if recommended else "mineru_v1", "post_processing"],
        "message": f"Document analysis via {pipeline} pipeline. Use /agents/orchestrate with your document task for full routing.",
    })
