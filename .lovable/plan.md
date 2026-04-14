

# Jules Auto-Construção e Evolução Completa do Orion

## Resumo
Expandir o sistema Jules de auto-correção para cobrir **4 novos domínios** além dos subsistemas existentes: **Bugs/Core**, **Performance**, **Design/UX** e **Security**. Criar um orquestrador autônomo que analisa o estado do sistema e dispara sessões Jules proativamente.

## Detalhes Técnicos

### 1. Expandir `jules-auto-triggers.ts` com novos subsistemas

Adicionar 12 novos subsystem keys cobrindo:
- **Core/Bugs**: `core_routing`, `core_state`, `core_auth`, `core_api`
- **Performance**: `perf_bundle`, `perf_render`, `perf_memory`, `perf_network`
- **Design**: `design_responsive`, `design_accessibility`, `design_animation`
- **Security**: `sec_rls`, `sec_xss`, `sec_injection`, `sec_auth_flow`

Incluir mapeamento de arquivos e descrições para cada um no `SUBSYSTEM_MAP`.

### 2. Criar `jules-evolution-engine.ts` — Orquestrador Autônomo

Motor principal de auto-evolução com 4 scanners:

```text
┌─────────────────────────────────────────────┐
│           Jules Evolution Engine            │
├──────────┬──────────┬──────────┬────────────┤
│  BugScan │ PerfScan │DesignScan│ SecScan    │
│  (errors,│ (bundle, │(a11y,    │ (RLS,      │
│   state) │  memory) │ contrast)│  headers)  │
└────┬─────┴────┬─────┴────┬─────┴─────┬──────┘
     └──────────┴──────────┴───────────┘
               ▼
      Jules API → PR → Auto-Merge Check
```

- `scanForBugs()`: coleta erros do console (window.onerror), unhandled rejections, React error boundaries
- `scanPerformance()`: monitora bundle size warnings, render times >16ms, memory growth
- `scanDesign()`: verifica contrast ratios, missing alt texts, broken layouts via ResizeObserver
- `scanSecurity()`: valida headers, detecta exposed secrets, verifica RLS coverage

Cada scanner acumula métricas e, ao atingir threshold, dispara `orionSelfImprove()` com contexto detalhado.

### 3. Criar `jules-immune-system.ts` — Sistema Imunológico Adaptativo

- **Anticorpos**: registry de patterns de erro já corrigidos (hash → fix applied)
- **Memória imunológica**: erros que já tiveram PR aprovado não disparam novas sessões por 7 dias
- **Isolamento**: quando um módulo falha 5x, marca como "quarentena" e sugere fallback
- Persiste no Supabase via tabela `jules_sessions` (campo `error_snapshot` como fingerprint)

### 4. Expandir `JulesSelfImprovePanel.tsx`

- Adicionar tabs: **Subsistemas | Bugs | Performance | Design | Security**
- Dashboard com gauges de saúde por categoria
- Botão "Scan Agora" que executa os 4 scanners manualmente
- Timeline visual mostrando evolução do sistema (PRs criados → resolvidos)

### 5. Integrar ao Agentic Loop

Na `runAgenticCycle` (fase 7), expandir `triggerJulesSelfImprove` para também:
- Classificar falhas por domínio (bug/perf/design/security)
- Enviar contexto enriquecido incluindo stack traces e métricas de pipeline
- Usar branches temáticas: `fix/`, `perf/`, `design/`, `security/`

### 6. Auto-Scan Periódico

- Registrar `setInterval` no mount do dashboard (a cada 5min)
- Cada scan leve (<50ms), só dispara Jules se encontrar issues reais
- Respects rate limit existente (3 sessões/hora)

### Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| `src/lib/neural/jules-evolution-engine.ts` | Criar — orquestrador com 4 scanners |
| `src/lib/neural/jules-immune-system.ts` | Criar — memória imunológica + quarentena |
| `src/lib/neural/jules-auto-triggers.ts` | Expandir subsystems (core/perf/design/sec) |
| `src/components/dashboard/neural/JulesSelfImprovePanel.tsx` | Tabs + scan manual + health gauges |
| `src/lib/neural/orion-agentic-loop.ts` | Enriquecer fase 7 com classificação de domínio |
| `src/lib/neural/index.ts` | Novos exports |

