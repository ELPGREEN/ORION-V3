

# Varredura de Estilo — Three.js, WebGL e Consistência Tron

## Diagnóstico

Há uma **incoerência fundamental** entre o design system CSS e os componentes WebGL/Three.js:

```text
Design System (index.css):
  --cyan: 210 70% 50%  →  #2563EB (azul metálico)
  --gold: 30 85% 52%   →  #D4AF37 (dourado)

WebGL/Three.js (hardcoded):
  #00D4FF              →  cyan puro (ERRADO)
  vec3(0.0, 0.831, 1.0) → cyan neon (ERRADO)
  vec3(0.0, 0.55, 0.75) → teal (inconsistente)
```

O `#00D4FF` é cyan neon genérico — não é Orion. O estilo Tron do Orion usa **dourado dominante + azul metálico como acento sutil**.

## Arquivos com problemas

| Arquivo | Problema |
|---|---|
| `OrionBackground3D.tsx` | `#00D4FF` como cor default de partículas + grid |
| `HeroThreeBackground.tsx` | Shader CYAN muito presente (scan line, streams) |
| `PlasmaCore.tsx` | `CYAN vec3(0.0, 0.831, 1.0)` — neon puro |
| `GatewayBackground.tsx` | `CYAN vec3(0.0, 0.6, 0.8)` — inconsistente |
| `Loja.tsx` | 4x `#00D4FF` hardcoded |
| `InvestorTools.tsx` | 8x `#00d4ff` hardcoded |
| `QuantumRuntimeDashboard.tsx` | `ACCENT = "#00D4FF"` |

## Correções

### 1. OrionBackground3D.tsx
- Mudar default de `#00D4FF` → `#D4AF37` (gold)
- Grid secondary de `#00D4FF08` → `#3B82F610` (azul metálico sutil)
- Scanline overlay de `rgba(0,212,255,...)` → `rgba(212,175,55,...)`

### 2. HeroThreeBackground.tsx (shader)
- `CYAN vec3(0.0, 0.55, 0.75)` → `vec3(0.231, 0.510, 0.918)` (azul metálico #3B82EB)
- Reduzir peso do CYAN nos energy streams (0.4 → 0.2)
- Scan line de CYAN puro → mix GOLD 70% + CYAN 30%

### 3. PlasmaCore.tsx (shader)
- `CYAN vec3(0.0, 0.831, 1.0)` → `vec3(0.231, 0.510, 0.918)` (azul metálico)

### 4. GatewayBackground.tsx (shader)
- `CYAN vec3(0.0, 0.6, 0.8)` → `vec3(0.231, 0.510, 0.918)` (azul metálico)

### 5. Loja.tsx
- Substituir 4x `#00D4FF` → `hsl(var(--secondary))` ou `#3B82F6`

### 6. InvestorTools.tsx
- Substituir 8x `#00d4ff` → `hsl(var(--secondary))` ou `#3B82F6`

### 7. QuantumRuntimeDashboard.tsx
- `ACCENT = "#00D4FF"` → `"#3B82F6"`

## Resultado
- Cor única de "azul" em todo o sistema: `#3B82F6` (azul metálico) como acento secundário
- Dourado `#D4AF37` como cor dominante nos efeitos WebGL
- Zero `#00D4FF` no codebase (exceto Remotion videos que são isolados)
- Estética Tron coerente: dark + gold dominant + metallic blue accent

