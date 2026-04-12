

# Checklist Completo do Sistema — IASoft Hub / ELP Green

---

## 1. PÁGINAS PÚBLICAS (sem autenticação)

| # | Rota | Página | Status |
|---|------|--------|--------|
| 1 | `/` | Home (Index) | ⬜ Verificar |
| 2 | `/plataforma` | Página vitrine da plataforma | ⬜ |
| 3 | `/servicos` | Serviços oferecidos | ⬜ |
| 4 | `/contato` | Formulário de contato | ⬜ |
| 5 | `/investidor` | Ferramentas para investidores | ⬜ |
| 6 | `/publicacoes` | Lista de publicações/blog | ⬜ |
| 7 | `/publicacoes/:slug` | Detalhe de publicação | ⬜ |
| 8 | `/depoimentos` | Depoimentos de clientes | ⬜ |
| 9 | `/install` | Instalar PWA | ⬜ |
| 10 | `/advogado/:advogadoId` | Site público do advogado | ⬜ |
| 11 | `/vitrine/:affiliateId` | Vitrine do afiliado | ⬜ |

## 2. PÁGINAS DE SOLUÇÕES

| # | Rota | Público-alvo | Status |
|---|------|-------------|--------|
| 12 | `/solucoes/advogados` | Advogados | ⬜ |
| 13 | `/solucoes/produtores` | Produtores | ⬜ |
| 14 | `/solucoes/afiliados` | Afiliados | ⬜ |
| 15 | `/solucoes/industria` | Indústria | ⬜ |

## 3. PÁGINAS LEGAIS

| # | Rota | Página | Status |
|---|------|--------|--------|
| 16 | `/privacidade` | Política de Privacidade | ⬜ |
| 17 | `/termos` | Termos de Uso | ⬜ |
| 18 | `/lgpd` | Conformidade LGPD | ⬜ |

## 4. AUTENTICAÇÃO

| # | Rota/Função | Descrição | Status |
|---|------------|-----------|--------|
| 19 | `/auth` | Login/Signup | ⬜ |
| 20 | `/auth/callback` | OAuth callback | ⬜ |
| 21 | `/cadastro` | Cadastro de cliente | ⬜ |
| 22 | `/esqueci-senha` | Recuperação de senha | ⬜ |
| 23 | `/register/biometric` | Registro biométrico | ⬜ |
| 24 | `/spotify-callback` | Callback Spotify | ⬜ |
| 25 | `/callback/youtube-music` | Callback YouTube Music | ⬜ |

## 5. LOJA / E-COMMERCE

| # | Rota | Descrição | Status |
|---|------|-----------|--------|
| 26 | `/loja/:creatorId` | Loja do criador | ⬜ |
| 27 | `/loja-orion` | Loja Orion (assinaturas) | ⬜ |
| 28 | `/loja/:creatorId/sucesso` | Confirmação de compra | ⬜ |
| 29 | `/loja/:creatorId/produto/:productId` | Detalhe do produto | ⬜ |

## 6. DOCUMENTAÇÃO TÉCNICA

| # | Rota | Descrição | Status |
|---|------|-----------|--------|
| 30 | `/docs/rede-neural` | Doc da Rede Neural | ⬜ |
| 31 | `/docs/neurocore` | Doc do NeuroCore | ⬜ |
| 32 | `/consulta` | Chat IA (Orion) | ⬜ |

---

## 7. DASHBOARD — Rotas Compartilhadas (todos os roles)

| # | Rota | Função | Status |
|---|------|--------|--------|
| 33 | `/dashboard` | Router por role | ⬜ |
| 34 | `instrucoes` | Instruções da plataforma | ⬜ |
| 35 | `documentos` | Meus Documentos | ⬜ |
| 36 | `pagamentos` | Pagamentos | ⬜ |
| 37 | `pagamento-sucesso` | Confirmação pagamento | ⬜ |
| 38 | `notificacoes` | Notificações | ⬜ |
| 39 | `perfil-cliente` | Perfil do usuário | ⬜ |
| 40 | `consultas` | Agendar consulta | ⬜ |
| 41 | `chat-ao-vivo` | Chat humano | ⬜ |
| 42 | `meus-processos` | Processos do cliente | ⬜ |
| 43 | `assinatura-cliente` | Assinatura do cliente | ⬜ |
| 44 | `configuracoes` | Configurações gerais | ⬜ |
| 45 | `portal-cliente` | Portal do cliente | ⬜ |
| 46 | `marketplace` | Marketplace | ⬜ |
| 47 | `marketplace-modules` | Módulos do marketplace | ⬜ |
| 48 | `meus-acessos` | Gerenciar acessos | ⬜ |
| 49 | `explorar-lojas` | Explorar lojas | ⬜ |
| 50 | `plano` | Plano do usuário | ⬜ |
| 51 | `configurar-ia` | Configurar IA | ⬜ |

