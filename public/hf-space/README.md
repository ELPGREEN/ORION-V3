---
title: ELP Neural Proxy
emoji: ⚡
colorFrom: red
colorTo: red
sdk: docker
pinned: false
---

# ELP Neural Proxy v7.0

Complete AI Agent Swarm with **2500+ agents** covering ALL HuggingFace Spaces categories:
PDF, Vision, Code Generation, Code Analysis, Fine-Tuning, Dataset Creation, Image/Video/Audio Generation, 3D, NLP, Benchmarking.

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
| `GET /agents/list` | List all 2500+ agents by category |

### Code Generation (NEW v7.0 — 300+ agents)
| Endpoint | Description |
|----------|-------------|
| `POST /agents/code/generate` | Code generation routing (42 languages, 8 paradigms, 25 frameworks) |
| `POST /agents/code/webapp` | WebApp builder (React, HTML, Streamlit, Gradio, Marimo, Fullstack) |
| `POST /agents/code/analyze` | Security audit + quality metrics |
| `POST /agents/code/classify` | Identify programming language of code snippet |
| `POST /agents/code/autodoc` | Auto-generate docstrings/JSDoc for code |
| `POST /agents/code/compliance` | Check code against security/accessibility/performance standards |
| `POST /agents/code/infill` | Code infilling — generate between prefix and suffix |
| `POST /agents/code/repo-to-text` | Convert GitHub repo to LLM-ready plain text |

### Fine-Tuning (10 methods, 21 models)
| Endpoint | Description |
|----------|-------------|
| `GET /finetune/methods` | LoRA, QLoRA, DreamBooth, SDXL, FLUX, DPO, TTS, RVC, AutoTrain |
| `GET /finetune/models` | LLaMA 3, Mistral, Qwen3-Coder-32B, Gemma 4, Phi-3, DeepSeek-Coder-V2, Yi-Coder, OpenCoder, StarCoder2, IBM Granite, CodeLlama, SDXL, FLUX, Whisper, Kokoro |
| `GET /finetune/datasets` | 10 format templates |
| `POST /finetune/configure` | Generate config + training script |
| `POST /finetune/estimate` | VRAM, time, GPU recs, cost |

### Dataset Creation
| Endpoint | Description |
|----------|-------------|
| `GET /dataset/schemas` | Synthetic schemas: instruction, chat, code, legal, sentiment |
| `GET /dataset/formats` | 10 templates: instruction, chat, DPO, image_caption, classification, NER, QA, translation, audio, code |
| `POST /dataset/configure` | Generate dataset creation config |
| `POST /dataset/validate` | Validate samples against templates |
| `POST /dataset/convert` | Convert between JSON/JSONL/CSV |
| `POST /dataset/deduplicate` | Remove duplicate rows |
| `POST /dataset/statistics` | Field-level stats for any dataset |

## Agent Categories (2500+)

| Category | Agents | Description |
|----------|--------|-------------|
| `code_gen` | 300+ | 42 languages × 8 paradigms × 25 frameworks + 19 models + 11 webapp builders + 14 specialized |
| `code_analysis` | 350+ | Security (12), Quality (14), Intelligence (12), Multi-Agent (6) |
| `reasoning` | 300+ | Legal, financial, medical, scientific |
| `vision` | 200+ | Face, pose, OCR, segmentation, try-on, depth |
| `fine_tuning` | 200+ | LoRA to GGUF, all model types |
| `dataset_creation` | 180+ | Generate, convert, label, deduplicate |
| `image_generation` | 80+ | FLUX, SDXL, ControlNet, comics |
| `video_generation` | 60+ | Wan2, LTX, face swap, dubbing |
| `speech_audio` | 90+ | TTS, ASR, voice clone, music |
| `modeling_3d` | 40+ | TRELLIS, Hunyuan3D, gaussian splatting |
| `text_nlp` | 120+ | Summarization, translation, NER |
| `benchmarking` | 30+ | Leaderboards, model comparison, BigCodeBench |
| `pdf` | 110+ | Layout, tables, legal docs |

## Code Generation Models (v7.0)

| Model | Base | Context | VRAM |
|-------|------|---------|------|
| Qwen3-Coder-32B | Qwen/Qwen2.5-Coder-32B-Instruct | 131K | 64GB |
| DeepSeek-Coder-V2 | deepseek-ai/DeepSeek-Coder-V2-Instruct | 128K | 48GB |
| Yi-Coder-9B | 01-ai/Yi-Coder-9B-Chat | 131K | 18GB |
| OpenCoder-8B | OpenCoder-LLM/OpenCoder-8B-Instruct | 8K | 16GB |
| StarCoder2-15B | bigcode/starcoder2-15b | 16K | 30GB |
| CodeLlama-34B | codellama/CodeLlama-34b-Instruct-hf | 16K | 68GB |
| IBM Granite-3B | ibm-granite/granite-3b-code-instruct | 8K | 6GB |
| DeepSeek-Coder-7B | deepseek-ai/deepseek-coder-6.7b-instruct | 16K | 14GB |

## WebApp Builders (v7.0)

- **html_react_generator** — HTML/React from description (Qwen3-Coder)
- **streamlit_app_builder** — Streamlit apps (Gemini App Builder)
- **gradio_app_builder** — Gradio apps from images/descriptions
- **marimo_app_builder** — Marimo reactive notebooks
- **bolt_diy_fullstack** — Full-stack web apps with AI
- **anycoder_multi** — Multi-framework code generation
- **instantcoder** — Instant app code from idea
- **gemini_coder** — Google Gemini-powered code gen

## Quick Examples

### Generate WebApp
```bash
curl -X POST https://your-space.hf.space/agents/code/webapp \
  -H "Content-Type: application/json" \
  -d '{"framework": "react", "description": "Todo app with dark mode"}'
```

### Classify Code Language
```bash
curl -X POST https://your-space.hf.space/agents/code/classify \
  -H "Content-Type: application/json" \
  -d '{"code": "fn main() { println!(\"Hello\"); }"}'
```

### Auto-Generate Documentation
```bash
curl -X POST https://your-space.hf.space/agents/code/autodoc \
  -H "Content-Type: application/json" \
  -d '{"code": "def fibonacci(n):\n    if n <= 1: return n\n    return fibonacci(n-1) + fibonacci(n-2)", "language": "python"}'
```

### Code Compliance Check
```bash
curl -X POST https://your-space.hf.space/agents/code/compliance \
  -H "Content-Type: application/json" \
  -d '{"code": "<img src=\"x.png\"><button>Click</button>", "standards": ["accessibility"]}'
```

### Code Infilling
```bash
curl -X POST https://your-space.hf.space/agents/code/infill \
  -H "Content-Type: application/json" \
  -d '{"prefix": "def sort_list(arr):\n    ", "suffix": "\n    return arr", "language": "python"}'
```

## Integração NEUROCORE AI

Módulo oficial **Neural Proxy** da arquitetura NEUROCORE AI — cobrindo todas as 30+ categorias do HuggingFace Spaces.
- **Client**: `src/lib/neural/hf-space-client.ts`
