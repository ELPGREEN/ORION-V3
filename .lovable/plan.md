

# HuggingFace Spaces — Mapeamento de Diretórios + Fix Build Error

## Diagnóstico do Build Error (`Ericsonv12/orion`)

O erro ocorre porque `piper-tts==1.2.0` precisa de bibliotecas de sistema (libespeak-ng, etc.) que **não existem** na imagem base do SDK Gradio. O HF Spaces com `sdk: gradio` não permite instalar pacotes de sistema — só pip.

**Solução**: Remover `piper-tts` do `requirements.txt` do space `orion` (ele já existe no `orion-gpu` com ZeroGPU). Ou trocar `sdk: gradio` para `sdk: docker` e usar Dockerfile.

---

## Mapeamento: Diretório → HF Space

| HF Space | Diretório no projeto | SDK | Arquivos a subir |
|---|---|---|---|
| `Ericsonv12/ELP` | `public/hf-space/` | Docker | `app.py`, `requirements.txt`, `Dockerfile`, `README.md` |
| `Ericsonv12/orion-gpu` | `public/hf-space-gpu/` | Gradio (ZeroGPU) | `app.py`, `requirements.txt`, `README.md` |
| `Ericsonv12/orion` | `public/hf-space-gpu/` (CPU variant) | Gradio | `app_cpu.py` → `app.py`, `requirements_cpu.txt` → `requirements.txt`, `README_cpu.md` → `README.md` |

---

## Plano de Execução

### 1. Fix Build Error do `Ericsonv12/orion`

O `requirements.txt` atual inclui `piper-tts==1.2.0` que depende de `libespeak-ng-dev` — impossível no SDK Gradio.

**Opção A (recomendada)**: Criar `requirements.txt` limpo sem piper-tts para o space `orion` (CPU-only, sem TTS local — usa Gemini TTS via frontend):

```
gradio==5.33.0
pymupdf==1.25.3
easyocr>=1.7.2
Pillow>=10.4.0
sentence-transformers>=3.3.0
numpy>=1.26.0
huggingface_hub>=0.26.0
```

**Opção B**: Trocar para `sdk: docker` no README e adicionar Dockerfile com `apt-get install libespeak-ng-dev`.

### 2. Criar arquivo `orion_cpu_space/` dedicado

Separar os arquivos do space `orion` (CPU) do `orion-gpu` (ZeroGPU) para evitar confusão:

- `orion_cpu_space/app.py` — versão CPU sem `@spaces.GPU()`
- `orion_cpu_space/requirements.txt` — sem piper-tts
- `orion_cpu_space/README.md` — `sdk: gradio`, sem `hardware: zero-a10g`

### 3. Atualizar `app.py` do space `orion` (CPU)

Remover endpoints que dependem de `piper-tts` ou torná-los opcionais com try/except:
- `/api/tts` → retorna erro gracioso "TTS unavailable on CPU tier, use orion-gpu"
- Manter: `/api/ocr`, `/api/embeddings`, `/api/pdf`, `/api/health`

### 4. Fix do space `Ericsonv12/ELP`

Verificar se o Dockerfile e app.py estão sincronizados. O app.py usa FastAPI (2352 linhas, v7.4) — precisa de `sdk: docker` no README (já está correto).

---

## Arquivos a criar/modificar

1. **Novo**: `orion_cpu_space/requirements.txt` — sem piper-tts
2. **Novo**: `orion_cpu_space/app.py` — baseado em `app_cpu.py`, sem TTS
3. **Novo**: `orion_cpu_space/README.md` — `sdk: gradio`, sem hardware GPU
4. **Verificar**: `public/hf-space/Dockerfile` — confirmar que ELP build funciona

## Upload para HF

Após as correções:

| Space | Upload |
|---|---|
| `Ericsonv12/orion` | Subir conteúdo de `orion_cpu_space/` |
| `Ericsonv12/orion-gpu` | Subir `public/hf-space-gpu/app.py` + `requirements.txt` + `README.md` |
| `Ericsonv12/ELP` | Subir todo conteúdo de `public/hf-space/` |

