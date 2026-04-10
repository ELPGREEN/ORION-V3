

# Auditoria Completa: neural-ops + useOrionReasoning + orion-ai-client

---

## 1. neural-ops/index.ts (2799 linhas)

### Problemas Críticos

**P1 — System prompts enormes e redundantes (linhas 606-1086)**
- `ORION_SYSTEM_PROMPT_COMPACT` (~800 tokens) e `ORION_SYSTEM_PROMPT_FULL` (~2000 tokens) incluem pipelines de investimento, 6 agentes autônomos, 5 redes neurais — texto que confunde o LLM para queries simples.
- `ORION_VISION_PROMPT` (~3000 tokens) tem tabela de reconhecimento de objetos detalhada (BONÉ, CANECA, ÓCULOS etc.) que poderia ser injetada sob demanda.
- `ORION_FRAMEWORKS_PROMPT` (~2000 tokens) e `ORION_ARCHITECTURE_KNOWLEDGE` (~1500 tokens) são SEMPRE injetados para queries de visão, totalizando ~8500 tokens de system prompt. Isso é **excessivo** — reduz qualidade e aumenta latência.

**P2 — Código de conversão Gemini duplicado 3x (linhas 128-175, 1502-1543, 2046-2081)**
- `callVertexAI`, `callGeminiAPI`, e `convertToGeminiFormat` fazem a mesma conversão OpenAI→Gemini. São 3 implementações diferentes com pequenas variações (temperatura, thinkingBudget, padding de base64).

**P3 — Fallback chain com 9+ providers sem timeout global (linhas 2176-2461)**
- Se Vertex, 8 chaves Gemini, Groq, DeepSeek, HuggingFace, Mistral e OpenRouter falharem sequencialmente, o tempo total pode exceder 30-60 segundos. Não há timeout global para o handler.

**P4 — `extractTextMessages` duplicado 5x (linhas 1550-1555, 1597-1602, 1635-1641, 1657-1662, 1674-1681)**
- Cada provider tem sua própria versão de `map(m => ({ role, content })`. Deveria ser uma função compartilhada (já existe `extractTextMessages` na linha 1674 mas nem todos usam).

**P5 — RAG paralelo sem cache (linhas 1268-1305)**
- Web search, URL scrape e YouTube fetch rodam em paralelo com timeout de 3s cada, mas sem cache. A mesma query repetida gera 3 fetches externos novamente.

### Melhorias Sugeridas

| # | Melhoria | Impacto |
|---|----------|---------|
| M1 | Unificar conversão OpenAI→Gemini em UMA função | -200 linhas, menos bugs |
| M2 | Reduzir COMPACT prompt para ~300 tokens (remover pipeline/agentes) | Respostas mais naturais |
| M3 | Injetar FRAMEWORKS/ARCHITECTURE apenas quando `isIdentityQuestion` ou `isJarvisComparison` | -5000 tokens em 90% das queries |
| M4 | Adicionar timeout global de 15s no handler streaming | Evita timeouts de edge function |
| M5 | Cache de RAG/web search por 5 min (in-memory) | Menos latência em re-queries |
| M6 | Usar `extractTextMessages` em todos os providers | Elimina 5 duplicações |

---

## 2. useOrionReasoning.ts (1875 linhas)

### Problemas Críticos

**P6 — Hook monolítico com 1875 linhas em um único useCallback**
- O `askAIInternal` tem ~1400 linhas de código dentro de um único callback. Isso é impossível de manter, testar ou debugar. Deveria ser dividido em sub-hooks: `useLocalCommands`, `useVoiceAuth`, `useLLMPipeline`, `usePostProcessing`.

**P7 — Cleanup de `isProcessing` inconsistente (pattern "early return")**
- Há ~15 pontos de retorno antecipado, cada um com a mesma sequência: `aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;`. Se um `return` esquecer uma dessas flags, o sistema trava em "processando" para sempre.
- **Solução**: Extrair para `const cleanup = () => { ... }` no início e usar `try/finally`.

**P8 — `console.error` override é perigoso (linhas 126-153)**
- O hook sobrescreve `console.error` e `console.warn` para capturar erros. Isso pode mascarar erros reais e conflitar com outros tools de debugging.

**P9 — TTS warmup fetch a cada pergunta (linha 416-420)**
- Cada pergunta dispara um fetch para `gemini-tts` com `text: "."`. Isso gera billing e tráfego desnecessário. Deveria fazer warmup apenas 1x por sessão.

