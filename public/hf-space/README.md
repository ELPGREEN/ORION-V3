---
title: ELP Neural Proxy
emoji: ⚡
colorFrom: red
colorTo: red
sdk: docker
pinned: false
---

# ELP Neural Proxy v6.0

Complete AI Agent Swarm with **2000+ agents** covering ALL HuggingFace Spaces categories:
PDF, Vision, Code, Fine-Tuning, Dataset Creation, Image/Video/Audio Generation, 3D, NLP, Benchmarking.

## All Endpoints

### Health
- `GET /` — Status + full capability manifest

### PDF Processing
| Endpoint | Description |
|----------|-------------|
| `POST /` | PDF → JSON layout segments |
| `POST /markdown` | PDF → structured Markdown |
| `POST /html` | PDF → HTML |
| `POST /generate-pdf` | HTML → PDF (WeasyPrint) |

### Agent Orchestration
| Endpoint | Description |
|----------|-------------|
| `POST /agents/orchestrate` | Route query → optimal agent pipeline |
| `POST /agents/swarm` | Batch parallel execution |
| `GET /agents/list` | List all 2000+ agents by category |

### Code Intelligence
| Endpoint | Description |
|----------|-------------|
| `POST /agents/code/analyze` | Security audit + quality metrics |
| `POST /agents/code/generate` | Code generation routing |

### Fine-Tuning (10 methods, 14 models)
| Endpoint | Description |
|----------|-------------|
| `GET /finetune/methods` | LoRA, QLoRA, DreamBooth, SDXL, FLUX, DPO, TTS, RVC, AutoTrain |
| `GET /finetune/models` | LLaMA 3, Mistral, Qwen, Gemma 4, Phi-3, DeepSeek, SDXL, FLUX, Whisper, Kokoro |
| `GET /finetune/datasets` | 10 format templates |
| `POST /finetune/configure` | Generate config + training script |
| `POST /finetune/estimate` | VRAM, time, GPU recs, cost |

### Dataset Creation (NEW v6.0)
| Endpoint | Description |
|----------|-------------|
| `GET /dataset/schemas` | Synthetic schemas: instruction, chat, code, legal, sentiment |
| `GET /dataset/formats` | 10 templates: instruction, chat, DPO, image_caption, classification, NER, QA, translation, audio, code |
| `POST /dataset/configure` | Generate dataset creation config |
| `POST /dataset/validate` | Validate samples against templates |
| `POST /dataset/convert` | Convert between JSON/JSONL/CSV |
| `POST /dataset/deduplicate` | Remove duplicate rows |
| `POST /dataset/statistics` | Field-level stats for any dataset |

## Agent Categories (2000+)

| Category | Agents | Description |
|----------|--------|-------------|
| `code_gen` | 150+ | 30 languages × 5 paradigms × 14 frameworks |
| `code_analysis` | 225+ | Security, performance, complexity |
| `reasoning` | 300+ | Legal, financial, medical, scientific |
| `vision` | 200+ | Face, pose, OCR, segmentation, try-on, depth |
| `fine_tuning` | 200+ | LoRA to GGUF, all model types |
| `dataset_creation` | 180+ | Generate, convert, label, deduplicate |
| `image_generation` | 80+ | FLUX, SDXL, ControlNet, comics |
| `video_generation` | 60+ | Wan2, LTX, face swap, dubbing |
| `speech_audio` | 90+ | TTS, ASR, voice clone, music |
| `modeling_3d` | 40+ | TRELLIS, Hunyuan3D, gaussian splatting |
| `text_nlp` | 120+ | Summarization, translation, NER |
| `benchmarking` | 30+ | Leaderboards, model comparison |
| `pdf` | 110+ | Layout, tables, legal docs |

## Quick Examples

### Generate Dataset Config
```bash
curl -X POST https://your-space.hf.space/dataset/configure \
  -H "Content-Type: application/json" \
  -d '{"schema_type": "code_exercises", "num_samples": 5000, "domain": "code", "language": "pt"}'
```

### Validate Dataset Sample
```bash
curl -X POST https://your-space.hf.space/dataset/validate \
  -H "Content-Type: application/json" \
  -d '{"format": "instruction", "sample": {"instruction": "Summarize", "output": "Summary here"}}'
```

### Dataset Statistics
```bash
curl -X POST https://your-space.hf.space/dataset/statistics \
  -H "Content-Type: application/json" \
  -d '{"data": [{"text": "hello", "label": "pos"}, {"text": "bad", "label": "neg"}]}'
```

## Integração NEUROCORE AI

Módulo oficial **Neural Proxy** da arquitetura NEUROCORE AI — cobrindo todas as 30+ categorias do HuggingFace Spaces.
- **Client**: `src/lib/neural/hf-space-client.ts`
