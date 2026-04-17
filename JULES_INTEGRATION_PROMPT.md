# Orion V3 - Jules Integration Prompt

## Tarefa: Criar e Integrar Módulos ARC-AGI-2 Avançados

Execute as seguintes tarefas sequencialmente:

### 1. Criar Decision Core (LLM + Planner + MCTS)
**Arquivo:** `src/lib/neural/arc-decision-core.ts`

O Decision Core deve incluir:
- **LLM Integration**: Integração com provedores LLM (OpenAI, Claude, Gemini) para raciocínio estratégico
- **MCTS Planner**: Implementação de Monte Carlo Tree Search para planejamento de longo prazo
- **Task Planner**: Decomposição de objetivos complexos em sub-tarefas executáveis
- **Decision Policy**: Política de decisão baseada em reinforcement learning (PPO-style)
- **Context Manager**: Gerenciamento de contexto e memória de decisões

Exportar classe: `ArcDecisionCore`

### 2. Criar Robotics Perception Layer
**Arquivo:** `src/lib/neural/arc-robotics-perception.ts`

O Robotics Perception Layer deve incluir:
- **YOLO Integration**: Detecção de objetos em tempo real via YOLO (suportando yolov8, yolov9)
- **SLAM Manager**: Mapeamento e localização simultânea (SLAM)
- **Sensor Fusion**: Fusão de dados de LIDAR, radar, câmera e sensores infravermelhos
- **Object Tracker**: Rastreamento de objetos detectados
- **3D Mapping**: Geração de mapas 3D do ambiente
- **ROS2 Bridge**: Ponte de comunicação com ROS2

Exportar classe: `ArcRoboticsPerception`

### 3. Criar Swarm Coordination
**Arquivo:** `src/lib/neural/arc-swarm-coordination.ts`

O Swarm Coordination deve incluir:
- **Multi-Agent RL**: Coordenação de múltiplos agentes via RL
- **gRPC Communication**: Comunicação inter-unidades via gRPC
- **Consensus Protocol**: Implementação de protocolo de consenso (Raft-style)
- **Swarm Manager**: Gerenciamento de enxame de unidades
- **Task Distribution**: Distribuição de tarefas entre agentes
- **Formation Control**: Controle de formação de grupo

Exportar classe: `ArcSwarmCoordination`

### 4. Criar Financial Trading Agent
**Arquivo:** `src/lib/neural/arc-financial-trading.ts`

O Financial Trading Agent deve incluir:
- **Market Data Consumer**: Consumo de dados de mercado via Kafka/WebSocket
- **Price Predictor**: Predição de preços usando modelos temporais
- **Sentiment Analyzer**: Análise de sentimento de notícias/finanças
- **PPO Trading Agent**: Agente de trading com PPO (Proximal Policy Optimization)
- **Risk Engine**: Engine de risco com VaR, drawdown limits, circuit breakers
- **Order Executor**: Execução de ordens com smart routing
- **Portfolio Manager**: Gestão de portfólio e posições

Exportar classe: `ArcFinancialTrading`

### 5. Integrar ao Neural Index
**Arquivo:** `src/lib/neural/index.ts`

Adicionar exports:
```typescript
export { ArcDecisionCore } from './arc-decision-core';
export { ArcRoboticsPerception } from './arc-robotics-perception';
export { ArcSwarmCoordination } from './arc-swarm-coordination';
export { ArcFinancialTrading } from './arc-financial-trading';
```

### 6. Verificar Integração

Após criar todos os módulos:

1. Verificar que todos os arquivos existem:
   - `src/lib/neural/arc-decision-core.ts`
   - `src/lib/neural/arc-robotics-perception.ts`
   - `src/lib/neural/arc-swarm-coordination.ts`
   - `src/lib/neural/arc-financial-trading.ts`

2. Verificar que o index.ts exporta todos os módulos

3. Verificar imports e dependências

4. Executar build do projeto para verificar erros de TypeScript

5. Listar todos os arquivos criados

## Notas Importantes

- Usar TypeScript com tipos rigorosos
- Seguir convenções existentes do projeto Orion V3
- Implementar interfaces consistentes com o resto do codebase
- Incluir documentação JSDoc para todas as classes e métodos públicos
- Adicionar logs de inicialização e eventos importantes
- Usar o padrão de logging existente: `src/lib/core/log-manager.ts`

## Critérios de Sucesso

- [ ] Todos os 4 arquivos criados
- [ ] Index.ts atualizado com exports
- [ ] Build passa sem erros
- [ ] TypeScript compilation bem-sucedida
- [ ] Módulos seguem padrões do projeto