**P10 — Markdown stripping duplicado 2x (linhas 1594-1605 e 1633-1645)**
- O mesmo regex cleanup de markdown aparece em 2 lugares idênticos.

**P11 — `supabase.auth.getUser()` chamado 6+ vezes no mesmo fluxo**
- Linhas 528, 578, 672, 910, 1152, 1518 — todas chamam `getUser()` separadamente. Com cache no window, economizaria latência.

### Melhorias Sugeridas

| # | Melhoria | Impacto |
|---|----------|---------|
| M7 | Extrair `cleanup()` helper e usar `try/finally` | Elimina travamentos |
| M8 | Dividir em 4-5 sub-hooks | Manutenibilidade |
| M9 | TTS warmup apenas 1x por sessão (flag ref) | -1 fetch/pergunta |
| M10 | Extrair `stripMarkdown()` para utility | -20 linhas, DRY |
| M11 | Cache `authUser` em ref (já tem parcial com `__orionUserName`) | -5 chamadas DB |
| M12 | Mover `console.error` override para módulo separado | Isolamento |

---

## 3. orion-ai-client.ts (1143 linhas)

### Problemas Identificados

**P12 — `applyContrastEnhancement` (CLAHE) ainda presente (linhas 30-60)**
- Foi "removida" no plano anterior mas o código ainda existe. Não é chamada no fluxo principal (já otimizado), mas polui o bundle.

**P13 — `extractShapeDescriptors` pesado (linhas 62-140)**
- Processamento pixel-a-pixel de histogramas de cor e detecção de bordas. Roda a cada frame de visão. Poderia usar subsampling mais agressivo.

**P14 — Duplicação de intent classification**
- `classifyIntent` no ai-client e `somClassify` no useOrionReasoning fazem classificação similar. O resultado do SOM nem sempre é usado para decisão.

---

## Plano de Implementação (Priorizado)

### Fase 1: Quick Wins (alto impacto, baixo risco)

1. **Extrair `cleanup()` em useOrionReasoning** — Criar helper function para reset de flags de processamento. Usar em `try/finally` no `askAIInternal`.

2. **Unificar conversão Gemini** — Criar `convertMessagesToGemini(messages, config)` compartilhada em neural-ops. Substituir as 3 implementações.

3. **Extrair `stripMarkdown()`** — Mover regex cleanup para `src/lib/utils/text-utils.ts`. Usar nos 2 locais de useOrionReasoning.

4. **TTS warmup 1x por sessão** — Adicionar `ttsWarmedRef = useRef(false)` e só fazer fetch na primeira pergunta.

5. **Cache authUser em ref** — Criar `authUserRef` no início do hook. Reusar em todos os 6 pontos que chamam `getUser()`.

### Fase 2: Otimização de Prompts

6. **Reduzir COMPACT prompt** — Remover pipeline de investimento, 6 agentes e 5 redes neurais do prompt compacto. Manter apenas identidade + regras básicas (~300 tokens).

7. **Injeção condicional de FRAMEWORKS** — Só injetar `ORION_FRAMEWORKS_PROMPT` e `ORION_ARCHITECTURE_KNOWLEDGE` quando a query é sobre identidade, comparação com Jarvis, ou arquitetura neural.

### Fase 3: Refatoração Estrutural

8. **Dividir useOrionReasoning** — Extrair handlers locais (vision, IoT, search, owner, memory) para módulo `orion-local-handlers.ts`. O hook principal fica com ~600 linhas.

9. **Timeout global na edge function** — Adicionar `AbortController` com 15s timeout no `handleOrionQuery` streaming.

10. **Remover código morto** — `applyContrastEnhancement` e `extractShapeDescriptors` não usados no fluxo principal.

### Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/neural-ops/index.ts` | Unificar Gemini, reduzir prompts, injeção condicional, timeout global |
| `src/components/dashboard/neural/useOrionReasoning.ts` | cleanup(), stripMarkdown(), TTS warmup, authUser cache |
| `src/lib/neural/orion-ai-client.ts` | Remover código morto (CLAHE, shape descriptors) |
| `src/lib/utils/text-utils.ts` | Novo: stripMarkdown() |

### Impacto Esperado

| Métrica | Antes | Depois |
|---|---|---|
| System prompt tokens (text query) | ~800 | ~300 |
| System prompt tokens (vision) | ~8500 | ~4000 |
| Duplicações de código | ~15 | ~3 |
| Linhas useOrionReasoning | 1875 | ~800 (main) + ~600 (handlers) |
| Chamadas auth.getUser()/query | 6 | 1 |
| TTS warmup fetches/sessão | N queries | 1 |

