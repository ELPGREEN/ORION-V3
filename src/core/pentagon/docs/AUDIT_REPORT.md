# 🔬 Pentagon Audit Report — Pontos de Vazamento de Inteligência

> Gerado em 2026-04-27 — análise estática de todos os pontos de entrada (chat texto, voz, visão neural, comando total, autônomo).

## Sumário executivo

| Fluxo | Passa pelo Pentagon? | Awaita o ciclo? | Usa `responseHint`? | Usa `ragSnippets`? |
|-------|----------------------|-----------------|---------------------|--------------------|
| **Chat texto/voz (`analyzeFrameWithAI`)** | ✅ Sim (`buildPentagonPromptContext` linha 813) | ⚠️ Sim (timeout 180ms) | ❌ **NÃO** — só pega `rationale`/`plan` | ❌ **NÃO** — `mergedContext` é jogado cru no prompt |
| **`processInteraction` (Maestro)** | ⚠️ Sim, mas **fire-and-forget** (linha 1142 — `.catch()` sem await) | ❌ **NÃO** — segue caminho legado em paralelo | ❌ **NÃO** | ❌ **NÃO** — usa CRAG separado |
| **`OrionStoreAssistant`** | ❌ **NÃO** — chama `neural-ops` direto | — | — | — |
| **`OrionAdvogadoInsights`** | ❌ **NÃO** — chama `neural-ops` direto | — | — | — |
| **`OrionProductInsights`** | ❌ **NÃO** — chama `neural-ops` direto | — | — | — |
| **`OrionComandoTotal`** | ❌ **NÃO** — chama `orion-tool-executor` direto | — | — | — |
| **`ChatJuridico` / `ChatHumano`** | ❌ **NÃO** — usa `useOrionCore` que pula Pentagon | — | — | — |
| **Vision Neural (`analyzeFrameWithAI`)** | ✅ Sim (mesmo path do texto) | ⚠️ Sim | ❌ **NÃO** | ❌ **NÃO** |
| **Autônomo (`orion-autonomous-agent`)** | ❌ **NÃO** | — | — | — |

## Pontos críticos de vazamento

### 🔴 CRÍTICO — `processInteraction` (linha 1140-1147)
```ts
cortex.runCycle(question, { userId, wmContext: context, intent: detectedIntent }).catch(...)
// ❌ Sem await! O Pentagon roda em paralelo e nunca influencia a resposta
```
**Impacto:** O lobo frontal (DeepSeek R1 / Nemotron) NUNCA é consumido pelo gerador final. Resultado: respostas genéricas tipo ChatGPT cru.

### 🔴 CRÍTICO — `buildPentagonPromptContext` (linha 90-116)
Captura apenas:
- `state.perception?.intent`
- `state.memory?.mergedContext.slice(0, 500)` ← **trunca demais, perde o RAG**
- `state.reasoning?.rationale.slice(0, 280)` ← **trunca demais**
- `state.reasoning?.plan`
- `result?.output` ← isso é só o ActionAdapter (mock retorna "Ação realizada com sucesso")

**Falta capturar:**
- `state.reasoning?.responseHint` ← o rascunho do lobo frontal!
- `state.memory?.longTerm` (RAG bruto do CRAG)
- Snippets jurídicos individuais

### 🟡 MÉDIO — Adapters paralelos
`OrionStoreAssistant`, `OrionAdvogadoInsights`, `OrionProductInsights`, `OrionComandoTotal` chamam edge functions diretamente. Devem migrar para `processInteraction` ou ganhar pre-pass Pentagon.

### 🟡 MÉDIO — Sem validador
Não há nenhuma checagem garantindo que `ragSnippets.length > 0` ou `mergedContext.length > 100` antes de chamar o LLM final. Sem isso, perguntas jurídicas saem sem o conhecimento ingerido.

### 🟢 BAIXO — `recordCorrection` ainda manual
`isNegativeFeedback()` existe mas só é chamado em testes. Em chat real, correções do usuário não viram aprendizado.

## Plano de correção (implementado nesta entrega)

1. ✅ Estender `MemoryResult` com `ragSnippets[]` e `ReasoningResult` com `responseHint`
2. ✅ `buildPentagonPromptContext` agora **awaita** o ciclo e injeta `responseHint` como bloco **PRIORITÁRIO** no prompt (`═══ RASCUNHO DO LOBO FRONTAL ═══`)
3. ✅ Validador `assertPentagonReadiness()` que loga warning se ragSnippets vazio em queries jurídicas
4. ✅ `pentagon-runtime-correction.ts` — listener global `orion:user-correction` que dispara `recordCorrection` + grava episódio

## Próximos passos sugeridos (não nesta entrega)

- Migrar `OrionStoreAssistant`, `OrionAdvogadoInsights`, `OrionProductInsights` para usar `processInteraction` em vez de invocar `neural-ops` direto
- Adicionar `pentagon` flag em `useOrionCore` para forçar pre-pass em `ChatJuridico`/`ChatHumano`
- Telemetria: gravar em `ai_metrics.tools_used` se a resposta usou `responseHint` (validar que está sendo consumido)
