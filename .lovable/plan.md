

# Plano: Painel Unificado do Cliente — Produtos Digitais + Serviços Jurídicos + Lojas + Orion IA

## Estado Atual

O `ClienteDashboard.tsx` (1448 linhas) ja tem:
- Stats (processos, mensagens, pendentes)
- Seleção de advogado, assinaturas digitais, processos, andamentos, consultas, documentos, pagamentos
- quickActions com links para: Suporte, Orion IA, Processos, Documentos, Marketplace, Consultas, Pagamentos, Plano, Perfil, Notificações, Central de Ajuda
- Marketplace ja aparece como quickAction (path `/dashboard/marketplace`)

`MeusAcessos.tsx` (241 linhas) existe mas esta isolado — nao aparece no quickActions do cliente.

**O que falta:**
1. **MeusAcessos nao esta integrado** no painel do cliente — o cliente nao ve seus produtos comprados no dashboard
2. **Nao ha discovery de lojas** — cliente nao consegue explorar lojas de produtores/afiliados
3. **Orion nao auxilia compras** — nenhum assistente de compras no dashboard do cliente
4. **Painel juridico e digital sao desconectados** — o cliente ve processos mas nao ve produtos comprados no mesmo painel
5. **Nenhum widget de "Produtos Recentes"** ou "Continuar Aprendendo" para cursos

## Etapas de Implementação

### 1. Integrar Produtos Comprados no Dashboard do Cliente

Adicionar ao `ClienteDashboard.tsx`:
- **Nova seção "Meus Produtos Digitais"** entre Resumo do Caso e Acesso Rápido
- Grid compacto mostrando ultimos 3-4 produtos de `customer_access` com capa, titulo, tipo
- Badge de progresso para cursos (modulos completados)
- Botão "Ver Todos" leva para `/dashboard/meus-acessos`
- Se nao tem produtos: card motivacional "Explore o Marketplace"

Adicionar quickAction "Meus Produtos" apontando para `/dashboard/meus-acessos`.

### 2. Seção "Explorar Lojas" no Dashboard

Nova seção compacta mostrando:
- Grid de 3-4 lojas ativas (produtores com produtos publicados) com nome, foto, contagem de produtos
- Click leva para `/loja/:creatorId`
- Possibilidade de ver vitrines de afiliados tambem
- Busca simples por nome ou categoria

### 3. Página de Discovery: Explorar Lojas e Vitrines

Nova página `/dashboard/explorar-lojas` (link no quickActions):
- Lista de todas as lojas de produtores com produtos ativos
- Lista de vitrines de afiliados
- Filtros por categoria de produto, tipo (curso, ebook, template)
- Busca por nome de produtor/afiliado ou produto
- Orion: botão "Me ajude a escolher" para recomendações personalizadas

### 4. Widget Orion Assistente de Compras no Dashboard

Adicionar mini-widget no dashboard do cliente:
- "Orion: O que devo estudar?" — recomenda produtos baseado no perfil e historico
- "Orion: Resumo dos meus cursos" — progresso consolidado
- Usa a edge function `orion-produtor-ai` action `product_faq` existente + nova action `recommend_products`

### 5. Unificar Painel Jurídico + Digital

O dashboard ja mostra processos/consultas. Integrar visualmente:
- Seção "Meus Serviços" agrupando: processos ativos + consultas agendadas + advogado vinculado
- Seção "Meus Conteúdos" agrupando: produtos comprados + cursos em progresso
- Ambas sections lado a lado em telas grandes, empilhadas em mobile
- Isso cria uma experiência unificada sem separar os dois mundos

### 6. Expandir Orion Edge Function

Adicionar action `recommend_products` ao `orion-produtor-ai`:
- Input: historico de compras do cliente + categorias existentes
- Output: 3-5 sugestoes de produtos com justificativa

---

## Detalhes Técnicos

### Arquivos a criar:
1. `src/pages/dashboard/ExplorarLojas.tsx` — discovery de lojas/vitrines com busca e filtros

### Arquivos a modificar:
1. `src/pages/dashboard/ClienteDashboard.tsx` — adicionar seções "Meus Produtos Digitais", "Explorar Lojas", widget Orion compras
2. `src/App.tsx` — rota `/dashboard/explorar-lojas`
3. `supabase/functions/orion-produtor-ai/index.ts` — nova action `recommend_products`

### Queries necessarias:
- Produtos comprados: `customer_access` JOIN `products` WHERE `user_id = auth.uid()` AND `is_active = true`
- Lojas ativas: `products` GROUP BY `creator_id` JOIN `profiles` WHERE `status = 'active'`
- Vitrines ativas: `affiliate_links` JOIN `profiles` GROUP BY `affiliate_user_id`

### Nenhuma migration necessaria:
- Todas as tabelas ja existem (`customer_access`, `products`, `product_modules`, `product_files`, `affiliate_links`, `profiles`)

