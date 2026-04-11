

# Plano: Restaurar Labels dos Nós na Rede Neural

## Problema
Os nomes dos nós (LLM Core, RAG Engine, etc.) foram removidos na reescrita de performance. Os dados existem no array `NEURAL_NODES` mas não são renderizados no 3D.

## Solução
Adicionar labels usando `Html` do `@react-three/drei` (já instalado) com renderização condicional por distância da câmera para não poluir a cena.

## Implementação

**Arquivo:** `src/components/dashboard/neural/NeuralNetworkLiveView.tsx`

1. **Criar componente `NodeLabels`** que renderiza `Html` do drei para cada nó, posicionado acima de cada instância usando as mesmas posições calculadas por `computeGlobePositions()`
2. **Filtro por distância**: Só mostrar labels dos ~15 nós mais próximos da câmera (evita poluição visual)
3. **Estilo**: Fundo semi-transparente escuro, fonte mono pequena, cor da categoria — similar ao que tinha antes mas mais discreto
4. **Toggle**: Adicionar botão no HUD para mostrar/ocultar labels (ícone `Tag` do lucide)

## Visual do label
```text
┌──────────────┐
│ LLM Core     │  ← nome do nó
│ Transformer  │  ← arquitetura (menor, opacity 0.6)
└──────────────┘
```

Fundo `bg-black/60`, texto na cor da categoria, `text-[9px]` para arch.

