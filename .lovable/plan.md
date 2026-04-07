

# Auditoria e Refinamento Total da IA Orion

## Estado Atual (o que JÁ existe e funciona)

A implementação atual da Orion está **~90% completa**. Componentes existentes:

| Componente | Status | Arquivo |
|---|---|---|
| Central de Ajuda (30 seções, 97+ comandos, FAQ, steps) | ✅ Completa | `InstrucoesPlataforma.tsx` |
| Wake-word "Orion" (regex tolerante a variações) | ✅ Ativo | `PublicOrionListener.tsx` |
| Navegação por voz (100+ destinos mapeados) | ✅ Ativo | `orion-nav-map.ts` |
| Command Registry (1000+ comandos neurais) | ✅ Ativo | `orion-command-registry.ts` |
| Visão Computacional (MediaPipe + YOLO, local) | ✅ Ativo | `yolofx-proxy.ts`, `mediapipe-vision` |
| Smart Home / IoT (MQTT, Bluetooth) | ✅ Ativo | `smart-home-controller.ts` |
| Controle Robótico (ROS2, VDA5050) | ✅ Ativo | `ControleRobotico.tsx` |
| TTS (Gemini Charon + Fish Speech fallback) | ✅ Ativo | voice pipeline |
| Barge-in + detecção de eco | ✅ Ativo | `framePipeline.ts` |
| SOM Router (classificação de intenções) | ✅ Ativo | `som-router.ts` |
| Frame Pipeline (Pipecat-style) | ✅ Ativo | `framePipeline.ts` |
| Evolução vocal adaptativa | ✅ Ativo | `adaptiveVoiceStyle.ts` |
| Menu lateral → Central de Ajuda | ✅ Parcial | Sidebars apontam `/dashboard/instrucoes` |

## Gaps Encontrados (o que falta ou está quebrado)

### 1. Links desatualizados no Nav Map
`orion-nav-map.ts` ainda usa `/servicos#advogados` etc. — deveria apontar para as novas rotas `/solucoes/advogados`, `/solucoes/produtores`, `/solucoes/afiliados`, `/solucoes/industria` (criadas na reorganização anterior).

### 2. ClienteDashboard path errado
`ClienteDashboard.tsx` aponta Central de Ajuda para `/dashboard/central-ajuda` (não existe) ao invés de `/dashboard/instrucoes`.

### 3. Comandos de voz para a Central de Ajuda
O nav map tem "ajuda", "central de ajuda", "instruções" → mas faltam triggers: "guia completo", "guia de uso", "manual".

### 4. Wake-word "Painel" não implementado
O guia diz que "Painel" é wake-word alternativo, mas `PublicOrionListener.tsx` e o `OrionGlobalListener` só reconhecem "Orion" via regex. "Painel" não está no regex.

### 5. Falta rota `/dashboard/central-ajuda` como alias
Para evitar 404 se alguém navegar direto.

## Plano de Implementação

### Passo 1 — Atualizar `orion-nav-map.ts`
- Mudar rotas de soluções: `advogados` → `/solucoes/advogados`, `produtores digitais` → `/solucoes/produtores`, etc.
- Adicionar triggers: "guia completo", "guia de uso", "manual" → `/dashboard/instrucoes`
- Adicionar "smart home", "casa inteligente", "dispositivos" como destinos

### Passo 2 — Corrigir `ClienteDashboard.tsx`
- Path da Central de Ajuda: `/dashboard/central-ajuda` → `/dashboard/instrucoes`

### Passo 3 — Adicionar wake-word "Painel" no regex
- Em `PublicOrionListener.tsx`: adicionar `painel` ao `ORION_WAKE_REGEX`
- Em `OrionGlobalListener` (se existir regex separado): mesmo ajuste

### Passo 4 — Adicionar rota alias no `App.tsx`
- `<Route path="central-ajuda" element={<Navigate to="/dashboard/instrucoes" replace />} />`

### Passo 5 — Verificar e completar `InstrucoesPlataforma.tsx`
A Central de Ajuda já contém todas as 30 seções do guia fornecido. Verificar que Smart Home e Extensão Chrome estão completos com todos os comandos de voz listados no guia (já estão).

## Arquivos a modificar

| Arquivo | Ação |
|---|---|
| `src/lib/neural/orion-nav-map.ts` | Atualizar rotas soluções + adicionar triggers |
| `src/pages/dashboard/ClienteDashboard.tsx` | Fix path Central de Ajuda |
| `src/components/PublicOrionListener.tsx` | Adicionar "Painel" ao wake-word regex |
| `src/App.tsx` | Redirect `/dashboard/central-ajuda` → instrucoes |

## Resultado esperado
- Todos os 97+ comandos de voz documentados na Central de Ajuda funcionam via Orion
- Wake-word "Orion" E "Painel" ativos
- Navegação por voz para todas as novas rotas `/solucoes/*`
- Central de Ajuda acessível por menu lateral, por voz ("Orion, ajuda/guia completo/central de ajuda") e por rota direta
- Zero 404s em links internos

