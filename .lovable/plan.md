

# Corrigir todos os erros de build restantes da limpeza de visão

## Resumo
Há ~50 erros TypeScript em 8 arquivos. Todos são referências quebradas a módulos deletados (face-api, MediaPipe, vision-preprocessing, etc.) ou tipos incompatíveis após a substituição por stubs.

## Correções por arquivo

### 1. `FaceAuthEnroll.tsx` (linha 4)
- Remover import de `face-api-runtime` (deletado)
- Substituir `detectSingleFaceFull`/`drawFaceOverlay`/`descriptorToArray` por stubs simples que usam apenas BlazeFace (já importado na linha 3) + canvas fallback
- Corrigir tipos nas linhas 227-228 (arithmetic com `unknown`)

### 2. `FaceScannerOverlay.tsx` (linhas 8-9)
- Remover imports de `useFaceDetection` e `face-api-runtime`
- Definir tipos `DetectedFace` e `FaceApiDetection` inline (interfaces simples)
- Corrigir operações aritméticas nas linhas 94, 269, 287 (cast para `number`)

### 3. `useVisionProcessing.ts` (linhas 11-15, 40)
- Remover imports de `vision-preprocessing`, `vision-otsu`, `vision-yolo-priors`, `vision-text-detection`, `vision-kmeans-quality`, `realtime-vision-engine`
- Criar stubs inline para todas as funções/tipos usados (gaussianBlur, sobelWithDirection, otsuThreshold, etc.)
- Remover tipo `RealTimeVisionResult` do VS store (já não existe)

### 4. `NeuralVision.tsx` (linhas 537-546, 838)
- Remover referências a `frameXResult` e `faceAttributes` do resultado de `detectRealTime` (propriedades que não existem no stub)
- Corrigir comparação `status === "native"` (o stub só retorna `"none"`)

### 5. `NeuralConsciousnessLoop.tsx` (linha 2075)
- `segmentScene` stub é async e aceita 0 args, mas é chamado com 1 arg — corrigir para aceitar args opcionais

### 6. `neural-pipeline.ts` (linhas 258, 266, 328, 330-331, 490)
- `segmentScene`/`segmentDocument` são `async` mas usados em `runStage` sincronamente — remover `async` ou ajustar chamadas
- Remover referências a `totalSegments`/`coveragePercent` (não existem no tipo stub)

### 7. `neural-mirroring.ts` (linhas 217-231, 380-381)
- Corrigir tipo `BodyLanguageResult`: adicionar `emotionalHint`, `signal`, `confidence` ao tipo stub (linha 16)
- Corrigir tipo `FacialEmotion`: é `{ emotion: string; confidence: number }` mas usado como string literal — unificar

### 8. `perceive-reason-act.ts` (linhas 349-350, 437, 977-993)
- Adicionar `id`, `action`, `livenessScore`, `isMaskDetected` ao tipo stub `IdentificationResult`
- Adicionar `frameXResult`, `faceAttributes`, `depthResult`, `inferenceMs` ao tipo stub `RealTimeVisionResult`

## Resultado
- Zero erros de build
- Todos os stubs tipados corretamente
- Nenhuma funcionalidade quebrada (tudo já retornava dados vazios)

