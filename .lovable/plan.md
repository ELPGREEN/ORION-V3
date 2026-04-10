

## Plano: Protocolo Gênesis + Raciocínio Rápido + Protocolos Coerentes

### Problemas identificados

1. **"Projeto Gênesis" não é reconhecido**: Nenhuma regex no sistema detecta "gênesis" ou "genesis". O `ORION_GENESIS` existe em `orion-consciousness.ts` com toda a história de origem, mas nunca é injetado quando o usuário pergunta sobre Gênesis.

2. **Protocolos não são ativados corretamente**: O `matchProtocols()` usa `.includes()` simples — falha com variações de voz (ex: "quem é voce" vs "quem é você"). Além disso, tem timeout de 400ms que pode expirar.

3. **Roteamento de contexto errado**: `isProjectQuestion` (regex "projeto") roteia para `buildInvestorContext()` em vez de injetar a identidade/genesis do Orion.

4. **Duplicação de lógica**: A detecção de intent está duplicada em 3 lugares (non-streaming em `analyzeFrameWithAI`, streaming em `analyzeFrameStreaming`, e local em `useOrionReasoning.ts`).

---

### Correções

#### 1. Adicionar detecção de "Gênesis" como intent de identidade
**Arquivos**: `src/lib/neural/orion-ai-client.ts`, `src/components/dashboard/neural/useOrionReasoning.ts`

- Adicionar regex `isGenesisQuestion` que detecta: `gênesis`, `genesis`, `projeto genesis`, `como você nasceu`, `sua origem`, `como foi criado`, `protocolo genesis`
- No `useOrionReasoning.ts`: adicionar handler local (como o de "dono/criador") que responde com `ORION_GENESIS.originStory` completo — resposta instantânea sem LLM
- Nos dois `analyzeFrame*`: rotear `isGenesisQuestion` para `buildOrionIdentityPrompt()` em vez de `buildBaseContext()`

#### 2. Adicionar "gênesis" ao protocolo de identidade no JSON
**Arquivo**: `public/data/orion_voice_protocols.json`

- Adicionar protocolos de identidade com triggers: "genesis", "gênesis", "projeto genesis", "como nasceu", "sua origem"
- Responses com resumo da timeline de criação

#### 3. Corrigir roteamento de `isProjectQuestion`
**Arquivo**: `src/lib/neural/orion-ai-client.ts` (2 locais)

- Quando `isProjectQuestion` é true E a query contém "gênesis/genesis/origem/nasceu", usar `buildOrionIdentityPrompt()` em vez de `buildInvestorContext()`

#### 4. Melhorar matching de protocolos para voz
**Arquivo**: `src/lib/neural/orion-voice-protocols.ts`

- Normalizar acentos antes do matching (remover diacríticos: ê→e, ã→a, etc.)
- Usar word boundary matching em vez de substring simples
- Resultado: "quem e voce" matchará "quem é você"

---

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/neural/useOrionReasoning.ts` | Handler local para "gênesis" com resposta instantânea |
| `src/lib/neural/orion-ai-client.ts` | `isGenesisQuestion` regex em ambos os paths (streaming + non-streaming) |
| `src/lib/neural/orion-voice-protocols.ts` | Normalização de acentos no matching |
| `public/data/orion_voice_protocols.json` | Novos protocolos de identidade (genesis) |

### Sem impacto
- Não altera o TTS nem a visão
- Não muda o edge function `neural-ops`
- Mantém todos os handlers existentes intactos

