---
title: ELP Neural Proxy
emoji: ⚡
colorFrom: red
colorTo: red
sdk: docker
pinned: false
---

# ELP Neural Proxy v7.2

Complete AI Agent Swarm with **2900+ agents** — PDF, Vision, **Object Detection**, Code Generation, Code Analysis, Text Analysis, Fine-Tuning, Dataset Creation, Image/Video/Audio Generation, 3D, NLP, Benchmarking.

## Endpoints

### Core
- `GET /` — Health + capability manifest
- `POST /` — PDF → JSON | `POST /markdown` — PDF → MD | `POST /html` — PDF → HTML | `POST /generate-pdf` — HTML → PDF

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

## Categories (2900+ agents)

| Category | Agents | Key |
|----------|--------|-----|
| `vision` | 350+ | Face(8), Pose(8), ObjDet(31), Domain(42), Seg(9), Scene(8), ImgProc(8), Models(24) |
| `code_gen` | 300+ | 42 langs, 19 models, 11 webapp builders |
| `code_analysis` | 350+ | Security, quality, intelligence |
| `text_nlp` | 250+ | Analysis, search, tokenization, classification, multilingual |
| `reasoning` | 300+ | Legal, financial, medical |
| `fine_tuning` | 200+ | LoRA to GGUF |
| `dataset_creation` | 180+ | Generate, convert, label |
| `image_generation` | 80+ | FLUX, SDXL, ControlNet |
| `video_generation` | 60+ | Wan2, LTX |
| `speech_audio` | 90+ | TTS, ASR, voice clone |
| `modeling_3d` | 40+ | TRELLIS, Hunyuan3D |
| `benchmarking` | 30+ | Leaderboards |
| `pdf` | 110+ | Layout, tables, legal |

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

## Example
```bash
curl -X POST https://your-space.hf.space/agents/detection/recommend \
  -H "Content-Type: application/json" \
  -d '{"task": "detect fire in security cameras", "priority": "speed", "realtime": true}'
```

## NEUROCORE AI
Neural Proxy module — Client: `src/lib/neural/hf-space-client.ts`
