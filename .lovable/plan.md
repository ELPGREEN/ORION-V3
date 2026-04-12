
# Plano: Remover visão neural legada e reimplementar visão computacional limpa

## Problema atual
O sistema de visão tem ~40+ arquivos no `src/lib/neural/` que são stubs vazios, código morto, ou módulos pesados que nunca funcionaram corretamente (MediaPipe WASM, YOLO ONNX local, face-api.js, etc.). O `NeuralVision.tsx` (1176 linhas) chama `detectRealTime()` que retorna arrays vazios. Hooks como `useMultimodalVision` e `useTribunalVision` não são importados por nenhum componente ativo. O `groq-vision-hybrid` chama uma edge function que foi deletada.

## Abordagem: Visão via Gemini on-demand (já funciona)

A visão **já funciona** via `analyzeFrameWithAI()` → edge function `orion-intelligence` → Gemini Flash com imagem base64. O problema é o lixo em volta. Vamos:

1. Manter o que funciona (Gemini on-demand)
2. Remover tudo que é stub/morto/pesado

## Etapas

### Etapa 1 — Deletar arquivos de visão mortos (~30 arquivos)
Arquivos em `src/lib/neural/` que são stubs, nunca chamados, ou dependem de libs removidas:

**Vision pipeline (stubs/mortos):**
- `mediapipe-vision.ts` (stub)
- `realtime-vision-engine.ts` (stub)
- `vision-tribunal.ts`, `vision-semantic-cortex.ts` (se existe)
- `vision-preprocessing.ts`, `vision-otsu.ts`, `vision-kmeans-quality.ts`
- `vision-text-detection.ts`, `vision-yolo-priors.ts`, `vision-local-learning.ts`
- `vision-layout-parser.ts`, `vision-regional-description.ts`
- `vision-temporal-buffer.ts`, `vision-rag-injector.ts`
- `vision-agent-presets.ts`, `agentic-vision-agent.ts`
- `yolo-onnx-detector.ts`, `yolo-framex-engine.ts`, `yolo-framex-types.ts`
- `yolofx-proxy.ts`, `yolofx-worker.ts`
- `segment-anything.ts`, `depth-estimation-engine.ts`
- `scene-reconstruction-3d.ts`, `ocr-engine.ts`, `gaze-detection.ts`
- `face-attributes-engine.ts`, `face-api-runtime.ts`, `face-auth-learning.ts`
- `face-detection-fallback.ts`, `humanex-face-pipeline.ts`
- `facial-recognition.ts`, `body-language.ts`
- `frame-tensor-preprocessing.ts`, `smolvlm-engine.ts`
- `vlm-offline-engine.ts`, `trocr-handwritten.ts`
- `tfm-vision-augment.ts`, `tfm-vision-ops.ts`, `tfm-vision-models.ts`

**Hooks mortos:**
- `src/hooks/useMultimodalVision.ts`
- `src/hooks/useTribunalVision.ts`
- `src/hooks/useFaceDetection.ts`

**Client morto:**
- `src/lib/groq-vision-hybrid.ts`

**Componentes mortos:**
- `src/components/neural/PointCloud3DViewer.tsx`

### Etapa 2 — Simplificar useVisionProcessing.ts
Remover imports de módulos deletados. Manter apenas processamento básico de canvas (regiões por cor/edge, motion detection) que alimenta o VS global. Sem ML local.

### Etapa 3 — Simplificar NeuralVision.tsx
- Remover `detectRealTime()` call (linha 529) — já retorna vazio
- Remover `preloadAllVision()` — já é no-op
- Remover `mlDetections` state e `categoryFromSource()`
- Manter: câmera, canvas, processFrame heurístico, voice, Orion reasoning

### Etapa 4 — Simplificar orion-ai-client.ts
- Remover `buildLocalDetections()` — toda a seção de multiTask/rtv que lê dados vazios
- Simplificar: enviar canvas como imagem para Gemini, ponto. Sem "local detections"
- Remover import de `vision-local-learning`

### Etapa 5 — Limpar neural/index.ts
Remover todas as `export *` dos arquivos deletados (~30 linhas).

### Etapa 6 — Corrigir imports quebrados
- `orion-orchestrator-exec.ts` — remover imports de mediapipe/yolo/face-api
- `orion-api-orchestrator.ts` — remover imports de mediapipe/yolo/face-api
- `LaboratorioIA.tsx` — remover import de `groq-vision-hybrid`
- `FaceAuthEnroll.tsx` / `FaceAuthLogin.tsx` — simplificar (remover face-api.js)
- `FaceScannerOverlay.tsx` — remover import de face-api types
- `NeuralConsciousnessLoop.tsx` — remover import de segment-anything
- `neural-pipeline.ts` — remover imports mortos

### Etapa 7 — Reimplementar visão limpa
Criar um único arquivo `src/lib/vision/gemini-vision.ts`:
- `captureFrame(canvas): string` — canvas → base64 JPEG
- `analyzeFrame(base64, question?)` — chama edge function `orion-intelligence` com imagem
- Streaming support via `analyzeFrameStreaming` (já existe no orion-ai-client, apenas limpar)

## Resultado
- **~40 arquivos deletados** (vision stubs, YOLO, MediaPipe, face-api, VLM, etc.)
- **Zero erros de build** — todos os imports corrigidos
- **Visão funcional** via Gemini on-demand (câmera → canvas → base64 → Gemini Flash)
- **~2000+ linhas removidas** de código morto
