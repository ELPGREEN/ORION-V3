

# Analisar Voz do Vídeo e Configurar Sotaque do Orion

## O que será feito

1. **Extrair áudio do vídeo** — usar `ffmpeg` para converter MP4 → WAV
2. **Analisar características vocais** com Python (librosa/scipy):
   - F0 (frequência fundamental / pitch)
   - Taxa de fala (sílabas/segundo)
   - Energia espectral e timbre
   - Padrões de entonação (prosódia)
3. **Configurar a voz do Orion** para reproduzir o mesmo sotaque e estilo:
   - Atualizar `ORION_STYLE_PROMPT` em `orionVoiceEngine.ts` com descrição precisa do sotaque
   - Atualizar `DEFAULT_PROMPT` na edge function `gemini-tts` com instruções de prosódia
   - Ajustar `VOICE_DNA` em `phonemes.ts` (F0, pitch range, rate) se a análise revelar diferenças significativas
   - Selecionar a voz Gemini mais compatível (Charon, Orus, etc.)
   - Ajustar `rate` e `pitch` do Web Speech fallback

## Arquivos editados
- `src/lib/tts/orionVoiceEngine.ts` — style prompt com sotaque analisado
- `supabase/functions/gemini-tts/index.ts` — DEFAULT_PROMPT com prosódia do vídeo
- `src/lib/tts/phonemes.ts` — VOICE_DNA se necessário
- Deploy da edge function

