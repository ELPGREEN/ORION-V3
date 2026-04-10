

## Plano: Orion Humanizado — Raciocínio Coerente, Respostas Rápidas, Comportamento Natural

### Problemas Identificados

1. **Cognição pesada demais para queries simples**: O pipeline executa NLP semantics, Tesla Coil, SOM router, comprehension analysis, reformulation, cognitive routing, E AINDA o buildCognitionContext em modo deep — tudo ANTES de chamar o LLM. São ~500ms de pre-processing desnecessário para perguntas conversacionais.

2. **Sistema prompt gigante**: O `ORION_SYSTEM_PROMPT_COMPACT` tem ~800 tokens e o `FULL` tem ~2000+ tokens, cheios de detalhes sobre "5 redes neurais", "6 agentes autônomos", "pipeline de investimento" que confundem o modelo e atrasam a resposta. Isso causa respostas robóticas e desconectadas.

3. **Falta instrução de "pensar como pessoa"**: O prompt nunca diz ao LLM para responder como humano em conversas normais. A instrução `REGRA ZERO: NATURALIDADE` existe apenas no vision prompt, não no texto.

4. **`reasoningInstructions` sempre injeta modo robótico**: O `buildReasoningPrompt` para modo "fast" diz `[MODO RÁPIDO] Responda de forma direta...` — linguagem técnica que o modelo interpreta como "seja seco e formal".

5. **Overhead de layers desnecessárias**: Layer 1.7 (Deep Estimate), Layer 2 (NLP Semantics), Layer 3.5 (Active Inference), Layer 3.7 (Drafter-Critic) adicionam 200-500ms de pós-processamento. Para queries conversacionais, isso é desperdício.

6. **TTS warmup bloqueia**: O fetch de warmup do TTS é fire-and-forget mas cria conexão que pode interferir.

---

### Correções

#### 1. Novo System Prompt Humanizado
**Arquivo**: `supabase/functions/neural-ops/index.ts`

Criar um terceiro prompt: `ORION_SYSTEM_PROMPT_CONVERSATIONAL` (~300 tokens) para queries simples e conversacionais:
- Instruir: "Responda como um amigo inteligente falando naturalmente em português"
- Remover toda a arquitetura neural/agentes/pipeline do prompt conversacional
- Manter apenas: identidade básica (Orion, criado por Ericson), regras de honestidade, e instrução de naturalidade
- Usar este prompt quando `inputSource === "voice"` E query < 50 palavras E não é query complexa

#### 2. Otimizar `buildReasoningPrompt` para Conversação Natural
**Arquivo**: `src/lib/neural/cognitive-fast-reasoner.ts`

- Modo "fast" → nova instrução: "Responda naturalmente como um amigo brasileiro. Direto ao ponto, sem formalidades robóticas. Se a pergunta é clara, responda tudo."
- Adicionar modo `"conversational"` que retorna instrução mínima: "Fale como pessoa. Seja natural."
- Classificar greetings e perguntas curtas como `conversational` em vez de `fast`

#### 3. Fast-path para Conversação (Skip Layers)
**Arquivo**: `src/components/dashboard/neural/useOrionReasoning.ts`

- Detectar queries conversacionais (< 15 palavras, sem intent especial, não-técnica)
- Para estas: SKIP Layer 1.7 (estimador), Layer 2 (NLP/cognição completa), Layer 3.5 (Active Inference), Layer 3.7 (Drafter-Critic)
- Ir direto: pre-proc rápido → cognitive route → LLM streaming → humanizer → TTS
- Economia: ~300-500ms de latência

#### 4. Instrução "inputSource=voice" no Edge Function
**Arquivo**: `supabase/functions/neural-ops/index.ts`

- Receber `inputSource` do body
- Quando `voice`: adicionar instrução ao prompt: "O usuário está falando por voz. Responda de forma natural e concisa, como numa conversa. Evite listas, formatação markdown, e blocos de código na resposta falada."
- Isso faz o LLM gerar texto otimizado para TTS

#### 5. Cognição Simplificada para Fast Mode
**Arquivo**: `src/lib/neural/neural-cognition-engine.ts`

- Já faz skip em fast mode (bom) — apenas garantir que o skip é completo
- Nenhuma mudança necessária aqui

---

### Impacto Esperado

| Métrica | Antes | Depois |
|---|---|---|
| Pre-LLM overhead (conversacional) | ~500ms | ~100ms |
| Tokens do system prompt (conversacional) | ~800 | ~300 |
| Pós-LLM overhead (conversacional) | ~200ms | ~50ms |
| Naturalidade da resposta | Robótica | Humana |
| Tempo total para primeira palavra falada | ~3-5s | ~1.5-3s |

### Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/neural-ops/index.ts` | Novo prompt conversacional + `inputSource` handling + redeploy |
| `src/lib/neural/cognitive-fast-reasoner.ts` | Modo `conversational` + prompt humanizado |
| `src/components/dashboard/neural/useOrionReasoning.ts` | Fast-path para conversação (skip layers desnecessárias) |
| `src/lib/neural/orion-ai-client.ts` | Passar `inputSource` no body do streaming call (já passa, confirmar) |

### Sem Impacto
- Não altera TTS, visão, STT, ou protocolos existentes
- Queries complexas/deep continuam com pipeline completo
- Não muda edge functions de TTS ou vision

