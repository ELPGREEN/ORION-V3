# Auditoria do Pipeline de Visão Neural — Fase 1 (somente leitura)

Data: 2026-04-18  
Escopo: `src/components/dashboard/neural/{NeuralVision,useVisionProcessing,useOrionReasoning,useSuperNetWS}.tsx`, `src/lib/neural/{multimodal-pipeline,orion-orchestrator-exec,orion-ai-client}.ts`, `src/lib/vision/*`.

> Nada foi alterado. Este é um mapa de problemas com severidade e plano de correção.

---

## 🔴 Severidade ALTA — bugs reais

### A1. `multimodal-pipeline.ts` chama API mas o agente foi removido (código morto disfarçado)
- **Arquivo:** `src/lib/neural/multimodal-pipeline.ts` (linhas 17-21)
- **Sintoma:** `runAgenticVisionCycle`, `getAgentState`, `formatAgentContextForPrompt` são stubs vazios — sempre retornam `{observations:[], actions:[], learned:[]}` e `""`. Ainda assim o pipeline gasta CPU formatando contexto de agente que não existe.
- **Impacto:** `agentContext` e `sensorsActive.agent` no contexto enviado ao LLM são sempre falsos/vazios → ruído no prompt.
- **Fix proposto (Fase 3):** remover bloco `realTimeVision`/`agentCycle` do retorno e do `MultimodalContext`.

### A2. `orion-orchestrator-exec.ts` — todas as funções de detecção local são stubs
- **Arquivo:** `src/lib/neural/orion-orchestrator-exec.ts` (linhas 13-20)
- **Sintoma:** `detectAllMP`, `detectWithYOLO`, `detectSingleFaceFull`, `loadFaceApiModels` retornam vazio. Mas `orchestratorSee` continua iterando `getAPIsForCapability("vision")` e marcando latência → `reportAPILatency` registra dados falsos.
- **Impacto:** dashboard de saúde de APIs mostra estatísticas inventadas; pipeline pensa que tem fallback que não existe.
- **Fix proposto (Fase 3):** ou remover orquestrador, ou fazer `orchestratorSee` chamar diretamente `captureVideoFrame + analyzeFrameSmart` (que é o caminho real).

### A3. `useVisionProcessing.processFrame` faz 4 fases de processamento que retornam stubs vazios
- **Arquivo:** `src/components/dashboard/neural/useVisionProcessing.ts` (linhas 108-111, 319-363)
- **Sintoma:** `classifyWithPriors`, `detectTextRegions`, `kMeansColorSegmentation`, `assessImageQuality` são `() => []` / `() => { sharpness:0, ... }`. Mesmo assim o `processFrame` monta inputs (linhas 326-353), enriquece com cor de regiões mais próximas, etc. — trabalho jogado fora a cada frame.
- **Impacto:** ~30-50ms desperdiçados por frame em 8x6 grid + enriquecimento HSV que nunca é usado.
- **Fix proposto (Fase 3):** remover Phase 7-10 do `processFrame` e os campos correspondentes de `VS`.

### A4. `preloadVisionModel` é chamado mas faz nada (warning poluindo console)
- **Arquivo:** `src/components/dashboard/neural/NeuralVision.tsx` (linhas 52-59)
- **Sintoma:** função existe só para imprimir `console.warn("[Vision] Local model preload DISABLED")`. Variáveis `mpObjectDetector`/`mpVisionReady` nunca são atribuídas em nenhum lugar — código morto.
- **Fix proposto (Fase 2):** remover função, variáveis e import de `ObjectDetector`/`FilesetResolver` se não usados em mais lugar nenhum.

---

## 🟡 Severidade MÉDIA — refatoração mal-feita

### M1. Dupla fonte de verdade para frame de vídeo
- **Arquivos:** `NeuralVision.tsx` (`captureVideoFrame` em `detectRealTime`) e `useSuperNetWS.ts` (`canvas.toBlob` + `downscaleCanvas`).
- **Sintoma:** dois caminhos diferentes de captura/encode (one para Gemini, outro para SuperNet WS), com presets de qualidade diferentes (`quality-presets` vs hardcoded 320×0.6).
- **Impacto:** difícil manter; latência/qualidade inconsistentes entre análises.
- **Fix proposto (Fase 4):** unificar via um único `captureFrameForVision(canvas, preset)`.

