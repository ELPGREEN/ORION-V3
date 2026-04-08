

# Plano: Migrar para Gemini TTS GA (Algieba)

## Contexto
O modelo atual (`gemini-2.5-flash-preview-tts`) é preview e instável (500 errors frequentes). O modelo GA `gemini-2.5-flash-tts` é estável e suporta a voz "Algieba". O repo `gemini_cloud_stt` é uma integração Home Assistant para STT — referência futura para implementar escuta via Gemini.

## Mudanças

### 1. Edge Function — `supabase/functions/gemini-tts/index.ts`
- Modelo: `gemini-2.5-flash-preview-tts` → `gemini-2.5-flash-tts`
- Voz padrão: `Charon` → `Algieba`
- Endpoint: manter `v1beta` (TTS ainda requer beta)

### 2. Cliente TTS — `src/lib/tts/geminiTTS.ts`
- Default voice: `Charon` → `Algieba`
- Adicionar `Algieba` à lista `GEMINI_VOICES`

### 3. Hook de voz — `src/hooks/useNeuralVoice.ts`
- Trocar `"Charon"` → `"Algieba"` na chamada `speakWithGeminiTTS`

### 4. GlobalOrionListener — `src/components/dashboard/GlobalOrionListener.tsx`
- Trocar `"Charon"` → `"Algieba"`

### 5. Adaptive Voice Style — `src/lib/voice/adaptiveVoiceStyle.ts`
- Default `voice_name`: `Charon` → `Algieba`
- Adicionar `algieba: "Algieba"` ao voiceMap

### 6. Instruções Plataforma — `src/pages/dashboard/InstrucoesPlataforma.tsx`
- Atualizar texto de "Charon" para "Algieba"

### 7. Memory update
- Atualizar `mem://preference/free-voice-system` com modelo GA e voz Algieba

### 8. Redeploy edge function

## Resultado
- Modelo estável GA (menos 500 errors)
- Voz Algieba como padrão do Orion
- STT via Gemini fica como referência futura

## Arquivos modificados
- `supabase/functions/gemini-tts/index.ts`
- `src/lib/tts/geminiTTS.ts`
- `src/hooks/useNeuralVoice.ts`
- `src/components/dashboard/GlobalOrionListener.tsx`
- `src/lib/voice/adaptiveVoiceStyle.ts`
- `src/pages/dashboard/InstrucoesPlataforma.tsx`

