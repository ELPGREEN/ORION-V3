

# Comandos de Voz para Auto-Correção Orion + Proteção por Voice ID

## Diagnóstico Atual

### Comandos que ativam Jules (auto-correção)
Os seguintes comandos de voz/texto já são reconhecidos pelo Orion:

| Comando (PT-BR) | Intent | O que faz |
|---|---|---|
| "melhore-se", "evolua", "auto-evolução" | `self_evolve` | Dispara ciclo de auto-melhoria |
| "auto-programe", "se reprograme" | `self_evolve` | Mesmo |
| "otimize suas respostas", "recalibre" | `self_evolve` | Mesmo |
| "melhorar código", "sugerir melhorias" | `self_suggest_improvements` | Análise de código |
| "evolução neural", "auto evolução" | `neural_evolution` | Lista propostas de evolução |
| "mapa da arquitetura" | `self_architecture_map` | Grafo de dependências |

### Triggers automáticos (sem comando de voz)
- Quando qualquer subsistema falha **3x na mesma hora**, `recordSubsystemFailure` dispara `orionSelfImprove()` automaticamente
- No agentic loop (fase 7), se a verificação falha 3x para o mesmo intent, `triggerJulesSelfImprove` cria sessão Jules

### PROBLEMA CRÍTICO DE SEGURANÇA

**Nenhum** destes caminhos verifica se quem está comandando é o criador (voice ID):

1. `orionSelfImprove()` — sem verificação de identidade
2. `triggerJulesSelfImprove()` — sem verificação
3. `recordSubsystemFailure()` — sem verificação
4. `runEvolutionScan()` — sem verificação
5. Intent `self_evolve` — cai no agentic loop sem checar `identityStatus`
6. Tool `neural_evolution` — só verifica `R_ADV` (role), não voice ID

**Qualquer usuário autenticado pode disparar Jules e criar PRs no GitHub.**

---

## Plano de Correção

### 1. Criar guard centralizado `isCreatorVerified()`

Novo utilitário em `jules-client.ts` que verifica:
- Email é do criador (`isOwnerEmail`) **OU**
- Voice identity status é `"creator"` (verificado pelo `useVoiceIdentityGuard`)

### 2. Proteger `orionSelfImprove()` 

Adicionar parâmetro `callerIdentity` obrigatório. Se não for creator, rejeitar com erro claro.

### 3. Proteger `triggerJulesSelfImprove()` no agentic loop

Receber `identityStatus` do contexto. Só executa se `=== "creator"`.

### 4. Proteger intent `self_evolve` no voice-intent-dispatcher

Antes de passthrough, verificar identity. Se não for creator, retornar "Apenas o criador pode solicitar auto-evolução."

### 5. Proteger `runEvolutionScan()` e `runFullScan()`

Exigir creator identity antes de disparar scans que geram sessões Jules.

### 6. Manter triggers automáticos (subsystem failures) sem restrição de voz

Os triggers automáticos por falhas de subsistema são internos (o sistema auto-detecta bugs). Esses devem continuar funcionando sem voice ID — mas com rate limit já existente (3/hora).

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/lib/neural/jules-client.ts` | Guard `isCreatorVerified()`, param `callerIdentity` em `orionSelfImprove` |
| `src/lib/neural/orion-agentic-loop.ts` | Checar identity antes de `triggerJulesSelfImprove` |
| `src/lib/neural/jules-evolution-engine.ts` | Guard em `runFullScan()` e `dispatchToJules()` |
| `src/lib/neural/voice-intent-dispatcher.ts` | Bloquear `self_evolve` para não-criadores |
| `src/lib/neural/orion-tool-executor.ts` | Guard nos tools `neural_evolution`, `self_suggest_improvements` |
| `src/components/dashboard/neural/JulesSelfImprovePanel.tsx` | Esconder botão "Scan Manual" se não for creator |

