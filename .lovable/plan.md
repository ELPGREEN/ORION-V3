

# Auditoria Tensorial Completa — Perspectiva de Data Scientist

## Diagnóstico: O que existe vs. o que falta

O sistema tem duas camadas:
- **Tensor Engine** (`tensor-state-vector.ts`, `tensor-vqc.ts`): Correto, com Kronecker, partial trace, Von Neumann entropy, gates tensoriais no vetor 2^n.
- **Módulos consumidores** (5 arquivos): Ainda operam no modelo **separável** (array de QubitState individuais), ignorando completamente o tensor engine.

```text
┌─────────────────────────┐    ┌──────────────────────┐
│  TENSOR ENGINE (correto)│    │  SEPARABLE (legado)  │
│  tensor-state-vector.ts │    │                      │
│  tensor-vqc.ts          │◄───│  quantum-entangle... │ (usa parcialmente)
│                         │    │  quantum-wave-func.. │ (usa parcialmente)
│  Kronecker ⊗            │    │                      │
│  2^n StateVector        │    │  quantum-embedding.. │ ✗ ignora tensor
│  Partial Trace          │    │  quantum-vision-e... │ ✗ ignora tensor
│  CNOT/CZ amplitude      │    │  quantum-planner.ts  │ ✗ ignora tensor
│  Von Neumann S(ρ)       │    │  quantum-llm-router  │ ✗ ignora tensor
│  Density Matrix ρ       │    │  qhrl-integration    │ ✗ ignora tensor
│                         │    │  quantum-decohere... │ ✗ per-qubit only
│                         │    │  qiskit-runtime      │ ✗ per-qubit only
└─────────────────────────┘    └──────────────────────┘
```

---

## Problemas Identificados (por severidade)

### T1 — `quantum-embedding-kernel.ts`: Entangling layer falso (CRÍTICO)
- Linhas 78-85: "Entangling" via `measureProbability(q[i]) * measureProbability(q[i+1])` seguido de `rotationZ` local.
- Isso **não cria entanglement**. É uma rotação clássica condicionada à probabilidade — não existe correlação quântica.
- **Correção**: Usar `tensorZZFeatureMap` ou `applyCNOT` do tensor engine para encoding real.

### T2 — `quantum-vision-enhancer.ts`: Blending de estados sem normalização (CRÍTICO)
- Linhas 97-100: `old[0][0] * 0.7 + newState[0][0] * 0.3` — soma ponderada de amplitudes sem normalizar.
- Viola |α|² + |β|² = 1. O estado resultante não é um qubit válido.
- **Correção**: Usar `normalize()` após blending, ou operar via tensor state com canal de decoerência para decaimento temporal.

### T3 — `quantum-decoherence.ts`: Opera exclusivamente per-qubit (MODERADO)
- `applyNoise`, `depolarize`, `amplitudeDamping` recebem `QubitState[]` — não atuam no espaço tensorial.
- Em estados emaranhados, ruído depolarizante deve operar no vetor 2^n via canal de Kraus: ρ' = Σ E_k ρ E_k†
- **Correção**: Adicionar `applyNoiseTensor(sv, n, model, strength)` com operadores de Kraus tensoriais.

### T4 — `quantum-wave-function.ts`: `createWaveFunction` ignora tensor state (MODERADO)
- Linhas 112-116: Inicializa `reg.qubits[i]` individualmente mas nunca atualiza `reg.tensorState`.
- Resultado: `entropy()` usa o tensor state (que ficou em |0...0⟩), retornando sempre 0.
- **Correção**: Construir tensor state via `tensorFromProbabilities(probs)` na criação.

### T5 — `quantum-wave-function.ts`: `evolve()`, `superpose()`, `decohere()` não atualizam tensor state (MODERADO)
- Todas operam apenas em `reg.qubits[]`. O `tensorState` fica dessincronizado.
- **Correção**: Cada operação deve aplicar o gate correspondente tanto no separável quanto no tensor state.

### T6 — `quantum-wave-function.ts`: `blend()` não é operação unitária (MENOR)
- Interpolação linear de amplitudes não corresponde a nenhuma operação quântica válida.
- **Correção**: Documentar como "aproximação clássica" ou substituir por swap parcial via tensor.

