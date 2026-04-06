---
title: ELP Neural Proxy
emoji: ⚡
colorFrom: red
colorTo: red
sdk: docker
pinned: false
---

# ELP Neural Proxy v7.4

Complete AI Agent Swarm with **3100+ agents** — PDF, Vision, **Object Detection**, Code Generation, Code Analysis, Text Analysis, **Question Answering**, **Document Analysis**, Fine-Tuning, Dataset Creation, Image/Video/Audio Generation, 3D, NLP, Benchmarking.

## Endpoints

### Core
- `GET /` — Health + capability manifest
- `POST /` — PDF → JSON | `POST /markdown` — PDF → MD | `POST /html` — PDF → HTML | `POST /generate-pdf` — HTML → PDF

### Document Analysis (NEW v7.4)
- `GET /agents/documents/models` — All document analysis models (MinerU, PaddleOCR, Surya, Nougat, Donut, DiT, GROBID, GOT-OCR2, TrOCR)
- `GET /agents/documents/pipelines` — Pre-built pipelines (pdf_to_markdown, receipt_parsing, academic_paper, legal_analysis, resume_screening, handwriting)
- `POST /agents/documents/recommend` — Recommend best model/pipeline for document task
- `POST /agents/documents/analyze` — Route document analysis to optimal pipeline

### Question Answering (v7.3)
- `GET /agents/qa/domains` — All QA domain specializations (medical, legal, financial, scientific, education, general)
- `GET /agents/qa/models` — QA models with capabilities (extractive, generative, visual, table, audio)
- `POST /agents/qa/classify` — Classify QA type and recommend models
- `POST /agents/qa/answer` — Route QA request to optimal agent pipeline
- `POST /agents/qa/recommend` — Recommend best QA approach for a use case

### Agent Orchestration
- `POST /agents/orchestrate` — Route query → optimal agent pipeline
- `POST /agents/swarm` — Batch parallel execution
- `GET /agents/list` — List all 2900+ agents

### Object Detection (NEW v7.2)
- `GET /agents/detection/models` — All detection models (YOLO v5-v26, DETR, GroundingDINO, OWLv2, SAM3, MolmoPoint, Qwen2-VL)
- `GET /agents/detection/domains` — Domain detectors (traffic, safety, medical, agriculture, industrial, geospatial)
- `POST /agents/detection/recommend` — Recommend best model for use case
- `POST /agents/detection/detect` — Run detection routing

### Code (300+ agents)
- `POST /agents/code/generate` | `/webapp` | `/analyze` | `/classify` | `/autodoc` | `/compliance` | `/infill` | `/repo-to-text`

### Text Analysis (250+ agents)
- `POST /agents/text/detect-ai` | `/grammar` | `/emotion` | `/readability` | `/clickbait` | `/prompt-injection` | `/zero-shot` | `/semantic-search` | `/tokenize`

### Fine-Tuning & Dataset
- `GET /finetune/methods` | `/models` | `/datasets` | `POST /finetune/configure` | `/estimate`
- `GET /dataset/schemas` | `/formats` | `POST /dataset/configure` | `/validate` | `/convert` | `/deduplicate` | `/statistics`

## Categories (3100+ agents)

| Category | Agents | Key |
|----------|--------|-----|
| `vision` | 350+ | Face(8), Pose(8), ObjDet(31), Domain(42), Seg(9), Scene(8), ImgProc(8), Models(24) |
| `code_gen` | 300+ | 42 langs, 19 models, 11 webapp builders |
| `code_analysis` | 350+ | Security, quality, intelligence |
| `text_nlp` | 250+ | Analysis, search, tokenization, classification, multilingual |
| `question_answering` | **120+** | Extractive, Generative, Document, Visual, Domain, Multilingual, Table, Audio QA |
| `reasoning` | 300+ | Legal, financial, medical |
| `fine_tuning` | 200+ | LoRA to GGUF |
| `dataset_creation` | 180+ | Generate, convert, label |
| `image_generation` | 80+ | FLUX, SDXL, ControlNet |
| `video_generation` | 60+ | Wan2, LTX |
| `speech_audio` | 90+ | TTS, ASR, voice clone |
| `modeling_3d` | 40+ | TRELLIS, Hunyuan3D |
| `benchmarking` | 30+ | Leaderboards |
| `pdf` | **200+** | OCR(12), Layout(10), Tables(8), Parsing(11), Bibliography(7), Resume(6), Scientific(7), Legal(6), Conversion(8), Models(13) |

## Object Detection v7.2

### Models: YOLO v5-v12/v26/YOLOE/YOLO-World, DETR/RF-DETR/D-FINE/Mr.DETR, GroundingDINO, OWLv2, MolmoPoint-8B, Qwen2-VL, LLMDet, SAM3

### Domains
| Domain | Classes |
|--------|---------|
| Traffic | License plates, signs, potholes, vehicles, accidents |
| Safety | Fire/smoke, PPE, weapons, crowd counting, masks |
| Medical | Fractures, tumors, blood cells, X-ray |
| Agriculture | Wildlife, plant disease, pests, ripeness |
| Industrial | PCB, defects, LEGO, box counting, solar panels |
| Geospatial | Satellite, buildings, moon rocks |

### Features
- Zero-shot detection (GroundingDINO, OWLv2, YOLO-World)
- Open-vocabulary (YOLOE, Qwen2-VL, LLMDet)
- Multi-object tracking (SAM3, MolmoPoint)
- Real-time WebGPU (YOLOv9/v10 browser-based)
- Object counting with ROI
- Abandoned object detection

## Question Answering v7.3

### QA Types
| Type | Models | Use Case |
|------|--------|----------|
| Extractive | mDeBERTa, RoBERTa, XLM-R, Longformer | Find answers in given text |
| Generative | Flan-T5, UnifiedQA, Qwen3, LLaMA3 | Generate comprehensive answers |
| Document QA | PDF-QA-RAG, Kotaemon, GenAI Doc QnA | Q&A over uploaded PDFs/documents |
| Visual QA | MiniCPM-o, Qwen2-VL, LLaVA-Next | Answer questions about images |
| Table QA | TAPAS, TableLlama, SQL-QA | Query structured data |
| Domain QA | Medical, Legal, Financial, Scientific | Specialized knowledge Q&A |
| Multilingual | 13 languages, XLM-R, mDeBERTa | Cross-lingual Q&A |
| Audio QA | Music Flamingo, Audio QA | Answer from audio/music |

### Features
- Automatic QA type classification from question + context
- Domain-aware model routing (medical, legal, financial, scientific, education)
- 100+ language support via multilingual models
- RAG pipeline integration for document-based QA
- Visual QA for charts, infographics, diagrams, scene understanding
- Table QA with SQL-like operations (select, aggregate, compare)

## Example
```bash
curl -X POST https://your-space.hf.space/agents/qa/classify \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the side effects of aspirin?", "domain": "medical", "language": "en"}'
```

```bash
curl -X POST https://your-space.hf.space/agents/detection/recommend \
  -H "Content-Type: application/json" \
  -d '{"task": "detect fire in security cameras", "priority": "speed", "realtime": true}'
```

## NEUROCORE AI
Neural Proxy module — Client: `src/lib/neural/hf-space-client.ts`
