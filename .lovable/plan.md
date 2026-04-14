<final-text>## Resumo

Os comandos falham hoje por 4 causas principais:

1. A proteção de criador foi implementada em `voice-intent-dispatcher.ts`, mas o fluxo real de voz passa por `NeuralVision -> useOrionReasoning`, então esse guard quase não protege o caminho usado de verdade.
2. `matchAndExecuteTool()` é chamado sem `identityStatus`; então todo tool `creatorOnly` pode ficar bloqueado até para o criador.
3. `"melhorar código"` e `"mapa da arquitetura"` não entram no bloco de tools porque dependem de `_isSpecialCmd`, e esses comandos não foram bem cadastrados nesse roteamento.
4. `"melhore-se"/"evolua"` hoje ativam o pipeline local `neural-evolution`, não o `orionSelfImprove()` com sessão Jules/PR no GitHub.

Também há um problema de segurança: em erro de microfone/blob pequeno/falha de extração, o sistema ainda cai para `"owner"` em alguns pontos. Isso contradiz sua regra de nunca executar se não for o voice ID do criador.

## Plano de implementação

### 1. Unificar o fluxo dos comandos sensíveis
Criar um único caminho real para comandos de auto-correção/evolução dentro de `useOrionReasoning`, sem depender de caminhos paralelos.

Mapeamento final:
- `melhore-se`, `evolua`, `auto-programe`, `se reprograme`, `recalibre` -> `orionSelfImprove()` / Jules / PR
- `evolução neural` -> listar propostas de evolução
- `melhorar código`, `sugerir melhorias` -> `self_suggest_improvements`
- `mapa da arquitetura` -> `self_architecture_map`

### 2. Passar a identidade real até a execução
Levar `identityStatus` do `NeuralVision` para `useOrionReasoning` e então para:
- `matchAndExecuteTool(processedQuestion, userRole, identityStatus)`
- `orionSelfImprove({ callerIdentity: { email, identityStatus } })`

Assim, creator-only deixa de depender de valor `undefined`.

### 3. Aplicar bloqueio fail-closed
Trocar os fallbacks inseguros de `"owner"` por bloqueio seguro (`unknown`/`guest`/mensagem de verificação falhou`) em:
- `src/hooks/useVoiceIdentityGuard.ts`
- `src/components/dashboard/neural/NeuralVision.tsx`
- gates sensíveis em `useOrionReasoning.ts`

Se a voz não for confirmada como `"creator"`, o Orion não executa:
- PR automático
- análise de código
- auto-construção
- comandos de arquitetura sensíveis

### 4. Remover inconsistências entre intent e ação
Separar claramente:
- auto-correção com GitHub/Jules
- evolução neural interna (propostas, embeddings, auto-learn)

Hoje `self_evolve` cai no serviço errado para o caso “corrigir o próprio código”. Vou corrigir isso para que o comando faça exatamente o que você espera.

### 5. QA end-to-end
Validar 5 cenários:
- `creator` -> comando executa
- `owner` -> bloqueado
- `guest` -> bloqueado
- `unknown` -> bloqueado
- erro de microfone/verificação -> bloqueado

E testar especificamente:
- `melhore-se`
- `evolua`
- `melhorar código`
- `sugerir melhorias`
- `evolução neural`
- `mapa da arquitetura`

## Arquivos a ajustar

- `src/components/dashboard/neural/NeuralVision.tsx`
- `src/components/dashboard/neural/useOrionReasoning.ts`
- `src/hooks/useVoiceIdentityGuard.ts`
- `src/lib/neural/orion-tool-executor.ts`
- `src/lib/neural/jules-client.ts`
- `src/lib/neural/voice-intent-dispatcher.ts`

## Detalhes técnicos

- O bug principal é estrutural, não só de regex.
- O fluxo real de voz hoje ignora a proteção mais forte.
- O executor de tools não recebe `identityStatus`.
- O gate `_isSpecialCmd` impede comandos válidos de chegarem ao executor.
- O gate atual verifica mais a existência de cadastro biométrico do que a confirmação real de `"creator"`.
- O intercept atual de `self_evolve` chama `neural-evolution`, quando o esperado para “corrigir seu próprio código” é `orionSelfImprove()` com Jules.</final-text>