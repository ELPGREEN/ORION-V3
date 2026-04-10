

# Plano: Orion Responde Rápido e Completo (VM + Speed Fix)

## Problemas Identificados

1. **VM não está sendo usada para texto** — A VM (`/proxy/gemini`) suporta proxy Gemini com cache, mas o `neural-ops` nunca a utiliza. Todas as queries de texto vão direto para Vertex AI ou Gemini API keys, ignorando completamente a VM.

2. **`maxOutputTokens` não propagado** — A função `callGeminiAPI` usa `requestedMaxTokens` corretamente, mas `callVertexAI` tem default de apenas **4096 tokens** para texto (linha 155). E `convertToGeminiFormat` (usada por `callGeminiDirect`) **não injeta `maxOutputTokens` nenhum** — fica com o default do modelo que pode truncar.

3. **System prompt GIGANTESCO** — Para queries com visão, o prompt do sistema soma ~15.000+ tokens (ORION_SYSTEM_PROMPT_FULL + ORION_VISION_PROMPT + ORION_FRAMEWORKS_PROMPT + ORION_ARCHITECTURE_KNOWLEDGE). Isso consome tokens do orçamento e **atrasa** o primeiro token.

4. **RAG + Identity + Dashboard Context BLOQUEIAM** — Mesmo que parallelizados, `fetchRAGContext` faz embedding + busca vetorial (~1-2s), e `fetchDashboardContext` no client faz 4 queries ao Supabase. Isso adiciona latência significativa antes de começar a gerar.

5. **7 Gemini keys mas apenas 1 usada** — `getGeminiKeys()` retorna apenas `GEMINI_API_KEY` (1 key). As 7 keys são usadas no fallback loop (`callGeminiAPI`), mas a função principal `callGeminiDirect` (usada pela rota fallback `callLovableAIFallback`) só usa 1 key.

## Mudanças Planejadas

### 1. Propagar `maxOutputTokens` em TODOS os providers
**Arquivo:** `supabase/functions/neural-ops/index.ts`
- `callVertexAI`: usar `(messages as any).__maxTokens` no `maxOutputTokens` (atualmente ignora e usa 4096/6144)
- `convertToGeminiFormat`: aceitar e injetar `maxOutputTokens` da mensagem
- `callGeminiDirect`: passar `maxOutputTokens` para o body do Gemini

### 2. Usar VM como proxy Gemini (fast-path para texto)
**Arquivo:** `supabase/functions/neural-ops/index.ts`
- Adicionar `callVMGeminiProxy()` como provider antes do fallback chain
- A VM em `ORION_VM_URL/proxy/gemini` tem cache e latência menor para requests repetitivos
- Usar somente para queries de texto (sem imagem) — visão continua direto na API

### 3. Reduzir system prompt para texto simples
**Arquivo:** `supabase/functions/neural-ops/index.ts`
- Para queries `intentType === "textual"` SEM visão: usar `ORION_SYSTEM_PROMPT_COMPACT` (já existe mas os frameworks/vision são injetados desnecessariamente)
- Garantir que `ORION_VISION_PROMPT` e `ORION_FRAMEWORKS_PROMPT` **nunca** sejam injetados em queries puramente textuais

### 4. Skip RAG para perguntas simples
**Arquivo:** `supabase/functions/neural-ops/index.ts`
- Se a query tem < 30 chars e não é legal/analysis/document, skip RAG (economia de ~1-2s)
- RAG embedding timeout já é 1s, mas a busca vetorial adiciona mais

### 5. Usar todas as 7 Gemini keys no `getGeminiKeys()`
**Arquivo:** `supabase/functions/neural-ops/index.ts`
- Expandir `getGeminiKeys()` para incluir GEMINI_API_KEY_2 até _7 e _GCP
- Isso melhora resiliência contra rate limits (429)

### 6. Deploy da edge function
- Redeployar `neural-ops` após as mudanças

## Impacto Esperado
- Primeira resposta ~1-2s mais rápida (menos prompt, skip RAG quando desnecessário)
- Respostas completas sem truncamento (maxOutputTokens corretos)
- VM usada como cache/proxy para queries repetitivas
- Melhor resiliência com 7+ keys Gemini

