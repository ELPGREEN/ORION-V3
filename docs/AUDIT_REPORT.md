# JULES — AUDITORIA COMPLETA: Tabelas + Funções (Supabase)

## Resumo da Auditoria
- **Total de referências auditadas:**
  - Tabelas: 1020
  - RPCs: 21
  - Storage: 19
- **Status:** Correções aplicadas.

## Referências Inválidas Encontradas

### Tabelas
| Arquivo | Linha | Referência Inválida | Correção Aplicada | Categoria |
|---------|-------|---------------------|-------------------|-----------|
| `src/pages/AdvogadoSite.tsx` | 33 | `escritorio_public_view` | `// FIXME(jules-audit): tabela inexistente` | Tabela inexistente |
| `src/lib/neural/orion-tool-executor.ts` | 1425 | `subscriptions` | `user_subscriptions` | Typo/Renomeada |
| `src/lib/neural/orion-tool-executor.ts` | 2802 | `notifications` | `notificacoes` | Typo/Renomeada |
| `src/lib/neural/orion-tool-executor.ts` | 3113 | `smart_routines` | `// FIXME(jules-audit): tabela inexistente` | Tabela inexistente |
| `src/components/dashboard/clients/LawyerSelectionCard.tsx` | 10 | `available_advogados` | `// FIXME(jules-audit): tabela inexistente no inventário` | Tabela inexistente |
| `supabase/functions/create-client-profile/index.ts` | 267 | `client_registrations_feed` | `// FIXME(jules-audit): tabela inexistente` | Tabela inexistente |
| `supabase/functions/auth-email-hook/index.ts` | 247 | `email_send_log` | `// FIXME(jules-audit): tabela inexistente` | Tabela inexistente |
| `supabase/functions/auth-email-hook/index.ts` | 273 | `email_send_log` | `// FIXME(jules-audit): tabela inexistente` | Tabela inexistente |

### RPCs
| Arquivo | Linha | Referência Inválida | Correção Aplicada | Categoria |
|---------|-------|---------------------|-------------------|-----------|
| `supabase/functions/neural-child-bridge/index.ts` | 128 | `get_public_tables` | `// FIXME(jules-audit): RPC inexistente` | RPC inexistente |
| `supabase/functions/neural-child-bridge/index.ts` | 339 | `get_registration_analytics` | `// FIXME(jules-audit): RPC inexistente` | RPC inexistente |

### Storage (Buckets)
| Arquivo | Linha | Referência Inválida | Correção Aplicada | Categoria |
|---------|-------|---------------------|-------------------|-----------|
| `src/components/dashboard/AvaliacaoForm.tsx` | 49 | `avatars` | `profile-photos` | Bucket errado |
| `src/components/dashboard/AvaliacaoForm.tsx` | 55 | `avatars` | `profile-photos` | Bucket errado |
| `src/pages/dashboard/PublicacoesAdmin.tsx` | 147 | `avatars` | `profile-photos` | Bucket errado |
| `src/pages/dashboard/PublicacoesAdmin.tsx` | 153 | `avatars` | `profile-photos` | Bucket errado |
| `src/pages/dashboard/PublicacoesAdmin.tsx` | 174 | `avatars` | `profile-photos` | Bucket errado |
| `src/pages/dashboard/PublicacoesAdmin.tsx` | 176 | `avatars` | `profile-photos` | Bucket errado |
| `src/pages/dashboard/ConfiguracoesEscritorio.tsx` | 219 | `avatars` | `profile-photos` | Bucket errado |
| `src/pages/dashboard/ConfiguracoesEscritorio.tsx` | 232 | `avatars` | `profile-photos` | Bucket errado |
| `src/pages/dashboard/ConfiguracoesEscritorio.tsx` | 247 | `avatars` | `profile-photos` | Bucket errado |
| `src/pages/dashboard/ConfiguracoesEscritorio.tsx` | 255 | `avatars` | `profile-photos` | Bucket errado |

### Violações de Melhores Práticas (Client querying user_roles)
| Arquivo | Linha | Descrição | Correção |
|---------|-------|-----------|----------|
| `src/hooks/useUserRole.ts` | 50 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` |
| `src/components/dashboard/neural/useOrionReasoning.ts` | 219 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` |
| `src/components/dashboard/neural/useOrionReasoning.ts` | 499 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` |
| `src/components/dashboard/neural/useOrionReasoning.ts` | 648 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` |
| `src/components/dashboard/neural/useOrionReasoning.ts` | 830 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` |
| `src/components/dashboard/neural/useOrionReasoning.ts` | 1092 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` |
| `src/pages/dashboard/AdminOwnerDashboard.tsx` | 51-54 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` ou equivalente |
| `src/pages/ConsultaIA.tsx` | 162 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` |
| `src/lib/neural/orion-tool-executor.ts` | 189 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` |
| `src/lib/neural/orion-tool-executor.ts` | 1497 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` |
| `src/lib/neural/orion-tool-executor.ts` | 1512 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` |
| `src/lib/neural/arc-auto-charge.ts` | 95 | Consulta direta à `user_roles` | Refatorar para usar RPC `has_role` |
