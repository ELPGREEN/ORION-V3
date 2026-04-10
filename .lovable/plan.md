

## Diagnóstico: Pausas longas + Texto cortado no TTS do Orion

### Problema 1: Pausa longa após interrogação (?)
**Causa**: O `splitIntoSentences()` em `src/lib/tts/geminiTTS.ts` quebra o texto em pedaços separados por `.!?…`. Cada pedaço vira uma chamada HTTP separada ao edge function `gemini-tts`. Mesmo com fetch paralelo, entre o `audio.onended` de um trecho e o `audio.play()` do próximo há uma lacuna perceptível (~200-500ms), que em `?` fica muito evidente.

### Problema 2: Texto cortado pela metade
**Causa**: Dois limites de truncamento:
- **Edge function**: `text.trim().slice(0, 2500)` — textos > 2500 chars são cortados silenciosamente
- **Gemini TTS model**: O modelo TTS tem limite de áudio gerado (~30-45s). Textos longos podem gerar áudio truncado sem erro

### Plano de correção

#### 1. Eliminar pausas entre sentenças (gap-free playback)
- Em `src/lib/tts/geminiTTS.ts`, aumentar o threshold de `splitIntoSentences` de 1000 para **2000 chars** antes de dividir (textos médios ficam num único chunk = zero pausas)
- Para textos > 2000 chars, usar **pre-buffering**: começar o download do próximo chunk enquanto o atual toca, e fazer `audio.play()` imediatamente no `onended` (crossfade de 0ms)
- Agrupar chunks maiores (de 800 para **1200 chars**) para reduzir o número de requisições

#### 2. Corrigir truncamento de texto longo
- No edge function `gemini-tts/index.ts`, aumentar o limite de `2500` para **5000 chars**
- No client `geminiTTS.ts`, o `text.slice(0, 5000)` já está correto
- Para textos muito longos (> 5000), dividir em chunks maiores e encadear o áudio — hoje simplesmente corta

#### 3. Pre-buffer para playback contínuo
- Ao invés de `Promise.all` + loop sequencial, usar um padrão produtor-consumidor onde:
  - Fetch começa em paralelo (como hoje)
  - Playback inicia assim que o primeiro blob chega
  - Próximo blob já está pronto quando o atual termina
  - Resultado: zero gap entre sentenças

### Arquivos alterados
| Arquivo | Mudança |
|---|---|
| `src/lib/tts/geminiTTS.ts` | Threshold 1000→2000, chunk 800→1200, pre-buffer playback |
| `supabase/functions/gemini-tts/index.ts` | Limite 2500→5000 chars |

### Sem impacto
- Não muda a VM (problema é no Gemini TTS, não na VM)
- Não muda o modelo de voz nem o prompt
- Não afeta o formant synth local

