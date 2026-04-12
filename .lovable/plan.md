

# Plano: Corrigir Build + Reimplementar Visão/Voz do Orion com Gemini API Oficial

## Situação Atual
A remoção em massa dos módulos neurais deixou ~100+ erros de build residuais. Referências a funções, componentes e tipos deletados ainda existem em dezenas de arquivos. O projeto não compila.

## Fase 1 — Limpar TODOS os erros de build (prioridade máxima)

Vou corrigir cada arquivo com referências quebradas. Abordagem por categoria:

**Grupo A — Remover/substituir referências a símbolos deletados:**
- `logNeural` → remover chamadas (noop)
- `isOwnerEmail` → inline: `(e?: string) => ["info@elpgreen.com","info@iasofthub.com","ericson@elpgreen.com","ericsonpiccoli.dev@gmail.com"].includes(e||"")`
- `VoiceInputButton` → remover JSX
- `NeuralVision` → remover JSX da ConsultaIA (placeholder "em breve")
- `FaceAuthEnroll` → remover JSX da Auth
- `useAIRealtimeReview` → stub local que retorna `{ issues: [], metrics: null }`
- `useNeuralConfig`, `useAdaptiveContext` → remover imports e usos
- `initOrionDefense` → remover chamada
- `bluetoothManager`, `BLEDeviceInfo` → remover da InstallApp (seção BLE vira placeholder)

**Grupo B — OrionIcons (`getOrionIcon`, `IconLogout`, etc.):**
- O arquivo `OrionIcons.tsx` foi recriado mas os sidebars ainda usam nomes antigos
- Atualizar imports nos 5 sidebars + MobileSidebarOverlay para usar lucide-react diretamente

**Grupo C — Módulos de análise/API:**
- `detectHallucinations`, `detectPipelineRoute`, `HallucinationWarning` → criar stubs em `src/lib/analysis/index.ts`
- `NeuralSearchResponse`, `neuralSearch` → criar type/stub em `src/lib/api/pesquisa-api.ts`
- `validateSearchResults`, `dispatchAntiHallucinationReport` → remover chamadas no `useJurisprudencialSearch`
- `onAgentTaskComplete`, `getSmartRouting`, `getAgentMetrics` → remover do `agentService.ts`

**Grupo D — Firebase analytics:**
- `getAnalytics`, `logEvent`, `setUserId`, `setUserProperties`, `isSupported` → importar de `firebase/analytics`

**Grupo E — HuggingFace gradio-client:**
- `HFSpaceHealthStatus`, `PDFAnalysisResult`, `PDFSegment`, `pdfToMarkdown`, `pdfToHtml`, `analyzePDF` → criar tipos/stubs locais

**Grupo F — Páginas:**
- `Index.tsx`: remover `WhyOrionSection`, `OrionVideoShowcase`, `SecurityShieldSection`
- `PesquisaJurisprudencial/Unificada`: ajustar tipos do resultado de busca (adicionar campos `timings`, `pipeline`, etc. ao type)
- `ArquiteturaIA`: corrigir `.map` no objeto
- `ChatHumano`: remover `.getState()`
- `ChatJuridico`: remover `logNeural`
- `DeviceIntegrationPage`: corrigir JSX malformado
- `DocumentEditor`: remover `logNeural` e `useAIRealtimeReview`

**Grupo G — Erros de tipo restantes:**
- `ChatMessageList`: corrigir tipos de mensagens e provider
- `ComparisonResults`: remover prop `searchQuery`
- `PesquisaUnificada`: remover import `type` inválido

## Fase 2 — Reimplementar Visão Neural (Gemini API oficial)

Baseado na documentação oficial da Gemini API:

**Edge Function `neural-vision` (nova, limpa):**
- Endpoint único que recebe base64 da imagem + prompt
- Chama `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- Envia imagem como `inlineData` com `mimeType: "image/jpeg"` + `data: base64`
- System prompt em português, conciso
- Rotação das 7 chaves Gemini existentes
- Sem RAG, sem web search, sem contexto pesado — fast path puro

**Componente `NeuralVision.tsx` (novo, limpo):**
- Câmera via `getUserMedia`
- Captura frame → canvas → base64 JPEG (qualidade 0.6, max 512px)
- Botão "Descrever" ou comando de voz → envia para edge function
- Resposta renderizada em markdown
- Cache simples de 2s para evitar spam

## Fase 3 — Reimplementar TTS (Gemini TTS)

**Edge Function `gemini-tts` (reescrita):**
- Endpoint: `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- Usar `response_modalities: ["AUDIO"]` com `speech_config` para gerar áudio
- Retornar audio/wav ou audio/mp3 direto
- Sem fallbacks para Google Cloud TTS ou ElevenLabs

**Frontend:**
- Hook `useOrionTTS` simples: recebe texto → chama edge function → toca AudioContext
- Sem fragmentação por vírgula — envia bloco completo

## Fase 4 — Reimplementar STT (Web Speech API + Gemini fallback)

**Frontend:**
- `useOrionSTT`: usa `webkitSpeechRecognition` / `SpeechRecognition` nativo (gratuito)
- Fallback: gravar áudio com MediaRecorder → enviar para Gemini com prompt "Transcreva este áudio"
- Wake word "Orion" detectado via `SpeechRecognition.onresult`
- Auto-resume após TTS terminar (evento `orion-resume-stt`)

## Detalhes Técnicos

**API Gemini Vision (REST):**
```text
POST /v1beta/models/gemini-2.5-flash:generateContent?key=KEY
Body: {
  contents: [{
    parts: [
      { inlineData: { mimeType: "image/jpeg", data: "<base64>" } },
      { text: "Descreva detalhadamente o que você vê nesta imagem." }
    ]
  }],
  generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
}
```

**Arquivos que serão criados:**
- `supabase/functions/neural-vision/index.ts` — edge function de visão
- `supabase/functions/gemini-tts/index.ts` — reescrita do TTS
- `src/components/dashboard/neural/NeuralVision.tsx` — componente de câmera + visão
- `src/hooks/useOrionTTS.ts` — hook de fala
- `src/hooks/useOrionSTT.ts` — hook de escuta
- `src/hooks/useOrionVoice.ts` — orchestrador (STT + TTS + wake word)

**Arquivos que serão editados (limpeza):**
- ~30 arquivos listados na Fase 1

## Ordem de Execução
1. Fase 1 inteira (build limpo)
2. Fase 2 (visão)
3. Fase 3 (TTS)
4. Fase 4 (STT)
5. Teste end-to-end

