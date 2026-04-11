

# Plano: Tudo que falta — Google Cloud TTS/Vision + Plugins Nativos + Atualizações

## Status atual vs Planejado

| Item | Status |
|------|--------|
| Google Cloud TTS edge function | **NAO CRIADO** |
| Google Cloud Vision edge function | **NAO CRIADO** |
| Atualização imports obsoletos (groq-vision-hybrid) | **NAO FEITO** — ainda `deno.land/std@0.168.0` |
| CameraStreamPlugin.java | **NAO CRIADO** |
| NativeSpeechPlugin.java | **NAO CRIADO** |
| Bridge TS câmera nativa | **NAO CRIADO** |
| Bridge TS speech nativo | **NAO CRIADO** |
| Voice cascade com Cloud TTS | **NAO FEITO** — orionVoiceEngine só tem Cache → Formant |

Plugins nativos existentes: `SpotifyPlaybackPlugin.java`, `AmazonAppstoreSDKPlugin.java` — OK.

## Implementação (6 passos)

### 1. Criar `supabase/functions/google-cloud-tts/index.ts`
- REST API: `POST texttospeech.googleapis.com/v1/text:synthesize`
- Voice: `pt-BR-Neural2-B` (grave, masculino)
- Audio: `OGG_OPUS` (menor latência)
- Auth: `GCP_SA_KEY` (service account JSON) — já existe nos secrets
- Latência esperada: ~500ms

### 2. Criar `supabase/functions/google-cloud-vision/index.ts`
- REST API: `POST vision.googleapis.com/v1/images:annotate`
- Features: `LABEL_DETECTION`, `OBJECT_LOCALIZATION`, `TEXT_DETECTION`, `FACE_DETECTION`
- Auth: mesmo `GCP_SA_KEY`
- Latência esperada: ~300ms

### 3. Atualizar `supabase/functions/groq-vision-hybrid/index.ts`
- Import: `deno.land/std@0.168.0` → remover (usar `Deno.serve` nativo)
- Import: `supabase-js@2.49.1` → `@2.49.4` ou remover se não usado
- Adicionar Google Cloud Vision como primeiro provider no cascade (antes do Gemini)

### 4. Atualizar `src/lib/tts/orionVoiceEngine.ts`
- Cascade atual: Cache → Formant (2 tiers)
- Novo cascade: Cache → **Cloud TTS** (500ms) → **Gemini TTS** (2-4s) → Formant (50ms offline)
- Importar e chamar edge function `google-cloud-tts`
- Se Cloud TTS falhar → Gemini TTS → Formant

### 5. Criar plugins nativos Capacitor
- `android/.../CameraStreamPlugin.java` — streaming contínuo de frames via Camera2 API
- `android/.../NativeSpeechPlugin.java` — Android `TextToSpeech` + `SpeechRecognizer` nativo
- `src/lib/capacitor/native-camera-plugin.ts` — bridge TS
- `src/lib/capacitor/native-speech-plugin.ts` — bridge TS
- Auto-detect: Capacitor nativo disponível → usar nativo; senão → Web API fallback

### 6. Atualizar `google-tts` (hack) → deprecar
- O hack do Google Translate TTS é instável
- Substituir referências por Cloud TTS oficial
- Manter como último fallback se Cloud TTS + Gemini TTS falharem

## Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/google-cloud-tts/index.ts` | Criar |
| `supabase/functions/google-cloud-vision/index.ts` | Criar |
| `supabase/functions/groq-vision-hybrid/index.ts` | Atualizar imports + adicionar Cloud Vision provider |
| `src/lib/tts/orionVoiceEngine.ts` | Reescrever cascade: Cache → Cloud TTS → Gemini → Formant |
| `src/lib/tts/geminiTTS.ts` | Exportar como módulo chamável pelo cascade |
| `android/.../CameraStreamPlugin.java` | Criar |
| `android/.../NativeSpeechPlugin.java` | Criar |
| `src/lib/capacitor/native-camera-plugin.ts` | Criar |
| `src/lib/capacitor/native-speech-plugin.ts` | Criar |

## Custos (free tier GCP)
- Cloud Vision: 1000 imgs/mês grátis
- Cloud TTS Neural2: 1M chars/mês grátis
- GCP project já configurado com créditos

