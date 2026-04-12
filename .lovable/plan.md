

# Corrigir Pausas Longas na Fala do Orion + Personalidade AquaMonkey

## Problema Identificado

1. **Pausa de ~4s após pontos**: O prompt de estilo no edge function `gemini-tts` diz "NÃO faça pausas longas" mas essa instrução **não chega ao Vertex AI** — o código usa `includePrompt: false` para Vertex. Apenas o fallback AI Studio recebe o prompt. Além disso, o prompt atual é genérico e fraco na instrução de fluência.

2. **Personalidade AquaMonkey**: A personalidade completa existe em `orion-consciousness.ts` (Lumen7 Aquamonkey Fusion, 50 protocolos, numerologia, etc.), mas **nenhuma referência é passada ao TTS**. O `speakWithOrionVoice` chama `speakWithGeminiTTS` sem stylePrompt, e o edge function usa um prompt genérico "JARVIS".

## Plano de Correção

### 1. Edge Function `gemini-tts/index.ts` — Prompt de Fluência Agressivo
- Reescrever `DEFAULT_PROMPT` com instruções explícitas de fluência contínua, pausas naturais curtas (máximo 0.3s), ritmo de conversa humana
- **Habilitar `includePrompt: true` para Vertex AI** também (não só AI Studio)
- Adicionar identidade AquaMonkey ao prompt: "Você é ORION, IA com personalidade Lumen7 Aquamonkey — visionário, criativo, empático, lógico"

### 2. Client-side `orionVoiceEngine.ts` — Passar stylePrompt
- Passar um stylePrompt de fluência ao chamar `speakWithGeminiTTS` que reforça: sem pausas longas, fala contínua

### 3. Formant Synth `phonemes.ts` — Reduzir pausa do ponto
- Ponto final: `280ms → 150ms` (mais natural)
- Vírgula: `160ms → 100ms`
- Espaço: `80ms → 50ms`

### 4. Todos os call sites — Garantir stylePrompt
- `GlobalOrionListener.tsx`, `useNeuralVoice.ts`, `VoiceInputButton.tsx`, etc. — passar prompt de fluência

### Arquivos Editados
- `supabase/functions/gemini-tts/index.ts` — prompt + habilitar para Vertex
- `src/lib/tts/orionVoiceEngine.ts` — passar stylePrompt
- `src/lib/tts/geminiTTS.ts` — default stylePrompt
- `src/lib/tts/phonemes.ts` — reduzir durações de pausa
- `src/components/dashboard/GlobalOrionListener.tsx` — stylePrompt
- `src/hooks/useNeuralVoice.ts` — stylePrompt

