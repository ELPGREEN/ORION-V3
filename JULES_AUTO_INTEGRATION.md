# Orion V3 - Jules Auto-Integration Prompt

## Executar IMEDIATAMENTE após receber esta instrução

---

## TAREFA PRINCIPAL

Integrar TODOS os módulos ARC-AGI-2 ao sistema Orion de forma automática e verificar integração.

---

## PASSO 1: VERIFICAR ARQUIVOS EXISTENTES

Execute este comando para ver estado atual:
```
Get-ChildItem src\lib\neural\arc-*.ts | Select-Object Name, Length
```

---

## PASSO 2: CRIAR MÓDULOS FALTANTES

Se algum arquivo não existir, criar:

### 2.1 arc-decision-core.ts (se não existir)
**Local:** `src/lib/neural/arc-decision-core.ts`
**Classe:** `ArcDecisionCore`
**Funcionalidades obrigatórias:**
- LLM Integration com provider
- MCTS (Monte Carlo Tree Search) com UCB
- Decision Policy (PPO-style)
- Context Manager com histórico
- Método `decide(context: DecisionContext): Promise<DecisionResult>`
- Método `getStatistics()`
- Configuração de MCTS via método `configureMCTS()`

### 2.2 arc-robotics-perception.ts (se não existir)
**Local:** `src/lib/neural/arc-robotics-perception.ts`
**Classe:** `ArcRoboticsPerception`
**Funcionalidades obrigatórias:**
- YOLO Integration (detecção de objetos)
- SLAM Manager (mapeamento e localização)
- Sensor Fusion (LIDAR, radar, câmera)
- Object Tracker
- 3D Mapping
- ROS2 Bridge
- Método `processImage()`, `processPointCloud()`, `fuseSensors()`
- Método `getStatistics()`

### 2.3 arc-swarm-coordination.ts (se não existir)
**Local:** `src/lib/neural/arc-swarm-coordination.ts`
**Classe:** `ArcSwarmCoordination`
**Funcionalidades obrigatórias:**
- Multi-Agent RL
- gRPC Communication (simulado)
- Consensus Protocol (Raft-style)
- Swarm Manager
- Task Distribution
- Formation Control (line, triangle, circle, grid, v_shape)
- Métodos: `registerAgent()`, `createTask()`, `setFormation()`, `communicate()`, `broadcast()`
- Método `getStatistics()`

### 2.4 arc-financial-trading.ts (se não existir)
**Local:** `src/lib/neural/arc-financial-trading.ts`
**Classe:** `ArcFinancialTrading`
**Funcionalidades obrigatórias:**
- Market Data Consumer
- Price Predictor (modelos temporais)
- Sentiment Analyzer
- PPO Trading Agent
- Risk Engine (VaR, drawdown, circuit breakers)
- Order Executor
- Portfolio Manager
- Métodos: `processTick()`, `getRiskMetrics()`, `getPortfolio()`, `haltTrading()`, `resumeTrading()`
- Método `getStatistics()`

### 2.5 arc-system-integrator.ts (se não existir)
**Local:** `src/lib/neural/arc-system-integrator.ts`
**Classe:** `ArcSystemIntegrator`
**Instância:** `arcSystemIntegrator`
**Funcionalidades obrigatórias:**
- Unificar DecisionCore, RoboticsPerception, SwarmCoordination, FinancialTrading
- Integrar com IoT Bridge existente (`iot-device-bridge.ts`)
- Integrar com Smart Home Controller (`smart-home-controller.ts`)
- Integrar com ROS2 Bridge (`ros2-protocol-bridge.ts`)
- Métodos: `initialize()`, `controlSmartDevice()`, `coordinateRoboticsTask()`, `processTradingTick()`
- Método `getIntegratedStatus()`
- Método `decision(query)` - interface unificada

---

## PASSO 3: INTEGRAR AO INDEX.TS

Adicionar estes exports AO FINAL do arquivo `src/lib/neural/index.ts` (antes da última linha ou após a seção de Serverless):

```typescript
// ═══ ARC-AGI-2 Decision Core (LLM + Planner + MCTS) ═══
export {
  ArcDecisionCore,
  type DecisionContext,
  type DecisionResult,
  type MCTSNode,
} from "./arc-decision-core";

// ═══ ARC-AGI-2 Robotics Perception (YOLO + SLAM + Sensor Fusion) ═══
export {
  ArcRoboticsPerception,
  type DetectedObject,
  type PointCloud,
  type RobotPose,
  type SensorReading,
  type FusionResult,
} from "./arc-robotics-perception";

// ═══ ARC-AGI-2 Swarm Coordination (Multi-Agent RL + gRPC + Consensus) ═══
export {
  ArcSwarmCoordination,
  type Agent,
  type SwarmTask,
  type ConsensusMessage,
  type FormationConfig,
} from "./arc-swarm-coordination";

// ═══ ARC-AGI-2 Financial Trading (PPO + Sentiment + Risk Engine) ═══
export {
  ArcFinancialTrading,
  type MarketTick,
  type Position,
  type Order,
  type NewsEvent,
  type TradingSignal,
  type RiskMetrics,
} from "./arc-financial-trading";

// ═══ ARC-AGI-2 System Integrator (Unified Control) ═══
export {
  ArcSystemIntegrator,
  arcSystemIntegrator,
  type IntegratedAgent,
  type SystemIntegrationStatus,
} from "./arc-system-integrator";
```

---

## PASSO 4: VERIFICAR IMPORTS

Cada módulo deve importar de:
- `../core/log-manager` → `LogManager`, `Logger`
- Tipos de outros módulos ARC quando necessário

**NÃO usar imports de caminhos relativos incorretos.**

---

## PASSO 5: VERIFICAR TYPESCRIPT

Executar verificação de tipos:
```
npx tsc --noEmit src/lib/neural/arc-*.ts 2>&1 | Select-Object -First 50
```

---

## PASSO 6: REPORTAR RESULTADO

Ao finalizar, reportar:

1. **Arquivos criados/atualizados:**
   - Lista de arquivos modificados

2. **Arquivos verificados:**
   - Lista de módulos ARC-AGI-2 presentes

3. **Status da integração:**
   - ✅/❌ Decision Core
   - ✅/❌ Robotics Perception
   - ✅/❌ Swarm Coordination
   - ✅/❌ Financial Trading
   - ✅/❌ System Integrator
   - ✅/❌ Index exports

4. **Erros encontrados (se houver):**
   - Lista de erros de TypeScript

5. **Tamanho total dos módulos:**
   - Soma em KB

---

## CRITÉRIOS DE SUCESSO

- [ ] Todos os 5 arquivos ARC-AGI-2 existem
- [ ] Index.ts exporta todos os módulos
- [ ] Nenhum erro de TypeScript crítico
- [ ] Módulos seguem convenções do projeto
- [ ] Imports são válidos

---

## INSTRUÇÕES IMPORTANTES

1. **NÃO perguntar confirmações** - executar automaticamente
2. **Se arquivo existir, NÃO recriar** - apenas verificar/corrigir
3. **Usar LoggingManager** para todos os logs
4. **Usar tipos TypeScript** estritamente
5. **Adicionar JSDoc** para todas as classes e métodos públicos
6. **Seguir padrão existente** - comparar com módulos similares

---

## EXECUÇÃO

Após receber esta prompt, iniciar IMEDIATAMENTE:

1. Verificar arquivos existentes
2. Criar faltantes se necessário
3. Integrar ao index.ts
4. Verificar Typescript
5. Reportar resultado

**NÃO ESPERAR CONFIRMAÇÃO - EXECUTAR.**
