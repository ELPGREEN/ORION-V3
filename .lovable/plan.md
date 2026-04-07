

# Auditoria Completa dos 5 Painéis de Controle

## Situação Atual — O que cada painel TEM e o que FALTA

### 1. PAINEL DO CLIENTE
**Tem:** Processos, Documentos, Chat ao Vivo, Orion IA, Agendar Consulta, Pagamentos, Notificações, Assinatura Digital, Perfil
**Falta:**
- Marketplace (cliente pode comprar produtos digitais mas não tem acesso)
- Central de Ajuda / Instruções (existe na sidebar mobile mas não aparece bem no dashboard)
- Meu Plano (redireciona para configurações, deveria ter card dedicado)
- Histórico de Consultas IA (mostrar quantas consultas fez com Orion)

### 2. PAINEL DO AFILIADO
**Tem:** Links, Cliques, Conversões, Comissões, Marketplace, Perfil Público
**Falta:**
- Documentos (contratos de afiliação, termos)
- Chat / Suporte (não tem acesso ao chat)
- Materiais de Marketing (banners, copy, materiais para divulgação)
- Relatórios de Performance (gráficos de cliques/conversões ao longo do tempo)
- Central de Ajuda
- Dashboard muito básico — só 4 stats e 3 botões de acesso rápido

### 3. PAINEL DO PRODUTOR (Lojista)
**Tem:** Produtos, Receita, Vendas, Loja Pública, Marketplace, Pagamentos
**Falta:**
- Afiliados do Produto (ver quem está promovendo seus produtos)
- Documentos (contratos, termos de venda)
- Chat / Suporte
- Cupons de Desconto (criar promoções)
- Analytics de Produto (visualizações, taxa de conversão por produto)
- Avaliações dos Clientes
- Central de Ajuda
- Docs Internacionais (está na sidebar desktop mas não no dashboard home)

### 4. PAINEL DO ADVOGADO (DashboardHome)
**Tem:** Stats completos, Geração de Docs judicial/extrajudicial, CRM, Processos, Orion IA, Pesquisa, Chat, Consultas, Marketplace, Analytics, Secretary AI, Admin tools
**Falta:** Este é o mais completo. Pequenas melhorias:
- Widget de Prazos Urgentes (tarefas com prazo próximo)
- Resumo de Assinaturas Pendentes
- Link direto para Docs Internacionais no quick nav

### 5. PAINEL DO PROPRIETÁRIO (AdminOwnerDashboard)
**Tem:** KPIs globais (usuários, advogados, clientes, produtores, produtos, pedidos, docs, processos), Usuários recentes, BigQuery, Ações rápidas
**Falta:**
- Receita Total da Plataforma (faturamento geral)
- Logs de Atividade (quem fez o quê)
- Gestão de Planos/Assinaturas
- Moderação de Produtos (aprovar/rejeitar produtos no marketplace)
- Envio de Notificações em Massa
- Status dos Serviços (edge functions, APIs, etc.)
- Gestão de Afiliados (ver todos os afiliados e comissões)
- Publicações / Blog Admin (existe rota mas não está no painel)
- Controle Robótico e Rede Neural (existe na sidebar do advogado mas não no painel owner)

---

## Plano de Implementação

### Etapa 1 — Enriquecer Painel do Afiliado
- Adicionar seções: Materiais de Marketing, Documentos, Suporte, Gráfico de Performance
- Organizar dashboard em grid com cards informativos como o do Nômade Digital

### Etapa 2 — Enriquecer Painel do Produtor
- Adicionar: Afiliados do Produto, Analytics por Produto, Cupons, Avaliações, Suporte
- Cards de acesso rápido no estilo do Nômade Digital (que já está mais completo)

### Etapa 3 — Enriquecer Painel do Cliente
- Adicionar cards: Marketplace, Meu Plano, Histórico IA, Central de Ajuda
- Melhorar organização visual das ações rápidas

### Etapa 4 — Enriquecer Painel do Proprietário
- Adicionar: Receita total, Status dos serviços, Moderação de produtos, Notificações em massa
- Adicionar mais tabs: Afiliados, Publicações, Logs

### Etapa 5 — Pequenos ajustes no Painel do Advogado
- Widget de Prazos Urgentes, Assinaturas Pendentes, link Docs Internacionais

---

## Detalhes Técnicos

- Todos os dashboards já seguem o padrão de `useQuery` + cards + grid
- As rotas já existem para a maioria das páginas (marketplace, pagamentos, documentos, etc.) — o problema é que os dashboards não linkam para elas
- O NomadeDigitalDashboard é o melhor modelo de referência (grid de ferramentas com ícones + descrições)
- Sidebars (desktop e mobile) precisam ser sincronizadas com os novos itens dos dashboards
- Nenhuma migração de banco necessária — tudo usa tabelas existentes

