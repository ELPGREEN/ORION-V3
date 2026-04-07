

# Plano: Sistema Completo do Produtor Digital + Integração Afiliados/Clientes + Orion IA

## Contexto Atual

O sistema já possui:
- Tabela `products` (título, preço, slug, status) -- sem suporte a arquivos digitais ou tipos de conteúdo
- Tabela `orders`, `affiliate_links`, `affiliate_programs`, `affiliate_requests`, `affiliate_sales`
- Dashboard do Produtor com stats, ferramentas, vendas recentes
- Dashboard do Afiliado com marketplace, links, vendas
- MeusProdutos: CRUD básico (título, descrição, preço, comissão) -- sem upload de arquivos
- Nenhuma tabela para conteúdo digital (arquivos, módulos, aulas), área de membros, ou entrega automática

## O que falta para funcionar como Hotmart

```text
┌─────────────────────────────────────────────────────────┐
│                    PRODUTOR                              │
│  Cria Produto → Upload Arquivos → Define Preço          │
│  Ativa Afiliação → Gerencia Programa                    │
│         │                                                │
│         ▼                                                │
│  ┌─────────────┐    ┌──────────────┐                    │
│  │  Página de   │◄──│   Afiliado    │                    │
│  │   Vendas     │   │  (link/cupom) │                    │
│  └──────┬──────┘    └──────────────┘                    │
│         │                                                │
│         ▼                                                │
│  ┌─────────────┐                                        │
│  │   CLIENTE    │                                        │
│  │  Compra →    │                                        │
│  │  Acesso auto │                                        │
│  │  Área Membros│                                        │
│  └─────────────┘                                        │
│                                                          │
│  ┌─────────────┐                                        │
│  │  ORION IA   │ Auxilia Produtor, Afiliado e Cliente   │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Etapas de Implementação

### 1. Database: Conteúdo Digital + Área de Membros

Nova migration com 3 tabelas:

**`product_files`** — Arquivos do produto (PDFs, vídeos, ZIPs)
- `product_id`, `file_name`, `file_url` (Supabase Storage), `file_type`, `file_size_bytes`, `sort_order`
- RLS: produtor dono lê/escreve, compradores lêem

**`product_modules`** — Módulos/aulas (para cursos)
- `product_id`, `title`, `description`, `sort_order`, `is_published`
- RLS: produtor dono gerencia, compradores lêem módulos publicados

**`customer_access`** — Controle de acesso pós-compra
- `user_id`, `product_id`, `order_id`, `granted_at`, `expires_at`, `is_active`
- RLS: usuário vê seus acessos, service_role gerencia
- Permite entrega automática: ao confirmar pagamento → insert nesta tabela

Adicionar coluna `product_type` na tabela `products`:
- Valores: `digital_download`, `course`, `membership`, `ebook`, `template`

Criar bucket de Storage `product-files` (privado).

### 2. Página "Meus Produtos" Aprimorada

Expandir `MeusProdutos.tsx`:
- Seletor de tipo de produto (`digital_download`, `course`, etc.)
- Upload de arquivos via Supabase Storage → `product_files`
- Para cursos: gerenciador de módulos (CRUD inline) com drag-to-reorder
- Preview do produto antes de publicar
- Botão "Ativar Afiliação" direto (cria `affiliate_program` inline)

### 3. Área de Membros do Cliente

Nova página `/dashboard/meus-acessos` (para role `cliente`):
- Lista produtos comprados via `customer_access`
- Acesso aos arquivos e módulos
- Progresso em cursos (opcionalmente `module_progress` table)
- Download direto dos arquivos com URL assinada do Storage

### 4. Checkout + Entrega Automática

Atualizar o fluxo de compra:
- Após `order.status = 'paid'` → inserir `customer_access`
- Se veio via afiliado → registrar `affiliate_sales` + calcular comissão
- Enviar email de boas-vindas via automação existente (`email_automation_rules` trigger `purchase`)

### 5. Dashboard do Produtor: Novos Widgets

Adicionar ao `ProdutorDashboard.tsx`:
- **Clientes Ativos**: count de `customer_access` ativos
- **Ranking de Afiliados**: top afiliados por vendas
- **Receita por Produto**: breakdown visual
- Link para "Área de Membros" (ver o que o cliente vê)

### 6. Integração Orion IA (via edge function existente + Gemini free)

Orion será integrado em 4 pontos funcionais:

**a) Produtor — Assistente de Criação**
- No formulário de produto: botão "Orion: Gerar Descrição" → chama edge function com Gemini
- "Orion: Sugerir Preço" baseado em categoria e mercado
- "Orion: Criar Módulos" para cursos → sugere estrutura de aulas

**b) Produtor — Análise de Performance**
- Widget no dashboard: "Orion Insights" → análise das vendas/conversões
- Sugestões automáticas: "Seu produto X tem baixa conversão, tente..."

**c) Afiliado — Copiloto de Vendas**
- No AfiliadoDashboard: "Orion: Gerar Copy" → texto de promoção para redes sociais
- "Orion: Melhor Horário" → sugestão baseada em dados de cliques

**d) Cliente — Suporte Inteligente**
- Na área de membros: "Perguntar ao Orion" sobre o conteúdo do produto
- FAQ automático baseado na descrição do produto

Todas essas chamadas usam o stack existente: edge function → Gemini free API (7-key rotation).

### 7. Edge Function: `orion-produtor-ai`

Nova edge function que centraliza as chamadas de IA do produtor:
- Actions: `generate_description`, `suggest_price`, `generate_modules`, `analyze_performance`, `generate_copy`
- Usa `GEMINI_API_KEY` com rotation
- Rate limit via `check_rate_limit` existente

---

## Detalhes Técnicos

### Arquivos a criar:
1. `supabase/migrations/XXXX_product_content.sql` — tabelas `product_files`, `product_modules`, `customer_access` + alter `products`
2. `supabase/functions/orion-produtor-ai/index.ts` — edge function IA
3. `src/pages/dashboard/MeusAcessos.tsx` — área de membros do cliente
4. `src/components/dashboard/product/ProductFileManager.tsx` — upload de arquivos
5. `src/components/dashboard/product/ProductModuleManager.tsx` — módulos de curso
6. `src/components/dashboard/OrionProductInsights.tsx` — widget de insights IA

### Arquivos a editar:
1. `src/pages/dashboard/MeusProdutos.tsx` — adicionar tipo, upload, módulos
2. `src/pages/dashboard/ProdutorDashboard.tsx` — novos stats + insights
3. `src/pages/dashboard/AfiliadoDashboard.tsx` — botão "Gerar Copy" Orion
4. `src/App.tsx` — rota `/dashboard/meus-acessos`

### RLS resumo:
- `product_files`: SELECT para compradores (via `customer_access`), ALL para `creator_id`
- `product_modules`: SELECT para compradores, ALL para `creator_id`
- `customer_access`: SELECT own, ALL service_role