## 8. DASHBOARD — Advogado

| # | Rota | Função | Status |
|---|------|--------|--------|
| 52 | `gerar-documento` | Gerador de documentos jurídicos | ⬜ |
| 53 | `pesquisa-unificada` | Pesquisa jurisprudencial | ⬜ |
| 54 | `processos` | Gestão de processos | ⬜ |
| 55 | `assinatura-digital` | Assinatura digital | ⬜ |
| 56 | `tarefas` | Gestão de tarefas | ⬜ |
| 57 | `publicacoes-admin` | Admin de publicações | ⬜ |
| 58 | `usuarios` | Gestão de usuários | ⬜ |
| 59 | `reformulacao` | Reformulação jurídica | ⬜ |
| 60 | `recursos-eu` | Recursos EU | ⬜ |
| 61 | `ferramentas-google` | Ferramentas Google | ⬜ |
| 62 | `laboratorio-ia` | Laboratório de IA | ⬜ |
| 63 | `controle-robotico` | Controle robótico | ⬜ |
| 64 | `dispositivos-iot` | Dispositivos IoT | ⬜ |
| 65 | `admin` | Painel admin/owner | ⬜ |

## 9. DASHBOARD — Marketplace / Produtores / Afiliados

| # | Rota | Roles | Status |
|---|------|-------|--------|
| 66 | `meus-produtos` | advogado, produtor, nomade | ⬜ |
| 67 | `editor-vendas` | produtor, nomade | ⬜ |
| 68 | `campanhas-email` | produtor, nomade | ⬜ |
| 69 | `afiliados` | advogado, afiliado, nomade | ⬜ |
| 70 | `produtor-afiliados` | produtor, nomade | ⬜ |
| 71 | `documentos-internacionais` | advogado, produtor, nomade | ⬜ |
| 72 | `crm` | advogado, produtor, nomade, afiliado | ⬜ |
| 73 | `rede-neural` | todos (sem RoleGuard) | ⬜ |

---

## 10. EDGE FUNCTIONS (Supabase)

| # | Função | Categoria | Status |
|---|--------|-----------|--------|
| 74 | `neural-ops` | IA Core (visão, LLM, routing) | ⬜ |
| 75 | `gemini-tts` | Voz — TTS do Orion | ⬜ |
| 76 | `gerar-documento` | Geração de documentos | ⬜ |
| 77 | `aprimorar-documento` | Melhoria de documentos com IA | ⬜ |
| 78 | `chat-juridico` | Chat jurídico especializado | ⬜ |
| 79 | `pesquisa-unificada` | Pesquisa em tribunais | ⬜ |
| 80 | `generate-pdf` | Gerar PDF | ⬜ |
| 81 | `generate-embeddings` | Embeddings para RAG | ⬜ |
| 82 | `neural-search` | Busca neural/semântica | ⬜ |
| 83 | `neural-bridge` | Bridge entre projetos | ⬜ |
| 84 | `neural-child-bridge` | Bridge filho | ⬜ |
| 85 | `neural-inference` | Inferência neural | ⬜ |
| 86 | `neural-pipeline-orchestrator` | Orquestrador de pipelines | ⬜ |
| 87 | `neural-knowledge-harvester` | Coleta de conhecimento | ⬜ |
| 88 | `orion-intelligence` | Inteligência do Orion | ⬜ |
| 89 | `orion-advogado-ai` | IA especializada advogado | ⬜ |
| 90 | `orion-produtor-ai` | IA especializada produtor | ⬜ |
| 91 | `orion-agent-factory` | Fábrica de agentes | ⬜ |
| 92 | `orion-realtime-intel` | Intel em tempo real | ⬜ |
| 93 | `orion-vm-proxy` | Proxy para VM GCP | ⬜ |
| 94 | `orion-vm-control` | Controle da VM | ⬜ |
| 95 | `smart-agent-route` | Roteamento inteligente | ⬜ |
| 96 | `smart-ingest` | Ingestão inteligente | ⬜ |
| 97 | `stripe-api` | API Stripe | ⬜ |
| 98 | `stripe-webhook` | Webhook Stripe | ⬜ |
| 99 | `process-sale` | Processar venda | ⬜ |
| 100 | `ocr-document` | OCR de documentos | ⬜ |
| 101 | `pdf-layout-analysis` | Análise de layout PDF | ⬜ |
| 102 | `analyze-reference-doc` | Análise de doc referência | ⬜ |
| 103 | `citation-verifier` | Verificador de citações | ⬜ |
| 104 | `legislacao-federal` | Consulta legislação | ⬜ |
| 105 | `ingest-legal` | Ingestão de dados legais | ⬜ |
| 106 | `kb-ingest` | Ingestão base conhecimento | ⬜ |
| 107 | `hf-inference` | Inferência HuggingFace | ⬜ |
| 108 | `ai-autocomplete` | Autocomplete IA | ⬜ |
| 109 | `ai-orchestrator` | Orquestrador IA | ⬜ |
| 110 | `editorial-orchestrator` | Orquestrador editorial | ⬜ |
| 111 | `secretaria-ia` | Secretária IA | ⬜ |
| 112 | `notifications` | Sistema de notificações | ⬜ |
| 113 | `translate-text` | Tradução de texto | ⬜ |
| 114 | `firebase-admin` | Admin Firebase | ⬜ |
| 115 | `auth-email-hook` | Hook de email auth | ⬜ |
| 116 | `create-client-profile` | Criação de perfil | ⬜ |
| 117 | `get-api-keys` | Obter chaves API | ⬜ |
| 118 | `verify-recaptcha` | Verificação reCAPTCHA | ⬜ |
| 119 | `webhook-gateway` | Gateway de webhooks | ⬜ |
| 120 | `queue-worker` | Worker de fila | ⬜ |
| 121 | `spotify-api` | API Spotify | ⬜ |
| 122 | `youtube-music-api` | API YouTube Music | ⬜ |
| 123 | `amazon-auth` | Auth Amazon | ⬜ |
| 124 | `firecrawl-search` | Busca Firecrawl | ⬜ |
| 125 | `gemini-live-token` | Token Gemini Live | ⬜ |
| 126 | `utils-api` | Utilitários gerais | ⬜ |

