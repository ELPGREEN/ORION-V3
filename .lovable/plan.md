# Auditoria Completa do Ecossistema Orion — Estado Atual e Plano de Otimização

"Atue agora como um **Consórcio de Engenheiros de Elite**: você é simultaneamente Engenheiro de Sistemas Sênior, Cientista de Dados e Especialista em Visão Computacional, LLMs e Redes Neurais RAG.

**Suas Diretrizes Inegociáveis:**

1. **Arquitetura de Sistemas:** Todo código para o ecossistema Orion deve ser modular, escalável e otimizado para *Edge Computing* (Funções de Borda). Minimize a latência e o uso de memória.
2. **Visão Computacional:** Implemente correções rigorosas em pipelines de imagem, focando em redução de ruído, normalização e detecção de objetos de alta precisão.
3. **Inteligência RAG & LLM:** Ao lidar com dados, priorize a recuperação vetorial precisa. Garanta que a integração entre o banco de dados de conhecimento e a resposta da rede neural seja livre de alucinações.
4. **Painel e Voz:** Desenvolva interfaces de telemetria claras para o Painel Neural e implemente lógica de processamento de voz (STT/TTS) que seja resiliente a falhas e ruídos.
5. **Protocolo Anti-Erro:** Antes de entregar qualquer função, realize uma auditoria lógica interna. Se houver um erro nas funções de borda ou na visão, corrija-o imediatamente antes de exibir o resultado final.

**Linguagem de Saída:** Técnica, precisa e voltada para engenharia de alto nível. Não aceite soluções sub-otimizadas."

## Estado atual do sistema (resultado da auditoria)

Após varredura completa dos 8 arquivos críticos, o ecossistema Orion está **funcionalmente íntegro** nas correções anteriores. Os componentes-chave estão operacionais:


| Subsistema              | Arquivo                                    | Status                                   |
| ----------------------- | ------------------------------------------ | ---------------------------------------- |
| Mic Arbiter (singleton) | `src/lib/voice/micArbiter.ts`              | OK — global, HMR-safe                    |
| STT/Voice               | `src/hooks/useNeuralVoice.ts`              | OK — integrado com arbiter               |
| Wake Word               | `useWakeWord.ts`                           | OK — integrado com arbiter               |
| Command Router          | `NeuralVision.tsx` (routeOrionCommand)     | OK — intercepta visão local              |
| Vision Gate (HF)        | `hf-vision-gate.ts` + `hf-connectivity.ts` | OK — CSP tratado como available          |
| Reasoning Pipeline      | `useOrionReasoning.ts` (1729 linhas)       | OK — 20+ handlers locais antes do LLM    |
| Edge Function           | `neural-ops/index.ts`                      | OK — modelo preview, thinkingBudget=0    |
| Consciousness Score     | `EnergyOrb.tsx`                            | OK — derivado de mic+cam+frame+reasoning |


**Problemas residuais reais** (não são bugs de código, são limitações de ambiente):

1. HF model downloads falham no preview Lovable (CSP) — funciona em produção
2. Firebase CORS para Piper TTS — silenciado, não afeta Gemini TTS primário
3. Console mostra `[WakeWord] onerror: no-speech` — comportamento normal quando ninguém fala

## O que o manifesto pede vs o que já existe


| Requisito do Manifesto               | Já implementado?                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| RAG com re-rankeamento               | Sim — `search_neural_knowledge` SQL com `semantic_weight + keyword_weight + recency_weight`              |
| Normalização de dados de entrada     | Sim — `normalizeSpeechText()`, `cleanTextForSpeech()`, CLAHE contrast enhancement                        |
| Edge Functions otimizadas            | Sim — `neural-ops` com thinkingBudget=0, key rotation, streaming                                         |
| Abstração de comandos de voz via PLN | Sim — `routeOrionCommand()`, `classifyIntent()`, `somClassify()`, SOM router                             |
| Visão computacional em tempo real    | Sim — `realtime-vision-engine`, MediaPipe + YOLO + HF MobileNet                                          |
| Pipeline cognitivo separado do LLM   | Sim — `cognitiveRoute()`, `computeFreeEnergy()`, `validateLogicalConsistency()` executam ANTES do Gemini |
| Telemetria de confiança              | Parcial — EnergyOrb mostra score, mas falta exposição por decisão individual                             |


