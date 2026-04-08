

# Auditoria Completa: Conexoes TTS / STT / Visao Computacional

## Resumo do Estado Atual

O sistema possui **4 camadas de AI/ML** com **~25 conexoes** entre frontend, edge functions, e servicos externos. A auditoria identificou **7 problemas criticos** e **5 melhorias necessarias**.

---

## Arquitetura Atual (Mapa de Conexoes)

```text
┌─────────────────────────────────────────────────────────┐
│                    TTS (Sintese de Voz)                  │
├─────────────────────────────────────────────────────────┤
│ Tier 0: Gemini TTS (Algieba) ─→ edge/gemini-tts    ✅  │
│ Tier 1: Formant Synth (Iapetus) ─→ 100% local      ✅  │
│ Tier 2: Piper WASM ─→ @mintplex-labs/piper-tts-web ⚠️  │
│ Tier 3: Browser SpeechSynthesis ─→ Web API          ✅  │
│                                                         │
│ DESCONECTADOS (edge functions existem, nao chamados):   │
│  - kokoro-tts (edge) ─→ DeepInfra (pago?)           ❌  │
│  - jarvis-tts (edge) ─→ HF Piper model              ❌  │
│  - fish-speech-clone (edge)                          ❌  │
│  - google-tts (edge) ─→ removido da cascata          ❌  │
│  - hf-voice-tts (edge)                               ❌  │
│  - orion-voice-engine (edge)                          ❌  │
│  - orion-voice-clone (edge)                           ❌  │
│  - elevenlabs-tts (edge) ─→ PROIBIDO (constraint)    ❌  │
│  - HF Space /tts ─→ orion-hub-client.speakJarvis()   ⚠️  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    STT (Reconhecimento de Voz)           │
├─────────────────────────────────────────────────────────┤
│ Primary: Web Speech API (SpeechRecognition)          ✅  │
│ Fallback 1: Groq Whisper ─→ edge/groq-whisper-stt   ✅  │
│ Fallback 2: HF Space Whisper ─→ orion-hub-client     ⚠️  │
│ Fallback 3: Transformers.js Whisper (browser)        ⚠️  │
│                                                         │
│ PROBLEMAS:                                              │
│  - Groq/HF Whisper fallbacks NAO integrados na cascata  │
│    useNeuralVoice.ts usa APENAS Web Speech API          │
│  - transformers-audio.ts existe mas nao e chamado       │
│    pela cadeia principal de STT                         │
│  - metacognitive-hearing.ts processa metricas mas       │
│    nao recebe audio real (apenas proxy de texto)        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 Visao Computacional                      │
├─────────────────────────────────────────────────────────┤
│ Layer 1: MediaPipe (local WASM/WebGL)                ✅  │
│   - ObjectDetector, FaceDetector, FaceLandmarker        │
│   - HandLandmarker, PoseLandmarker                      │
│ Layer 2: YOLO ONNX (local browser)                   ✅  │
│ Layer 3: HF Vision Gate (Transformers.js)            ✅  │
│   - MobileViT classifier, ViT-GPT2 captioner           │
│ Layer 4: Gemini Vision (via edge function)            ✅  │
│ Layer 5: HF Space Vision ─→ orion-hub-client          ⚠️  │
│                                                         │
│ TF.js Runtime (BlazeFace, LiteRT)                    ✅  │
│ face-api-runtime.ts                                  ✅  │
│ depth-estimation, OCR, scene-reconstruction          ✅  │
│                                                         │
│ PROBLEMAS:                                              │
│  - HF Space GPU offline (CPU only, endpoints falhando)  │
│  - orion-hub-client usa @gradio/client mas endpoint     │
│    /gemma_chat nao existe no Space                      │
│  - visionClassify chama /vision_classify (CPU) OK       │
│  - visionCaption chama /vision_caption (GPU) ❌ falha   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Metacognicao Quantica (v28)                 │
├─────────────────────────────────────────────────────────┤
│ quantum-metacognition.ts ─→ consciousness-bridge     ✅  │
│ metacognitive-hearing.ts ─→ audio-stream-bridge      ✅  │
│ global-workspace.ts ─→ NeuralConsciousnessLoop       ✅  │
│                                                         │
│ PROBLEMAS:                                              │
│  - Metacognitive hearing recebe apenas proxy de texto,  │
│    nao audio real (energyLevel e prosody sao simulados) │
│  - audio-stream-bridge.ts gera "pseudo audio features"  │
│    a partir de texto, nao de audio real                 │
└─────────────────────────────────────────────────────────┘
```

---

## 7 Problemas Criticos Encontrados

### P1. STT sem fallback real (useNeuralVoice.ts)
A cascata TTS e robusta (Gemini → Formant → Browser), mas o **STT usa APENAS Web Speech API**. Se falhar, nao ha fallback para Groq Whisper ou Transformers.js Whisper. As edge functions e bibliotecas existem mas nao estao conectadas.

### P2. Edge functions TTS orfas
7 edge functions de TTS existem mas NAO sao chamadas pelo codigo: `kokoro-tts`, `jarvis-tts`, `fish-speech-clone`, `google-tts`, `hf-voice-tts`, `orion-voice-engine`, `orion-voice-clone`. Sao peso morto no deploy.

