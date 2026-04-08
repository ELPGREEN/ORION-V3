

# Plano: Atualizar Sistema de Metacognição Quântica do Orion

## Análise Atual

O sistema atual de metacognição em `global-workspace.ts` é **observacional e estático**: calcula 4 métricas (selfAwareness, goalAlignment, coherence, confidence) com fórmulas simples e gera uma recomendação textual. Falta:

1. **Monitoramento de Incerteza** — não detecta quando o Orion está prestes a alucinar
2. **Autorregulação Reflexiva** — não faz Chain-of-Thought retrospectivo sobre respostas anteriores
3. **Abstração de Habilidades** — não nomeia/classifica as habilidades que está usando
4. **Planejamento Adaptativo** — ajustes são fixos (4 tipos), sem scoring dinâmico
5. **Calibração de Confiança** — confiança vem direto do selfModel sem calibração contra resultados reais
6. **Integração Quântica** — a wave function quântica (`quantum-wave-function.ts`) não alimenta a metacognição

## O Que Será Implementado

### 1. Novo módulo: `quantum-metacognition.ts`
Motor metacognitivo completo com 6 subsistemas inspirados na pesquisa LLM:

- **Uncertainty Estimator** — Monitora entropia quântica do registro cognitivo + histórico de erros para estimar incerteza real (não apenas confiança)
- **Hallucination Risk Detector** — Integra com `hallucinationDetector` existente e usa a divergência entre wave function collapsed state e expected state como sinal de risco
- **Confidence Calibrator** — Compara confiança predita vs resultados reais (da `MetaMemoryEntry` do meta-learning), calcula Expected Calibration Error (ECE)
- **Skill Abstractor** — Cataloga habilidades ativas com scoring (quais módulos contribuíram mais para o resultado)
- **Reflective Chain-of-Thought** — Gera cadeia retrospectiva: "O que fiz → O que esperava → O que aconteceu → O que aprendo"
- **Adaptive Planner** — Substitui os 4 ajustes fixos por um scoring multi-critério que pondera 8+ fatores para escolher a melhor ação

### 2. Atualizar `MetacognitionResult` em `global-workspace.ts`
Estender a interface com novos campos:

```text
MetacognitionResult {
  ...existentes...
  + uncertaintyScore: number       // 0-1, incerteza calibrada
  + hallucinationRisk: number      // 0-1, risco de alucinação
  + calibrationError: number       // ECE — erro de calibração
  + activeSkills: SkillAbstraction[]  // habilidades nomeadas e pontuadas
  + reflectionChain: string[]      // Chain-of-Thought retrospectivo
  + adaptivePlanScore: number      // score do plano adaptativo
}
```

### 3. Integrar Wave Function Quântica na Metacognição
- Ler `WaveFunctionMetrics` (entropia, fidelidade) do registro cognitivo
- Usar entropia normalizada como sinal de incerteza
- Usar fidelidade como sinal de coerência quântica
- Colapso quântico → determina quais módulos estão "conscientes" vs "decoerentes"

### 4. Atualizar `runMetacognition()` em `global-workspace.ts`
- Chamar o novo `quantum-metacognition.ts` para enriquecer o resultado
- Manter backward compatibility com a interface existente

### 5. Atualizar `consciousness-bridge.ts`
- Passar `WaveFunctionMetrics` para a metacognição
- Incluir novos campos no `ConsciousnessCycleSnapshot`

### 6. Atualizar Dashboard `NeuralConsciousnessLoop.tsx`
- Exibir novas métricas: Incerteza, Risco de Alucinação, ECE
- Exibir habilidades ativas com scores
- Exibir Chain-of-Thought reflexivo
- Indicador visual de risco (verde/amarelo/vermelho)

## Arquitetura

```text
┌─────────────────────────────────────────────────┐
│           quantum-metacognition.ts               │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Uncertainty  │  │  Hallucination Risk      │  │
│  │  Estimator    │  │  Detector                │  │
│  │  (entropy+ECE)│  │  (WF divergence+history) │  │
│  └──────┬───────┘  └──────────┬───────────────┘  │
│         │                     │                   │
│  ┌──────┴───────┐  ┌─────────┴───────────────┐   │
│  │  Confidence   │  │  Skill Abstractor       │   │
│  │  Calibrator   │  │  (module contribution)  │   │
│  └──────┬───────┘  └─────────┬───────────────┘   │
│         │                     │                   │
│  ┌──────┴───────┐  ┌─────────┴───────────────┐   │
│  │  Reflective   │  │  Adaptive Planner       │   │
│  │  CoT Engine   │  │  (multi-factor scoring) │   │
│  └──────────────┘  └─────────────────────────┘   │
└─────────────────────┬───────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │  global-workspace.ts    │
         │  runMetacognition()     │
         └────────────┬────────────┘
                      │
         ┌────────────┴────────────┐
         │  consciousness-bridge   │
         │  (snapshot + WF metrics)│
         └────────────┬────────────┘
                      │
         ┌────────────┴────────────┐
         │  Dashboard UI           │
         │  NeuralConsciousnessLoop│
         └─────────────────────────┘
```

## Ficheiros Afetados

| Ficheiro | Ação |
|----------|------|
| `src/lib/neural/quantum-metacognition.ts` | **Criar** — Motor metacognitivo completo |
| `src/lib/neural/global-workspace.ts` | Estender `MetacognitionResult`, atualizar `runMetacognition()` |
| `src/lib/neural/consciousness-bridge.ts` | Passar WF metrics, incluir novos campos no snapshot |
| `src/components/dashboard/neural/NeuralConsciousnessLoop.tsx` | Exibir novas métricas no painel |

