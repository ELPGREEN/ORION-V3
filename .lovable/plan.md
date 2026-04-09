

# Plano de Otimizacao de Performance — 5 Prioridades

## Resumo
Implementar as 5 otimizacoes ordenadas por impacto para reduzir tempo de carregamento do app, eliminar cold starts do HF Space, e melhorar latencia das edge functions.

---

## 1. Lucide-react tree-shaking (~100KB bundle reduction)

**Problema**: 374 arquivos importam de `lucide-react`. Vite faz tree-shaking automatico, mas imports como `import { icons } from 'lucide-react'` ou re-exports em barrel files podem impedir isso.

**Acao**: Verificar se ha imports genericos que bloqueiam tree-shaking. O padrao atual (`import { Camera } from 'lucide-react'`) ja e correto para tree-shaking. Vou auditar se existe algum uso de `icons` map ou dynamic imports que puxe o bundle inteiro, e otimizar o `manualChunks` do Vite para isolar lucide do vendor-ui.

**Arquivos**: `vite.config.ts`, qualquer arquivo com `import { icons }` ou `import * as` de lucide.

---

## 2. HF Space warm-up (elimina cold start 10-30s)

**Problema**: Modelos CNN (DETR, SegFormer, DPT, ResNet) so carregam no primeiro request. O DETR tem instancias duplicadas GPU/CPU (90MB extra).

**Acoes**:
- Adicionar funcao `warm_up()` no final do `app.py` que pre-carrega modelos CPU (embedder, OCR, ResNet features) no startup
- Unificar DETR GPU/CPU: usar uma unica instancia que roda em CPU por padrao e move para GPU sob `@spaces.GPU`
- Pre-carregar processadores (tokenizers/image processors) que sao leves

**Arquivo**: `public/hf-space-gpu/app.py`

---

## 3. i18n lazy loading (~30-50KB reducao)

**Problema**: 13 arquivos JSON de traducao sao importados estaticamente em `src/i18n/index.ts`. Apenas 1 idioma e usado por vez.

**Acoes**:
- Converter `src/i18n/index.ts` para carregar apenas `pt` (default) estaticamente
- Outros idiomas carregados via `import()` dinamico no `LanguageContext.tsx`
- Cache do idioma carregado em `_models` pattern (ja em memoria apos primeiro load)

**Arquivos**: `src/i18n/index.ts`, `src/contexts/LanguageContext.tsx`

---

## 4. DETR modelo compartilhado GPU/CPU (90MB RAM)

**Problema**: `_cnn_detect_objects_cpu()` carrega `detr_cpu` separado do `detr` GPU. Mesmo modelo, 2x memoria.

**Acao**: Remover `_cnn_detect_objects_cpu` separado. Na funcao `cnn_detect_objects`, fazer fallback CPU usando o mesmo modelo (carregado em CPU, movido para GPU apenas durante `@spaces.GPU`). Modelo fica em CPU por padrao.

**Arquivo**: `public/hf-space-gpu/app.py` (linhas 260-354)

---

## 5. Neural-ops split (reduz cold start edge functions)

**Problema**: `neural-ops/index.ts` tem 2507 linhas. Deno precisa parsear tudo no primeiro request.

**Acoes**:
- Extrair handlers pesados (Vertex AI OAuth, vision analyze, pipeline orchestrator) para funcoes separadas:
  - `neural-vision` — analise de imagem
  - `neural-pipeline` — orquestracao de pipeline
- Manter `neural-ops` como router leve que faz `fetch()` interno para sub-funcoes
- Alternativa mais simples: manter monolitico mas usar lazy imports com `await import()` para blocos pesados

**Arquivos**: `supabase/functions/neural-ops/index.ts`, novas funcoes edge

---

## Detalhes Tecnicos

```text
Impacto estimado:
┌──────────────────────────┬──────────┬───────────────┐
│ Otimizacao               │ Ganho    │ Complexidade  │
├──────────────────────────┼──────────┼───────────────┤
│ lucide tree-shaking      │ ~100KB   │ Baixa         │
│ HF warm-up               │ -10-30s  │ Media         │
│ i18n lazy load           │ ~30-50KB │ Media         │
│ DETR unificado           │ -90MB    │ Baixa         │
│ neural-ops split         │ -200ms   │ Alta          │
└──────────────────────────┴──────────┴───────────────┘
```

