
INSERT INTO public.neural_knowledge_base (title, content, source_type, category, tags, is_processed)
VALUES
(
  'Loja Pública - Carrinho e Produtos',
  'A loja pública está em /loja/:creatorId. Cada produtor tem sua loja personalizada com produtos digitais. O sistema possui: CartContext global com persistência em localStorage, botão flutuante de carrinho com contador, CartDrawer (Sheet lateral) para gerenciar itens, página de produto individual em /loja/:creatorId/produto/:productId com JSON-LD Product schema. Para adicionar ao carrinho: useCart().addToCart(product). Para ver detalhes: navegar para /loja/:creatorId/produto/:productId. O checkout atual é placeholder - produtos são adicionados ao carrinho e o usuário pode finalizar a compra.',
  'system_doc',
  'funcionalidades',
  ARRAY['loja', 'carrinho', 'produtos', 'checkout', 'e-commerce'],
  true
),
(
  'Mini-Site do Advogado - Configuração e SEO',
  'O mini-site do advogado está em /advogado/:advogadoId. Carrega dados da tabela escritorio_config (nome, OAB, especialidades, WhatsApp, frase_impacto, meta_description, experiencia_anos, banner_url). Possui SEO completo com DynamicMeta, JSON-LD Attorney schema, Open Graph tags. Inclui: hero com frase de impacto, seção de áreas de atuação, formulário de contato, botão WhatsApp flutuante, scroll spy navigation. Configuração feita em /dashboard/escritorio (ConfiguracoesEscritorio.tsx).',
  'system_doc',
  'funcionalidades',
  ARRAY['advogado', 'mini-site', 'SEO', 'whatsapp', 'configuracao'],
  true
),
(
  'Dashboard de Documentos Internacionais',
  'O dashboard de documentos internacionais está em /dashboard/documentos-internacionais. Usa a tabela deals para gerenciar LOIs, contratos e pipeline internacional. Possui: KPIs instantâneos (total deals, valor pipeline, taxa conversão), funil visual por status (draft/sent/negotiation/closed_won/closed_lost), tabela filtrável com busca e filtros por tipo/status, formulário de criação de deals. Acesso restrito a roles advogado e produtor.',
  'system_doc',
  'funcionalidades',
  ARRAY['deals', 'internacional', 'LOI', 'contratos', 'pipeline'],
  true
),
(
  'Página de Clientes por Categorias',
  'A página /clientes mostra os clientes da plataforma organizados por 4 categorias: Advogados (pesquisa IA, petições, processos), Escritórios (CRM, financeiro, equipe), Produtores Digitais (loja, checkout, vendas), Afiliados (links, comissões, marketplace). Cada categoria tem ícone, descrição, lista de benefícios e depoimentos filtrados. Possui filtro por categoria via tabs, estatísticas da plataforma (500+ profissionais, 27 estados, 4.9 avaliação), e CTA para página de planos.',
  'system_doc',
  'funcionalidades',
  ARRAY['clientes', 'categorias', 'depoimentos', 'landing-page'],
  true
),
(
  'Página de Contato - Funil de Planos',
  'A página /contato é um funil de conversão com 3 planos: Básico (R$97/mês - Chat IA, 5 docs/mês, pesquisa, 1 usuário), Premium (R$197/mês - ilimitado, CRM, assinatura digital, loja, 3 usuários), Escritório (R$497/mês - ilimitado, API, Rede Neural, deals internacionais, SLA). O formulário de contato aceita query param ?plano=basico|premium|escritorio para pré-selecionar o plano. Inclui FAQ com 5 perguntas frequentes, trust signals (LGPD, 7 dias grátis, cancele quando quiser), e botão WhatsApp flutuante.',
  'system_doc',
  'funcionalidades',
  ARRAY['planos', 'precos', 'contato', 'funil', 'conversao'],
  true
),
(
  'Navegação e Rotas Públicas',
  'Rotas públicas: / (Index), /clientes (Clientes por categorias), /contato (Funil de planos), /publicacoes (Blog), /plataforma (Sobre), /loja/:creatorId (Loja do produtor), /loja/:creatorId/produto/:productId (Produto individual), /advogado/:advogadoId (Mini-site advogado), /cadastro (Registro), /auth (Login). O Header possui navegação sticky com links para Home, Clientes, Publicações, Plataforma e Contato. O orion-nav-map.ts mapeia comandos de voz/texto para navegação automática.',
  'system_doc',
  'navegacao',
  ARRAY['rotas', 'navegacao', 'menu', 'header', 'publico'],
  true
)
ON CONFLICT DO NOTHING;
