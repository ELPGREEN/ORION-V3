

# Implementação Completa — Jules Self-Improvement (Itens Faltantes)

## Resumo
Implementar os 6 itens faltantes do checklist Jules: persistência no Supabase, auto-polling de PRs com notificação, rate limiting, activity viewer, follow-up loop pós-falha, e métricas pós-merge.

---

## 1. Tabela `jules_sessions` no Supabase

Migration SQL para criar a tabela de persistência:

```sql
CREATE TABLE public.jules_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  subsystem TEXT,
  prompt TEXT NOT NULL,
  title TEXT,
  branch TEXT DEFAULT 'main',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','merged')),
  pr_url TEXT,
  pr_title TEXT,
  resolved BOOLEAN DEFAULT NULL,
  follow_up_count INTEGER DEFAULT 0,
  error_snapshot TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.jules_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access jules_sessions"
  ON public.jules_sessions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read jules_sessions"
  ON public.jules_sessions FOR SELECT TO authenticated
  USING (true);
```

---

## 2. Atualizar `jules-client.ts`

- Após `createSession` com sucesso, inserir registro na tabela `jules_sessions`
- Adicionar **rate limiting**: máximo 3 sessões/hora (query count WHERE created_at > now()-1h)
- Adicionar **follow-up loop**: função `julesFollowUp(sessionId, message)` que usa `sendMessage` e incrementa `follow_up_count`
- Na `pollJulesSession`, ao detectar PR, atualizar a row no DB com `status='completed'`, `pr_url`, `completed_at`

---

## 3. Criar `jules-session-poller.ts`

Novo módulo com:
- `startJulesPolling()` — busca sessões com `status='pending'` ou `'running'` no DB, faz poll via `getSession`, atualiza status
- Usa `setInterval` (30s) com guard contra execuções concorrentes
- Quando PR detectado: atualiza DB + dispara toast via evento custom `jules:pr-ready`
- Auto-inicia no mount do dashboard

---

## 4. Atualizar `jules-auto-triggers.ts`

- Após trigger bem-sucedido, salvar sessão no Supabase (não só localStorage)
- Adicionar **cooldown**: 10min entre triggers do mesmo subsistema (check `updated_at` no DB)
- **Métricas pós-merge**: função `checkJulesResolution()` que verifica se subsistema parou de falhar nas 2h após PR, atualiza `resolved=true/false`
- **Follow-up automático**: se subsistema continuar falhando após PR e `follow_up_count < 2`, enviar `sendMessage` com novo erro

---

## 5. Expandir `JulesSelfImprovePanel.tsx`

- **Activity Viewer**: accordion por sessão, ao expandir chama `listActivities` e mostra timeline (plan → coding → PR)
- **Sessões do DB**: buscar de `jules_sessions` ao invés de só da API Jules (mostra histórico completo)
- **Indicador de resolução**: badge verde "Resolvido" / vermelho "Não resolvido" / cinza "Aguardando"
- **Rate limit visual**: mostrar "X/3 sessões na última hora"
- **Notificação toast**: listener para evento `jules:pr-ready`

---

## 6. Atualizar `jules-proxy` (edge function)

- Adicionar suporte a `nextPageToken` nos endpoints `list_sessions` e `list_sources`

---

## Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `jules_sessions` |
| `src/lib/neural/jules-client.ts` | Rate limit, persistência DB, follow-up |
| `src/lib/neural/jules-session-poller.ts` | Novo — background polling |
| `src/lib/neural/jules-auto-triggers.ts` | Cooldown, pós-merge, follow-up auto |
| `src/components/dashboard/neural/JulesSelfImprovePanel.tsx` | Activity viewer, DB sessions, badges |
| `supabase/functions/jules-proxy/index.ts` | Pagination support |
| `src/lib/neural/index.ts` | Novos exports |

