

# Auditoria e Correção: Orion Lento no STT, LLM e Visão

## Diagnóstico

Após analisar toda a pipeline, identifiquei **7 gargalos críticos** que causam lentidão:

### STT (Captura de voz)
1. **Web Speech API como único STT ao vivo** — depende 100% do browser, sem controle de latência. Groq Whisper só é fallback offline (precisa gravar blob e enviar).
2. **Sem uso do VM STT** — a GCP VM tem Whisper tiny (int8) instalado, mas o `useNeuralVoice.ts` nunca chama via `orion-vm-proxy` para STT em tempo real.

### LLM (Resposta)
3. **Excesso de pré-processamento** — `analyzeFrameStreaming()` faz ~15 regex patterns, ~8 dynamic imports, ~5 Supabase auth calls, busca de protocolos, dashboard context, Vision-RAG, tudo ANTES de chamar o LLM. Budget total deveria ser 500ms mas na prática excede 2-3s.
4. **`supabase.auth.getUser()` chamado 3-6 vezes** — em `analyzeFrameWithAI`, `analyzeFrameStreaming`, `fetchDashboardContext`, e dentro dos contextos importados. Cada chamada é ~50-100ms.
5. **`buildLocalDetections()` chamado 2 vezes** na streaming path (L487 e L745) — duplicação desnecessária.

### Vision (Visualização)
6. **`processFrame` roda CPU-intensive no main thread** — Sobel, Gaussian blur, K-means, YOLO priors, text detection, TODOS no canvas principal a cada frame.
7. **Google Cloud Vision API existe mas nunca é chamada** — `supabase/functions/google-cloud-vision/index.ts` está pronta com GCP_SA_KEY, porém o pipeline de visão ao vivo nunca a invoca.

### TTS (Fala)
8. **Gemini TTS sequencial** — todas as sentenças são fetched em paralelo (bom), mas se o primeiro chunk falha, adiciona 15s cooldown global que desativa ALL TTS.

## Plano de Correção

### Passo 1: Eliminar chamadas duplicadas em `orion-ai-client.ts`
- Cache `supabase.auth.getUser()` em ref global por 60s (já existe `getCachedUser` em useOrionReasoning mas não é usado no ai-client)
- Remover `buildLocalDetections()` duplicado na streaming path
- Mover dynamic imports para top-level lazy (carregar módulos 1x, não a cada pergunta)
- Reduzir budget paralelo Layer 2 de 500ms para 300ms

### Passo 2: Integrar Google Cloud STT como Tier 0 no fallback chain
- Criar `supabase/functions/google-cloud-stt/index.ts` usando Cloud Speech-to-Text API (free: 60 min/mês)
- Usa o GCP_SA_KEY já configurado
- Adicionar como Tier 0 no `sttFallbackChain.ts` (antes do Groq Whisper)
- Latência esperada: ~300ms vs Groq ~1-2s

### Passo 3: Integrar Google Cloud Vision API na pipeline ao vivo
- A edge function `google-cloud-vision` já existe e funciona
- Adicionar chamada periódica (a cada 3-5s) no `useOrionReasoning.ts` para enviar frame ao Cloud Vision
- Usar resultados como enrichment (labels, objects, text) para contexto do LLM
- Não substituir a detecção local — apenas complementar

### Passo 4: Otimizar `useNeuralVoice.ts` — resumeSTT mais rápido
- Reduzir mic priming delay de 80ms→30ms em mobile
- Eliminar `primeMicrophone()` redundante quando permissão já é "granted"
- Remover keep-alive interval para SpeechSynthesis (10s timer que pausa/resume) — não necessário com Gemini TTS

### Passo 5: TTS resilience — reduzir cooldown global
- Reduzir Gemini TTS cooldown de 15s para 5s em erros não-429
- Adicionar Google Cloud TTS como fallback antes do formant synth (já existe edge function!)
- Cascata: Gemini TTS → Google Cloud TTS → Formant → silêncio

### Passo 6: Comandos SSH para otimizar a VM

## Comandos SSH para a VM

```bash
gcloud compute ssh orion-backend --zone=us-central1-f --tunnel-through-iap

sudo systemctl edit orion
# Adicionar/atualizar:
# [Service]
# Environment="GEMINI_API_KEY=<sua_key>"
# Environment="GOOGLE_APPLICATION_CREDENTIALS=/opt/orion/gcp-sa-key.json"

sudo systemctl restart orion

# Verificar saúde
curl http://localhost:8080/health

# Verificar STT (se endpoint existir)
curl -X POST http://localhost:8080/stt -F "audio=@test.wav" -F "language=pt"
```

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/neural/orion-ai-client.ts` | Cache auth global, eliminar duplicação, lazy imports |
| `src/lib/voice/sttFallbackChain.ts` | Adicionar Google Cloud STT como Tier 0 |
| `src/hooks/useNeuralVoice.ts` | Otimizar resumeSTT, remover keep-alive, faster mic |
| `src/lib/tts/geminiTTS.ts` | Reduzir cooldown, adicionar Google Cloud TTS fallback |
| `src/hooks/useVoiceInput.ts` | Adicionar Google Cloud TTS na cascata |
| `supabase/functions/google-cloud-stt/index.ts` | NOVO — STT via Cloud Speech-to-Text API |
| `src/components/dashboard/neural/useOrionReasoning.ts` | Integrar Cloud Vision periódico |

