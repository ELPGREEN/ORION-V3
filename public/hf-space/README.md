---
title: ELP Neural Proxy
emoji: ⚡
colorFrom: red
colorTo: red
sdk: docker
pinned: false
---

# ELP Neural Proxy v5.0

Neural Agent Swarm with 1500+ agents: PDF analysis, code generation, code auditing, vision, reasoning, and **fine-tuning orchestration**.

## Endpoints

### PDF
- `POST /` — Analyze PDF layout → JSON segments
- `POST /markdown` — PDF → structured Markdown
- `POST /html` — PDF → HTML
- `POST /generate-pdf` — HTML → PDF (WeasyPrint)

### Agents
- `POST /agents/orchestrate` — Route query to optimal agent pipeline
- `POST /agents/swarm` — Batch parallel execution
- `GET /agents/list` — List all agent categories

### Code
- `POST /agents/code/analyze` — Security audit + quality metrics
- `POST /agents/code/generate` — Code generation routing

### Fine-Tuning (NEW v5.0)
- `GET /finetune/methods` — List fine-tuning methods (LoRA, QLoRA, DreamBooth, SDXL, FLUX, DPO, TTS, RVC, AutoTrain)
- `GET /finetune/models` — List supported base models (LLaMA 3, Mistral, Qwen, Gemma, Phi-3, DeepSeek, StarCoder, SDXL, FLUX, Whisper)
- `GET /finetune/datasets` — Dataset format templates (instruction, chat, DPO, image_caption, classification)
- `POST /finetune/configure` — Generate complete training config + script
- `POST /finetune/estimate` — Estimate VRAM, time, GPU recs, cost
- `POST /finetune/validate-dataset` — Validate dataset samples

## Fine-Tuning Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| `lora` | LoRA adapter training | General LLM fine-tuning |
| `qlora` | 4-bit QLoRA | Low-VRAM LLM fine-tuning |
| `dreambooth_lora` | DreamBooth + LoRA | Custom subject generation |
| `sdxl_lora` | SDXL LoRA trainer | Style/concept for SDXL |
| `flux_lora` | FLUX.1 LoRA | FLUX image model LoRA |
| `embedding` | Sentence Transformer | Custom embeddings |
| `tts` | TTS fine-tuning | Voice synthesis |
| `rvc` | RVC v2 voice conversion | Voice cloning |
| `dpo` | Direct Preference Optimization | Alignment training |
| `autotrain` | AutoTrain Advanced | No-code training |

## Example: Configure LoRA Training

```bash
curl -X POST https://your-space.hf.space/finetune/configure \
  -H "Content-Type: application/json" \
  -d '{
    "method": "qlora",
    "model": "llama3-8b",
    "dataset_format": "instruction",
    "custom_params": {"epochs": 5, "r": 32}
  }'
```

## Example: Estimate Resources

```bash
curl -X POST https://your-space.hf.space/finetune/estimate \
  -H "Content-Type: application/json" \
  -d '{"method": "qlora", "model": "llama3-8b", "dataset_rows": 50000, "epochs": 3}'
```

## Integração NEUROCORE AI

Módulo oficial **PDF Vision + Fine-Tuning API** da arquitetura NEUROCORE AI.

- **Client TypeScript**: `src/lib/neural/hf-space-client.ts`
- Categorias de agentes: `code_gen`, `code_analysis`, `reasoning`, `vision`, `fine_tuning`, `pdf`
