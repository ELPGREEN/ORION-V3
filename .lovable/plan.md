

# Plano: Aumentar Tolerância de Silêncio para 4s e Atualizar Regras STT

## Problema
O usuário quer tolerância de pausa aumentada para 3-4 segundos e reforço das regras de stream contínuo no prompt do sistema.

## Mudanças

### 1. `src/lib/voice/gcpSTT.ts` — Aumentar silence tolerance
- `DEFAULT_SILENCE_MS`: 3000 → 4000 (tolerância 4s para pausas naturais)
- Log message atualizado para refletir "4s"

### 2. `supabase/functions/neural-ops/index.ts` — Atualizar STT_RULES_BLOCK
- Linha 757: "SEMPRE ATIVO em stream contínuo" (mais enfático)
- Linha 759: pausas de "até 3-4 segundos" (atualizado)
- Adicionar na seção de dicas: "No Gemini Live, site gemini.google.com ou extensão Orion, priorize conversa contínua"
- Adicionar aviso de ruído: "Tem um pouco de ruído, pode falar um pouco mais alto ou em ambiente mais silencioso?"

### 3. `mem://preference/stt-voice-capture-rules` — Atualizar memória
- Refletir tolerância de 4s e regras de stream contínuo atualizadas

### Detalhes técnicos
- A arquitetura pause/resume do gcpSTT.ts já está implementada (mic stream não é destruído durante TTS)
- O `persistentMic.ts` já mantém o stream aberto no mobile
- O `GlobalOrionListener.tsx` já tem `micPrimedRef` para evitar priming repetido no mobile
- Nenhuma mudança em TTS, wake word ou lógica de reconhecimento — apenas threshold de silêncio e texto do prompt