### T7 — `tensor-state-vector.ts`: `hermitianEigenvalues` usa diagonal para dim > 2 (MENOR)
- Linhas 648-661: Para matrizes > 2×2, retorna apenas os elementos diagonais normalizados.
- Isso falha para matrizes com off-diagonal significativos (estados altamente emaranhados).
- **Correção**: Implementar Jacobi eigenvalue rotation para matrizes Hermitianas ≤ 64×64 (6 qubits).

### T8 — `entanglementEntropy`: Index tracking incorreto em trace parcial (MENOR)
- Linha 576-578: `adjustedIdx` não ajusta corretamente após remoções sequenciais.
- **Correção**: Recalcular índice relativo a cada iteração.

### T9 — `qiskit-runtime.ts` (1624 linhas): VQC forward usa separável (MENOR)
- Chama `vqcForward` (separável) em vez de `tensorVQCForward`.
- **Correção**: Usar tensor mode quando nQubits ≤ 12.

---

## Plano de Implementação

### Fase 1: Sincronizar tensor state em quantum-wave-function.ts

1. **`createWaveFunction`**: Construir `tensorState` via `tensorFromProbabilities(probs)`.
2. **`evolve`**: Aplicar `applySingleGate(RY2(angle), i, n, tensorState)` para cada qubit.
3. **`superpose`**: Aplicar `applySingleGate(H2, i, n, tensorState)`.
4. **`decohere`/`decoherePhysical`**: Aplicar decoerência tensorial (ver Fase 2).
5. **`collapsePartial`**: Usar `measureQubit(target, n, tensorState)` do tensor engine.
6. **`blend`**: Documentar como aproximação clássica; não tem equivalente unitário.

### Fase 2: Decoerência tensorial em quantum-decoherence.ts

7. Adicionar `depolarizeTensor(sv, target, n, p)`: aplica canal depolarizante ao qubit `target` no vetor 2^n.
8. Adicionar `amplitudeDampingTensor(sv, target, n, gamma)`: canal de Kraus para decaimento T1 tensorial.
9. Adicionar `applyNoiseTensor(sv, n, model, strength)`: wrapper batch.

### Fase 3: Migrar módulos consumidores para tensor

10. **`quantum-embedding-kernel.ts`**: Substituir array de QubitState por `tensorZZFeatureMap` para encoding. Fidelidade via `stateFidelity` no vetor completo.
11. **`quantum-vision-enhancer.ts`**: Normalizar blending temporal. Usar `normalize()` após interpolação.
12. **`quantum-planner.ts`**: Manter separável (não usa entanglement, funciona corretamente per-qubit).
13. **`qhrl-integration.ts`**: Opção para `tensorVQCForward` quando nQubits ≤ 12.
14. **`qiskit-runtime.ts`**: Usar `tensorVQCForward` no pipeline de execução.

### Fase 4: Corrigir tensor-state-vector.ts

15. **`hermitianEigenvalues`**: Implementar Jacobi rotation para dim ≤ 64 (6 qubits).
16. **`entanglementEntropy`**: Corrigir tracking de índice no partial trace sequencial.

---

## Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `src/lib/neural/quantum-wave-function.ts` | Sincronizar tensorState em create/evolve/superpose/collapse |
| `src/lib/neural/quantum-decoherence.ts` | Adicionar canais de Kraus tensoriais |
| `src/lib/neural/quantum-embedding-kernel.ts` | Migrar para tensor feature map + stateFidelity |
| `src/lib/neural/quantum-vision-enhancer.ts` | Normalizar blending, usar tensor onde aplicável |
| `src/lib/neural/tensor-state-vector.ts` | Jacobi eigenvalues, fix entanglementEntropy index |
| `src/lib/neural/qhrl-integration.ts` | Opção tensorVQCForward |
| `src/lib/neural/qiskit-runtime.ts` | Usar tensor mode para nQubits ≤ 12 |

### Impacto Esperado

| Métrica | Antes | Depois |
|---|---|---|
| Módulos usando tensor real | 2/9 (parcial) | 9/9 |
| Entanglement no embedding kernel | Falso (clássico) | CNOT real via tensor |
| Entropy accuracy (WaveFunction) | Sempre 0 (bug) | Correto via ρ |
| Eigenvalue accuracy (dim > 2) | Diagonal approx | Jacobi rotation |
| Decoerência em estados emaranhados | Per-qubit (incorreto) | Kraus no espaço 2^n |

