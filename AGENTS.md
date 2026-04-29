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
| `tencent/hy3-preview:free` | Reasoning & Coding (agente Feynman) |

### Provider no Orion
Arquivo: `src/lib/integrations/llm-providers.ts`

## Knowledge Harvester — Sistema Autocognitivo

### Arquivos
- `src/lib/neural/knowledge-harvester-prompts.ts` — 10 prompts estruturados + 100+ tópicos
- `src/lib/neural/knowledge-harvester-pipeline.ts` — Pipeline multi-LLM com consenso
- `src/hooks/useKnowledgeHarvester.ts` — React hook
- `src/components/dashboard/neural/KnowledgeHarvesterPanel.tsx` — UI Component

### 10 Prompts Autocognitivos
| ID | Nome | Dificuldade |
|----|------|-------------|
| `master_study` | Estudo Profundo + Autocognição | advanced |
| `probability_uncertainty` | Probabilidade e Incerteza | expert |
| `multi_llm_consensus` | Consenso Multi-LLM | expert |
| `anti_hallucination` | Auto-Correção (Anti-Alucinação) | advanced |
| `agent_builder` | Construção de Agente | advanced |
| `scenario_simulation` | Simulação e Cenários | intermediate |
| `meta_learning` | Meta-Aprendizado | expert |
| `memory_evolution` | Memória e Evolução | intermediate |
| `self_test` | Auto-Desafio (Teste) | intermediate |
| `evolution_loop` | Evolução Contínua (Loop) | expert |

### Uso via Hook
```ts
import { useKnowledgeHarvester } from "@/hooks/useKnowledgeHarvester";

const { run, runQuick, runFull, runRandom, results, isRunning, status } = useKnowledgeHarvester();

await runQuick("Model routing adaptativo baseado em contexto e custo");
await runFull("Memória episódica em agentes autônomos");
await runRandom();
```

### Pipeline Config
```ts
import { createQuickHarvester, createFullHarvester, createCustomHarvester } from "@/lib/neural/knowledge-harvester-pipeline";

const pipeline = createQuickHarvester();
pipeline.on({
  onResult: (r) => console.log(r.topic, r.confidence),
  onComplete: (session) => console.log(session.overallConfidence),
});
await pipeline.run("Tópico aqui");
```

## MCP Integration (OpenRouter)

### Arquivos
- `src/lib/neural/openrouter-mcp-bridge.ts` — MCP client bridge com OpenRouter
- `supabase/functions/orion-mcp/index.ts` — MCP Edge Function com tool calling

### Endpoints MCP
| Endpoint | Função |
|----------|--------|
| `/mcp/tools` | Lista ferramentas disponíveis |
| `/mcp/call` | Chama ferramenta específica |
| `/mcp/chat` | LLM com tool calling automático (OpenRouter) |
| `/mcp/llm` | LLM direto sem ferramentas |
| `/health` | Health check com status OpenRouter |

### Modelos Default
- Default: `tencent/hy3-preview:free`
- Fallback: `openrouter/free`, `deepseek/deepseek-r1`

## Provider Registry Unificado (Phase 2)

### Arquivo Central
- `src/lib/integrations/openrouter-free-models.ts` — Single source of truth para todos os modelos OpenRouter free

### Modelos por Tier
| Tier | Modelos | Uso |
|------|---------|-----|
| `fast` | Mistral Small 3.1, Nemotron Nano 9B | Early exit, queries simples |
| `balanced` | Tencent HY3, OpenRouter Auto | Queries moderadas |
| `reasoning` | DeepSeek R1 | Queries complexas |
| `coding` | Qwen3 Coder | Geração de código |
| `heavy` | Llama 3.3 70B | Análise profunda |

### Funções Exportadas
```ts
import { OPENROUTER_FREE_MODELS, FAST_MODELS, REASONING_MODELS, getModelForComplexity, toCascadeFormat } from "@/lib/integrations/openrouter-free-models";

// Obter modelos recomendados por complexidade
const models = getModelForComplexity("simple"); // → FAST_MODELS

// Converter para formato cascade
const cascade = toCascadeFormat(); // → [{ provider: "openrouter", model: "..." }, ...]
```

### Consumidores
- `llm-providers.ts` — Usa `toCascadeFormat(OPENROUTER_FREE_MODELS)` para `chatWithCascade`
- `pentagon-reasoner/index.ts` — `MODEL_CASCADE` espelhado (Deno edge function, não pode importar de src/)
- `quantum-llm-router.ts` — `PROVIDER_REGISTRY` separado (tem metadados quânticos adicionais)

## Phase 2 — Optimizações Cognitivas

### Async Non-blocking Feynman Loop
- `ReasoningAdapter.ts:68-72` — Feynman refinement agora é fire-and-forget
- Resultado original retorna imediatamente; Feynman roda em background
- Refinamentos salvos em `sessionStorage` para uso no próximo turno
- Economiza ~5-10s em queries complexas

### Quantum Router Early Exit
- `PentagonPizzaOrchestrator.ts:78-112` — Para queries simples, roteamento direto via quantum router
- Bypassa Memory + Reasoning layers (~150-300ms savings)
- Memory/Reasoning rodam em background para learning (`backgroundLearn`)
- Só ativa para queries `simple` com quantum score > 0.5

### Unified Provider List
- 3 listas de providers consolidadas em `openrouter-free-models.ts`
- Adicionado `openrouter/free` ao cascade (faltava no pentagon-reasoner)
- Adicionado `nvidia/nemotron-nano-9b-v2:free` como fast tier

## Build Notes

- **Dev server works**: Starts on `http://localhost:8080`
- **Tests pass**: 262/266 tests (4 pre-existing failures in NeuralEvolutionPanel mocks)
- **TypeScript check passes**: No type errors
- **Production build**: May fail with OOM on systems with <8GB RAM (use `NODE_OPTIONS=--max_old_space_size=4096`)

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