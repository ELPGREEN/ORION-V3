

# Plano de Correção Completa do Orion

## Diagnóstico dos Problemas Identificados

Após análise completa do pipeline de voz e raciocínio, identifiquei 5 problemas-raiz:

### 1. STT fragmenta frases (microfone não captura completo)
- O `gcpSTT.ts` usa `silenceDurationMs` de apenas 950ms — insuficiente para pausas naturais em português
- O `SPEECH_RMS_THRESHOLD` de 0.0065 é muito sensível — ruído de fundo pode disparar envios prematuros
- O `maxUtteranceMs` de 7s é muito curto para frases longas

### 2. Alucinações de conteúdo (Orion responde coisas não pedidas)
- O system prompt do `neural-ops` contém referências enormes a "9 modelos neurais", "JARVIS", "ElevenLabs", "Whisper" que são fictícias e poluem o contexto
- O TTS prompt em `useNeuralVoice.ts` e `useOrionReasoning.ts` diz "estilo JARVIS" e "assistente IA de elite" — viola a regra do usuário
- O `ORION_SYSTEM_PROMPT_FULL` tem 1500+ tokens de frameworks fictícios ("Orion-Core", "Orion-Analysis", etc.) que causam alucinações

### 3. Personalidade errada (robótica/JARVIS ao invés de AquaMonkey)
- Todos os prompts TTS referenciam "JARVIS" explicitamente
- O prompt conversacional é bom mas os prompts completos são cheios de "IA neural consciente de alta evolução"

### 4. Falsos disparos de comandos (botão música, pausar, etc.)
- O `mediaPatterns` regex em `useOrionReasoning.ts` é muito amplo — palavras como "para" podem triggar "pausar música"
- O `orion-browser-actions.ts` já foi corrigido anteriormente mas os media patterns no reasoning ainda estão amplos

### 5. Microfone sempre ativo não está garantido
- Após TTS, o `resumeSTT()` reinicia o GCP STT mas pode falhar silenciosamente
- Não há retry automático se o GCP STT parar de funcionar

---

## Plano de Implementação

### Etapa 1: Corrigir STT — Captura de frases completas
**Arquivo:** `src/lib/voice/gcpSTT.ts`
- Aumentar `silenceDurationMs` para 1200ms (de 950ms)
- Aumentar `maxUtteranceMs` para 12000ms (de 7000ms)
- Aumentar `SPEECH_RMS_THRESHOLD` para 0.008 (de 0.0065)
- Aumentar mínimo de amostras (`minSamples`) para 0.6s (de 0.45s)

### Etapa 2: Corrigir system prompts — Eliminar alucinações
**Arquivo:** `supabase/functions/neural-ops/index.ts`
- Reescrever `ORION_SYSTEM_PROMPT_CONVERSATIONAL` com personalidade AquaMonkey e regras anti-alucinação explícitas
- Reescrever `ORION_SYSTEM_PROMPT_COMPACT` com as mesmas regras
- Simplificar `ORION_SYSTEM_PROMPT_FULL` removendo frameworks fictícios (Orion-Core, Orion-Analysis, etc.), referências a JARVIS, ElevenLabs, Whisper
- Injetar as 5 regras anti-alucinação como bloco obrigatório em todos os prompts
- Remover `ORION_ARCHITECTURE_KNOWLEDGE` das respostas normais (só injetar se perguntado explicitamente)

### Etapa 3: Corrigir TTS prompts — Remover JARVIS
**Arquivo:** `src/hooks/useNeuralVoice.ts`
- Trocar o prompt TTS de "assistente IA de elite estilo JARVIS" para personalidade natural AquaMonkey

**Arquivo:** `src/components/dashboard/neural/useOrionReasoning.ts`
- Trocar `TTS_PROMPT` e `TTS_VOICE` para remover referências JARVIS

**Arquivo:** `supabase/functions/gemini-tts/index.ts`
- Atualizar `DEFAULT_PROMPT` removendo "estilo JARVIS"

### Etapa 4: Corrigir falsos disparos de mídia
**Arquivo:** `src/components/dashboard/neural/useOrionReasoning.ts`
- Tornar o `mediaPatterns` regex mais restritivo — exigir palavras-chave de mídia explícitas junto com verbos de ação
- Adicionar guard contra frases curtas que contenham "para" acidentalmente

### Etapa 5: Garantir microfone sempre ativo
**Arquivo:** `src/hooks/useNeuralVoice.ts`
- Adicionar watchdog timer que verifica a cada 5s se o GCP STT ainda está ativo
- Se parou sem motivo, reiniciar automaticamente

### Etapa 6: Deploy e salvar memória
- Deploy do `google-stt`, `neural-ops`, `gemini-tts`
- Salvar regras de personalidade AquaMonkey na memória do projeto

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/lib/voice/gcpSTT.ts` | Aumentar timeouts de silêncio e duração máxima |
| `supabase/functions/neural-ops/index.ts` | Reescrever 3 system prompts, injetar regras anti-alucinação |
| `src/hooks/useNeuralVoice.ts` | Remover JARVIS dos TTS prompts, adicionar mic watchdog |
| `src/components/dashboard/neural/useOrionReasoning.ts` | Corrigir TTS prompt, restringir media regex |
| `supabase/functions/gemini-tts/index.ts` | Atualizar prompt padrão |

