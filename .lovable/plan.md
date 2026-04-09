# Plano — Integração "Thomas" como Orquestrador Digital Central

## Visão Geral

O "ORION" descrito nas imagens é um **orquestrador digital central** para todas as empresas, com 3 domínios: **Operacional**, **Financeiro** e **Comercial**. Analisando o sistema atual, já existem peças significativas que podem ser conectadas sob essa camada de orquestração.

## NOME SO DEVE SER CITADO NOS CODIGO ORION Mapeamento: O que já existe vs. O que falta

```text
DOMÍNIO          JÁ EXISTE                           FALTA
─────────────────────────────────────────────────────────────────
OPERACIONAL      • ai-orchestrator (Gemini 7-key)     • Dashboard unificado de fluxos
                 • queue-worker (fila de tarefas)      • Feedback loops automáticos
                 • neural-auto-learn (aprendizado)     • Detecção de gargalos em tempo real
                 • digital-twin-aas.ts (Industry 4.0)  • KPIs operacionais com alertas
                 • Controle Robótico (ROS2)

FINANCEIRO       • PagamentosPage (Stripe)             • Fluxo de caixa (entradas/saídas)
                 • orders, products (tabelas)           • DRE automático (receitas - custos)
                 • stripe-api, stripe-webhook            • Projeções preditivas (Gemini)
                 • process-sale                         • Detecção de anomalias financeiras
                                                        • KPIs financeiros (margem, CAC, LTV)

COMERCIAL        • CRM Pipeline (clientes/status)      • Lead scoring automático (Gemini)
                 • Marketplace, Afiliados               • Funil de vendas visual
                 • campanhas-email                      • Segmentação comportamental
                 • orion-produtor-ai                    • Automação de retenção
                                                        • Métricas de conversão
```

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────┐
│              THOMAS — Painel Central             │
│         /dashboard/thomas (nova página)          │
├────────────────┬────────────┬───────────────────┤
│  OPERACIONAL   │ FINANCEIRO │    COMERCIAL      │
│  ────────────  │ ────────── │  ──────────────   │
│  Tasks ativas  │ Caixa hoje │  Leads novos      │
│  Gargalos      │ DRE mensal │  Funil pipeline   │
│  KPIs robótica │ Projeções  │  Conversão %      │
│  Alertas       │ Anomalias  │  Retenção         │
└────────────────┴────────────┴───────────────────┘
         ↓               ↓              ↓
   ai-orchestrator   stripe-api    CRM + orion-ai
   queue-worker      orders/sales  client_profiles
   digital-twin      products      affiliate_sales
```

## Passos de Implementação

### Passo 1 — Tabela `thomas_financial_entries`

Nova tabela para registrar entradas/saídas financeiras (o que o Stripe não cobre: custos operacionais, despesas manuais). Migração SQL com RLS.

### Passo 2 — Edge Function `thomas-intelligence`

Uma edge function que usa Gemini (free) para:

- Calcular DRE automático (consulta orders + financial_entries)
- Gerar projeções preditivas (tendência dos últimos 90 dias)
- Lead scoring (analisa client_profiles + histórico de interações)
- Detectar anomalias (variações >30% em métricas)

### Passo 3 — Página `/dashboard/thomas`

Dashboard unificado com 3 abas (Operacional, Financeiro, Comercial), cada uma com:

- Cards de KPIs em tempo real
- Gráficos de tendência (Recharts, já no projeto)
- Alertas inteligentes gerados pelo Gemini
- Ações rápidas (links para CRM, Pagamentos, etc.)

### Passo 4 — Integração no ProprietarioDashboard

Adicionar seção "Thomas — Orquestrador" no dashboard do proprietário com widget resumo e link para a página completa.

### Passo 5 — Cron Job `thomas-daily-report`

Job diário (6h) que gera relatório consolidado via Gemini e salva em `thomas_reports`. Disponível no dashboard como "Relatório do dia".

## Detalhes Técnicos

- **LLM**: Gemini free (7-key rotation existente) — zero custo adicional
- **Dados financeiros**: `orders` + `products` + `affiliate_sales` + nova `thomas_financial_entries`
- **Dados comerciais**: `client_profiles` + `chat_conversations` + `affiliate_requests`
- **Dados operacionais**: `generation_queue` + `ai_metrics` + digital-twin AAS
- **Gráficos**: Recharts (já instalado no projeto)
- **Nenhum serviço pago adicional**

## O que NÃO será tocado

- Orion (continua independente como IA conversacional)
- RAG / embeddings / neural-auto-learn (intactos)
- Queue-worker (mantém frequência atual de 1 min)
- Edge functions existentes