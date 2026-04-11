

# Plano: Rede Neural ao Vivo — Visualização Realista Full HD

## O que o usuário quer
Substituir as "bolinhas coloridas" atuais por uma visualização realista de rede neural 3D — como imagens científicas reais de conexões neurais, com dendritos, axônios brilhantes, e sinapses pulsantes. Estilo microscopia neural, não diagrama esquemático.

## Problemas do código atual
- Nós são **esferas sólidas coloridas** com anéis — parecem um diagrama, não neurônios
- Conexões são **linhas finas de Bezier** com opacidade baixa — não parecem axônios
- Partículas são pontos aleatórios — não simulam atividade sináptica real
- SignalPulses usa esferas pequenas — deveria ser impulsos elétricos brilhantes correndo pelos axônios

## O que vai mudar

### 1. Neurônios realistas (substituir GlobeNodes)
- **Corpo celular**: esfera com superfície orgânica irregular (geometria perturbada com ruído), cor translúcida azul/branca
- **Dendritos**: 3-6 linhas ramificadas curtas saindo de cada nó (geradas proceduralmente), finas e orgânicas
- **Material**: `MeshPhysicalMaterial` com subsurface scattering simulado (transmission + thickness), aspecto bio-luminescente

### 2. Axônios realistas (substituir ConnectionCurves)
- **Tubos 3D** ao invés de linhas — `TubeGeometry` seguindo curvas de Catmull-Rom com raio variável (mais grosso perto do nó, afina no meio)
- **Material emissivo** com bloom natural — cor base escura, emissão azul/ciano intensa
- **Bainha de mielina**: segmentos de opacidade alternada ao longo do tubo (simulando nós de Ranvier)

### 3. Impulsos sinápticos (substituir SignalPulses)
- **Faíscas elétricas** brilhantes que correm ao longo dos tubos de axônio
- Cada impulso é um ponto de luz intensa (additive blending) com trail/rastro
- Velocidade variável — simula potencial de ação real

### 4. Ambiente neural
- Manter fundo escuro (#010810)
- Adicionar **névoa volumétrica** sutil (fogExp2 já existe, ajustar)
- Partículas de fundo: simular **fluido cerebrospinal** — partículas muito pequenas, lentas, semi-transparentes, cor neutra
- Bloom via post-processing (`EffectComposer` + `UnrealBloomPass` do three/examples)

### 5. Performance
- `InstancedMesh` para corpos celulares (1 draw call para ~62 neurônios)
- `TubeGeometry` compartilhada com segments reduzidos (8 radial, 32 tubular)
- Bloom com resolução 0.5x para não impactar FPS
- Manter controles existentes (pause, labels, expand, reset)

## Arquivos a modificar

| Arquivo | Ação |
|---|---|
| `src/components/dashboard/neural/NeuralNetworkLiveView.tsx` | Reescrever componentes visuais: NeuronBody, AxonTube, SynapticSpark, substituir GlobeNodes/ConnectionCurves/SignalPulses/SynapticParticles |

## O que NÃO muda
- Arquitetura de nós (`NEURAL_NODES`) e conexões (`CONNECTIONS`) — mesmos dados
- HUD de métricas (`MetricsOverlay`) — mantém
- Legenda de categorias — mantém
- Controles (pause, expand, labels, reset) — mantém
- Posicionamento Fibonacci sphere — mantém

## Dependência
- `@react-three/postprocessing` para bloom (EffectComposer + Bloom) — precisa instalar se não existir

## Resultado esperado
Uma visualização que parece microscopia real de tecido neural — neurônios translúcidos com dendritos ramificados, axônios tubulares brilhantes, e impulsos elétricos correndo entre eles, tudo em fundo escuro com bloom cinematográfico.

