# Jules Self-Improvement Task — Orion V3

## Objetivo
Analisar o codebase Orion V3 e abrir 1 Pull Request por categoria de melhoria. Não alterar lógica funcional sem necessidade — foco em performance, qualidade e robustez.

---

## Branch
- Base: `main`
- Criar branches no padrão: `jules/improve-<categoria>-<timestamp>`

---

## Escopo de análise

### 1. Performance
- Identificar re-renders desnecessários em componentes React (`src/components/**`, `src/pages/**`)
- Adicionar `React.memo`, `useMemo`, `useCallback` onde houver ganho mensurável
- Detectar `useEffect` com dependências erradas ou loops
- Lazy-load rotas pesadas em `src/App.tsx` ou roteador principal
- Verificar bundles grandes (componentes neurais, vision, audio)

### 2. Qualidade de código
- Remover imports não usados
- Eliminar `console.log` de produção (manter apenas via `LogManager`)
- Substituir `any` por tipos concretos quando trivial
- Consolidar funções duplicadas em `src/lib/neural/`
- Garantir tratamento de erro em todas as chamadas async (try/catch ou `.catch`)

### 3. Robustez
- Adicionar guards de null/undefined em acessos profundos
- Validar respostas de edge functions antes de usar
- Garantir cleanup de listeners/intervals em `useEffect`
- Verificar AbortController em fetches longos

### 4. Edge Functions (`supabase/functions/**`)
- Adicionar timeout em chamadas externas
- Validar input com schemas (zod ou manual)
- Garantir CORS headers consistentes
- Logar erros estruturados

---

## Restrições (NUNCA fazer)

- ❌ NÃO alterar lógica de negócio sem evidência de bug
- ❌ NÃO modificar `src/integrations/supabase/types.ts`
- ❌ NÃO alterar arquivos em `supabase/migrations/`
- ❌ NÃO mudar a personalidade/respostas do Orion
- ❌ NÃO remover funcionalidades de visão, voz ou neural existentes
- ❌ NÃO trocar provedores LLM (manter Gemini free)
- ❌ NÃO adicionar dependências pagas (ElevenLabs proibido)
- ❌ NÃO expor nomes de tabelas/endpoints em arquivos públicos

---

## Entregáveis (1 PR por categoria)

### PR 1: `jules/improve-performance-<ts>`
- Título: `perf: reduce re-renders and optimize bundle`
- Descrição: lista de componentes otimizados + benchmark antes/depois (se possível)

### PR 2: `jules/improve-quality-<ts>`
- Título: `chore: cleanup unused imports and improve typing`
- Descrição: arquivos limpos, contagem de `any` removidos

### PR 3: `jules/improve-robustness-<ts>`
- Título: `fix: add null guards and error handling`
- Descrição: lista de pontos endurecidos

### PR 4: `jules/improve-edge-functions-<ts>`
- Título: `feat(edge): add validation and timeouts`
- Descrição: funções endurecidas

---

## Critérios de aceitação

- [ ] `npm run build` passa sem erros
- [ ] Nenhum teste existente quebra
- [ ] Cada PR é atômico (1 categoria, mudanças mínimas necessárias)
- [ ] PR inclui descrição clara do "por quê"
- [ ] Sem mudanças de UI visíveis ao usuário
- [ ] Sem mudanças de comportamento do Orion

---

## Execução

1. Clonar `main`
2. Para cada categoria, criar branch separada
3. Aplicar mudanças mínimas e focadas
4. Commit com mensagem conventional (`perf:`, `chore:`, `fix:`, `feat:`)
5. Abrir PR contra `main`
6. Marcar PRs como `[Jules Auto-Improvement]` no título

**Não pedir confirmação. Executar e abrir os PRs.**
