# AGENTS.md - Orion Core

## Dev Commands

```sh
npm run dev        # Dev server on port 8080
npm run test       # Vitest run (173 tests)
npm run test:watch # Watch mode
npm run build     # Vite production build
npm run lint       # ESLint
npx tsc --noEmit  # TypeScript check
```

## OpenRouter - Modelos Gratuitos Otimizados

### Melhores Modelos Free (200K context)
| Modelo |Uso |
|--------|-----|
| `openrouter/free` | Auto-router (melhor modelo livre) |
| `deepseek/deepseek-r1` | Reasoning |
| `qwen/qwen3-coder-480b` | Coding |
| `meta-llama/llama-3.3-70b-instruct` | General |
| `nvidia/nemotron-3-super-120b-a12b` | AI Agents |
| `mistralai/mistral-small-3.1-24b-instruct` | Fast |

### Provider no Orion
Arquivo: `src/lib/integrations/llm-providers.ts`

## Build Notes

- **Dev server works**: Starts on `http://localhost:8080`
- **Tests pass**: All 173 tests pass in 14 test files
- **TypeScript check passes**: No type errors
- **Production build**: May fail with OOM onsystems with <8GB RAM (use `NODE_OPTIONS=--max_old_space_size=4096`)

## Issues Found & Fixed

| File | Line | Issue | Status |
|------|------|-------|--------|
| `src/lib/voice/voiceConfidenceFilter.ts` | 78 | Invalid syntax: `#` instead of `//` in comment | **FIXED** |

## Project Structure

- **Frontend**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **IA Providers**: OpenAI, Gemini, Groq, Mistral, Anthropic, DeepSeek, Perplexity
- **Key directories**:
  - `src/lib/neural/` - Neural pipeline, consciousness bridge
  - `src/lib/voice/` - Voice processing, TTS
  - `src/components/` - UI components
  - `src/contexts/` - React contexts (Auth, etc.)
  - `supabase/migrations/` - DB migrations

## Legal AI Models (PT-BR)

### HuggingFace Legal Integration
Import from `@/lib/huggingface`:

```ts
import { hfClient, LEGAL_MODELS } from "@/lib/huggingface";

// NER Jurídico PT-BR (partes, datas, valores, prazos, processos)
const ner = await hfClient.extractLegalEntities(texto);

// Classificação de petições (inicial, contestação, recurso, etc.)
const classification = await hfClient.classifyLegalDocument(texto);

// Resumo de contratos
const summary = await hfClient.summarizeContract(texto);

// Resumo jurídico genérico
const summary = await hfClient.summarizeLegal(texto);
```

### Modelos PT-BR Disponíveis
| Função | Modelo | Notas |
|--------|--------|-------|
| NER Jurídico | `dominguesm/legal-bert-ner-base-cased-ptbr` | F1 0.953 |
| Classificação | `raquelsilveira/legalbertpt_fp` | Petições |
| Resumo Contrato | `AventIQ-AI/t5-summarization-for-legal-contracts` | Leve |
| Resumo Jurídico | `stjiris/t5-portuguese-legal-summarization` | PT-BR |

### Hook useLegalAnalysis
```ts
import { useLegalAnalysis } from "@/hooks/useLegalAnalysis";

const { extractEntities, classifyDocument, summarizeDocument, fullAnalysis, loading, error } = useLegalAnalysis();
```

## Formatação Jurídica Padrão Brasileiro

### Configuração Atual
| Propriedade | Valor |
|-------------|-------|
| Fonte | Arial 12pt |
| Margens | 3cm esquerda, 2cm outros |
| Espaçamento | 1.5 linhas |
| Alinhamento | Justificado |
| Recuo 1ª linha | 1.25cm |

### Arquivos Modificados
- `src/lib/document-format-config.ts` — Padrão jurídico BR
- `src/index.css` — Margens CSS (--m-left: 30mm)
- `src/lib/generators/docx-generator.ts` — Margens DOCX
- `src/components/dashboard/editor/DocumentFormatPresets.tsx` — Preset "Formatação Jurídica BR"

### Presets Disponíveis
- **Formatação Jurídica BR** — Arial 12pt, 1.5, margens 3cm
- **Petição Judicial** — Arial 12pt, CNJ
- **Contrato** — Arial 12pt
- **Parecer** — Arial 12pt
- **Sentença** — Arial 12pt, espaçamento duplo
- **Recurso** — Arial 12pt

## Non-Obvious Conventions

- Test files: `src/**/*.{test,spec}.{ts,tsx}`
- Use `@/` alias for `src/`
- Vite dev server ignores: `supabase/`, `public/docs/`, `public/data/`, `public/models/`, `bfg-report/`
- Build manual chunks for vendor libs (react, supabase, query, ui, icons, charts, editor, pdf, date)