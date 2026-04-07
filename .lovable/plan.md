

# Plano: Loja do Afiliado + Fluxo Completo Produtor → Afiliado → Cliente + Orion IA

## Estado Atual

O sistema já tem:
- **Produtor**: Dashboard com stats, MeusProdutos (CRUD + upload + módulos), ProdutorAfiliados (gerenciar programa), Loja pública (`/loja/:creatorId`), ProdutoDetalhe, Editor de Vendas, Orion Insights
- **Afiliado**: Dashboard com marketplace de programas, links/cupons, vendas, Vitrine pública (`/vitrine/:affiliateId`), botão "Copy IA"
- **Cliente**: MeusAcessos (área de membros com arquivos, módulos, Orion FAQ)
- **Checkout**: Loja com CartContext, mas sem entrega automática (customer_access) nem registro de affiliate_sales no fluxo de pagamento
- **Edge Function**: `orion-produtor-ai` (descrição, preço, módulos, copy, FAQ, performance)

## O que FALTA para fechar o ciclo

```text
PRODUTOR cria produto → ativa programa afiliados
     ↓
AFILIADO encontra no marketplace → solicita → aprovado → recebe link/cupom
     ↓
AFILIADO divulga link → CLIENTE acessa loja do produtor com ?ref=HASH
     ↓
CLIENTE compra → checkout → pagamento confirmado
     ↓
SISTEMA automaticamente:
  1. Cria customer_access (acesso ao conteúdo)
  2. Detecta ref/cupom → registra affiliate_sale + comissão
  3. Notifica produtor + afiliado
     ↓
CLIENTE acessa /dashboard/meus-acessos (área de membros)
AFILIADO vê venda no dashboard
PRODUTOR vê receita e comissão paga
```

### Gaps identificados:

1. **Afiliado NÃO tem loja própria** — a vitrine mostra produtos mas redireciona para loja do produtor. O afiliado precisa de uma **loja/vitrine aprimorada** com branding próprio
2. **Checkout NÃO cria `customer_access`** — compra não libera acesso automático
3. **Checkout NÃO registra `affiliate_sales`** — ref/cupom tracking não efetiva venda
4. **Vitrine do afiliado é básica** — sem categorias, sem busca avançada, sem SEO
5. **Orion não ajuda no checkout** — sem assistente de dúvidas na loja
6. **Afiliado não tem analytics detalhado** — sem gráficos de conversão/tendência

---

## Etapas de Implementação

### 1. Vitrine do Afiliado Aprimorada (Loja do Afiliado)

Refatorar `VitrineAfiliado.tsx` para ser uma loja completa:
- Header com foto, nome e bio do afiliado (branding pessoal)
- Grid de produtos com categorias, busca, filtros e ordenação (similar à Loja do produtor)
- Cada produto mostra preço, tipo, comissão (badge "Recomendo")
- Botão "Comprar" leva à loja do produtor com `?ref=HASH` preservado
- SEO com DynamicMeta por produto
- Botão "Perguntar ao Orion" para dúvidas sobre qualquer produto da vitrine

**Modificado**: `src/pages/VitrineAfiliado.tsx`

### 2. Checkout com Entrega Automática + Rastreamento de Afiliado

Criar edge function `process-sale` que é chamada após confirmação de pagamento:

1. Recebe `order_id` 
2. Busca order → cria `customer_access` (libera conteúdo)
3. Verifica se há `ref` (cookie/param) ou cupom → busca `affiliate_links` pelo hash
4. Se afiliado encontrado → calcula comissão via `affiliate_programs.commission_percent`
5. Insere `affiliate_sales` com `amount_cents`, `commission_cents`, `tracking_type`
6. Retorna confirmação

**Novo**: `supabase/functions/process-sale/index.ts`
**Modificado**: Componente de checkout/pagamento para chamar esta function após pagamento

### 3. Orion Assistente na Loja (Widget de Dúvidas)

Componente flutuante na Loja e Vitrine que permite o cliente perguntar ao Orion sobre produtos antes de comprar:
- Botão flutuante "Dúvidas? Pergunte ao Orion"
- Mini-chat que chama `orion-produtor-ai` action `product_faq`
- Contexto: dados do produto atual (título, descrição, preço)

**Novo**: `src/components/store/OrionStoreAssistant.tsx`
**Modificado**: `src/pages/Loja.tsx`, `src/pages/ProdutoDetalhe.tsx`, `src/pages/VitrineAfiliado.tsx`

### 4. Dashboard do Afiliado — Analytics Avançado

Adicionar tab "Analytics" ao AfiliadoDashboard:
- Gráfico de cliques/conversões por período (últimos 7/30 dias)
- Taxa de conversão por produto
- Produtos mais vendidos (ranking)
- Widget "Orion: Análise de Performance" com sugestões IA

**Modificado**: `src/pages/dashboard/AfiliadoDashboard.tsx`

### 5. Orion Copiloto Completo para Afiliado

Expandir edge function `orion-produtor-ai` com novas actions:
- `affiliate_strategy`: Sugere estratégia de divulgação baseada nos dados do afiliado
- `best_products`: Recomenda produtos do marketplace com maior potencial
- `social_calendar`: Sugere calendário de postagens para redes sociais

**Modificado**: `supabase/functions/orion-produtor-ai/index.ts`

### 6. Notificações Produtor ↔ Afiliado

Adicionar registros na tabela `notifications` (se existir) ou criar sistema simples:
- Produtor recebe notificação quando afiliado solicita programa
- Afiliado recebe notificação quando aprovado/rejeitado
- Produtor recebe notificação de venda via afiliado
- Afiliado recebe notificação de comissão ganho

**Novo**: Migration para tabela `sale_notifications` (se notifications não existir)

---

## Detalhes Técnicos

### Arquivos a criar:
1. `supabase/functions/process-sale/index.ts` — entrega automática + tracking afiliado
2. `src/components/store/OrionStoreAssistant.tsx` — widget de dúvidas na loja

### Arquivos a modificar:
1. `src/pages/VitrineAfiliado.tsx` — refatorar para loja completa
2. `src/pages/dashboard/AfiliadoDashboard.tsx` — tab Analytics + Orion strategy
3. `src/pages/Loja.tsx` — adicionar OrionStoreAssistant
4. `src/pages/ProdutoDetalhe.tsx` — adicionar OrionStoreAssistant
5. `supabase/functions/orion-produtor-ai/index.ts` — novas actions (affiliate_strategy, best_products, social_calendar)

### Fluxo de venda completo:
```text
Cliente acessa /loja/CREATOR?ref=HASH
     → AffiliateTracker salva ref em cookie (já existe)
     → Adiciona ao carrinho → Checkout → Pagamento (Stripe)
     → Webhook/callback chama process-sale
     → process-sale:
        1. INSERT customer_access
        2. Detecta ref cookie → busca affiliate_links.hash
        3. Busca affiliate_programs.commission_percent
        4. INSERT affiliate_sales (amount, commission, tracking_type)
     → Cliente redirecionado para /dashboard/meus-acessos
     → Afiliado vê venda no dashboard
     → Produtor vê receita no dashboard
```

