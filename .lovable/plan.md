
Plano para montar o frontend de distribuição de ferramentas + prompt para Jules validar o backend.

## Frontend (Lovable executa)

### 1. `src/lib/orion-tools/tool-distribution.ts` (novo)
Mapa central: `Role × Plan → ToolName[]` + flags `unlimited` para owner. Define enums `ToolCategory` (chat, voice, vision, browser, editor, legal, robotics, jules, stripe) e helper `isToolAllowed(role, plan, isOwner, tool)`.

### 2. `src/lib/orion-tools/index.ts` (estender)
- `getToolsForAgent(agentId, role?, plan?, isOwner?)` filtra por distribuição.
- `getAllowedTools(role, plan, isOwner)` retorna lista completa.

### 3. `src/hooks/useUserTools.ts` (novo)
Combina `useUserRole` + `useAdminAccess` + `useUserPlan` → retorna `{ tools, hasTool(name), category, plan, role, isOwner, requiresUpgrade(name) }`.

### 4. `src/components/common/ToolGuard.tsx` (novo)
```tsx
<ToolGuard tool="robotics" fallback={<UpgradeCTA />}>...</ToolGuard>
```
Variantes: `mode="hide" | "blur" | "upgrade"`.

### 5. `src/components/common/UpgradeCTA.tsx` (novo)
Card consistente: "Disponível no plano Premium" + botão para `/pricing` ou "Não disponível para seu papel".

### 6. `src/components/dashboard/ActiveToolsBadge.tsx` (novo)
Badge no dashboard mostrando categorias ativas (Chat, Voz, Vision, etc) com ícones e contagem.

### 7. `src/components/dashboard/neural/useOrionReasoning.ts` (modificar)
Antes de executar intent → `hasTool(requiredTool)`. Se bloqueado, retorna mensagem amigável ("Esse recurso requer plano Premium" / "Não disponível para Afiliado").

### 8. Aplicar `<ToolGuard>` nos painéis-chave
- Robotics panels → `tool="robotics"` (só owner)
- Editor de Vendas → `tool="sales_editor"` (produtor + owner)
- Agentes jurídicos → `tool="legal_agents"` (advogado + owner)
- Jules/Evolution → `tool="jules"` (só owner)

## Backend (Jules executa via prompt)

Migration `user_tool_overrides` (admin libera tools por usuário) com RLS:
- `id`, `user_id`, `tool_name`, `granted_by`, `expires_at`, `created_at`
- RLS: usuário lê os próprios; admin/owner lê e escreve todos.

---

## Arquivos
- `src/lib/orion-tools/tool-distribution.ts` (novo)
- `src/lib/orion-tools/index.ts` (estender)
- `src/hooks/useUserTools.ts` (novo)
- `src/components/common/ToolGuard.tsx` (novo)
- `src/components/common/UpgradeCTA.tsx` (novo)
- `src/components/dashboard/ActiveToolsBadge.tsx` (novo)
- `src/components/dashboard/neural/useOrionReasoning.ts` (modificar — bloqueio por tool)
- Aplicar `<ToolGuard>` em painéis sensíveis (robotics, editor vendas, jurídico, jules)

## Resultado
- Distribuição centralizada e tipada
- Owner sempre tem acesso (bypass preservado)
- UI mostra ferramentas ativas + CTA de upgrade quando bloqueado
- Orion responde "não disponível" quando intent exige tool bloqueado
- Pronto para receber overrides do backend (Jules cria a tabela)

## Prompt para Jules (entregue após implementação do frontend)
Texto completo a ser enviado para Jules verificar/criar o backend correspondente — incluirá: migration `user_tool_overrides` com RLS, endpoint admin para conceder/revogar tools, integração com `useUserTools` via query Supabase, validação que owner sempre passa, testes E2E por role.