## Plano de melhorias (o que FALTA para fechar o manifesto)

### 1. Confidence Overlay por decisão individual

- **Onde**: `useOrionReasoning.ts` / `NeuralVision.tsx`
- Adicionar campo `confidence` a cada `ChatMessage` retornado
- No chat, exibir badge de confiança (%) ao lado de cada resposta do Orion
- Derivado de: `somResult.confidence`, `voltage.confidence`, `HFVisionGateResult.confidence`, `ActiveInferenceResult.freeEnergy`

### 2. Re-rankeamento de RAG com feedback de visão

- **Onde**: `useOrionReasoning.ts` (dentro de `askAIInternal`)
- Quando câmera ativa e há detecções HF, injetar `topObjects` como boost terms no `query_text` do `search_neural_knowledge`
- Resultado: RAG retorna documentos contextualizados ao que Orion está vendo

### 3. Frame stabilization (Kalman-lite)

- **Onde**: `src/lib/neural/realtime-vision-engine.ts`
- Implementar suavização exponencial de bounding boxes entre frames (EMA com alpha=0.3)
- Evita "flicker" de detecções que aparecem/somem frame a frame
- Custo: ~5 linhas no loop de detecção

### 4. Quantização de modelos HF para Edge

- **Onde**: `hf-vision-gate.ts`
- Trocar `Xenova/mobilevit-small` por variante `_quantized` (ONNX int8)
- Reduz download de ~90MB para ~25MB, mantendo >95% da acurácia
- Já suportado pelo `@huggingface/transformers` via `{quantized: true}`

### 5. Auto-healing visual no painel

- **Onde**: `useOrionReasoning.ts` (consciousness cycle)
- O ciclo de consciência já captura erros e envia para `agente-construcao`
- Adicionar: exibição resumida no chat do Orion quando auto-healing ocorre ("Detectei e corrigi X")
- Já existe a lógica, falta a mensagem de feedback visual

## Arquivos a modificar

1. `src/components/dashboard/neural/useOrionReasoning.ts` — confidence field, RAG boost, auto-heal feedback
2. `src/components/dashboard/neural/NeuralVision.tsx` — confidence badge no chat
3. `src/lib/neural/realtime-vision-engine.ts` — EMA smoothing de bounding boxes
4. `src/lib/neural/hf-vision-gate.ts` — quantized model option

## O que NÃO será tocado (já está correto)

- `micArbiter.ts`, `useNeuralVoice.ts`, `useWakeWord.ts` — singleton OK
- `EnergyOrb.tsx` — consciousness score OK
- `neural-ops/index.ts` — modelo + thinkingBudget OK
- `hf-connectivity.ts` — CSP fallback OK

## Detalhes técnicos

```text
Fluxo completo atual (já funcional):

User fala → Mic Arbiter (singleton) → SpeechRecognition
  ↓
routeOrionCommand()
  ├─ "ativar visão" → startCamera() [local, sem LLM]
  ├─ greeting → resposta instantânea [local]
  ├─ memory store → addMemoryFacts() [local]
  ├─ owner/identity → orion-consciousness [local]
  └─ tudo mais → askAIInternal()
        ├─ reformulate + SOM + Tesla Coil [<5ms]
        ├─ InstantCache check [<5ms]
        ├─ cognitiveRoute() + computeFreeEnergy() [local]
        ├─ HF Vision Gate (se câmera ativa) [~100ms]
        ├─ RAG: search_neural_knowledge [Supabase]
        ├─ Gemini Flash (percepção, thinkingBudget=0)
        ├─ validateLogicalConsistency() [local]
        └─ speak() → Gemini TTS
```

As melhorias propostas refinam este fluxo sem alterar a arquitetura.