

# Auditoria Completa — Rede Neural ao Vivo

## Problemas Identificados

### 1. Visual: "Bolinhas coloridas" em vez de neurônios reais
- **NeuronBodies** (L146-275): Usa `SphereGeometry(s, 32, 32)` — esferas lisas com MeshPhysicalMaterial. Parece bola de vidro, não neurônio.
- **AxonTubes** (L278-331): Tubos de 0.025 de raio com `MeshBasicMaterial` — parecem fios de LED, não axônios biológicos.
- **SynapticImpulses** (L335-407): Esferas de 6 segmentos viajando pelas curvas — parecem partículas de videogame.
- **BrainCore** (L467-497): Icosaedro wireframe — parece objeto geométrico, não córtex.

### 2. Performance: Lento para responder
- **4000 CSF particles** atualizadas CADA FRAME com loop `for` (L443-447) — ineficiente, deveria usar shader.
- **150 impulsos** com meshes individuais (150 draw calls) — deveria ser InstancedMesh.
- **~120 conexões** como meshes TubeGeometry separadas (~120 draw calls) — deveria ser merge ou instanced.
- **~60 nós** com 3 meshes cada (corpo + núcleo + halo = 180 draw calls) — deveria ser InstancedMesh.
- **Total: ~450+ draw calls** por frame — extremamente pesado para WebGL.
- **Canvas label textures**: 60 canvas 512x144 criados no mount — 60 texturas GPU desnecessárias.

### 3. Métricas falsas
- **MetricsOverlay** (L570-627): Gera valores aleatórios a cada 2.5s (`Math.random()`). Não conectado a dados reais.
- QPS, latência, experts ativos — tudo inventado.

## Plano de Correção (3 passos)

### Passo 1: Neurônios realistas com morfologia orgânica
**Arquivo:** `NeuralNetworkLiveView.tsx`

Substituir esferas por neurônios com corpo celular irregular + dendritos curtos orgânicos:
- **Corpo celular**: `IcosahedronGeometry` com displacement map procedural (noise) para superfície irregular, como membrana celular real
- **Material**: `MeshPhysicalMaterial` com `transmission: 0.4`, `thickness: 2`, `roughness: 0.6`, `sheen: 1.0` — aspecto translúcido biológico, não vítreo
- **Sem dendrites longas** (como pedido) — apenas irregularidade na superfície do soma
- **InstancedMesh** para todos os 60 nós — 1 draw call em vez de 180

### Passo 2: Axônios e sinapses realistas + performance
- **Axônios**: Manter TubeGeometry mas com raio variável (mais grosso perto do soma, mais fino longe) e material com `emissive` pulsante — simula mielina bioluminescente
- **Merge geometries**: Unir todas as TubeGeometry numa única `BufferGeometry` — 1 draw call em vez de 120
- **Impulsos**: Substituir 150 meshes por 1 `InstancedMesh` com `SphereGeometry` compartilhada — 1 draw call em vez de 150
- **CSF Particles**: Mover animação para vertex shader custom com `ShaderMaterial` — zero CPU por frame

### Passo 3: Labels e métricas otimizados
- **Labels**: Substituir 60 canvas textures por HTML overlay com `Html` do drei (só renderiza quando visível) ou reduzir para 1 atlas texture
- **Métricas**: Conectar ao `getPipelineLatency()` real e ao defense system real em vez de `Math.random()`

## Resultado esperado

```text
ANTES (450+ draw calls):
┌─ 60 × SphereGeo (corpo)
├─ 60 × SphereGeo (núcleo)  
├─ 60 × SphereGeo (halo)
├─ 120 × TubeGeo (axônios)
├─ 150 × SphereGeo (impulsos)
└─ 4000 pts (CSF, CPU-animated)

DEPOIS (~8 draw calls):
┌─ 1 × InstancedMesh (corpos, displacement noise)
├─ 1 × InstancedMesh (núcleos glow)
├─ 1 × MergedGeo (axônios, raio variável)
├─ 1 × InstancedMesh (impulsos)
├─ 1 × Points (CSF, GPU-animated shader)
├─ 1 × BrainCore
└─ 1 × Bloom pass
```

Performance: ~60x menos draw calls. Visual: membrana celular orgânica translúcida com axônios mielinizados pulsantes em fundo escuro com bloom — estilo microscopia fluorescente real.

## Arquivos alterados
| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/neural/NeuralNetworkLiveView.tsx` | Reescrita completa dos componentes 3D |