### M2. `classifyImage` importado mas não usado
- **Arquivo:** `NeuralVision.tsx` (linha 43)
- **Sintoma:** `import { classifyImage } from "@/lib/huggingface/transformers-vision"` — `classifyImage` nunca é referenciado no arquivo (busca limpa).
- **Fix proposto (Fase 2):** remover import.

### M3. `MediaPipe ObjectDetector` importado mas detector real está desabilitado
- **Arquivo:** `NeuralVision.tsx` (linha 45, 52)
- **Sintoma:** `import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision"` — usado apenas para tipar `mpObjectDetector` que nunca recebe valor (ver A4).
- **Impacto:** bundle inflado com `@mediapipe/tasks-vision` sem ganho.
- **Fix proposto (Fase 2):** remover import; manter dependência só se outro arquivo usar (verificar antes).

### M4. `OWNER_ONLY_INTENT_REGEX` definido mas não está bloqueando nas ramificações certas
- **Arquivo:** `useOrionReasoning.ts` (linha 80)
- **Sintoma:** regex existe mas precisa confirmar se TODAS as branches que disparam `improve_code`/`analyze_code` checam isOwner antes de chamar a edge function. Esta é a raiz do bug do usuário ("ele pede melhorias de código quando pergunto o que vê").
- **Impacto:** **comportamento errado reportado**: ao pedir descrição visual, o Orion responde com sugestão de refator.
- **Fix proposto (Fase 3 — bug fix prioritário):** auditar todos os pontos de dispatch de intent no arquivo e garantir guarda `isOwner` + fallback para chat normal quando regex casar sem permissão.

### M5. Cache `_rtCache` não tem invalidação por mudança de cena
- **Arquivo:** `NeuralVision.tsx` (linha 66, `detectRealTime`)
- **Sintoma:** throttle puramente temporal (1s) — se o usuário move a câmera dentro do intervalo, retorna resultado antigo como se fosse atual.
- **Fix proposto (Fase 4):** invalidar cache se `motion.intensity > N` no último frame.

---

## 🟢 Severidade BAIXA — limpeza cosmética

### L1. `vsLog` mantém array `debugLog` em memória que ninguém renderiza
- **Arquivo:** `useVisionProcessing.ts` (linhas 142, 152-154)
- **Sintoma:** array crescendo até 30 entradas e sendo recriado a cada chamada. Verificar se algum painel consome `VS.debugLog` — se não, remover.

### L2. `Region.edgeDensity` arredondado para inteiro perde precisão
- **Arquivo:** `useVisionProcessing.ts` (linha 260)
- **Sintoma:** `Math.round(ed * 100)` — se algum classificador downstream usar este valor, há perda de resolução.

### L3. Imports duplicados no topo de `NeuralVision.tsx`
- Arquivo importa `ChatIARouter`, `OrionResearchBrowser`, `OrionEmbeddedVideo` que provavelmente não são usados em todas as branches — confirmar uso e remover dead imports.

---

## Plano de fases sugerido

| Fase | Escopo | Risco | Tempo |
|------|--------|-------|-------|
| **2** | Remoção de código morto seguro: A4, M2, M3, L1, L3 (só imports e funções nunca chamadas) | **Baixo** — nada que rode hoje quebra | 5-10 min |
| **3** | Bug fixes reais: M4 (owner gate), A1+A2+A3 (remover stubs do pipeline) | **Médio** — toca `processFrame` e `multimodal-pipeline` | 15-20 min |
| **4** | Refatoração para performance: M1 (unificar captura), M5 (cache adaptativo) | **Médio-alto** — muda contrato de funções compartilhadas | 30+ min, exige teste |

---

## Próximo passo

Aguardo aprovação para iniciar **Fase 2** (limpeza segura). Recomendo NÃO pular para Fase 3 sem fazer Fase 2 antes — é mais fácil enxergar os bugs reais com o código morto removido.
