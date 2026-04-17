---
name: Free multi-provider LLM chain
description: Inference chain Gemini→Mistral→Groq→HuggingFace, all 100% free tier
type: feature
---
Neural inference engine v3 uses 4-provider fallback chain:
1. Gemini 2.5 Flash (AI Studio) — 10 RPM, 250 RPD
2. Mistral Small (Experiment plan) — 2 RPM, 1B tokens/mês
3. Groq Llama 3.3 70B → 8B fallback — 30 RPM, 1.000 RPD
4. HuggingFace (Gemma/Qwen/Llama) — free inference API
All zero cost. MISTRAL_API_KEY already in secrets.
