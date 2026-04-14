# Orion Core - Auto-Evolution Test (Jules Integration)

# ORION — Plataforma Jurídica IA SaaS LegalTech

Plataforma SaaS jurídica com inteligência artificial neural avançada para escritórios de advocacia, empresas e profissionais do Direito.

## 🚀 Funcionalidades Principais

- **Geração de Documentos IA** — Pipeline de 9 agentes com 7 providers (OpenAI, Gemini, Groq, Mistral, Anthropic, DeepSeek, Perplexity)
- **Rede Neural Auto-Evolutiva** — Aprendizado contínuo com A/B testing de prompts (HybridMoE-RAG-CAG)
- **Sistema de Raciocínio Orion** — Motor de raciocínio com classificação de intenção v3, streaming com análise de sentenças avançada e limpeza neurolinguística
- **Neurolinguística Avançada** — Processamento de fala natural com remoção de markdown/código, detecção de pontos e vírgulas para entonação, quebra de cláusulas longas
- **Visão Neural** — Análise visual multi-provider com voz humana (ElevenLabs TTS)
- **Reconhecimento Facial** — Autenticação biométrica com anti-spoofing IA
- **Pesquisa Jurisprudencial** — Busca unificada em 10+ fontes (DataJud, STF, STJ, Senado)
- **Editor Jurídico** — TipTap com revisão IA em tempo real e colaboração WebRTC
- **CRM Jurídico** — Gestão de clientes, processos e consultas
- **Documentos Internacionais** — 15+ tipos (LOI, MOU, NDA, Joint Venture) com templates bilíngues EN/PT
- **AML Screening** — Triagem anti-lavagem internacional com múltiplas listas
- **Assinatura Digital** — ClickSign (ICP-Brasil)
- **Pagamentos** — Stripe (Checkout + Connect)
- **Google Workspace** — Drive, Docs, Sheets, Gmail, Calendar, Contacts
- **Web Bluetooth (BLE)** — Conexão com dispositivos BLE via Web Bluetooth API
- **IoT Device Bridge** — Comunicação MQTT via WebSocket (HiveMQ Cloud)
- **Assistente Orion** — Comandos de voz para IoT, Bluetooth, sensores nativos e controle robótico
- **PWA Instalável** — App instalável via navegador com suporte offline
- **App Nativo (Capacitor)** — Build nativo iOS/Android com acesso completo a sensores

## 🧠 Sistema de Raciocínio & Neurolinguística (v3 — Abril 2026)

### Classificação de Intenção v3
- Padrões emocionais: detecta ansiedade, frustração, empolgação
- Raciocínio conversacional: identifica pedidos de opinião, estratégia, análise
- Continuidade contextual: últimas intenções influenciam classificação atual

### Neurolinguística de Fala
- Remoção completa de markdown (`**`, `##`, `//`, `` ``` ``)
- Ponto e vírgula (`;`) reconhecido como fim de sentença para entonação
- Quebra automática de cláusulas longas (>120 chars) em vírgulas para pacing natural
- Limpeza de URLs, HTML, emojis técnicos e tabelas antes do TTS
- Sincronização de limpeza entre ElevenLabs, browserSpeak e Web API

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| IA | OpenAI, Gemini, Groq, Mistral, Anthropic, DeepSeek, Perplexity |
| Raciocínio | Motor de intenção v3 + streaming com análise de sentenças |
| Visão | Gemini Vision, Groq Vision, Mistral Vision |
| Voz | ElevenLabs TTS + Web Speech API (Orion) + Neurolinguística |
| Editor | TipTap + 17 extensões |
| 3D | Three.js + React Three Fiber |
| Colaboração | Yjs + y-webrtc |
| Pagamentos | Stripe |
| Assinatura | ClickSign |
| IoT / MQTT | HiveMQ Cloud (WebSocket TLS 8884) |
| Bluetooth | Web Bluetooth API (GATT) |
| Mobile (PWA) | vite-plugin-pwa + manifest.json |
| Mobile (Nativo) | Capacitor (iOS/Android) |
| Sensores Nativos | Camera, GPS, Acelerômetro, Háptica, Bateria, Rede |

## 📊 Métricas

- ~50 páginas/rotas
- ~80 Edge Functions
- ~40 tabelas PostgreSQL
- ~32 hooks customizados
- 7 provedores de IA
- 5 idiomas (PT-BR, EN, ES, IT, ZH)
- 24+ módulos neurais
- 100+ tipos de documentos
- 15+ documentos internacionais

## 🌐 Páginas Públicas (Abril 2026)

- **Index** — Landing com Hero, Impact Stats, "Por que escolher o ORION" (6 blocos persuasivos), Benefits, Architecture, TechStack, Comparison, CTA
- **Sobre** — História e missão
- **Serviços** — Serviços oferecidos
- **Diferencial** — Diferenciais competitivos
- **Plataforma** — Apresentação completa da plataforma
- **Contato** — Formulário de contato
- **Associado** — Planos de associação (4 tiers)
- **FAQ** — Perguntas frequentes
- Todas as páginas 100% responsivas (mobile 390px, tablet 834px, desktop 1366px+)

## 📱 Integração Robótica & IoT

### Web Bluetooth Manager (`src/lib/neural/bluetooth-manager.ts`)
- Scan de dispositivos BLE, pareamento, leitura/escrita de características GATT
- Suporte a sensores: Battery Service (0x180F), Heart Rate (0x180D), Device Information (0x180A)
- Eventos de conexão/desconexão com reconexão automática

### IoT Device Bridge (`src/lib/neural/iot-device-bridge.ts`)
- Protocolo MQTT over WebSocket (wss://) via HiveMQ Cloud
- Bridge entre NeuralMessageBus local e tópicos MQTT remotos
- Comandos: `ligar_luz`, `temperatura`, `status_robo`

### Comandos de Voz Orion para IoT
- "Orion, conecte ao bluetooth" — Scan e pareamento BLE
- "Orion, ligue a luz" / "Orion, desligue a luz" — Controle IoT via MQTT
- "Orion, status dos sensores" / "Orion, status do robô" — Consulta de sensores
- "Orion, tire uma foto" / "Orion, qual minha localização?" — Sensores nativos

## 🏃 Como rodar localmente

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
npm run dev
```

### Build Mobile (Capacitor)

```sh
npx cap add android   # ou ios
npx cap sync
npx cap run android   # ou ios
```

## 📦 Deploy

Frontend deployado via [Lovable](https://lovable.dev). Backend no Supabase Cloud.

- **Produção**: https://orionelp.lovable.app

## 📄 Documentação

- `documentacao-llm.txt` — Documentação técnica completa da plataforma jurídica (1220+ linhas)
- `NEUROCORE-README.md` — Arquitetura NEUROCORE AI (5 camadas + repos open source)
- `public/hf-space/NEUROCORE_OPENSOURCE.md` — Lista de repositórios open source

## ©️ Propriedade

- **Criador**: Ericson Rodrigues Piccoli
- **Empresa**: Elp Green Technology (CNPJ: 42.501.190/0001-70)
- **Todos os direitos reservados** © 2026
