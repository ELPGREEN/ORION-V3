

# Plano Revisado — DROP Tabelas Órfãs + Limpeza de Código

## Correção crítica da auditoria anterior

A busca anterior só verificou `src/` mas **ignorou edge functions**. Resultado: 5 tabelas que foram marcadas como "órfãs" são **ativamente usadas** por edge functions:

| Tabela | Usada por |
|--------|-----------|
| `webhook_subscriptions` | `webhook-gateway` (CRUD completo) |
| `user_neural_profiles` | `neural-ops` (init neural profile) |
| `adaptive_system_prompts` | `secretaria-ia` (prompt adaptativo) |
| `user_integrations` | `amazon-auth` (OAuth tokens) |
| `stripe_connect_accounts` | `stripe-api` (Stripe Connect) |

**Estas 5 NÃO serão tocadas.**

---

## Tabelas realmente órfãs confirmadas (26 tabelas)

Zero referências em `src/` (exceto types.ts auto-gerado) E zero referências em edge functions:

| # | Tabela |
|---|--------|
| 1 | `analises` |
| 2 | `barcode_cache` |
| 3 | `cgu_sanctions_cache` |
| 4 | `cpf_cache` |
| 5 | `document_validation_cache` |
| 6 | `document_validations` |
| 7 | `document_versions` |
| 8 | `email_signature_settings` |
| 9 | `execution_plans` |
| 10 | `face_templates` |
| 11 | `feasibility_market_data` |
| 12 | `impact_stats` |
| 13 | `lead_documents` |
| 14 | `lead_notes` |
| 15 | `loi_documents` |
| 16 | `neural_evolution_log` |
| 17 | `push_subscriptions` |
| 18 | `pyrolysis_readings` |
| 19 | `security_scan_results` |
| 20 | `security_scan_runs` |
| 21 | `serpapi_cache` |
| 22 | `signature_log` |
| 23 | `signed_urls` |
| 24 | `workspace_connector_settings` |
| 25 | `workspace_settings` |
| 26 | `youtube_cache` |

---

## Funções DB obsoletas (3 funções — não pgvector)

| Função | Motivo |
|--------|--------|
| `increment_loi_download` | Referencia `loi_documents` (será removida) |
| `clean_expired_cache` | Referencia `cpf_cache` e `cgu_sanctions_cache` (serão removidas) |
| `get_child_network_stats` | Referencia `neural_child_reports` sem uso real |

**`increment_report_views` será mantida** — `report_verifications` não está na lista de remoção.

---

## Passos de implementação

### Passo 1 — Migração SQL
Uma única migração com `DROP TABLE IF EXISTS CASCADE` para as 26 tabelas + `DROP FUNCTION IF EXISTS` para as 3 funções DB.

### Passo 2 — Nada mais
- `types.ts` se regenera automaticamente pelo Supabase
- Nenhum arquivo em `src/` referencia essas tabelas
- Nenhuma edge function referencia essas tabelas
- Zero alterações em código

---

## O que NÃO será tocado

- Nenhum arquivo em `src/`
- Nenhuma edge function
- Tabelas ativas: `webhook_subscriptions`, `user_neural_profiles`, `adaptive_system_prompts`, `user_integrations`, `stripe_connect_accounts`
- Funções pgvector (são do extension)
- `email_templates` (variável local no auth-email-hook, não a tabela — mas para segurança, será mantida)