### P3. HF Space GPU offline
`Ericsonv12/orion-gpu` roda em CPU. Endpoints GPU (vision_caption, whisper_stt) falham. O endpoint `/gemma_chat` nao existe. O `orion-hub-client.ts` tenta chama-lo e recebe erro.

### P4. Metacognitive Hearing sem audio real
`metacognitive-hearing.ts` e `audio-stream-bridge.ts` simulam features de audio a partir de texto (WPM, capslock ratio, keyword matching). Nao recebem dados reais de espectro, pitch ou energia do microfone.

### P5. Transformers.js Audio desconectado
`transformers-audio.ts` (Whisper browser, audio classification) existe e e exportado via `index.ts`, mas so e importado em `orion-orchestrator-exec.ts`. Nao esta na cadeia principal de STT do usuario.

### P6. TTS duplicadas em paths diferentes
`src/lib/tts/kokoroTTS.ts` e `src/lib/voice/kokoroTTS.ts` — dois arquivos Kokoro em locais diferentes. O de `voice/` chama a edge function, o de `tts/` parece nao existir separadamente. Confusao de imports.

### P7. Piper TTS depende do Firebase Storage
`piperTTS.ts` tenta resolver URL do modelo via Firebase Storage primeiro. Se o modelo nao esta la e o CDN default falha, Piper fica inoperante silenciosamente.

---

## Plano de Integracao (Sem Demoras no Sistema Cognitivo)

### Etapa 1 — Conectar STT Fallback Chain
**Arquivo:** `src/hooks/useNeuralVoice.ts`
- Quando Web Speech API falha (onError `no-speech`, `network`, `not-allowed`), chamar automaticamente `groq-whisper-stt` edge function
- Se Groq falhar (429), cair para `transcribeAudio()` do `transformers-audio.ts` (Whisper browser)
- Alimentar `metacognitive-hearing.ts` com confianca real do STT

### Etapa 2 — Conectar Audio Real ao Metacognitive Hearing
**Arquivos:** `src/lib/voice/audioWorkletManager.ts` → `metacognitive-hearing.ts`
- O AudioWorkletManager ja extrai `energy` e `isSpeech` do microfone
- Conectar esses dados reais ao `processMetacognitiveHearing()` em vez dos proxies de texto
- Adicionar campo `rawEnergy` e `spectralFeatures` ao MetacognitiveHearingResult

### Etapa 3 — Limpar Edge Functions Orfas
- Remover imports mortos de `kokoro-tts`, `jarvis-tts`, `fish-speech-clone`, `google-tts` do frontend
- Manter as edge functions no Supabase (podem ser uteis no futuro) mas remover chamadas do client
- Consolidar `src/lib/voice/kokoroTTS.ts` e `src/lib/tts/kokoroTTS.ts` — manter apenas um

### Etapa 4 — Corrigir orion-hub-client.ts
- Remover referencia ao endpoint `/gemma_chat` (nao existe)
- Adicionar fallback: quando visionCaption falha (GPU offline), usar `classifyImage()` do `transformers-vision.ts` (browser local) em vez de OCR
- Corrigir `speakJarvis()` — nao usar quando Space esta em CPU

### Etapa 5 — Conectar Quantum Metacognition ao Pipeline Real
**Arquivo:** `src/lib/neural/consciousness-bridge.ts`
- Garantir que o ciclo de consciencia recebe dados reais do STT (confianca, latencia) e da visao (MediaPipe FPS, gate stats)
- Alimentar o S1/S2 Transition Gate com entropia real dos LLM responses (quando disponivel via Gemini API response metadata)

### Etapa 6 — Pipeline Zero-Latency
- Pre-carregar MediaPipe + HF Vision Gate no `neural-init.ts` (ja parcialmente feito)
- Garantir que `audioWorkletManager` inicia junto com o primeiro `startListening()`
- Adicionar metricas de latencia end-to-end: STT → LLM → TTS no consciousness snapshot

---

## Secao Tecnica: Detalhes de Implementacao

**STT Fallback (Etapa 1):**
```text
Web Speech API (0ms setup, streaming)
  ↓ onError/timeout
Groq Whisper edge function (~2s, free tier)
  ↓ 429/error  
Transformers.js Whisper browser (~5s first load, then ~3s)
```

**Audio Real → Metacognition (Etapa 2):**
```text
Microphone → AudioWorklet (16kHz chunks)
  ├→ energy/isSpeech → metacognitive-hearing
  ├→ Float32Array → Whisper (when STT fallback needed)
  └→ spectral proxy → audio-stream-bridge → Mamba pipeline
```

**Arquivos editados (~6 files):**
1. `src/hooks/useNeuralVoice.ts` — STT fallback chain
2. `src/lib/neural/metacognitive-hearing.ts` — accept real audio data
3. `src/lib/neural/audio-stream-bridge.ts` — wire AudioWorklet data
4. `src/lib/neural/orion-hub-client.ts` — fix dead endpoints
5. `src/lib/neural/consciousness-bridge.ts` — real metrics wiring
6. `src/lib/neural/realtime-vision-engine.ts` — minor: add gate stats to result

