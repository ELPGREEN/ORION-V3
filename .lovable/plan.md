
# Plano — ORION Orquestrador Digital Central

## Resumo

Criar o painel orquestrador Orion com 3 domínios (Operacional, Financeiro, Comercial) integrando dados existentes das tabelas `orders`, `products`, `generation_queue`, `ai_metrics`, `client_profiles`, `affiliate_sales`.

## Passo 1 — Migração SQL

Criar 2 tabelas novas:

**`orion_financial_entries`** — entradas/saídas manuais (custos, despesas, investimentos)
- `id`, `user_id` (FK auth.users), `type` (entrada/saída), `category`, `description`, `amount_cents`, `date`, `tags`, `created_at`
- RLS: owner só vê os seus; admin vê tudo

**`orion_reports`** — relatórios diários gerados pelo Gemini
- `id`, `user_id`, `report_type`, `data` (jsonb), `created_at`
- RLS: admin-only read

## Passo 2 — Edge Function `orion-intelligence`

Edge function com 4 actions via query param `action`:
- `dre` — consulta `orders` + `orion_financial_entries` dos últimos 30/60/90 dias, calcula receitas - custos - despesas, retorna DRE
- `projections` — últimos 90 dias de dados, envia ao Gemini para projeção 30/60/90 dias
- `anomalies` — compara últimos 7 dias vs média 30 dias, detecta variações >30%
- `lead-scoring` — analisa `client_profiles` + `chat_conversations`, Gemini pontua leads

Usa Gemini free (7-key rotation copiada do `ai-orchestrator`).

## Passo 3 — Página `/dashboard/orion-orchestrator`

Nova rota (substituindo o redirect atual de `/dashboard/orion` → `/consulta`). Usa `orion-orchestrator` para não conflitar com o chat existente.

3 abas com Tabs component:

**Aba Operacional**: 4 KPI cards (Throughput, Uptime, Taxa de Erro, Tempo Médio) calculados a partir de `generation_queue` + `ai_metrics`. Gráfico de tendência com Recharts.

**Aba Financeiro**: 6 KPI cards (Caixa Hoje, Margem Bruta, CAC, LTV, Burn Rate, Payback). Gráfico DRE mensal + Fluxo de caixa. Formulário inline para adicionar entradas manuais em `orion_financial_entries`. Botão para gerar projeções via edge function.

**Aba Comercial**: 5 KPI cards (Conversão, Win Rate, Valor Médio Venda, Churn, Retenção 30d) calculados de `client_profiles` + `orders`. Funil visual com Recharts.

Alertas inteligentes em todas as abas (chama `orion-intelligence?action=anomalies`).

## Passo 4 — Widget no ProprietarioDashboard

Nova seção "Orion — Orquestrador" com 6 KPIs resumidos (2 por domínio) + botão "Ver Painel Completo" → `/dashboard/orion-orchestrator`.

## Passo 5 — Cron Job `orion-daily-report`

Edge function que gera relatório consolidado via Gemini e salva em `orion_reports`. Cron a cada 6h via `pg_cron` + `pg_net`.

## Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Criar | `supabase/functions/orion-intelligence/index.ts` |
| Criar | `supabase/functions/orion-daily-report/index.ts` |
| Criar | `src/pages/dashboard/OrionOrchestratorPage.tsx` |
| Criar | `src/components/dashboard/OrionOrchestratorWidget.tsx` |
| Editar | `src/App.tsx` — rota `/dashboard/orion-orchestrator` + manter redirect `/dashboard/orion` → `/consulta` |
| Editar | `src/pages/dashboard/ProprietarioDashboard.tsx` — adicionar seção widget |
| Migração SQL | Tabelas + RLS + cron job |

## O que NÃO será tocado
- Orion IA conversacional (rota `/consulta` intacta)
- RAG / embeddings / neural-auto-learn
- Queue-worker (1 min)
- Edge functions existentes
