

# Diagnóstico de Egress — Causas e Otimizações

## Causa Principal: Cron Jobs Excessivos

Existem **6 cron jobs ativos** no pg_cron que fazem HTTP POST para edge functions constantemente, mesmo sem trabalho real.

### Consumo atual estimado (calls/dia)

```text
Job  Função                  Frequência     Calls/dia   Trabalho real
───  ──────────────────────  ─────────────  ─────────   ─────────────
#5   queue-worker            */1 min        1.440       ~0 (logs mostram "No pending jobs" 100%)
#3   generate-embeddings     */10 min       144         ~0 (0 processed, 0 remaining)
#1   neural-auto-learn       */30 min       48          Mínimo
#4   auto-approve proposals  1h (SQL only)  24          OK (não gera egress)
#2   neural-child-receiver   6h             4           Mínimo
#6   auto-ingestion-cron     6h             4           Mínimo
```

**Total estimado: ~1.640 edge function calls/dia = ~49.200/mês**

Cada call gera egress (request + response), mesmo retornando `{"processed": 0}`.
Com ~500 bytes por call vazia do queue-worker: **1.440 × 500B × 30 dias ≈ 21 MB/mês só do queue-worker vazio.**

Mas o egress real é maior porque cada call também inclui headers HTTP, TLS overhead, e queries ao banco (`generation_queue` SELECT + possível UPDATE).

### Tabelas grandes (potencial egress em queries)

```text
Tabela                        Tamanho    Linhas
neural_knowledge_base         44 MB      2.721
neural_evolution_proposals    24 MB      433
code_snippets                 18 MB      2.579
orion_threat_log              6.4 MB     14.535
legal_embeddings              6 MB       557
```

---

## Plano de Otimização (3 passos)

### Passo 1 — Reduzir frequência dos cron jobs

| Job | Frequência atual | Nova frequência | Redução |
|-----|-----------------|-----------------|---------|
| #5 queue-worker | 1 min | **5 min** | -80% (1440→288 calls/dia) |
| #3 generate-embeddings | 10 min | **1h** | -83% (144→24 calls/dia) |
| #1 neural-auto-learn | 30 min | **2h** | -75% (48→12 calls/dia) |

Migração SQL com `cron.alter_job()` para cada um.

### Passo 2 — Limpar dados acumulados desnecessários

- `orion_threat_log`: 14.535 linhas. Manter só últimos 30 dias, deletar o resto.
- `neural_evolution_proposals`: 24 MB / 433 linhas. Limpar proposals com status `approved` ou `rejected` com mais de 7 dias.
- `ai_metrics`: 947 linhas. Limpar métricas com mais de 30 dias.

Migração SQL com DELETE + VACUUM.

### Passo 3 — Adicionar early-exit no queue-worker

Adicionar cache local no queue-worker: se não houver jobs pendentes nas últimas 3 execuções consecutivas, retornar imediatamente sem fazer queries ao banco. Isso reduz egress de DB queries desnecessários.

---

## Impacto esperado

- **Edge function calls**: de ~49.200/mês para ~9.720/mês (-80%)
- **Egress de cron vazio**: redução proporcional
- **DB egress**: menor com cleanup de dados antigos
- **Zero impacto funcional**: queue-worker a cada 5 min ainda processa jobs com latência aceitável

## O que NÃO será tocado

- Nenhuma edge function será deletada
- Nenhuma tabela será deletada
- Job #4 (SQL puro, sem egress HTTP) fica igual
- Jobs #2 e #6 (6h) já são eficientes