---

## 11. SISTEMAS CORE (Client-Side)

| # | Sistema | Descrição | Status |
|---|---------|-----------|--------|
| 127 | Orion Voice (STT) | Reconhecimento de voz via Web Speech API | ⬜ |
| 128 | Orion Voice (TTS) | Síntese de voz via Gemini TTS | ⬜ |
| 129 | Orion Vision | Captura de câmera + análise via Gemini Flash | ⬜ |
| 130 | Orion Chat | Chat conversacional com contexto | ⬜ |
| 131 | RAG / Embeddings | Busca semântica na base de conhecimento | ⬜ |
| 132 | Neural Network | Rede neural + routing + métricas | ⬜ |
| 133 | Editor de Documentos | Editor rich-text com IA integrada | ⬜ |
| 134 | Assinatura Digital | Assinatura em canvas + certificado | ⬜ |
| 135 | Redação (Redaction) | Ferramenta de tarjamento | ⬜ |
| 136 | Template Variables | Variáveis em documentos | ⬜ |
| 137 | CRM Pipeline | Gestão de clientes/pipeline | ⬜ |
| 138 | Firebase Analytics | Tracking de eventos | ⬜ |
| 139 | Firebase Messaging | Push notifications | ⬜ |
| 140 | Google reCAPTCHA | Proteção anti-bot | ⬜ |
| 141 | Google Maps | Geocoding/mapas | ⬜ |
| 142 | Google OAuth | Login social | ⬜ |
| 143 | Stripe Payments | Pagamentos e assinaturas | ⬜ |
| 144 | PWA | Service worker + install prompt | ⬜ |
| 145 | Copy Protection | Proteção de cópia de conteúdo | ⬜ |
| 146 | Orion Shield | Segurança client-side | ⬜ |
| 147 | Cookie Consent | LGPD consent banner | ⬜ |
| 148 | Affiliate Tracker | Rastreamento de afiliados | ⬜ |
| 149 | ROSBridge | Controle robótico | ⬜ |
| 150 | Browser Actions | Orion abre YouTube, Maps, etc. | ⬜ |

---

## 12. ROLES DO SISTEMA

| Role | Dashboard dedicado | Status |
|------|--------------------|--------|
| Owner/Admin | ProprietarioDashboard | ⬜ |
| Advogado | AdvogadoDashboard | ⬜ |
| Cliente | ClienteDashboard | ⬜ |
| Produtor | ProdutorDashboard | ⬜ |
| Afiliado | AfiliadoDashboard | ⬜ |
| Nômade Digital | NomadeDigitalDashboard | ⬜ |
| Sem role | DashboardHome (genérico) | ⬜ |

---

## 13. REDIRECTS CONSOLIDADOS

| De | Para | Status |
|----|------|--------|
| `/nova-pagina` | `/` | ⬜ |
| `/diferencial` | `/plataforma` | ⬜ |
| `/associado` | `/contato` | ⬜ |
| `/sobre` | `/plataforma` | ⬜ |
| `/escritorio` | `/solucoes/advogados` | ⬜ |
| `/pro-bono` | `/contato` | ⬜ |
| `/clientes` | `/servicos` | ⬜ |
| `/demo` | `/dashboard/rede-neural` | ⬜ |
| `/extension` | `/dashboard/rede-neural` | ⬜ |
| + 12 redirects internos do dashboard | — | ⬜ |

---

**Total: ~150 itens entre páginas, funções e sistemas.**

Quer que eu implemente isso como uma página de checklist interativa no admin dashboard, ou prefere como documento para revisão manual?

