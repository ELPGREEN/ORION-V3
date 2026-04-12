

# Plano de Correção Final do Orion — STT, Microfone e Prompts

## Diagnóstico Atual

Após análise completa, o sistema já teve várias correções aplicadas. Os problemas residuais são:

### 1. STT ainda pode fragmentar frases longas
- `gcpSTT.ts` está configurado com `silenceDurationMs=1200ms` e `maxUtteranceMs=12000ms` — bom, mas o `chunkIntervalMs=1400` passado como parâmetro não é usado diretamente (a lógica é utterance-based agora). Sem problemas reais aqui.

### 2. Prompt FULL ainda tem referência a "JARVIS" (linha 663)
- `ORION_SYSTEM_PROMPT_FULL` contém: `NUNCA soe como robô, mordomo ou "assistente de elite estilo JARVIS"` — embora seja uma negação, a mera menção de JARVIS pode influenciar o modelo. Deve ser removida.

### 3. TTS prompt em `useNeuralVoice.ts` está limpo
- Linha 542 já usa prompt correto sem JARVIS.

### 4. Media patterns no `useOrionReasoning.ts` (linha 1111) já está restritivo
- Exige palavras de mídia explícitas junto com verbos. OK.

### 5. Gemini TTS `DEFAULT_PROMPT` (gemini-tts edge function) está correto
- Já tem personalidade AquaMonkey sem JARVIS. OK.

### 6. Mic watchdog existe e funciona (linhas 374-418 do useNeuralVoice)

### 7. Greetings são muito genéricas/robóticas
- Respostas como "Às ordens" e "Estou ouvindo" soam robóticas, não AquaMonkey.

---

## Mudanças Necessárias (mínimas e cirúrgicas)

### Etapa 1: Remover última referência JARVIS do FULL prompt
**Arquivo:** `supabase/functions/neural-ops/index.ts` (linha 663)
- Trocar `NUNCA soe como robô, mordomo ou "assistente de elite estilo JARVIS"` por `NUNCA soe como robô, mordomo ou assistente excessivamente formal`

### Etapa 2: Greetings AquaMonkey
**Arquivo:** `src/components/dashboard/neural/useOrionReasoning.ts` (linhas 499-504)
- Trocar respostas genéricas por respostas com personalidade AquaMonkey:
  - "Fala! O que manda?" / "E aí! No que posso ajudar?" / "Estou aqui, manda ver!" / "Opa! Pode falar."

### Etapa 3: Comentário residual JARVIS no useOrionReasoning
**Arquivo:** `src/components/dashboard/neural/useOrionReasoning.ts` (linha 419)
- Remover comentário "JARVIS-style PROCESSING indicator"

### Etapa 4: Deploy edge function neural-ops

### Etapa 5: Salvar memória atualizada

---

## Resumo

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/neural-ops/index.ts` | Remover "JARVIS" da linha 663 |
| `src/components/dashboard/neural/useOrionReasoning.ts` | Greetings AquaMonkey + remover comentário JARVIS |

O STT, microfone, watchdog, anti-alucinação e TTS já estão corretos das iterações anteriores. Estas são as últimas correções cirúrgicas pendentes.

