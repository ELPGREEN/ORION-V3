---
name: Vision Semantic Cortex
description: Human-like scene comprehension — spatial relationships, action/intent inference, attention priority, affordances, narrative generation
type: feature
---
## File: src/lib/neural/vision-semantic-cortex.ts
Inspired by AnyTouch (ICLR 2025) unified representations + human visual cortex hierarchy.

## 5 Layers:
1. **Spatial Relationship Graph** — "X está em cima de Y", "A está perto de B" using bounding boxes + depth
2. **Action/Intent Inference** — from pose + hand + object proximity + gaze + emotion → "pessoa segurando celular (comunicação)"
3. **Attention Priority** — faces > emotions > actions > uncertain objects (mimics human visual attention)
4. **Object Affordances** — "cadeira: [sentar, apoiar]", "garrafa: [beber, armazenar]"
5. **Scene Narrative** — coherent natural language: "Vejo 1 pessoa em escritório, trabalhando no computador, atmosfera calma"

## Integration
- `analyzeSceneSemantics(result)` → SemanticScene
- `formatSemanticForAI(scene)` → string injected into AI prompt via formatDetectionsForAI()
- Runs 100% client-side, zero API calls, pure spatial/geometric reasoning
